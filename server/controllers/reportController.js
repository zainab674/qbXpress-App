
const reportService = require('../services/reportService');
const ReportCustomColumn = require('../models/ReportCustomColumn');
const crypto = require('crypto');

// Validation helpers
const validateDate = (dateStr) => {
    if (!dateStr) return null;
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
        throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM-DD format.`);
    }
    return dateStr;
};

const validatePageParams = (page, limit) => {
    const p = parseInt(page) || 1;
    const l = parseInt(limit) || 50;
    if (p < 1) throw new Error('Page must be >= 1');
    if (l < 1 || l > 1000) throw new Error('Limit must be between 1 and 1000');
    return { page: p, limit: l };
};

const handleError = (err, res, context = '') => {
    console.error(`[${context}] Error:`, err.message);

    if (err.message.includes('Invalid date') || err.message.includes('Missing required')) {
        return res.status(400).json({ error: err.message, type: 'VALIDATION_ERROR' });
    }
    if (err.message.includes('not allowed')) {
        return res.status(403).json({ error: err.message, type: 'SECURITY_ERROR' });
    }
    res.status(500).json({ error: err.message || 'Internal server error', type: 'SERVER_ERROR' });
};

const reportController = {
    getProfitAndLoss: async (req, res) => {
        try {
            const { fromDate, toDate, previousPeriod, previousYear } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getProfitAndLoss(fromDate, toDate, req.user.id, req.companyId, {
                previousPeriod: previousPeriod === 'true',
                previousYear: previousYear === 'true'
            });
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getProfitAndLoss');
        }
    },
    getBalanceSheet: async (req, res) => {
        try {
            const { toDate } = req.query;
            validateDate(toDate);

            const data = await reportService.getBalanceSheet(toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getBalanceSheet');
        }
    },
    getARAging: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getARAging(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getARAging');
        }
    },
    getAPAging: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getAPAging(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getAPAging');
        }
    },
    getSalesByItem: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getSalesByItem(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getSalesByItem');
        }
    },
    getInventoryValuation: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getInventoryValuation(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getInventoryValuation');
        }
    },
    getGeneralLedger: async (req, res) => {
        try {
            const { fromDate, toDate, accountId, vendorId, customerId, transactionType, previousPeriod, previousYear } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getGeneralLedger(fromDate, toDate, req.user.id, req.companyId, {
                accountId, vendorId, customerId, transactionType,
                comparison: {
                    previousPeriod: previousPeriod === 'true',
                    previousYear: previousYear === 'true'
                }
            });
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getGeneralLedger');
        }
    },
    getTaxLiability: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getTaxLiability(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getTaxLiability');
        }
    },
    getTrialBalance: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getTrialBalance(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getTrialBalance');
        }
    },
    getCashFlow: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getCashFlow(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getCashFlow');
        }
    },
    getPayrollSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getPayrollSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getPayrollSummary');
        }
    },
    getAuditTrail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getAuditTrail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getAuditTrail');
        }
    },
    getBudgetVsActual: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getBudgetVsActual(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getBudgetVsActual');
        }
    },
    getJobEstimatesVsActuals: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getJobEstimatesVsActuals(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getJobEstimatesVsActuals');
        }
    },
    getForecast: async (req, res) => {
        try {
            const { fromDate, toDate, forecastMonths, historicalMonths } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getForecast(fromDate, toDate, req.user.id, req.companyId, {
                forecastMonths,
                historicalMonths
            });
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getForecast');
        }
    },
    getAuditTrailDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getAuditTrailDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getAuditTrailDetail');
        }
    },
    getChangeOrderLog: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getChangeOrderLog(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getChangeOrderLog');
        }
    },
    getPhysicalInventory: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getPhysicalInventory(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getPhysicalInventory');
        }
    },
    getMileageDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getMileageDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getMileageDetail');
        }
    },
    getProfitAndLossByClass: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getProfitAndLossByClass(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getProfitAndLossByClass');
        }
    },
    getSalesByCustomerSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getSalesByCustomerSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getSalesByCustomerSummary');
        }
    },
    getCustomerBalanceSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getCustomerBalanceSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getCustomerBalanceSummary');
        }
    },
    getVendorBalanceSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getVendorBalanceSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getVendorBalanceSummary');
        }
    },
    getPayrollLiabilityBalances: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getPayrollLiabilityBalances(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getPayrollLiabilityBalances');
        }
    },
    getStatementOfChangesInEquity: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getStatementOfChangesInEquity(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getStatementOfChangesInEquity');
        }
    },
    getUnbilledCharges: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getUnbilledCharges(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getUnbilledCharges');
        }
    },
    getUnbilledTime: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getUnbilledTime(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getUnbilledTime');
        }
    },
    getCollectionsReport: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getCollectionsReport(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getCollectionsReport');
        }
    },
    getInventoryValuationDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getInventoryValuationDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getInventoryValuationDetail');
        }
    },
    getAdjustedTrialBalance: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getAdjustedTrialBalance(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getAdjustedTrialBalance');
        }
    },
    getStatementList: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getStatementList(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getStatementList');
        }
    },
    getDetailedTimeActivities: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getDetailedTimeActivities(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getDetailedTimeActivities');
        }
    },
    getARAgingDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getARAgingDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getARAgingDetail');
        }
    },
    getCustomerBalanceDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getCustomerBalanceDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getCustomerBalanceDetail');
        }
    },
    getInvoiceList: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getInvoiceList(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getInvoiceList');
        }
    },
    getOpenInvoices: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getOpenInvoices(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getOpenInvoices');
        }
    },
    getInvoicesAndReceivedPayments: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getInvoicesAndReceivedPayments(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getInvoicesAndReceivedPayments');
        }
    },
    getTermsList: async (req, res) => {
        try {
            const data = await reportService.getTermsList(req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getTermsList');
        }
    },
    getOpenPurchaseOrders: async (req, res) => {
        try {
            const { fromDate, toDate, isDetail } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getOpenPurchaseOrders(fromDate, toDate, req.user.id, req.companyId, isDetail === 'true');
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getOpenPurchaseOrders');
        }
    },
    addCustomColumn: async (req, res) => {
        try {
            const { reportType, columnName, formula } = req.body;

            if (!reportType || !columnName || !formula) {
                return res.status(400).json({ error: 'Missing required fields: reportType, columnName, formula', type: 'VALIDATION_ERROR' });
            }

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
            handleError(err, res, 'addCustomColumn');
        }
    },
    updateCustomColumn: async (req, res) => {
        try {
            const { reportType, columnName, formula } = req.body;

            if (!reportType || !columnName || !formula) {
                return res.status(400).json({ error: 'Missing required fields: reportType, columnName, formula', type: 'VALIDATION_ERROR' });
            }

            const updatedColumn = await ReportCustomColumn.findOneAndUpdate(
                { reportType, columnName, userId: req.user.id, companyId: req.companyId },
                { formula },
                { new: true }
            );
            if (!updatedColumn) {
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
            handleError(err, res, 'updateCustomColumn');
        }
    },
    getCustomColumns: async (req, res) => {
        try {
            const { reportType } = req.query;

            if (!reportType) {
                return res.status(400).json({ error: 'Missing required parameter: reportType', type: 'VALIDATION_ERROR' });
            }

            const columns = await ReportCustomColumn.find({
                reportType,
                userId: req.user.id,
                companyId: req.companyId
            });
            res.json(columns);
        } catch (err) {
            handleError(err, res, 'getCustomColumns');
        }
    },
    deleteCustomColumn: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({ error: 'Missing required parameter: id', type: 'VALIDATION_ERROR' });
            }

            await ReportCustomColumn.findOneAndDelete({
                id,
                userId: req.user.id,
                companyId: req.companyId
            });
            res.json({ success: true });
        } catch (err) {
            handleError(err, res, 'deleteCustomColumn');
        }
    },

    // ── QB Enterprise: Cost Variance Report ─────────────────────────────────
    getCostVarianceReport: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);

            const data = await reportService.getCostVarianceReport(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getCostVarianceReport');
        }
    },

    // ── QB Inventory Reports ─────────────────────────────────────────────────
    getInventoryStockStatusByItem: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getInventoryStockStatusByItem(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getInventoryStockStatusByItem');
        }
    },
    getInventoryStockStatusByVendor: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getInventoryStockStatusByVendor(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getInventoryStockStatusByVendor');
        }
    },
    getPendingBuilds: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getPendingBuilds(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getPendingBuilds');
        }
    },
    getPhysicalInventoryWorksheet: async (req, res) => {
        try {
            const { fromDate, toDate, warehouseId } = req.query;
            const data = await reportService.getPhysicalInventoryWorksheet(fromDate, toDate, req.user.id, req.companyId, warehouseId || null);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getPhysicalInventoryWorksheet');
        }
    },
    getInventoryTurnover: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getInventoryTurnover(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getInventoryTurnover');
        }
    },

    // ── BOM Report (Printable) ────────────────────────────────────────────────
    getBOMReport: async (req, res) => {
        try {
            const { itemId } = req.query;
            const data = await reportService.getBOMReport(req.user.id, req.companyId, itemId || null);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getBOMReport');
        }
    },

    // ── Inventory Stock Status by Site ──────────────────────────────────────
    getInventoryStockStatusBySite: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getInventoryStockStatusBySite(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getInventoryStockStatusBySite');
        }
    },

    // ── Inventory by Site ────────────────────────────────────────────────────
    getInventoryBySite: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getInventoryBySite(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getInventoryBySite');
        }
    },

    // ── Inventory by Location ────────────────────────────────────────────────
    getInventoryByLocation: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getInventoryByLocation(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getInventoryByLocation');
        }
    },

    // ── Lot Number Report ────────────────────────────────────────────────────
    getLotNumberReport: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getLotNumberReport(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getLotNumberReport');
        }
    },

    // ── Serial Number Report ─────────────────────────────────────────────────
    getSerialNumberReport: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getSerialNumberReport(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getSerialNumberReport');
        }
    },

    // ── Price Level Listing ──────────────────────────────────────────────────
    getPriceLevelReport: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getPriceLevelReport(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getPriceLevelReport');
        }
    },
    getAssemblyShortageReport: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getAssemblyShortageReport(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getAssemblyShortageReport');
        }
    },
    getInventoryReorderReport: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getInventoryReorderReport(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) {
            handleError(err, res, 'getInventoryReorderReport');
        }
    },

    // ══════════════════════════════════════════════════════════════════════════
    // QB ENTERPRISE FINANCIAL REPORTS
    // ══════════════════════════════════════════════════════════════════════════

    getProfitAndLossDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getProfitAndLossDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getProfitAndLossDetail'); }
    },

    getProfitAndLossByMonth: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getProfitAndLossByMonth(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getProfitAndLossByMonth'); }
    },

    getProfitAndLossYTD: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getProfitAndLossYTD(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getProfitAndLossYTD'); }
    },

    getProfitAndLossPrevYear: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getProfitAndLossPrevYear(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getProfitAndLossPrevYear'); }
    },

    getBalanceSheetDetail: async (req, res) => {
        try {
            const { toDate } = req.query;
            validateDate(toDate);
            const data = await reportService.getBalanceSheetDetail(toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getBalanceSheetDetail'); }
    },

    getBalanceSheetSummary: async (req, res) => {
        try {
            const { toDate } = req.query;
            validateDate(toDate);
            const data = await reportService.getBalanceSheetSummary(toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getBalanceSheetSummary'); }
    },

    getBalanceSheetPrevYear: async (req, res) => {
        try {
            const { toDate } = req.query;
            validateDate(toDate);
            const data = await reportService.getBalanceSheetPrevYear(toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getBalanceSheetPrevYear'); }
    },

    getIncomeTaxSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getIncomeTaxSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getIncomeTaxSummary'); }
    },

    getMissingChecks: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getMissingChecks(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getMissingChecks'); }
    },

    // ══════════════════════════════════════════════════════════════════════════
    // QB ENTERPRISE SALES REPORTS
    // ══════════════════════════════════════════════════════════════════════════

    getSalesByCustomerDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getSalesByCustomerDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getSalesByCustomerDetail'); }
    },

    getSalesByRepSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getSalesByRepSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getSalesByRepSummary'); }
    },

    getSalesByRepDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getSalesByRepDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getSalesByRepDetail'); }
    },

    getSalesOrderFulfillmentWorksheet: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getSalesOrderFulfillmentWorksheet(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getSalesOrderFulfillmentWorksheet'); }
    },

    getPendingSales: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getPendingSales(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getPendingSales'); }
    },

    // ══════════════════════════════════════════════════════════════════════════
    // QB ENTERPRISE — VENDORS / PURCHASES REPORTS
    // ══════════════════════════════════════════════════════════════════════════

    getAPAgingDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getAPAgingDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getAPAgingDetail'); }
    },

    getVendorBalanceDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getVendorBalanceDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getVendorBalanceDetail'); }
    },

    getUnpaidBillsDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getUnpaidBillsDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getUnpaidBillsDetail'); }
    },

    getBillsAndAppliedPayments: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getBillsAndAppliedPayments(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getBillsAndAppliedPayments'); }
    },

    getPurchasesByVendorDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getPurchasesByVendorDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getPurchasesByVendorDetail'); }
    },

    getPurchasesByItemDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getPurchasesByItemDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getPurchasesByItemDetail'); }
    },

    getVendorContactList: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getVendorContactList(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getVendorContactList'); }
    },

    // ── Jobs / Time ───────────────────────────────────────────────────────────

    getJobProfitabilitySummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getJobProfitabilitySummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getJobProfitabilitySummary'); }
    },

    getJobProfitabilityDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getJobProfitabilityDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getJobProfitabilityDetail'); }
    },

    getJobCostsByJob: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getJobCostsByJob(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getJobCostsByJob'); }
    },

    getJobCostsByVendor: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getJobCostsByVendor(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getJobCostsByVendor'); }
    },

    getJobCostsByType: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getJobCostsByType(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getJobCostsByType'); }
    },

    getTimeByJobSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getTimeByJobSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getTimeByJobSummary'); }
    },

    getTimeByJobDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getTimeByJobDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getTimeByJobDetail'); }
    },

    getTimeByName: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getTimeByName(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getTimeByName'); }
    },

    getMileageByVehicle: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getMileageByVehicle(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getMileageByVehicle'); }
    },

    getMileageByJobDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getMileageByJobDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getMileageByJobDetail'); }
    },

    // ══════════════════════════════════════════════════════════════════════════
    // BANKING REPORTS
    // ══════════════════════════════════════════════════════════════════════════

    getTransactionListByDate: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getTransactionListByDate(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getTransactionListByDate'); }
    },

    getTransactionDetailByAccount: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getTransactionDetailByAccount(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getTransactionDetailByAccount'); }
    },

    getCheckDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getCheckDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getCheckDetail'); }
    },

    getDepositDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getDepositDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getDepositDetail'); }
    },

    getReconciliationDiscrepancy: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getReconciliationDiscrepancy(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getReconciliationDiscrepancy'); }
    },

    getBankingSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getBankingSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getBankingSummary'); }
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ACCOUNTANT REPORTS
    // ══════════════════════════════════════════════════════════════════════════

    getVoidedDeletedTransactions: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getVoidedDeletedTransactions(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getVoidedDeletedTransactions'); }
    },

    getAccountListing: async (req, res) => {
        try {
            const data = await reportService.getAccountListing(null, null, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getAccountListing'); }
    },

    getFixedAssetListing: async (req, res) => {
        try {
            const data = await reportService.getFixedAssetListing(null, null, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getFixedAssetListing'); }
    },

    getJournalEntries: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getJournalEntries(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getJournalEntries'); }
    },

    getIncomeTaxDetail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate); validateDate(toDate);
            const data = await reportService.getIncomeTaxDetail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getIncomeTaxDetail'); }
    },

    // ── Role / Permission Audit ───────────────────────────────────────────────
    getRolePermissionAudit: async (req, res) => {
        try {
            const data = await reportService.getRolePermissionAudit(req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getRolePermissionAudit'); }
    },

    // ── Bin Location Report ───────────────────────────────────────────────────
    getBinLocationReport: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            const data = await reportService.getBinLocationReport(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getBinLocationReport'); }
    },

    // ── Advanced Query (ODBC-equivalent cross-entity) ─────────────────────────
    getAdvancedQuery: async (req, res) => {
        try {
            const { entity, fromDate, toDate, groupBy, sortBy, sortDir, limit } = req.query;
            const filters = { fromDate, toDate };
            const filterKeys = ['type', 'status', 'minAmount', 'maxAmount', 'isActive'];
            for (const k of filterKeys) {
                if (req.query[k] !== undefined) filters[k] = req.query[k];
            }
            const data = await reportService.getAdvancedQuery(
                { entity, filters, groupBy, sortBy, sortDir, limit: parseInt(limit) || 500 },
                req.user.id,
                req.companyId
            );
            res.json(data);
        } catch (err) { handleError(err, res, 'getAdvancedQuery'); }
    },

    // ── Management Report Packages ────────────────────────────────────────────
    getManagementReportPackage: async (req, res) => {
        try {
            const { packageType, fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);
            if (!packageType) {
                return res.status(400).json({ error: 'packageType is required', type: 'VALIDATION_ERROR' });
            }
            const allowed = ['EXECUTIVE_SUMMARY', 'COMPANY_OVERVIEW', 'SALES_PERFORMANCE'];
            if (!allowed.includes(packageType)) {
                return res.status(400).json({
                    error: `packageType must be one of: ${allowed.join(', ')}`,
                    type: 'VALIDATION_ERROR',
                });
            }
            const data = await reportService.getManagementReportPackage(packageType, fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getManagementReportPackage'); }
    },

    // ── Customer Contact List ─────────────────────────────────────────────────
    getCustomerContactList: async (req, res) => {
        try {
            const data = await reportService.getCustomerContactList(req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getCustomerContactList'); }
    },

    // ── Item Listing ──────────────────────────────────────────────────────────
    getItemListing: async (req, res) => {
        try {
            const data = await reportService.getItemListing(req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getItemListing'); }
    },

    // ── Item Price List ───────────────────────────────────────────────────────
    getItemPriceList: async (req, res) => {
        try {
            const data = await reportService.getItemPriceList(req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getItemPriceList'); }
    },

    // ── Open Sales Orders ─────────────────────────────────────────────────────
    getOpenSalesOrders: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);
            const data = await reportService.getOpenSalesOrders(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getOpenSalesOrders'); }
    },

    // ── Backorder Report ──────────────────────────────────────────────────────
    getBackorderReport: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);
            const data = await reportService.getBackorderReport(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getBackorderReport'); }
    },

    // ── Employee Contact List ─────────────────────────────────────────────────
    getEmployeeContactList: async (req, res) => {
        try {
            const data = await reportService.getEmployeeContactList(req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getEmployeeContactList'); }
    },

    // ── Payroll Detail Review ─────────────────────────────────────────────────
    getPayrollDetailReview: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);
            const data = await reportService.getPayrollDetailReview(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getPayrollDetailReview'); }
    },

    // ── Workers' Comp Summary ─────────────────────────────────────────────────
    getWorkerCompSummary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);
            const data = await reportService.getWorkerCompSummary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getWorkerCompSummary'); }
    },

    // ── 1099 Summary ──────────────────────────────────────────────────────────
    get1099Summary: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);
            const data = await reportService.get1099Summary(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'get1099Summary'); }
    },

    // ── 1099 Detail ───────────────────────────────────────────────────────────
    get1099Detail: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);
            const data = await reportService.get1099Detail(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'get1099Detail'); }
    },

    // ── Inventory Aging ───────────────────────────────────────────────────────
    getInventoryAging: async (req, res) => {
        try {
            const { toDate } = req.query;
            validateDate(toDate);
            const data = await reportService.getInventoryAging(toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getInventoryAging'); }
    },

    // ── Assembly Component Usage ──────────────────────────────────────────────
    getAssemblyComponentUsage: async (req, res) => {
        try {
            const data = await reportService.getAssemblyComponentUsage(req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getAssemblyComponentUsage'); }
    },

    // ── Consolidated Reports (multi-company) ──────────────────────────────────
    getConsolidatedReport: async (req, res) => {
        try {
            const { reportType, fromDate, toDate } = req.query;
            if (!reportType) return res.status(400).json({ error: 'reportType is required', type: 'VALIDATION_ERROR' });
            const allowed = ['profit-and-loss', 'balance-sheet', 'trial-balance'];
            if (!allowed.includes(reportType)) {
                return res.status(400).json({ error: `reportType must be one of: ${allowed.join(', ')}`, type: 'VALIDATION_ERROR' });
            }
            validateDate(fromDate);
            validateDate(toDate);
            const data = await reportService.getConsolidatedReport(reportType, fromDate, toDate, req.user.id);
            res.json(data);
        } catch (err) { handleError(err, res, 'getConsolidatedReport'); }
    },

    // ── Allocation Reports ────────────────────────────────────────────────────

    // MRP Reception Report: per-MO list of open DOs / MOs needing the produced item
    getMRPReceptionReport: async (req, res) => {
        try {
            const { moId } = req.query;
            if (!moId) return res.status(400).json({ error: 'moId is required', type: 'VALIDATION_ERROR' });
            const data = await reportService.getMRPReceptionReport(moId, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getMRPReceptionReport'); }
    },

    // Allocation Status Report: summary of allocated vs. required across all open orders
    getAllocationStatusReport: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);
            const data = await reportService.getAllocationStatusReport(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getAllocationStatusReport'); }
    },

    // Product Allocation by Order: per-SO/WO allocation breakdown
    getProductAllocationReport: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;
            validateDate(fromDate);
            validateDate(toDate);
            const data = await reportService.getProductAllocationReport(fromDate, toDate, req.user.id, req.companyId);
            res.json(data);
        } catch (err) { handleError(err, res, 'getProductAllocationReport'); }
    },

    // ── Memorized Reports ─────────────────────────────────────────────────────
    saveMemorizedReport: async (req, res) => {
        try {
            const { name, reportType, params, groupName } = req.body;
            if (!name) return res.status(400).json({ error: 'name is required', type: 'VALIDATION_ERROR' });
            if (!reportType) return res.status(400).json({ error: 'reportType is required', type: 'VALIDATION_ERROR' });
            const data = await reportService.saveMemorizedReport(req.user.id, req.companyId, { name, reportType, params, groupName });
            res.json(data);
        } catch (err) { handleError(err, res, 'saveMemorizedReport'); }
    },

    getMemorizedReports: async (req, res) => {
        try {
            const { groupName } = req.query;
            const data = await reportService.getMemorizedReports(req.user.id, req.companyId, groupName);
            res.json(data);
        } catch (err) { handleError(err, res, 'getMemorizedReports'); }
    },

    deleteMemorizedReport: async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) return res.status(400).json({ error: 'id is required', type: 'VALIDATION_ERROR' });
            const data = await reportService.deleteMemorizedReport(req.user.id, req.companyId, id);
            res.json(data);
        } catch (err) { handleError(err, res, 'deleteMemorizedReport'); }
    },

    runMemorizedReport: async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) return res.status(400).json({ error: 'id is required', type: 'VALIDATION_ERROR' });
            const overrideParams = req.query || {};
            if (overrideParams.fromDate) validateDate(overrideParams.fromDate);
            if (overrideParams.toDate) validateDate(overrideParams.toDate);
            const data = await reportService.runMemorizedReport(req.user.id, req.companyId, id, overrideParams);
            res.json(data);
        } catch (err) { handleError(err, res, 'runMemorizedReport'); }
    },
};

module.exports = reportController;
