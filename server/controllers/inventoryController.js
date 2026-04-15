const crypto = require('crypto');
const mongoose = require('mongoose');
const InventoryLot = require('../models/InventoryLot');
const SerialNumber = require('../models/SerialNumber');
const InventoryCount = require('../models/InventoryCount');
const Transaction = require('../models/Transaction');
const PriceLevel = require('../models/PriceLevel');
const Item = require('../models/Item');

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Flatten a multi-level BOM into { itemId -> totalQtyNeeded } */
function flattenBOM(rootId, rootQty, itemMap, visited = new Set()) {
    if (visited.has(rootId)) return {};
    const item = itemMap[rootId];
    if (!item) return {};
    if (item.type === 'Inventory Assembly' && item.assemblyItems?.length) {
        const v2 = new Set(visited).add(rootId);
        const result = {};
        for (const comp of item.assemblyItems) {
            const sub = flattenBOM(comp.itemId, (comp.quantity || 0) * rootQty, itemMap, v2);
            for (const [id, qty] of Object.entries(sub)) {
                result[id] = (result[id] || 0) + qty;
            }
        }
        return result;
    }
    return { [rootId]: rootQty };
}

// ─── Lots ────────────────────────────────────────────────────────────────────

const getAvailableLots = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const { warehouseId, includeExpired } = req.query;

        const query = {
            itemId,
            companyId: req.companyId,
            userId: req.user.id,
            quantityRemaining: { $gt: 0 }
        };
        if (warehouseId) query.warehouseId = warehouseId;
        if (!includeExpired) {
            query.$or = [
                { expirationDate: null },
                { expirationDate: { $gt: new Date() } }
            ];
            query.lotStatus = { $ne: 'expired' };
        }

        const lots = await InventoryLot.find(query).sort({ dateReceived: 1 }); // FIFO
        res.json(lots);
    } catch (err) {
        next(err);
    }
};

const updateLot = async (req, res, next) => {
    try {
        const { lotId } = req.params;
        const { expirationDate, manufacturingDate, lotStatus, notes, binLocation, vendorName } = req.body;

        const lot = await InventoryLot.findOneAndUpdate(
            { _id: lotId, companyId: req.companyId, userId: req.user.id },
            { $set: { expirationDate, manufacturingDate, lotStatus, notes, binLocation, vendorName } },
            { new: true }
        );
        if (!lot) return res.status(404).json({ message: 'Lot not found' });
        res.json(lot);
    } catch (err) {
        next(err);
    }
};

const deleteLot = async (req, res, next) => {
    try {
        const { lotId } = req.params;
        const lot = await InventoryLot.findOne({ _id: lotId, companyId: req.companyId, userId: req.user.id });
        if (!lot) return res.status(404).json({ message: 'Lot not found' });

        // Restore quantity back to item onHand before removing the lot
        if (lot.quantityRemaining > 0) {
            await Item.findOneAndUpdate(
                { id: lot.itemId, companyId: req.companyId, userId: req.user.id },
                { $inc: { onHand: -lot.quantityRemaining } }
            );
        }

        await lot.deleteOne();
        res.json({ message: 'Lot deleted', lotId, quantityRemoved: lot.quantityRemaining });
    } catch (err) {
        next(err);
    }
};

/** Directly assign existing on-hand inventory to a named lot (reassigns from UNTRACKED pool) */
const assignLot = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const { lotNumber, quantity, unitCost, expirationDate, manufacturingDate, warehouseId, notes, vendorName } = req.body;

        if (!lotNumber || !lotNumber.trim()) return res.status(400).json({ message: 'lotNumber is required' });
        if (!quantity || quantity <= 0) return res.status(400).json({ message: 'quantity must be greater than 0' });

        const item = await Item.findOne({ id: itemId, userId: req.user.id, companyId: req.companyId });
        if (!item) return res.status(404).json({ message: 'Item not found' });
        if (!item.trackLots) return res.status(400).json({ message: 'Item does not have lot tracking enabled' });

        // Prevent duplicate lot numbers for this item
        const duplicate = await InventoryLot.findOne({ itemId, lotNumber: lotNumber.trim(), companyId: req.companyId, userId: req.user.id });
        if (duplicate) return res.status(409).json({ message: `Lot number "${lotNumber}" already exists for this item` });

        // Deduct from UNTRACKED lot(s) — assignment is a reassignment, not new inventory
        let remaining = quantity;
        const untrackedLots = await InventoryLot.find({
            itemId,
            companyId: req.companyId,
            userId: req.user.id,
            lotNumber: /^UNTRACKED-/,
            quantityRemaining: { $gt: 0 },
        }).sort({ dateReceived: 1 });

        const totalUntracked = untrackedLots.reduce((sum, l) => sum + l.quantityRemaining, 0);
        if (totalUntracked < quantity) {
            return res.status(400).json({
                message: `Only ${totalUntracked} untracked unit(s) available to assign. Cannot assign ${quantity}.`
            });
        }

        for (const ul of untrackedLots) {
            if (remaining <= 0) break;
            const deduct = Math.min(ul.quantityRemaining, remaining);
            ul.quantityRemaining -= deduct;
            remaining -= deduct;
            await ul.save();
        }

        const costPerUnit = unitCost ?? item.averageCost ?? item.cost ?? 0;
        const lot = await InventoryLot.create({
            itemId,
            lotNumber: lotNumber.trim(),
            quantityReceived: quantity,
            quantityRemaining: quantity,
            unitCost: costPerUnit,
            totalCost: costPerUnit * quantity,
            dateReceived: new Date(),
            expirationDate: expirationDate || undefined,
            manufacturingDate: manufacturingDate || undefined,
            warehouseId: warehouseId || 'DEFAULT',
            notes: notes || undefined,
            vendorName: vendorName || undefined,
            lotStatus: 'available',
            companyId: req.companyId,
            userId: req.user.id,
        });

        res.status(201).json(lot);
    } catch (err) {
        next(err);
    }
};

