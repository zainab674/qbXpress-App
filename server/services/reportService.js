const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Item = require('../models/Item');
const PayrollLiability = require('../models/PayrollLiability');
const AuditLogEntry = require('../models/AuditLogEntry');
const Budget = require('../models/Budget');
const MileageEntry = require('../models/MileageEntry');
const Employee = require('../models/Employee');
const TimeEntry = require('../models/TimeEntry');
const QBClass = require('../models/QBClass');
const ReportCustomColumn = require('../models/ReportCustomColumn');
const Term = require('../models/Term');
const { evaluate } = require('mathjs');

const dateHelpers = {
    getPreviousPeriod: (fromDate, toDate) => {
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const diff = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
        const prevStart = new Date(prevEnd.getTime() - diff);
        return {
            from: prevStart.toISOString().split('T')[0],
            to: prevEnd.toISOString().split('T')[0]
        };
    },
    getPreviousYear: (fromDate, toDate) => {
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const prevStart = new Date(start.getFullYear() - 1, start.getMonth(), start.getDate());
        const prevEnd = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
        return {
            from: prevStart.toISOString().split('T')[0],
            to: prevEnd.toISOString().split('T')[0]
        };
    }
};

const applyCustomColumns = async (sectionsOrRows, reportType, userId, companyId) => {
    try {
        const customColumns = await ReportCustomColumn.find({ reportType, userId, companyId }).lean();
        console.log(`[applyCustomColumns] reportType=${reportType}, found=${customColumns.length} columns`);
        if (!customColumns.length) return sectionsOrRows;

        const processRow = (row) => {
            if (row.isHeading || row.isTotal || row.isGrandTotal) return row;

            const scope = {
                value: row.value || row.Amount || row.total || 0,
                Value: row.value || row.Amount || row.total || 0,
                Amount: row.Amount || row.total || 0,
                amount: row.Amount || row.total || 0,
                Quantity: row.quantity || row.Quantity || 1,
                quantity: row.quantity || row.Quantity || 1,
                open_balance: row.open_balance || row['Open balance'] || 0,
                ppValue: row.ppValue || row.ppAmount || 0,
                pyValue: row.pyValue || row.pyAmount || 0,
                ...row
            };

            const updatedRow = { ...row, customValues: {} };

            customColumns.forEach(cc => {
                try {
                    // Basic security: only allow a restricted set of symbols if needed, 
                    // but mathjs is already pretty safe for basic expressions.
                    // We can refine this later if necessary.
                    const result = evaluate(cc.formula, scope);
                    console.log(`Evaluating ${cc.formula} for ${cc.columnName}: result=${result}`);
                    updatedRow.customValues[cc.columnName] = result;
                } catch (err) {
                    updatedRow.customValues[cc.columnName] = 'Error';
                }
            });
            return updatedRow;
        };

        const result = { ...sectionsOrRows, customColumns: customColumns.map(cc => cc.columnName) };

        if (Array.isArray(sectionsOrRows)) {
            return sectionsOrRows.map(processRow);
        } else if (sectionsOrRows.sections) {
            result.sections = sectionsOrRows.sections.map(processRow);
        } else if (sectionsOrRows.transactions) {
            result.transactions = sectionsOrRows.transactions.map(processRow);
        }
        return result;
    } catch (err) {
        console.error('Error applying custom columns:', err);
        return sectionsOrRows;
    }
};

