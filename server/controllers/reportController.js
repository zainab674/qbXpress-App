
const reportService = require('../services/reportService');
const ReportCustomColumn = require('../models/ReportCustomColumn');
const crypto = require('crypto');

const reportController = {
    getProfitAndLoss: async (req, res) => {
        try {
            const { fromDate, toDate, previousPeriod, previousYear } = req.query;
            const data = await reportService.getProfitAndLoss(fromDate, toDate, req.user.id, req.companyId, {
                previousPeriod: previousPeriod === 'true',
                previousYear: previousYear === 'true'
            });
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getBalanceSheet: async (req, res) => {
        try {
            const { toDate } = req.query;
            const data = await reportService.getBalanceSheet(toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getARAging: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getARAging(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getAPAging: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getAPAging(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getSalesByItem: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getSalesByItem(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getInventoryValuation: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getInventoryValuation(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getGeneralLedger: async (req, res) => {
        try {
            const { fromDate, toDate, accountId, vendorId, customerId, transactionType, previousPeriod, previousYear } = req.query;
            const data = await reportService.getGeneralLedger(fromDate, toDate, req.user.id, req.companyId, {
                accountId, vendorId, customerId, transactionType,
                comparison: {
                    previousPeriod: previousPeriod === 'true',
                    previousYear: previousYear === 'true'
                }
            });
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getTaxLiability: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getTaxLiability(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getTrialBalance: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getTrialBalance(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCashFlow: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getCashFlow(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getPayrollSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getPayrollSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getAuditTrail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getAuditTrail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getBudgetVsActual: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getBudgetVsActual(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getJobEstimatesVsActuals: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getJobEstimatesVsActuals(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getForecast: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getForecast(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getAuditTrailDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getAuditTrailDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getChangeOrderLog: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getChangeOrderLog(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getPhysicalInventory: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getPhysicalInventory(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getMileageDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getMileageDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getProfitAndLossByClass: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getProfitAndLossByClass(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getSalesByCustomerSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getSalesByCustomerSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCustomerBalanceSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getCustomerBalanceSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getVendorBalanceSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getVendorBalanceSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getPayrollLiabilityBalances: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getPayrollLiabilityBalances(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getStatementOfChangesInEquity: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getStatementOfChangesInEquity(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getUnbilledCharges: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getUnbilledCharges(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getUnbilledTime: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getUnbilledTime(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCollectionsReport: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getCollectionsReport(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getInventoryValuationDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getInventoryValuationDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getAdjustedTrialBalance: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getAdjustedTrialBalance(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getStatementList: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getStatementList(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getDetailedTimeActivities: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getDetailedTimeActivities(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getARAgingDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getARAgingDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCustomerBalanceDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getCustomerBalanceDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getInvoiceList: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getInvoiceList(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getOpenInvoices: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getOpenInvoices(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getInvoicesAndReceivedPayments: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getInvoicesAndReceivedPayments(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getTermsList: async (req, res) => {
        try {
            const data = await reportService.getTermsList(req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getOpenPurchaseOrders: async (req, res) => {
        try {
            const { fromDate, toDate, isDetail } = req.query;
            const data = await reportService.getOpenPurchaseOrders(fromDate, toDate, req.user.id, req.companyId, isDetail === 'true');
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    addCustomColumn: async (req, res) => {
        try {
            const { reportType, columnName, formula } = req.body;
            const newColumn = new ReportCustomColumn({
                id: crypto.randomUUID(),
                reportType,
                columnName,
                formula,
                userId: req.user.id,
                companyId: req.companyId
            });
            await newColumn.save();
            res.json(newColumn);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateCustomColumn: async (req, res) => {
        try {
            const { reportType, columnName, formula } = req.body;
            const updatedColumn = await ReportCustomColumn.findOneAndUpdate(
                { reportType, columnName, userId: req.user.id, companyId: req.companyId },
                { formula },
                { new: true }
            );
            if (!updatedColumn) {
                // If not found, create new (upsert)
                const newColumn = new ReportCustomColumn({
                    id: crypto.randomUUID(),
                    reportType,
                    columnName,
                    formula,
                    userId: req.user.id,
                    companyId: req.companyId
                });
                await newColumn.save();
                return res.json(newColumn);
            }
            res.json(updatedColumn);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCustomColumns: async (req, res) => {
        try {
            const { reportType } = req.query;
            const columns = await ReportCustomColumn.find({
                reportType,
                userId: req.user.id,
                companyId: req.companyId
            });
            res.json(columns);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    deleteCustomColumn: async (req, res) => {
        try {
            const { id } = req.params;
            await ReportCustomColumn.findOneAndDelete({
                id,
                userId: req.user.id,
                companyId: req.companyId
            });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = reportController;