/**
 * Reconcile UNTRACKED lot(s) for an item so total lot qty matches item.onHand.
 * Fixes existing data where assignLot created named lots without deducting UNTRACKED.
 */
const reconcileUntrackedLot = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const item = await Item.findOne({ id: itemId, userId: req.user.id, companyId: req.companyId });
        if (!item) return res.status(404).json({ message: 'Item not found' });

        const allLots = await InventoryLot.find({
            itemId, companyId: req.companyId, userId: req.user.id, quantityRemaining: { $gt: 0 }
        });

        const namedTotal = allLots
            .filter(l => !/^UNTRACKED-/.test(l.lotNumber))
            .reduce((sum, l) => sum + l.quantityRemaining, 0);

        const untrackedLots = allLots
            .filter(l => /^UNTRACKED-/.test(l.lotNumber))
            .sort((a, b) => new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime());

        const onHand = item.onHand || 0;
        const correctUntracked = Math.max(0, onHand - namedTotal);
        const currentUntracked = untrackedLots.reduce((sum, l) => sum + l.quantityRemaining, 0);

        if (currentUntracked === correctUntracked) {
            return res.json({ message: 'No reconciliation needed', onHand, namedTotal, untrackedTotal: currentUntracked });
        }

        // Adjust UNTRACKED lots to match correct total
        let target = correctUntracked;
        for (const ul of untrackedLots) {
            ul.quantityRemaining = Math.min(ul.quantityRemaining, target);
            target -= ul.quantityRemaining;
            await ul.save();
        }

        res.json({
            message: 'Reconciled',
            onHand,
            namedTotal,
            untrackedBefore: currentUntracked,
            untrackedAfter: correctUntracked,
        });
    } catch (err) {
        next(err);
    }
};

/** Mark expired lots automatically */
const refreshLotStatuses = async (req, res, next) => {
    try {
        const now = new Date();
        const result = await InventoryLot.updateMany(
            {
                companyId: req.companyId,
                userId: req.user.id,
                expirationDate: { $lte: now },
                lotStatus: 'available',
                quantityRemaining: { $gt: 0 }
            },
            { $set: { lotStatus: 'expired' } }
        );
        res.json({ markedExpired: result.modifiedCount });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /inventory/lots/expiring-soon?days=30
 * QB Enterprise: Lot Expiration Alerts — lots expiring within N days (default 30)
 */
const getExpiringLots = async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const now = new Date();
        const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        const lots = await InventoryLot.find({
            companyId: req.companyId,
            userId: req.user.id,
            expirationDate: { $gte: now, $lte: cutoff },
            lotStatus: { $in: ['available', 'on-hold'] },
            quantityRemaining: { $gt: 0 }
        }).sort({ expirationDate: 1 }).lean();

        // Enrich with item names
        const itemIds = [...new Set(lots.map(l => l.itemId))];
        const items = itemIds.length
            ? await Item.find({ id: { $in: itemIds }, companyId: req.companyId, userId: req.user.id }).lean()
            : [];
        const itemMap = Object.fromEntries(items.map(i => [i.id, i.name]));

        const enriched = lots.map(l => ({
            ...l,
            itemName: itemMap[l.itemId] || l.itemId,
            daysUntilExpiry: Math.ceil((new Date(l.expirationDate) - now) / (1000 * 60 * 60 * 24))
        }));

        res.json({ lots: enriched, windowDays: days, count: enriched.length });
    } catch (err) {
        next(err);
    }
};

// ─── Serial Numbers ───────────────────────────────────────────────────────────

const getSerialNumbers = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const { status, warehouseId } = req.query;
        const query = {
            itemId,
            companyId: req.companyId,
            userId: req.user.id
        };
        if (status) query.status = status;
        if (warehouseId) query.warehouseId = warehouseId;

        const serials = await SerialNumber.find(query).sort({ dateReceived: -1 });
        res.json(serials);
    } catch (err) {
        next(err);
    }
};

const createSerialNumber = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const {
            serialNumber, unitCost, dateReceived, warrantyExpiry, expirationDate,
            manufacturingDate, purchaseOrderId, billId, vendorName, warehouseId,
            binLocation, lotNumber, notes
        } = req.body;

        if (!serialNumber) return res.status(400).json({ message: 'serialNumber is required' });

        // Check for duplicate within company
        const existing = await SerialNumber.findOne({
            serialNumber,
            companyId: req.companyId,
            userId: req.user.id
        });
        if (existing) return res.status(409).json({ message: `Serial number "${serialNumber}" already exists` });

        const sn = new SerialNumber({
            id: crypto.randomUUID(),
            itemId,
            serialNumber,
            unitCost: unitCost || 0,
            dateReceived: dateReceived ? new Date(dateReceived) : new Date(),
            warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
            expirationDate: expirationDate ? new Date(expirationDate) : undefined,
            manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : undefined,
            purchaseOrderId,
            billId,
            vendorName,
            warehouseId: warehouseId || 'DEFAULT',
            binLocation,
            lotNumber,
            notes,
            status: 'in-stock',
            companyId: req.companyId,
            userId: req.user.id
        });
        await sn.save();
        res.status(201).json(sn);
    } catch (err) {
        next(err);
    }
};

const updateSerialNumber = async (req, res, next) => {
    try {
        const { snId } = req.params;
        const updates = req.body;
        const sn = await SerialNumber.findOneAndUpdate(
            { id: snId, companyId: req.companyId, userId: req.user.id },
            { $set: updates },
            { new: true }
        );
        if (!sn) return res.status(404).json({ message: 'Serial number not found' });
        res.json(sn);
    } catch (err) {
        next(err);
    }
};

