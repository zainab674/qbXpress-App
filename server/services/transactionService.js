const mongoose = require('mongoose');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Item = require('../models/Item');
const Account = require('../models/Account');
const AuditLogEntry = require('../models/AuditLogEntry');
const PayrollLiability = require('../models/PayrollLiability');

const transactionService = {
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
                if (t.id && !t.id.includes('.')) {
                    savedTx = await Transaction.findOneAndUpdate({ id: t.id, userId, companyId }, t, { upsert: true, new: true, session });
                } else {
                    t.id = t.id || crypto.randomUUID();
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
                        await Transaction.findOneAndUpdate({ id: receipt.id }, { status: 'CLOSED' }, { session });
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
            if (apAccount) await Account.findOneAndUpdate({ id: apAccount.id }, { $inc: { balance: total } }, { session });

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
            if (apAccount) await Account.findOneAndUpdate({ id: apAccount.id }, { $inc: { balance: -total } }, { session });

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
            const apAccount = await Account.findOne({ name: 'Accounts Payable', userId: t.userId, companyId: t.companyId }).session(session);
            if (apAccount) await Account.findOneAndUpdate({ id: apAccount.id }, { $inc: { balance: -total } }, { session });
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
            const uf = await Account.findOne({ name: 'Undeposited Funds', userId: t.userId, companyId: t.companyId }).session(session);
            if (uf) await Account.findOneAndUpdate({ id: uf.id }, { $inc: { balance: -total } }, { session });

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
                if (arAccount) await Account.findOneAndUpdate({ id: arAccount.id }, { $inc: { balance: total } }, { session });
            } else if (isPayment) {
                await Customer.findOneAndUpdate({ id: t.entityId }, { $inc: { balance: -total } }, { session });
                if (arAccount) await Account.findOneAndUpdate({ id: arAccount.id }, { $inc: { balance: -total } }, { session });

                const uf = await Account.findOne({ name: 'Undeposited Funds', userId: t.userId, companyId: t.companyId }).session(session);
                if (uf) await Account.findOneAndUpdate({ id: uf.id }, { $inc: { balance: total } }, { session });

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
                    if (uf) await Account.findOneAndUpdate({ id: uf.id }, { $inc: { balance: total } }, { session });
                }
            }

            // Inventory and COGS logic ONLY for Sales/Invoices
            if (isInvoice || isReceipt) {
                for (const lineItem of t.items) {
                    const item = await Item.findOne({ id: lineItem.itemId || lineItem.id, userId: t.userId, companyId: t.companyId }).session(session);

                    const amount = (lineItem.amount || 0) * multiplier;
                    const qty = (lineItem.quantity || 0) * multiplier;

                    // Update Income Account
                    const incomeAccId = lineItem.accountId || (item ? item.incomeAccountId : null);
                    if (incomeAccId) {
                        await Account.findOneAndUpdate({ id: incomeAccId }, { $inc: { balance: amount } }, { session });
                    }

                    if (item && item.type === 'Inventory Part') {
                        const costVal = qty * (item.cost || 0);
                        await Item.findOneAndUpdate({ id: item.id }, { $inc: { onHand: -qty } }, { session });
                        if (item.assetAccountId) await Account.findOneAndUpdate({ id: item.assetAccountId }, { $inc: { balance: -costVal } }, { session });
                        if (item.cogsAccountId) await Account.findOneAndUpdate({ id: item.cogsAccountId }, { $inc: { balance: costVal } }, { session });
                    }
                }
            }
        } else if (t.type === 'CREDIT_MEMO') {
            await Customer.findOneAndUpdate({ id: t.entityId }, { $inc: { balance: -total } }, { session });
            const arAccount = await Account.findOne({ name: 'Accounts Receivable', userId: t.userId, companyId: t.companyId }).session(session);
            if (arAccount) await Account.findOneAndUpdate({ id: arAccount.id }, { $inc: { balance: -total } }, { session });

            for (const lineItem of t.items) {
                const item = await Item.findOne({ id: lineItem.id, userId: t.userId, companyId: t.companyId }).session(session);
                if (item && item.type === 'Inventory Part') {
                    await Item.findOneAndUpdate({ id: item.id }, { $inc: { onHand: (lineItem.quantity || 0) * multiplier } }, { session });
                }
            }
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
                        await Account.findOneAndUpdate({ id: a.id }, { $inc: { balance: inc } }, { session });

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
                await Account.findOneAndUpdate({ id: payrollLiabAcc.id }, { $inc: { balance: (fedTax + ssTax + medTax + employerSS + employerMed) * multiplier } }, { session });
            }
            if (payrollExpAcc) {
                await Account.findOneAndUpdate({ id: payrollExpAcc.id }, { $inc: { balance: (grossWages + employerSS + employerMed) * multiplier } }, { session });
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
            if (payrollLiabAcc) await Account.findOneAndUpdate({ id: payrollLiabAcc.id }, { $inc: { balance: -total } }, { session });

            if (t.appliedCreditIds && multiplier === 1) {
                await PayrollLiability.updateMany({ id: { $in: t.appliedCreditIds } }, { status: 'PAID' }, { session });
            } else if (t.appliedCreditIds && multiplier === -1) {
                await PayrollLiability.updateMany({ id: { $in: t.appliedCreditIds } }, { status: 'OPEN' }, { session });
            }
        } else if (t.type === 'INVENTORY_ADJ') {
            for (const lineItem of t.items) {
                const item = await Item.findOne({ id: lineItem.id, userId: t.userId, companyId: t.companyId }).session(session);
                if (item) {
                    const qtyChange = (lineItem.quantity || 0) * multiplier;
                    await Item.findOneAndUpdate({ id: item.id }, { $inc: { onHand: qtyChange } }, { session });

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
                const assembly = await Item.findOne({ id: lineItem.id, userId: t.userId, companyId: t.companyId }).session(session);
                if (assembly && assembly.type === 'Inventory Assembly') {
                    const buildQty = (lineItem.quantity || 0) * multiplier;

                    // 1. Add to Assembly On Hand
                    await Item.findOneAndUpdate({ id: assembly.id }, { $inc: { onHand: buildQty } }, { session });

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
        for (const lineItem of t.items) {
            const item = await Item.findOne({ $or: [{ id: lineItem.id }, { name: lineItem.description }], userId: t.userId, companyId: t.companyId }).session(session);
            if (item && item.type === 'Inventory Part') {
                const qty = (lineItem.quantity || 0) * multiplier;
                const amount = (lineItem.amount || 0) * multiplier;
                await Item.findOneAndUpdate({ id: item.id }, { $inc: { onHand: qty } }, { session });
                if (item.assetAccountId) {
                    await Account.findOneAndUpdate({ id: item.assetAccountId }, { $inc: { balance: amount } }, { session });
                }
            }
        }
        if (t.purchaseOrderId) {
            await Transaction.findOneAndUpdate({ id: t.purchaseOrderId }, { status: multiplier === 1 ? 'CLOSED' : 'OPEN' }, { session });
        }
    }
};

module.exports = transactionService;
