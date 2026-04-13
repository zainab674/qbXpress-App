/**
 * warehouseQtySync.js
 *
 * QB Enterprise parity: per-warehouse on-hand quantity maintenance.
 *
 * Aggregates InventoryLot.quantityRemaining grouped by warehouseId and writes
 * the result into Item.warehouseQuantities for quick lookups and reporting.
 *
 * Call this after any event that changes lot quantities:
 *   - Receive Inventory / Bill (RECEIVE_ITEM, BILL)
 *   - Invoice / Sales Receipt (inventory deductions)
 *   - Build Assembly
 *   - Inventory Adjustment
 *   - Warehouse Transfer
 */

const Item = require('../models/Item');
const InventoryLot = require('../models/InventoryLot');

/**
 * Recomputes and persists Item.warehouseQuantities for one or more items.
 *
 * @param {string|string[]} itemIds  - one or an array of Item.id values
 * @param {string}          userId
 * @param {string}          companyId
 */
async function syncWarehouseQuantities(itemIds, userId, companyId) {
    if (!itemIds) return;
    const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
    if (ids.length === 0) return;

    // Run all items in parallel — each is a small aggregation
    await Promise.all(ids.map(itemId => _syncOne(itemId, userId, companyId)));
}

async function _syncOne(itemId, userId, companyId) {
    // Fetch all active lots for this item (include on-hold so the quantity is visible)
    const lots = await InventoryLot.find({
        itemId,
        userId,
        companyId,
        quantityRemaining: { $gt: 0 },
        lotStatus: { $in: ['available', 'on-hold'] },
    }).lean();

    // Aggregate per warehouse
    const byWh = {};
    for (const lot of lots) {
        const wId = lot.warehouseId || 'DEFAULT';
        if (!byWh[wId]) byWh[wId] = { onHand: 0, value: 0 };
        byWh[wId].onHand += lot.quantityRemaining;
        byWh[wId].value  += lot.quantityRemaining * (lot.unitCost || 0);
    }

    const warehouseQuantities = Object.entries(byWh).map(([warehouseId, d]) => ({
        warehouseId,
        onHand: d.onHand,
        value:  d.value,
    }));

    await Item.findOneAndUpdate(
        { id: itemId, userId, companyId },
        { $set: { warehouseQuantities } },
    );
}

module.exports = { syncWarehouseQuantities };