const batchCreateSerials = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const { serialNumbers, unitCost, dateReceived, purchaseOrderId, receiptId, vendorName,
                warehouseId, binLocation, lotNumber, notes } = req.body;

        if (!Array.isArray(serialNumbers) || serialNumbers.length === 0)
            return res.status(400).json({ message: 'serialNumbers array is required' });

        const duplicates = [];
        const created = [];

        for (const sn of serialNumbers) {
            if (!sn || !sn.trim()) continue;
            const exists = await SerialNumber.findOne({
                serialNumber: sn.trim(), companyId: req.companyId, userId: req.user.id
            });
            if (exists) { duplicates.push(sn.trim()); continue; }
            const doc = new SerialNumber({
                id: crypto.randomUUID(),
                itemId,
                serialNumber: sn.trim(),
                unitCost: unitCost || 0,
                dateReceived: dateReceived ? new Date(dateReceived) : new Date(),
                purchaseOrderId, receiptId, vendorName,
                warehouseId: warehouseId || 'DEFAULT',
                binLocation, lotNumber, notes,
                status: 'in-stock',
                companyId: req.companyId,
                userId: req.user.id
            });
            await doc.save();
            created.push(doc);
        }
        res.status(201).json({ created, duplicates });
    } catch (err) {
        next(err);
    }
};

/** GET /inventory/serials/history/:serialNumber — full where-used trail */
const getSerialHistory = async (req, res, next) => {
    try {
        const { serialNumber } = req.params;
        const sn = await SerialNumber.findOne({
            serialNumber,
            companyId: req.companyId,
            userId: req.user.id
        }).lean();
        if (!sn) return res.status(404).json({ message: 'Serial number not found' });

        // Enrich with item name
        const item = await Item.findOne({ id: sn.itemId, companyId: req.companyId, userId: req.user.id }).lean();

        const history = [];

        // Receipt event
        history.push({
            event: 'Received',
            date: sn.dateReceived,
            refNo: sn.purchaseOrderId || sn.receiptId || '—',
            entityName: sn.vendorName || '—',
            notes: sn.notes || ''
        });

        // Sale event
        if (sn.invoiceId) {
            history.push({
                event: 'Sold / Invoiced',
                date: sn.dateSold,
                refNo: sn.invoiceId,
                entityName: sn.customerName || '—',
                notes: ''
            });
        }

        // Return event
        if (sn.status === 'returned') {
            history.push({ event: 'Returned', date: sn.updatedAt, refNo: '—', entityName: '—', notes: '' });
        }

        res.json({ serialNumber: sn, itemName: item?.name || sn.itemId, history });
    } catch (err) {
        next(err);
    }
};

// ─── BOM ─────────────────────────────────────────────────────────────────────

const getBOMCostRollup = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const userId = req.user.id;
        const { companyId } = req;

        const allItems = await Item.find({ userId, companyId }).lean();
        const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]));

        const buildTree = (id, qty = 1, depth = 0, visited = new Set()) => {
            if (visited.has(id)) return { itemId: id, name: itemMap[id]?.name || id, qty, unitCost: 0, totalCost: 0, circular: true, children: [] };
            const item = itemMap[id];
            if (!item) return null;
            const newVisited = new Set(visited).add(id);

            if (item.type === 'Inventory Assembly' && item.assemblyItems?.length) {
                const children = item.assemblyItems
                    .map(c => buildTree(c.itemId, c.quantity * qty, depth + 1, newVisited))
                    .filter(Boolean);
                const totalCost = children.reduce((s, c) => s + c.totalCost, 0);
                return { itemId: id, name: item.name, sku: item.sku, type: item.type, qty, unitCost: qty ? totalCost / qty : 0, totalCost, depth, children };
            }

            // Use average cost if available, fall back to cost field
            const unitCost = item.averageCost || item.cost || 0;
            return { itemId: id, name: item.name, sku: item.sku, type: item.type, qty, unitCost, totalCost: unitCost * qty, depth, children: [] };
        };

        const tree = buildTree(itemId);
        if (!tree) return res.status(404).json({ message: 'Item not found' });

        const flatten = (node) => {
            const rows = [{ itemId: node.itemId, name: node.name, sku: node.sku, type: node.type, qty: node.qty, unitCost: node.unitCost, totalCost: node.totalCost, depth: node.depth, circular: node.circular }];
            (node.children || []).forEach(c => rows.push(...flatten(c)));
            return rows;
        };

        res.json({ tree, flat: flatten(tree) });
    } catch (err) {
        next(err);
    }
};

const updateBOM = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const { assemblyItems } = req.body;

        if (!Array.isArray(assemblyItems)) return res.status(400).json({ message: 'assemblyItems must be an array' });

        for (const [i, comp] of assemblyItems.entries()) {
            if (!comp.itemId) return res.status(400).json({ message: `assemblyItems[${i}].itemId is required` });
            if (typeof comp.quantity !== 'number' || comp.quantity <= 0) return res.status(400).json({ message: `assemblyItems[${i}].quantity must be > 0` });
            if (comp.itemId === itemId) return res.status(400).json({ message: `assemblyItems[${i}] self-reference — circular BOM not allowed` });
        }

        const item = await Item.findOneAndUpdate(
            { id: itemId, companyId: req.companyId, userId: req.user.id },
            { $set: { assemblyItems, type: 'Inventory Assembly' } },
            { new: true }
        );
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json({ itemId, assemblyItems: item.assemblyItems });
    } catch (err) {
        next(err);
    }
};

