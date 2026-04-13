const { randomUUID: uuidv4 } = require('crypto');
const mongoose = require('mongoose');
const Bin = require('../models/Bin');
const Warehouse = require('../models/Warehouse');
const InventoryLot = require('../models/InventoryLot');
const Item = require('../models/Item');

const binController = {
    // ── List bins (optionally filtered by warehouse) ────────────────────────
    list: async (req, res, next) => {
        try {
            const filter = {
                companyId: req.companyId,
                userId: req.user.id,
            };
            if (req.query.warehouseId) filter.warehouseId = req.query.warehouseId;
            const bins = await Bin.find(filter).sort({ warehouseId: 1, zone: 1, aisle: 1, shelf: 1, position: 1, name: 1 });
            res.json(bins);
        } catch (err) {
            next(err);
        }
    },

    // ── Create bin ──────────────────────────────────────────────────────────
    create: async (req, res, next) => {
        try {
            const { name, code, warehouseId, zone, aisle, shelf, position, capacity, notes } = req.body;
            if (!name) return res.status(400).json({ message: 'Bin name is required' });
            if (!warehouseId) return res.status(400).json({ message: 'warehouseId is required' });

            // Verify warehouse belongs to this company
            const wh = await Warehouse.findOne({ id: warehouseId, companyId: req.companyId, userId: req.user.id });
            if (!wh) return res.status(404).json({ message: 'Warehouse not found' });

            const bin = new Bin({
                id: uuidv4(),
                name,
                code: code || name.slice(0, 8).toUpperCase().replace(/\s+/g, '-'),
                warehouseId,
                zone: zone || undefined,
                aisle: aisle || undefined,
                shelf: shelf || undefined,
                position: position || undefined,
                capacity: capacity || 0,
                notes: notes || undefined,
                isActive: true,
                companyId: req.companyId,
                userId: req.user.id,
            });
            await bin.save();
            res.status(201).json(bin);
        } catch (err) {
            next(err);
        }
    },

    // ── Update bin ──────────────────────────────────────────────────────────
    update: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { name, code, zone, aisle, shelf, position, capacity, isActive, notes } = req.body;
            const bin = await Bin.findOneAndUpdate(
                { id, companyId: req.companyId, userId: req.user.id },
                { name, code, zone, aisle, shelf, position, capacity, isActive, notes },
                { new: true }
            );
            if (!bin) return res.status(404).json({ message: 'Bin not found' });
            res.json(bin);
        } catch (err) {
            next(err);
        }
    },

    // ── Delete bin ──────────────────────────────────────────────────────────
    delete: async (req, res, next) => {
        try {
            const { id } = req.params;
            const bin = await Bin.findOne({ id, companyId: req.companyId, userId: req.user.id });
            if (!bin) return res.status(404).json({ message: 'Bin not found' });

            // Block if inventory exists in this bin
            const lotCount = await InventoryLot.countDocuments({
                binId: id,
                companyId: req.companyId,
                userId: req.user.id,
                quantityRemaining: { $gt: 0 },
            });
            if (lotCount > 0) {
                return res.status(400).json({
                    message: `Cannot delete bin: it still holds inventory in ${lotCount} lot(s). Transfer or zero out stock first.`,
                });
            }

            await Bin.deleteOne({ id, companyId: req.companyId, userId: req.user.id });
            res.json({ message: 'Bin deleted' });
        } catch (err) {
            next(err);
        }
    },

    // ── Inventory snapshot: per-bin qty breakdown for all items ────────────
    getInventorySnapshot: async (req, res, next) => {
        try {
            const whFilter = {
                companyId: req.companyId,
                userId: req.user.id,
            };
            if (req.query.warehouseId) whFilter.id = req.query.warehouseId;

            const warehouses = await Warehouse.find(whFilter).lean();
            const warehouseIds = warehouses.map(w => w.id);

            const bins = await Bin.find({
                warehouseId: { $in: warehouseIds },
                companyId: req.companyId,
                userId: req.user.id,
            }).lean();

            const items = await Item.find({
                companyId: req.companyId,
                userId: req.user.id,
                type: 'Inventory Part',
            }).lean();

            const lots = await InventoryLot.find({
                companyId: req.companyId,
                userId: req.user.id,
                warehouseId: { $in: [...warehouseIds, 'DEFAULT', null] },
                quantityRemaining: { $gt: 0 },
            }).lean();

            // Build snapshot: item → warehouse → bin → qty
            const snapshot = items.map(item => {
                const itemLots = lots.filter(l => l.itemId === item.id);

                const byWarehouse = {};
                warehouses.forEach(w => {
                    byWarehouse[w.id] = { qty: 0, warehouseName: w.name, bins: {} };
                });
                byWarehouse['DEFAULT'] = { qty: 0, warehouseName: 'Default Warehouse', bins: {} };

                itemLots.forEach(lot => {
                    const wId = lot.warehouseId || 'DEFAULT';
                    if (!byWarehouse[wId]) byWarehouse[wId] = { qty: 0, warehouseName: wId, bins: {} };
                    byWarehouse[wId].qty += lot.quantityRemaining;

                    const bId = lot.binId || 'UNASSIGNED';
                    const bin = bins.find(b => b.id === lot.binId);
                    const binName = bin ? bin.name : (lot.binLocation || 'Unassigned');
                    if (!byWarehouse[wId].bins[bId]) {
                        byWarehouse[wId].bins[bId] = { qty: 0, binName };
                    }
                    byWarehouse[wId].bins[bId].qty += lot.quantityRemaining;
                });

                return {
                    itemId: item.id,
                    itemName: item.name,
                    sku: item.sku,
                    totalOnHand: item.onHand,
                    byWarehouse,
                };
            });

            res.json({ warehouses, bins, snapshot });
        } catch (err) {
            next(err);
        }
    },

    // ── Transfer: bin-to-bin (within or across warehouses) ─────────────────
    transfer: async (req, res, next) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { itemId, fromWarehouseId, fromBinId, toWarehouseId, toBinId, quantity, lotNumber } = req.body;

            if (!itemId || !toWarehouseId || !quantity) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: 'itemId, toWarehouseId, quantity are required' });
            }
            if (fromWarehouseId && fromWarehouseId === toWarehouseId && fromBinId === toBinId) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: 'Source and destination bin/warehouse must differ' });
            }

            // Verify bins if provided
            if (fromBinId) {
                const fb = await Bin.findOne({ id: fromBinId, companyId: req.companyId, userId: req.user.id });
                if (!fb) { await session.abortTransaction(); session.endSession(); return res.status(404).json({ message: 'Source bin not found' }); }
            }
            if (toBinId) {
                const tb = await Bin.findOne({ id: toBinId, companyId: req.companyId, userId: req.user.id });
                if (!tb) { await session.abortTransaction(); session.endSession(); return res.status(404).json({ message: 'Destination bin not found' }); }

                // Capacity check (capacity 0 = unlimited)
                if (tb.capacity && tb.capacity > 0) {
                    const agg = await InventoryLot.aggregate([
                        { $match: { binId: toBinId, companyId: req.companyId, userId: req.user.id, quantityRemaining: { $gt: 0 } } },
                        { $group: { _id: null, total: { $sum: '$quantityRemaining' } } },
                    ]);
                    const currentQty = agg[0]?.total || 0;
                    const available = tb.capacity - currentQty;
                    if (available <= 0 || quantity > available) {
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json({
                            message: `Bin "${tb.name}" can only accept ${available} more unit(s) (capacity: ${tb.capacity}, currently holds: ${currentQty}). Reduce quantity or split the transfer to another bin.`,
                            capacityExceeded: true,
                            binName: tb.name,
                            capacity: tb.capacity,
                            currentQty,
                            available: Math.max(0, available),
                            requested: quantity,
                        });
                    }
                }
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
                        userId: req.user.id,
                    }).save({ session });
                }
            }

            if (remaining > 0) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: `Insufficient stock in source location. Short by ${remaining}` });
            }

            await session.commitTransaction();
            session.endSession();

            const fromLabel = fromBinId ? `${fromWarehouseId}/bin:${fromBinId}` : fromWarehouseId;
            const toLabel = toBinId ? `${toWarehouseId}/bin:${toBinId}` : toWarehouseId;
            res.json({ message: `Transferred ${quantity} units of item ${itemId} from ${fromLabel} to ${toLabel}` });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            next(err);
        }
    },
};

module.exports = binController;
