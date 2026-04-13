const Account = require('../models/Account');
const Company = require('../models/Company');
const Transaction = require('../models/Transaction');
const Employee = require('../models/Employee');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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

      // Fetch company settings for account mapping
      const company = await Company.findById(req.companyId);
      const mapping = company.payrollSettings || {};

      // Helper to map descriptions to accounts
      const getAccountId = (description) => {
        const desc = description.toLowerCase();
        if (desc.includes('gross') || desc.includes('wages')) return mapping.wagesAccountId || null;
        if (desc.includes('tax') || desc.includes('liability')) return mapping.taxLiabilityAccountId || null;
        if (desc.includes('net') || desc.includes('clearing')) return mapping.payrollClearingAccountId || null;
        return null;
      };

      // Create a Journal Entry in QBXpress
      const newEntry = new Transaction({
        id: crypto.randomUUID(),
        userId: req.user.id,
        companyId: req.companyId,
        type: 'JOURNAL',
        date: new Date().toISOString(),
        refNo: `PAY-${payRunId.slice(0, 8)}`,
        total: totalGross,
        memo: `Payroll Sync: ${period}`,
        status: 'POSTED',
        items: journalLines.map(line => ({
          description: line.description,
          amount: line.amount,
          type: line.type.toUpperCase(), // DEBIT/CREDIT
          accountId: getAccountId(line.description)
        }))
      });

      await newEntry.save();

      res.json({
        success: true,
        transactionId: newEntry._id,
        message: 'Payroll transaction recorded with account mapping'
      });
    } catch (err) {
      res.status(500).json({ detail: err.message });
    }
  },

  // 6. Get Employees
  getEmployees: async (req, res) => {
    try {
      const employees = await Employee.find({ companyId: req.companyId });
      res.json({
        total: employees.length,
        employees: employees.map(e => ({
          id: e._id,
          firstName: e.firstName,
          lastName: e.lastName,
          name: e.name,
          email: e.email,
          phone: e.phone,
          address: e.address,
          hiredDate: e.hiredDate,
          hourlyRate: e.hourlyRate,
          isActive: e.isActive
        }))
      });
    } catch (err) {
      res.status(500).json({ detail: err.message });
    }
  },

  // 7. Sync Employees (Push from PayrollOS to QBXpress)
  syncEmployees: async (req, res) => {
    try {
      const { employees } = req.body;
      if (!Array.isArray(employees)) {
        return res.status(400).json({ detail: 'Expected an array of employees' });
      }

      const results = {
        created: 0,
        updated: 0,
        errors: 0,
        details: []
      };

      for (const empData of employees) {
        try {
          // Try to find existing employee by id or email
          let employee = await Employee.findOne({
            companyId: req.companyId,
            $or: [
              { id: empData.id },
              { email: empData.email }
            ]
          });

          if (employee) {
            // Update existing
            employee.firstName = empData.firstName || employee.firstName;
            employee.lastName = empData.lastName || employee.lastName;
            employee.name = empData.name || `${empData.firstName} ${empData.lastName}` || employee.name;
            employee.email = empData.email || employee.email;
            employee.phone = empData.phone || employee.phone;
            employee.address = empData.address || employee.address;
            employee.hiredDate = empData.hiredDate || employee.hiredDate;
            employee.hourlyRate = empData.hourlyRate || employee.hourlyRate;
            employee.isActive = empData.isActive !== undefined ? empData.isActive : employee.isActive;

            await employee.save();
            results.updated++;
          } else {
            // Create new
            const newEmployee = new Employee({
              id: empData.id || `emp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              userId: req.user.id,
              companyId: req.companyId,
              name: empData.name || `${empData.firstName} ${empData.lastName}`,
              firstName: empData.firstName,
              lastName: empData.lastName,
              email: empData.email,
              phone: empData.phone,
              address: empData.address,
              hiredDate: empData.hiredDate,
              hourlyRate: empData.hourlyRate,
              isActive: empData.isActive !== undefined ? empData.isActive : true
            });

            await newEmployee.save();
            results.created++;
          }
        } catch (err) {
          results.errors++;
          results.details.push({ name: empData.name || empData.email, error: err.message });
        }
      }

      res.json({
        success: true,
        message: `Synced ${employees.length} employees: ${results.created} created, ${results.updated} updated, ${results.errors} errors`,
        results
      });
    } catch (err) {
      res.status(500).json({ detail: err.message });
    }
  }
};

module.exports = payrollConnectController;