const getBOMShortage = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const buildQty = parseFloat(req.query.quantity) || 1;
        const { warehouseId } = req.query;
        const userId = req.user.id;
        const { companyId } = req;

        const item = await Item.findOne({ id: itemId, userId, companyId }).lean();
        if (!item) return res.status(404).json({ message: 'Item not found' });
        if (item.type !== 'Inventory Assembly') return res.status(400).json({ message: 'Item is not an Inventory Assembly' });
        if (!item.assemblyItems?.length) return res.json({ components: [], canBuild: true, maxBuildable: Infinity });

        const allItems = await Item.find({ userId, companyId }).lean();
        const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]));

        const flatNeeds = {};
        for (const comp of item.assemblyItems) {
            const sub = flattenBOM(comp.itemId, (comp.quantity || 0) * buildQty, itemMap);
            for (const [id, qty] of Object.entries(sub)) {
                flatNeeds[id] = (flatNeeds[id] || 0) + qty;
            }
        }

        const componentIds = Object.keys(flatNeeds);
        const lotQuery = {
            itemId: { $in: componentIds },
            userId, companyId,
            quantityRemaining: { $gt: 0 },
            $or: [{ expirationDate: null }, { expirationDate: { $gt: new Date() } }],
            lotStatus: { $ne: 'expired' }
        };
        if (warehouseId) lotQuery.warehouseId = warehouseId;

        const lots = await InventoryLot.find(lotQuery).lean();
        const availableMap = {};
        for (const lot of lots) {
            availableMap[lot.itemId] = (availableMap[lot.itemId] || 0) + lot.quantityRemaining;
        }

        const components = componentIds.map(cid => {
            const needed = flatNeeds[cid];
            const available = availableMap[cid] || 0;
            const shortfall = Math.max(0, needed - available);
            return {
                itemId: cid,
                name: itemMap[cid]?.name || cid,
                sku: itemMap[cid]?.sku,
                needed,
                available,
                shortfall,
                sufficient: shortfall === 0,
                unitCost: itemMap[cid]?.averageCost || itemMap[cid]?.cost || 0
            };
        });

        const maxBuildable = componentIds.reduce((min, cid) => {
            const perUnit = flatNeeds[cid] / buildQty;
            if (perUnit === 0) return min;
            return Math.min(min, Math.floor((availableMap[cid] || 0) / perUnit));
        }, Infinity);

        const canBuild = components.every(c => c.sufficient);
        res.json({ components, canBuild, maxBuildable: maxBuildable === Infinity ? 0 : maxBuildable });
    } catch (err) {
        next(err);
    }
};

/** QB: Pending Builds — assemblies where buildPoint is set and onHand < buildPoint */
const getPendingBuilds = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { companyId } = req;

        const assemblies = await Item.find({
            userId, companyId,
            type: 'Inventory Assembly',
            isActive: true,
            buildPoint: { $gt: 0 }
        }).lean();

        const allItems = await Item.find({ userId, companyId }).lean();
        const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]));

        const lots = await InventoryLot.find({
            userId, companyId,
            quantityRemaining: { $gt: 0 },
            $or: [{ expirationDate: null }, { expirationDate: { $gt: new Date() } }],
            lotStatus: { $ne: 'expired' }
        }).lean();
        const availableMap = {};
        for (const lot of lots) {
            availableMap[lot.itemId] = (availableMap[lot.itemId] || 0) + lot.quantityRemaining;
        }

        const pending = assemblies
            .filter(a => (a.onHand || 0) < (a.buildPoint || 0))
            .map(a => {
                const needed = (a.buildPoint || 0) - (a.onHand || 0);
                // Check component availability for `needed` builds
                const flatNeeds = {};
                for (const comp of (a.assemblyItems || [])) {
                    const sub = flattenBOM(comp.itemId, (comp.quantity || 0) * needed, itemMap);
                    for (const [id, qty] of Object.entries(sub)) {
                        flatNeeds[id] = (flatNeeds[id] || 0) + qty;
                    }
                }
                const canBuild = Object.entries(flatNeeds).every(([id, qty]) => (availableMap[id] || 0) >= qty);
                return {
                    itemId: a.id,
                    name: a.name,
                    sku: a.sku,
                    onHand: a.onHand || 0,
                    buildPoint: a.buildPoint || 0,
                    qtyToBuild: needed,
                    canBuild,
                    components: Object.entries(flatNeeds).map(([id, qty]) => ({
                        itemId: id,
                        name: itemMap[id]?.name || id,
                        needed: qty,
                        available: availableMap[id] || 0,
                        shortfall: Math.max(0, qty - (availableMap[id] || 0))
                    }))
                };
            });

        res.json(pending);
    } catch (err) {
        next(err);
    }
};

// ─── Inventory Valuation ──────────────────────────────────────────────────────

/** QB: Inventory Valuation Summary — one row per item */
const getValuationSummary = async (req, res, next) => {
    try {
        const { asOfDate, warehouseId } = req.query;
        const userId = req.user.id;
        const { companyId } = req;

        const items = await Item.find({
            userId, companyId,
            type: { $in: ['Inventory Part', 'Inventory Assembly'] },
            isActive: true
        }).lean();

        const lotQuery = { userId, companyId, quantityRemaining: { $gt: 0 } };
        if (warehouseId) lotQuery.warehouseId = warehouseId;
        if (asOfDate) lotQuery.dateReceived = { $lte: new Date(asOfDate) };

        const lots = await InventoryLot.find(lotQuery).lean();

        // Aggregate quantity and value by item from lots
        const lotAgg = {};
        for (const lot of lots) {
            if (!lotAgg[lot.itemId]) lotAgg[lot.itemId] = { qty: 0, value: 0 };
            lotAgg[lot.itemId].qty += lot.quantityRemaining;
            lotAgg[lot.itemId].value += lot.quantityRemaining * (lot.unitCost || 0);
        }

        const rows = items.map(item => {
            const agg = lotAgg[item.id] || { qty: item.onHand || 0, value: 0 };
            const avgCost = item.averageCost || item.cost || 0;
            const qty = agg.qty;
            const totalValue = lotAgg[item.id]
                ? agg.value  // use lot-level costs
                : qty * avgCost;
            return {
                itemId: item.id,
                name: item.name,
                sku: item.sku,
                type: item.type,
                valuationMethod: item.valuationMethod || 'Average',
                qtyOnHand: qty,
                averageCost: qty ? totalValue / qty : avgCost,
                assetValue: totalValue,
                salesPrice: item.salesPrice || 0,
                retailValue: qty * (item.salesPrice || 0)
            };
        }).filter(r => r.qtyOnHand !== 0 || r.assetValue !== 0);

        const totals = rows.reduce((acc, r) => ({
            totalQty: acc.totalQty + r.qtyOnHand,
            totalAssetValue: acc.totalAssetValue + r.assetValue,
            totalRetailValue: acc.totalRetailValue + r.retailValue
        }), { totalQty: 0, totalAssetValue: 0, totalRetailValue: 0 });

        res.json({ rows, totals, asOfDate: asOfDate || new Date().toISOString() });
    } catch (err) {
        next(err);
    }
};

