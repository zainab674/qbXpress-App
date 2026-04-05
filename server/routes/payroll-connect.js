const express = require('express');
const router = express.Router();
const payrollConnectController = require('../controllers/payrollConnectController');
const auth = require('../middleware/auth');
const companyAuth = require('../middleware/companyAuth');

// All routes require authentication and company context
router.use(auth);
router.use(companyAuth);

/**
 * Routes for PayrollOS Integration
 */

// GET /api/payroll-connect/verify
router.get('/verify', payrollConnectController.verify);

// GET /api/payroll-connect/company
router.get('/company', payrollConnectController.getCompany);

// GET /api/payroll-connect/accounts
router.get('/accounts', payrollConnectController.getAccounts);

// GET /api/payroll-connect/overview
router.get('/overview', payrollConnectController.getOverview);

// POST /api/payroll-connect/payroll-sync
router.post('/payroll-sync', payrollConnectController.syncPayroll);

module.exports = router;
