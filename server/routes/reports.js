
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

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

router.post('/custom-columns', reportController.addCustomColumn);
router.put('/custom-columns', reportController.updateCustomColumn);
router.get('/custom-columns', reportController.getCustomColumns);
router.delete('/custom-columns/:id', reportController.deleteCustomColumn);

module.exports = router;
