const mongoose = require('mongoose');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Item = require('../models/Item');
const Account = require('../models/Account');
const AuditLogEntry = require('../models/AuditLogEntry');
const PayrollLiability = require('../models/PayrollLiability');
const InventoryLot = require('../models/InventoryLot');

const transactionService = {
    getOne: async (id, userId, companyId) => {
        return await Transaction.findOne({ id, userId, companyId });
    },
    saveTransaction: async (txData, userRole, userId, companyId) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const txs = Array.isArray(txData) ? txData : [txData];
            const results = [];

            for (const t of txs) {
                // 1. Check for existing transaction to handle accounting reversal
                const existingTx = t.id ? await Transaction.findOne({ id: t.id, userId, companyId }).session(session) : null;

                if (existingTx) {
                    // Reverse old impact
                    await transactionService.processAccounting(existingTx, session, -1);
                }

                // 2. Save/Update Transaction
                let savedTx;
                t.userId = userId; t.companyId = companyId;

                if (t.id) {
                    const existing = await Transaction.findOne({ id: t.id, userId, companyId }).session(session);
                    if (existing) {
                        // Update existing
                        savedTx = await Transaction.findOneAndUpdate({ id: t.id, userId, companyId }, t, { new: true, session });
                    } else {
                        // Create new with provided ID
                        savedTx = new Transaction(t);
                        await savedTx.save({ session });
                    }
                } else {
                    // Create new with generated ID
                    t.id = crypto.randomUUID();
                    savedTx = new Transaction(t);
                    await savedTx.save({ session });
                }
                results.push(savedTx);

                // 3. Audit Trail
                const auditLog = new AuditLogEntry({
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    userId: userRole || 'Admin',
                    actualUserId: userId, companyId: companyId,
                    action: existingTx ? 'MODIFY' : 'CREATE',
                    transactionType: savedTx.type,
                    transactionId: savedTx.id,
                    refNo: savedTx.refNo,
                    amount: savedTx.total,
                    newContent: JSON.stringify(savedTx)
                });
                await auditLog.save({ session });

                // 4. Apply New Accounting Logic
                await transactionService.processAccounting(savedTx, session, 1);

                // 5. Special Case: If this is a BILL against a RECEIVE_ITEM, 
                // we should reverse the original receipt's accounting impact to avoid double counting.
                if (savedTx.type === 'BILL' && savedTx.itemReceiptId) {
                    const receipt = await Transaction.findOne({ id: savedTx.itemReceiptId, userId, companyId }).session(session);
                    if (receipt && receipt.status !== 'CLOSED') {
                        // Reverse the receipt's impact because the BILL now carries the impact.
                        await transactionService.processAccounting(receipt, session, -1);
                        // Mark receipt as closed so we don't reverse it again if the bill is modified.
                        await Transaction.findOneAndUpdate({ _id: receipt._id }, { status: 'CLOSED' }, { session });
                    }
                }
            }

            await session.commitTransaction();
            return results;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    processAccounting: async (t, session, multiplier = 1) => {
        if (!t) return;

        const total = (t.total || 0) * multiplier;

        if (t.type === 'BILL' || t.type === 'RECEIVE_ITEM') {
            await transactionService.receiveInventoryItems(t, session, multiplier);

            // Update Accounts Payable Account
            const apAccount = await Account.findOne({ name: 'Accounts Payable', userId: t.userId, companyId: t.companyId }).session(session);
            if (apAccount) await Account.findOneAndUpdate({ _id: apAccount._id }, { $inc: { balance: total } }, { session });

            if (t.type === 'BILL') {
                await Vendor.findOneAndUpdate({ id: t.entityId }, { $inc: { balance: total } }, { session });

                // Update Expense/Item Accounts for each line
                for (const lineItem of t.items) {
                    if (lineItem.accountId) {
                        const amount = (lineItem.amount || 0) * multiplier;
                        await Account.findOneAndUpdate({ id: lineItem.accountId }, { $inc: { balance: amount } }, { session });
                    }
                }

                if (t.itemReceiptId) {
                    await Transaction.findOneAndUpdate({ id: t.itemReceiptId }, { status: multiplier === 1 ? 'CLOSED' : 'OPEN' }, { session });
                }
            }
        } else if (t.type === 'BILL_PAYMENT') {
            // Updated logic to prevent double-counting when entityId is not 'Multi'
            let vId = t.entityId;
            if (vId === 'Multi' && t.appliedCreditIds && t.appliedCreditIds.length > 0) {
                const firstBill = await Transaction.findOne({ id: { $in: t.appliedCreditIds } }).session(session);
                vId = firstBill?.entityId;
            }

            if (vId) await Vendor.findOneAndUpdate({ id: vId }, { $inc: { balance: -total } }, { session });

            const apAccount = await Account.findOne({ name: 'Accounts Payable', userId: t.userId, companyId: t.companyId }).session(session);
            if (apAccount) await Account.findOneAndUpdate({ _id: apAccount._id }, { $inc: { balance: -total } }, { session });

            if (t.bankAccountId) {
                await Account.findOneAndUpdate({ id: t.bankAccountId }, { $inc: { balance: -total } }, { session });
            }

            if (t.appliedCreditIds) {
                if (multiplier === 1) {
                    await Transaction.updateMany(
                        { id: { $in: t.appliedCreditIds }, type: 'BILL' },
                        { $set: { status: 'PAID' } },
                        { session }
                    );
                    await Transaction.updateMany(
                        { id: { $in: t.appliedCreditIds }, type: 'VENDOR_CREDIT' },
                        { $set: { status: 'CLOSED' } },
                        { session }
                    );
                } else {
                    await Transaction.updateMany(
                        { id: { $in: t.appliedCreditIds }, type: { $in: ['BILL', 'VENDOR_CREDIT'] } },
                        { $set: { status: 'OPEN' } },
                        { session }
                    );
                }
            }
        } else if (t.type === 'VENDOR_CREDIT') {
            await Vendor.findOneAndUpdate({ id: t.entityId }, { $inc: { balance: -total } }, { session });
            const bankAccount = await Account.findOne({ id: t.bankAccountId, userId: t.userId, companyId: t.companyId }).session(session);
            if (bankAccount) await Account.findOneAndUpdate({ _id: bankAccount._id }, { $inc: { balance: total } }, { session });
        } else if (t.type === 'CHECK') {
            if (t.bankAccountId) {
                await Account.findOneAndUpdate({ id: t.bankAccountId }, { $inc: { balance: -total } }, { session });
            }
            // Update individual line accounts
            for (const lineItem of t.items) {
                if (lineItem.accountId) {
                    const amount = (lineItem.amount || 0) * multiplier;
                    await Account.findOneAndUpdate({ id: lineItem.accountId }, { $inc: { balance: amount } }, { session });
                }
            }
            const apAccount = await Account.findOne({ name: 'Accounts Payable', userId: t.userId, companyId: t.companyId }).session(session);
            if (apAccount && t.items.some(i => i.accountId === apAccount.id)) {
                await Vendor.findOneAndUpdate({ id: t.entityId }, { $inc: { balance: -total } }, { session });
            }
        } else if (t.type === 'DEPOSIT') {
            if (t.bankAccountId) {
                await Account.findOneAndUpdate({ id: t.bankAccountId }, { $inc: { balance: total } }, { session });
            }

            // Handle direct account categorization (from bank feeds) vs standard deposits from UF
            const hasDirectAccounts = t.items.some(item => item.accountId);
            if (hasDirectAccounts) {
                for (const item of t.items) {
                    if (item.accountId) {
                        const amount = (item.amount || 0) * multiplier;
                        await Account.findOneAndUpdate({ id: item.accountId }, { $inc: { balance: amount } }, { session });
                    }
                }
            } else {
                const uf = await Account.findOne({ name: 'Undeposited Funds', userId: t.userId, companyId: t.companyId }).session(session);
                if (uf) await Account.findOneAndUpdate({ _id: uf._id }, { $inc: { balance: -total } }, { session });
            }

            const apAccount = await Account.findOne({ name: 'Accounts Payable', userId: t.userId, companyId: t.companyId }).session(session);
            for (const item of t.items) {
                if (apAccount && item.accountId === apAccount.id && item.entityId) {
                    await Vendor.findOneAndUpdate({ id: item.entityId }, { $inc: { balance: -((item.amount || 0) * multiplier) } }, { session });
                }
            }
        } else if (['INVOICE', 'SALES_RECEIPT', 'PAYMENT'].includes(t.type)) {
            const isInvoice = t.type === 'INVOICE';
            const isPayment = t.type === 'PAYMENT';
            const isReceipt = t.type === 'SALES_RECEIPT';

            const arAccount = await Account.findOne({ name: 'Accounts Receivable', userId: t.userId, companyId: t.companyId }).session(session);

            if (isInvoice) {
                await Customer.findOneAndUpdate({ id: t.entityId }, { $inc: { balance: total } }, { session });
                if (arAccount) await Account.findOneAndUpdate({ _id: arAccount._id }, { $inc: { balance: total } }, { session });
            } else if (isPayment) {
                await Customer.findOneAndUpdate({ id: t.entityId }, { $inc: { balance: -total } }, { session });
                if (arAccount) await Account.findOneAndUpdate({ _id: arAccount._id }, { $inc: { balance: -total } }, { session });

                let depositAccount;
                if (t.depositToId) {
                    depositAccount = await Account.findOne({ id: t.depositToId, userId: t.userId, companyId: t.companyId }).session(session);
                } else {
                    depositAccount = await Account.findOne({ name: 'Undeposited Funds', userId: t.userId, companyId: t.companyId }).session(session);
                }

                if (depositAccount) {
                    await Account.findOneAndUpdate({ _id: depositAccount._id }, { $inc: { balance: total } }, { session });
                }

                if (t.appliedCreditIds) {
                    if (multiplier === 1) {
                        await Transaction.updateMany(
                            { id: { $in: t.appliedCreditIds }, type: 'INVOICE' },
                            { $set: { status: 'PAID' } },
                            { session }
                        );
                        await Transaction.updateMany(
                            { id: { $in: t.appliedCreditIds }, type: 'CREDIT_MEMO' },
                            { $set: { status: 'CLOSED' } },
                            { session }
                        );
                    } else {
                        await Transaction.updateMany(
                            { id: { $in: t.appliedCreditIds }, type: { $in: ['INVOICE', 'CREDIT_MEMO'] } },
                            { $set: { status: 'OPEN' } },
                            { session }
                        );
                    }
                }
            } else if (isReceipt) {
                const depositId = t.depositToId;
                if (depositId) {
                    await Account.findOneAndUpdate({ id: depositId }, { $inc: { balance: total } }, { session });
                } else {
                    const uf = await Account.findOne({ name: 'Undeposited Funds', userId: t.userId, companyId: t.companyId }).session(session);
                    if (uf) await Account.findOneAndUpdate({ _id: uf._id }, { $inc: { balance: total } }, { session });
                }
            }

            // Sales Tax Posting
            if ((isInvoice || isReceipt) && t.taxAmount) {
                const taxAccount = await Account.findOne({ name: 'Sales Tax Payable', userId: t.userId, companyId: t.companyId }).session(session);
                if (taxAccount) {
                    await Account.findOneAndUpdate({ _id: taxAccount._id }, { $inc: { balance: (t.taxAmount * multiplier) } }, { session });
                }
            }

            // Inventory and COGS logic ONLY for Sales/Invoices
            if (isInvoice || isReceipt) {
                for (const lineItem of t.items) {
                    const itemSearch = { $or: [{ id: lineItem.itemId || lineItem.id }, { name: lineItem.description }], userId: t.userId, companyId: t.companyId };
                    const item = await Item.findOne(itemSearch).session(session);

                    const amount = (lineItem.amount || 0) * multiplier;
                    const qty = (lineItem.quantity || 0) * multiplier;

                    // Update Income Account
                    const incomeAccId = lineItem.accountId || (item ? item.incomeAccountId : null);
                    if (incomeAccId) {
                        await Account.findOneAndUpdate({ id: incomeAccId }, { $inc: { balance: amount } }, { session });
                    }

                    if (item && item.type === 'Inventory Part') {
                        const costVal = qty * (item.cost || 0);
                        await Item.findOneAndUpdate({ _id: item._id }, { $inc: { onHand: -qty } }, { session });
                        if (item.assetAccountId) await Account.findOneAndUpdate({ id: item.assetAccountId }, { $inc: { balance: -costVal } }, { session });
                        if (item.cogsAccountId) await Account.findOneAndUpdate({ id: item.cogsAccountId }, { $inc: { balance: costVal } }, { session });

                        // FIFO Lot Logic
                        if (qty !== 0) {
                            if (multiplier === 1) {
                                // Deduct from lots
                                let remainingToDeduct = qty;

                                // If a specific lot was selected by the user, try to deduct from it first
                                if (lineItem.lotNumber) {
                                    const specificLot = await InventoryLot.findOne({
                                        itemId: item.get('id'),
                                        lotNumber: lineItem.lotNumber,
                                        companyId: t.companyId,
                                        userId: t.userId,
                                        quantityRemaining: { $gt: 0 }
                                    }).session(session);

                                    if (specificLot) {
                                        const deduct = Math.min(specificLot.quantityRemaining, remainingToDeduct);
                                        specificLot.quantityRemaining -= deduct;
                                        await specificLot.save({ session });
                                        remainingToDeduct -= deduct;
                                    }
                                }

                                // Fallback to FIFO for any remaining quantity
                                if (remainingToDeduct > 0) {
                                    const availableLots = await InventoryLot.find({
                                        itemId: item.get('id'),
                                        companyId: t.companyId,
                                        userId: t.userId,
                                        quantityRemaining: { $gt: 0 }
                                    }).sort({ dateReceived: 1 }).session(session);

                                    for (const lot of availableLots) {
                                        if (remainingToDeduct <= 0) break;
                                        const deduct = Math.min(lot.quantityRemaining, remainingToDeduct);
                                        lot.quantityRemaining -= deduct;
                                        await lot.save({ session });
                                        remainingToDeduct -= deduct;

                                        // Update lineItem.lotNumber for reversal tracking if it wasn't already set
                                        if (!lineItem.lotNumber) {
                                            lineItem.lotNumber = lot.lotNumber;
                                        }
                                    }
                                }
                            } else {
                                // Reversal: Return qty to the lot specified in the line item
                                if (lineItem.lotNumber) {
                                    await InventoryLot.findOneAndUpdate(
                                        { itemId: item.get('id'), lotNumber: lineItem.lotNumber, companyId: t.companyId, userId: t.userId },
                                        { $inc: { quantityRemaining: -qty } }, // qty is negative here for reversal
                                        { session }
                                    );
                                }
                            }
                        }
                    }
                }
                // Total-level adjustments
                if (t.discountAmount || t.discountPercentage) {
                    const sub = t.subtotal || 0;
                    const disc = t.isDiscountPercentage ? (sub * ((t.discountPercentage || 0) / 100)) : (t.discountAmount || 0);
                    if (disc > 0) {
                        const discAcc = await Account.findOne({ name: 'Discounts Given', userId: t.userId, companyId: t.companyId }).session(session);
                        if (discAcc) await Account.findOneAndUpdate({ _id: discAcc._id }, { $inc: { balance: -disc * multiplier } }, { session });
                    }
                }
                if (t.lateFee) {
                    const feeAcc = await Account.findOne({ name: 'Late Fee Income', userId: t.userId, companyId: t.companyId }).session(session);
                    if (feeAcc) await Account.findOneAndUpdate({ _id: feeAcc._id }, { $inc: { balance: t.lateFee * multiplier } }, { session });
                }
                if (t.tip) {
                    const tipAcc = await Account.findOne({ name: 'Tips', userId: t.userId, companyId: t.companyId }).session(session);
                    if (tipAcc) await Account.findOneAndUpdate({ _id: tipAcc._id }, { $inc: { balance: t.tip * multiplier } }, { session });
                }
            }
        } else if (t.type === 'CREDIT_MEMO') {
            await Customer.findOneAndUpdate({ id: t.entityId }, { $inc: { balance: -total } }, { session });
            const arAccount = await Account.findOne({ name: 'Accounts Receivable', userId: t.userId, companyId: t.companyId }).session(session);
            if (arAccount) await Account.findOneAndUpdate({ _id: arAccount._id }, { $inc: { balance: -total } }, { session });

            // Revenue Impact: Debit "Returns and Allowances" or a Sales account
            // We'll look for "Returns and Allowances" or use the item's income account
            for (const lineItem of t.items) {
                const item = await Item.findOne({ $or: [{ id: lineItem.id }, { name: lineItem.description }, { id: lineItem.itemId }], userId: t.userId, companyId: t.companyId }).session(session);
                const itemAmount = (lineItem.amount || 0) * multiplier; // Apply multiplier here
                const qty = (lineItem.quantity || 0) * multiplier; // Apply multiplier here

                if (item && item.incomeAccountId) {
                    await Account.findOneAndUpdate({ id: item.incomeAccountId }, { $inc: { balance: -itemAmount } }, { session });
                } else {
                    // Fallback to a generic "Returns and Allowances" if it exists, otherwise "Sales"
                    const fallbackAcc = await Account.findOne({ name: { $in: ['Returns and Allowances', 'Sales', 'Income'] }, userId: t.userId, companyId: t.companyId }).session(session);
                    if (fallbackAcc) await Account.findOneAndUpdate({ _id: fallbackAcc._id }, { $inc: { balance: -itemAmount } }, { session });
                }

            }
        } else if (t.type === 'REFUND_RECEIPT') {
            // Refund Receipt: Bank Source DECREASES, Income/AR DECREASES
            const bankAccId = t.depositToId; // Reused field for refund source
            if (bankAccId) {
                const bankAcc = await Account.findOne({ id: bankAccId }).session(session);
                if (bankAcc) await Account.findOneAndUpdate({ _id: bankAcc._id }, { $inc: { balance: -total } }, { session });
            }

            // Debit Income Accounts (Reduction of Revenue)
            for (const lineItem of t.items) {
                const item = await Item.findOne({ $or: [{ id: lineItem.id }, { name: lineItem.description }, { id: lineItem.itemId }], userId: t.userId, companyId: t.companyId }).session(session);
                const itemAmount = lineItem.amount || 0;

                if (item && item.incomeAccountId) {
                    await Account.findOneAndUpdate({ id: item.incomeAccountId }, { $inc: { balance: -itemAmount } }, { session });
                } else {
                    const fallbackAcc = await Account.findOne({ name: { $in: ['Returns and Allowances', 'Sales', 'Income'] }, userId: t.userId, companyId: t.companyId }).session(session);
                    if (fallbackAcc) await Account.findOneAndUpdate({ _id: fallbackAcc._id }, { $inc: { balance: -itemAmount } }, { session });
                }

                // Inventory reversal if applicable
                if (item && (item.type === 'Inventory Part' || item.type === 'Inventory Assembly')) {
                    const qty = lineItem.quantity || 0;
                    const costVal = (item.cost || 0) * qty;
                    await Item.findOneAndUpdate({ _id: item._id }, { $inc: { onHand: qty } }, { session });

                    const assetAcc = await Account.findOne({ name: 'Inventory Asset', userId: t.userId }).session(session);
                    const cogsAcc = await Account.findOne({ name: 'Cost of Goods Sold', userId: t.userId }).session(session);

                    if (assetAcc) await Account.findOneAndUpdate({ _id: assetAcc._id }, { $inc: { balance: costVal } }, { session });
                    if (cogsAcc) await Account.findOneAndUpdate({ _id: cogsAcc._id }, { $inc: { balance: -costVal } }, { session });
                }
            }
        } else if (t.type === 'DELAYED_CHARGE' || t.type === 'DELAYED_CREDIT') {
            // These are non-posting transactions. They do not impact accounts.
            console.log(`[transactionService] skipping accounting for non-posting type: ${t.type}`);
            return;
        } else if (t.type === 'TRANSFER') {
            if (t.transferFromId) await Account.findOneAndUpdate({ id: t.transferFromId }, { $inc: { balance: -total } }, { session });
            if (t.transferToId) await Account.findOneAndUpdate({ id: t.transferToId }, { $inc: { balance: total } }, { session });
        } else if (t.type === 'CC_CHARGE') {
            if (t.bankAccountId) await Account.findOneAndUpdate({ id: t.bankAccountId }, { $inc: { balance: total } }, { session });
        } else if (t.type === 'JOURNAL_ENTRY') {
            for (const line of t.items) {
                if (line.accountId) {
                    const a = await Account.findOne({ id: line.accountId, userId: t.userId }).session(session);
                    if (a) {
                        const isNormalDebit = ['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset', 'Other Asset', 'Expense', 'Cost of Goods Sold', 'Other Expense'].includes(a.type);
                        const inc = (isNormalDebit ? line.amount : -line.amount) * multiplier;
                        await Account.findOneAndUpdate({ _id: a._id }, { $inc: { balance: inc } }, { session });

                        if (line.entityId) {
                            if (a.type === 'Accounts Receivable') {
                                await Customer.findOneAndUpdate({ id: line.entityId }, { $inc: { balance: line.amount * multiplier } }, { session });
                            } else if (a.type === 'Accounts Payable') {
                                await Vendor.findOneAndUpdate({ id: line.entityId }, { $inc: { balance: -line.amount * multiplier } }, { session });
                            }
                        }
                    }
                }
            }
        } else if (t.type === 'PAYCHECK') {
            if (t.bankAccountId) await Account.findOneAndUpdate({ id: t.bankAccountId }, { $inc: { balance: -total } }, { session });

            const payrollLiabAcc = await Account.findOne({ name: 'Payroll Liabilities', userId: t.userId, companyId: t.companyId }).session(session);
            const payrollExpAcc = await Account.findOne({ name: 'Payroll Expenses', userId: t.userId, companyId: t.companyId }).session(session);

            const fedTax = Math.abs(t.items.find(i => i.description === 'Federal Withholding')?.amount || 0);
            const ssTax = Math.abs(t.items.find(i => i.description === 'Social Security')?.amount || 0);
            const medTax = Math.abs(t.items.find(i => i.description === 'Medicare')?.amount || 0);
            const grossWages = t.items.find(i => i.description === 'Gross Wages')?.amount || 0;

            const employerSS = ssTax;
            const employerMed = medTax;

            if (payrollLiabAcc) {
                await Account.findOneAndUpdate({ _id: payrollLiabAcc._id }, { $inc: { balance: (fedTax + ssTax + medTax + employerSS + employerMed) * multiplier } }, { session });
            }
            if (payrollExpAcc) {
                await Account.findOneAndUpdate({ _id: payrollExpAcc._id }, { $inc: { balance: (grossWages + employerSS + employerMed) * multiplier } }, { session });
            }

            if (multiplier === 1) {
                const newLiabilities = [
                    { id: crypto.randomUUID(), type: 'Federal', amount: fedTax, dueDate: '15th of next month', vendorId: 'v_irs', paycheckId: t.id, userId: t.userId, companyId: t.companyId },
                    { id: crypto.randomUUID(), type: 'Social Security', amount: ssTax + employerSS, dueDate: '15th of next month', vendorId: 'v_irs', paycheckId: t.id, userId: t.userId, companyId: t.companyId },
                    { id: crypto.randomUUID(), type: 'Medicare', amount: medTax + employerMed, dueDate: '15th of next month', vendorId: 'v_irs', paycheckId: t.id, userId: t.userId, companyId: t.companyId }
                ].filter(l => l.amount > 0);

                for (const l of newLiabilities) {
                    await new PayrollLiability(l).save({ session });
                }
            } else {
                // Reversal: Delete liabilities linked to this paycheck
                await PayrollLiability.deleteMany({ paycheckId: t.id, userId: t.userId, companyId: t.companyId }).session(session);
            }
        } else if (t.type === 'TAX_PAYMENT') {
            if (t.bankAccountId) await Account.findOneAndUpdate({ id: t.bankAccountId }, { $inc: { balance: -total } }, { session });
            const payrollLiabAcc = await Account.findOne({ name: 'Payroll Liabilities', userId: t.userId, companyId: t.companyId }).session(session);
            if (payrollLiabAcc) await Account.findOneAndUpdate({ _id: payrollLiabAcc._id }, { $inc: { balance: -total } }, { session });

            if (t.appliedCreditIds && multiplier === 1) {
                await PayrollLiability.updateMany({ id: { $in: t.appliedCreditIds } }, { status: 'PAID' }, { session });
            } else if (t.appliedCreditIds && multiplier === -1) {
                await PayrollLiability.updateMany({ id: { $in: t.appliedCreditIds } }, { status: 'OPEN' }, { session });
            }
        } else if (t.type === 'INVENTORY_ADJ') {
            for (const lineItem of t.items) {
                const item = await Item.findOne({ $or: [{ id: lineItem.id }, { name: lineItem.description }], userId: t.userId, companyId: t.companyId }).session(session);
                if (item) {
                    const qtyChange = (lineItem.quantity || 0) * multiplier;
                    await Item.findOneAndUpdate({ _id: item._id }, { $inc: { onHand: qtyChange } }, { session });

                    // Simple value adjustment if bankAccountId/accountId is provided
                    if (t.bankAccountId && item.assetAccountId) {
                        const adjValue = (lineItem.amount || 0) * multiplier;
                        await Account.findOneAndUpdate({ id: item.assetAccountId }, { $inc: { balance: adjValue } }, { session });
                        await Account.findOneAndUpdate({ id: t.bankAccountId }, { $inc: { balance: -adjValue } }, { session });
                    }
                }
            }
        } else if (t.type === 'ASSEMBLY_BUILD') {
            for (const lineItem of t.items) {
                const assembly = await Item.findOne({ $or: [{ id: lineItem.id }, { name: lineItem.description }], userId: t.userId, companyId: t.companyId }).session(session);
                if (assembly && assembly.type === 'Inventory Assembly') {
                    const buildQty = (lineItem.quantity || 0) * multiplier;

                    // 1. Add to Assembly On Hand
                    await Item.findOneAndUpdate({ _id: assembly._id }, { $inc: { onHand: buildQty } }, { session });

                    // 2. Deduct from Components
                    if (assembly.assemblyItems) {
                        for (const comp of assembly.assemblyItems) {
                            const compDeduction = comp.quantity * buildQty;
                            await Item.findOneAndUpdate({ id: comp.itemId, userId: t.userId, companyId: t.companyId }, { $inc: { onHand: -compDeduction } }, { session });
                        }
                    }
                }
            }
        }
    },

    receiveInventoryItems: async (t, session, multiplier = 1) => {
        console.log(`[Inventory] Processing ${t.type} items. Multiplier: ${multiplier}`);
        for (const lineItem of t.items) {
            const itemSearch = { $or: [{ id: lineItem.itemId || lineItem.id }, { name: lineItem.description }], userId: t.userId, companyId: t.companyId };
            const item = await Item.findOne(itemSearch).session(session);

            if (item && item.type === 'Inventory Part') {
                const qty = (lineItem.quantity || 0) * multiplier;
                const amount = (lineItem.amount || 0) * multiplier;
                console.log(`[Inventory] Updating item ${item.name} (${item.get('id')}). Qty change: ${qty}`);
                const updateResult = await Item.findOneAndUpdate({ _id: item._id }, { $inc: { onHand: qty } }, { session, new: true });
                console.log(`[Inventory] New onHand for ${item.name}: ${updateResult?.onHand}`);

                if (item.assetAccountId) {
                    await Account.findOneAndUpdate({ id: item.assetAccountId }, { $inc: { balance: amount } }, { session });
                }

                // Create/Update Lot tracking
                const lotNo = t.lotNumber || lineItem.lotNumber || 'DEFAULT';
                if (multiplier === 1) {
                    const existingLot = await InventoryLot.findOne({ itemId: item.get('id'), lotNumber: lotNo, companyId: t.companyId, userId: t.userId }).session(session);
                    if (existingLot) {
                        existingLot.quantityReceived += qty;
                        existingLot.quantityRemaining += qty;
                        await existingLot.save({ session });
                    } else {
                        const newLot = new InventoryLot({
                            itemId: item.get('id'),
                            lotNumber: lotNo,
                            quantityReceived: qty,
                            quantityRemaining: qty,
                            dateReceived: t.date ? new Date(t.date) : new Date(),
                            purchaseOrderId: t.purchaseOrderId || t.id,
                            companyId: t.companyId,
                            userId: t.userId
                        });
                        await newLot.save({ session });
                    }
                } else {
                    // Reversal
                    await InventoryLot.findOneAndUpdate(
                        { itemId: item.get('id'), lotNumber: lotNo, companyId: t.companyId, userId: t.userId },
                        { $inc: { quantityReceived: -qty, quantityRemaining: -qty } },
                        { session }
                    );
                }
            }
        }
        if (t.purchaseOrderId) {
            const po = await Transaction.findOne({ id: t.purchaseOrderId, userId: t.userId, companyId: t.companyId }).session(session);
            if (po) {
                let allItemsClosed = true;
                const updatedPoItems = po.items.map(poItem => {
                    const receivedItem = t.items.find(ri => (ri.itemId || ri.id) === (poItem.itemId || poItem.id));
                    if (receivedItem) {
                        poItem.receivedQuantity = (poItem.receivedQuantity || 0) + (receivedItem.quantity * multiplier);
                        if (poItem.receivedQuantity >= poItem.quantity) {
                            poItem.isClosed = true;
                        } else {
                            poItem.isClosed = false;
                        }
                    }
                    if (!poItem.isClosed) allItemsClosed = false;
                    return poItem;
                });

                let newStatus = 'PARTIALLY_RECEIVED';
                if (allItemsClosed) newStatus = 'CLOSED';
                if (updatedPoItems.every(i => (i.receivedQuantity || 0) <= 0)) newStatus = 'OPEN';

                await Transaction.findOneAndUpdate(
                    { _id: po._id },
                    { items: updatedPoItems, status: newStatus },
                    { session }
                );
            }
        }
    }
};

module.exports = transactionService;