/** QB: Inventory Valuation Detail — lot-level breakdown per item */
const getValuationDetail = async (req, res, next) => {
    try {
        const { asOfDate, itemId, warehouseId } = req.query;
        const userId = req.user.id;
        const { companyId } = req;

        const lotQuery = {
            userId, companyId,
            quantityRemaining: { $gt: 0 }
        };
        if (itemId) lotQuery.itemId = itemId;
        if (warehouseId) lotQuery.warehouseId = warehouseId;
        if (asOfDate) lotQuery.dateReceived = { $lte: new Date(asOfDate) };

        const lots = await InventoryLot.find(lotQuery).sort({ itemId: 1, dateReceived: 1 }).lean();

        const items = await Item.find({ userId, companyId }).lean();
        const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

        const rows = lots.map(lot => ({
            lotId: lot._id,
            itemId: lot.itemId,
            itemName: itemMap[lot.itemId]?.name || lot.itemId,
            sku: itemMap[lot.itemId]?.sku,
            lotNumber: lot.lotNumber,
            dateReceived: lot.dateReceived,
            expirationDate: lot.expirationDate,
            warehouseId: lot.warehouseId,
            binLocation: lot.binLocation,
            qtyReceived: lot.quantityReceived,
            qtyRemaining: lot.quantityRemaining,
            unitCost: lot.unitCost || itemMap[lot.itemId]?.averageCost || 0,
            totalCost: lot.quantityRemaining * (lot.unitCost || itemMap[lot.itemId]?.averageCost || 0),
            lotStatus: lot.lotStatus,
            vendorName: lot.vendorName
        }));

        const totals = rows.reduce((acc, r) => ({
            totalQty: acc.totalQty + r.qtyRemaining,
            totalValue: acc.totalValue + r.totalCost
        }), { totalQty: 0, totalValue: 0 });

        res.json({ rows, totals });
    } catch (err) {
        next(err);
    }
};

/** QB: Stock Status by Item */
const getStockStatus = async (req, res, next) => {
    try {
        const { warehouseId, showZeroQty } = req.query;
        const userId = req.user.id;
        const { companyId } = req;

        const items = await Item.find({
            userId, companyId,
            type: { $in: ['Inventory Part', 'Inventory Assembly'] },
            isActive: true
        }).lean();

        const lotQuery = { userId, companyId };
        if (warehouseId) lotQuery.warehouseId = warehouseId;

        const lots = await InventoryLot.find(lotQuery).lean();
        const availMap = {};
        for (const lot of lots) {
            if (lot.quantityRemaining > 0 && lot.lotStatus !== 'expired') {
                availMap[lot.itemId] = (availMap[lot.itemId] || 0) + lot.quantityRemaining;
            }
        }

        const Transaction = require('../models/Transaction');
        const openPOs = await Transaction.find({ userId, companyId, type: 'PURCHASE_ORDER', status: { $in: ['Open', 'OPEN', 'Partial'] } }).lean();
        const openSOs = await Transaction.find({ userId, companyId, type: 'SALES_ORDER', status: { $in: ['Open', 'OPEN', 'Partial'] } }).lean();

        const poMap = {};
        const soMap = {};
        for (const po of openPOs) {
            for (const li of (po.items || [])) {
                if (li.itemId) poMap[li.itemId] = (poMap[li.itemId] || 0) + (li.quantity || 0);
            }
        }
        for (const so of openSOs) {
            for (const li of (so.items || [])) {
                if (li.itemId) soMap[li.itemId] = (soMap[li.itemId] || 0) + (li.quantity || 0);
            }
        }

        const rows = items.map(item => ({
            itemId: item.id,
            name: item.name,
            sku: item.sku,
            type: item.type,
            preferredVendorId: item.preferredVendorId,
            reorderPoint: item.reorderPoint || 0,
            reorderQty: item.reorderQty || 0,
            onHand: item.onHand || 0,
            available: availMap[item.id] || 0,
            onPO: poMap[item.id] || 0,
            onSO: soMap[item.id] || 0,
            averageCost: item.averageCost || item.cost || 0,
            salesPrice: item.salesPrice || 0,
            isLow: (item.onHand || 0) <= (item.reorderPoint || 0),
            needsReorder: (item.onHand || 0) + (poMap[item.id] || 0) < (item.reorderPoint || 0)
        })).filter(r => showZeroQty === 'true' || r.onHand > 0 || r.onPO > 0);

        res.json(rows);
    } catch (err) {
        next(err);
    }
};

// ─── Price Levels ─────────────────────────────────────────────────────────────

const getPriceLevels = async (req, res, next) => {
    try {
        const priceLevels = await PriceLevel.find({
            companyId: req.companyId,
            userId: req.user.id
        }).sort({ name: 1 });
        res.json(priceLevels);
    } catch (err) {
        next(err);
    }
};

