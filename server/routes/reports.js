
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

module.exports = router;
