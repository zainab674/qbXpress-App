const { randomUUID: uuidv4 } = require('crypto');
const mongoose = require('mongoose');
const Warehouse = require('../models/Warehouse');
const Bin = require('../models/Bin');
const InventoryLot = require('../models/InventoryLot');
const Item = require('../models/Item');
const TransferLog = require('../models/TransferLog');
const { syncWarehouseQuantities } = require('../utils/warehouseQtySync');

// Running sequence counter for transfer numbers (resets on server restart; good enough for display)
let _transferSeq = 1;
const nextTransferNumber = () => `TO-${String(_transferSeq++).padStart(5, '0')}`;

const warehouseController = {
    list: async (req, res, next) => {
        try {
            const warehouses = await Warehouse.find({
                companyId: req.companyId,
                userId: req.user.id
            }).sort({ isDefault: -1, name: 1 });
            res.json(warehouses);
        } catch (err) {
            next(err);
        }
    },

    create: async (req, res, next) => {
        try {
            const { name, code, address, isDefault } = req.body;
            if (!name) return res.status(400).json({ message: 'Warehouse name is required' });

            if (isDefault) {
                await Warehouse.updateMany(
                    { companyId: req.companyId, userId: req.user.id },
                    { $set: { isDefault: false } }
                );
            }

            const warehouse = new Warehouse({
                id: uuidv4(),
                name,
                code: code || name.slice(0, 4).toUpperCase(),
                address,
                isDefault: isDefault || false,
                companyId: req.companyId,
                userId: req.user.id
            });
            await warehouse.save();
            res.status(201).json(warehouse);
        } catch (err) {
            next(err);
        }
    },

    update: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { name, code, address, isDefault } = req.body;

            if (isDefault) {
                await Warehouse.updateMany(
                    { companyId: req.companyId, userId: req.user.id, id: { $ne: id } },
                    { $set: { isDefault: false } }
                );
            }

            const warehouse = await Warehouse.findOneAndUpdate(
                { id, companyId: req.companyId, userId: req.user.id },
                { name, code, address, isDefault },
                { new: true }
            );
            if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
            res.json(warehouse);
        } catch (err) {
            next(err);
        }
    },

    delete: async (req, res, next) => {
        try {
            const { id } = req.params;
            const warehouse = await Warehouse.findOne({ id, companyId: req.companyId, userId: req.user.id });
            if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
            if (warehouse.isDefault) return res.status(400).json({ message: 'Cannot delete the default warehouse' });

            const lotCount = await InventoryLot.countDocuments({
                warehouseId: id,
                companyId: req.companyId,
                userId: req.user.id,
                quantityRemaining: { $gt: 0 }
            });
            if (lotCount > 0) {
                return res.status(400).json({
                    message: `Cannot delete warehouse: it still holds inventory in ${lotCount} lot(s). Transfer or zero out stock first.`
                });
            }

            // Also delete bins belonging to this warehouse
            await Bin.deleteMany({ warehouseId: id, companyId: req.companyId, userId: req.user.id });
            await Warehouse.deleteOne({ id, companyId: req.companyId, userId: req.user.id });
            res.json({ message: 'Warehouse deleted' });
        } catch (err) {
            next(err);
        }
    },

    // ── Inventory snapshot: warehouse-level + bin-level breakdown ───────────
    getInventorySnapshot: async (req, res, next) => {
        try {
            const warehouses = await Warehouse.find({
                companyId: req.companyId,
                userId: req.user.id
            }).lean();

            const bins = await Bin.find({
                companyId: req.companyId,
                userId: req.user.id,
            }).lean();

            const lots = await InventoryLot.find({
                companyId: req.companyId,
                userId: req.user.id,
                quantityRemaining: { $gt: 0 }
            }).lean();

            const items = await Item.find({
                companyId: req.companyId,
                userId: req.user.id,
                type: 'Inventory Part'
            }).lean();

            const snapshot = items.map(item => {
                // Seed warehouse buckets
                const byWarehouse = {};
                warehouses.forEach(w => {
                    const warehouseBins = bins.filter(b => b.warehouseId === w.id);
                    const binMap = { UNASSIGNED: { qty: 0, binName: 'Unassigned' } };
                    warehouseBins.forEach(b => { binMap[b.id] = { qty: 0, binName: b.name, binCode: b.code }; });
                    byWarehouse[w.id] = { qty: 0, warehouseName: w.name, warehouseCode: w.code, bins: binMap };
                });
                byWarehouse['DEFAULT'] = { qty: 0, warehouseName: 'Default Warehouse', bins: { UNASSIGNED: { qty: 0, binName: 'Unassigned' } } };

                lots
                    .filter(l => l.itemId === item.id)
                    .forEach(l => {
                        const wId = l.warehouseId || 'DEFAULT';
                        if (!byWarehouse[wId]) {
                            byWarehouse[wId] = { qty: 0, warehouseName: wId, bins: { UNASSIGNED: { qty: 0, binName: 'Unassigned' } } };
                        }
                        byWarehouse[wId].qty += l.quantityRemaining;

                        // Bin-level
                        const bId = l.binId || 'UNASSIGNED';
                        const bin = bins.find(b => b.id === l.binId);
                        const binName = bin ? bin.name : (l.binLocation || 'Unassigned');
                        if (!byWarehouse[wId].bins[bId]) {
                            byWarehouse[wId].bins[bId] = { qty: 0, binName };
                        }
                        byWarehouse[wId].bins[bId].qty += l.quantityRemaining;
                    });

                return {
                    itemId: item.id,
                    itemName: item.name,
                    sku: item.sku,
                    totalOnHand: item.onHand,
                    byWarehouse
                };
            });

            res.json({ warehouses, bins, snapshot });
        } catch (err) {
            next(err);
        }
    },

    // ── Transfer: warehouse-level (supports optional bin params) ───────────
    transfer: async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { itemId, fromBinId, toWarehouseId, toBinId, quantity, lotNumber } = req.body;
            const fromWarehouseId = req.body.fromWarehouseId || undefined;
            if (!itemId || !toWarehouseId || !quantity) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: 'itemId, toWarehouseId, quantity are required' });
            }
            if (fromWarehouseId && fromWarehouseId === toWarehouseId && (fromBinId || null) === (toBinId || null)) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: 'Source and destination must differ' });
            }

            let remaining = quantity;

            const sourceQuery = {
                itemId,
                companyId: req.companyId,
                userId: req.user.id,
                quantityRemaining: { $gt: 0 },
            };
            if (fromWarehouseId) {
                sourceQuery.warehouseId = fromWarehouseId === 'DEFAULT'
                    ? { $in: [fromWarehouseId, null] }
                    : fromWarehouseId;
            }
            if (fromBinId) sourceQuery.binId = fromBinId;
            if (lotNumber) sourceQuery.lotNumber = lotNumber;

            const sourceLots = await InventoryLot.find(sourceQuery)
                .sort({ dateReceived: 1 })
                .session(session);

            // ── Bin capacity check before touching any lots ────────────────
            if (toBinId) {
                const destBin = await Bin.findOne({ id: toBinId, companyId: req.companyId }).lean();
                if (destBin && destBin.capacity > 0) {
                    const destLots = await InventoryLot.find({
                        binId: toBinId,
                        companyId: req.companyId,
                        userId: req.user.id,
                        quantityRemaining: { $gt: 0 }
                    }).lean();
                    const currentBinQty = destLots.reduce((sum, l) => sum + l.quantityRemaining, 0);
                    const available = destBin.capacity - currentBinQty;
                    if (currentBinQty + quantity > destBin.capacity) {
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json({
                            message: `Bin "${destBin.name}" can only accept ${available} more unit(s) (capacity: ${destBin.capacity}, currently holds: ${currentBinQty}). Reduce quantity or split the transfer to another bin.`,
                            capacityExceeded: true,
                            binName: destBin.name,
                            capacity: destBin.capacity,
                            currentQty: currentBinQty,
                            available: Math.max(0, available),
                            requested: quantity,
                        });
                    }
                }
            }

            for (const lot of sourceLots) {
                if (remaining <= 0) break;
                const deduct = Math.min(lot.quantityRemaining, remaining);
                lot.quantityRemaining -= deduct;
                await lot.save({ session });
                remaining -= deduct;

                // Find or create destination lot
                const destQuery = {
                    itemId,
                    lotNumber: lot.lotNumber,
                    warehouseId: toWarehouseId,
                    companyId: req.companyId,
                    userId: req.user.id,
                };
                if (toBinId) destQuery.binId = toBinId;
                else destQuery.binId = { $in: [null, undefined] };

                const destLot = await InventoryLot.findOne(destQuery).session(session);

                if (destLot) {
                    destLot.quantityRemaining += deduct;
                    destLot.quantityReceived += deduct;
                    await destLot.save({ session });
                } else {
                    await new InventoryLot({
                        itemId,
                        lotNumber: lot.lotNumber,
                        quantityReceived: deduct,
                        quantityRemaining: deduct,
                        dateReceived: lot.dateReceived,
                        unitCost: lot.unitCost,
                        warehouseId: toWarehouseId,
                        binId: toBinId || undefined,
                        binLocation: lot.binLocation,
                        companyId: req.companyId,
                        userId: req.user.id
                    }).save({ session });
                }
            }

            // ── Fallback: item.onHand may have untracked stock (no InventoryLot records) ──
            if (remaining > 0) {
                const itemDoc = await Item.findOne({ id: itemId, companyId: req.companyId, userId: req.user.id }).session(session);
                if (itemDoc && (itemDoc.onHand || 0) > 0) {
                    // Calculate how much is already tracked in lots
                    const trackedAgg = await InventoryLot.aggregate([
                        { $match: { itemId, companyId: req.companyId, userId: req.user.id } },
                        { $group: { _id: null, total: { $sum: '$quantityRemaining' } } },
                    ]);
                    const tracked = trackedAgg[0]?.total || 0;
                    const untracked = (itemDoc.onHand || 0) - tracked;

                    if (untracked >= remaining) {
                        const unitCost = itemDoc.averageCost || itemDoc.cost || 0;
                        const syntheticLotNumber = 'UNTRACKED-' + Date.now();

                        // Seed a synthetic lot for the untracked inventory, then deduct from it
                        await new InventoryLot({
                            id: uuidv4(),
                            itemId,
                            lotNumber: syntheticLotNumber,
                            quantityReceived: untracked,
                            quantityRemaining: untracked - remaining,
                            dateReceived: new Date(),
                            unitCost,
                            warehouseId: fromWarehouseId || 'DEFAULT',
                            companyId: req.companyId,
                            userId: req.user.id,
                        }).save({ session });

                        // Create/update destination lot
                        const destQuery = {
                            itemId,
                            lotNumber: syntheticLotNumber,
                            warehouseId: toWarehouseId,
                            companyId: req.companyId,
                            userId: req.user.id,
                        };
                        if (toBinId) destQuery.binId = toBinId;
                        else destQuery.binId = { $in: [null, undefined] };

                        const destLot = await InventoryLot.findOne(destQuery).session(session);
                        if (destLot) {
                            destLot.quantityRemaining += remaining;
                            destLot.quantityReceived += remaining;
                            await destLot.save({ session });
                        } else {
                            await new InventoryLot({
                                id: uuidv4(),
                                itemId,
                                lotNumber: syntheticLotNumber,
                                quantityReceived: remaining,
                                quantityRemaining: remaining,
                                dateReceived: new Date(),
                                unitCost,
                                warehouseId: toWarehouseId,
                                binId: toBinId || undefined,
                                companyId: req.companyId,
                                userId: req.user.id,
                            }).save({ session });
                        }
                        remaining = 0;
                    }
                }
            }

            if (remaining > 0) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: `Insufficient stock in source location. Short by ${remaining}` });
            }

            await session.commitTransaction();
            session.endSession();

            // ── Post-commit side-effects (fire-and-forget) ────────────────────
            // 1. Keep per-warehouse quantities current on the Item record
            syncWarehouseQuantities(itemId, req.user.id, req.companyId).catch(e =>
                console.error('[warehouseQtySync] transfer sync failed:', e.message)
            );

            // 2. Persist a TransferLog record for history / audit
            try {
                const [itm, fromWh, toWh, fromBin, toBin] = await Promise.all([
                    Item.findOne({ id: itemId, companyId: req.companyId, userId: req.user.id }).lean(),
                    Warehouse.findOne({ id: fromWarehouseId, companyId: req.companyId }).lean(),
                    Warehouse.findOne({ id: toWarehouseId, companyId: req.companyId }).lean(),
                    fromBinId ? Bin.findOne({ id: fromBinId, companyId: req.companyId }).lean() : null,
                    toBinId ? Bin.findOne({ id: toBinId, companyId: req.companyId }).lean() : null,
                ]);

                // Average cost from lots that were transferred
                const sourceLotSample = await InventoryLot.findOne({
                    itemId, companyId: req.companyId, userId: req.user.id,
                    warehouseId: toWarehouseId,
                }).sort({ dateReceived: -1 }).lean();
                const unitCost = sourceLotSample?.unitCost ?? itm?.averageCost ?? 0;

                await new TransferLog({
                    id: uuidv4(),
                    transferNumber: nextTransferNumber(),
                    date: new Date(),
                    itemId,
                    itemName: itm?.name || itemId,
                    sku: itm?.sku || undefined,
                    fromWarehouseId: fromWarehouseId || undefined,
                    fromWarehouseName: fromWh?.name || fromWarehouseId || undefined,
                    fromBinId: fromBinId || undefined,
                    fromBinName: fromBin?.name || undefined,
                    toWarehouseId,
                    toWarehouseName: toWh?.name || toWarehouseId,
                    toBinId: toBinId || undefined,
                    toBinName: toBin?.name || undefined,
                    quantity,
                    lotNumber: lotNumber || undefined,
                    unitCost,
                    totalValue: quantity * unitCost,
                    transferredBy: req.user.id,
                    companyId: req.companyId,
                    userId: req.user.id,
                }).save();
            } catch (logErr) {
                console.error('[TransferLog] failed to save transfer log:', logErr.message);
            }

            res.json({ message: `Transferred ${quantity} units of item ${itemId} from ${fromWarehouseId}${fromBinId ? '/bin:' + fromBinId : ''} to ${toWarehouseId}${toBinId ? '/bin:' + toBinId : ''}` });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            next(err);
        }
    },

    // ── Cross-warehouse inventory report ────────────────────────────────────
    // GET /warehouses/cross-warehouse-report
    // Returns all Inventory Part items with their qty, value, and reorder status
    // broken down by warehouse — one row per item showing all sites side by side.
    getCrossWarehouseReport: async (req, res, next) => {
        try {
            const { itemId, belowReorderOnly } = req.query;

            const [warehouses, items, lots] = await Promise.all([
                Warehouse.find({ companyId: req.companyId, userId: req.user.id }).sort({ name: 1 }).lean(),
                Item.find({
                    companyId: req.companyId,
                    userId: req.user.id,
                    type: 'Inventory Part',
                    isActive: true,
                    ...(itemId ? { id: itemId } : {})
                }).lean(),
                InventoryLot.find({
                    companyId: req.companyId,
                    userId: req.user.id,
                    quantityRemaining: { $gt: 0 }
                }).lean(),
            ]);

            const warehouseIds = warehouses.map(w => w.id);

            const report = items.map(item => {
                const itemLots = lots.filter(l => l.itemId === item.id);

                const byWarehouse = {};
                warehouseIds.forEach(wId => { byWarehouse[wId] = { qty: 0, value: 0 }; });
                byWarehouse['DEFAULT'] = { qty: 0, value: 0 };

                itemLots.forEach(l => {
                    const wId = l.warehouseId || 'DEFAULT';
                    if (!byWarehouse[wId]) byWarehouse[wId] = { qty: 0, value: 0 };
                    byWarehouse[wId].qty += l.quantityRemaining;
                    byWarehouse[wId].value += l.quantityRemaining * (l.unitCost || item.averageCost || 0);
                });

                // Reorder status per warehouse
                const reorderPoints = {};
                (item.warehouseReorderPoints || []).forEach(r => {
                    reorderPoints[r.warehouseId] = r.reorderPoint;
                });
                const globalReorderPoint = item.reorderPoint || 0;

                const warehouseDetails = warehouseIds.map(wId => {
                    const rp = reorderPoints[wId] ?? globalReorderPoint;
                    const qty = byWarehouse[wId]?.qty || 0;
                    return {
                        warehouseId: wId,
                        warehouseName: warehouses.find(w => w.id === wId)?.name || wId,
                        onHand: qty,
                        value: byWarehouse[wId]?.value || 0,
                        reorderPoint: rp,
                        belowReorder: rp > 0 && qty < rp,
                    };
                });

                const totalQty = warehouseDetails.reduce((s, w) => s + w.onHand, 0);
                const totalValue = warehouseDetails.reduce((s, w) => s + w.value, 0);
                const anyBelowReorder = warehouseDetails.some(w => w.belowReorder);

                return {
                    itemId: item.id,
                    itemName: item.name,
                    sku: item.sku,
                    averageCost: item.averageCost,
                    totalOnHand: totalQty,
                    totalValue,
                    anyBelowReorder,
                    warehouses: warehouseDetails,
                };
            }).filter(row => !belowReorderOnly || row.anyBelowReorder);

            res.json({ warehouses, report });
        } catch (err) { next(err); }
    },

    // ── Transfer History ────────────────────────────────────────────────────
    getTransferHistory: async (req, res, next) => {
        try {
            const { warehouseId, itemId, fromDate, toDate, limit = 200 } = req.query;
            const query = { companyId: req.companyId, userId: req.user.id };
            if (warehouseId) query.$or = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }];
            if (itemId) query.itemId = itemId;
            if (fromDate) query.date = { ...(query.date || {}), $gte: new Date(fromDate) };
            if (toDate) query.date = { ...(query.date || {}), $lte: new Date(toDate + 'T23:59:59') };

            const logs = await TransferLog.find(query)
                .sort({ date: -1 })
                .limit(Math.min(parseInt(limit) || 200, 1000))
                .lean();
            res.json(logs);
        } catch (err) {
            next(err);
        }
    },
};

module.exports = warehouseController;