const createPriceLevel = async (req, res, next) => {
    try {
        const { name, type, percentage, formulaConfig, perItemPrices, itemPrices, currency, description } = req.body;
        if (!name) return res.status(400).json({ message: 'name is required' });
        if (!type) return res.status(400).json({ message: 'type is required' });

        const pl = new PriceLevel({
            id: crypto.randomUUID(),
            name, type, percentage, formulaConfig, perItemPrices, itemPrices,
            currency: currency || 'USD',
            description,
            companyId: req.companyId,
            userId: req.user.id
        });
        await pl.save();
        res.status(201).json(pl);
    } catch (err) {
        next(err);
    }
};

const updatePriceLevel = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pl = await PriceLevel.findOneAndUpdate(
            { id, companyId: req.companyId, userId: req.user.id },
            { $set: req.body },
            { new: true }
        );
        if (!pl) return res.status(404).json({ message: 'Price level not found' });
        res.json(pl);
    } catch (err) {
        next(err);
    }
};

const deletePriceLevel = async (req, res, next) => {
    try {
        const { id } = req.params;
        await PriceLevel.deleteOne({ id, companyId: req.companyId, userId: req.user.id });
        res.json({ message: 'Deleted' });
    } catch (err) {
        next(err);
    }
};

/** Calculate price for a given item/customer using their assigned price level */
const calculatePrice = async (req, res, next) => {
    try {
        const { itemId, priceLevelId, quantity } = req.query;
        if (!itemId || !priceLevelId) return res.status(400).json({ message: 'itemId and priceLevelId required' });

        const [item, pl] = await Promise.all([
            Item.findOne({ id: itemId, companyId: req.companyId, userId: req.user.id }).lean(),
            PriceLevel.findOne({ id: priceLevelId, companyId: req.companyId, userId: req.user.id }).lean()
        ]);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        if (!pl) return res.status(404).json({ message: 'Price level not found' });

        const basePrice = item.salesPrice || 0;
        let price = basePrice;

        if (pl.type === 'Fixed %') {
            price = basePrice * (1 + (pl.percentage || 0) / 100);
        } else if (pl.type === 'Per Item') {
            const override = (pl.itemPrices || []).find(ip => ip.itemId === itemId);
            if (override) price = override.price;
            else if (pl.perItemPrices && pl.perItemPrices[itemId] !== undefined) price = pl.perItemPrices[itemId];
        } else if (pl.type === 'Formula') {
            const cfg = pl.formulaConfig || {};
            const base = cfg.baseOn === 'cost' ? (item.averageCost || item.cost || 0) : basePrice;
            if (cfg.adjustmentType === 'markup') price = base * (1 + (cfg.adjustmentAmount || 0) / 100);
            else if (cfg.adjustmentType === 'markdown') price = base * (1 - (cfg.adjustmentAmount || 0) / 100);
            else if (cfg.adjustmentType === 'fixed') price = base + (cfg.adjustmentAmount || 0);
        }

        res.json({ itemId, priceLevelId, basePrice, price: Math.max(0, price), quantity: quantity ? parseFloat(quantity) : 1 });
    } catch (err) {
        next(err);
    }
};

// ─── Physical Inventory Count ─────────────────────────────────────────────────

const getInventoryCounts = async (req, res, next) => {
    try {
        const { status } = req.query;
        const query = { companyId: req.companyId, userId: req.user.id };
        if (status) query.status = status;
        const counts = await InventoryCount.find(query).sort({ countDate: -1 }).select('-lines');
        res.json(counts);
    } catch (err) {
        next(err);
    }
};

/** Create a new physical count sheet — QB: "Physical Inventory Worksheet" */
const createInventoryCount = async (req, res, next) => {
    try {
        const { name, countDate, warehouseId, category } = req.body;
        const userId = req.user.id;
        const { companyId } = req;

        const query = { userId, companyId, isActive: true, type: { $in: ['Inventory Part', 'Inventory Assembly'] } };
        if (category) query.category = category;

        const items = await Item.find(query).lean();

        // Count number for this company
        const count = await InventoryCount.countDocuments({ companyId, userId });
        const countNumber = `IC-${String(count + 1).padStart(4, '0')}`;

        // When a warehouse filter is provided, compute per-warehouse on-hand from InventoryLot
        let warehouseQtyMap = {};
        if (warehouseId) {
            const lotAgg = await InventoryLot.aggregate([
                { $match: { warehouseId, companyId, userId, quantityRemaining: { $gt: 0 } } },
                { $group: { _id: '$itemId', qtyOnHand: { $sum: '$quantityRemaining' } } }
            ]);
            lotAgg.forEach(row => { warehouseQtyMap[row._id] = row.qtyOnHand; });
        }

        const lines = items.map(item => ({
            itemId: item.id,
            itemName: item.name,
            sku: item.sku,
            description: item.description,
            warehouseId: warehouseId || 'ALL',
            unitOfMeasure: item.unitOfMeasure,
            qtyOnHand: warehouseId ? (warehouseQtyMap[item.id] || 0) : (item.onHand || 0),
            qtyCounted: null,
            variance: null,
            varianceValue: null
        }));

        const ic = new InventoryCount({
            id: crypto.randomUUID(),
            countNumber,
            name: name || `Physical Inventory ${new Date().toLocaleDateString()}`,
            status: 'draft',
            countDate: countDate ? new Date(countDate) : new Date(),
            warehouseId,
            category,
            lines,
            companyId,
            userId
        });
        await ic.save();
        res.status(201).json(ic);
    } catch (err) {
        next(err);
    }
};

const getInventoryCount = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ic = await InventoryCount.findOne({ id, companyId: req.companyId, userId: req.user.id });
        if (!ic) return res.status(404).json({ message: 'Count not found' });
        res.json(ic);
    } catch (err) {
        next(err);
    }
};

