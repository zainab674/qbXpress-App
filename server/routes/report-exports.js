const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const reportService = require('../services/reportService');
const { exportToExcel } = require('../services/reportExportService');
const ScheduledReport = require('../models/ScheduledReport');
const { registerSchedule, cancelSchedule } = require('../jobs/scheduledReportRunner');

// ─── Full method map: reportType → reportService method name ──────────────────
const METHOD_MAP = {
    // Core Financial
    'P&L':                    'getProfitAndLoss',
    'BS':                     'getBalanceSheet',
    'GL':                     'getGeneralLedger',
    'AGING':                  'getARAging',
    'AP_AGING':               'getAPAging',
    'SALES_ITEM':             'getSalesByItem',
    'INV_VAL':                'getInventoryValuation',
    'TRIAL_BALANCE':          'getTrialBalance',
    'CASH_FLOW':              'getCashFlow',
    'BUDGET_VS_ACTUAL':       'getBudgetVsActual',
    'FORECAST':               'getForecast',
    'PAYROLL_SUMMARY':        'getPayrollSummary',
    'AUDIT_TRAIL':            'getAuditTrail',
    'TAX_LIABILITY':          'getTaxLiability',
    'PAYROLL_LIABILITY':      'getPayrollLiabilityBalances',
    'CHANGE_ORDER_LOG':       'getChangeOrderLog',
    'PHYSICAL_INVENTORY':     'getPhysicalInventory',
    'PHYSICAL_INVENTORY_WORKSHEET': 'getPhysicalInventoryWorksheet',
    'MILEAGE_DETAIL':         'getMileageDetail',
    'PL_BY_CLASS':            'getProfitAndLossByClass',
    'SALES_CUSTOMER':         'getSalesByCustomerSummary',
    'EQUITY_STATEMENT':       'getStatementOfChangesInEquity',
    'UNBILLED_CHARGES':       'getUnbilledCharges',
    'UNBILLED_TIME':          'getUnbilledTime',
    'COLLECTIONS':            'getCollectionsReport',
    'INV_VAL_DETAIL':         'getInventoryValuationDetail',
    'ADJUSTED_TRIAL_BALANCE': 'getAdjustedTrialBalance',
    'STATEMENT_LIST':         'getStatementList',
    'DETAILED_TIME':          'getDetailedTimeActivities',
    'AGING_DETAIL':           'getARAgingDetail',
    'CUSTOMER_BALANCE_DETAIL':'getCustomerBalanceDetail',
    'CUSTOMER_BALANCE':       'getCustomerBalanceSummary',
    'INVOICE_LIST':           'getInvoiceList',
    'OPEN_INVOICES':          'getOpenInvoices',
    'INVOICES_RECEIVED':      'getInvoicesAndReceivedPayments',
    'TERMS_LIST_REPORT':      'getTermsList',
    'VENDOR_BALANCE':         'getVendorBalanceSummary',
    'STOCK_TAKE':             'getPhysicalInventory',
    'OPEN_PO_LIST':           'getOpenPurchaseOrders',
    'OPEN_PO_DETAIL':         'getOpenPurchaseOrders',
    'COST_VARIANCE':          'getCostVarianceReport',
    'BOM_REPORT':             'getBOMReport',
    'INV_BY_SITE':            'getInventoryBySite',
    'INV_BY_LOCATION':        'getInventoryByLocation',
    'STOCK_STATUS_BY_SITE':   'getInventoryStockStatusBySite',
    'LOT_NUMBER':             'getLotNumberReport',
    'SERIAL_NUMBER':          'getSerialNumberReport',
    'PRICE_LEVEL':            'getPriceLevelReport',
    'ASSEMBLY_SHORTAGE':      'getAssemblyShortageReport',
    'INVENTORY_REORDER':      'getInventoryReorderReport',
    // QB Enterprise Financial
    'PL_DETAIL':              'getProfitAndLossDetail',
    'PL_BY_MONTH':            'getProfitAndLossByMonth',
    'PL_YTD':                 'getProfitAndLossYTD',
    'PL_PREV_YEAR':           'getProfitAndLossPrevYear',
    'BS_DETAIL':              'getBalanceSheetDetail',
    'BS_SUMMARY':             'getBalanceSheetSummary',
    'BS_PREV_YEAR':           'getBalanceSheetPrevYear',
    'INCOME_TAX':             'getIncomeTaxSummary',
    'MISSING_CHECKS':         'getMissingChecks',
    // Sales
    'SALES_CUSTOMER_DETAIL':  'getSalesByCustomerDetail',
    'SALES_BY_REP_SUMMARY':   'getSalesByRepSummary',
    'SALES_BY_REP_DETAIL':    'getSalesByRepDetail',
    'SO_FULFILLMENT':         'getSalesOrderFulfillmentWorksheet',
    'PENDING_SALES':          'getPendingSales',
    // Vendor / Purchases
    'AP_AGING_DETAIL':        'getAPAgingDetail',
    'VENDOR_BALANCE_DETAIL':  'getVendorBalanceDetail',
    'UNPAID_BILLS_DETAIL':    'getUnpaidBillsDetail',
    'BILLS_AND_PAYMENTS':     'getBillsAndAppliedPayments',
    'PURCHASES_BY_VENDOR_DETAIL': 'getPurchasesByVendorDetail',
    'PURCHASES_BY_ITEM_DETAIL':   'getPurchasesByItemDetail',
    'VENDOR_CONTACT_LIST':    'getVendorContactList',
    // Banking
    'TRANSACTION_LIST_BY_DATE':      'getTransactionListByDate',
    'TRANSACTION_DETAIL_BY_ACCOUNT': 'getTransactionDetailByAccount',
    'CHECK_DETAIL':                  'getCheckDetail',
    'DEPOSIT_DETAIL':                'getDepositDetail',
    'RECONCILIATION_DISCREPANCY':    'getReconciliationDiscrepancy',
    'MISSING_CHECKS_BANKING':        'getMissingChecks',
    'BANKING_SUMMARY':               'getBankingSummary',
    // Accountant
    'VOIDED_DELETED_TXN':     'getVoidedDeletedTransactions',
    'ACCOUNT_LISTING':        'getAccountListing',
    'FIXED_ASSET_LISTING':    'getFixedAssetListing',
    'JOURNAL_ENTRIES':        'getJournalEntries',
    'INCOME_TAX_DETAIL':      'getIncomeTaxDetail',
    // QB Enterprise Exclusive
    'ROLE_PERMISSION_AUDIT':  'getRolePermissionAudit',
    'BIN_LOCATION':           'getBinLocationReport',
    // Allocation
    'MRP_RECEPTION_REPORT':   'getMRPReceptionReport',
    'ALLOCATION_STATUS':      'getAllocationStatusReport',
    'PRODUCT_ALLOCATION':     'getProductAllocationReport',
};

