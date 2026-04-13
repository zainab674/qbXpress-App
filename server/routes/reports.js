
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const requirePermission = require('../middleware/requirePermission');

// All report reads require 'reports' → 'read'
router.use((req, res, next) => {
    if (req.method === 'GET') return requirePermission('reports', 'read')(req, res, next);
    next();
});

router.get('/profit-and-loss', reportController.getProfitAndLoss);
router.get('/balance-sheet', reportController.getBalanceSheet);
router.get('/ar-aging', reportController.getARAging);
router.get('/ap-aging', reportController.getAPAging);
router.get('/sales-by-item', reportController.getSalesByItem);
router.get('/inventory-valuation', reportController.getInventoryValuation);
router.get('/general-ledger', reportController.getGeneralLedger);
router.get('/tax-liability', reportController.getTaxLiability);
router.get('/trial-balance', reportController.getTrialBalance);
router.get('/cash-flow', reportController.getCashFlow);
router.get('/payroll-summary', reportController.getPayrollSummary);
router.get('/audit-trail', reportController.getAuditTrail);
router.get('/budget-vs-actual', reportController.getBudgetVsActual);
router.get('/job-estimates-vs-actuals', reportController.getJobEstimatesVsActuals);
router.get('/forecast', reportController.getForecast);
router.get('/audit-trail-detail', reportController.getAuditTrailDetail);
router.get('/change-order-log', reportController.getChangeOrderLog);

router.get('/physical-inventory', reportController.getPhysicalInventory);
router.get('/mileage-detail', reportController.getMileageDetail);
router.get('/pl-by-class', reportController.getProfitAndLossByClass);
router.get('/sales-by-customer', reportController.getSalesByCustomerSummary);
router.get('/customer-balance', reportController.getCustomerBalanceSummary);
router.get('/vendor-balance', reportController.getVendorBalanceSummary);
router.get('/payroll-liability', reportController.getPayrollLiabilityBalances);
router.get('/equity-statement', reportController.getStatementOfChangesInEquity);
router.get('/unbilled-charges', reportController.getUnbilledCharges);
router.get('/unbilled-time', reportController.getUnbilledTime);
router.get('/collections', reportController.getCollectionsReport);
router.get('/inventory-valuation-detail', reportController.getInventoryValuationDetail);
router.get('/adjusted-trial-balance', reportController.getAdjustedTrialBalance);
router.get('/statement-list', reportController.getStatementList);
router.get('/detailed-time', reportController.getDetailedTimeActivities);
router.get('/ar-aging-detail', reportController.getARAgingDetail);
router.get('/customer-balance-detail', reportController.getCustomerBalanceDetail);
router.get('/invoice-list', reportController.getInvoiceList);
router.get('/open-invoices', reportController.getOpenInvoices);
router.get('/invoices-and-payments', reportController.getInvoicesAndReceivedPayments);
router.get('/terms-list', reportController.getTermsList);
router.get('/open-purchase-order-list', reportController.getOpenPurchaseOrders);
router.get('/open-purchase-order-detail', reportController.getOpenPurchaseOrders);

// ── QB Enterprise: Cost Variance ─────────────────────────────────────────────
router.get('/cost-variance', reportController.getCostVarianceReport);

// ── BOM Report ────────────────────────────────────────────────────────────────
router.get('/bom-report', reportController.getBOMReport);

// ── Inventory by Site / Location ──────────────────────────────────────────────
router.get('/inventory-by-site', reportController.getInventoryBySite);
router.get('/inventory-by-location', reportController.getInventoryByLocation);
router.get('/inventory-stock-status-by-site', reportController.getInventoryStockStatusBySite);

// ── Lot / Serial / Price Level ────────────────────────────────────────────────
router.get('/lot-number-report', reportController.getLotNumberReport);
router.get('/serial-number-report', reportController.getSerialNumberReport);
router.get('/price-level-report', reportController.getPriceLevelReport);

// ── QB Inventory Reports ──────────────────────────────────────────────────────
router.get('/inventory-stock-status', reportController.getInventoryStockStatusByItem);
router.get('/inventory-stock-status-by-vendor', reportController.getInventoryStockStatusByVendor);
router.get('/pending-builds', reportController.getPendingBuilds);
router.get('/physical-inventory-worksheet', reportController.getPhysicalInventoryWorksheet);
router.get('/inventory-turnover', reportController.getInventoryTurnover);

// ── Assembly Shortage & Inventory Reorder ────────────────────────────────────
router.get('/assembly-shortage', reportController.getAssemblyShortageReport);
router.get('/inventory-reorder', reportController.getInventoryReorderReport);

// ── QB Enterprise Financial Reports ──────────────────────────────────────────
router.get('/pl-detail',             reportController.getProfitAndLossDetail);
router.get('/pl-by-month',           reportController.getProfitAndLossByMonth);
router.get('/pl-ytd-comparison',     reportController.getProfitAndLossYTD);
router.get('/pl-prev-year',          reportController.getProfitAndLossPrevYear);
router.get('/bs-detail',             reportController.getBalanceSheetDetail);
router.get('/bs-summary',            reportController.getBalanceSheetSummary);
router.get('/bs-prev-year',          reportController.getBalanceSheetPrevYear);
router.get('/income-tax-summary',    reportController.getIncomeTaxSummary);
router.get('/missing-checks',        reportController.getMissingChecks);

// ── QB Enterprise Sales Reports ──────────────────────────────────────────────
router.get('/sales-by-customer-detail',          reportController.getSalesByCustomerDetail);
router.get('/sales-by-rep-summary',              reportController.getSalesByRepSummary);
router.get('/sales-by-rep-detail',               reportController.getSalesByRepDetail);
router.get('/sales-order-fulfillment-worksheet', reportController.getSalesOrderFulfillmentWorksheet);
router.get('/pending-sales',                     reportController.getPendingSales);

