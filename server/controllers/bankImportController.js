const BankImportService = require('../services/BankImportService');
const bankFeedService = require('../services/bankFeedService');
const transactionService = require('../services/transactionService');
const BankRule = require('../models/BankRule');
const BankTransaction = require('../models/BankTransaction');

const bankImportController = {
    uploadPreview: async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const data = BankImportService.parseFile(req.file.buffer, req.file.originalname);
            const headers = data[0] || [];
            const previewRows = data.slice(1, 11); // First 10 rows for preview

            res.json({
                headers,
                previewRows,
                allRows: data,
                filename: req.file.originalname
            });
        } catch (err) {
            next(err);
        }
    },

    processImport: async (req, res, next) => {
        try {
            const { mapping, bankAccountId, rows, hasHeader, amountColumns, dateFormat } = req.body;

            if (!rows || !mapping || !bankAccountId) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            const transactions = BankImportService.mapTransactions(
                rows,
                { mapping, hasHeader, amountColumns, dateFormat },
                req.user.id,
                req.companyId,
                bankAccountId
            );

            // Filter out duplicates using checksums (both existing in DB and within the batch)
            const existingTxs = await bankFeedService.getAll(req.user.id, req.companyId);
            const existingChecksums = new Set(existingTxs.map(t => t.checksum).filter(c => c));
            const seenInBatch = new Set();

            const uniqueTransactions = transactions.filter(t => {
                if (!t.checksum) return true; // Keep if no checksum (unlikely)
                if (existingChecksums.has(t.checksum) || seenInBatch.has(t.checksum)) {
                    return false;
                }
                seenInBatch.add(t.checksum);
                return true;
            });

            if (uniqueTransactions.length === 0) {
                return res.json({ message: 'All transactions were previously imported', count: 0 });
            }

            // Fetch active rules to apply auto-categorization
            const rules = await BankRule.find({ userId: req.user.id, companyId: req.companyId, isActive: true });

            for (const tx of uniqueTransactions) {
                const matchedRule = rules.find(rule =>
                    tx.description.toLowerCase().includes(rule.descriptionContains.toLowerCase())
                );
                if (matchedRule) {
                    tx.category = matchedRule.suggestedCategoryId;
                }
            }

            await bankFeedService.bulkUpdate(uniqueTransactions, req.user.id, req.companyId);

            res.json({ message: `Successfully imported ${uniqueTransactions.length} transactions`, count: uniqueTransactions.length });
        } catch (err) {
            next(err);
        }
    },

    categorize: async (req, res, next) => {
        try {
            console.log('[bankImportController.categorize] Body:', req.body);
            const { transactionId, categoryId, action, entityId, toAccountId } = req.body;
            const bankTx = await BankTransaction.findOne({ id: transactionId, userId: req.user.id, companyId: req.companyId });

            if (!bankTx) {
                return res.status(404).json({ message: `Transaction ${transactionId} not found` });
            }

            if (action === 'ADD') {
                // 1. Create a real transaction in accounting
                const newTx = {
                    id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: bankTx.amount < 0 ? 'CHECK' : 'DEPOSIT',
                    date: bankTx.date,
                    total: Math.abs(bankTx.amount),
                    entityId: entityId || undefined,
                    bankAccountId: bankTx.bankAccountId,
                    items: [{
                        description: bankTx.description,
                        amount: Math.abs(bankTx.amount),
                        accountId: String(categoryId)
                    }],
                    status: 'CLEARED',
                    memo: bankTx.description,
                    attachments: bankTx.attachments || []
                };

                await transactionService.saveTransaction(newTx, req.user.role, req.user.id, req.companyId);

                // 2. Update/Create Rule for future auto-categorization
                // We use a cleaner description by removing common noise
                const cleanDescription = bankTx.description
                    .replace(/[0-9*#@]/g, '') // Remove numbers and common special chars
                    .split(' ')
                    .filter(word => word.length > 2)
                    .slice(0, 3)
                    .join(' ')
                    .trim();

                if (cleanDescription.length > 3) {
                    await BankRule.findOneAndUpdate(
                        { userId: req.user.id, companyId: req.companyId, descriptionContains: cleanDescription },
                        { suggestedCategoryId: categoryId, isActive: true },
                        { upsert: true, new: true }
                    );
                }

                // 3. Update bank transaction status
                bankTx.status = 'CATEGORIZED';
                bankTx.category = categoryId;
                bankTx.entityId = entityId;
                await bankFeedService.save(bankTx, req.user.id, req.companyId);

                res.json({ message: 'Transaction added and categorized', transaction: newTx });
            } else if (action === 'TRANSFER') {
                const newTx = {
                    id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'TRANSFER',
                    date: bankTx.date,
                    total: Math.abs(bankTx.amount),
                    transferFromId: bankTx.amount < 0 ? bankTx.bankAccountId : toAccountId,
                    transferToId: bankTx.amount < 0 ? toAccountId : bankTx.bankAccountId,
                    status: 'CLEARED',
                    memo: `Transfer: ${bankTx.description}`,
                    attachments: bankTx.attachments || []
                };

                await transactionService.saveTransaction(newTx, req.user.role, req.user.id, req.companyId);

                bankTx.status = 'CATEGORIZED';
                bankTx.category = toAccountId; // Store the target account as category for reference
                await bankFeedService.save(bankTx, req.user.id, req.companyId);

                res.json({ message: 'Transfer recorded', transaction: newTx });
            } else if (action === 'MATCH') {
                const existingTx = await transactionService.getOne(categoryId, req.user.id, req.companyId); // categoryId is used as target ledger txId in Match
                if (!existingTx) return res.status(404).json({ message: 'Ledger transaction not found' });

                if (existingTx.type === 'INVOICE' || existingTx.type === 'BILL') {
                    // Create payment for the invoice/bill
                    const paymentTx = {
                        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        type: existingTx.type === 'INVOICE' ? 'PAYMENT' : 'BILL_PAYMENT',
                        date: bankTx.date,
                        total: Math.abs(bankTx.amount),
                        entityId: existingTx.entityId,
                        bankAccountId: bankTx.bankAccountId,
                        status: 'CLEARED',
                        memo: `Matched to ${existingTx.type} #${existingTx.refNo}`,
                        appliedCreditIds: [existingTx.id], // Link to the original
                        attachments: bankTx.attachments || []
                    };
                    await transactionService.saveTransaction(paymentTx, req.user.role, req.user.id, req.companyId);
                } else {
                    // Just mark existing as cleared
                    existingTx.status = 'CLEARED';
                    await transactionService.saveTransaction(existingTx, req.user.role, req.user.id, req.companyId);
                }

                bankTx.status = 'MATCHED';
                bankTx.potentialMatchId = existingTx.id;

                // Carry over attachments to the matched ledger transaction
                if (bankTx.attachments && bankTx.attachments.length > 0) {
                    existingTx.attachments = [...(existingTx.attachments || []), ...bankTx.attachments];
                    await transactionService.saveTransaction(existingTx, req.user.role, req.user.id, req.companyId);
                }

                await bankFeedService.save(bankTx, req.user.id, req.companyId);

                res.json({ message: 'Match confirmed' });
            } else if (action === 'EXCLUDE') {
                bankTx.status = 'EXCLUDED';
                const updateData = bankTx.toObject();
                await bankFeedService.save(updateData, req.user.id, req.companyId);
                res.json({ message: 'Transaction excluded' });
            } else {
                res.status(400).json({ message: 'Invalid action' });
            }
        } catch (err) {
            next(err);
        }
    },

    deleteAllExcluded: async (req, res, next) => {
        try {
            const result = await BankTransaction.deleteMany({
                userId: req.user.id,
                companyId: req.companyId,
                status: 'EXCLUDED'
            });
            res.json({ message: `Successfully deleted ${result.deletedCount} excluded transactions`, count: result.deletedCount });
        } catch (err) {
            next(err);
        }
    },

    uploadAttachment: async (req, res, next) => {
        try {
            if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
            const { id } = req.params;
            const bankTx = await BankTransaction.findOne({ id, userId: req.user.id, companyId: req.companyId });
            if (!bankTx) return res.status(404).json({ message: 'Transaction not found' });

            const fileName = `${Date.now()}-${req.file.originalname}`;
            const filePath = `uploads/attachments/${fileName}`;

            const fs = require('fs');
            const path = require('path');
            const dir = 'uploads/attachments';
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            fs.writeFileSync(filePath, req.file.buffer);

            const attachment = {
                name: req.file.originalname,
                url: `/uploads/attachments/${fileName}`,
                uploadedAt: new Date()
            };

            bankTx.attachments = [...(bankTx.attachments || []), attachment];
            await bankTx.save();

            res.json({ message: 'Attachment uploaded successfully', attachment });
        } catch (err) {
            next(err);
        }
    },

    deleteAttachment: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { fileName } = req.body;
            const bankTx = await BankTransaction.findOne({ id, userId: req.user.id, companyId: req.companyId });
            if (!bankTx) return res.status(404).json({ message: 'Transaction not found' });

            const index = (bankTx.attachments || []).findIndex(a => a.url.endsWith(fileName));
            if (index === -1) return res.status(404).json({ message: 'Attachment not found' });

            const attachment = bankTx.attachments[index];
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(process.cwd(), attachment.url.replace(/^\//, ''));

            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    console.error('Failed to delet file:', err);
                }
            }

            bankTx.attachments.splice(index, 1);
            await bankTx.save();

            res.json({ message: 'Attachment deleted successfully' });
        } catch (err) {
            next(err);
        }
    }
};

module.exports = bankImportController;
