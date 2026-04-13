const { randomUUID: uuidv4 } = require('crypto');
const Job = require('../models/Job');

const jobController = {
    list: async (req, res, next) => {
        try {
            const { customerId, status, isActive } = req.query;
            const query = { userId: req.user.id, companyId: req.companyId };
            if (customerId) query.customerId = customerId;
            if (status) query.status = status;
            if (isActive !== undefined) query.isActive = isActive === 'true';

            const jobs = await Job.find(query).sort({ name: 1 }).lean();
            res.json(jobs);
        } catch (err) { next(err); }
    },

    getOne: async (req, res, next) => {
        try {
            const job = await Job.findOne({ id: req.params.id, userId: req.user.id, companyId: req.companyId }).lean();
            if (!job) return res.status(404).json({ message: 'Job not found' });
            res.json(job);
        } catch (err) { next(err); }
    },

    save: async (req, res, next) => {
        try {
            const { name, customerId, status, jobType, startDate, projectedEndDate,
                    actualEndDate, description, jobNumber, estimatedRevenue,
                    estimatedCost, notes, customFieldValues, isActive } = req.body;

            if (!name) return res.status(400).json({ message: 'Job name is required' });
            if (!customerId) return res.status(400).json({ message: 'customerId is required' });

            const validStatuses = ['Pending', 'Awarded', 'In Progress', 'Closed', 'Not Awarded'];
            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({ message: `status must be one of: ${validStatuses.join(', ')}` });
            }

            const id = req.body.id || uuidv4();
            const job = await Job.findOneAndUpdate(
                { id, userId: req.user.id, companyId: req.companyId },
                {
                    id, name, customerId, status, jobType, startDate, projectedEndDate,
                    actualEndDate, description, jobNumber, estimatedRevenue,
                    estimatedCost, notes, customFieldValues,
                    isActive: isActive !== undefined ? isActive : true,
                    userId: req.user.id,
                    companyId: req.companyId
                },
                { upsert: true, new: true }
            );
            res.json(job);
        } catch (err) { next(err); }
    },

    delete: async (req, res, next) => {
        try {
            const job = await Job.findOneAndDelete({ id: req.params.id, userId: req.user.id, companyId: req.companyId });
            if (!job) return res.status(404).json({ message: 'Job not found' });
            res.json({ message: 'Job deleted' });
        } catch (err) { next(err); }
    },

    // Close a job: sets status to 'Closed', records actualEndDate
    close: async (req, res, next) => {
        try {
            const { actualEndDate } = req.body;
            const today = new Date().toISOString().split('T')[0];
            const job = await Job.findOneAndUpdate(
                { id: req.params.id, userId: req.user.id, companyId: req.companyId },
                { status: 'Closed', actualEndDate: actualEndDate || today },
                { new: true }
            );
            if (!job) return res.status(404).json({ message: 'Job not found' });
            res.json(job);
        } catch (err) { next(err); }
    },
};

module.exports = jobController;