// ── QB Enterprise: Vendors / Purchases Reports ───────────────────────────────
router.get('/ap-aging-detail',              reportController.getAPAgingDetail);
router.get('/vendor-balance-detail',        reportController.getVendorBalanceDetail);
router.get('/unpaid-bills-detail',          reportController.getUnpaidBillsDetail);
router.get('/bills-and-payments',           reportController.getBillsAndAppliedPayments);
router.get('/purchases-by-vendor-detail',   reportController.getPurchasesByVendorDetail);
router.get('/purchases-by-item-detail',     reportController.getPurchasesByItemDetail);
router.get('/vendor-contact-list',          reportController.getVendorContactList);

// ── Jobs / Time Reports ───────────────────────────────────────────────────────
router.get('/job-profitability-summary',  reportController.getJobProfitabilitySummary);
router.get('/job-profitability-detail',   reportController.getJobProfitabilityDetail);
router.get('/job-costs-by-job',           reportController.getJobCostsByJob);
router.get('/job-costs-by-vendor',        reportController.getJobCostsByVendor);
router.get('/job-costs-by-type',          reportController.getJobCostsByType);
router.get('/time-by-job-summary',        reportController.getTimeByJobSummary);
router.get('/time-by-job-detail',         reportController.getTimeByJobDetail);
router.get('/time-by-name',               reportController.getTimeByName);
router.get('/mileage-by-vehicle',         reportController.getMileageByVehicle);
router.get('/mileage-by-job-detail',      reportController.getMileageByJobDetail);

// ── Banking Reports ──────────────────────────────────────────────────────────
router.get('/transaction-list-by-date',     reportController.getTransactionListByDate);
router.get('/transaction-detail-by-account',reportController.getTransactionDetailByAccount);
router.get('/check-detail',                 reportController.getCheckDetail);
router.get('/deposit-detail',               reportController.getDepositDetail);
router.get('/reconciliation-discrepancy',   reportController.getReconciliationDiscrepancy);
router.get('/banking-summary',              reportController.getBankingSummary);

// ── Accountant Reports ───────────────────────────────────────────────────────
router.get('/voided-deleted-transactions',  reportController.getVoidedDeletedTransactions);
router.get('/account-listing',              reportController.getAccountListing);
router.get('/fixed-asset-listing',          reportController.getFixedAssetListing);
router.get('/journal-entries',              reportController.getJournalEntries);
router.get('/income-tax-detail',            reportController.getIncomeTaxDetail);

router.post('/custom-columns',       requirePermission('reports', 'export'), reportController.addCustomColumn);
router.put('/custom-columns',        requirePermission('reports', 'export'), reportController.updateCustomColumn);
router.get('/custom-columns',        reportController.getCustomColumns);
router.delete('/custom-columns/:id', requirePermission('reports', 'export'), reportController.deleteCustomColumn);

// ── QB Enterprise Exclusive ───────────────────────────────────────────────────
router.get('/role-permission-audit',     reportController.getRolePermissionAudit);
router.get('/bin-location-report',       reportController.getBinLocationReport);
router.get('/advanced-query',            reportController.getAdvancedQuery);
router.get('/management-report-package', reportController.getManagementReportPackage);

// ── Contacts & Lists ──────────────────────────────────────────────────────────
router.get('/customer-contact-list',  reportController.getCustomerContactList);
router.get('/employee-contact-list',  reportController.getEmployeeContactList);
router.get('/item-listing',           reportController.getItemListing);
router.get('/item-price-list',        reportController.getItemPriceList);

// ── Sales: Open Orders & Backorders ──────────────────────────────────────────
router.get('/open-sales-orders',      reportController.getOpenSalesOrders);
router.get('/backorder',              reportController.getBackorderReport);

// ── Payroll ───────────────────────────────────────────────────────────────────
router.get('/payroll-detail-review',  reportController.getPayrollDetailReview);
router.get('/workers-comp-summary',   reportController.getWorkerCompSummary);

// ── 1099 Reports ──────────────────────────────────────────────────────────────
router.get('/1099-summary',           reportController.get1099Summary);
router.get('/1099-detail',            reportController.get1099Detail);

// ── Inventory ─────────────────────────────────────────────────────────────────
router.get('/inventory-aging',        reportController.getInventoryAging);
router.get('/assembly-component-usage', reportController.getAssemblyComponentUsage);

// ── Consolidated (multi-company) ──────────────────────────────────────────────
router.get('/consolidated-pl',        (req, res) => { req.query.reportType = 'profit-and-loss'; reportController.getConsolidatedReport(req, res); });
router.get('/consolidated-bs',        (req, res) => { req.query.reportType = 'balance-sheet';   reportController.getConsolidatedReport(req, res); });
router.get('/consolidated-tb',        (req, res) => { req.query.reportType = 'trial-balance';    reportController.getConsolidatedReport(req, res); });

// ── Allocation Reports ────────────────────────────────────────────────────────
router.get('/mrp-reception-report',   reportController.getMRPReceptionReport);
router.get('/allocation-status',      reportController.getAllocationStatusReport);
router.get('/product-allocation',     reportController.getProductAllocationReport);

// ── Memorized Reports ─────────────────────────────────────────────────────────
router.get('/memorized',              reportController.getMemorizedReports);
router.post('/memorized',             reportController.saveMemorizedReport);
router.delete('/memorized/:id',       reportController.deleteMemorizedReport);
router.get('/memorized/:id/run',      reportController.runMemorizedReport);

module.exports = router;