/** Update counted quantities on count lines */
const updateCountLines = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { lines } = req.body; // array of { itemId, qtyCounted, notes }

        const ic = await InventoryCount.findOne({ id, companyId: req.companyId, userId: req.user.id });
        if (!ic) return res.status(404).json({ message: 'Count not found' });
        if (ic.status === 'completed') return res.status(400).json({ message: 'Count is already completed' });

        // Update each line
        for (const update of lines) {
            const line = ic.lines.find(l => l.itemId === update.itemId);
            if (line) {
                if (update.qtyCounted !== undefined) {
                    line.qtyCounted = update.qtyCounted;
                    line.variance = update.qtyCounted - (line.qtyOnHand || 0);
                }
                if (update.notes !== undefined) line.notes = update.notes;
                if (update.binLocation !== undefined) line.binLocation = update.binLocation;
            }
        }

        // Recalculate variance values using item average costs
        const itemIds = ic.lines.map(l => l.itemId);
        const items = await Item.find({ id: { $in: itemIds }, companyId: req.companyId, userId: req.user.id }).lean();
        const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

        let totalVarianceValue = 0;
        let countedLines = 0;
        for (const line of ic.lines) {
            if (line.qtyCounted !== null && line.qtyCounted !== undefined) {
                const avgCost = itemMap[line.itemId]?.averageCost || itemMap[line.itemId]?.cost || 0;
                line.varianceValue = (line.variance || 0) * avgCost;
                totalVarianceValue += line.varianceValue;
                countedLines++;
            }
        }

        ic.totalVarianceValue = totalVarianceValue;
        ic.totalLinesCounted = countedLines;
        if (ic.status === 'draft' && countedLines > 0) ic.status = 'in-progress';

        await ic.save();
        res.json(ic);
    } catch (err) {
        next(err);
    }
};

/** Complete count — post inventory adjustment transactions for all variances */
const completeInventoryCount = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { adjustmentAccountId, memo } = req.body;
        const userId = req.user.id;
        const { companyId } = req;

        const ic = await InventoryCount.findOne({ id, companyId, userId });
        if (!ic) return res.status(404).json({ message: 'Count not found' });
        if (ic.status === 'completed') return res.status(400).json({ message: 'Count already completed' });

        // Gather lines with variances
        const variantLines = ic.lines.filter(l => l.qtyCounted !== null && l.variance !== 0);

        if (variantLines.length > 0) {
            const items = await Item.find({ id: { $in: variantLines.map(l => l.itemId) }, companyId, userId }).lean();
            const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

            // Build an INVENTORY_ADJ transaction
            const transactionService = require('../services/transactionService');
            const txItems = variantLines.map(l => {
                const item = itemMap[l.itemId] || {};
                const avgCost = item.averageCost || item.cost || 0;
                return {
                    itemId: l.itemId,
                    description: l.itemName,
                    quantity: l.variance,
                    rate: avgCost,
                    amount: (l.variance || 0) * avgCost,
                    accountId: adjustmentAccountId || item.assetAccountId
                };
            });

            const [savedTx] = await transactionService.saveTransaction({
                type: 'INVENTORY_ADJ',
                date: ic.countDate,
                memo: memo || `Physical Inventory Count ${ic.countNumber}`,
                items: txItems,
                total: txItems.reduce((s, i) => s + (i.amount || 0), 0),
                refNo: ic.countNumber
            }, 'Admin', userId, companyId);

            ic.adjustmentTransactionId = savedTx.id;
        }

        ic.status = 'completed';
        ic.completedDate = new Date();
        await ic.save();
        res.json(ic);
    } catch (err) {
        next(err);
    }
};

// ─── Lot Traceability ──────────────────────────────────────────────────────────

/**
 * GET /inventory/lots/trace/forward/:lotNumber
 * Forward trace: which customers/invoices/sales-orders received this lot?
 */
