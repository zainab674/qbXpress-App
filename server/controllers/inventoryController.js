const InventoryLot = require('../models/InventoryLot');

const inventoryController = {
    getAvailableLots: async (req, res, next) => {
        try {
            const { itemId } = req.params;
            const lots = await InventoryLot.find({
                itemId,
                companyId: req.companyId,
                userId: req.user.id,
                quantityRemaining: { $gt: 0 }
            }).sort({ dateReceived: 1 }); // FIFO sorting

            res.json(lots);
        } catch (err) {
            next(err);
        }
    }
};

module.exports = inventoryController;
