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
const SerialNumber = require('../models/SerialNumber');
const { syncWarehouseQuantities } = require('../utils/warehouseQtySync');

// Transaction types that change inventory lot quantities
const INVENTORY_TX_TYPES = new Set([
    'RECEIVE_ITEM', 'BILL', 'INVOICE', 'SALES_RECEIPT',
    'BUILD_ASSEMBLY', 'INVENTORY_ADJUSTMENT', 'CREDIT_MEMO', 'REFUND_RECEIPT', 'SHIPMENT',
]);

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

            const autoPOsCreated = [];

            for (const t of txs) {
                // 1. Check for existing transaction to handle accounting reversal
                const existingTx = t.id ? await Transaction.findOne({ id: t.id, userId, companyId }).session(session) : null;
                // Flag used inside processAccounting to skip auto-PO on edits
                t._existingTx = !!existingTx;

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
                await transactionService.processAccounting(savedTx, session, 1, autoPOsCreated);

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

            // Attach auto-created POs into the first SO result for the controller to forward
            if (autoPOsCreated.length > 0 && results.length > 0) {
                results[0]._autoPOsCreated = autoPOsCreated;
            }

            await session.commitTransaction();

            // ── Per-warehouse quantity sync (fire-and-forget, runs outside the session) ──
            // Collect all item IDs touched by inventory-affecting transactions so that
            // Item.warehouseQuantities stays current without blocking the response.
            try {
                const affectedItemIds = [...new Set(
                    results.flatMap(tx =>
                        INVENTORY_TX_TYPES.has(tx.type)
                            ? (tx.items || []).map(li => li.itemId || li.id).filter(Boolean)
                            : []
                    )
                )];
                if (affectedItemIds.length > 0) {
                    syncWarehouseQuantities(affectedItemIds, userId, companyId).catch(e =>
                        console.error('[warehouseQtySync] background sync failed:', e.message)
                    );
                }
            } catch (_) { /* never block the response */ }

            return results;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    processAccounting: async (t, session, multiplier = 1, autoPOsCreated = null) => {
        if (!t) return;

        const total = (t.total || 0) * multiplier;

        if (t.type === 'SHIPMENT') {
            await transactionService.processShipment(t, session, multiplier);
            return; // no financial AP/AR impact — inventory only
        }

        if (t.type === 'BILL' || t.type === 'RECEIVE_ITEM') {
            // Physical inventory receipt: RECEIVE_ITEM always receives; BILL only when
            // explicitly flagged (created via ReceiveInventoryForm, not BillForm).
            // This prevents BillForm's "Convert PO to Bill" from auto-receiving inventory
            // without warehouse/bin/lot data.
            if (t.type === 'RECEIVE_ITEM' || t.receivesInventory) {
                await transactionService.receiveInventoryItems(t, session, multiplier);
            }

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

                // ── SO Backorder tracking ────────────────────────────────────────────
                // When an invoice is linked to a Sales Order, recalculate the SO's
                // backorderStatus based on total invoiced qty vs ordered qty.
                const linkedSOIds = (t.linkedDocumentIds || []);
                for (const soId of linkedSOIds) {
                    const so = await Transaction.findOne({ id: soId, type: 'SALES_ORDER', userId: t.userId, companyId: t.companyId }).session(session);
                    if (!so) continue;

                    // Collect all invoices ever linked to this SO
                    const allLinkedInvoices = await Transaction.find({
                        type: 'INVOICE',
                        linkedDocumentIds: soId,
                        userId: t.userId,
                        companyId: t.companyId
                    }).session(session);

                    // Build a map: itemId → total qty invoiced across all linked invoices
                    const invoicedQtyMap = {};
                    for (const inv of allLinkedInvoices) {
                        for (const li of inv.items) {
                            const key = li.itemId || li.id;
                            invoicedQtyMap[key] = (invoicedQtyMap[key] || 0) + (li.quantity || 0);
                        }
                    }

                    // Compare to SO quantities
                    let totalOrdered = 0, totalInvoiced = 0;
                    for (const soLine of so.items) {
                        const key = soLine.itemId || soLine.id;
                        totalOrdered += soLine.quantity || 0;
                        totalInvoiced += Math.min(invoicedQtyMap[key] || 0, soLine.quantity || 0);
                    }

                    const newBackorderStatus =
                        totalOrdered === 0 || totalInvoiced >= totalOrdered ? 'NONE'
                        : totalInvoiced === 0 ? 'FULL'
                        : 'PARTIAL';

                    await Transaction.findOneAndUpdate(
                        { _id: so._id },
                        {
                            backorderStatus: newBackorderStatus,
                            $addToSet: { linkedDocumentIds: t.id }
                        },
                        { session }
                    );
                    // Bidirectional: ensure invoice points back at SO
                    await Transaction.findOneAndUpdate(
                        { id: t.id, userId: t.userId, companyId: t.companyId },
                        { $addToSet: { linkedDocumentIds: soId } },
                        { session }
                    );
                }
                // ── Serial Numbers: mark sold when invoice has serialNumbers per line ──
                // Accepts both serialNumbers (array) and legacy serialNumber (string)
                if (multiplier === 1) {
                    const customer = await Customer.findOne({ id: t.entityId, userId: t.userId, companyId: t.companyId }).session(session);
                    for (const li of t.items) {
                        const sns = (li.serialNumbers && li.serialNumbers.length > 0)
                            ? li.serialNumbers.filter(Boolean)
                            : (li.serialNumber ? [li.serialNumber] : []);
                        for (const sn of sns) {
                            await SerialNumber.findOneAndUpdate(
                                { serialNumber: sn, companyId: t.companyId, userId: t.userId },
                                {
                                    $set: {
                                        status: 'sold',
                                        invoiceId: t.id,
                                        customerId: t.entityId,
                                        customerName: customer?.name || t.entityId,
                                        dateSold: new Date(t.date) || new Date(),
                                    }
                                },
                                { session }
                            );
                        }
                    }
                } else {
                    // Reversal: put serials back in-stock
                    for (const li of t.items) {
                        const sns = (li.serialNumbers && li.serialNumbers.length > 0)
                            ? li.serialNumbers.filter(Boolean)
                            : (li.serialNumber ? [li.serialNumber] : []);
                        for (const sn of sns) {
                            await SerialNumber.findOneAndUpdate(
                                { serialNumber: sn, companyId: t.companyId, userId: t.userId },
                                { $set: { status: 'in-stock', invoiceId: null, customerId: null, customerName: null, dateSold: null } },
                                { session }
                            );
                        }
                    }
                }
                // ────────────────────────────────────────────────────────────────────
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
                        const isFifo = (item.valuationMethod || 'Average') === 'FIFO';
                        const warehouseId = lineItem.warehouseId || t.warehouseId || 'DEFAULT';

                        // For Average/Standard: determine unit cost up front.
                        // For FIFO: cost will be accumulated from actual lot costs during depletion below.
                        let unitCostForCOGS = isFifo ? 0 : (item.averageCost || item.cost || 0);
                        let fifoCostAccumulated = 0; // only used for FIFO

                        // ── Lot depletion (FIFO/FEFO) ─────────────────────────────────────────
                        if (qty !== 0) {
                            if (multiplier === 1) {
                                let remainingToDeduct = qty;

                                // If a specific lot was selected by the user, deduct from it first
                                if (lineItem.lotNumber) {
                                    const specificLotQuery = {
                                        itemId: item.get('id'),
                                        lotNumber: lineItem.lotNumber,
                                        companyId: t.companyId,
                                        userId: t.userId,
                                        quantityRemaining: { $gt: 0 },
                                        lotStatus: { $nin: ['on-hold', 'quarantine', 'expired'] }
                                    };
                                    const specificLot = await InventoryLot.findOne({
                                        ...specificLotQuery,
                                        warehouseId
                                    }).session(session) || await InventoryLot.findOne(specificLotQuery).session(session);

                                    if (specificLot) {
                                        const deduct = Math.min(specificLot.quantityRemaining, remainingToDeduct);
                                        specificLot.quantityRemaining -= deduct;
                                        await specificLot.save({ session });
                                        if (isFifo) fifoCostAccumulated += deduct * (specificLot.unitCost || 0);
                                        remainingToDeduct -= deduct;
                                    }
                                }

                                // FIFO/FEFO auto-pick for remaining quantity
                                if (remainingToDeduct > 0) {
                                    const fifoQuery = {
                                        itemId: item.get('id'),
                                        companyId: t.companyId,
                                        userId: t.userId,
                                        quantityRemaining: { $gt: 0 },
                                        lotStatus: { $nin: ['on-hold', 'quarantine', 'expired'] }
                                    };
                                    if (warehouseId && warehouseId !== 'ALL') fifoQuery.warehouseId = warehouseId;

                                    const useFefo = item.get ? item.get('lotPickingMethod') === 'FEFO' : item.lotPickingMethod === 'FEFO';
                                    const lotSortOrder = useFefo
                                        ? { expirationDate: 1, dateReceived: 1 }
                                        : { dateReceived: 1 };

                                    const availableLots = await InventoryLot.find(fifoQuery)
                                        .sort(lotSortOrder).session(session);

                                    for (const lot of availableLots) {
                                        if (remainingToDeduct <= 0) break;
                                        const deduct = Math.min(lot.quantityRemaining, remainingToDeduct);
                                        lot.quantityRemaining -= deduct;
                                        await lot.save({ session });
                                        if (isFifo) fifoCostAccumulated += deduct * (lot.unitCost || 0);
                                        remainingToDeduct -= deduct;
                                        if (!lineItem.lotNumber) lineItem.lotNumber = lot.lotNumber;
                                    }
                                }

                                if (remainingToDeduct > 0) {
                                    throw new Error(
                                        `Insufficient stock for item "${item.name || item.get('id')}" in warehouse "${warehouseId}". ` +
                                        `Requested: ${qty}, short by: ${remainingToDeduct}`
                                    );
                                }
                            } else {
                                // Reversal: return qty to the lot specified in the line item
                                if (lineItem.lotNumber) {
                                    await InventoryLot.findOneAndUpdate(
                                        { itemId: item.get('id'), lotNumber: lineItem.lotNumber, companyId: t.companyId, userId: t.userId },
                                        { $inc: { quantityRemaining: -qty } },
                                        { session }
                                    );
                                }
                            }
                        }

                        // ── COGS & asset GL posting ───────────────────────────────────────────
                        // FIFO forward sale: use accumulated lot cost.
                        // FIFO reversal: fifoCostAccumulated is 0 (lot depletion skipped), so fall
                        //   back to averageCost * |qty| — same approximation QB uses for reversals.
                        //   qty is already negative on reversal, so costVal will be negative, which
                        //   correctly credits COGS and debits asset.
                        // Average/Standard: qty is signed, unitCostForCOGS is positive → costVal signed.
                        let costVal;
                        if (isFifo) {
                            if (multiplier === 1) {
                                costVal = fifoCostAccumulated; // positive, debit COGS
                            } else {
                                // Reversal: reverse the cost at current average cost (best proxy available)
                                costVal = qty * (item.averageCost || item.cost || 0); // qty is negative → costVal negative
                            }
                        } else {
                            costVal = qty * unitCostForCOGS; // qty is signed
                        }
                        const newOnHand = (item.onHand || 0) - qty;
                        // Effective unit cost for updating totalValue on the item record.
                        // For FIFO forward: use lot-actual unit cost.
                        // For FIFO reversal: use averageCost (fallback).
                        const absQty = Math.abs(qty);
                        const effectiveUnitCost = isFifo
                            ? (multiplier === 1 && absQty > 0 ? fifoCostAccumulated / absQty : item.averageCost || item.cost || 0)
                            : unitCostForCOGS;
                        await Item.findOneAndUpdate(
                            { _id: item._id },
                            { $set: { onHand: newOnHand, totalValue: newOnHand * effectiveUnitCost } },
                            { session }
                        );
                        if (item.assetAccountId) await Account.findOneAndUpdate({ id: item.assetAccountId }, { $inc: { balance: -costVal } }, { session });
                        if (item.cogsAccountId) await Account.findOneAndUpdate({ id: item.cogsAccountId }, { $inc: { balance: costVal } }, { session });
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
                // Resolve item by itemId (the Item record's id field), not the transaction-line UUID
                const item = await Item.findOne(
                    { id: lineItem.itemId, userId: t.userId, companyId: t.companyId }
                ).session(session);
                if (!item) continue;

                const qtyChange  = (lineItem.quantity  || 0) * multiplier;
                const curOnHand  = item.onHand        || 0;
                const curAvgCost = item.averageCost    || item.cost || 0;
                const newOnHand  = curOnHand + qtyChange;

                // ── Recompute average cost (QB behavior) ──────────────────────────────
                // "Total Value" or "Qty + Value" adjustment: use the explicit new cost.
                // Quantity-only increase at existing cost: weighted average (no change in practice).
                // Quantity decrease: average cost is unchanged.
                let newAvgCost = curAvgCost;
                if (lineItem.newCost != null) {
                    newAvgCost = lineItem.newCost;
                } else if (qtyChange > 0 && newOnHand > 0) {
                    newAvgCost = ((curOnHand * curAvgCost) + (qtyChange * curAvgCost)) / newOnHand;
                }

                const newTotalValue = Math.max(0, newOnHand) * newAvgCost;

                await Item.findOneAndUpdate(
                    { _id: item._id },
                    { $set: { onHand: newOnHand, averageCost: newAvgCost, totalValue: newTotalValue } },
                    { session }
                );

                // ── InventoryLot maintenance for lot-tracked items ─────────────────────
                if (item.trackLots && qtyChange !== 0) {
                    const whId  = lineItem.warehouseId || t.warehouseId || 'DEFAULT';
                    const lotNo = lineItem.lotNumber   || `ADJ-${t.refNo}`;

                    if (qtyChange > 0) {
                        // Positive adjustment: add to existing adj lot or create new
                        const existingAdjLot = await InventoryLot.findOne({
                            itemId: item.get('id'), lotNumber: lotNo,
                            warehouseId: whId, companyId: t.companyId, userId: t.userId,
                        }).session(session);

                        if (existingAdjLot) {
                            await InventoryLot.findOneAndUpdate(
                                { _id: existingAdjLot._id },
                                { $inc: { quantityReceived: qtyChange, quantityRemaining: qtyChange },
                                  $set: { unitCost: newAvgCost } },
                                { session }
                            );
                        } else {
                            await InventoryLot.create([{
                                id: crypto.randomUUID(),
                                itemId: item.get('id'),
                                lotNumber: lotNo,
                                warehouseId: whId,
                                quantityReceived: qtyChange,
                                quantityRemaining: qtyChange,
                                unitCost: newAvgCost,
                                totalCost: qtyChange * newAvgCost,
                                dateReceived: t.date || new Date(),
                                lotStatus: 'available',
                                notes: lineItem.reasonCode || t.memo || 'Inventory Adjustment',
                                companyId: t.companyId,
                                userId: t.userId,
                            }], { session });
                        }
                    } else {
                        // Negative adjustment: FIFO deduction across lots in this warehouse
                        let remaining = Math.abs(qtyChange);
                        const lots = await InventoryLot.find({
                            itemId: item.get('id'), warehouseId: whId,
                            companyId: t.companyId, userId: t.userId,
                            quantityRemaining: { $gt: 0 },
                            lotStatus: { $in: ['available', 'on-hold'] },
                        }).sort({ dateReceived: 1 }).session(session);

                        for (const lot of lots) {
                            if (remaining <= 0) break;
                            const deduct = Math.min(lot.quantityRemaining, remaining);
                            remaining -= deduct;
                            await InventoryLot.findOneAndUpdate(
                                { _id: lot._id },
                                { $inc: { quantityRemaining: -deduct } },
                                { session }
                            );
                        }
                    }
                }

                // ── Journal entry: DR Inventory Asset / CR Adjustment Account ─────────
                if (t.bankAccountId && item.assetAccountId) {
                    const adjValue = (lineItem.amount || 0) * multiplier;
                    if (adjValue !== 0) {
                        await Account.findOneAndUpdate(
                            { id: item.assetAccountId }, { $inc: { balance: adjValue } }, { session }
                        );
                        await Account.findOneAndUpdate(
                            { id: t.bankAccountId }, { $inc: { balance: -adjValue } }, { session }
                        );
                    }
                }
            }
        } else if (t.type === 'ASSEMBLY_BUILD') {
            // ── Effective quantity = baseQty * (1 + scrapPercent/100) / (yieldPercent/100) ──
            const effectiveQty = (baseQty, scrapPercent = 0, yieldPercent = 100) => {
                const scrap = Math.max(0, scrapPercent || 0);
                const yield_ = Math.max(1, yieldPercent || 100);
                return baseQty * (1 + scrap / 100) / (yield_ / 100);
            };

            // Recursively flatten multi-level BOM into { itemId -> { qty, cost } }
            // Returns: { itemId: { qty: totalEffectiveQty, unitCost: componentUnitCost } }
            const flattenBOM = async (assemblyId, qty, visited = new Set()) => {
                if (visited.has(assemblyId)) return {}; // circular reference guard
                visited.add(assemblyId);

                const asm = await Item.findOne({ id: assemblyId, userId: t.userId, companyId: t.companyId }).session(session);
                if (!asm || !asm.assemblyItems || asm.assemblyItems.length === 0) return {};

                const flat = {};
                for (const comp of asm.assemblyItems) {
                    const effQty = effectiveQty(comp.quantity * qty, comp.scrapPercent, comp.yieldPercent);
                    const compItem = await Item.findOne({ id: comp.itemId, userId: t.userId, companyId: t.companyId }).session(session);

                    if (compItem && compItem.type === 'Inventory Assembly') {
                        // Sub-assembly: recurse instead of directly deducting
                        const subFlat = await flattenBOM(comp.itemId, effQty, new Set(visited));
                        for (const [subId, subData] of Object.entries(subFlat)) {
                            if (!flat[subId]) flat[subId] = { qty: 0, unitCost: subData.unitCost };
                            flat[subId].qty += subData.qty;
                        }
                    } else if (compItem && compItem.type === 'Inventory Part') {
                        // Only deduct stock for inventory parts — services have no qty to track
                        const unitCost = compItem.averageCost || compItem.cost || 0;
                        if (!flat[comp.itemId]) flat[comp.itemId] = { qty: 0, unitCost };
                        flat[comp.itemId].qty += effQty;
                    }
                    // Service / Non-inventory items: no onHand deduction
                }
                return flat;
            };

            for (const lineItem of t.items) {
                const assembly = await Item.findOne({ $or: [{ id: lineItem.id }, { name: lineItem.description }], userId: t.userId, companyId: t.companyId }).session(session);
                if (assembly && assembly.type === 'Inventory Assembly') {
                    const buildQty = (lineItem.quantity || 0) * multiplier;
                    const absBuildQty = Math.abs(buildQty);

                    // 1. Add/remove finished assembly on hand
                    await Item.findOneAndUpdate({ _id: assembly._id }, { $inc: { onHand: buildQty } }, { session });

                    // 1b. Create InventoryLot for the finished assembly (if lot-tracked and lot number provided)
                    if (assembly.trackLots && t.outputLotNumber) {
                        if (multiplier === 1) {
                            const existingLot = await InventoryLot.findOne({
                                lotNumber: t.outputLotNumber,
                                itemId: assembly.get('id'),
                                companyId: t.companyId,
                                userId: t.userId,
                            }).session(session);
                            if (existingLot) {
                                await InventoryLot.findOneAndUpdate(
                                    { _id: existingLot._id },
                                    { $inc: { quantityReceived: absBuildQty, quantityRemaining: absBuildQty } },
                                    { session }
                                );
                            } else {
                                const unitCost = assembly.standardCost || assembly.averageCost || 0;
                                const lotDoc = new InventoryLot({
                                    itemId: assembly.get('id'),
                                    lotNumber: t.outputLotNumber,
                                    quantityReceived: absBuildQty,
                                    quantityRemaining: absBuildQty,
                                    unitCost,
                                    totalCost: unitCost * absBuildQty,
                                    dateReceived: new Date(t.date) || new Date(),
                                    expirationDate: t.outputLotExpirationDate ? new Date(t.outputLotExpirationDate) : undefined,
                                    manufacturingDate: t.outputLotManufacturingDate ? new Date(t.outputLotManufacturingDate) : undefined,
                                    receiptId: t.id,
                                    notes: `Built via ${t.refNo}`,
                                    warehouseId: t.warehouseId || 'DEFAULT',
                                    companyId: t.companyId,
                                    userId: t.userId,
                                });
                                await lotDoc.save({ session });
                            }
                        } else if (multiplier === -1) {
                            // Reversal: reduce the lot quantity
                            await InventoryLot.findOneAndUpdate(
                                { lotNumber: t.outputLotNumber, itemId: assembly.get('id'), companyId: t.companyId, userId: t.userId },
                                { $inc: { quantityReceived: -absBuildQty, quantityRemaining: -absBuildQty } },
                                { session }
                            );
                        }
                    }

                    // 1c. Serial number tracking: create a serial for the finished assembly if provided
                    if (multiplier === 1 && lineItem.serialNumber && assembly.trackSerialNumbers) {
                        const exists = await SerialNumber.findOne({
                            serialNumber: lineItem.serialNumber, companyId: t.companyId, userId: t.userId
                        }).session(session);
                        if (!exists) {
                            const snDoc = new SerialNumber({
                                id: crypto.randomUUID(),
                                itemId: assembly.get('id'),
                                serialNumber: lineItem.serialNumber,
                                status: 'in-stock',
                                unitCost: assembly.standardCost || assembly.averageCost || 0,
                                dateReceived: new Date(t.date) || new Date(),
                                notes: `Built via ${t.refNo}`,
                                warehouseId: t.warehouseId || 'DEFAULT',
                                companyId: t.companyId,
                                userId: t.userId,
                            });
                            await snDoc.save({ session });
                        }
                    } else if (multiplier === -1 && lineItem.serialNumber) {
                        // Reversal: scrap the serial
                        await SerialNumber.findOneAndUpdate(
                            { serialNumber: lineItem.serialNumber, companyId: t.companyId, userId: t.userId },
                            { $set: { status: 'scrapped' } },
                            { session }
                        );
                    }

                    // 2. Flatten multi-level BOM (with scrap/yield) and deduct all raw components
                    const flatComponents = await flattenBOM(assembly.get('id'), absBuildQty);
                    let actualBuildCost = 0;
                    for (const [compItemId, compData] of Object.entries(flatComponents)) {
                        const deduction = multiplier === 1 ? -compData.qty : compData.qty;
                        await Item.findOneAndUpdate(
                            { id: compItemId, userId: t.userId, companyId: t.companyId },
                            { $inc: { onHand: deduction } },
                            { session }
                        );
                        actualBuildCost += compData.qty * compData.unitCost;

                        // Consume component InventoryLots FIFO from sourceWarehouseId (if specified)
                        if (multiplier === 1 && compData.qty > 0) {
                            const lotFilter = {
                                itemId: compItemId,
                                companyId: t.companyId,
                                userId: t.userId,
                                quantityRemaining: { $gt: 0 },
                                ...(t.sourceWarehouseId ? { warehouseId: t.sourceWarehouseId } : {}),
                            };
                            const compLots = await InventoryLot.find(lotFilter).sort({ dateReceived: 1 }).session(session);
                            let remainingToDeduct = compData.qty;
                            for (const lot of compLots) {
                                if (remainingToDeduct <= 0) break;
                                const take = Math.min(lot.quantityRemaining, remainingToDeduct);
                                await InventoryLot.findOneAndUpdate(
                                    { _id: lot._id },
                                    { $inc: { quantityRemaining: -take } },
                                    { session }
                                );
                                remainingToDeduct -= take;
                            }
                        } else if (multiplier === -1 && compData.qty > 0) {
                            // Reversal: restore lots — add back to most recent lot in source warehouse
                            const lotFilter = {
                                itemId: compItemId,
                                companyId: t.companyId,
                                userId: t.userId,
                                ...(t.sourceWarehouseId ? { warehouseId: t.sourceWarehouseId } : {}),
                            };
                            const lastLot = await InventoryLot.findOne(lotFilter).sort({ dateReceived: -1 }).session(session);
                            if (lastLot) {
                                await InventoryLot.findOneAndUpdate(
                                    { _id: lastLot._id },
                                    { $inc: { quantityRemaining: compData.qty } },
                                    { session }
                                );
                            }
                        }
                    }

                    // 3. ── Standard Cost Variance Analysis + GL Posting ──
                    // Only calculate when the assembly uses Standard valuation
                    if (assembly.valuationMethod === 'Standard' && assembly.standardCost != null && absBuildQty > 0) {
                        const standardBuildCost = assembly.standardCost * absBuildQty;
                        const variance = actualBuildCost - standardBuildCost; // positive = unfavorable (over standard)
                        const actualCostPerUnit = actualBuildCost / absBuildQty;

                        // Accumulate variance on the item (reversed on VOID/reversal)
                        const varianceDelta = multiplier === 1 ? variance : -variance;
                        await Item.findOneAndUpdate(
                            { _id: assembly._id },
                            {
                                $inc: { standardCostVariance: varianceDelta },
                                $set: { lastActualCost: actualCostPerUnit }
                            },
                            { session }
                        );

                        // 4. ── Post GL Journal Entries ──
                        // DR: Finished Goods Inventory (assembly asset account) at standard cost
                        // CR: Component Inventory accounts at actual cost
                        // DR/CR: Manufacturing Variance account for the difference
                        if (assembly.assetAccountId) {
                            await Account.findOneAndUpdate(
                                { id: assembly.assetAccountId, userId: t.userId, companyId: t.companyId },
                                { $inc: { balance: standardBuildCost * multiplier } },
                                { session }
                            );
                        }

                        for (const [compItemId, compData] of Object.entries(flatComponents)) {
                            const compItem = await Item.findOne({ id: compItemId, userId: t.userId, companyId: t.companyId }).session(session);
                            if (compItem?.assetAccountId) {
                                await Account.findOneAndUpdate(
                                    { id: compItem.assetAccountId, userId: t.userId, companyId: t.companyId },
                                    { $inc: { balance: -(compData.qty * compData.unitCost) * multiplier } },
                                    { session }
                                );
                            }
                        }

                        if (Math.abs(variance) >= 0.005) {
                            // Find or auto-create Manufacturing Variance account
                            let varAcct = await Account.findOne({
                                userId: t.userId, companyId: t.companyId,
                                name: { $in: ['Manufacturing Variance', 'Cost Variance', 'Production Variance'] }
                            }).session(session);

                            if (!varAcct) {
                                const newAcct = new Account({
                                    id: 'acct_mfg_var_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12),
                                    userId: t.userId,
                                    companyId: t.companyId,
                                    name: 'Manufacturing Variance',
                                    type: 'Cost of Goods Sold',
                                    description: 'Standard cost manufacturing variance — auto-created',
                                    balance: 0,
                                });
                                await newAcct.save({ session });
                                varAcct = newAcct;
                            }

                            // DR variance account when unfavorable (actual > standard), CR when favorable
                            await Account.findOneAndUpdate(
                                { _id: varAcct._id },
                                { $inc: { balance: varianceDelta } },
                                { session }
                            );

                            // Stamp the variance details onto the build transaction for audit trail
                            await Transaction.findOneAndUpdate(
                                { id: t.id, userId: t.userId, companyId: t.companyId },
                                { $set: { varianceAmount: variance, varianceAccountId: varAcct.id } },
                                { session }
                            );
                        }
                    }

                    // 4. Update linked Work Order progress (if this build is against a WO)
                    if (t.linkedWorkOrderId) {
                        const wo = await Transaction.findOne({
                            id: t.linkedWorkOrderId, userId: t.userId, companyId: t.companyId
                        }).session(session);
                        if (wo) {
                            const newCompleted = multiplier === 1
                                ? (wo.quantityCompleted || 0) + absBuildQty
                                : Math.max(0, (wo.quantityCompleted || 0) - absBuildQty);
                            const planned = wo.quantityPlanned || 0;
                            const newStatus = newCompleted === 0
                                ? 'OPEN'
                                : newCompleted >= planned
                                    ? 'COMPLETE'
                                    : 'IN_PROGRESS';
                            await Transaction.findOneAndUpdate(
                                { _id: wo._id },
                                { $set: { quantityCompleted: newCompleted, workOrderStatus: newStatus } },
                                { session }
                            );
                        }
                    }
                }
            }
        } else if (t.type === 'WORK_ORDER') {
            // Work Orders are planning documents — no inventory movement on creation
            // Inventory moves when ASSEMBLY_BUILD transactions reference this WO via linkedWorkOrderId
        } else if (t.type === 'PURCHASE_ORDER') {
            // Track onPurchaseOrder qty for each inventory item
            for (const lineItem of t.items) {
                const item = await Item.findOne({
                    $or: [{ id: lineItem.itemId || lineItem.id }, { name: lineItem.description }],
                    userId: t.userId, companyId: t.companyId
                }).session(session);
                if (item && (item.type === 'Inventory Part' || item.type === 'Inventory Assembly')) {
                    const qty = (lineItem.quantity || 0) * multiplier;
                    await Item.findOneAndUpdate({ _id: item._id }, { $inc: { onPurchaseOrder: qty } }, { session });
                }
            }
        } else if (t.type === 'SALES_ORDER') {
            // Track onSalesOrder qty for each inventory item
            for (const lineItem of t.items) {
                const item = await Item.findOne({
                    $or: [{ id: lineItem.itemId || lineItem.id }, { name: lineItem.description }],
                    userId: t.userId, companyId: t.companyId
                }).session(session);
                if (item && (item.type === 'Inventory Part' || item.type === 'Inventory Assembly')) {
                    const qty = (lineItem.quantity || 0) * multiplier;
                    await Item.findOneAndUpdate({ _id: item._id }, { $inc: { onSalesOrder: qty } }, { session });
                }
            }

            // ── Auto-create POs for shortfalls on new SO saves ────────────────────
            // Only on forward save (multiplier === 1) and only if the SO is new (no existingTx)
            if (multiplier === 1 && !t._existingTx && t.autoPO !== false && autoPOsCreated) {
                const newPOs = await transactionService.autoCreatePOsForSO(t, session);
                autoPOsCreated.push(...newPOs);
            }
        }
    },

    receiveInventoryItems: async (t, session, multiplier = 1) => {
        for (const lineItem of t.items) {
            const itemSearch = { $or: [{ id: lineItem.itemId || lineItem.id }, { name: lineItem.description }], userId: t.userId, companyId: t.companyId };
            const item = await Item.findOne(itemSearch).session(session);

            if (item && item.type === 'Inventory Part') {
                const qty = (lineItem.quantity || 0) * multiplier;
                const amount = (lineItem.amount || 0) * multiplier;

                // Unit cost for this receipt line
                const lineUnitCost = lineItem.rate != null
                    ? lineItem.rate
                    : (lineItem.quantity ? (lineItem.amount || 0) / lineItem.quantity : (item.averageCost || item.cost || 0));

                // ── Cost calculation per valuation method ──────────────────────────────
                // FIFO: do NOT update averageCost; derive totalValue from open lots instead.
                // Average: weighted average recalc (QB default).
                // Standard: fixed cost — never changes.
                let newAverageCost = item.averageCost || item.cost || 0;
                const currentQty = item.onHand || 0;
                const isFifoItem = (item.valuationMethod || 'Average') === 'FIFO';

                if (!isFifoItem && multiplier === 1 && qty > 0 && item.valuationMethod !== 'Standard') {
                    // Average cost weighted recalc
                    const totalExistingValue = currentQty * newAverageCost;
                    const totalNewValue = qty * lineUnitCost;
                    const newTotalQty = currentQty + qty;
                    newAverageCost = newTotalQty > 0 ? (totalExistingValue + totalNewValue) / newTotalQty : lineUnitCost;
                }

                const newOnHand = currentQty + qty;

                if (isFifoItem) {
                    // FIFO totalValue = sum of (quantityRemaining * unitCost) across all open lots
                    const lotAgg = await InventoryLot.aggregate([
                        { $match: { itemId: item.get('id'), companyId: t.companyId, userId: t.userId, quantityRemaining: { $gt: 0 } } },
                        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$quantityRemaining', '$unitCost'] } } } }
                    ]).session(session);
                    const fifoTotalValue = lotAgg[0]?.totalValue || 0;
                    // Keep averageCost as a convenience read-only field (value ÷ qty) for reports
                    const fifoAvgCost = newOnHand > 0 ? fifoTotalValue / newOnHand : lineUnitCost;
                    await Item.findOneAndUpdate(
                        { _id: item._id },
                        { $set: { onHand: newOnHand, averageCost: fifoAvgCost, totalValue: fifoTotalValue } },
                        { session }
                    );
                } else {
                    await Item.findOneAndUpdate(
                        { _id: item._id },
                        { $set: { onHand: newOnHand, averageCost: newAverageCost, totalValue: newOnHand * newAverageCost } },
                        { session }
                    );
                }

                // Decrement onPurchaseOrder when items are received against a PO
                if (t.purchaseOrderId) {
                    const receivedQty = (lineItem.quantity || 0) * multiplier;
                    await Item.findOneAndUpdate(
                        { _id: item._id },
                        { $inc: { onPurchaseOrder: -receivedQty } },
                        { session }
                    );
                }

                if (item.assetAccountId) {
                    await Account.findOneAndUpdate({ id: item.assetAccountId }, { $inc: { balance: amount } }, { session });
                }

                // Create/Update Lot tracking (warehouse-aware)
                const lotNo = t.lotNumber || lineItem.lotNumber || 'DEFAULT';
                const warehouseId = lineItem.warehouseId || t.warehouseId || 'DEFAULT';
                if (multiplier === 1) {
                    const existingLot = await InventoryLot.findOne({
                        itemId: item.get('id'), lotNumber: lotNo, warehouseId, companyId: t.companyId, userId: t.userId
                    }).session(session);
                    if (existingLot) {
                        existingLot.quantityReceived += qty;
                        existingLot.quantityRemaining += qty;
                        // Update lot-level cost (weighted avg of what was in this lot before)
                        const prevTotal = existingLot.unitCost * (existingLot.quantityReceived - qty);
                        existingLot.unitCost = (prevTotal + lineUnitCost * qty) / existingLot.quantityReceived;
                        existingLot.totalCost = existingLot.unitCost * existingLot.quantityReceived;
                        await existingLot.save({ session });
                    } else {
                        const newLot = new InventoryLot({
                            itemId: item.get('id'),
                            lotNumber: lotNo,
                            quantityReceived: qty,
                            quantityRemaining: qty,
                            unitCost: lineUnitCost,
                            totalCost: lineUnitCost * qty,
                            dateReceived: t.date ? new Date(t.date) : new Date(),
                            // QB Enterprise: capture expiry, manufacturing date, and vendor's lot# at receipt
                            expirationDate: lineItem.expirationDate ? new Date(lineItem.expirationDate) : undefined,
                            manufacturingDate: lineItem.manufacturingDate ? new Date(lineItem.manufacturingDate) : undefined,
                            vendorLotNumber: lineItem.vendorLotNumber || undefined,
                            purchaseOrderId: t.purchaseOrderId || t.id,
                            billId: t.type === 'BILL' ? t.id : undefined,
                            vendorName: lineItem.vendorName || t.vendorName,
                            warehouseId,
                            companyId: t.companyId,
                            userId: t.userId
                        });
                        await newLot.save({ session });
                    }
                } else {
                    // Reversal — reduce lot quantities
                    await InventoryLot.findOneAndUpdate(
                        { itemId: item.get('id'), lotNumber: lotNo, warehouseId, companyId: t.companyId, userId: t.userId },
                        { $inc: { quantityReceived: -qty, quantityRemaining: -qty } },
                        { session }
                    );
                }
            }
        }
        // Only update PO received quantities when inventory is physically received
        // (RECEIVE_ITEM always; BILL only when receivesInventory=true via ReceiveInventoryForm)
        if (t.purchaseOrderId && (t.type === 'RECEIVE_ITEM' || t.receivesInventory)) {
            const po = await Transaction.findOne({ id: t.purchaseOrderId, userId: t.userId, companyId: t.companyId }).session(session);
            if (po) {
                let allItemsClosed = true;
                const updatedPoItems = po.items.map(poItem => {
                    const receivedItem = t.items.find(ri => (ri.itemId || ri.id) === (poItem.itemId || poItem.id));
                    if (receivedItem) {
                        poItem.receivedQuantity = (poItem.receivedQuantity || 0) + (receivedItem.quantity * multiplier);

                        // Honor explicit isClosed flag from the receipt line item (Partial Receiving: "Close Line" checkbox)
                        if (receivedItem.isClosed && multiplier === 1) {
                            poItem.isClosed = true;
                        } else if (poItem.receivedQuantity >= poItem.quantity) {
                            poItem.isClosed = true;
                        } else if (multiplier === -1) {
                            // On reversal: reopen the line unless it was already fully received
                            poItem.isClosed = poItem.receivedQuantity >= poItem.quantity;
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

                // Determine backorder status: any open lines mean partial/full backorder
                const openLines = updatedPoItems.filter(i => !i.isClosed);
                const newBackorderStatus = openLines.length === 0 ? 'NONE'
                    : updatedPoItems.every(i => (i.receivedQuantity || 0) === 0) ? 'FULL'
                    : 'PARTIAL';

                await Transaction.findOneAndUpdate(
                    { _id: po._id },
                    {
                        items: updatedPoItems,
                        status: newStatus,
                        backorderStatus: newBackorderStatus,
                        // Bidirectional: add the receipt/bill ID to PO's linkedDocumentIds
                        $addToSet: { linkedDocumentIds: t.id }
                    },
                    { session }
                );

                // Bidirectional: add PO's id to the receipt/bill's linkedDocumentIds
                await Transaction.findOneAndUpdate(
                    { id: t.id, userId: t.userId, companyId: t.companyId },
                    { $addToSet: { linkedDocumentIds: po.id } },
                    { session }
                );
            }
        }

        // Bidirectional: link a BILL to its source RECEIVE_ITEM
        if (t.type === 'BILL' && t.itemReceiptId) {
            await Transaction.findOneAndUpdate(
                { id: t.itemReceiptId, userId: t.userId, companyId: t.companyId },
                { $addToSet: { linkedDocumentIds: t.id } },
                { session }
            );
            await Transaction.findOneAndUpdate(
                { id: t.id, userId: t.userId, companyId: t.companyId },
                { $addToSet: { linkedDocumentIds: t.itemReceiptId } },
                { session }
            );
        }
    },

    // ── SHIPMENT: deduct inventory lots from fulfillment warehouse, update SO ──
    processShipment: async (t, session, multiplier = 1) => {
        const lines = t.shippedLines || t.items || [];

        for (const line of lines) {
            const itemId = line.itemId || line.id;
            if (!itemId) continue;
            const item = await Item.findOne({
                $or: [{ id: itemId }, { name: line.itemName }],
                userId: t.userId, companyId: t.companyId
            }).session(session);
            if (!item || item.type !== 'Inventory Part') continue;

            const qty = (line.packedQty || line.quantity || 0) * multiplier;
            const warehouseId = line.warehouseId || t.fulfillmentWarehouseId || 'DEFAULT';
            const lotNo = line.lotNumber;

            // Adjust Item.onHand
            await Item.findOneAndUpdate(
                { _id: item._id },
                { $inc: { onHand: -qty } },
                { session }
            );

            if (lotNo) {
                // Deduct specific lot
                const lot = await InventoryLot.findOne({
                    itemId: item.get('id'), lotNumber: lotNo, warehouseId,
                    companyId: t.companyId, userId: t.userId
                }).session(session);
                if (lot) {
                    lot.quantityRemaining = Math.max(0, lot.quantityRemaining - qty);
                    if (lot.quantityRemaining <= 0) lot.lotStatus = 'consumed';
                    await lot.save({ session });
                }
            } else {
                // FIFO deduction — oldest lots first
                let remaining = Math.abs(qty);
                const lots = await InventoryLot.find({
                    itemId: item.get('id'), warehouseId,
                    companyId: t.companyId, userId: t.userId,
                    quantityRemaining: { $gt: 0 },
                    lotStatus: { $in: ['available', 'on-hold'] }
                }).sort({ dateReceived: 1 }).session(session);

                for (const lot of lots) {
                    if (remaining <= 0) break;
                    const deduct = Math.min(lot.quantityRemaining, remaining);
                    lot.quantityRemaining -= deduct;
                    if (lot.quantityRemaining <= 0) lot.lotStatus = 'consumed';
                    await lot.save({ session });
                    remaining -= deduct;
                }
            }

            // ── Serial Number: mark transferred when a serial-tracked line is shipped ──
            if (line.serialNumber) {
                const snUpdate = multiplier === 1
                    ? { $set: { status: 'transferred', dateSold: new Date() } }
                    : { $set: { status: 'in-stock', dateSold: null } };
                await SerialNumber.findOneAndUpdate(
                    { serialNumber: line.serialNumber, companyId: t.companyId, userId: t.userId },
                    snUpdate,
                    { session }
                );
            }
        }

        // Link SHIPMENT ↔ source SO bidirectionally and update SO status
        const soIds = (t.linkedDocumentIds || []).filter(id => id !== t.id);
        for (const soId of soIds) {
            const so = await Transaction.findOne({
                id: soId, type: 'SALES_ORDER', userId: t.userId, companyId: t.companyId
            }).session(session);
            if (!so) continue;

            // Determine new SO status
            const totalOrdered = so.items.reduce((s, i) => s + (i.quantity || 0), 0);
            const totalShipped = lines.reduce((s, l) => s + (l.packedQty || l.quantity || 0), 0);
            const newSoStatus = multiplier === -1 ? 'OPEN'
                : totalShipped >= totalOrdered ? 'Shipped' : 'Partially Shipped';

            await Transaction.findOneAndUpdate(
                { _id: so._id },
                { status: newSoStatus, $addToSet: { linkedDocumentIds: t.id } },
                { session }
            );
        }

        // Bidirectional: add SO ids to shipment's linkedDocumentIds
        if (soIds.length > 0 && multiplier === 1) {
            await Transaction.findOneAndUpdate(
                { id: t.id, userId: t.userId, companyId: t.companyId },
                { $addToSet: { linkedDocumentIds: { $each: soIds } } },
                { session }
            );
        }
    }
};

/**
 * Auto-create Purchase Orders for any SO line items with insufficient stock.
 * Groups shortfall lines by preferredVendorId (one PO per vendor).
 * Returns an array of plain objects describing each PO created: { poId, vendorId, vendorName }.
 */
transactionService.autoCreatePOsForSO = async (so, session) => {
    const Vendor = require('../models/Vendor');
    const created = [];

    // Collect shortfall lines grouped by preferredVendorId
    const byVendor = {};
    for (const lineItem of so.items || []) {
        if (!lineItem.itemId && !lineItem.id) continue;
        const item = await Item.findOne({
            $or: [{ id: lineItem.itemId || lineItem.id }, { name: lineItem.description }],
            userId: so.userId, companyId: so.companyId
        }).session(session);

        if (!item || (item.type !== 'Inventory Part' && item.type !== 'Inventory Assembly')) continue;

        const available = (item.onHand || 0) - (item.onSalesOrder || 0);
        const needed = lineItem.quantity || 0;
        if (available >= needed) continue; // enough stock — no PO needed

        const shortfall = needed - available;
        const vendorId = item.preferredVendorId || 'UNKNOWN';

        if (!byVendor[vendorId]) byVendor[vendorId] = { vendorId, lines: [] };
        byVendor[vendorId].lines.push({
            id: crypto.randomUUID(),
            itemId: item.get('id'),
            description: item.name,
            quantity: shortfall,
            rate: item.cost || item.averageCost || 0,
            amount: shortfall * (item.cost || item.averageCost || 0),
            tax: false,
        });
    }

    for (const { vendorId, lines } of Object.values(byVendor)) {
        if (lines.length === 0) continue;

        const vendor = vendorId !== 'UNKNOWN'
            ? await Vendor.findOne({ id: vendorId, userId: so.userId, companyId: so.companyId }).session(session)
            : null;

        const poId = crypto.randomUUID();
        const poRefNo = `AUTO-PO-${Date.now().toString(36).toUpperCase()}`;

        const po = new Transaction({
            id: poId,
            type: 'PURCHASE_ORDER',
            refNo: poRefNo,
            date: so.date || new Date().toISOString().split('T')[0],
            entityId: vendorId !== 'UNKNOWN' ? vendorId : undefined,
            status: 'OPEN',
            items: lines,
            total: lines.reduce((s, l) => s + (l.amount || 0), 0),
            userId: so.userId,
            companyId: so.companyId,
            linkedDocumentIds: [so.id],
            memo: `Auto-created from Sales Order ${so.refNo || so.id}`,
        });
        await po.save({ session });

        // Link PO back to SO
        await Transaction.findOneAndUpdate(
            { id: so.id, userId: so.userId, companyId: so.companyId },
            { $addToSet: { linkedDocumentIds: poId } },
            { session }
        );

        // Increment onPurchaseOrder for each item
        for (const line of lines) {
            await Item.findOneAndUpdate(
                { id: line.itemId, userId: so.userId, companyId: so.companyId },
                { $inc: { onPurchaseOrder: line.quantity } },
                { session }
            );
        }

        created.push({ poId, vendorId, vendorName: vendor?.name || vendorId, poRefNo, lineCount: lines.length });
    }

    return created;
};

module.exports = transactionService;