const getLotForwardTrace = async (req, res, next) => {
    try {
        const { lotNumber } = req.params;
        const { companyId } = req;
        const userId = req.user.id;

        // Find lot record for metadata
        const lot = await InventoryLot.findOne({ lotNumber, companyId, userId }).lean();

        // Transactions where any line item carries this lot number
        const transactions = await Transaction.find({
            companyId,
            userId,
            type: { $in: ['INVOICE', 'SALES_ORDER', 'SALES_RECEIPT', 'SHIPMENT'] },
            $or: [
                { 'items.lotNumber': lotNumber },
                { lotNumber }
            ]
        }).lean();

        const records = transactions.map(tx => ({
            transactionId: tx.id,
            type: tx.type,
            refNo: tx.refNo,
            date: tx.date,
            entityId: tx.entityId,
            status: tx.status,
            lines: tx.items.filter(i => i.lotNumber === lotNumber).map(i => ({
                itemId: i.itemId,
                description: i.description,
                quantity: i.quantity
            }))
        }));

        res.json({ lotNumber, lot: lot || null, forwardRecords: records });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /inventory/lots/trace/backward/:lotNumber
 * Backward trace: which vendor/PO/bill/receipt sourced this lot?
 */
const getLotBackwardTrace = async (req, res, next) => {
    try {
        const { lotNumber } = req.params;
        const { companyId } = req;
        const userId = req.user.id;

        const lot = await InventoryLot.findOne({ lotNumber, companyId, userId }).lean();

        // Source transactions for this lot
        const sourceTxIds = [lot?.purchaseOrderId, lot?.billId, lot?.receiptId].filter(Boolean);
        const sourceTxs = sourceTxIds.length
            ? await Transaction.find({ id: { $in: sourceTxIds }, companyId, userId }).lean()
            : [];

        // Also search receipts/bills that mention this lot in items
        const receiptTxs = await Transaction.find({
            companyId,
            userId,
            type: { $in: ['BILL', 'RECEIVE_ITEM', 'PURCHASE_ORDER'] },
            $or: [
                { 'items.lotNumber': lotNumber },
                { lotNumber }
            ]
        }).lean();

        const allSources = [...sourceTxs, ...receiptTxs.filter(r => !sourceTxIds.includes(r.id))];

        const records = allSources.map(tx => ({
            transactionId: tx.id,
            type: tx.type,
            refNo: tx.refNo,
            date: tx.date,
            entityId: tx.entityId,
            status: tx.status,
            lines: tx.items.filter(i => !i.lotNumber || i.lotNumber === lotNumber).map(i => ({
                itemId: i.itemId,
                description: i.description,
                quantity: i.quantity,
                rate: i.rate
            }))
        }));

        res.json({
            lotNumber,
            lot: lot || null,
            vendorName: lot?.vendorName || null,
            vendorLotNumber: lot?.vendorLotNumber || null,
            backwardRecords: records
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /inventory/lots/details/:lotNumber
 * Get full details of a lot by lot number
 */
const getLotDetails = async (req, res, next) => {
    try {
        const { lotNumber } = req.params;
        const lot = await InventoryLot.findOne({
            lotNumber,
            companyId: req.companyId,
            userId: req.user.id
        }).lean();
        if (!lot) return res.status(404).json({ message: 'Lot not found' });
        res.json(lot);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /inventory/lots/qc
 * QC dashboard: all lots currently on-hold or in quarantine
 */
const getLotsForQC = async (req, res, next) => {
    try {
        const { status, itemId } = req.query;
        const query = {
            companyId: req.companyId,
            userId: req.user.id,
            lotStatus: status ? status : { $in: ['on-hold', 'quarantine'] }
        };
        if (itemId) query.itemId = itemId;

        const lots = await InventoryLot.find(query).sort({ updatedAt: -1 }).lean();

        // Enrich with item names
        const itemIds = [...new Set(lots.map(l => l.itemId))];
        const items = itemIds.length
            ? await Item.find({ id: { $in: itemIds }, companyId: req.companyId, userId: req.user.id }).lean()
            : [];
        const itemMap = Object.fromEntries(items.map(i => [i.id, i.name]));

        res.json(lots.map(l => ({ ...l, itemName: itemMap[l.itemId] || l.itemId })));
    } catch (err) {
        next(err);
    }
};

/**
 * POST /inventory/lots/:lotId/quarantine
 * Put a lot into quarantine/on-hold with a reason
 */
const quarantineLot = async (req, res, next) => {
    try {
        const { lotId } = req.params;
        const { reason, status = 'quarantine' } = req.body;

        if (!['on-hold', 'quarantine'].includes(status)) {
            return res.status(400).json({ message: 'status must be "on-hold" or "quarantine"' });
        }

        // QB Enterprise: when placing on hold, record the quantity held
        const targetLot = await InventoryLot.findOne({ _id: lotId, companyId: req.companyId, userId: req.user.id });
        if (!targetLot) return res.status(404).json({ message: 'Lot not found' });

        const lot = await InventoryLot.findOneAndUpdate(
            { _id: lotId, companyId: req.companyId, userId: req.user.id },
            {
                $set: {
                    lotStatus: status,
                    // QB Enterprise: quantityOnHold = full remaining quantity when lot is held
                    quantityOnHold: targetLot.quantityRemaining
                },
                $push: {
                    qcHistory: {
                        action: status === 'quarantine' ? 'quarantined' : 'put-on-hold',
                        date: new Date(),
                        by: req.user.name || req.user.email || req.user.id,
                        reason: reason || ''
                    }
                }
            },
            { new: true }
        );
        if (!lot) return res.status(404).json({ message: 'Lot not found' });
        res.json(lot);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /inventory/lots/:lotId/release
 * Release a lot from quarantine/on-hold with QC sign-off notes
 */
const releaseLot = async (req, res, next) => {
    try {
        const { lotId } = req.params;
        const { notes, releasedBy } = req.body;

        const lot = await InventoryLot.findOneAndUpdate(
            {
                _id: lotId,
                companyId: req.companyId,
                userId: req.user.id,
                lotStatus: { $in: ['on-hold', 'quarantine'] }
            },
            {
                $set: {
                    lotStatus: 'available',
                    // QB Enterprise: clear quantityOnHold when lot is released back to available
                    quantityOnHold: 0
                },
                $push: {
                    qcHistory: {
                        action: 'released',
                        date: new Date(),
                        by: releasedBy || req.user.name || req.user.email || req.user.id,
                        notes: notes || ''
                    }
                }
            },
            { new: true }
        );
        if (!lot) return res.status(404).json({ message: 'Lot not found or not in a hold/quarantine state' });
        res.json(lot);
    } catch (err) {
        next(err);
    }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    // Lots
    getAvailableLots,
    assignLot,
    reconcileUntrackedLot,
    updateLot,
    deleteLot,
    refreshLotStatuses,
    getExpiringLots,
    // Lot Traceability + QC
    getLotForwardTrace,
    getLotBackwardTrace,
    getLotDetails,
    getLotsForQC,
    quarantineLot,
    releaseLot,
    // Serial numbers
    getSerialNumbers,
    createSerialNumber,
    updateSerialNumber,
    batchCreateSerials,
    getSerialHistory,
    // BOM
    getBOMCostRollup,
    updateBOM,
    getBOMShortage,
    getPendingBuilds,
    // Valuation
    getValuationSummary,
    getValuationDetail,
    getStockStatus,
    // Price levels
    getPriceLevels,
    createPriceLevel,
    updatePriceLevel,
    deletePriceLevel,
    calculatePrice,
    // Physical counts
    getInventoryCounts,
    createInventoryCount,
    getInventoryCount,
    updateCountLines,
    completeInventoryCount
};
