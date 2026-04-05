const Account = require('../models/Account');
const Company = require('../models/Company');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');

/**
 * Controller for Payroll Connect (PayrollOS integration)
 */
const payrollConnectController = {
  // 1. Verify token (called by PayrollOS to check connection)
  verify: async (req, res) => {
    try {
      // In a real app, we'd verify the Bearer token
      // For this bridge, we assume the token is valid if it exists
      const company = await Company.findById(req.companyId);
      res.json({
        valid: true,
        companyName: company ? company.name : 'Unknown Company',
        userId: req.user.id
      });
    } catch (err) {
      res.status(500).json({ detail: err.message });
    }
  },

  // 2. Get Company Info
  getCompany: async (req, res) => {
    try {
      const company = await Company.findById(req.companyId);
      if (!company) return res.status(404).json({ detail: 'Company not found' });
      res.json({
        id: company._id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address
      });
    } catch (err) {
      res.status(500).json({ detail: err.message });
    }
  },

  // 3. Get Accounts (Chart of Accounts)
  getAccounts: async (req, res) => {
    try {
      const accounts = await Account.find({ companyId: req.companyId });
      res.json({
        total: accounts.length,
        accounts: accounts.map(a => ({
          id: a._id,
          name: a.name,
          type: a.type,
          subType: a.subType,
          balance: a.balance,
          active: true
        }))
      });
    } catch (err) {
      res.status(500).json({ detail: err.message });
    }
  },

  // 4. Get Overview (Financials)
  getOverview: async (req, res) => {
    try {
      const accounts = await Account.find({ companyId: req.companyId });
      const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      res.json({
        companyId: req.companyId,
        totalAssets: totalBalance,
        accountCount: accounts.length,
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({ detail: err.message });
    }
  },

  // 5. Sync Payroll (Push from PayrollOS to QBXpress)
  syncPayroll: async (req, res) => {
    try {
      const { payRunId, period, totalGross, totalNet, totalTax, journalLines } = req.body;
      
      // Create a Journal Entry in QBXpress
      const newEntry = new Transaction({
        companyId: req.companyId,
        type: 'JOURNAL',
        date: new Date(),
        refNo: `PAY-${payRunId.slice(0, 8)}`,
        total: totalGross,
        memo: `Payroll Sync: ${period}`,
        status: 'POSTED',
        items: journalLines.map(line => ({
          description: line.description,
          amount: line.amount,
          type: line.type.toUpperCase(), // DEBIT/CREDIT
          accountId: null // In a real app, we'd map descriptions to actual account IDs
        }))
      });

      await newEntry.save();

      res.json({
        success: true,
        transactionId: newEntry._id,
        message: 'Payroll transaction recorded'
      });
    } catch (err) {
      res.status(500).json({ detail: err.message });
    }
  }
};

module.exports = payrollConnectController;
