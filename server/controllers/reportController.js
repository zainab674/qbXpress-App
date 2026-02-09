
const reportService = require('../services/reportService');

const reportController = {
    getProfitAndLoss: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getProfitAndLoss(fromDate, toDate, req.user.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getBalanceSheet: async (req, res) => {
        try {
            const { toDate } = req.query;
            const data = await reportService.getBalanceSheet(toDate, req.user.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getARAging: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getARAging(fromDate, toDate, req.user.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getAPAging: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getAPAging(fromDate, toDate, req.user.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getSalesByItem: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getSalesByItem(fromDate, toDate);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getInventoryValuation: async (req, res) => {
        try {
            const data = await reportService.getInventoryValuation();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getGeneralLedger: async (req, res) => {
        try {
            const { fromDate, toDate, accountId, vendorId, customerId } = req.query;
            const data = await reportService.getGeneralLedger(fromDate, toDate, { accountId, vendorId, customerId });
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getTaxLiability: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getTaxLiability(fromDate, toDate);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getTrialBalance: async (req, res) => {
        try {
            const data = await reportService.getTrialBalance();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCashFlow: async (req, res) => {
        try {
            const data = await reportService.getCashFlow();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getPayrollSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getPayrollSummary(fromDate, toDate);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getAuditTrail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getAuditTrail(fromDate, toDate);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getBudgetVsActual: async (req, res) => {
        try {
            const data = await reportService.getBudgetVsActual();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getJobEstimatesVsActuals: async (req, res) => {
        try {
            const data = await reportService.getJobEstimatesVsActuals();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getForecast: async (req, res) => {
        try {
            const data = await reportService.getForecast();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getAuditTrailDetail: async (req, res) => {
        try {
            const data = await reportService.getAuditTrailDetail();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getChangeOrderLog: async (req, res) => {
        try {
            const data = await reportService.getChangeOrderLog();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getPhysicalInventory: async (req, res) => {
        try {
            const data = await reportService.getPhysicalInventory();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getMileageDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getMileageDetail(fromDate, toDate);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getProfitAndLossByClass: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getProfitAndLossByClass(fromDate, toDate, req.user.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getSalesByCustomerSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getSalesByCustomerSummary(fromDate, toDate);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCustomerBalanceSummary: async (req, res) => {
        try {
            const data = await reportService.getCustomerBalanceSummary(req.user.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getVendorBalanceSummary: async (req, res) => {
        try {
            const data = await reportService.getVendorBalanceSummary(req.user.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getPayrollLiabilityBalances: async (req, res) => {
        try {
            const data = await reportService.getPayrollLiabilityBalances(req.user.id);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = reportController;
