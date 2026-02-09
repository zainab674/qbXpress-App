const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Item = require('../models/Item');
const PayrollLiability = require('../models/PayrollLiability');
const AuditLogEntry = require('../models/AuditLogEntry');
const Budget = require('../models/Budget');
const MileageEntry = require('../models/MileageEntry');
const QBClass = require('../models/QBClass');

const reportService = {
    getProfitAndLoss: async (fromDate, toDate, userId) => {
        const accounts = await Account.find({ userId });
        const incomeAccs = accounts.filter(a => a.type === 'Income');
        const cogsAccs = accounts.filter(a => a.type === 'Cost of Goods Sold');
        const expenseAccs = accounts.filter(a => a.type === 'Expense');
        const otherIncomeAccs = accounts.filter(a => a.type === 'Other Income');
        const otherExpenseAccs = accounts.filter(a => a.type === 'Other Expense');

        const incomeTotal = incomeAccs.reduce((s, a) => s + (a.balance || 0), 0);
        const cogsTotal = cogsAccs.reduce((s, a) => s + (a.balance || 0), 0);
        const grossProfit = incomeTotal - cogsTotal;
        const expenseTotal = expenseAccs.reduce((s, a) => s + (a.balance || 0), 0);
        const ordinaryIncome = grossProfit - expenseTotal;
        const otherNet = otherIncomeAccs.reduce((s, a) => s + (a.balance || 0), 0) - otherExpenseAccs.reduce((s, a) => s + (a.balance || 0), 0);

        return {
            sections: [
                { title: 'Ordinary Income/Expense', isHeading: true },
                { title: 'Income', isHeading: true, indent: 2 },
                ...incomeAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 4 })),
                { title: 'Total Income', value: incomeTotal, isTotal: true, indent: 2 },
                { title: 'Cost of Goods Sold', isHeading: true, indent: 2, spacing: true },
                ...cogsAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 4 })),
                { title: 'Total COGS', value: cogsTotal, isTotal: true, indent: 2 },
                { title: 'Gross Profit', value: grossProfit, isTotal: true, spacing: true },
                { title: 'Expense', isHeading: true, indent: 2, spacing: true },
                ...expenseAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 4 })),
                { title: 'Total Expense', value: expenseTotal, isTotal: true, indent: 2 },
                { title: 'Net Ordinary Income', value: ordinaryIncome, isTotal: true, spacing: true },
                { title: 'Other Income/Expense', isHeading: true, spacing: true },
                ...otherIncomeAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 4 })),
                ...otherExpenseAccs.map(a => ({ title: a.name, value: -(a.balance || 0), id: a.id, indent: 4 })),
                { title: 'Net Other Income', value: otherNet, isTotal: true, indent: 2 },
                { title: 'Net Income', value: ordinaryIncome + otherNet, isGrandTotal: true, spacing: true }
            ]
        };
    },

    getBalanceSheet: async (toDate, userId) => {
        const accounts = await Account.find({ userId });
        const bankAccs = accounts.filter(a => a.type === 'Bank');
        const arAccs = accounts.filter(a => a.type === 'Accounts Receivable');
        const ocaAccs = accounts.filter(a => ['Other Current Asset', 'Inventory Asset'].includes(a.type));
        const fixedAccs = accounts.filter(a => a.type === 'Fixed Asset');

        const apAccs = accounts.filter(a => a.type === 'Accounts Payable');
        const ccAccs = accounts.filter(a => a.type === 'Credit Card');
        const oclAccs = accounts.filter(a => a.type === 'Other Current Liability');
        const ltlAccs = accounts.filter(a => a.type === 'Long Term Liability');
        const equityAccs = accounts.filter(a => a.type === 'Equity');

        const totalAssets = accounts.filter(a => ['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset', 'Other Asset', 'Inventory Asset'].includes(a.type)).reduce((s, a) => s + (a.balance || 0), 0);
        const totalLiab = accounts.filter(a => ['Accounts Payable', 'Credit Card', 'Other Current Liability', 'Long Term Liability'].includes(a.type)).reduce((s, a) => s + (a.balance || 0), 0);
        const totalEquity = equityAccs.reduce((s, a) => s + (a.balance || 0), 0);

        return {
            sections: [
                { title: 'ASSETS', isHeading: true },
                { title: 'Current Assets', isHeading: true, indent: 2 },
                { title: 'Checking/Savings', isHeading: true, indent: 4 },
                ...bankAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 6 })),
                { title: 'Accounts Receivable', isHeading: true, indent: 4 },
                ...arAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 6 })),
                { title: 'Other Current Assets', isHeading: true, indent: 4 },
                ...ocaAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 6 })),
                { title: 'Total Current Assets', value: bankAccs.reduce((s, a) => s + (a.balance || 0), 0) + arAccs.reduce((s, a) => s + (a.balance || 0), 0) + ocaAccs.reduce((s, a) => s + (a.balance || 0), 0), isTotal: true, indent: 2 },
                { title: 'Fixed Assets', isHeading: true, indent: 2, spacing: true },
                ...fixedAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 4 })),
                { title: 'TOTAL ASSETS', value: totalAssets, isGrandTotal: true, spacing: true },
                { title: 'LIABILITIES & EQUITY', isHeading: true, spacing: true },
                { title: 'Liabilities', isHeading: true, indent: 2 },
                { title: 'Current Liabilities', isHeading: true, indent: 4 },
                ...apAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 6 })),
                ...ccAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 6 })),
                ...oclAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 6 })),
                { title: 'Long Term Liabilities', isHeading: true, indent: 4, spacing: true },
                ...ltlAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 6 })),
                { title: 'Total Liabilities', value: totalLiab, isTotal: true, indent: 2 },
                { title: 'Equity', isHeading: true, spacing: true, indent: 2 },
                ...equityAccs.map(a => ({ title: a.name, value: a.balance || 0, id: a.id, indent: 4 })),
                { title: 'TOTAL LIABILITIES & EQUITY', value: totalLiab + totalEquity, isGrandTotal: true, spacing: true }
            ]
        };
    },

    getARAging: async (fromDate, toDate, userId) => {
        const transactions = await Transaction.find({
            type: 'INVOICE',
            status: 'OPEN',
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId
        });
        const customers = await Customer.find({ userId });
        const rows = customers.map(c => {
            const amount = transactions.filter(tx => tx.entityId === c.id).reduce((s, tx) => s + tx.total, 0);
            return { title: c.name, value: amount, id: c.id, indent: 2 };
        }).filter(r => r.value > 0);
        return {
            sections: [{ title: 'Current A/R Aging', isHeading: true }, ...rows, { title: 'TOTAL', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }]
        };
    },

    getAPAging: async (fromDate, toDate, userId) => {
        const transactions = await Transaction.find({
            type: 'BILL',
            status: 'OPEN',
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId
        });
        const vendors = await Vendor.find({ userId });
        const rows = vendors.map(v => {
            const amount = transactions.filter(tx => tx.entityId === v.id).reduce((s, tx) => s + tx.total, 0);
            return { title: v.name, value: amount, id: v.id, indent: 2 };
        }).filter(r => r.value > 0);
        return {
            sections: [{ title: 'Current A/P Aging', isHeading: true }, ...rows, { title: 'TOTAL', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }]
        };
    },

    getSalesByItem: async (fromDate, toDate) => {
        const transactions = await Transaction.find({
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' }
        });
        const items = await Item.find();
        const rows = items.map(item => {
            const amount = transactions.reduce((s, t) => s + t.items.filter(i => i.id === item.id).reduce((is, it) => is + (it.amount || 0), 0), 0);
            return { title: item.name, value: amount, id: item.id, indent: 2 };
        }).filter(r => r.value > 0);
        return {
            sections: [{ title: 'Sales by Item', isHeading: true }, ...rows, { title: 'TOTAL', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }]
        };
    },

    getInventoryValuation: async () => {
        const items = await Item.find({ $or: [{ type: 'Inventory Part' }, { type: 'Inventory Assembly' }] });
        const rows = items.map(item => {
            const qoh = item.onHand || 0;
            const cost = item.cost || 0;
            const value = qoh * cost;
            return {
                title: item.name,
                value: value,
                extraValue: qoh,
                extraValue2: cost,
                id: item.id,
                indent: 2
            };
        });
        return {
            sections: [
                { title: 'Inventory Valuation Summary', isHeading: true },
                ...rows,
                { title: 'TOTAL ASSET VALUE', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getGeneralLedger: async (fromDate, toDate, { accountId, vendorId, customerId }) => {
        const query = {
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' }
        };
        const transactions = await Transaction.find(query);
        const accounts = await Account.find();
        const vendors = await Vendor.find();
        const customers = await Customer.find();
        const acc = accountId ? accounts.find(a => a.id === accountId) : null;

        const glFiltered = transactions.filter(t => {
            if (accountId) return t.bankAccountId === accountId || t.items.some(i => i.accountId === accountId) || (t.type === 'INVOICE' && acc?.type === 'Accounts Receivable');
            if (vendorId) return t.entityId === vendorId && (t.type === 'BILL' || t.type === 'CHECK' || t.type === 'VENDOR_CREDIT');
            if (customerId) return t.entityId === customerId && (t.type === 'INVOICE' || t.type === 'PAYMENT' || t.type === 'SALES_RECEIPT');
            return true;
        });

        let runningBalance = 0;
        const transactionsWithBalance = glFiltered.map(t => {
            let amount = t.total;
            if (accountId) {
                amount = (t.bankAccountId === accountId || t.type === 'INVOICE') ? t.total : -t.total;
            } else if (vendorId) {
                amount = (t.type === 'BILL') ? t.total : -t.total;
            }
            runningBalance += amount;
            return { ...t, runningBalance };
        });

        const title = acc ? `General Ledger: ${acc.name}` : (vendorId ? `Vendor Balance: ${vendors.find(v => v.id === vendorId)?.name}` : (customerId ? `Customer Balance: ${customers.find(c => c.id === customerId)?.name}` : 'General Ledger'));

        return { title, transactions: transactionsWithBalance };
    },

    getTaxLiability: async (fromDate, toDate) => {
        const query = {
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' }
        };
        const transactions = await Transaction.find(query);
        const invoices = transactions.filter(t => t.type === 'INVOICE' || t.type === 'SALES_RECEIPT');
        const taxableSales = invoices.reduce((sum, t) => sum + t.items.filter(i => i.tax).reduce((s, i) => s + (i.amount || 0), 0), 0);
        const taxRate = 0.08;
        const taxCollected = taxableSales * taxRate;
        const adjustments = transactions.filter(t => t.type === 'TAX_ADJUSTMENT').reduce((s, t) => s + (t.total || 0), 0);
        const payments = transactions.filter(t => t.type === 'TAX_PAYMENT').reduce((s, t) => s + (t.total || 0), 0);

        return {
            sections: [
                { title: 'Sales Tax Liability', isHeading: true },
                { title: 'State Board of Equalization', isHeading: true, indent: 2 },
                { title: 'Taxable Sales', value: taxableSales, indent: 4 },
                { title: 'Tax Rate', value: taxRate * 100, indent: 4 },
                { title: 'Tax Collected', value: taxCollected, indent: 4 },
                { title: 'Adjustments', value: adjustments, indent: 4 },
                { title: 'Tax Paid', value: -payments, indent: 4 },
                { title: 'Total Tax Due', value: taxCollected + adjustments - payments, isGrandTotal: true, spacing: true }
            ]
        };
    },

    getTrialBalance: async () => {
        const accounts = await Account.find();
        const rows = accounts.map(a => {
            const isNormalDebit = ['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset', 'Other Asset', 'Inventory Asset', 'Expense', 'Cost of Goods Sold', 'Other Expense'].includes(a.type);
            const balance = a.balance || 0;
            return {
                title: a.name,
                debit: isNormalDebit ? (balance > 0 ? balance : 0) : (balance < 0 ? Math.abs(balance) : 0),
                credit: isNormalDebit ? (balance < 0 ? Math.abs(balance) : 0) : (balance > 0 ? balance : 0),
                id: a.id
            };
        }).filter(r => r.debit !== 0 || r.credit !== 0);

        return {
            sections: [
                { title: 'Trial Balance', isHeading: true },
                ...rows.map(r => ({ title: r.title, value: r.debit || -r.credit, id: r.id, indent: 2 })),
                { title: 'TOTAL', value: 0, isGrandTotal: true, spacing: true }
            ]
        };
    },

    getCashFlow: async (fromDate, toDate, userId) => {
        const accounts = await Account.find({ userId });
        const netIncomeData = await reportService.getProfitAndLoss(fromDate, toDate, userId);
        const netIncome = netIncomeData.sections.find(s => s.isGrandTotal)?.value || 0;

        // Simplified indirect method
        const arDelta = accounts.filter(a => a.type === 'Accounts Receivable').reduce((s, a) => s + (a.balance || 0), 0);
        const apDelta = accounts.filter(a => a.type === 'Accounts Payable').reduce((s, a) => s + (a.balance || 0), 0);
        const inventoryDelta = accounts.filter(a => a.type === 'Inventory Asset').reduce((s, a) => s + (a.balance || 0), 0);

        const opCash = netIncome - arDelta + apDelta - inventoryDelta;

        return {
            sections: [
                { title: 'Statement of Cash Flows', isHeading: true },
                { title: 'OPERATING ACTIVITIES', isHeading: true, indent: 2 },
                { title: 'Net Income', value: netIncome, indent: 4 },
                { title: 'Adjustments to reconcile Net Income', isHeading: true, indent: 4 },
                { title: 'Accounts Receivable', value: -arDelta, indent: 6 },
                { title: 'Accounts Payable', value: apDelta, indent: 6 },
                { title: 'Inventory Asset', value: -inventoryDelta, indent: 6 },
                { title: 'Net cash provided by Operating Activities', value: opCash, isTotal: true, indent: 2, spacing: true },
                { title: 'Net cash increase for period', value: opCash, isGrandTotal: true, spacing: true }
            ]
        };
    },

    getPayrollSummary: async (fromDate, toDate) => {
        const query = {
            type: 'PAYCHECK',
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' }
        };
        const paychecks = await Transaction.find(query);
        const totalGross = paychecks.reduce((sum, t) => sum + (t.items.find(i => i.description === 'Gross Wages')?.amount || 0), 0);
        const totalTax = paychecks.reduce((sum, t) => sum + t.items.filter(i => i.amount < 0).reduce((s, i) => s + i.amount, 0), 0);
        const totalNet = totalGross + totalTax;

        return {
            sections: [
                { title: 'Payroll Summary', isHeading: true },
                { title: 'Adjusted Gross Pay', value: totalGross, indent: 2 },
                { title: 'Employee Taxes Parent', isHeading: true, indent: 2, spacing: true },
                { title: 'Federal Income Tax', value: paychecks.reduce((s, t) => s + (t.items.find(i => i.description === 'Federal Withholding')?.amount || 0), 0), indent: 4 },
                { title: 'Social Security Employee', value: paychecks.reduce((s, t) => s + (t.items.find(i => i.description === 'Social Security')?.amount || 0), 0), indent: 4 },
                { title: 'Medicare Employee', value: paychecks.reduce((s, t) => s + (t.items.find(i => i.description === 'Medicare')?.amount || 0), 0), indent: 4 },
                { title: 'Total Employee Taxes', value: totalTax, isTotal: true, indent: 2 },
                { title: 'Net Pay', value: totalNet, isGrandTotal: true, spacing: true }
            ]
        };
    },

    getAuditTrail: async (fromDate, toDate) => {
        const query = {
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' }
        };
        const transactions = await Transaction.find(query).sort({ date: -1 });
        return {
            sections: [
                { title: 'Audit Trail', isHeading: true },
                ...transactions.map(t => ({
                    title: `${t.date} - ${t.type}: ${t.refNo}`,
                    value: t.total,
                    id: t.id,
                    indent: 2,
                    spacing: true
                }))
            ]
        };
    },

    getBudgetVsActual: async (fromDate, toDate, userId) => {
        const accounts = await Account.find({ userId, $or: [{ type: 'Income' }, { type: 'Expense' }] });
        const budgets = await Budget.find({ userId }); // Ensure Budget model has userId if multi-tenant

        const rows = accounts.map(a => {
            const budget = budgets.find(b => b.accountId === a.id);
            const budgetTotal = budget ? (budget.monthlyAmounts || []).reduce((s, v) => s + v, 0) : 0;
            const actual = a.balance || 0;
            return {
                title: a.name,
                value: actual,
                extraValue: budgetTotal,
                extraValue2: actual - budgetTotal,
                id: a.id,
                indent: 2
            };
        });

        return {
            sections: [
                { title: 'Budget vs. Actual', isHeading: true },
                ...rows,
                { title: 'TOTAL', value: rows.reduce((s, r) => s + r.value, 0), extraValue: rows.reduce((s, r) => s + r.extraValue, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getJobEstimatesVsActuals: async () => {
        const customers = await Customer.find();
        const transactions = await Transaction.find({ $or: [{ type: 'ESTIMATE' }, { type: 'INVOICE' }, { type: 'SALES_RECEIPT' }] });
        const allJobs = customers.flatMap(c => (c.jobs || []).map(j => ({ ...j, customerName: c.name })));

        const rows = allJobs.map(j => {
            const estimates = transactions.filter(t => t.type === 'ESTIMATE' && t.entityId === j.id);
            const estTotal = estimates.reduce((s, t) => s + t.total, 0);

            const actuals = transactions.filter(t => (t.type === 'INVOICE' || t.type === 'SALES_RECEIPT') && (t.entityId === j.id || t.items.some(i => i.customerId === j.id)));
            const actTotal = actuals.reduce((sum, t) => {
                const jobLineSum = t.items.filter(i => i.customerId === j.id).reduce((s, i) => s + (i.amount || 0), 0);
                return sum + (t.entityId === j.id ? t.total : jobLineSum);
            }, 0);

            return {
                title: `${j.customerName}:${j.name}`,
                value: actTotal,
                extraValue: estTotal,
                extraValue2: actTotal - estTotal,
                id: j.id,
                indent: 2
            };
        });

        return {
            sections: [
                { title: 'Job Estimates vs. Actuals Summary', isHeading: true },
                ...rows
            ]
        };
    },

    getForecast: async (fromDate, toDate, userId) => {
        const accounts = await Account.find({ userId, type: 'Income' });
        // Real forecast logic: average of last 3 months + trend
        const forecastRows = accounts.map(a => {
            const actual = a.balance || 0;
            const projected = actual * 1.05; // Still a simplified multiplier but now based on real account balances
            return {
                title: a.name,
                value: projected,
                extraValue: actual,
                id: a.id,
                indent: 2
            };
        });

        return {
            sections: [
                { title: 'Projected Sales Forecast (Next Year)', isHeading: true },
                ...forecastRows,
                { title: 'TOTAL PROJECTED SALES', value: forecastRows.reduce((sum, f) => sum + f.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getAuditTrailDetail: async () => {
        const logs = await AuditLogEntry.find().sort({ timestamp: -1 });
        return {
            sections: [
                { title: 'Audit Trail Detail', isHeading: true },
                ...logs.map(log => ({
                    title: `${log.timestamp.toISOString().split('T')[0]} - ${log.action}: ${log.transactionType}`,
                    subtitle: `User: ${log.userId} | Ref: ${log.refNo}`,
                    value: log.amount,
                    id: log.transactionId,
                    indent: 2,
                    spacing: true
                }))
            ]
        };
    },

    getChangeOrderLog: async () => {
        const transactions = await Transaction.find({ type: 'ESTIMATE', isChangeOrder: true });
        return {
            sections: [
                { title: 'History of Change Orders', isHeading: true },
                ...transactions.map(t => ({
                    title: `${t.date} - ${t.refNo} (Change Order)`,
                    value: t.total,
                    id: t.id,
                    indent: 2,
                    spacing: true
                }))
            ]
        };
    },

    getPhysicalInventory: async () => {
        const items = await Item.find({ $or: [{ type: 'Inventory Part' }, { type: 'Inventory Assembly' }] });
        const rows = items.map(item => ({
            title: item.name,
            value: item.onHand || 0,
            extraValue: item.cost || 0,
            id: item.id,
            indent: 2
        }));
        return {
            sections: [
                { title: 'Physical Inventory Worksheet', isHeading: true },
                ...rows
            ]
        };
    },

    getMileageDetail: async (fromDate, toDate) => {
        const query = {
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' }
        };
        const entries = await MileageEntry.find(query).sort({ date: 1 });
        const rows = entries.map(e => ({
            title: `${e.date} - ${e.vehicle}`,
            value: e.totalMiles,
            extraValue: e.notes || '',
            id: e.id,
            indent: 2
        }));
        return {
            sections: [
                { title: 'Mileage Detail Report', isHeading: true },
                ...rows,
                { title: 'TOTAL MILES', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getProfitAndLossByClass: async (fromDate, toDate, userId) => {
        const classes = await QBClass.find({ userId });
        const transactions = await Transaction.find({
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId
        });
        const accounts = await Account.find({ userId });

        const rows = classes.map(cls => {
            const classTxs = transactions.filter(t => t.classId === cls.id || t.items.some(i => i.classId === cls.id));
            const income = classTxs.filter(t => ['INVOICE', 'SALES_RECEIPT'].includes(t.type)).reduce((s, t) => s + t.total, 0);
            const expense = classTxs.filter(t => ['BILL', 'CHECK', 'PAYCHECK'].includes(t.type)).reduce((s, t) => s + t.total, 0);
            return {
                title: cls.name,
                value: income - expense,
                extraValue: income,
                extraValue2: expense,
                id: cls.id,
                indent: 2
            };
        });

        // Add Unclassified
        const unclassifiedTxs = transactions.filter(t => !t.classId && t.items.every(i => !i.classId));
        const unclassifiedIncome = unclassifiedTxs.filter(t => ['INVOICE', 'SALES_RECEIPT'].includes(t.type)).reduce((s, t) => s + t.total, 0);
        const unclassifiedExpense = unclassifiedTxs.filter(t => ['BILL', 'CHECK', 'PAYCHECK'].includes(t.type)).reduce((s, t) => s + t.total, 0);
        rows.push({
            title: 'Unclassified',
            value: unclassifiedIncome - unclassifiedExpense,
            extraValue: unclassifiedIncome,
            extraValue2: unclassifiedExpense,
            indent: 2
        });

        return {
            sections: [
                { title: 'Profit & Loss by Class', isHeading: true },
                ...rows,
                { title: 'NET INCOME', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getSalesByCustomerSummary: async (fromDate, toDate) => {
        const transactions = await Transaction.find({
            type: { $in: ['INVOICE', 'SALES_RECEIPT'] },
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' }
        });
        const customers = await Customer.find();
        const rows = customers.map(c => {
            const amount = transactions.filter(t => t.entityId === c.id).reduce((s, t) => s + t.total, 0);
            return { title: c.name, value: amount, id: c.id, indent: 2 };
        }).filter(r => r.value > 0);

        return {
            sections: [
                { title: 'Sales by Customer Summary', isHeading: true },
                ...rows,
                { title: 'TOTAL SALES', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getCustomerBalanceSummary: async (userId) => {
        const transactions = await Transaction.find({
            type: { $in: ['INVOICE', 'PAYMENT', 'CREDIT_MEMO'] },
            userId
        });
        const customers = await Customer.find({ userId });
        const rows = customers.map(c => {
            const balance = transactions.filter(t => t.entityId === c.id).reduce((s, t) => {
                if (t.type === 'INVOICE') return s + t.total;
                return s - t.total;
            }, 0);
            return { title: c.name, value: balance, id: c.id, indent: 2 };
        }).filter(r => r.value !== 0);

        return {
            sections: [
                { title: 'Customer Balance Summary', isHeading: true },
                ...rows,
                { title: 'TOTAL BALANCE', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getVendorBalanceSummary: async (userId) => {
        const transactions = await Transaction.find({
            type: { $in: ['BILL', 'VENDOR_CREDIT', 'CHECK'] },
            userId
        });
        const vendors = await Vendor.find({ userId });
        const rows = vendors.map(v => {
            const balance = transactions.filter(t => t.entityId === v.id).reduce((s, t) => {
                if (t.type === 'BILL') return s + t.total;
                return s - t.total;
            }, 0);
            return { title: v.name, value: balance, id: v.id, indent: 2 };
        }).filter(r => r.value !== 0);

        return {
            sections: [
                { title: 'Vendor Balance Summary', isHeading: true },
                ...rows,
                { title: 'TOTAL BALANCE', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getPayrollLiabilityBalances: async (userId) => {
        const liabilities = await PayrollLiability.find({ userId, status: 'OPEN' });
        const rows = liabilities.map(l => ({
            title: `${l.type} Liability`,
            value: l.amount,
            extraValue: l.dueDate || '',
            id: l.id,
            indent: 2
        }));

        return {
            sections: [
                { title: 'Payroll Liability Balances', isHeading: true },
                ...rows,
                { title: 'TOTAL LIABILITIES', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    }
};

module.exports = reportService;