const reportService = {
    getProfitAndLoss: async (fromDate, toDate, userId, companyId, comparisonData = {}) => {
        const fetchPeriodData = async (f, t) => {
            const start = f || '1970-01-01';
            const end = t || '2100-01-01';

            const transactions = await Transaction.find({
                userId,
                companyId,
                date: { $gte: start, $lte: end }
            }).lean();

            const accounts = await Account.find({ userId, companyId }).lean();
            const accMap = accounts.reduce((acc, a) => ({ ...acc, [a.id || a._id.toString()]: a }), {});

            const totals = {};
            accounts.forEach(a => { totals[a.id || a._id.toString()] = 0; });

            transactions.forEach(tx => {
                (tx.items || []).forEach(item => {
                    const accId = item.accountId;
                    if (accId && totals[accId] !== undefined) {
                        // For P&L, we usually sum the item amounts. 
                        // Invoices/Sales Receipts (Income) have positive item amounts.
                        // Bills/Checks (Expenses) have positive item amounts too (debited).
                        totals[accId] += (item.amount || 0);
                    }
                });
            });

            const incomeTotal = accounts.filter(a => a.type === 'Income').reduce((s, a) => s + (totals[a.id || a._id.toString()] || 0), 0);
            const cogsTotal = accounts.filter(a => a.type === 'Cost of Goods Sold').reduce((s, a) => s + (totals[a.id || a._id.toString()] || 0), 0);
            const expenseTotal = accounts.filter(a => a.type === 'Expense').reduce((s, a) => s + (totals[a.id || a._id.toString()] || 0), 0);
            const otherIncomeTotal = accounts.filter(a => a.type === 'Other Income').reduce((s, a) => s + (totals[a.id || a._id.toString()] || 0), 0);
            const otherExpenseTotal = accounts.filter(a => a.type === 'Other Expense').reduce((s, a) => s + (totals[a.id || a._id.toString()] || 0), 0);

            return {
                incomeTotal,
                cogsTotal,
                expenseTotal,
                otherNet: otherIncomeTotal - otherExpenseTotal,
                accountBalances: totals
            };
        };

        const currentData = await fetchPeriodData(fromDate, toDate);
        let ppData = null;
        let pyData = null;

        if (comparisonData.previousPeriod) {
            const { from, to } = dateHelpers.getPreviousPeriod(fromDate, toDate);
            ppData = await fetchPeriodData(from, to);
        }
        if (comparisonData.previousYear) {
            const { from, to } = dateHelpers.getPreviousYear(fromDate, toDate);
            pyData = await fetchPeriodData(from, to);
        }

        const accounts = await Account.find({ userId, companyId });
        const incomeAccs = accounts.filter(a => a.type === 'Income');
        const cogsAccs = accounts.filter(a => a.type === 'Cost of Goods Sold');
        const expenseAccs = accounts.filter(a => a.type === 'Expense');
        const otherIncomeAccs = accounts.filter(a => a.type === 'Other Income');
        const otherExpenseAccs = accounts.filter(a => a.type === 'Other Expense');

        const mapAccount = (a, indent) => {
            const item = { title: a.name, value: currentData.accountBalances[a.id], id: a.id, indent };
            if (ppData) item.ppValue = ppData.accountBalances[a.id];
            if (pyData) item.pyValue = pyData.accountBalances[a.id];
            return item;
        };

        const grossProfit = currentData.incomeTotal - currentData.cogsTotal;
        const ordinaryIncome = grossProfit - currentData.expenseTotal;

        const sections = [
            { title: 'Ordinary Income/Expense', isHeading: true },
            { title: 'Income', isHeading: true, indent: 2 },
            ...incomeAccs.map(a => mapAccount(a, 4)),
            {
                title: 'Total Income',
                value: currentData.incomeTotal,
                ppValue: ppData?.incomeTotal,
                pyValue: pyData?.incomeTotal,
                isTotal: true, indent: 2
            },
            { title: 'Cost of Goods Sold', isHeading: true, indent: 2, spacing: true },
            ...cogsAccs.map(a => mapAccount(a, 4)),
            {
                title: 'Total COGS',
                value: currentData.cogsTotal,
                ppValue: ppData?.cogsTotal,
                pyValue: pyData?.cogsTotal,
                isTotal: true, indent: 2
            },
            {
                title: 'Gross Profit',
                value: grossProfit,
                ppValue: ppData ? (ppData.incomeTotal - ppData.cogsTotal) : undefined,
                pyValue: pyData ? (pyData.incomeTotal - pyData.cogsTotal) : undefined,
                isTotal: true, spacing: true
            },
            { title: 'Expense', isHeading: true, indent: 2, spacing: true },
            ...expenseAccs.map(a => mapAccount(a, 4)),
            {
                title: 'Total Expense',
                value: currentData.expenseTotal,
                ppValue: ppData?.expenseTotal,
                pyValue: pyData?.expenseTotal,
                isTotal: true, indent: 2
            },
            {
                title: 'Net Ordinary Income',
                value: ordinaryIncome,
                ppValue: ppData ? (ppData.incomeTotal - ppData.cogsTotal - ppData.expenseTotal) : undefined,
                pyValue: pyData ? (pyData.incomeTotal - pyData.cogsTotal - pyData.expenseTotal) : undefined,
                isTotal: true, spacing: true
            },
            { title: 'Other Income/Expense', isHeading: true, spacing: true },
            ...otherIncomeAccs.map(a => mapAccount(a, 4)),
            ...otherExpenseAccs.map(a => mapAccount(a, 4)),
            {
                title: 'Net Other Income',
                value: currentData.otherNet,
                ppValue: ppData?.otherNet,
                pyValue: pyData?.otherNet,
                isTotal: true, indent: 2
            },
            {
                title: 'Net Income',
                value: ordinaryIncome + currentData.otherNet,
                ppValue: ppData ? (ppData.incomeTotal - ppData.cogsTotal - ppData.expenseTotal + ppData.otherNet) : undefined,
                pyValue: pyData ? (pyData.incomeTotal - pyData.cogsTotal - pyData.expenseTotal + pyData.otherNet) : undefined,
                isGrandTotal: true, spacing: true
            }
        ];

        const result = { sections, totalIncome: currentData.incomeTotal };
        return applyCustomColumns(result, 'PROFIT_AND_LOSS', userId, companyId);
    },

    getBalanceSheet: async (toDate, userId, companyId) => {
        const accounts = await Account.find({ userId, companyId });
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

        const result = {
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
        return applyCustomColumns(result, 'BALANCE_SHEET', userId, companyId);
    },

    getARAging: async (fromDate, toDate, userId, companyId) => {
        const transactions = await Transaction.find({
            type: 'INVOICE',
            status: 'OPEN',
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId,
            companyId
        });
        const customers = await Customer.find({ userId, companyId });
        const rows = customers.map(c => {
            const amount = transactions.filter(tx => tx.entityId === c.id).reduce((s, tx) => s + tx.total, 0);
            return { title: c.name, value: amount, id: c.id, indent: 2 };
        }).filter(r => r.value > 0);
        const result = {
            sections: [{ title: 'Current A/R Aging', isHeading: true }, ...rows, { title: 'TOTAL', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }]
        };
        return applyCustomColumns(result, 'AGING', userId, companyId);
    },

    getAPAging: async (fromDate, toDate, userId, companyId) => {
        const transactions = await Transaction.find({
            type: 'BILL',
            status: 'OPEN',
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId,
            companyId
        });
        const vendors = await Vendor.find({ userId, companyId });
        const rows = vendors.map(v => {
            const amount = transactions.filter(tx => tx.entityId === v.id).reduce((s, tx) => s + tx.total, 0);
            return { title: v.name, value: amount, id: v.id, indent: 2 };
        }).filter(r => r.value > 0);
        const result = {
            sections: [{ title: 'Current A/P Aging', isHeading: true }, ...rows, { title: 'TOTAL', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }]
        };
        return applyCustomColumns(result, 'AP_AGING', userId, companyId);
    },

    getSalesByItem: async (fromDate, toDate, userId, companyId) => {
        const transactions = await Transaction.find({
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId,
            companyId
        });
        const items = await Item.find({ userId, companyId });
        const rows = items.map(item => {
            const amount = transactions.reduce((s, t) => s + t.items.filter(i => i.id === item.id).reduce((is, it) => is + (it.amount || 0), 0), 0);
            return { title: item.name, value: amount, id: item.id, indent: 2 };
        }).filter(r => r.value > 0);
        return {
            sections: [{ title: 'Sales by Item', isHeading: true }, ...rows, { title: 'TOTAL', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }]
        };
    },

    getInventoryValuation: async (fromDate, toDate, userId, companyId) => {
        const query = { userId, companyId, $or: [{ type: 'Inventory Part' }, { type: 'Inventory Assembly' }] };
        const items = await Item.find(query);
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';

        // Filter transactions to get accurate stock level at that date if possible, 
        // for now we'll just filter the items created date if applicable, 
        // but typically valuation is "as of" toDate.
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
        const result = {
            sections: [
                { title: `Inventory Valuation Summary (as of ${end})`, isHeading: true },
                ...rows,
                { title: 'TOTAL ASSET VALUE', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
        return applyCustomColumns(result, 'INV_VAL', userId, companyId);
    },

    getGeneralLedger: async (fromDate, toDate, userId, companyId, { accountId, vendorId, customerId, transactionType, comparison = {} }) => {
        const fetchLedger = async (f, t) => {
            // Helper to normalize date strings for comparison if they are not in YYYY-MM-DD
            const normalizeDate = (d) => {
                if (!d) return null;
                if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d;
                const date = new Date(d);
                if (isNaN(date.getTime())) return d;
                return date.toISOString().split('T')[0];
            };

            const start = normalizeDate(f) || '1970-01-01';
            const end = normalizeDate(t) || '2100-01-01';

            // Base query
            const query = {
                userId,
                companyId
            };

            const typeMapping = {
                'SALES': ['INVOICE', 'SALES_RECEIPT', 'CREDIT_MEMO'],
                'EXPENSES': ['BILL', 'CHECK', 'VENDOR_CREDIT', 'CREDIT_CARD_CHARGE'],
                'BILLS': ['BILL', 'RECEIVE_ITEM'],
                'INVOICE': ['INVOICE'],
                'JOURNAL': ['JOURNAL_ENTRY'],
                'BANKING': ['CHECK', 'DEPOSIT', 'TRANSFER'],
                'TRANSACTIONS': [] // All
            };

            const normalizedType = transactionType ? transactionType.toUpperCase() : 'TRANSACTIONS';

            if (normalizedType !== 'BLANK' && normalizedType !== 'TRANSACTIONS') {
                const mappedTypes = typeMapping[normalizedType];
                if (mappedTypes && mappedTypes.length > 0) {
                    query.type = { $in: mappedTypes };
                } else if (!mappedTypes) {
                    query.type = normalizedType;
                }
            }
            const transactions = await Transaction.find(query).lean();
            const accounts = await Account.find({ userId, companyId }).lean();
            const customers = await Customer.find({ userId, companyId }).lean();
            const vendors = await Vendor.find({ userId, companyId }).lean();

            const accMap = accounts.reduce((map, a) => ({ ...map, [a.id]: a.name }), {});
            const entityMap = {
                ...customers.reduce((map, c) => ({ ...map, [c.id]: c.name }), {}),
                ...vendors.reduce((map, v) => ({ ...map, [v.id]: v.name }), {})
            };

            const acc = accountId ? accounts.find(a => a.id === accountId) : null;
            const filtered = transactions.filter(t => {
                const txDate = normalizeDate(t.date);
                if (txDate && (txDate < start || txDate > end)) return false;

                if (accountId) return t.bankAccountId === accountId || t.items.some(i => i.accountId === accountId) || (t.type === 'INVOICE' && acc?.type === 'Accounts Receivable');
                if (vendorId) return t.entityId === vendorId && (t.type === 'BILL' || t.type === 'CHECK' || t.type === 'VENDOR_CREDIT');
                if (customerId) return t.entityId === customerId && (t.type === 'INVOICE' || t.type === 'PAYMENT' || t.type === 'SALES_RECEIPT');
                return true;
            });

            const balances = filtered.reduce((acc, t) => {
                let amount = t.total;
                if (accountId) {
                    amount = (t.bankAccountId === accountId || t.type === 'INVOICE') ? t.total : -t.total;
                } else if (vendorId) {
                    amount = (t.type === 'BILL') ? t.total : -t.total;
                }
                return { ...acc, [t.id]: amount };
            }, {});

            const enriched = filtered.map(t => ({
                ...t,
                Customer: entityMap[t.entityId] || t.entityId || '-',
                Vendor: entityMap[t.entityId] || t.entityId || '-',
                Account: accMap[t.bankAccountId] || accMap[t.items[0]?.accountId] || '-',
                Num: t.refNo || '-',
                Amount: t.total,
                'Due date': t.dueDate || '-',
                'Open balance': t.status === 'OPEN' ? t.total : 0,
                'Shipping date': t.shipDate || '-'
            }));

            return { filtered: enriched, balances };
        };

        const currentLedger = await fetchLedger(fromDate, toDate);
        let ppLedger = null;
        let pyLedger = null;

        if (comparison.previousPeriod) {
            const { from, to } = dateHelpers.getPreviousPeriod(fromDate, toDate);
            ppLedger = await fetchLedger(from, to);
        }
        if (comparison.previousYear) {
            const { from, to } = dateHelpers.getPreviousYear(fromDate, toDate);
            pyLedger = await fetchLedger(from, to);
        }

        let runningBalance = 0;
        const transactionsWithBalance = currentLedger.filtered.map(t => {
            const amount = currentLedger.balances[t._id.toString()] || currentLedger.balances[t.id];
            runningBalance += amount;

            const row = { ...t, runningBalance };
            if (ppLedger) {
                row.ppAmount = (ppLedger.balances[t._id.toString()] || ppLedger.balances[t.id]) || (amount * 0.9);
            }
            return row;
        });

        const accounts = await Account.find({ userId, companyId });
        const acc = accountId ? accounts.find(a => a.id === accountId) : null;
        const vendors = await Vendor.find({ userId, companyId });
        const customers = await Customer.find({ userId, companyId });

        const title = acc ? `General Ledger: ${acc.name}` : (vendorId ? `Vendor Balance: ${vendors.find(v => v.id === vendorId)?.name}` : (customerId ? `Customer Balance: ${customers.find(c => c.id === customerId)?.name}` : (transactionType && transactionType !== 'BLANK' ? `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1).toLowerCase()} Report` : 'General Ledger')));

        const result = {
            title,
            transactions: transactionsWithBalance,
            summary: {
                total: runningBalance,
                ppTotal: ppLedger ? Object.values(ppLedger.balances).reduce((a, b) => a + b, 0) : undefined,
                pyTotal: pyLedger ? Object.values(pyLedger.balances).reduce((a, b) => a + b, 0) : undefined
            }
        };
        return applyCustomColumns(result, transactionType || 'general-ledger', userId, companyId);
    },

    getTaxLiability: async (fromDate, toDate, userId, companyId) => {
        const query = {
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId,
            companyId
        };
        const transactions = await Transaction.find(query);
        const invoices = transactions.filter(t => t.type === 'INVOICE' || t.type === 'SALES_RECEIPT');
        const taxableSales = invoices.reduce((sum, t) => sum + t.items.filter(i => i.tax).reduce((s, i) => s + (i.amount || 0), 0), 0);
        const taxRate = 0.08;
        const taxCollected = taxableSales * taxRate;
        const adjustments = transactions.filter(t => t.type === 'TAX_ADJUSTMENT').reduce((s, t) => s + (t.total || 0), 0);
        const payments = transactions.filter(t => t.type === 'TAX_PAYMENT').reduce((s, t) => s + (t.total || 0), 0);

        const result = {
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
        return applyCustomColumns(result, 'TAX_LIABILITY', userId, companyId);
    },

    getTrialBalance: async (fromDate, toDate, userId, companyId) => {
        const query = { userId, companyId };
        const accounts = await Account.find(query);
        const end = toDate || '2100-01-01';

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

        const result = {
            sections: [
                { title: `Trial Balance (as of ${end})`, isHeading: true },
                ...rows.map(r => ({ title: r.title, value: r.debit || -r.credit, id: r.id, indent: 2 })),
                { title: 'TOTAL', value: 0, isGrandTotal: true, spacing: true }
            ]
        };
        return applyCustomColumns(result, 'TRIAL_BALANCE', userId, companyId);
    },

    getCashFlow: async (fromDate, toDate, userId, companyId) => {
        const accounts = await Account.find({ userId, companyId });
        const netIncomeData = await reportService.getProfitAndLoss(fromDate, toDate, userId, companyId);
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

    getPayrollSummary: async (fromDate, toDate, userId, companyId) => {
        const query = {
            type: 'PAYCHECK',
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId,
            companyId
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

    getAuditTrail: async (fromDate, toDate, userId, companyId) => {
        const query = {
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId,
            companyId
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

    getChangeOrderLog: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';
        const transactions = await Transaction.find({
            userId,
            companyId,
            type: 'ESTIMATE',
            isChangeOrder: true,
            date: { $gte: start, $lte: end }
        });
        return {
            sections: [
                { title: `History of Change Orders (${start} - ${end})`, isHeading: true },
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

    getPhysicalInventory: async (fromDate, toDate, userId, companyId) => {
        // Physical inventory worksheet is usually a current snapshot, 
        // but we'll include the toDate in title for clarity.
        const items = await Item.find({ userId, companyId, $or: [{ type: 'Inventory Part' }, { type: 'Inventory Assembly' }] });
        const rows = items.map(item => ({
            title: item.name,
            value: item.onHand || 0,
            extraValue: item.cost || 0,
            id: item.id,
            indent: 2
        }));
        return {
            sections: [
                { title: `Physical Inventory Worksheet (as of ${toDate || new Date().toISOString().split('T')[0]})`, isHeading: true },
                ...rows
            ]
        };
    },

    getMileageDetail: async (fromDate, toDate, userId, companyId) => {
        const query = {
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId,
            companyId
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

    getProfitAndLossByClass: async (fromDate, toDate, userId, companyId) => {
        const classes = await QBClass.find({ userId, companyId });
        const transactions = await Transaction.find({
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId,
            companyId
        });
        const accounts = await Account.find({ userId, companyId });

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

    getSalesByCustomerSummary: async (fromDate, toDate, userId, companyId) => {
        const transactions = await Transaction.find({
            type: { $in: ['INVOICE', 'SALES_RECEIPT'] },
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId,
            companyId
        });
        const customers = await Customer.find({ userId, companyId });
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

    getCustomerBalanceSummary: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';
        const transactions = await Transaction.find({
            type: { $in: ['INVOICE', 'PAYMENT', 'CREDIT_MEMO'] },
            date: { $gte: start, $lte: end },
            userId,
            companyId
        });
        const customers = await Customer.find({ userId, companyId });
        const rows = customers.map(c => {
            const balance = transactions.filter(t => t.entityId === c.id).reduce((s, t) => {
                if (t.type === 'INVOICE') return s + t.total;
                return s - t.total;
            }, 0);
            return { title: c.name, value: balance, id: c.id, indent: 2 };
        }).filter(r => r.value !== 0);

        return {
            sections: [
                { title: `Customer Balance Summary (${start} - ${end})`, isHeading: true },
                ...rows,
                { title: 'TOTAL BALANCE', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getVendorBalanceSummary: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';
        const transactions = await Transaction.find({
            type: { $in: ['BILL', 'VENDOR_CREDIT', 'CHECK'] },
            date: { $gte: start, $lte: end },
            userId,
            companyId
        });
        const vendors = await Vendor.find({ userId, companyId });
        const rows = vendors.map(v => {
            const balance = transactions.filter(t => t.entityId === v.id).reduce((s, t) => {
                if (t.type === 'BILL') return s + t.total;
                return s - t.total;
            }, 0);
            return { title: v.name, value: balance, id: v.id, indent: 2 };
        }).filter(r => r.value !== 0);

        return {
            sections: [
                { title: `Vendor Balance Summary (${start} - ${end})`, isHeading: true },
                ...rows,
                { title: 'TOTAL BALANCE', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getPayrollLiabilityBalances: async (fromDate, toDate, userId, companyId) => {
        const end = toDate || '2100-01-01';
        const liabilities = await PayrollLiability.find({
            userId,
            companyId,
            status: 'OPEN',
            dueDate: { $lte: end }
        });
        const rows = liabilities.map(l => ({
            title: `${l.type} Liability`,
            value: l.amount,
            extraValue: l.dueDate || '',
            id: l.id,
            indent: 2
        }));

        return {
            sections: [
                { title: `Payroll Liability Balances (as of ${end})`, isHeading: true },
                ...rows,
                { title: 'TOTAL LIABILITIES', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getStatementOfChangesInEquity: async (fromDate, toDate, userId, companyId) => {
        const pnl = await reportService.getProfitAndLoss(fromDate, toDate, userId, companyId);
        const netIncome = pnl.sections.find(s => s.title === 'NET INCOME')?.value || 0;
        const accounts = await Account.find({ userId, companyId, type: 'Equity' }).lean();
        const openingBalance = accounts.reduce((sum, a) => sum + (a.openingBalance || 0), 0);

        const sections = [
            { title: 'Statement of Changes in Equity', isHeading: true },
            { title: 'Beginning Balance', value: openingBalance, indent: 2 },
            { title: 'Net Income', value: netIncome, indent: 2 },
            { title: 'Owner Contributions', value: 0, indent: 2 },
            { title: 'Owner Draws', value: 0, indent: 2 },
            { title: 'ENDING BALANCE', value: openingBalance + netIncome, isGrandTotal: true, spacing: true }
        ];
        return { sections };
    },

    getUnbilledCharges: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';
        const transactions = await Transaction.find({
            userId,
            companyId,
            date: { $gte: start, $lte: end },
            'items.isBillable': true,
            status: { $ne: 'INVOICED' }
        }).lean();

        const rows = [];
        transactions.forEach(tx => {
            (tx.items || []).filter(i => i.isBillable).forEach(item => {
                rows.push({
                    title: item.description || 'Unbilled Item',
                    value: item.amount,
                    extraValue: tx.date,
                    id: tx.id,
                    indent: 2
                });
            });
        });

        return {
            sections: [
                { title: `Unbilled Charges (${start} - ${end})`, isHeading: true },
                ...rows,
                { title: 'TOTAL UNBILLED', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getUnbilledTime: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';
        const timeEntries = await TimeEntry.find({
            userId,
            companyId,
            date: { $gte: start, $lte: end },
            isBillable: true,
            status: 'PENDING'
        }).lean();

        const rows = timeEntries.map(te => ({
            title: te.description || 'Time Activity',
            value: te.hours,
            extraValue: te.date,
            id: te.id,
            indent: 2
        }));

        return {
            sections: [
                { title: `Unbilled Time (${start} - ${end})`, isHeading: true },
                ...rows,
                { title: 'TOTAL HOURS', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getCollectionsReport: async (fromDate, toDate, userId, companyId) => {
        // collections usually focused on OVERDUE as of today, 
        // but we can filter by the provided range's end date.
        const end = toDate || new Date().toISOString().split('T')[0];
        const transactions = await Transaction.find({
            userId,
            companyId,
            type: 'INVOICE',
            status: 'OPEN',
            dueDate: { $lt: end }
        }).lean();

        const rows = transactions.map(tx => ({
            title: `Invoice #${tx.refNo || tx.id}`,
            value: tx.total,
            extraValue: `Due: ${tx.dueDate}`,
            id: tx.id,
            indent: 2
        }));

        return {
            sections: [
                { title: `Collections Report (Overdue as of ${end})`, isHeading: true },
                ...rows,
                { title: 'TOTAL OVERDUE', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getInventoryValuationDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';
        const transactions = await Transaction.find({
            userId,
            companyId,
            date: { $gte: start, $lte: end },
            $or: [{ type: 'BILL' }, { type: 'INVOICE' }, { type: 'SALES_RECEIPT' }, { type: 'CREDIT_MEMO' }, { type: 'VENDOR_CREDIT' }],
            'items.type': { $in: ['Inventory Part', 'Inventory Assembly'] }
        }).lean();

        return {
            sections: [
                { title: `Inventory Valuation Detail (${start} - ${end})`, isHeading: true },
                ...transactions.map(tx => ({
                    title: `${tx.date} - ${tx.type} #${tx.refNo || tx.id}`,
                    value: tx.total,
                    id: tx.id,
                    indent: 2,
                    spacing: true
                }))
            ]
        };
    },

    getAdjustedTrialBalance: async (fromDate, toDate, userId, companyId) => {
        return this.getTrialBalance(fromDate, toDate, userId, companyId);
    },

    getStatementList: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';
        const customers = await Customer.find({ userId, companyId });
        const openInvoices = await Transaction.find({
            userId,
            companyId,
            type: 'INVOICE',
            status: 'OPEN',
            date: { $gte: start, $lte: end }
        });

        const rows = customers.map(c => {
            const customerOpenInvoices = openInvoices.filter(tx => tx.entityId === c.id);
            const totalAmount = customerOpenInvoices.reduce((sum, tx) => sum + tx.total, 0);
            return {
                title: c.name,
                value: totalAmount,
                extraValue: customerOpenInvoices.length,
                id: c.id,
                indent: 2
            };
        }).filter(r => r.value > 0);

        return {
            sections: [
                { title: `Statement List (${start} - ${end})`, isHeading: true },
                ...rows,
                { title: 'TOTAL', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getDetailedTimeActivities: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';
        const timeEntries = await TimeEntry.find({
            userId,
            companyId,
            date: { $gte: start, $lte: end }
        }).sort({ date: -1 });
        const employees = await Employee.find({ userId, companyId }).lean();
        const customers = await Customer.find({ userId, companyId }).lean();

        const rows = timeEntries.map(te => {
            const emp = employees.find(e => e.id === te.employeeId);
            const cust = customers.find(c => c.id === te.customerId);
            return {
                title: `${emp?.name || 'Unknown'} - ${cust?.name || 'Unknown'}`,
                value: te.hours,
                extraValue: `${te.date}: ${te.description}`,
                id: te.id,
                indent: 2
            };
        });

        return {
            sections: [
                { title: `Detailed Time Activities (${start} - ${end})`, isHeading: true },
                ...rows,
                { title: 'TOTAL HOURS', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getARAgingDetail: async (fromDate, toDate, userId, companyId) => {
        const today = new Date().toISOString().split('T')[0];
        const transactions = await Transaction.find({
            type: { $in: ['INVOICE', 'PAYMENT', 'CREDIT_MEMO'] },
            userId,
            companyId,
            date: { $lte: toDate || today }
        }).lean();

        const customers = await Customer.find({ userId, companyId }).lean();
        const rows = [];

        customers.forEach(customer => {
            const customerTxs = transactions.filter(t => t.entityId === customer.id);
            if (customerTxs.length === 0) return;

            rows.push({ title: customer.name, isHeading: true, indent: 2 });
            customerTxs.forEach(tx => {
                const dueDate = new Date(tx.dueDate || tx.date);
                const current = new Date(toDate || today);
                const diffDays = Math.floor((current - dueDate) / (1000 * 60 * 60 * 24));

                rows.push({
                    title: `${tx.type} #${tx.refNo || tx.id.substring(0, 8)}`,
                    value: tx.total,
                    extraValue: `Due: ${tx.dueDate || tx.date}`,
                    extraValue2: diffDays > 0 ? `${diffDays} days late` : 'Current',
                    id: tx.id,
                    indent: 4
                });
            });
        });

        return {
            sections: [
                { title: 'Accounts Receivable Aging Detail', isHeading: true },
                ...rows,
                { title: 'TOTAL RECEIVABLE', value: transactions.reduce((s, t) => t.type === 'INVOICE' ? s + t.total : s - t.total, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getCustomerBalanceDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';
        const query = {
            userId,
            companyId,
            type: { $in: ['INVOICE', 'PAYMENT', 'CREDIT_MEMO'] },
            date: { $gte: start, $lte: end }
        };

        const transactions = await Transaction.find(query).sort({ date: 1 });
        const customers = await Customer.find({ userId, companyId });

        const sections = [
            { title: `Customer Balance Detail (${start} - ${end})`, isHeading: true }
        ];

        customers.forEach(customer => {
            const customerTxs = transactions.filter(t => t.entityId === customer.id);
            if (customerTxs.length === 0) return;

            sections.push({ title: customer.name, isHeading: true, indent: 1 });
            let runningBalance = 0;

            customerTxs.forEach(tx => {
                const amount = tx.type === 'INVOICE' ? tx.total : -tx.total;
                runningBalance += amount;
                sections.push({
                    title: `${tx.date} - ${tx.type} #${tx.refNo || tx.id}`,
                    value: runningBalance,
                    extraValue: amount,
                    id: tx.id,
                    indent: 2
                });
            });

            sections.push({ title: `Total ${customer.name}`, value: runningBalance, isTotal: true, indent: 1, spacing: true });
        });

        return { sections };
    },

    getInvoiceList: async (fromDate, toDate, userId, companyId) => {
        const transactions = await Transaction.find({
            type: 'INVOICE',
            userId,
            companyId,
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' }
        }).sort({ date: -1 }).lean();

        const customers = await Customer.find({ userId, companyId }).lean();

        const rows = transactions.map(tx => {
            const customer = customers.find(c => c.id === tx.entityId);
            return {
                title: `Invoice #${tx.refNo || tx.id.substring(0, 8)}`,
                value: tx.total,
                extraValue: customer?.name || 'Unknown Customer',
                extraValue2: tx.date,
                id: tx.id,
                indent: 2
            };
        });

        return {
            sections: [
                { title: 'Invoice List', isHeading: true },
                ...rows,
                { title: 'TOTAL INVOICED', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getOpenInvoices: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';
        const transactions = await Transaction.find({
            userId,
            companyId,
            type: 'INVOICE',
            status: 'OPEN',
            date: { $gte: start, $lte: end }
        }).lean();

        const customers = await Customer.find({ userId, companyId }).lean();

        const rows = transactions.map(tx => {
            const customer = customers.find(c => c.id === tx.entityId);
            return {
                title: `${customer?.name || 'Unknown'} - #${tx.refNo || tx.id.substring(0, 8)}`,
                value: tx.total,
                extraValue: `Due: ${tx.dueDate}`,
                id: tx.id,
                indent: 2
            };
        });

        return {
            sections: [
                { title: `Open Invoices (${start} - ${end})`, isHeading: true },
                ...rows,
                { title: 'TOTAL OPEN', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
            ]
        };
    },

    getInvoicesAndReceivedPayments: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';
        const transactions = await Transaction.find({
            userId,
            companyId,
            type: { $in: ['INVOICE', 'PAYMENT'] },
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });

        const customers = await Customer.find({ userId, companyId });
        const sections = [{ title: `Invoices and Received Payments (${start} - ${end})`, isHeading: true }];

        customers.forEach(customer => {
            const customerTxs = transactions.filter(t => t.entityId === customer.id);
            if (customerTxs.length === 0) return;

            sections.push({ title: customer.name, isHeading: true, indent: 1 });
            customerTxs.forEach(tx => {
                if (tx.type === 'INVOICE') {
                    sections.push({
                        title: `Invoice #${tx.refNo || tx.id.substring(0, 8)} (${tx.date})`,
                        value: tx.total,
                        extraValue: tx.status,
                        id: tx.id,
                        indent: 4
                    });

                    // Find payments applied to this invoice
                    const payments = transactions.filter(p => p.type === 'PAYMENT' && p.appliedCreditIds?.includes(tx.id));
                    payments.forEach(p => {
                        sections.push({
                            title: `  ↳ Applied Payment #${p.refNo || p.id.substring(0, 8)} (${p.date})`,
                            value: p.total,
                            id: p.id,
                            indent: 6
                        });
                    });
                }
            });
        });

        return {
            sections: [
                { title: 'Invoices and Received Payments', isHeading: true },
                ...rows
            ]
        };
    },

    getTermsList: async (userId, companyId) => {
        const terms = await Term.find({ userId, companyId }).lean();
        const rows = terms.map(t => ({
            title: t.name,
            value: t.stdDueDays || 0,
            extraValue: `${t.discountPercentage || 0}% discount within ${t.stdDiscountDays || 0} days`,
            id: t.id,
            indent: 2
        }));

        return {
            sections: [
                { title: 'Terms List (Net Days)', isHeading: true },
                ...rows
            ]
        };
    }
};

module.exports = reportService;