// Types whose first arg is toDate (not fromDate) — Balance Sheet family
const TO_DATE_ONLY = new Set(['BS', 'BS_DETAIL', 'BS_SUMMARY', 'BS_PREV_YEAR']);
// Types with no date args at all
const NO_DATE = new Set(['TERMS_LIST_REPORT', 'ROLE_PERMISSION_AUDIT']);
// Special dispatch types
const BOM_TYPES = new Set(['BOM_REPORT']);
const MRP_TYPES = new Set(['MRP_RECEPTION_REPORT']);
const PO_DETAIL_TYPES = new Set(['OPEN_PO_DETAIL']);

async function callReportMethod(method, reportType, fromDate, toDate, userId, companyId, otherParams) {
    if (TO_DATE_ONLY.has(reportType)) {
        return reportService[method](toDate, userId, companyId);
    }
    if (NO_DATE.has(reportType)) {
        return reportService[method](userId, companyId);
    }
    if (BOM_TYPES.has(reportType)) {
        return reportService[method](userId, companyId, otherParams.itemId);
    }
    if (MRP_TYPES.has(reportType)) {
        return reportService[method](otherParams.moId, userId, companyId);
    }
    if (PO_DETAIL_TYPES.has(reportType)) {
        return reportService[method](fromDate, toDate, userId, companyId, true);
    }
    return reportService[method](fromDate, toDate, userId, companyId, otherParams);
}

// ─── Excel Export ──────────────────────────────────────────────────────────────
// POST /api/report-exports/excel
router.post('/excel', async (req, res, next) => {
    try {
        const { reportType, params = {} } = req.body;
        if (!reportType) return res.status(400).json({ message: 'reportType is required' });

        const method = METHOD_MAP[reportType];
        if (!method || typeof reportService[method] !== 'function') {
            return res.status(400).json({ message: `Export not supported for report type: ${reportType}` });
        }

        const { fromDate, toDate, ...otherParams } = params;
        const reportData = await callReportMethod(
            method, reportType, fromDate, toDate,
            req.user.id, req.companyId, otherParams
        );
        const buffer = exportToExcel(reportData, reportType);

        const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (err) {
        next(err);
    }
});

// ─── Schedule CRUD ─────────────────────────────────────────────────────────────
// GET /api/report-schedules
router.get('/schedules', async (req, res, next) => {
    try {
        const schedules = await ScheduledReport.find({ userId: req.user.id, companyId: req.companyId }).lean();
        res.json(schedules);
    } catch (err) { next(err); }
});

// POST /api/report-schedules
router.post('/schedules', async (req, res, next) => {
    try {
        const { name, reportType, params, cronExpression, recipientEmails, format } = req.body;
        if (!name || !reportType || !cronExpression) {
            return res.status(400).json({ message: 'name, reportType, and cronExpression are required' });
        }
        const schedule = new ScheduledReport({
            id: crypto.randomUUID(),
            userId: req.user.id,
            companyId: req.companyId,
            name, reportType, params: params || {},
            cronExpression, recipientEmails: recipientEmails || [],
            format: format || 'Excel',
            isActive: true,
        });
        await schedule.save();
        registerSchedule(schedule.toObject());
        res.status(201).json(schedule);
    } catch (err) { next(err); }
});

// PUT /api/report-schedules/:id
router.put('/schedules/:id', async (req, res, next) => {
    try {
        const schedule = await ScheduledReport.findOneAndUpdate(
            { id: req.params.id, userId: req.user.id, companyId: req.companyId },
            req.body,
            { new: true }
        );
        if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
        registerSchedule(schedule.toObject()); // re-register with new cron
        res.json(schedule);
    } catch (err) { next(err); }
});

// DELETE /api/report-schedules/:id
router.delete('/schedules/:id', async (req, res, next) => {
    try {
        const schedule = await ScheduledReport.findOneAndDelete({ id: req.params.id, userId: req.user.id, companyId: req.companyId });
        if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
        cancelSchedule(schedule.id);
        res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
