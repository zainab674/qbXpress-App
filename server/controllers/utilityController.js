
const Transaction = require('../models/Transaction');
const AuditLogEntry = require('../models/AuditLogEntry');

exports.condenseData = async (req, res) => {
    try {
        const { cutoffDate, companyId } = req.body;
        if (!cutoffDate || !companyId) {
            return res.status(400).json({ message: 'Cutoff date and companyId are required' });
        }

        // 1. Delete transactions before cutoff date
        const result = await Transaction.deleteMany({
            companyId,
            date: { $lt: cutoffDate }
        });

        // 2. Log the action
        const log = new AuditLogEntry({
            companyId,
            userId: req.user?.id || 'System',
            action: 'CONDENSE',
            details: `Condensed data prior to ${cutoffDate}. Removed ${result.deletedCount} transactions.`,
            timestamp: new Date()
        });
        await log.save();

        res.json({
            message: 'Condense process completed successfully',
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to condense data' });
    }
};
