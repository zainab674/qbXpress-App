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
const SalesTaxCode = require('../models/SalesTaxCode');
const SalesRep = require('../models/SalesRep');
const { evaluate } = require('mathjs');

// Validation helpers
const validateDate = (dateStr) => {
    if (!dateStr) return null;
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
        throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM-DD format.`);
    }
    return dateStr;
};

const normalizeDate = (dateStr) => {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toISOString().split('T')[0];
};

const validateRequiredParams = (...params) => {
    params.forEach(({ name, value }) => {
        if (!value) throw new Error(`Missing required parameter: ${name}`);
    });
};

// Formula evaluation with allowlist
const allowedFunctions = ['add', 'subtract', 'multiply', 'divide', 'abs', 'ceil', 'floor', 'round', 'min', 'max', 'sqrt', 'pow'];
const evaluateFormula = (formula, scope) => {
    // Check for dangerous functions
    const functionPattern = /\b([a-zA-Z_]\w*)\s*\(/g;
    let match;
    while ((match = functionPattern.exec(formula)) !== null) {
        if (!allowedFunctions.includes(match[1]) && !['if', 'atan2', 'hypot'].includes(match[1])) {
            throw new Error(`Function not allowed: ${match[1]}`);
        }
    }
    return evaluate(formula, scope);
};

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
                    const result = evaluateFormula(cc.formula, scope);
                    console.log(`Evaluating ${cc.formula} for ${cc.columnName}: result=${result}`);
                    updatedRow.customValues[cc.columnName] = result;
                } catch (err) {
                    console.error(`Formula evaluation error for ${cc.columnName}: ${err.message}`);
                    updatedRow.customValues[cc.columnName] = null;
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
        const asOf = toDate || new Date().toISOString().split('T')[0];
        const accounts = await Account.find({ userId, companyId }).lean();

        // Compute each account's balance from transactions up to asOf
        const transactions = await Transaction.find({
            userId,
            companyId,
            date: { $lte: asOf }
        }).lean();

        // Build account balance map from transaction items + opening balances
        const txBalances = {};
        accounts.forEach(a => { txBalances[a.id] = a.openingBalance || 0; });

        transactions.forEach(tx => {
            (tx.items || []).forEach(item => {
                if (item.accountId && txBalances[item.accountId] !== undefined) {
                    txBalances[item.accountId] += (item.amount || 0);
                }
            });
            // Bank/deposit account directly
            if (tx.bankAccountId && txBalances[tx.bankAccountId] !== undefined) {
                const isDebit = ['INVOICE', 'SALES_RECEIPT', 'DEPOSIT', 'PAYMENT'].includes(tx.type);
                txBalances[tx.bankAccountId] += isDebit ? tx.total : -tx.total;
            }
        });

        const bal = (a) => txBalances[a.id] || 0;

        const bankAccs = accounts.filter(a => a.type === 'Bank');
        const arAccs = accounts.filter(a => a.type === 'Accounts Receivable');
        const ocaAccs = accounts.filter(a => ['Other Current Asset', 'Inventory Asset'].includes(a.type));
        const fixedAccs = accounts.filter(a => a.type === 'Fixed Asset');
        const otherAssetAccs = accounts.filter(a => a.type === 'Other Asset');

        const apAccs = accounts.filter(a => a.type === 'Accounts Payable');
        const ccAccs = accounts.filter(a => a.type === 'Credit Card');
        const oclAccs = accounts.filter(a => a.type === 'Other Current Liability');
        const ltlAccs = accounts.filter(a => a.type === 'Long Term Liability');
        const equityAccs = accounts.filter(a => a.type === 'Equity');

        const sumBal = (accs) => accs.reduce((s, a) => s + bal(a), 0);

        const currentAssets = sumBal(bankAccs) + sumBal(arAccs) + sumBal(ocaAccs);
        const totalAssets = currentAssets + sumBal(fixedAccs) + sumBal(otherAssetAccs);
        const currentLiab = sumBal(apAccs) + sumBal(ccAccs) + sumBal(oclAccs);
        const totalLiab = currentLiab + sumBal(ltlAccs);

        // Retained earnings = net income from all time up to asOf
        const pnlData = await reportService.getProfitAndLoss(null, asOf, userId, companyId);
        const retainedEarnings = pnlData.sections.find(s => s.isGrandTotal)?.value || 0;
        const totalEquity = sumBal(equityAccs) + retainedEarnings;

        const result = {
            sections: [
                { title: `Balance Sheet (as of ${asOf})`, isHeading: true },
                { title: 'ASSETS', isHeading: true },
                { title: 'Current Assets', isHeading: true, indent: 2 },
                { title: 'Checking/Savings', isHeading: true, indent: 4 },
                ...bankAccs.map(a => ({ title: a.name, value: bal(a), id: a.id, indent: 6 })),
                { title: 'Accounts Receivable', isHeading: true, indent: 4 },
                ...arAccs.map(a => ({ title: a.name, value: bal(a), id: a.id, indent: 6 })),
                { title: 'Other Current Assets', isHeading: true, indent: 4 },
                ...ocaAccs.map(a => ({ title: a.name, value: bal(a), id: a.id, indent: 6 })),
                { title: 'Total Current Assets', value: currentAssets, isTotal: true, indent: 2 },
                { title: 'Fixed Assets', isHeading: true, indent: 2, spacing: true },
                ...fixedAccs.map(a => ({ title: a.name, value: bal(a), id: a.id, indent: 4 })),
                { title: 'Other Assets', isHeading: true, indent: 2 },
                ...otherAssetAccs.map(a => ({ title: a.name, value: bal(a), id: a.id, indent: 4 })),
                { title: 'TOTAL ASSETS', value: totalAssets, isGrandTotal: true, spacing: true },
                { title: 'LIABILITIES & EQUITY', isHeading: true, spacing: true },
                { title: 'Liabilities', isHeading: true, indent: 2 },
                { title: 'Current Liabilities', isHeading: true, indent: 4 },
                ...apAccs.map(a => ({ title: a.name, value: bal(a), id: a.id, indent: 6 })),
                ...ccAccs.map(a => ({ title: a.name, value: bal(a), id: a.id, indent: 6 })),
                ...oclAccs.map(a => ({ title: a.name, value: bal(a), id: a.id, indent: 6 })),
                { title: 'Total Current Liabilities', value: currentLiab, isTotal: true, indent: 4 },
                { title: 'Long Term Liabilities', isHeading: true, indent: 4, spacing: true },
                ...ltlAccs.map(a => ({ title: a.name, value: bal(a), id: a.id, indent: 6 })),
                { title: 'Total Liabilities', value: totalLiab, isTotal: true, indent: 2 },
                { title: 'Equity', isHeading: true, spacing: true, indent: 2 },
                ...equityAccs.map(a => ({ title: a.name, value: bal(a), id: a.id, indent: 4 })),
                { title: 'Retained Earnings', value: retainedEarnings, indent: 4 },
                { title: 'Total Equity', value: totalEquity, isTotal: true, indent: 2 },
                { title: 'TOTAL LIABILITIES & EQUITY', value: totalLiab + totalEquity, isGrandTotal: true, spacing: true }
            ]
        };
        return applyCustomColumns(result, 'BALANCE_SHEET', userId, companyId);
    },

    getARAging: async (fromDate, toDate, userId, companyId) => {
        const asOf = toDate || new Date().toISOString().split('T')[0];
        const transactions = await Transaction.find({
            type: 'INVOICE',
            status: 'OPEN',
            userId,
            companyId,
            date: { $lte: asOf }
        }).lean();
        const customers = await Customer.find({ userId, companyId }).lean();

        const agingBuckets = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0 };
        const rows = [];

        customers.forEach(c => {
            const custTxs = transactions.filter(tx => tx.entityId === c.id);
            if (!custTxs.length) return;

            const buckets = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0 };
            custTxs.forEach(tx => {
                const due = new Date(tx.dueDate || tx.date);
                const asOfDate = new Date(asOf);
                const daysLate = Math.floor((asOfDate - due) / (1000 * 60 * 60 * 24));
                const amt = tx.total;
                if (daysLate <= 0) buckets.current += amt;
                else if (daysLate <= 30) buckets.days1_30 += amt;
                else if (daysLate <= 60) buckets.days31_60 += amt;
                else if (daysLate <= 90) buckets.days61_90 += amt;
                else buckets.over90 += amt;
            });

            const total = Object.values(buckets).reduce((s, v) => s + v, 0);
            if (total === 0) return;

            rows.push({ title: c.name, value: total, current: buckets.current, days1_30: buckets.days1_30, days31_60: buckets.days31_60, days61_90: buckets.days61_90, over90: buckets.over90, id: c.id, indent: 2 });
            Object.keys(agingBuckets).forEach(k => { agingBuckets[k] += buckets[k]; });
        });

        const totalAll = Object.values(agingBuckets).reduce((s, v) => s + v, 0);
        const result = {
            sections: [
                { title: `A/R Aging Summary (as of ${asOf})`, isHeading: true },
                { title: 'Customer', isHeading: true, indent: 2, columnHeaders: ['Current', '1-30', '31-60', '61-90', '> 90', 'Total'] },
                ...rows,
                {
                    title: 'TOTAL',
                    value: totalAll,
                    current: agingBuckets.current,
                    days1_30: agingBuckets.days1_30,
                    days31_60: agingBuckets.days31_60,
                    days61_90: agingBuckets.days61_90,
                    over90: agingBuckets.over90,
                    isGrandTotal: true, spacing: true
                }
            ]
        };
        return applyCustomColumns(result, 'AGING', userId, companyId);
    },

    getAPAging: async (fromDate, toDate, userId, companyId) => {
        const asOf = toDate || new Date().toISOString().split('T')[0];
        const transactions = await Transaction.find({
            type: 'BILL',
            status: 'OPEN',
            userId,
            companyId,
            date: { $lte: asOf }
        }).lean();
        const vendors = await Vendor.find({ userId, companyId }).lean();

        const agingBuckets = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0 };
        const rows = [];

        vendors.forEach(v => {
            const vendorTxs = transactions.filter(tx => tx.entityId === v.id);
            if (!vendorTxs.length) return;

            const buckets = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0 };
            vendorTxs.forEach(tx => {
                const due = new Date(tx.dueDate || tx.date);
                const asOfDate = new Date(asOf);
                const daysLate = Math.floor((asOfDate - due) / (1000 * 60 * 60 * 24));
                const amt = tx.total;
                if (daysLate <= 0) buckets.current += amt;
                else if (daysLate <= 30) buckets.days1_30 += amt;
                else if (daysLate <= 60) buckets.days31_60 += amt;
                else if (daysLate <= 90) buckets.days61_90 += amt;
                else buckets.over90 += amt;
            });

            const total = Object.values(buckets).reduce((s, v) => s + v, 0);
            if (total === 0) return;

            rows.push({ title: v.name, value: total, current: buckets.current, days1_30: buckets.days1_30, days31_60: buckets.days31_60, days61_90: buckets.days61_90, over90: buckets.over90, id: v.id, indent: 2 });
            Object.keys(agingBuckets).forEach(k => { agingBuckets[k] += buckets[k]; });
        });

        const totalAll = Object.values(agingBuckets).reduce((s, v) => s + v, 0);
        const result = {
            sections: [
                { title: `A/P Aging Summary (as of ${asOf})`, isHeading: true },
                { title: 'Vendor', isHeading: true, indent: 2, columnHeaders: ['Current', '1-30', '31-60', '61-90', '> 90', 'Total'] },
                ...rows,
                {
                    title: 'TOTAL',
                    value: totalAll,
                    current: agingBuckets.current,
                    days1_30: agingBuckets.days1_30,
                    days31_60: agingBuckets.days31_60,
                    days61_90: agingBuckets.days61_90,
                    over90: agingBuckets.over90,
                    isGrandTotal: true, spacing: true
                }
            ]
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
        const asOf = toDate || new Date().toISOString().split('T')[0];
        const items = await Item.find({
            userId, companyId,
            type: { $in: ['Inventory Part', 'Inventory Assembly'] },
            isActive: true
        }).lean();

        const InventoryLot = require('../models/InventoryLot');
        const lots = await InventoryLot.find({
            userId, companyId,
            quantityRemaining: { $gt: 0 },
            dateReceived: { $lte: new Date(asOf) }
        }).lean();

        const lotAgg = {};
        for (const lot of lots) {
            if (!lotAgg[lot.itemId]) lotAgg[lot.itemId] = { qty: 0, value: 0 };
            lotAgg[lot.itemId].qty += lot.quantityRemaining;
            lotAgg[lot.itemId].value += lot.quantityRemaining * (lot.unitCost || 0);
        }

        const rows = items.map(item => {
            const agg = lotAgg[item.id];
            // Use lot-level data if available, otherwise fall back to item.onHand + averageCost
            const qoh = agg ? agg.qty : (item.onHand || 0);
            const avgCost = agg && qoh > 0 ? agg.value / qoh : (item.averageCost || item.cost || 0);
            const value = qoh * avgCost;
            return {
                title: item.name,
                sku: item.sku,
                type: item.type,
                value,
                extraValue: qoh,           // Qty on Hand
                extraValue2: avgCost,       // Avg Cost
                extraValue3: qoh * (item.salesPrice || 0), // Retail Value
                id: item.id,
                indent: 2,
                valuationMethod: item.valuationMethod || 'Average'
            };
        }).filter(r => r.extraValue !== 0 || r.value !== 0);

        const result = {
            sections: [
                { title: `Inventory Valuation Summary (as of ${asOf})`, isHeading: true },
                ...rows,
                {
                    title: 'TOTAL ASSET VALUE',
                    value: rows.reduce((s, r) => s + r.value, 0),
                    extraValue: rows.reduce((s, r) => s + r.extraValue, 0),
                    isGrandTotal: true, spacing: true
                }
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
                'JOURNAL': ['JOURNAL', 'JOURNAL_ENTRY'],
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
                const ppBalance = ppLedger.balances[t._id.toString()] ?? ppLedger.balances[t.id];
                row.ppAmount = ppBalance != null ? ppBalance : null;
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
        const transactions = await Transaction.find(query).lean();
        const invoices = transactions.filter(t => t.type === 'INVOICE' || t.type === 'SALES_RECEIPT');

        // Group by tax item / tax code to compute per-agency tax collected
        const taxGroups = {};
        invoices.forEach(t => {
            // Use explicit taxAmount field if present
            const txTaxRate = t.taxRate || 0;
            const taxItemId = t.taxItemId || 'default';
            if (!taxGroups[taxItemId]) {
                taxGroups[taxItemId] = { taxableSales: 0, taxCollected: 0, taxRate: txTaxRate };
            }
            const taxableItems = (t.items || []).filter(i => i.tax);
            const taxableSalesAmt = taxableItems.reduce((s, i) => s + (i.amount || 0), 0);
            taxGroups[taxItemId].taxableSales += taxableSalesAmt;
            // Use txn-level taxAmount if present, otherwise derive from stored rate
            if (t.taxAmount != null && t.taxAmount > 0) {
                taxGroups[taxItemId].taxCollected += t.taxAmount;
            } else if (txTaxRate > 0) {
                taxGroups[taxItemId].taxCollected += taxableSalesAmt * (txTaxRate / 100);
            }
            // Keep highest rate seen for display
            if (txTaxRate > taxGroups[taxItemId].taxRate) {
                taxGroups[taxItemId].taxRate = txTaxRate;
            }
        });

        const adjustments = transactions.filter(t => t.type === 'TAX_ADJUSTMENT').reduce((s, t) => s + (t.total || 0), 0);
        const payments = transactions.filter(t => t.type === 'TAX_PAYMENT').reduce((s, t) => s + (t.total || 0), 0);

        const totalTaxableSales = Object.values(taxGroups).reduce((s, g) => s + g.taxableSales, 0);
        const totalTaxCollected = Object.values(taxGroups).reduce((s, g) => s + g.taxCollected, 0);

        const sections = [
            { title: `Sales Tax Liability (${fromDate || 'all'} - ${toDate || 'present'})`, isHeading: true }
        ];

        Object.entries(taxGroups).forEach(([id, g]) => {
            sections.push({ title: id === 'default' ? 'Sales Tax' : `Tax Agency: ${id}`, isHeading: true, indent: 2 });
            sections.push({ title: 'Taxable Sales', value: g.taxableSales, indent: 4 });
            sections.push({ title: 'Tax Rate', value: g.taxRate, indent: 4 });
            sections.push({ title: 'Tax Collected', value: g.taxCollected, isTotal: true, indent: 4 });
        });

        if (Object.keys(taxGroups).length === 0) {
            sections.push({ title: 'No taxable sales in this period', indent: 2 });
        }

        sections.push({ title: 'Adjustments', value: adjustments, indent: 2 });
        sections.push({ title: 'Tax Paid', value: -payments, indent: 2 });
        sections.push({ title: 'Total Tax Due', value: totalTaxCollected + adjustments - payments, isGrandTotal: true, spacing: true });

        const result = { sections };
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
        const start = fromDate || '1970-01-01';
        const end = toDate || new Date().toISOString().split('T')[0];

        const netIncomeData = await reportService.getProfitAndLoss(start, end, userId, companyId);
        const netIncome = netIncomeData.sections.find(s => s.isGrandTotal)?.value || 0;

        // Period transactions for delta calculation
        const periodTxs = await Transaction.find({
            userId, companyId,
            date: { $gte: start, $lte: end }
        }).lean();

        // AR delta: invoices issued minus payments received
        const arIncrease = periodTxs.filter(t => t.type === 'INVOICE').reduce((s, t) => s + t.total, 0);
        const arDecrease = periodTxs.filter(t => t.type === 'PAYMENT' || t.type === 'SALES_RECEIPT').reduce((s, t) => s + t.total, 0);
        const arDelta = arIncrease - arDecrease; // positive = AR went up = uses cash

        // AP delta: bills received minus payments made
        const apIncrease = periodTxs.filter(t => t.type === 'BILL').reduce((s, t) => s + t.total, 0);
        const apDecrease = periodTxs.filter(t => t.type === 'BILL_PAYMENT' || t.type === 'CHECK').reduce((s, t) => s + t.total, 0);
        const apDelta = apIncrease - apDecrease; // positive = AP went up = provides cash

        // Inventory delta from RECEIVE_ITEM and INVOICE/SALES_RECEIPT item qty changes
        const inventoryReceived = periodTxs.filter(t => t.type === 'RECEIVE_ITEM').reduce((s, t) => s + t.total, 0);
        const inventorySold = periodTxs.filter(t => ['INVOICE', 'SALES_RECEIPT'].includes(t.type))
            .reduce((s, t) => s + (t.items || []).reduce((is, i) => is + (i.amount || 0), 0), 0);
        const inventoryDelta = inventoryReceived - inventorySold; // positive = inventory grew = uses cash

        const opCash = netIncome - arDelta + apDelta - inventoryDelta;

        // Investing: Fixed asset purchases (BILL/CHECK where items link to fixed asset accounts)
        const accounts = await Account.find({ userId, companyId }).lean();
        const fixedAssetAccIds = new Set(accounts.filter(a => a.type === 'Fixed Asset').map(a => a.id));
        const assetPurchases = periodTxs.reduce((s, t) => {
            return s + (t.items || []).filter(i => fixedAssetAccIds.has(i.accountId)).reduce((is, i) => is + (i.amount || 0), 0);
        }, 0);
        const investCash = -assetPurchases;

        // Financing: equity contributions, owner draws, long-term loan proceeds/payments
        const equityAccIds = new Set(accounts.filter(a => a.type === 'Equity').map(a => a.id));
        const ltlAccIds = new Set(accounts.filter(a => a.type === 'Long Term Liability').map(a => a.id));
        const equityChanges = periodTxs.reduce((s, t) => {
            return s + (t.items || []).filter(i => equityAccIds.has(i.accountId)).reduce((is, i) => is + (i.amount || 0), 0);
        }, 0);
        const loanChanges = periodTxs.reduce((s, t) => {
            return s + (t.items || []).filter(i => ltlAccIds.has(i.accountId)).reduce((is, i) => is + (i.amount || 0), 0);
        }, 0);
        const financingCash = equityChanges + loanChanges;

        const netCashChange = opCash + investCash + financingCash;

        return {
            sections: [
                { title: `Statement of Cash Flows (${start} - ${end})`, isHeading: true },
                { title: 'OPERATING ACTIVITIES', isHeading: true, indent: 2 },
                { title: 'Net Income', value: netIncome, indent: 4 },
                { title: 'Adjustments to reconcile Net Income to net cash:', isHeading: true, indent: 4 },
                { title: 'Accounts Receivable (increase)', value: -arDelta, indent: 6 },
                { title: 'Accounts Payable (increase)', value: apDelta, indent: 6 },
                { title: 'Inventory (increase)', value: -inventoryDelta, indent: 6 },
                { title: 'Net cash provided by Operating Activities', value: opCash, isTotal: true, indent: 2, spacing: true },
                { title: 'INVESTING ACTIVITIES', isHeading: true, indent: 2 },
                { title: 'Purchase of fixed assets', value: -assetPurchases, indent: 4 },
                { title: 'Net cash used in Investing Activities', value: investCash, isTotal: true, indent: 2, spacing: true },
                { title: 'FINANCING ACTIVITIES', isHeading: true, indent: 2 },
                { title: 'Owner equity contributions / draws', value: equityChanges, indent: 4 },
                { title: 'Long-term debt proceeds / (payments)', value: loanChanges, indent: 4 },
                { title: 'Net cash provided by Financing Activities', value: financingCash, isTotal: true, indent: 2, spacing: true },
                { title: 'Net increase (decrease) in cash', value: netCashChange, isGrandTotal: true, spacing: true }
            ]
        };
    },

    getPayrollSummary: async (fromDate, toDate, userId, companyId) => {
        const query = {
            $or: [
                { type: 'PAYCHECK' },
                { type: 'JOURNAL', refNo: { $regex: /^PAY-/ } }
            ],
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
        const netIncome = pnl.sections.find(s => s.isGrandTotal)?.value || 0;
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

        // 1. Get all inventory items
        const items = await Item.find({
            userId,
            companyId,
            type: { $in: ['Inventory Part', 'Inventory Assembly'] }
        }).lean();

        // 2. Get all transactions involving these items
        const transactions = await Transaction.find({
            userId,
            companyId,
            date: { $gte: start, $lte: end },
            $or: [
                { type: 'BILL' },
                { type: 'INVOICE' },
                { type: 'SALES_RECEIPT' },
                { type: 'CREDIT_MEMO' },
                { type: 'VENDOR_CREDIT' },
                { type: 'RECEIVE_ITEM' },
                { type: 'INVENTORY_ADJUSTMENT' }
            ],
            'items.itemId': { $in: items.map(i => i.id) }
        }).sort({ date: 1, createdAt: 1 }).lean();

        const sections = [{ title: `Inventory Valuation Detail (${start} - ${end})`, isHeading: true }];

        items.forEach(item => {
            const itemTxs = transactions.filter(tx =>
                tx.items.some(line => line.itemId === item.id)
            );

            if (itemTxs.length === 0) return;

            sections.push({
                title: item.name,
                isHeading: true,
                indent: 1,
                spacing: true
            });

            let runningQty = 0; // Ideally we'd calculate start balance, but for now we follow the "interval" logic

            itemTxs.forEach(tx => {
                const line = tx.items.find(l => l.itemId === item.id);
                if (!line) return;

                // Determine quantity change
                // Increases: BILL, RECEIVE_ITEM, CREDIT_MEMO (return), VENDOR_CREDIT (negative amount/qty usually)
                // Decreases: INVOICE, SALES_RECEIPT, VENDOR_CREDIT
                let qtyChange = line.quantity || 0;

                // Adjustment logic based on transaction type
                if (['INVOICE', 'SALES_RECEIPT', 'VENDOR_CREDIT'].includes(tx.type)) {
                    qtyChange = -Math.abs(qtyChange);
                } else {
                    qtyChange = Math.abs(qtyChange);
                }

                // INVENTORY_ADJUSTMENT would use the difference, but let's assume quantity field is the delta
                if (tx.type === 'INVENTORY_ADJUSTMENT') {
                    qtyChange = line.quantity;
                }

                runningQty += qtyChange;
                const cost = line.rate || item.cost || 0;
                const valueChange = qtyChange * cost;

                sections.push({
                    title: `${tx.date} - ${tx.type} #${tx.refNo || tx.id.substring(0, 8)}`,
                    value: valueChange,
                    extraValue: qtyChange, // Quantity this tx
                    extraValue2: runningQty, // Running QTY
                    id: tx.id,
                    indent: 2
                });
            });

            sections.push({
                title: `Total for ${item.name}`,
                value: itemTxs.reduce((sum, tx) => {
                    const line = tx.items.find(l => l.itemId === item.id);
                    const qty = ['INVOICE', 'SALES_RECEIPT', 'VENDOR_CREDIT'].includes(tx.type) ? -Math.abs(line?.quantity || 0) : Math.abs(line?.quantity || 0);
                    return sum + (qty * (line?.rate || item.cost || 0));
                }, 0),
                isTotal: true,
                indent: 1
            });
        });

        const result = { sections };
        return applyCustomColumns(result, 'INV_VAL_DETAIL', userId, companyId);
    },

    getOpenPurchaseOrders: async (fromDate, toDate, userId, companyId, isDetail = false) => {
        const start = fromDate || '1970-01-01';
        const end = toDate || '2100-01-01';

        const query = {
            userId,
            companyId,
            type: 'PURCHASE_ORDER',
            status: 'OPEN',
            date: { $gte: start, $lte: end }
        };

        const transactions = await Transaction.find(query).sort({ date: 1 }).lean();
        const vendors = await Vendor.find({ userId, companyId }).lean();
        const items = await Item.find({ userId, companyId }).lean();

        if (!isDetail) {
            // Summary List
            const rows = transactions.map(tx => {
                const vendor = vendors.find(v => v.id === tx.entityId);
                return {
                    title: `${tx.date} - ${vendor?.name || 'Unknown'} - PO #${tx.refNo || tx.id.substring(0, 8)}`,
                    value: tx.total,
                    id: tx.id,
                    indent: 2
                };
            });

            return {
                sections: [
                    { title: `Open Purchase Order List (${start} - ${end})`, isHeading: true },
                    ...rows,
                    { title: 'TOTAL OPEN PO VALUE', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true }
                ]
            };
        } else {
            // Detail List
            const sections = [{ title: `Open Purchase Order Detail (${start} - ${end})`, isHeading: true }];

            transactions.forEach(tx => {
                const vendor = vendors.find(v => v.id === tx.entityId);
                sections.push({
                    title: `PO #${tx.refNo || tx.id.substring(0, 8)} - ${vendor?.name || 'Unknown'} (${tx.date})`,
                    isHeading: true,
                    indent: 1,
                    spacing: true
                });

                tx.items.forEach(line => {
                    const item = items.find(i => i.id === line.itemId);
                    sections.push({
                        title: item?.name || line.description || 'Unknown Item',
                        value: line.amount,
                        extraValue: line.quantity,
                        extraValue2: line.rate,
                        id: tx.id,
                        indent: 4
                    });
                });

                sections.push({
                    title: `PO Total`,
                    value: tx.total,
                    isTotal: true,
                    indent: 2
                });
            });

            sections.push({
                title: 'TOTAL OPEN PO VALUE',
                value: transactions.reduce((s, t) => s + t.total, 0),
                isGrandTotal: true,
                spacing: true
            });

            return { sections };
        }
    },

    getAdjustedTrialBalance: async (fromDate, toDate, userId, companyId) => {
        return reportService.getTrialBalance(fromDate, toDate, userId, companyId);
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

        return { sections };
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
    },

    getBudgetVsActual: async (fromDate, toDate, userId, companyId) => {
        const budgets = await Budget.find({
            userId,
            companyId,
            startDate: { $lte: toDate || '2100-01-01' },
            endDate: { $gte: fromDate || '1970-01-01' }
        }).lean();

        const transactions = await Transaction.find({
            userId,
            companyId,
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' }
        }).lean();

        const sections = [
            { title: `Budget vs Actual (${fromDate} - ${toDate})`, isHeading: true }
        ];

        budgets.forEach(budget => {
            const budgetTxs = transactions.filter(t =>
                t.items?.some(i => i.accountId === budget.accountId)
            );
            const actual = budgetTxs.reduce((sum, t) => sum + (t.total || 0), 0);
            const variance = budget.amount - actual;

            sections.push({
                title: budget.name,
                isHeading: true,
                indent: 1,
                spacing: true
            });
            sections.push({
                title: 'Budgeted',
                value: budget.amount,
                indent: 2
            });
            sections.push({
                title: 'Actual',
                value: actual,
                indent: 2
            });
            sections.push({
                title: 'Variance',
                value: variance,
                isTotal: true,
                indent: 2,
                spacing: true
            });
        });

        return { sections };
    },

    getJobEstimatesVsActuals: async (fromDate, toDate, userId, companyId) => {
        const estimates = await Transaction.find({
            userId,
            companyId,
            type: 'ESTIMATE',
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' }
        }).lean();

        const invoices = await Transaction.find({
            userId,
            companyId,
            type: 'INVOICE',
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' }
        }).lean();

        const sections = [
            { title: `Estimates vs Actuals (${fromDate} - ${toDate})`, isHeading: true }
        ];

        estimates.forEach(est => {
            const relatedInvoices = invoices.filter(inv => inv.estimateId === est.id);
            const actualAmount = relatedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
            const variance = est.total - actualAmount;

            sections.push({
                title: `Estimate #${est.refNo || est.id.substring(0, 8)}`,
                isHeading: true,
                indent: 1,
                spacing: true
            });
            sections.push({
                title: 'Estimated Amount',
                value: est.total,
                extraValue: est.entityId,
                indent: 2
            });
            sections.push({
                title: 'Actual Amount',
                value: actualAmount,
                indent: 2
            });
            sections.push({
                title: 'Variance',
                value: variance,
                isTotal: true,
                indent: 2,
                spacing: true
            });
        });

        return { sections };
    },

    getForecast: async (fromDate, toDate, userId, companyId, options = {}) => {
        // Build monthly buckets from historical data, then project forward using
        // weighted moving average + linear trend (OLS slope).
        const forecastMonths = Math.min(Math.max(parseInt(options.forecastMonths) || 3, 1), 24);
        const historicalMonths = Math.min(Math.max(parseInt(options.historicalMonths) || 6, 2), 36);

        // Pull the last historicalMonths of transactions relative to toDate (or today)
        const anchor = toDate ? new Date(toDate) : new Date();
        const histStart = new Date(anchor);
        histStart.setMonth(histStart.getMonth() - historicalMonths);
        const histStartStr = histStart.toISOString().slice(0, 10);

        const transactions = await Transaction.find({
            userId,
            companyId,
            date: { $gte: histStartStr, $lte: toDate || '2100-01-01' },
            status: { $ne: 'VOID' }
        }).lean();

        const accounts = await Account.find({ userId, companyId }).lean();
        const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));

        // Helper: bucket transactions by YYYY-MM
        const monthKey = (dateStr) => String(dateStr).slice(0, 7);

        // Build per-account monthly totals
        const monthlyByAccount = {};
        for (const tx of transactions) {
            for (const li of (tx.items || [])) {
                const acc = accountMap[li.accountId];
                if (!acc) continue;
                const mk = monthKey(tx.date);
                if (!monthlyByAccount[acc.id]) monthlyByAccount[acc.id] = {};
                monthlyByAccount[acc.id][mk] = (monthlyByAccount[acc.id][mk] || 0) + (li.amount || 0);
            }
        }

        // Linear regression (OLS) over n equally-spaced values → returns { slope, intercept }
        const linearTrend = (values) => {
            const n = values.length;
            if (n < 2) return { slope: 0, intercept: values[0] || 0 };
            const xMean = (n - 1) / 2;
            const yMean = values.reduce((s, v) => s + v, 0) / n;
            let num = 0, den = 0;
            values.forEach((y, x) => {
                num += (x - xMean) * (y - yMean);
                den += (x - xMean) ** 2;
            });
            const slope = den === 0 ? 0 : num / den;
            return { slope, intercept: yMean - slope * xMean };
        };

        // Weighted moving average (most recent month has highest weight)
        const weightedAvg = (values) => {
            const n = values.length;
            if (n === 0) return 0;
            const totalWeight = (n * (n + 1)) / 2;
            return values.reduce((s, v, i) => s + v * (i + 1), 0) / totalWeight;
        };

        // Generate the sorted list of historical month keys covered
        const allMonths = [];
        for (let m = 0; m < historicalMonths; m++) {
            const d = new Date(anchor);
            d.setMonth(d.getMonth() - historicalMonths + m + 1);
            allMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        const sections = [
            { title: `Cash Flow Forecast — ${forecastMonths}-Month Projection`, isHeading: true }
        ];

        // Generate forecast month labels
        const forecastLabels = [];
        for (let m = 1; m <= forecastMonths; m++) {
            const d = new Date(anchor);
            d.setMonth(d.getMonth() + m);
            forecastLabels.push(d.toLocaleString('default', { month: 'short', year: 'numeric' }));
        }

        let totalIncomeForecast = 0;
        let totalExpenseForecast = 0;

        // --- Income ---
        sections.push({ title: 'INCOME', isSubheading: true });
        const incomeAccounts = accounts.filter(a => a.type === 'Income');
        for (const acc of incomeAccounts) {
            const monthly = monthlyByAccount[acc.id] || {};
            const values = allMonths.map(mk => monthly[mk] || 0);
            if (values.every(v => v === 0)) continue;

            const { slope, intercept } = linearTrend(values);
            const wma = weightedAvg(values);
            const n = values.length;

            const projections = forecastLabels.map((label, i) => {
                // Blend: 60% trend-adjusted, 40% weighted moving average
                const trendVal = intercept + slope * (n + i);
                const blended = 0.6 * trendVal + 0.4 * wma;
                return { label, value: Math.max(0, blended) };
            });

            const forecastTotal = projections.reduce((s, p) => s + p.value, 0);
            totalIncomeForecast += forecastTotal;

            sections.push({
                title: acc.name,
                value: forecastTotal,
                extraValue: projections.map(p => `${p.label}: $${p.value.toFixed(0)}`).join(' | '),
                indent: 2
            });
        }
        sections.push({ title: 'Total Income Forecast', value: totalIncomeForecast, isSectionTotal: true });

        // --- Expenses ---
        sections.push({ title: 'EXPENSES', isSubheading: true, spacing: true });
        const expenseAccounts = accounts.filter(a => a.type === 'Expense' || a.type === 'Cost of Goods Sold');
        for (const acc of expenseAccounts) {
            const monthly = monthlyByAccount[acc.id] || {};
            const values = allMonths.map(mk => monthly[mk] || 0);
            if (values.every(v => v === 0)) continue;

            const { slope, intercept } = linearTrend(values);
            const wma = weightedAvg(values);
            const n = values.length;

            const projections = forecastLabels.map((label, i) => {
                const trendVal = intercept + slope * (n + i);
                const blended = 0.6 * trendVal + 0.4 * wma;
                return { label, value: Math.max(0, blended) };
            });

            const forecastTotal = projections.reduce((s, p) => s + p.value, 0);
            totalExpenseForecast += forecastTotal;

            sections.push({
                title: acc.name,
                value: forecastTotal,
                extraValue: projections.map(p => `${p.label}: $${p.value.toFixed(0)}`).join(' | '),
                indent: 2
            });
        }
        sections.push({ title: 'Total Expense Forecast', value: totalExpenseForecast, isSectionTotal: true });

        // --- Net ---
        const netForecast = totalIncomeForecast - totalExpenseForecast;
        sections.push({
            title: 'NET CASH FLOW FORECAST',
            value: netForecast,
            isGrandTotal: true,
            spacing: true
        });

        return { sections, meta: { historicalMonths, forecastMonths, forecastLabels } };
    },

    getAuditTrailDetail: async (fromDate, toDate, userId, companyId) => {
        const query = {
            date: { $gte: fromDate || '1970-01-01', $lte: toDate || '2100-01-01' },
            userId,
            companyId
        };
        const transactions = await Transaction.find(query).sort({ date: -1 }).lean();
        const auditLogs = await AuditLogEntry.find(query).sort({ date: -1 }).lean();

        const sections = [
            { title: `Audit Trail Detail (${fromDate} - ${toDate})`, isHeading: true }
        ];

        // Combine and sort all events
        const allEvents = [
            ...transactions.map(t => ({
                date: t.date,
                type: 'TRANSACTION',
                description: `${t.type} #${t.refNo || t.id.substring(0, 8)}`,
                value: t.total,
                id: t.id
            })),
            ...auditLogs.map(log => ({
                date: log.date,
                type: 'AUDIT',
                description: `${log.action} by ${log.userId}`,
                value: 0,
                id: log.id
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        allEvents.forEach(event => {
            sections.push({
                title: `${event.date} - ${event.type}: ${event.description}`,
                value: event.value,
                id: event.id,
                indent: 2,
                spacing: true
            });
        });

        return { sections };
    },

    // ─── QB: Inventory Stock Status by Item ──────────────────────────────────
    getInventoryStockStatusByItem: async (fromDate, toDate, userId, companyId) => {
        const InventoryLot = require('../models/InventoryLot');

        const items = await Item.find({
            userId, companyId,
            type: { $in: ['Inventory Part', 'Inventory Assembly'] },
            isActive: true
        }).lean();

        const vendors = await Vendor.find({ userId, companyId }).lean();
        const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));

        const openPOs = await Transaction.find({
            userId, companyId,
            type: 'PURCHASE_ORDER',
            status: { $in: ['OPEN', 'Open', 'PARTIALLY_RECEIVED'] }
        }).lean();
        const openSOs = await Transaction.find({
            userId, companyId,
            type: 'SALES_ORDER',
            status: { $in: ['OPEN', 'Open', 'PARTIALLY_FULFILLED'] }
        }).lean();

        const poMap = {};
        const soMap = {};
        for (const po of openPOs) {
            for (const li of (po.items || [])) {
                if (li.itemId) poMap[li.itemId] = (poMap[li.itemId] || 0) + (li.quantity || 0);
            }
        }
        for (const so of openSOs) {
            for (const li of (so.items || [])) {
                if (li.itemId) soMap[li.itemId] = (soMap[li.itemId] || 0) + (li.quantity || 0);
            }
        }

        const lots = await InventoryLot.find({ userId, companyId, quantityRemaining: { $gt: 0 } }).lean();
        const availMap = {};
        for (const lot of lots) {
            if (lot.lotStatus !== 'expired') {
                availMap[lot.itemId] = (availMap[lot.itemId] || 0) + lot.quantityRemaining;
            }
        }

        const rows = items.map(item => {
            const onHand = item.onHand || 0;
            const onPO = poMap[item.id] || 0;
            const onSO = soMap[item.id] || 0;
            const available = availMap[item.id] || onHand;
            const reorderPt = item.reorderPoint || 0;
            const vendor = vendorMap[item.preferredVendorId];
            const isLow = onHand <= reorderPt;
            return {
                title: item.name,
                sku: item.sku,
                id: item.id,
                indent: 2,
                extraValue: onHand,
                extraValue2: onPO,
                extraValue3: onSO,
                extraValue4: available,
                extraValue5: reorderPt,
                extraValue6: item.reorderQty || 0,
                value: (item.averageCost || item.cost || 0) * onHand,
                salesPrice: item.salesPrice || 0,
                preferredVendor: vendor?.name || '',
                isLow
            };
        });

        return {
            sections: [
                { title: 'Inventory Stock Status by Item', isHeading: true },
                ...rows,
                {
                    title: 'TOTAL',
                    value: rows.reduce((s, r) => s + r.value, 0),
                    extraValue: rows.reduce((s, r) => s + r.extraValue, 0),
                    isGrandTotal: true, spacing: true
                }
            ]
        };
    },

    // ─── QB: Inventory Stock Status by Vendor ───────────────────────────────
    getInventoryStockStatusByVendor: async (fromDate, toDate, userId, companyId) => {
        const stockStatus = await reportService.getInventoryStockStatusByItem(fromDate, toDate, userId, companyId);
        const rows = stockStatus.sections.filter(r => !r.isHeading && !r.isGrandTotal);

        const vendors = await Vendor.find({ userId, companyId }).lean();
        const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));
        const items = await Item.find({ userId, companyId, type: { $in: ['Inventory Part', 'Inventory Assembly'] } }).lean();
        const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

        const byVendor = {};
        for (const row of rows) {
            const item = itemMap[row.id];
            const vendorId = item?.preferredVendorId || '__none__';
            if (!byVendor[vendorId]) byVendor[vendorId] = { vendorId, vendorName: vendorMap[vendorId]?.name || 'No Vendor Assigned', items: [] };
            byVendor[vendorId].items.push(row);
        }

        const sections = [{ title: 'Inventory Stock Status by Vendor', isHeading: true }];
        for (const vg of Object.values(byVendor)) {
            sections.push({ title: vg.vendorName, isHeading: true, indent: 1 });
            sections.push(...vg.items.map(r => ({ ...r, indent: 2 })));
            sections.push({
                title: `Total ${vg.vendorName}`,
                value: vg.items.reduce((s, r) => s + r.value, 0),
                extraValue: vg.items.reduce((s, r) => s + r.extraValue, 0),
                isTotal: true, indent: 1
            });
        }
        sections.push({ title: 'GRAND TOTAL', value: rows.reduce((s, r) => s + r.value, 0), isGrandTotal: true, spacing: true });
        return { sections };
    },

    // ─── QB: Pending Builds ──────────────────────────────────────────────────
    getPendingBuilds: async (fromDate, toDate, userId, companyId) => {
        const InventoryLot = require('../models/InventoryLot');

        const assemblies = await Item.find({
            userId, companyId,
            type: 'Inventory Assembly',
            isActive: true
        }).lean();

        const allItems = await Item.find({ userId, companyId }).lean();
        const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]));

        const lots = await InventoryLot.find({
            userId, companyId,
            quantityRemaining: { $gt: 0 },
            lotStatus: { $ne: 'expired' }
        }).lean();
        const availMap = {};
        for (const lot of lots) {
            availMap[lot.itemId] = (availMap[lot.itemId] || 0) + lot.quantityRemaining;
        }

        const flattenBOM = (rootId, rootQty, visited = new Set()) => {
            if (visited.has(rootId)) return {};
            const item = itemMap[rootId];
            if (!item) return {};
            if (item.type === 'Inventory Assembly' && item.assemblyItems?.length) {
                const v2 = new Set(visited).add(rootId);
                const result = {};
                for (const comp of item.assemblyItems) {
                    const sub = flattenBOM(comp.itemId, (comp.quantity || 0) * rootQty, v2);
                    for (const [id, qty] of Object.entries(sub)) result[id] = (result[id] || 0) + qty;
                }
                return result;
            }
            return { [rootId]: rootQty };
        };

        const rows = assemblies.map(asm => {
            const onHand = asm.onHand || 0;
            const buildPoint = asm.buildPoint || 0;
            const qtyToBuild = Math.max(0, buildPoint - onHand);
            const flatNeeds = {};
            for (const comp of (asm.assemblyItems || [])) {
                const sub = flattenBOM(comp.itemId, (comp.quantity || 0) * (qtyToBuild || 1), new Set());
                for (const [id, qty] of Object.entries(sub)) flatNeeds[id] = (flatNeeds[id] || 0) + qty;
            }
            const canBuild = qtyToBuild > 0 && Object.entries(flatNeeds).every(([id, qty]) => (availMap[id] || 0) >= qty);
            return {
                title: asm.name,
                id: asm.id,
                sku: asm.sku,
                indent: 2,
                value: qtyToBuild,
                extraValue: onHand,
                extraValue2: buildPoint,
                extraValue3: canBuild ? 1 : 0,
                status: canBuild ? 'Can Build' : 'Missing Components'
            };
        }).filter(r => r.value > 0);

        return {
            sections: [
                { title: 'Pending Builds', isHeading: true },
                ...rows,
                { title: 'TOTAL PENDING BUILDS', value: rows.length, isGrandTotal: true, spacing: true }
            ]
        };
    },

    // ─── QB: Physical Inventory Worksheet ───────────────────────────────────
    getPhysicalInventoryWorksheet: async (fromDate, toDate, userId, companyId, warehouseId) => {
        const items = await Item.find({
            userId, companyId,
            type: { $in: ['Inventory Part', 'Inventory Assembly'] },
            isActive: true
        }).lean();

        const InventoryLot = require('../models/InventoryLot');
        const lotFilter = { userId, companyId, quantityRemaining: { $gt: 0 }, ...(warehouseId ? { warehouseId } : {}) };
        const lots = await InventoryLot.find(lotFilter).lean();
        const availMap = {};
        for (const lot of lots) {
            availMap[lot.itemId] = (availMap[lot.itemId] || 0) + lot.quantityRemaining;
        }

        const siteLabel = warehouseId ? ` — Site: ${warehouseId}` : '';
        const rows = items.map(item => {
            const siteQty = warehouseId ? (availMap[item.id] || 0) : (item.onHand || 0);
            return {
                title: item.name,
                sku: item.sku,
                id: item.id,
                indent: 2,
                extraValue: siteQty,                       // System QOH (site-filtered if warehouseId)
                extraValue2: availMap[item.id] || 0,       // Lot-based available
                value: null,                               // Physical Count (blank — to be filled)
                unitOfMeasure: item.unitOfMeasure,
                category: item.category
            };
        });

        return {
            sections: [
                { title: `Physical Inventory Worksheet${siteLabel} (as of ${new Date().toLocaleDateString()})`, isHeading: true },
                { title: 'Print this worksheet, count actual inventory, and enter counts to post adjustments.', isSubheading: true },
                ...rows,
                { title: 'TOTAL ITEMS', value: rows.length, isGrandTotal: true, spacing: true }
            ]
        };
    },

    // ─── QB: Inventory Turnover ──────────────────────────────────────────────
    getInventoryTurnover: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end = toDate || new Date().toISOString().split('T')[0];

        const items = await Item.find({
            userId, companyId,
            type: { $in: ['Inventory Part', 'Inventory Assembly'] }
        }).lean();

        const salesTxs = await Transaction.find({
            userId, companyId,
            type: { $in: ['INVOICE', 'SALES_RECEIPT'] },
            date: { $gte: start, $lte: end }
        }).lean();

        const cogsByItem = {};
        for (const tx of salesTxs) {
            for (const li of (tx.items || [])) {
                if (li.itemId) {
                    cogsByItem[li.itemId] = (cogsByItem[li.itemId] || 0) + (li.quantity || 0) * (li.rate || 0);
                }
            }
        }

        const rows = items.map(item => {
            const cogs = cogsByItem[item.id] || 0;
            const avgInventory = ((item.onHand || 0) * (item.averageCost || item.cost || 0));
            const turnover = avgInventory > 0 ? cogs / avgInventory : 0;
            const daysOnHand = turnover > 0 ? 365 / turnover : 0;
            return {
                title: item.name,
                sku: item.sku,
                id: item.id,
                indent: 2,
                value: turnover,            // Turnover ratio
                extraValue: cogs,           // COGS
                extraValue2: avgInventory,  // Avg Inventory Value
                extraValue3: Math.round(daysOnHand) // Days Inventory Outstanding
            };
        }).filter(r => r.extraValue > 0 || r.extraValue2 > 0);

        return {
            sections: [
                { title: `Inventory Turnover (${start} to ${end})`, isHeading: true },
                ...rows,
                {
                    title: 'TOTAL / AVG',
                    value: rows.length ? rows.reduce((s, r) => s + r.value, 0) / rows.length : 0,
                    extraValue: rows.reduce((s, r) => s + r.extraValue, 0),
                    extraValue2: rows.reduce((s, r) => s + r.extraValue2, 0),
                    isGrandTotal: true, spacing: true
                }
            ]
        };
    },

    // ─── QB Enterprise: Standard Cost Variance Report ───────────────────────
    // Shows standard cost vs. actual cost per assembly build, with variance
    // amounts and percentages — equivalent to QB Enterprise Manufacturing Reports.
    getCostVarianceReport: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end = toDate || new Date().toISOString().split('T')[0];

        // All assemblies using Standard valuation
        const assemblies = await Item.find({
            userId, companyId,
            type: 'Inventory Assembly',
            valuationMethod: 'Standard',
            isActive: true
        }).lean();

        // All assembly builds in the period
        const builds = await Transaction.find({
            userId, companyId,
            type: 'ASSEMBLY_BUILD',
            date: { $gte: start, $lte: end }
        }).lean();

        // All inventory items for cost lookup
        const allItems = await Item.find({ userId, companyId }).lean();
        const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]));

        // ── Effective qty helper (mirrors transactionService logic) ──
        const effectiveQty = (baseQty, scrapPercent = 0, yieldPercent = 100) => {
            const scrap = Math.max(0, scrapPercent || 0);
            const yield_ = Math.max(1, yieldPercent || 100);
            return baseQty * (1 + scrap / 100) / (yield_ / 100);
        };

        // Flatten BOM synchronously using the in-memory itemMap
        const flattenBOMSync = (assemblyId, qty, visited = new Set()) => {
            if (visited.has(assemblyId)) return {};
            visited.add(assemblyId);
            const asm = itemMap[assemblyId];
            if (!asm || !asm.assemblyItems || asm.assemblyItems.length === 0) return {};
            const flat = {};
            for (const comp of asm.assemblyItems) {
                const effQty = effectiveQty(comp.quantity * qty, comp.scrapPercent, comp.yieldPercent);
                const compItem = itemMap[comp.itemId];
                if (!compItem) continue;
                if (compItem.type === 'Inventory Assembly') {
                    const subFlat = flattenBOMSync(comp.itemId, effQty, new Set(visited));
                    for (const [subId, subData] of Object.entries(subFlat)) {
                        if (!flat[subId]) flat[subId] = { qty: 0, unitCost: subData.unitCost };
                        flat[subId].qty += subData.qty;
                    }
                } else if (compItem.type === 'Inventory Part') {
                    const unitCost = compItem.averageCost || compItem.cost || 0;
                    if (!flat[comp.itemId]) flat[comp.itemId] = { qty: 0, unitCost };
                    flat[comp.itemId].qty += effQty;
                }
            }
            return flat;
        };

        // Build a map: assemblyId -> [ { date, buildQty, actualCost, standardCost, variance } ]
        const buildMap = {};
        for (const build of builds) {
            for (const li of (build.items || [])) {
                const assemblyId = li.id || li.itemId;
                const asm = itemMap[assemblyId];
                if (!asm || asm.valuationMethod !== 'Standard') continue;
                const buildQty = Math.abs(li.quantity || 0);
                if (buildQty === 0) continue;

                const flatComps = flattenBOMSync(assemblyId, buildQty);
                const actualCost = Object.values(flatComps).reduce((s, d) => s + d.qty * d.unitCost, 0);
                const standardCost = (asm.standardCost || 0) * buildQty;
                const variance = actualCost - standardCost;

                if (!buildMap[assemblyId]) buildMap[assemblyId] = [];
                buildMap[assemblyId].push({
                    date: build.date,
                    refNo: build.refNo,
                    buildQty,
                    actualCost,
                    standardCost,
                    variance,
                    variancePct: standardCost !== 0 ? (variance / standardCost) * 100 : 0
                });
            }
        }

        const sections = [
            {
                title: `Standard Cost Variance Report (${start} to ${end})`,
                isHeading: true
            },
            {
                title: 'Compares actual assembly build cost against standard cost. Positive variance = over standard (unfavorable).',
                isSubheading: true
            }
        ];

        let grandActual = 0, grandStandard = 0, grandVariance = 0;

        for (const asm of assemblies) {
            const entries = buildMap[asm.id] || [];
            const totalActual = entries.reduce((s, e) => s + e.actualCost, 0);
            const totalStandard = entries.reduce((s, e) => s + e.standardCost, 0);
            const totalVariance = entries.reduce((s, e) => s + e.variance, 0);
            const totalQty = entries.reduce((s, e) => s + e.buildQty, 0);
            const variancePct = totalStandard !== 0 ? (totalVariance / totalStandard) * 100 : 0;

            // Assembly header row
            sections.push({
                title: asm.name,
                sku: asm.sku,
                id: asm.id,
                indent: 1,
                isSubheading: true,
                value: totalVariance,            // Total variance ($)
                extraValue: totalStandard,       // Total standard cost
                extraValue2: totalActual,        // Total actual cost
                extraValue3: variancePct,        // Variance %
                extraValue4: totalQty,           // Units built
                status: totalVariance > 0 ? 'Unfavorable' : totalVariance < 0 ? 'Favorable' : 'On Standard'
            });

            // Detail rows per build
            for (const entry of entries) {
                sections.push({
                    title: `${entry.date}  ${entry.refNo || ''}  (Qty: ${entry.buildQty})`,
                    indent: 2,
                    value: entry.variance,
                    extraValue: entry.standardCost,
                    extraValue2: entry.actualCost,
                    extraValue3: entry.variancePct,
                    status: entry.variance > 0 ? 'Unfavorable' : entry.variance < 0 ? 'Favorable' : 'On Standard'
                });
            }

            if (entries.length === 0) {
                sections.push({ title: 'No builds in period', indent: 2, value: 0, extraValue: 0, extraValue2: 0, extraValue3: 0 });
            }

            grandActual += totalActual;
            grandStandard += totalStandard;
            grandVariance += totalVariance;
        }

        const grandVariancePct = grandStandard !== 0 ? (grandVariance / grandStandard) * 100 : 0;

        sections.push({
            title: 'TOTAL VARIANCE',
            value: grandVariance,
            extraValue: grandStandard,
            extraValue2: grandActual,
            extraValue3: grandVariancePct,
            isGrandTotal: true,
            spacing: true
        });

        return { sections };
    },

    // ── QB Enterprise: Bill of Materials (Printable) ──────────────────────────
    // Returns a flat sections array that represents the full indented BOM tree
    // for every active Inventory Assembly. Each row carries extra fields used
    // by the custom BOM_REPORT renderer in ReportView:
    //   extraValue  = qty per parent (base)
    //   extraValue2 = effective qty (after scrap/yield)
    //   extraValue3 = unit cost
    //   extraValue4 = extended cost (effQty * unitCost)
    //   compType    = component item type string
    getBOMReport: async (userId, companyId, itemId) => {
        const query = { userId, companyId, type: 'Inventory Assembly', isActive: true };
        if (itemId) query.id = itemId;
        const assemblies = await Item.find(query).sort({ name: 1 }).lean();

        const allItems = await Item.find({ userId, companyId }).lean();
        const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]));

        const effectiveQty = (baseQty, scrapPercent = 0, yieldPercent = 100) => {
            const scrap = Math.max(0, scrapPercent || 0);
            const yield_ = Math.max(1, yieldPercent || 100);
            return baseQty * (1 + scrap / 100) / (yield_ / 100);
        };

        // Recursively flatten BOM into rows with depth for indentation
        const flattenBOM = (assemblyId, parentQty, depth, visited = new Set()) => {
            if (visited.has(assemblyId)) return [{ title: `⚠ Circular ref: ${assemblyId}`, indent: depth + 2, isWarning: true }];
            const guard = new Set(visited).add(assemblyId);
            const asm = itemMap[assemblyId];
            if (!asm || !asm.assemblyItems || asm.assemblyItems.length === 0) return [];
            const rows = [];
            for (const comp of asm.assemblyItems) {
                const compItem = itemMap[comp.itemId];
                const effQty = effectiveQty(comp.quantity * parentQty, comp.scrapPercent, comp.yieldPercent);
                const unitCost = compItem ? (compItem.averageCost || compItem.cost || 0) : 0;
                rows.push({
                    title: compItem ? compItem.name : `[Deleted item: ${comp.itemId}]`,
                    indent: depth,
                    value: effQty * unitCost,           // extended cost
                    extraValue: comp.quantity,           // base qty per unit
                    extraValue2: +effQty.toFixed(4),     // effective qty
                    extraValue3: unitCost,               // unit cost
                    compType: compItem ? compItem.type : 'Unknown',
                    sku: compItem ? compItem.sku : '',
                    id: compItem ? compItem.id : undefined,
                });
                // Recurse into sub-assemblies
                if (compItem && compItem.type === 'Inventory Assembly') {
                    rows.push(...flattenBOM(comp.itemId, effQty, depth + 1, guard));
                }
            }
            return rows;
        };

        const sections = [
            { title: 'Bill of Materials Report', isHeading: true },
            { title: 'Lists all active Inventory Assembly items with their full component structure, costs, and effective quantities.', isSubheading: true }
        ];

        for (const asm of assemblies) {
            const componentRows = flattenBOM(asm.id, 1, 3);
            const totalCost = componentRows.filter(r => !r.isWarning).reduce((s, r) => s + (r.value || 0), 0);

            // Assembly header
            sections.push({
                title: asm.name,
                sku: asm.sku,
                id: asm.id,
                indent: 1,
                isSubheading: true,
                value: totalCost,
                extraValue3: asm.standardCost || asm.averageCost || asm.cost || 0,
                compType: 'Inventory Assembly',
                assemblyHeader: true,
            });

            if (componentRows.length === 0) {
                sections.push({ title: 'No components defined', indent: 3, value: 0 });
            } else {
                sections.push(...componentRows);
            }

            sections.push({
                title: `Total BOM Cost — ${asm.name}`,
                indent: 2,
                value: totalCost,
                isTotal: true,
            });
        }

        if (assemblies.length === 0) {
            sections.push({ title: 'No active Inventory Assembly items found.', indent: 2 });
        }

        return { sections };
    },

    // ── QB Enterprise: Inventory by Site (per-warehouse quantities) ───────────
    getInventoryBySite: async (fromDate, toDate, userId, companyId) => {
        const InventoryLot = require('../models/InventoryLot');
        const Warehouse = require('../models/Warehouse');

        const lots = await InventoryLot.find({ userId, companyId, quantityRemaining: { $gt: 0 } }).lean();
        const warehouses = await Warehouse.find({ userId, companyId }).lean();
        const items = await Item.find({ userId, companyId }).lean();

        const warehouseMap = Object.fromEntries(warehouses.map(w => [w.id, w]));
        const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

        // Group by warehouseId → itemId
        const byWarehouse = {};
        for (const lot of lots) {
            const wId = lot.warehouseId || 'DEFAULT';
            if (!byWarehouse[wId]) byWarehouse[wId] = {};
            if (!byWarehouse[wId][lot.itemId]) byWarehouse[wId][lot.itemId] = { qty: 0, totalCost: 0 };
            byWarehouse[wId][lot.itemId].qty += lot.quantityRemaining;
            byWarehouse[wId][lot.itemId].totalCost += lot.quantityRemaining * (lot.unitCost || 0);
        }

        const sections = [{ title: 'Inventory by Site', isHeading: true }];
        let grandTotalQty = 0, grandTotalValue = 0;

        for (const wId of Object.keys(byWarehouse).sort()) {
            const wh = warehouseMap[wId];
            const whName = wh ? wh.name : (wId === 'DEFAULT' ? 'Default Warehouse' : wId);
            sections.push({ title: whName, isSubheading: true, isWarehouseHeader: true });

            let whQty = 0, whValue = 0;
            const sortedItems = Object.keys(byWarehouse[wId]).sort((a, b) =>
                (itemMap[a]?.name || a).localeCompare(itemMap[b]?.name || b));

            for (const iId of sortedItems) {
                const itm = itemMap[iId];
                const { qty, totalCost } = byWarehouse[wId][iId];
                const avgCost = qty > 0 ? totalCost / qty : 0;
                sections.push({
                    title: itm ? itm.name : `[Deleted: ${iId}]`,
                    sku: itm?.sku || '',
                    value: totalCost,
                    extraValue: qty,
                    extraValue2: avgCost,
                    indent: 1,
                });
                whQty += qty;
                whValue += totalCost;
            }

            sections.push({ title: `Total — ${whName}`, isTotal: true, value: whValue, extraValue: whQty, indent: 1 });
            grandTotalQty += whQty;
            grandTotalValue += whValue;
        }

        if (Object.keys(byWarehouse).length === 0) {
            sections.push({ title: 'No inventory on hand.', indent: 1 });
        }
        sections.push({ title: 'Grand Total', isGrandTotal: true, value: grandTotalValue, extraValue: grandTotalQty });
        return { sections };
    },

    // ── QB Enterprise: Inventory by Location (per-bin quantities) ────────────
    getInventoryByLocation: async (fromDate, toDate, userId, companyId) => {
        const InventoryLot = require('../models/InventoryLot');
        const Warehouse = require('../models/Warehouse');
        const Bin = require('../models/Bin');

        const lots = await InventoryLot.find({ userId, companyId, quantityRemaining: { $gt: 0 } }).lean();
        const warehouses = await Warehouse.find({ userId, companyId }).lean();
        const bins = await Bin.find({ userId, companyId }).lean();
        const items = await Item.find({ userId, companyId }).lean();

        const warehouseMap = Object.fromEntries(warehouses.map(w => [w.id, w]));
        const binMap = Object.fromEntries(bins.map(b => [b.id, b]));
        const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

        // Group by warehouseId → binKey → itemId
        const byWarehouse = {};
        for (const lot of lots) {
            const wId = lot.warehouseId || 'DEFAULT';
            const binKey = lot.binId || lot.binLocation || 'Unassigned';
            if (!byWarehouse[wId]) byWarehouse[wId] = {};
            if (!byWarehouse[wId][binKey]) byWarehouse[wId][binKey] = {};
            if (!byWarehouse[wId][binKey][lot.itemId]) byWarehouse[wId][binKey][lot.itemId] = { qty: 0, totalCost: 0 };
            byWarehouse[wId][binKey][lot.itemId].qty += lot.quantityRemaining;
            byWarehouse[wId][binKey][lot.itemId].totalCost += lot.quantityRemaining * (lot.unitCost || 0);
        }

        const sections = [{ title: 'Inventory by Location', isHeading: true }];
        let grandTotalQty = 0, grandTotalValue = 0;

        for (const wId of Object.keys(byWarehouse).sort()) {
            const wh = warehouseMap[wId];
            const whName = wh ? wh.name : (wId === 'DEFAULT' ? 'Default Warehouse' : wId);
            sections.push({ title: whName, isSubheading: true, isWarehouseHeader: true });

            for (const binKey of Object.keys(byWarehouse[wId]).sort()) {
                const bin = binMap[binKey];
                const binName = bin
                    ? `${bin.name}${bin.zone ? ` — ${bin.zone}` : ''}${bin.aisle ? ` / Aisle ${bin.aisle}` : ''}`
                    : binKey;
                sections.push({ title: binName, indent: 1, isBinHeader: true });

                let binQty = 0, binValue = 0;
                const sortedItems = Object.keys(byWarehouse[wId][binKey]).sort((a, b) =>
                    (itemMap[a]?.name || a).localeCompare(itemMap[b]?.name || b));

                for (const iId of sortedItems) {
                    const itm = itemMap[iId];
                    const { qty, totalCost } = byWarehouse[wId][binKey][iId];
                    const avgCost = qty > 0 ? totalCost / qty : 0;
                    sections.push({
                        title: itm ? itm.name : `[Deleted: ${iId}]`,
                        sku: itm?.sku || '',
                        value: totalCost,
                        extraValue: qty,
                        extraValue2: avgCost,
                        indent: 2,
                    });
                    binQty += qty;
                    binValue += totalCost;
                }

                sections.push({ title: `Total — ${binName}`, isTotal: true, value: binValue, extraValue: binQty, indent: 2 });
                grandTotalQty += binQty;
                grandTotalValue += binValue;
            }
        }

        if (Object.keys(byWarehouse).length === 0) {
            sections.push({ title: 'No inventory on hand.', indent: 1 });
        }
        sections.push({ title: 'Grand Total', isGrandTotal: true, value: grandTotalValue, extraValue: grandTotalQty });
        return { sections };
    },

    // ── QB Enterprise: Inventory Stock Status by Site ─────────────────────────
    // Per-warehouse view: on-hand vs reorder point, highlights LOW and OUT items.
    // Uses lot aggregation for qty and Item.warehouseReorderPoints for thresholds
    // (falls back to global Item.reorderPoint when no per-site override exists).
    getInventoryStockStatusBySite: async (fromDate, toDate, userId, companyId) => {
        const InventoryLot = require('../models/InventoryLot');
        const Warehouse = require('../models/Warehouse');

        const lots = await InventoryLot.find({
            userId, companyId,
            quantityRemaining: { $gt: 0 },
            lotStatus: { $in: ['available', 'on-hold'] },
        }).lean();

        const warehouses = await Warehouse.find({ userId, companyId }).lean();
        const items = await Item.find({
            userId, companyId,
            type: { $in: ['Inventory Part', 'Inventory Assembly'] },
            isActive: true,
        }).lean();

        const warehouseMap = Object.fromEntries(warehouses.map(w => [w.id, w]));
        const itemMap     = Object.fromEntries(items.map(i => [i.id, i]));

        // Per-site reorder threshold lookup: itemId → warehouseId → thresholds
        const reorderMap = {};
        for (const item of items) {
            reorderMap[item.id] = Object.fromEntries(
                (item.warehouseReorderPoints || []).map(rp => [rp.warehouseId, rp])
            );
        }

        // Group lot qty by warehouseId → itemId
        const byWarehouse = {};
        for (const lot of lots) {
            const wId = lot.warehouseId || 'DEFAULT';
            if (!byWarehouse[wId]) byWarehouse[wId] = {};
            if (!byWarehouse[wId][lot.itemId]) byWarehouse[wId][lot.itemId] = { qty: 0, totalCost: 0 };
            byWarehouse[wId][lot.itemId].qty      += lot.quantityRemaining;
            byWarehouse[wId][lot.itemId].totalCost += lot.quantityRemaining * (lot.unitCost || 0);
        }

        // Ensure items with a per-site reorder point appear even if qty = 0
        for (const item of items) {
            for (const rp of (item.warehouseReorderPoints || [])) {
                const wId = rp.warehouseId;
                if (!byWarehouse[wId]) byWarehouse[wId] = {};
                if (!byWarehouse[wId][item.id]) byWarehouse[wId][item.id] = { qty: 0, totalCost: 0 };
            }
        }

        const sections = [{ title: 'Inventory Stock Status by Site', isHeading: true }];
        let grandTotalSites = 0;
        let needsReorderCount = 0;

        for (const wId of Object.keys(byWarehouse).sort()) {
            const wh     = warehouseMap[wId];
            const whName = wh ? wh.name : (wId === 'DEFAULT' ? 'Default Warehouse' : wId);
            sections.push({ title: whName, isSubheading: true, isWarehouseHeader: true });

            const sortedItems = Object.keys(byWarehouse[wId]).sort((a, b) =>
                (itemMap[a]?.name || a).localeCompare(itemMap[b]?.name || b)
            );

            let whNeedsReorder = 0;
            for (const iId of sortedItems) {
                const itm = itemMap[iId];
                if (!itm) continue;

                const { qty, totalCost } = byWarehouse[wId][iId];
                const siteRP   = reorderMap[iId]?.[wId];
                const rpThresh = siteRP?.reorderPoint ?? itm.reorderPoint ?? 0;
                const rpQty    = siteRP?.reorderQty   ?? itm.reorderQty   ?? 0;
                const maxSt    = siteRP?.maxStock      ?? itm.maxStock     ?? 0;
                const avgCost  = qty > 0 ? totalCost / qty : (itm.averageCost || itm.cost || 0);

                // status: 0 = OUT, 1 = LOW (≤ reorder point), 2 = OK
                let stockStatus = 'OK';
                if (qty <= 0)                          stockStatus = 'OUT';
                else if (rpThresh > 0 && qty <= rpThresh) stockStatus = 'LOW';

                const orderUp = stockStatus !== 'OK' && rpQty > 0
                    ? Math.max(0, (maxSt > 0 ? maxSt : rpQty + (rpThresh || 0)) - qty)
                    : 0;

                sections.push({
                    title: itm.name,
                    sku: itm.sku || '',
                    indent: 1,
                    extraValue:  qty,        // on-hand qty
                    extraValue2: rpThresh,   // reorder point threshold
                    reorderQty: rpQty,
                    maxStock: maxSt,
                    orderUp,
                    avgCost,
                    value: totalCost,
                    stockStatus,             // 'OK' | 'LOW' | 'OUT'
                });

                grandTotalSites++;
                if (stockStatus !== 'OK') { whNeedsReorder++; needsReorderCount++; }
            }

            sections.push({
                title: `${whName} — ${whNeedsReorder} item(s) need reordering`,
                isTotal: true, indent: 1,
                extraValue: whNeedsReorder,
            });
        }

        if (Object.keys(byWarehouse).length === 0) {
            sections.push({ title: 'No inventory items found.', indent: 1 });
        }
        sections.push({
            title: `Grand Total: ${needsReorderCount} item-site(s) need reordering of ${grandTotalSites} tracked`,
            isGrandTotal: true,
            extraValue: needsReorderCount,
            value: grandTotalSites,
        });
        return { sections };
    },

    // ── QB Enterprise: Lot Number Report ─────────────────────────────────────
    getLotNumberReport: async (fromDate, toDate, userId, companyId) => {
        const InventoryLot = require('../models/InventoryLot');
        const Warehouse = require('../models/Warehouse');

        const query = { userId, companyId };
        if (fromDate || toDate) {
            query.dateReceived = {};
            if (fromDate) query.dateReceived.$gte = new Date(fromDate);
            if (toDate) query.dateReceived.$lte = new Date(toDate + 'T23:59:59');
        }

        const lots = await InventoryLot.find(query).sort({ itemId: 1, dateReceived: 1 }).lean();
        const items = await Item.find({ userId, companyId }).lean();
        const warehouses = await Warehouse.find({ userId, companyId }).lean();

        const itemMap = Object.fromEntries(items.map(i => [i.id, i]));
        const warehouseMap = Object.fromEntries(warehouses.map(w => [w.id, w]));

        const byItem = {};
        for (const lot of lots) {
            if (!byItem[lot.itemId]) byItem[lot.itemId] = [];
            byItem[lot.itemId].push(lot);
        }

        const sections = [{ title: 'Lot Number Report', isHeading: true }];
        let totalLots = 0;

        const sortedItemIds = Object.keys(byItem).sort((a, b) =>
            (itemMap[a]?.name || a).localeCompare(itemMap[b]?.name || b));

        for (const iId of sortedItemIds) {
            const itm = itemMap[iId];
            sections.push({ title: itm ? itm.name : `[Deleted: ${iId}]`, isSubheading: true, sku: itm?.sku || '' });

            for (const lot of byItem[iId]) {
                const wh = warehouseMap[lot.warehouseId];
                const whName = wh ? wh.name : (lot.warehouseId === 'DEFAULT' || !lot.warehouseId ? 'Default' : lot.warehouseId);
                sections.push({
                    title: lot.lotNumber,
                    indent: 1,
                    lotStatus: lot.lotStatus,
                    extraValue: lot.quantityRemaining,
                    extraValue2: lot.quantityReceived,
                    extraValue3: lot.unitCost,
                    value: lot.quantityRemaining * (lot.unitCost || 0),
                    dateReceived: lot.dateReceived ? new Date(lot.dateReceived).toISOString().split('T')[0] : '',
                    expirationDate: lot.expirationDate ? new Date(lot.expirationDate).toISOString().split('T')[0] : '',
                    warehouseName: whName,
                    binLocation: lot.binLocation || lot.binId || '',
                    vendorLotNumber: lot.vendorLotNumber || '',
                    vendorName: lot.vendorName || '',
                });
                totalLots++;
            }
        }

        if (lots.length === 0) sections.push({ title: 'No lot records found for the selected date range.', indent: 1 });
        sections.push({ title: `Total Lots: ${totalLots}`, isGrandTotal: true, value: 0, extraValue: totalLots });
        return { sections };
    },

    // ── QB Enterprise: Serial Number Report ──────────────────────────────────
    getSerialNumberReport: async (fromDate, toDate, userId, companyId) => {
        const SerialNumber = require('../models/SerialNumber');
        const Warehouse = require('../models/Warehouse');

        const query = { userId, companyId };
        if (fromDate || toDate) {
            query.dateReceived = {};
            if (fromDate) query.dateReceived.$gte = new Date(fromDate);
            if (toDate) query.dateReceived.$lte = new Date(toDate + 'T23:59:59');
        }

        const serials = await SerialNumber.find(query).sort({ itemId: 1, serialNumber: 1 }).lean();
        const items = await Item.find({ userId, companyId }).lean();
        const warehouses = await Warehouse.find({ userId, companyId }).lean();

        const itemMap = Object.fromEntries(items.map(i => [i.id, i]));
        const warehouseMap = Object.fromEntries(warehouses.map(w => [w.id, w]));

        const byItem = {};
        for (const sn of serials) {
            if (!byItem[sn.itemId]) byItem[sn.itemId] = [];
            byItem[sn.itemId].push(sn);
        }

        const sections = [{ title: 'Serial Number Report', isHeading: true }];

        const sortedItemIds = Object.keys(byItem).sort((a, b) =>
            (itemMap[a]?.name || a).localeCompare(itemMap[b]?.name || b));

        for (const iId of sortedItemIds) {
            const itm = itemMap[iId];
            sections.push({ title: itm ? itm.name : `[Deleted: ${iId}]`, isSubheading: true, sku: itm?.sku || '' });

            for (const sn of byItem[iId]) {
                const wh = warehouseMap[sn.warehouseId];
                const whName = wh ? wh.name : (sn.warehouseId === 'DEFAULT' || !sn.warehouseId ? 'Default' : sn.warehouseId);
                sections.push({
                    title: sn.serialNumber,
                    indent: 1,
                    snStatus: sn.status,
                    extraValue: sn.unitCost,
                    value: sn.unitCost || 0,
                    dateReceived: sn.dateReceived ? new Date(sn.dateReceived).toISOString().split('T')[0] : '',
                    dateSold: sn.dateSold ? new Date(sn.dateSold).toISOString().split('T')[0] : '',
                    warrantyExpiry: sn.warrantyExpiry ? new Date(sn.warrantyExpiry).toISOString().split('T')[0] : '',
                    warehouseName: whName,
                    customerName: sn.customerName || '',
                    lotNumber: sn.lotNumber || '',
                });
            }
        }

        if (serials.length === 0) sections.push({ title: 'No serial numbers found for the selected date range.', indent: 1 });
        sections.push({ title: `Total Serial Numbers: ${serials.length}`, isGrandTotal: true, value: 0, extraValue: serials.length });
        return { sections };
    },

    // ── QB Desktop: Price Level Listing ──────────────────────────────────────
    getPriceLevelReport: async (fromDate, toDate, userId, companyId) => {
        const PriceLevel = require('../models/PriceLevel');

        const priceLevels = await PriceLevel.find({ userId, companyId, isActive: true }).sort({ name: 1 }).lean();
        const items = await Item.find({ userId, companyId }).lean();
        const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

        const sections = [{ title: 'Price Level Listing', isHeading: true }];

        for (const pl of priceLevels) {
            let typeDesc = pl.type;
            if (pl.type === 'Fixed %') {
                const sign = (pl.percentage || 0) >= 0 ? '+' : '';
                typeDesc = `Fixed % — ${sign}${pl.percentage || 0}% adjustment on all items`;
            } else if (pl.type === 'Formula') {
                const fc = pl.formulaConfig || {};
                typeDesc = `Formula — ${fc.adjustmentType || 'markdown'} ${fc.adjustmentAmount || 0}% based on ${fc.baseOn || 'price'}`;
            } else if (pl.type === 'Per Item') {
                typeDesc = `Per Item — custom price per item`;
            }

            sections.push({
                title: pl.name,
                isSubheading: true,
                priceLevelType: pl.type,
                typeDesc,
                extraValue: pl.type === 'Fixed %' ? (pl.percentage || 0) : null,
                description: pl.description || '',
            });

            if (pl.type === 'Per Item' && pl.itemPrices && pl.itemPrices.length > 0) {
                for (const ip of pl.itemPrices) {
                    const itm = itemMap[ip.itemId];
                    sections.push({
                        title: itm ? itm.name : `[Deleted: ${ip.itemId}]`,
                        indent: 1,
                        sku: itm?.sku || '',
                        value: ip.price,
                        extraValue2: itm ? (itm.price || itm.cost || 0) : 0,
                        isPriceLevelItem: true,
                    });
                }
            } else if (pl.type !== 'Per Item') {
                sections.push({ title: typeDesc, indent: 1 });
            }
        }

        if (priceLevels.length === 0) sections.push({ title: 'No active price levels found.', indent: 1 });
        return { sections };
    },

    // ─── Assembly Shortage Report ────────────────────────────────────────────
    // For each Inventory Assembly that has a build point or pending build qty,
    // shows every component with how much is on hand, how much is needed for
    // one build run, and the shortage (needed − available).
    getAssemblyShortageReport: async (fromDate, toDate, userId, companyId) => {
        const InventoryLot = require('../models/InventoryLot');

        const assemblies = await Item.find({
            userId, companyId,
            type: 'Inventory Assembly',
            isActive: true
        }).lean();

        const allItems = await Item.find({ userId, companyId }).lean();
        const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]));

        // Build available-qty map from lots
        const lots = await InventoryLot.find({
            userId, companyId,
            quantityRemaining: { $gt: 0 },
            lotStatus: { $nin: ['expired', 'quarantine', 'on-hold'] }
        }).lean();
        const availMap = {};
        for (const lot of lots) {
            availMap[lot.itemId] = (availMap[lot.itemId] || 0) + lot.quantityRemaining;
        }

        const sections = [{ title: 'Assembly Shortage Report', isHeading: true }];
        let totalShortages = 0;

        for (const asm of assemblies) {
            const onHand = asm.onHand || 0;
            const buildPoint = asm.buildPoint;
            // Skip assemblies with no build point defined — nothing to check shortage against
            if (buildPoint == null) continue;
            const qtyToBuild = buildPoint - onHand;
            // Only report shortages when we actually need to build something
            if (qtyToBuild <= 0) continue;
            const comps = asm.assemblyItems || [];
            if (comps.length === 0) continue;

            const shortageRows = [];
            for (const comp of comps) {
                const compItem = itemMap[comp.itemId];
                if (!compItem) continue;
                const needed = (comp.quantity || 0) * qtyToBuild;
                const avail = availMap[comp.itemId] || compItem.onHand || 0;
                const shortage = Math.max(0, needed - avail);
                shortageRows.push({
                    compName: compItem.name,
                    compSku: compItem.sku || '',
                    needed,
                    avail,
                    shortage,
                });
            }

            const asmHasShortage = shortageRows.some(r => r.shortage > 0);
            if (!asmHasShortage) continue; // only show assemblies that can't be fully built

            sections.push({
                title: `${asm.name}${asm.sku ? ` (${asm.sku})` : ''}`,
                isSubheading: true,
                extraValue: onHand,
                extraValue2: qtyToBuild,
                spacing: true,
            });
            sections.push({
                title: 'Component',
                isColumnHeader: true,
                col2: 'SKU',
                col3: 'Needed',
                col4: 'On Hand',
                col5: 'Shortage',
                indent: 1,
            });

            for (const row of shortageRows) {
                totalShortages += row.shortage;
                sections.push({
                    title: row.compName,
                    col2: row.compSku,
                    col3: row.needed,
                    col4: row.avail,
                    col5: row.shortage,
                    value: row.shortage,
                    isShortage: row.shortage > 0,
                    indent: 1,
                });
            }
        }

        if (sections.length === 1) {
            sections.push({ title: 'No assembly shortages found. All assemblies can be built with current stock.', indent: 1 });
        }

        sections.push({ title: 'TOTAL SHORTAGE QTY', value: totalShortages, isGrandTotal: true, spacing: true });
        return { sections };
    },

    // ─── Inventory Reorder Report ────────────────────────────────────────────
    // Items whose on-hand quantity has dropped to or below their reorder point.
    // Includes per-warehouse reorder rules when warehouses are configured.
    getInventoryReorderReport: async (fromDate, toDate, userId, companyId) => {
        const Warehouse = require('../models/Warehouse');

        const items = await Item.find({
            userId, companyId,
            type: { $in: ['Inventory Part', 'Inventory Assembly'] },
            isActive: true,
        }).lean();

        const vendors = await Vendor.find({ userId, companyId }).lean();
        const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));

        let warehouses = [];
        try {
            warehouses = await Warehouse.find({ userId, companyId }).lean();
        } catch (_) { /* no warehouse model */ }
        const warehouseMap = Object.fromEntries(warehouses.map(w => [w.id, w]));

        const sections = [{ title: 'Inventory Reorder Report', isHeading: true }];
        const rows = [];

        for (const item of items) {
            const onHand = item.onHand || 0;
            const globalReorder = item.reorderPoint;
            const globalQty = item.reorderQty || 0;

            // Check global reorder point
            if (globalReorder != null && onHand <= globalReorder) {
                const vendor = vendorMap[item.preferredVendorId || item.vendorId];
                rows.push({
                    title: item.name,
                    sku: item.sku || '',
                    value: onHand,
                    extraValue: globalReorder,
                    extraValue2: globalQty,
                    extraValue3: vendor ? vendor.name : '',
                    indent: 1,
                });
                continue; // already listed at global level
            }

            // Check per-warehouse reorder points
            for (const wrp of (item.warehouseReorderPoints || [])) {
                if (wrp.reorderPoint == null) continue;
                const wh = warehouseMap[wrp.warehouseId];
                const whQty = (item.warehouseQuantities || []).find(q => q.warehouseId === wrp.warehouseId)?.onHand || 0;
                if (whQty <= wrp.reorderPoint) {
                    const vendor = vendorMap[item.preferredVendorId || item.vendorId];
                    rows.push({
                        title: `${item.name} [${wh ? wh.name : wrp.warehouseId}]`,
                        sku: item.sku || '',
                        value: whQty,
                        extraValue: wrp.reorderPoint,
                        extraValue2: wrp.reorderQty || 0,
                        extraValue3: vendor ? vendor.name : '',
                        indent: 1,
                    });
                }
            }
        }

        if (rows.length === 0) {
            sections.push({ title: 'No items are at or below their reorder point.', indent: 1 });
        } else {
            sections.push({
                title: 'Item',
                isColumnHeader: true,
                col2: 'SKU',
                col3: 'On Hand',
                col4: 'Reorder Pt',
                col5: 'Reorder Qty',
                col6: 'Preferred Vendor',
            });
            sections.push(...rows);
        }

        sections.push({ title: `ITEMS TO REORDER: ${rows.length}`, value: rows.length, isGrandTotal: true, spacing: true });
        return { sections };
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // QB ENTERPRISE FINANCIAL REPORTS
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── 1. P&L Detail ──────────────────────────────────────────────────────
    getProfitAndLossDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const [transactions, accounts, customers, vendors] = await Promise.all([
            Transaction.find({ userId, companyId, date: { $gte: start, $lte: end } }).lean(),
            Account.find({ userId, companyId }).lean(),
            Customer.find({ userId, companyId }).lean(),
            Vendor.find({ userId, companyId }).lean(),
        ]);

        const custMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
        const vendMap = Object.fromEntries(vendors.map(v => [v.id, v.name]));

        // Accumulate transaction lines per account
        const accLines  = {};
        const accTotals = {};
        accounts.forEach(a => { accLines[a.id] = []; accTotals[a.id] = 0; });

        transactions.forEach(tx => {
            const entityName = custMap[tx.entityId] || vendMap[tx.entityId] || '';
            (tx.items || []).forEach(li => {
                if (li.accountId && accTotals[li.accountId] !== undefined) {
                    accLines[li.accountId].push({
                        date: tx.date, refNo: tx.refNo || '',
                        name: entityName, memo: li.description || tx.memo || '',
                        amount: li.amount || 0, txId: tx.id, txType: tx.type,
                    });
                    accTotals[li.accountId] += (li.amount || 0);
                }
            });
        });

        const sections = [{ title: 'Profit & Loss Detail', isHeading: true }];

        const renderGroup = (type, label) => {
            const accs = accounts.filter(a => a.type === type && accLines[a.id]?.length > 0);
            if (!accs.length) return;
            sections.push({ title: label, isHeading: true, indent: 2 });
            accs.forEach(a => {
                sections.push({ title: a.name, isSubheading: true, indent: 4 });
                accLines[a.id].forEach(line => {
                    sections.push({
                        title: `${line.date}  ${line.refNo}  ${line.name}`,
                        value: line.amount, memo: line.memo,
                        indent: 6, txId: line.txId, isDetail: true,
                    });
                });
                sections.push({ title: `Total ${a.name}`, value: accTotals[a.id], isTotal: true, indent: 4 });
            });
        };

        renderGroup('Income',              'Income');
        renderGroup('Cost of Goods Sold',  'Cost of Goods Sold');
        renderGroup('Expense',             'Expense');
        renderGroup('Other Income',        'Other Income');
        renderGroup('Other Expense',       'Other Expense');

        const sumType = (type) => accounts.filter(a => a.type === type).reduce((s, a) => s + (accTotals[a.id] || 0), 0);
        const income  = sumType('Income');
        const cogs    = sumType('Cost of Goods Sold');
        const expense = sumType('Expense');
        const otherNet = sumType('Other Income') - sumType('Other Expense');

        sections.push({ title: 'Total Income',   value: income,                  isTotal:     true, spacing: true, indent: 0 });
        sections.push({ title: 'Gross Profit',   value: income - cogs,           isTotal:     true, indent: 0 });
        sections.push({ title: 'Total Expense',  value: expense,                 isTotal:     true, indent: 0 });
        sections.push({ title: 'Net Income',     value: income - cogs - expense + otherNet, isGrandTotal: true, spacing: true });

        return applyCustomColumns({ sections }, 'PL_DETAIL', userId, companyId);
    },

    // ─── 2. P&L by Month (columnar) ─────────────────────────────────────────
    getProfitAndLossByMonth: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const [transactions, accounts] = await Promise.all([
            Transaction.find({ userId, companyId, date: { $gte: start, $lte: end } }).lean(),
            Account.find({ userId, companyId }).lean(),
        ]);

        // Generate sorted month keys that fall within range
        const months = [];
        let cur = new Date(start.slice(0, 7) + '-01');
        const endMonth = new Date(end.slice(0, 7) + '-01');
        while (cur <= endMonth) {
            months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
            cur.setMonth(cur.getMonth() + 1);
        }

        const columnLabels = months.map(m => {
            const d = new Date(m + '-01');
            return d.toLocaleString('default', { month: 'short', year: 'numeric' });
        });

        // Per-account per-month totals
        const accMonthly = {};
        accounts.forEach(a => { accMonthly[a.id] = {}; });
        transactions.forEach(tx => {
            const mk = tx.date ? String(tx.date).slice(0, 7) : null;
            if (!mk || !months.includes(mk)) return;
            (tx.items || []).forEach(li => {
                if (li.accountId && accMonthly[li.accountId]) {
                    accMonthly[li.accountId][mk] = (accMonthly[li.accountId][mk] || 0) + (li.amount || 0);
                }
            });
        });

        const mvForAccs = (accs) => months.map(m => accs.reduce((s, a) => s + (accMonthly[a.id]?.[m] || 0), 0));
        const mvRow     = (a)    => months.map(m => accMonthly[a.id]?.[m] || 0);
        const mvTotal   = (mv)   => mv.reduce((s, v) => s + v, 0);
        const mvSub     = (a, b) => a.map((v, i) => v - b[i]);

        const incAccs    = accounts.filter(a => a.type === 'Income');
        const cogsAccs   = accounts.filter(a => a.type === 'Cost of Goods Sold');
        const expAccs    = accounts.filter(a => a.type === 'Expense');
        const otherIAccs = accounts.filter(a => a.type === 'Other Income');
        const otherEAccs = accounts.filter(a => a.type === 'Other Expense');

        const rows = [];

        rows.push({ title: 'Ordinary Income/Expense', isHeading: true });
        rows.push({ title: 'Income', isHeading: true, indent: 2 });
        incAccs.forEach(a => { const mv = mvRow(a); rows.push({ title: a.name, monthValues: mv, total: mvTotal(mv), indent: 4 }); });
        const incMV = mvForAccs(incAccs);
        rows.push({ title: 'Total Income', monthValues: incMV, total: mvTotal(incMV), isTotal: true, indent: 2 });

        rows.push({ title: 'Cost of Goods Sold', isHeading: true, indent: 2, spacing: true });
        cogsAccs.forEach(a => { const mv = mvRow(a); rows.push({ title: a.name, monthValues: mv, total: mvTotal(mv), indent: 4 }); });
        const cogsMV = mvForAccs(cogsAccs);
        rows.push({ title: 'Total COGS', monthValues: cogsMV, total: mvTotal(cogsMV), isTotal: true, indent: 2 });

        const gpMV = mvSub(incMV, cogsMV);
        rows.push({ title: 'Gross Profit', monthValues: gpMV, total: mvTotal(gpMV), isTotal: true, spacing: true });

        rows.push({ title: 'Expense', isHeading: true, indent: 2, spacing: true });
        expAccs.forEach(a => { const mv = mvRow(a); rows.push({ title: a.name, monthValues: mv, total: mvTotal(mv), indent: 4 }); });
        const expMV = mvForAccs(expAccs);
        rows.push({ title: 'Total Expense', monthValues: expMV, total: mvTotal(expMV), isTotal: true, indent: 2 });

        const noiMV = mvSub(gpMV, expMV);
        rows.push({ title: 'Net Ordinary Income', monthValues: noiMV, total: mvTotal(noiMV), isTotal: true, spacing: true });

        rows.push({ title: 'Other Income/Expense', isHeading: true, spacing: true });
        otherIAccs.forEach(a => { const mv = mvRow(a); rows.push({ title: a.name, monthValues: mv, total: mvTotal(mv), indent: 4 }); });
        otherEAccs.forEach(a => { const mv = mvRow(a); rows.push({ title: a.name, monthValues: mv, total: mvTotal(mv), indent: 4 }); });
        const otherNetMV = mvSub(mvForAccs(otherIAccs), mvForAccs(otherEAccs));
        rows.push({ title: 'Net Other Income', monthValues: otherNetMV, total: mvTotal(otherNetMV), isTotal: true, indent: 2 });

        const netMV = noiMV.map((v, i) => v + otherNetMV[i]);
        rows.push({ title: 'Net Income', monthValues: netMV, total: mvTotal(netMV), isGrandTotal: true, spacing: true });

        return { columns: columnLabels, rows };
    },

    // ─── 3. P&L YTD Comparison ──────────────────────────────────────────────
    // Reuses standard P&L with previousYear=true; caller should pass YTD range.
    getProfitAndLossYTD: async (fromDate, toDate, userId, companyId) => {
        return reportService.getProfitAndLoss(fromDate, toDate, userId, companyId, { previousYear: true });
    },

    // ─── 4. P&L Previous Year Comparison ────────────────────────────────────
    getProfitAndLossPrevYear: async (fromDate, toDate, userId, companyId) => {
        return reportService.getProfitAndLoss(fromDate, toDate, userId, companyId, { previousYear: true });
    },

    // ─── 5. Balance Sheet Detail ─────────────────────────────────────────────
    getBalanceSheetDetail: async (toDate, userId, companyId) => {
        const asOf = toDate || new Date().toISOString().split('T')[0];

        const [accounts, transactions, customers, vendors] = await Promise.all([
            Account.find({ userId, companyId }).lean(),
            Transaction.find({ userId, companyId, date: { $lte: asOf } }).lean(),
            Customer.find({ userId, companyId }).lean(),
            Vendor.find({ userId, companyId }).lean(),
        ]);

        const custMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
        const vendMap = Object.fromEntries(vendors.map(v => [v.id, v.name]));

        const accLines  = {};
        const txBal     = {};
        accounts.forEach(a => { accLines[a.id] = []; txBal[a.id] = a.openingBalance || 0; });

        transactions.forEach(tx => {
            const entityName = custMap[tx.entityId] || vendMap[tx.entityId] || '';
            (tx.items || []).forEach(li => {
                if (li.accountId !== undefined && txBal[li.accountId] !== undefined) {
                    accLines[li.accountId].push({
                        date: tx.date, refNo: tx.refNo || '', name: entityName,
                        memo: li.description || tx.memo || '', amount: li.amount || 0, txId: tx.id,
                    });
                    txBal[li.accountId] += (li.amount || 0);
                }
            });
            if (tx.bankAccountId && txBal[tx.bankAccountId] !== undefined) {
                const isDebit = ['INVOICE', 'SALES_RECEIPT', 'DEPOSIT', 'PAYMENT'].includes(tx.type);
                const amt = isDebit ? tx.total : -tx.total;
                accLines[tx.bankAccountId].push({
                    date: tx.date, refNo: tx.refNo || '',
                    name: custMap[tx.entityId] || vendMap[tx.entityId] || '',
                    amount: amt, txId: tx.id,
                });
                txBal[tx.bankAccountId] += amt;
            }
        });

        const bal = (a) => txBal[a.id] || 0;

        const renderAccDetail = (accs, indent) => {
            const out = [];
            accs.forEach(a => {
                if (!accLines[a.id].length && bal(a) === 0) return;
                out.push({ title: a.name, isSubheading: true, indent });
                accLines[a.id].forEach(line => {
                    out.push({ title: `${line.date}  ${line.refNo}  ${line.name}`, value: line.amount, memo: line.memo, indent: indent + 2, txId: line.txId, isDetail: true });
                });
                out.push({ title: `Total ${a.name}`, value: bal(a), isTotal: true, indent });
            });
            return out;
        };

        const bankAccs  = accounts.filter(a => a.type === 'Bank');
        const arAccs    = accounts.filter(a => a.type === 'Accounts Receivable');
        const ocaAccs   = accounts.filter(a => ['Other Current Asset', 'Inventory Asset'].includes(a.type));
        const fixedAccs = accounts.filter(a => a.type === 'Fixed Asset');
        const oaAccs    = accounts.filter(a => a.type === 'Other Asset');
        const apAccs    = accounts.filter(a => a.type === 'Accounts Payable');
        const ccAccs    = accounts.filter(a => a.type === 'Credit Card');
        const oclAccs   = accounts.filter(a => a.type === 'Other Current Liability');
        const ltlAccs   = accounts.filter(a => a.type === 'Long Term Liability');
        const eqAccs    = accounts.filter(a => a.type === 'Equity');

        const sumBal = (accs) => accs.reduce((s, a) => s + bal(a), 0);
        const currentAssets = sumBal(bankAccs) + sumBal(arAccs) + sumBal(ocaAccs);
        const totalAssets   = currentAssets + sumBal(fixedAccs) + sumBal(oaAccs);
        const currentLiab   = sumBal(apAccs)  + sumBal(ccAccs) + sumBal(oclAccs);
        const totalLiab     = currentLiab + sumBal(ltlAccs);

        const pnlData = await reportService.getProfitAndLoss(null, asOf, userId, companyId);
        const retainedEarnings = pnlData.sections.find(s => s.isGrandTotal)?.value || 0;
        const totalEquity = sumBal(eqAccs) + retainedEarnings;

        const sections = [
            { title: `Balance Sheet Detail (as of ${asOf})`, isHeading: true },
            { title: 'ASSETS', isHeading: true },
            { title: 'Current Assets', isHeading: true, indent: 2 },
            { title: 'Checking/Savings', isHeading: true, indent: 4 },
            ...renderAccDetail(bankAccs, 6),
            { title: 'Accounts Receivable', isHeading: true, indent: 4 },
            ...renderAccDetail(arAccs, 6),
            { title: 'Other Current Assets', isHeading: true, indent: 4 },
            ...renderAccDetail(ocaAccs, 6),
            { title: 'Total Current Assets', value: currentAssets, isTotal: true, indent: 2 },
            { title: 'Fixed Assets', isHeading: true, indent: 2, spacing: true },
            ...renderAccDetail(fixedAccs, 4),
            { title: 'Other Assets', isHeading: true, indent: 2 },
            ...renderAccDetail(oaAccs, 4),
            { title: 'TOTAL ASSETS', value: totalAssets, isGrandTotal: true, spacing: true },
            { title: 'LIABILITIES & EQUITY', isHeading: true, spacing: true },
            { title: 'Current Liabilities', isHeading: true, indent: 4 },
            ...renderAccDetail(apAccs, 6),
            ...renderAccDetail(ccAccs, 6),
            ...renderAccDetail(oclAccs, 6),
            { title: 'Total Current Liabilities', value: currentLiab, isTotal: true, indent: 4 },
            { title: 'Long Term Liabilities', isHeading: true, indent: 4, spacing: true },
            ...renderAccDetail(ltlAccs, 6),
            { title: 'Total Liabilities', value: totalLiab, isTotal: true, indent: 2 },
            { title: 'Equity', isHeading: true, indent: 2, spacing: true },
            ...renderAccDetail(eqAccs, 4),
            { title: 'Retained Earnings', value: retainedEarnings, indent: 4 },
            { title: 'Total Equity', value: totalEquity, isTotal: true, indent: 2 },
            { title: 'TOTAL LIABILITIES & EQUITY', value: totalLiab + totalEquity, isGrandTotal: true, spacing: true },
        ];

        return applyCustomColumns({ sections }, 'BS_DETAIL', userId, companyId);
    },

    // ─── 6. Balance Sheet Summary ────────────────────────────────────────────
    getBalanceSheetSummary: async (toDate, userId, companyId) => {
        const asOf = toDate || new Date().toISOString().split('T')[0];

        const [accounts, transactions] = await Promise.all([
            Account.find({ userId, companyId }).lean(),
            Transaction.find({ userId, companyId, date: { $lte: asOf } }).lean(),
        ]);

        const txBal = {};
        accounts.forEach(a => { txBal[a.id] = a.openingBalance || 0; });
        transactions.forEach(tx => {
            (tx.items || []).forEach(li => {
                if (li.accountId && txBal[li.accountId] !== undefined) txBal[li.accountId] += (li.amount || 0);
            });
            if (tx.bankAccountId && txBal[tx.bankAccountId] !== undefined) {
                const isDebit = ['INVOICE', 'SALES_RECEIPT', 'DEPOSIT', 'PAYMENT'].includes(tx.type);
                txBal[tx.bankAccountId] += isDebit ? tx.total : -tx.total;
            }
        });

        const sumType = (...types) => accounts.filter(a => types.includes(a.type)).reduce((s, a) => s + (txBal[a.id] || 0), 0);

        const cash           = sumType('Bank');
        const ar             = sumType('Accounts Receivable');
        const otherCurAssets = sumType('Other Current Asset', 'Inventory Asset');
        const fixedAssets    = sumType('Fixed Asset');
        const otherAssets    = sumType('Other Asset');
        const currentAssets  = cash + ar + otherCurAssets;
        const totalAssets    = currentAssets + fixedAssets + otherAssets;

        const ap             = sumType('Accounts Payable');
        const cc             = sumType('Credit Card');
        const otherCurLiab   = sumType('Other Current Liability');
        const ltl            = sumType('Long Term Liability');
        const currentLiab    = ap + cc + otherCurLiab;
        const totalLiab      = currentLiab + ltl;

        const pnlData = await reportService.getProfitAndLoss(null, asOf, userId, companyId);
        const retainedEarnings = pnlData.sections.find(s => s.isGrandTotal)?.value || 0;
        const equityAccsBal    = sumType('Equity');
        const totalEquity      = equityAccsBal + retainedEarnings;

        const sections = [
            { title: `Balance Sheet Summary (as of ${asOf})`, isHeading: true },
            { title: 'ASSETS', isHeading: true },
            { title: 'Cash & Bank',            value: cash,           indent: 2 },
            { title: 'Accounts Receivable',    value: ar,             indent: 2 },
            { title: 'Other Current Assets',   value: otherCurAssets, indent: 2 },
            { title: 'Total Current Assets',   value: currentAssets,  isTotal: true, indent: 2 },
            { title: 'Fixed Assets',           value: fixedAssets,    indent: 2, spacing: true },
            { title: 'Other Assets',           value: otherAssets,    indent: 2 },
            { title: 'TOTAL ASSETS',           value: totalAssets,    isGrandTotal: true, spacing: true },
            { title: 'LIABILITIES & EQUITY',   isHeading: true, spacing: true },
            { title: 'Accounts Payable',       value: ap,             indent: 2 },
            { title: 'Credit Cards',           value: cc,             indent: 2 },
            { title: 'Other Current Liab.',    value: otherCurLiab,   indent: 2 },
            { title: 'Total Current Liab.',    value: currentLiab,    isTotal: true, indent: 2 },
            { title: 'Long-Term Liabilities',  value: ltl,            indent: 2, spacing: true },
            { title: 'Total Liabilities',      value: totalLiab,      isTotal: true, indent: 2 },
            { title: 'Equity (Accounts)',      value: equityAccsBal,  indent: 2, spacing: true },
            { title: 'Retained Earnings',      value: retainedEarnings, indent: 2 },
            { title: 'Total Equity',           value: totalEquity,    isTotal: true, indent: 2 },
            { title: 'TOTAL LIABILITIES & EQUITY', value: totalLiab + totalEquity, isGrandTotal: true, spacing: true },
        ];

        return applyCustomColumns({ sections }, 'BS_SUMMARY', userId, companyId);
    },

    // ─── 7. Balance Sheet Previous Year Comparison ──────────────────────────
    getBalanceSheetPrevYear: async (toDate, userId, companyId) => {
        const asOf   = toDate || new Date().toISOString().split('T')[0];
        const prevEnd = new Date(asOf);
        prevEnd.setFullYear(prevEnd.getFullYear() - 1);
        const pyDate = prevEnd.toISOString().split('T')[0];

        const buildBals = async (cutoff) => {
            const [accs, txs] = await Promise.all([
                Account.find({ userId, companyId }).lean(),
                Transaction.find({ userId, companyId, date: { $lte: cutoff } }).lean(),
            ]);
            const b = {};
            accs.forEach(a => { b[a.id] = a.openingBalance || 0; });
            txs.forEach(tx => {
                (tx.items || []).forEach(li => { if (li.accountId && b[li.accountId] !== undefined) b[li.accountId] += (li.amount || 0); });
                if (tx.bankAccountId && b[tx.bankAccountId] !== undefined) {
                    const isDebit = ['INVOICE', 'SALES_RECEIPT', 'DEPOSIT', 'PAYMENT'].includes(tx.type);
                    b[tx.bankAccountId] += isDebit ? tx.total : -tx.total;
                }
            });
            return { accs, b };
        };

        const [curr, prev] = await Promise.all([buildBals(asOf), buildBals(pyDate)]);

        // Align account list from current (prev may have same IDs)
        const accMap = Object.fromEntries(curr.accs.map(a => [a.id, a]));
        const sumType = (bals, ...types) => curr.accs.filter(a => types.includes(a.type)).reduce((s, a) => s + (bals[a.id] || 0), 0);

        const [currPnl, prevPnl] = await Promise.all([
            reportService.getProfitAndLoss(null, asOf, userId, companyId),
            reportService.getProfitAndLoss(null, pyDate, userId, companyId),
        ]);
        const currRE = currPnl.sections.find(s => s.isGrandTotal)?.value || 0;
        const prevRE = prevPnl.sections.find(s => s.isGrandTotal)?.value || 0;

        const row = (title, accTypes, indent, isTotal = false, isGrandTotal = false) => {
            const cv = sumType(curr.b, ...accTypes);
            const pv = sumType(prev.b, ...accTypes);
            const chg = cv - pv;
            const pct = pv !== 0 ? (chg / Math.abs(pv)) * 100 : null;
            return { title, value: cv, pyValue: pv, dollarChange: chg, percentChange: pct, indent, isTotal, isGrandTotal };
        };

        const currAssets = sumType(curr.b, 'Bank') + sumType(curr.b, 'Accounts Receivable') + sumType(curr.b, 'Other Current Asset', 'Inventory Asset');
        const prevAssets = sumType(prev.b, 'Bank') + sumType(prev.b, 'Accounts Receivable') + sumType(prev.b, 'Other Current Asset', 'Inventory Asset');
        const currTotalAssets = currAssets + sumType(curr.b, 'Fixed Asset') + sumType(curr.b, 'Other Asset');
        const prevTotalAssets = prevAssets + sumType(prev.b, 'Fixed Asset') + sumType(prev.b, 'Other Asset');
        const currCurLiab  = sumType(curr.b, 'Accounts Payable') + sumType(curr.b, 'Credit Card') + sumType(curr.b, 'Other Current Liability');
        const prevCurLiab  = sumType(prev.b, 'Accounts Payable') + sumType(prev.b, 'Credit Card') + sumType(prev.b, 'Other Current Liability');
        const currTotalLiab = currCurLiab + sumType(curr.b, 'Long Term Liability');
        const prevTotalLiab = prevCurLiab + sumType(prev.b, 'Long Term Liability');
        const currEq = sumType(curr.b, 'Equity') + currRE;
        const prevEq = sumType(prev.b, 'Equity') + prevRE;

        const sections = [
            { title: `Balance Sheet — Prior Year Comparison (as of ${asOf} vs ${pyDate})`, isHeading: true },
            { title: 'ASSETS', isHeading: true },
            row('Cash & Bank',            ['Bank'],                                    2),
            row('Accounts Receivable',    ['Accounts Receivable'],                     2),
            row('Other Current Assets',   ['Other Current Asset', 'Inventory Asset'],  2),
            { title: 'Total Current Assets', value: currAssets, pyValue: prevAssets,
              dollarChange: currAssets - prevAssets, percentChange: prevAssets !== 0 ? ((currAssets - prevAssets) / Math.abs(prevAssets)) * 100 : null,
              isTotal: true, indent: 2 },
            row('Fixed Assets',           ['Fixed Asset'],                             2, false, false),
            row('Other Assets',           ['Other Asset'],                             2),
            { title: 'TOTAL ASSETS', value: currTotalAssets, pyValue: prevTotalAssets,
              dollarChange: currTotalAssets - prevTotalAssets, percentChange: prevTotalAssets !== 0 ? ((currTotalAssets - prevTotalAssets) / Math.abs(prevTotalAssets)) * 100 : null,
              isGrandTotal: true, spacing: true },
            { title: 'LIABILITIES & EQUITY', isHeading: true, spacing: true },
            row('Accounts Payable',       ['Accounts Payable'],                        2),
            row('Credit Cards',           ['Credit Card'],                             2),
            row('Other Current Liab.',    ['Other Current Liability'],                 2),
            { title: 'Total Current Liab.', value: currCurLiab, pyValue: prevCurLiab,
              dollarChange: currCurLiab - prevCurLiab, percentChange: prevCurLiab !== 0 ? ((currCurLiab - prevCurLiab) / Math.abs(prevCurLiab)) * 100 : null,
              isTotal: true, indent: 2 },
            row('Long-Term Liabilities',  ['Long Term Liability'],                     2),
            { title: 'Total Liabilities', value: currTotalLiab, pyValue: prevTotalLiab,
              dollarChange: currTotalLiab - prevTotalLiab, percentChange: prevTotalLiab !== 0 ? ((currTotalLiab - prevTotalLiab) / Math.abs(prevTotalLiab)) * 100 : null,
              isTotal: true, indent: 2 },
            { title: 'Total Equity', value: currEq, pyValue: prevEq,
              dollarChange: currEq - prevEq, percentChange: prevEq !== 0 ? ((currEq - prevEq) / Math.abs(prevEq)) * 100 : null,
              isTotal: true, indent: 2, spacing: true },
            { title: 'TOTAL LIABILITIES & EQUITY', value: currTotalLiab + currEq, pyValue: prevTotalLiab + prevEq,
              dollarChange: (currTotalLiab + currEq) - (prevTotalLiab + prevEq),
              percentChange: (prevTotalLiab + prevEq) !== 0 ? (((currTotalLiab + currEq) - (prevTotalLiab + prevEq)) / Math.abs(prevTotalLiab + prevEq)) * 100 : null,
              isGrandTotal: true, spacing: true },
        ];

        return applyCustomColumns({ sections, meta: { asOf, pyDate } }, 'BS_PREV_YEAR', userId, companyId);
    },

    // ─── 8. Income Tax Summary / Detail ─────────────────────────────────────
    getIncomeTaxSummary: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const [transactions, accounts] = await Promise.all([
            Transaction.find({ userId, companyId, date: { $gte: start, $lte: end } }).lean(),
            Account.find({ userId, companyId }).lean(),
        ]);

        // Build account totals
        const accTotals = {};
        accounts.forEach(a => { accTotals[a.id] = 0; });
        transactions.forEach(tx => {
            (tx.items || []).forEach(li => {
                if (li.accountId && accTotals[li.accountId] !== undefined) accTotals[li.accountId] += (li.amount || 0);
            });
        });

        // Map account types → IRS tax line categories (QB-style)
        const TAX_LINES = {
            'Income':             'Gross Receipts or Sales',
            'Other Income':       'Other Income',
            'Cost of Goods Sold': 'Cost of Goods Sold',
            'Expense':            'Ordinary Business Expenses',
            'Other Expense':      'Other Deductions',
        };

        const categories = {};
        accounts.forEach(a => {
            const line = TAX_LINES[a.type];
            if (!line) return;
            if (!categories[line]) categories[line] = { accounts: [], total: 0 };
            categories[line].accounts.push({ name: a.name, value: accTotals[a.id] || 0 });
            categories[line].total += (accTotals[a.id] || 0);
        });

        const sections = [
            { title: `Income Tax Summary (${start} — ${end})`, isHeading: true },
            { title: 'Based on your chart of accounts mapped to standard tax categories.', isSubheading: true },
        ];

        const orderedLines = [
            'Gross Receipts or Sales',
            'Other Income',
            'Cost of Goods Sold',
            'Ordinary Business Expenses',
            'Other Deductions',
        ];

        let grossIncome   = 0;
        let totalDeductions = 0;

        orderedLines.forEach(line => {
            const cat = categories[line];
            if (!cat || cat.total === 0) return;
            sections.push({ title: line, isHeading: true, indent: 2, spacing: true });
            cat.accounts.filter(a => a.value !== 0).forEach(a => {
                sections.push({ title: a.name, value: a.value, indent: 4 });
            });
            sections.push({ title: `Total ${line}`, value: cat.total, isTotal: true, indent: 2 });

            if (['Gross Receipts or Sales', 'Other Income'].includes(line)) grossIncome += cat.total;
            if (['Cost of Goods Sold', 'Ordinary Business Expenses', 'Other Deductions'].includes(line)) totalDeductions += cat.total;
        });

        const taxableIncome = grossIncome - totalDeductions;
        sections.push({ title: 'Total Gross Income',   value: grossIncome,    isTotal:     true, spacing: true });
        sections.push({ title: 'Total Deductions',     value: totalDeductions, isTotal:    true });
        sections.push({ title: 'Estimated Taxable Income', value: taxableIncome, isGrandTotal: true, spacing: true });

        return applyCustomColumns({ sections }, 'INCOME_TAX', userId, companyId);
    },

    // ─── 9. Missing Checks ───────────────────────────────────────────────────
    getMissingChecks: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const [checks, allVendors, allCustomers, allAccounts] = await Promise.all([
            Transaction.find({
                userId, companyId,
                type: { $in: ['CHECK', 'BILL_PAYMENT', 'PAYROLL_CHECK'] },
                date: { $gte: start, $lte: end },
            }).sort({ refNo: 1 }).lean(),
            Vendor.find({ userId, companyId }).lean(),
            Customer.find({ userId, companyId }).lean(),
            Account.find({ userId, companyId }).lean(),
        ]);
        const entityNameMap = Object.fromEntries([
            ...allVendors.map(v => [v.id, v.name]),
            ...allCustomers.map(c => [c.id, c.name]),
        ]);
        const accountNameMap = Object.fromEntries(allAccounts.map(a => [a.id, a.name]));

        // Extract numeric portions of check numbers for gap analysis
        const parseNum = (ref) => {
            if (!ref) return null;
            const m = String(ref).match(/(\d+)$/);
            return m ? parseInt(m[1], 10) : null;
        };

        // Group by bank account
        const byAccount = {};
        checks.forEach(tx => {
            const acctKey = tx.bankAccountId || tx.accountId || 'Unknown Account';
            const acctLabel = accountNameMap[acctKey] || acctKey;
            if (!byAccount[acctLabel]) byAccount[acctLabel] = [];
            const num = parseNum(tx.refNo);
            if (num !== null) byAccount[acctLabel].push({
                num, refNo: tx.refNo, date: tx.date,
                payee: entityNameMap[tx.entityId] || '',
                amount: tx.total, id: tx.id,
            });
        });

        const sections = [
            { title: `Missing Checks (${start} — ${end})`, isHeading: true },
        ];

        let totalMissing = 0;
        const missingRows = [];

        Object.entries(byAccount).forEach(([acctKey, items]) => {
            if (!items.length) return;
            items.sort((a, b) => a.num - b.num);
            sections.push({ title: `Account: ${acctKey}`, isSubheading: true, indent: 2, spacing: true });

            // Find gaps
            const gaps = [];
            for (let i = 0; i < items.length - 1; i++) {
                const curr = items[i];
                const next = items[i + 1];
                if (next.num - curr.num > 1) {
                    for (let missing = curr.num + 1; missing < next.num; missing++) {
                        gaps.push(missing);
                        totalMissing++;
                    }
                }
            }

            if (gaps.length === 0) {
                sections.push({ title: 'No gaps found — check sequence is complete.', indent: 4, value: null });
            } else {
                gaps.forEach(n => {
                    sections.push({ title: `Check #${n}`, value: null, indent: 4, isMissing: true });
                    missingRows.push(n);
                });
                sections.push({
                    title: `${gaps.length} missing check${gaps.length !== 1 ? 's' : ''} in this account`,
                    isTotal: true, indent: 2, value: gaps.length,
                });
            }
        });

        if (!Object.keys(byAccount).length) {
            sections.push({ title: 'No check transactions found in the selected date range.', indent: 2 });
        }

        sections.push({ title: `TOTAL MISSING CHECKS: ${totalMissing}`, value: totalMissing, isGrandTotal: true, spacing: true });
        return { sections, totalMissing };
    },

    // ══════════════════════════════════════════════════════════════════════════
    // QB ENTERPRISE SALES REPORTS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Sales by Customer Detail
     * Lists every invoice/sales-receipt line item grouped by customer.
     * QB Desktop parity: shows Date, Ref No, Item, Qty, Rate, Amount per line.
     */
    getSalesByCustomerDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const [transactions, customers, items] = await Promise.all([
            Transaction.find({
                type: { $in: ['INVOICE', 'SALES_RECEIPT'] },
                date: { $gte: start, $lte: end },
                userId,
                companyId,
            }).lean(),
            Customer.find({ userId, companyId }).lean(),
            Item.find({ userId, companyId }).lean(),
        ]);

        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
        const itemMap     = Object.fromEntries(items.map(i => [i.id, i.name]));

        // Group transactions by customer
        const byCustomer = {};
        for (const txn of transactions) {
            const custId   = txn.entityId || txn.customerId || '__NONE__';
            const custName = customerMap[custId] || (custId === '__NONE__' ? 'No Customer' : custId);
            if (!byCustomer[custId]) byCustomer[custId] = { name: custName, lines: [], total: 0 };

            for (const line of (txn.items || [])) {
                const amount = line.amount || (line.quantity * line.rate) || 0;
                byCustomer[custId].lines.push({
                    date:   txn.date,
                    refNo:  txn.refNo || txn.id,
                    type:   txn.type === 'INVOICE' ? 'Invoice' : 'Sales Receipt',
                    item:   itemMap[line.itemId] || line.description || '—',
                    qty:    line.quantity  || 0,
                    rate:   line.rate      || 0,
                    amount,
                });
                byCustomer[custId].total += amount;
            }
            // If no line items fall through, still credit the header total
            if (!(txn.items || []).length) {
                byCustomer[custId].total += txn.total || 0;
            }
        }

        const sections = [
            { title: `Sales by Customer Detail (${start} to ${end})`, isHeading: true },
        ];

        const sortedCustomers = Object.values(byCustomer).sort((a, b) => a.name.localeCompare(b.name));
        let grandTotal = 0;

        for (const cust of sortedCustomers) {
            if (!cust.lines.length) continue;
            sections.push({ title: cust.name, isSubheading: true, indent: 1 });
            for (const line of cust.lines) {
                sections.push({
                    title:      `${line.date}  |  ${line.type} ${line.refNo}  |  ${line.item}`,
                    value:      line.amount,
                    extraValue: line.qty,
                    extraValue2: line.rate,
                    indent:     2,
                    meta: { date: line.date, refNo: line.refNo, type: line.type, item: line.item, qty: line.qty, rate: line.rate },
                });
            }
            sections.push({ title: `Total ${cust.name}`, value: cust.total, isTotal: true, indent: 1 });
            grandTotal += cust.total;
        }

        sections.push({ title: 'TOTAL SALES', value: grandTotal, isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Sales by Rep Summary
     * Totals per sales rep for the period.
     */
    getSalesByRepSummary: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const [transactions, salesReps, customers] = await Promise.all([
            Transaction.find({
                type: { $in: ['INVOICE', 'SALES_RECEIPT'] },
                date: { $gte: start, $lte: end },
                userId,
                companyId,
            }).lean(),
            SalesRep.find({ userId, companyId }).lean(),
            Customer.find({ userId, companyId }).lean(),
        ]);

        const repMap      = Object.fromEntries(salesReps.map(r => [r.id, r.initials || r.id]));
        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

        const byRep = {};
        for (const txn of transactions) {
            const repId   = txn.salesRepId || '__NONE__';
            const repName = repMap[repId] || (repId === '__NONE__' ? 'No Sales Rep' : repId);
            if (!byRep[repId]) byRep[repId] = { name: repName, total: 0, count: 0 };
            byRep[repId].total += txn.total || 0;
            byRep[repId].count += 1;
        }

        const sections = [
            { title: `Sales by Rep Summary (${start} to ${end})`, isHeading: true },
            { title: 'Sales Rep', extraValue: 'Transactions', extraValue2: 'Amount', isColumnHeader: true },
        ];

        const rows = Object.values(byRep).sort((a, b) => b.total - a.total);
        for (const rep of rows) {
            sections.push({
                title:       rep.name,
                value:       rep.total,
                extraValue:  rep.count,
                indent:      2,
            });
        }

        const grandTotal = rows.reduce((s, r) => s + r.total, 0);
        sections.push({ title: 'TOTAL SALES', value: grandTotal, isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Sales by Rep Detail
     * Lists every invoice/sales-receipt grouped by sales rep, then by customer.
     */
    getSalesByRepDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const [transactions, salesReps, customers] = await Promise.all([
            Transaction.find({
                type: { $in: ['INVOICE', 'SALES_RECEIPT'] },
                date: { $gte: start, $lte: end },
                userId,
                companyId,
            }).lean(),
            SalesRep.find({ userId, companyId }).lean(),
            Customer.find({ userId, companyId }).lean(),
        ]);

        const repMap      = Object.fromEntries(salesReps.map(r => [r.id, r.initials || r.id]));
        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

        // byRep[repId][custId] = { custName, txns[], subtotal }
        const byRep = {};
        for (const txn of transactions) {
            const repId   = txn.salesRepId || '__NONE__';
            const repName = repMap[repId]   || (repId   === '__NONE__' ? 'No Sales Rep' : repId);
            const custId  = txn.entityId   || txn.customerId || '__NONE__';
            const custName= customerMap[custId] || (custId === '__NONE__' ? 'No Customer' : custId);

            if (!byRep[repId]) byRep[repId] = { name: repName, total: 0, customers: {} };
            if (!byRep[repId].customers[custId]) byRep[repId].customers[custId] = { name: custName, total: 0, txns: [] };

            byRep[repId].customers[custId].txns.push({
                date:   txn.date,
                refNo:  txn.refNo || txn.id,
                type:   txn.type === 'INVOICE' ? 'Invoice' : 'Sales Receipt',
                amount: txn.total || 0,
            });
            byRep[repId].customers[custId].total += txn.total || 0;
            byRep[repId].total += txn.total || 0;
        }

        const sections = [
            { title: `Sales by Rep Detail (${start} to ${end})`, isHeading: true },
        ];

        let grandTotal = 0;
        const sortedReps = Object.values(byRep).sort((a, b) => a.name.localeCompare(b.name));

        for (const rep of sortedReps) {
            sections.push({ title: rep.name, isSubheading: true, indent: 0 });
            const sortedCusts = Object.values(rep.customers).sort((a, b) => a.name.localeCompare(b.name));
            for (const cust of sortedCusts) {
                sections.push({ title: cust.name, isSubheading: true, indent: 1 });
                for (const txn of cust.txns) {
                    sections.push({
                        title:  `${txn.date}  |  ${txn.type} ${txn.refNo}`,
                        value:  txn.amount,
                        indent: 2,
                        meta:   { date: txn.date, refNo: txn.refNo, type: txn.type },
                    });
                }
                sections.push({ title: `Total ${cust.name}`, value: cust.total, isTotal: true, indent: 1 });
            }
            sections.push({ title: `Total ${rep.name}`, value: rep.total, isTotal: true, indent: 0, spacing: true });
            grandTotal += rep.total;
        }

        sections.push({ title: 'TOTAL SALES', value: grandTotal, isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Sales Order Fulfillment Worksheet
     * Open sales orders with per-line quantity ordered vs shipped vs backordered.
     * QB Enterprise parity: one row per SO line, grouped by SO.
     */
    getSalesOrderFulfillmentWorksheet: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const [salesOrders, customers, items] = await Promise.all([
            Transaction.find({
                type:   'SALES_ORDER',
                status: { $in: ['OPEN', 'PARTIAL'] },
                date:   { $gte: start, $lte: end },
                userId,
                companyId,
            }).lean(),
            Customer.find({ userId, companyId }).lean(),
            Item.find({ userId, companyId }).lean(),
        ]);

        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
        const itemMap     = Object.fromEntries(items.map(i => [i.id, i.name]));

        const sections = [
            { title: `Sales Order Fulfillment Worksheet (${start} to ${end})`, isHeading: true },
            {
                title: 'SO#  |  Customer  |  Item',
                extraValue:  'Ordered',
                extraValue2: 'Invoiced',
                isColumnHeader: true,
            },
        ];

        if (!salesOrders.length) {
            sections.push({ title: 'No open sales orders in the selected date range.', indent: 2 });
            sections.push({ title: 'TOTAL OPEN', value: 0, isGrandTotal: true, spacing: true });
            return { sections };
        }

        // Sort by date then refNo
        salesOrders.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

        let grandOrdered = 0;
        let grandInvoiced = 0;

        for (const so of salesOrders) {
            const custName = customerMap[so.entityId || so.customerId] || 'Unknown Customer';
            const soLabel  = `SO ${so.refNo || so.id}  —  ${so.date}  —  ${custName}`;

            sections.push({ title: soLabel, isSubheading: true, indent: 1 });

            for (const line of (so.items || [])) {
                const itemName    = itemMap[line.itemId] || line.description || '—';
                const qtyOrdered  = line.quantity         || 0;
                const qtyInvoiced = line.receivedQuantity || 0;  // reused field for shipped qty
                const qtyBackorder = Math.max(0, qtyOrdered - qtyInvoiced);
                const isClosed    = line.isClosed || false;

                sections.push({
                    title:      itemName,
                    value:      qtyBackorder,          // remaining / backordered qty
                    extraValue: qtyOrdered,
                    extraValue2: qtyInvoiced,
                    indent:     2,
                    meta: {
                        itemId:    line.itemId,
                        ordered:   qtyOrdered,
                        invoiced:  qtyInvoiced,
                        backorder: qtyBackorder,
                        isClosed,
                        rate:      line.rate || 0,
                        amount:    line.amount || 0,
                    },
                });
                grandOrdered  += qtyOrdered;
                grandInvoiced += qtyInvoiced;
            }

            const soBackorder = (so.items || []).reduce((s, l) =>
                s + Math.max(0, (l.quantity || 0) - (l.receivedQuantity || 0)), 0);
            sections.push({
                title:       `Total Open Qty for ${so.refNo || so.id}`,
                value:       soBackorder,
                isTotal:     true,
                indent:      1,
            });
        }

        sections.push({
            title:       'TOTAL OPEN (all SOs)',
            value:       grandOrdered - grandInvoiced,
            extraValue:  grandOrdered,
            extraValue2: grandInvoiced,
            isGrandTotal: true,
            spacing:     true,
        });
        return { sections };
    },

    /**
     * Pending Sales
     * All SALES_ORDER transactions that are OPEN or PARTIAL, showing customer,
     * date, expected ship date, amount, and backorder status.
     */
    getPendingSales: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const [salesOrders, customers] = await Promise.all([
            Transaction.find({
                type:   'SALES_ORDER',
                status: { $in: ['OPEN', 'PARTIAL'] },
                date:   { $gte: start, $lte: end },
                userId,
                companyId,
            }).lean(),
            Customer.find({ userId, companyId }).lean(),
        ]);

        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

        const sections = [
            { title: `Pending Sales (${start} to ${end})`, isHeading: true },
            {
                title:       'Date  |  SO#  |  Customer',
                extraValue:  'Expected Ship',
                extraValue2: 'Amount',
                isColumnHeader: true,
            },
        ];

        if (!salesOrders.length) {
            sections.push({ title: 'No pending sales orders in the selected date range.', indent: 2 });
            sections.push({ title: 'TOTAL PENDING', value: 0, isGrandTotal: true, spacing: true });
            return { sections };
        }

        salesOrders.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

        let grandTotal = 0;
        for (const so of salesOrders) {
            const custName   = customerMap[so.entityId || so.customerId] || 'Unknown Customer';
            const expectedShip = so.expectedDate || so.shipDate || '—';
            const backorder  = so.backorderStatus || 'NONE';

            sections.push({
                title:       `${so.date}  |  SO ${so.refNo || so.id}  |  ${custName}`,
                value:       so.total || 0,
                extraValue:  expectedShip,
                extraValue2: backorder,
                indent:      2,
                meta: {
                    soId:      so.id,
                    refNo:     so.refNo,
                    customer:  custName,
                    date:      so.date,
                    expected:  expectedShip,
                    status:    so.status,
                    backorder,
                    amount:    so.total || 0,
                },
            });
            grandTotal += so.total || 0;
        }

        sections.push({ title: 'TOTAL PENDING SALES', value: grandTotal, isGrandTotal: true, spacing: true });
        return { sections };
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // QB ENTERPRISE — VENDORS / PURCHASES REPORTS
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── 1. AP Aging Detail ─────────────────────────────────────────────────
    // Individual unpaid bill lines per vendor with aging buckets — QB parity.
    getAPAgingDetail: async (fromDate, toDate, userId, companyId) => {
        const asOf = toDate || new Date().toISOString().split('T')[0];

        const [bills, vendors, payments] = await Promise.all([
            Transaction.find({
                userId, companyId,
                type: 'BILL',
                status: { $in: ['OPEN', 'Open', 'PARTIAL', 'Partial'] },
                date: { $lte: asOf },
            }).sort({ entityId: 1, date: 1 }).lean(),
            Vendor.find({ userId, companyId }).lean(),
            // Only payments on or before asOf — future payments must not reduce historical balance
            Transaction.find({
                userId, companyId,
                type: 'BILL_PAYMENT',
                date: { $lte: asOf },
            }).lean(),
        ]);

        const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));

        // Build applied-payment map: billId → amount paid toward that bill.
        // A single BILL_PAYMENT can cover multiple bills; without per-bill split data we
        // allocate the payment equally across all referenced bills (same as QB).
        const paidMap = {};
        payments.forEach(pmt => {
            const refs = (pmt.appliedCreditIds || []).filter(Boolean);
            if (!refs.length) return;
            const perBill = (pmt.total || 0) / refs.length;
            refs.forEach(billId => {
                paidMap[billId] = (paidMap[billId] || 0) + perBill;
            });
        });

        const agingTotals = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0 };
        const sections = [
            { title: `A/P Aging Detail (as of ${asOf})`, isHeading: true },
        ];

        const byVendor = {};
        bills.forEach(bill => {
            const vid = bill.entityId || bill.vendorId;
            if (!vid) return;  // skip bills with no vendor reference
            if (!byVendor[vid]) byVendor[vid] = [];
            byVendor[vid].push(bill);
        });

        let grandTotal = 0;

        for (const vid of Object.keys(byVendor).sort((a, b) =>
            (vendorMap[a]?.name || a).localeCompare(vendorMap[b]?.name || b)
        )) {
            const vendor = vendorMap[vid];
            const vName = vendor ? vendor.name : `[Unknown Vendor: ${vid}]`;
            const vBuckets = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0 };
            const billRows = [];

            for (const bill of byVendor[vid]) {
                const due = new Date(bill.dueDate || bill.date);
                const asOfDate = new Date(asOf);
                const daysLate = Math.floor((asOfDate - due) / 86400000);
                const paid = paidMap[bill.id] || 0;
                const openBal = Math.max(0, (bill.total || 0) - paid);
                if (openBal === 0) continue;

                let bucket = 'current';
                if (daysLate > 90)      bucket = 'over90';
                else if (daysLate > 60) bucket = 'days61_90';
                else if (daysLate > 30) bucket = 'days31_60';
                else if (daysLate > 0)  bucket = 'days1_30';

                vBuckets[bucket] += openBal;

                billRows.push({
                    title: `${bill.date}  Bill #${bill.refNo || bill.id.slice(-8)}`,
                    value: openBal,
                    dueDate: bill.dueDate || bill.date,
                    daysOverdue: Math.max(0, daysLate),
                    agingBucket: bucket,
                    current:   bucket === 'current'   ? openBal : 0,
                    days1_30:  bucket === 'days1_30'  ? openBal : 0,
                    days31_60: bucket === 'days31_60' ? openBal : 0,
                    days61_90: bucket === 'days61_90' ? openBal : 0,
                    over90:    bucket === 'over90'    ? openBal : 0,
                    indent: 2,
                    txId: bill.id,
                });
            }

            const vendorTotal = Math.round(Object.values(vBuckets).reduce((s, v) => s + v, 0) * 100) / 100;
            if (vendorTotal === 0) continue;

            sections.push({ title: vName, isSubheading: true, spacing: true });
            sections.push(...billRows);
            sections.push({
                title: `Total ${vName}`,
                value: vendorTotal,
                current:   Math.round(vBuckets.current   * 100) / 100,
                days1_30:  Math.round(vBuckets.days1_30  * 100) / 100,
                days31_60: Math.round(vBuckets.days31_60 * 100) / 100,
                days61_90: Math.round(vBuckets.days61_90 * 100) / 100,
                over90:    Math.round(vBuckets.over90    * 100) / 100,
                isTotal: true, indent: 2,
            });

            Object.keys(agingTotals).forEach(k => { agingTotals[k] += vBuckets[k]; });
            grandTotal += vendorTotal;
        }

        if (grandTotal === 0) {
            sections.push({ title: 'No open bills found as of the selected date.', indent: 2 });
        }

        sections.push({
            title: 'TOTAL A/P',
            value: Math.round(grandTotal * 100) / 100,
            current:   Math.round(agingTotals.current   * 100) / 100,
            days1_30:  Math.round(agingTotals.days1_30  * 100) / 100,
            days31_60: Math.round(agingTotals.days31_60 * 100) / 100,
            days61_90: Math.round(agingTotals.days61_90 * 100) / 100,
            over90:    Math.round(agingTotals.over90    * 100) / 100,
            isGrandTotal: true, spacing: true,
        });

        return applyCustomColumns({ sections }, 'AP_AGING_DETAIL', userId, companyId);
    },

    // ─── 2. Vendor Balance Detail ────────────────────────────────────────────
    // All transactions per vendor in the date range with running balance,
    // matching QB Desktop "Vendor Balance Detail" report.
    getVendorBalanceDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || new Date().toISOString().split('T')[0];

        // PURCHASE_ORDER is intentionally excluded — POs are commitments, not AP transactions.
        // ITEM_RECEIPT is excluded too: it posts to inventory/COGS, the matching BILL posts to AP.
        const VENDOR_TX_TYPES = ['BILL', 'BILL_PAYMENT', 'CREDIT_MEMO', 'CHECK', 'EXPENSE'];

        const [transactions, vendors] = await Promise.all([
            Transaction.find({
                userId, companyId,
                type: { $in: VENDOR_TX_TYPES },
                date: { $gte: start, $lte: end },
            }).sort({ entityId: 1, date: 1, refNo: 1 }).lean(),
            Vendor.find({ userId, companyId }).lean(),
        ]);

        const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));

        const byVendor = {};
        transactions.forEach(tx => {
            const vid = tx.entityId || tx.vendorId;
            if (!vid) return;
            if (!byVendor[vid]) byVendor[vid] = [];
            byVendor[vid].push(tx);
        });

        const sections = [
            { title: `Vendor Balance Detail (${start} — ${end})`, isHeading: true },
        ];

        let grandBalance = 0;

        for (const vid of Object.keys(byVendor).sort((a, b) =>
            (vendorMap[a]?.name || a).localeCompare(vendorMap[b]?.name || b)
        )) {
            const vendor = vendorMap[vid];
            const vName = vendor ? vendor.name : `[Unknown Vendor: ${vid}]`;
            sections.push({ title: vName, isSubheading: true, spacing: true });

            let runningBalance = 0;

            for (const tx of byVendor[vid]) {
                // Bills & receipts increase AP; payments & credits decrease it
                const isCredit = ['BILL_PAYMENT', 'CHECK', 'CREDIT_MEMO'].includes(tx.type);
                const signed = isCredit ? -(tx.total || 0) : (tx.total || 0);
                runningBalance += signed;

                sections.push({
                    title: `${tx.date}  ${tx.type.replace(/_/g, ' ')}  #${tx.refNo || tx.id.slice(-8)}`,
                    value: signed,
                    balance: runningBalance,
                    memo: tx.memo || '',
                    indent: 2,
                    txId: tx.id,
                    txType: tx.type,
                    isCredit,
                });
            }

            sections.push({
                title: `Total ${vName}`,
                value: runningBalance,
                isTotal: true, indent: 2,
            });
            grandBalance += runningBalance;
        }

        if (Object.keys(byVendor).length === 0) {
            sections.push({ title: 'No vendor transactions found for the selected date range.', indent: 2 });
        }

        sections.push({ title: 'TOTAL', value: grandBalance, isGrandTotal: true, spacing: true });
        return applyCustomColumns({ sections }, 'VENDOR_BALANCE_DETAIL', userId, companyId);
    },

    // ─── 3. Unpaid Bills Detail ──────────────────────────────────────────────
    // All open bills as of asOf date, grouped by vendor, with aging and terms.
    getUnpaidBillsDetail: async (fromDate, toDate, userId, companyId) => {
        const asOf = toDate || new Date().toISOString().split('T')[0];

        const [bills, vendors, payments] = await Promise.all([
            Transaction.find({
                userId, companyId,
                type: 'BILL',
                status: { $in: ['OPEN', 'Open', 'PARTIAL', 'Partial'] },
                date: { $lte: asOf },
            }).sort({ entityId: 1, dueDate: 1 }).lean(),
            Vendor.find({ userId, companyId }).lean(),
            Transaction.find({ userId, companyId, type: 'BILL_PAYMENT' }).lean(),
        ]);

        const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));

        // Equal-split allocation: without per-bill amounts on the payment record,
        // divide payment total equally across all referenced bill IDs (QB approach).
        const paidMap = {};
        payments.forEach(pmt => {
            const refs = (pmt.appliedCreditIds || []).filter(Boolean);
            if (!refs.length) return;
            const perBill = (pmt.total || 0) / refs.length;
            refs.forEach(billId => {
                paidMap[billId] = (paidMap[billId] || 0) + perBill;
            });
        });

        const byVendor = {};
        bills.forEach(bill => {
            const vid = bill.entityId || bill.vendorId;
            if (!vid) return;  // skip bills with no vendor reference
            if (!byVendor[vid]) byVendor[vid] = [];
            byVendor[vid].push(bill);
        });

        const sections = [
            { title: `Unpaid Bills Detail (as of ${asOf})`, isHeading: true },
        ];

        let grandTotal = 0;
        let totalBillCount = 0;

        for (const vid of Object.keys(byVendor).sort((a, b) =>
            (vendorMap[a]?.name || a).localeCompare(vendorMap[b]?.name || b)
        )) {
            const vendor = vendorMap[vid];
            const vName = vendor ? vendor.name : `[Unknown Vendor: ${vid}]`;
            const billRows = [];
            let vendorTotal = 0;

            for (const bill of byVendor[vid]) {
                const paid = paidMap[bill.id] || 0;
                const openBal = Math.max(0, (bill.total || 0) - paid);
                if (openBal === 0) continue;

                const due = new Date(bill.dueDate || bill.date);
                const daysOverdue = Math.max(0, Math.floor((new Date(asOf) - due) / 86400000));

                vendorTotal += openBal;
                totalBillCount++;

                billRows.push({
                    title: `Bill #${bill.refNo || bill.id.slice(-8)}`,
                    value: openBal,
                    billDate: bill.date,
                    dueDate: bill.dueDate || bill.date,
                    daysOverdue,
                    terms: bill.terms || '',
                    memo: bill.memo || '',
                    amountDue: bill.total || 0,
                    amountPaid: paid,
                    indent: 2,
                    txId: bill.id,
                    isOverdue: daysOverdue > 0,
                });
            }

            if (vendorTotal === 0) continue;

            sections.push({ title: vName, isSubheading: true, spacing: true });
            sections.push(...billRows);
            sections.push({ title: `Total ${vName}`, value: vendorTotal, isTotal: true, indent: 2 });
            grandTotal += vendorTotal;
        }

        if (totalBillCount === 0) {
            sections.push({ title: 'No unpaid bills found.', indent: 2 });
        }

        sections.push({
            title: `TOTAL UNPAID BILLS (${totalBillCount})`,
            value: grandTotal,
            isGrandTotal: true, spacing: true,
        });

        return applyCustomColumns({ sections }, 'UNPAID_BILLS_DETAIL', userId, companyId);
    },

    // ─── 4. Bills and Applied Payments ──────────────────────────────────────
    // Each bill paired with all payments applied to it — QB parity.
    getBillsAndAppliedPayments: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const [bills, payments, vendors] = await Promise.all([
            Transaction.find({
                userId, companyId,
                type: 'BILL',
                date: { $gte: start, $lte: end },
            }).sort({ entityId: 1, date: 1 }).lean(),
            // Fetch ALL payments — a payment made outside the date range can still
            // be applied to a bill inside the range (QB parity).
            Transaction.find({ userId, companyId, type: 'BILL_PAYMENT' }).lean(),
            Vendor.find({ userId, companyId }).lean(),
        ]);

        const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));

        // Index payments by applied bill ids
        const paymentsByBill = {};
        payments.forEach(pmt => {
            (pmt.appliedCreditIds || []).forEach(billId => {
                if (!paymentsByBill[billId]) paymentsByBill[billId] = [];
                paymentsByBill[billId].push(pmt);
            });
        });

        const byVendor = {};
        bills.forEach(bill => {
            const vid = bill.entityId || bill.vendorId;
            if (!byVendor[vid]) byVendor[vid] = [];
            byVendor[vid].push(bill);
        });

        const sections = [
            { title: `Bills and Applied Payments (${start} — ${end})`, isHeading: true },
        ];

        let grandBillTotal = 0;
        let grandPaidTotal = 0;

        for (const vid of Object.keys(byVendor).sort((a, b) =>
            (vendorMap[a]?.name || a).localeCompare(vendorMap[b]?.name || b)
        )) {
            const vendor = vendorMap[vid];
            const vName = vendor ? vendor.name : `[Unknown Vendor: ${vid}]`;
            sections.push({ title: vName, isSubheading: true, spacing: true });

            let vBillTotal = 0;
            let vPaidTotal = 0;

            for (const bill of byVendor[vid]) {
                const billAmt = bill.total || 0;
                vBillTotal += billAmt;
                grandBillTotal += billAmt;

                sections.push({
                    title: `${bill.date}  Bill #${bill.refNo || bill.id.slice(-8)}`,
                    value: billAmt,
                    billDate: bill.date,
                    dueDate: bill.dueDate || '',
                    memo: bill.memo || '',
                    indent: 2,
                    txId: bill.id,
                    isBill: true,
                });

                // Applied payments — equal-split allocation across referenced bills
                const applied = paymentsByBill[bill.id] || [];
                let billPaid = 0;
                applied.forEach(pmt => {
                    const refs = (pmt.appliedCreditIds || []).filter(Boolean);
                    const applyCount = Math.max(1, refs.length);
                    const appliedAmt = (pmt.total || 0) / applyCount;
                    billPaid += appliedAmt;
                    vPaidTotal += appliedAmt;
                    grandPaidTotal += appliedAmt;

                    sections.push({
                        title: `  Payment #${pmt.refNo || pmt.id.slice(-8)}  ${pmt.date}`,
                        value: -appliedAmt,
                        paymentDate: pmt.date,
                        paymentMethod: pmt.paymentMethod || '',
                        indent: 4,
                        txId: pmt.id,
                        isPayment: true,
                    });
                });

                if (applied.length > 0) {
                    sections.push({
                        title: 'Open Balance',
                        value: Math.max(0, billAmt - billPaid),
                        indent: 4,
                        isOpenBalance: true,
                    });
                }
            }

            sections.push({
                title: `Total ${vName}`,
                value:       Math.round((vBillTotal - vPaidTotal) * 100) / 100,
                extraValue:  Math.round(vBillTotal  * 100) / 100,
                extraValue2: Math.round(vPaidTotal  * 100) / 100,
                isTotal: true, indent: 2,
            });
        }

        if (Object.keys(byVendor).length === 0) {
            sections.push({ title: 'No bills found for the selected date range.', indent: 2 });
        }

        sections.push({
            title: 'TOTAL',
            value:       Math.round((grandBillTotal - grandPaidTotal) * 100) / 100,
            extraValue:  Math.round(grandBillTotal  * 100) / 100,
            extraValue2: Math.round(grandPaidTotal  * 100) / 100,
            isGrandTotal: true, spacing: true,
        });

        return applyCustomColumns({ sections }, 'BILLS_AND_PAYMENTS', userId, companyId);
    },

    // ─── 5. Purchases by Vendor Detail ──────────────────────────────────────
    // All purchase-type transactions grouped by vendor with line-item detail.
    getPurchasesByVendorDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const PURCHASE_TYPES = ['BILL', 'CHECK', 'EXPENSE', 'ITEM_RECEIPT', 'CREDIT_CARD_CHARGE'];

        const [transactions, vendors] = await Promise.all([
            Transaction.find({
                userId, companyId,
                type: { $in: PURCHASE_TYPES },
                date: { $gte: start, $lte: end },
            }).sort({ entityId: 1, date: 1 }).lean(),
            Vendor.find({ userId, companyId }).lean(),
        ]);

        const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));

        const byVendor = {};
        transactions.forEach(tx => {
            const vid = tx.entityId || tx.vendorId;
            const key = vid || '__NO_VENDOR__';
            if (!byVendor[key]) byVendor[key] = [];
            byVendor[key].push(tx);
        });

        const sections = [
            { title: `Purchases by Vendor Detail (${start} — ${end})`, isHeading: true },
        ];

        let grandTotal = 0;

        const sortedVendorIds = Object.keys(byVendor).sort((a, b) => {
            const na = a === '__NO_VENDOR__' ? '\uFFFF' : (vendorMap[a]?.name || a);
            const nb = b === '__NO_VENDOR__' ? '\uFFFF' : (vendorMap[b]?.name || b);
            return na.localeCompare(nb);
        });

        for (const vid of sortedVendorIds) {
            const vendor = vendorMap[vid];
            const vName = vendor ? vendor.name : (vid === '__NO_VENDOR__' ? '[No Vendor Specified]' : `[Unknown: ${vid}]`);
            sections.push({ title: vName, isSubheading: true, spacing: true });

            let vendorTotal = 0;

            for (const tx of byVendor[vid]) {
                const amt = tx.total || 0;
                vendorTotal += amt;

                sections.push({
                    title: `${tx.date}  ${tx.type.replace(/_/g, ' ')}  #${tx.refNo || tx.id.slice(-8)}`,
                    value: amt,
                    txType: tx.type,
                    memo: tx.memo || '',
                    indent: 2,
                    txId: tx.id,
                });

                (tx.items || []).forEach(li => {
                    if (!li.description && !li.itemId && !li.amount) return;
                    sections.push({
                        title: li.description || `[Item ${li.itemId?.slice(-6) || ''}]`,
                        value: li.amount || 0,
                        quantity: li.quantity || 0,
                        rate: li.rate || 0,
                        indent: 4,
                        isLineItem: true,
                    });
                });
            }

            sections.push({ title: `Total ${vName}`, value: vendorTotal, isTotal: true, indent: 2 });
            grandTotal += vendorTotal;
        }

        if (Object.keys(byVendor).length === 0) {
            sections.push({ title: 'No purchase transactions found for the selected date range.', indent: 2 });
        }

        sections.push({ title: 'TOTAL PURCHASES', value: grandTotal, isGrandTotal: true, spacing: true });
        return applyCustomColumns({ sections }, 'PURCHASES_BY_VENDOR_DETAIL', userId, companyId);
    },

    // ─── 6. Purchases by Item Detail ────────────────────────────────────────
    // Purchase line items grouped by item/service — QB parity.
    getPurchasesByItemDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const PURCHASE_TYPES = ['BILL', 'CHECK', 'EXPENSE', 'ITEM_RECEIPT', 'CREDIT_CARD_CHARGE'];

        const [transactions, items, vendors] = await Promise.all([
            Transaction.find({
                userId, companyId,
                type: { $in: PURCHASE_TYPES },
                date: { $gte: start, $lte: end },
            }).lean(),
            Item.find({ userId, companyId }).lean(),
            Vendor.find({ userId, companyId }).lean(),
        ]);

        const itemMap   = Object.fromEntries(items.map(i => [i.id, i]));
        const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));

        const byItem = {};
        const headerOnlyLines = [];

        transactions.forEach(tx => {
            const vName = (vendorMap[tx.entityId || tx.vendorId])?.name || '';
            const txLines = tx.items || [];

            if (txLines.length === 0) {
                headerOnlyLines.push({
                    date: tx.date, refNo: tx.refNo || tx.id.slice(-8),
                    txType: tx.type, vendorName: vName,
                    description: tx.memo || '', quantity: 1,
                    rate: tx.total || 0, amount: tx.total || 0, txId: tx.id,
                });
                return;
            }

            txLines.forEach(li => {
                const key = li.itemId || '__NO_ITEM__';
                if (!byItem[key]) byItem[key] = [];
                byItem[key].push({
                    date: tx.date, refNo: tx.refNo || tx.id.slice(-8),
                    txType: tx.type, vendorName: vName,
                    description: li.description || '',
                    quantity: li.quantity || 0, rate: li.rate || 0,
                    amount: li.amount || 0, txId: tx.id,
                });
            });
        });

        const sections = [
            { title: `Purchases by Item Detail (${start} — ${end})`, isHeading: true },
        ];

        let grandTotal = 0;
        let grandQty   = 0;

        const sortedItemIds = Object.keys(byItem).sort((a, b) => {
            const na = a === '__NO_ITEM__' ? '\uFFFF' : (itemMap[a]?.name || a);
            const nb = b === '__NO_ITEM__' ? '\uFFFF' : (itemMap[b]?.name || b);
            return na.localeCompare(nb);
        });

        for (const iId of sortedItemIds) {
            const itm = itemMap[iId];
            const iName = itm ? itm.name : (iId === '__NO_ITEM__' ? '[No Item]' : `[Deleted: ${iId}]`);
            sections.push({ title: iName, isSubheading: true, sku: itm?.sku || '', spacing: true });

            let itemTotal = 0;
            let itemQty   = 0;

            for (const line of byItem[iId]) {
                itemTotal += line.amount;
                itemQty   += line.quantity;

                sections.push({
                    title: `${line.date}  ${line.txType.replace(/_/g, ' ')}  #${line.refNo}`,
                    value: line.amount,
                    vendorName: line.vendorName,
                    description: line.description,
                    quantity: line.quantity,
                    rate: line.rate,
                    indent: 2,
                    txId: line.txId,
                    isDetail: true,
                });
            }

            sections.push({
                title: `Total ${iName}`,
                value: itemTotal,
                extraValue: itemQty,
                isTotal: true, indent: 2,
            });

            grandTotal += itemTotal;
            grandQty   += itemQty;
        }

        if (headerOnlyLines.length > 0) {
            sections.push({ title: '[Other / Header-Only Purchases]', isSubheading: true, spacing: true });
            let miscTotal = 0;
            headerOnlyLines.forEach(line => {
                miscTotal += line.amount;
                sections.push({
                    title: `${line.date}  ${line.txType.replace(/_/g, ' ')}  #${line.refNo}`,
                    value: line.amount, vendorName: line.vendorName,
                    description: line.description, indent: 2, txId: line.txId,
                });
            });
            sections.push({ title: 'Total Other', value: miscTotal, isTotal: true, indent: 2 });
            grandTotal += miscTotal;
        }

        if (sections.length === 1) {
            sections.push({ title: 'No purchase line items found for the selected date range.', indent: 2 });
        }

        sections.push({
            title: 'TOTAL PURCHASES',
            value: grandTotal,
            extraValue: grandQty,
            isGrandTotal: true, spacing: true,
        });

        return applyCustomColumns({ sections }, 'PURCHASES_BY_ITEM_DETAIL', userId, companyId);
    },

    // ─── 7. Vendor Contact List ──────────────────────────────────────────────
    // Directory of all active vendors with contact information — QB parity.
    getVendorContactList: async (fromDate, toDate, userId, companyId) => {
        const vendors = await Vendor.find({ userId, companyId, isActive: true })
            .sort({ name: 1 })
            .lean();

        const sections = [
            { title: 'Vendor Contact List', isHeading: true },
            {
                title: 'Vendor Name',
                isColumnHeader: true,
                col2: 'Company',
                col3: 'Phone',
                col4: 'Email',
                col5: 'Account #',
                col6: 'Type',
                col7: 'Balance',
            },
        ];

        let totalBalance = 0;

        vendors.forEach(v => {
            const primaryContact = (v.contacts || []).find(c => c.isPrimary) || (v.contacts || [])[0] || {};
            const phone = v.phone || primaryContact.phone || '';
            const email = v.email || primaryContact.email || '';
            const addrObj = v.address;
            const address = typeof addrObj === 'string' ? addrObj
                : (addrObj ? [addrObj.line1, addrObj.city, addrObj.state, addrObj.zip].filter(Boolean).join(', ') : '');

            totalBalance += v.balance || 0;

            sections.push({
                title: v.name,
                col2: v.companyName || '',
                col3: phone,
                col4: email,
                col5: v.vendorAccountNo || '',
                col6: v.vendorType || '',
                col7: v.balance || 0,
                value: v.balance || 0,
                address,
                notes: (v.notes || []).map(n => (typeof n === 'string' ? n : n.text || '')).join('; '),
                eligibleFor1099: !!v.eligibleFor1099,
                vendorId: v.id,
                indent: 1,
            });
        });

        if (vendors.length === 0) {
            sections.push({ title: 'No active vendors found.', indent: 2 });
        }

        sections.push({
            title: `TOTAL VENDORS: ${vendors.length}`,
            value: totalBalance,
            isGrandTotal: true, spacing: true,
        });

        return { sections, totalVendors: vendors.length };
    },

    // ── Jobs / Time Reports ───────────────────────────────────────────────────

    /**
     * Job Profitability Summary
     * Revenue vs. costs per customer/job, showing gross profit and margin.
     * Revenue  = INVOICE + SALES_RECEIPT linked to the customer.
     * Costs    = BILL + CHECK + EXPENSE items where line.customerId === job.
     */
    getJobProfitabilitySummary: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const [transactions, customers] = await Promise.all([
            Transaction.find({ userId, companyId, status: { $ne: 'VOID' }, date: { $gte: start, $lte: end } },
                'type entityId customerId total items').lean(),
            Customer.find({ userId, companyId }, 'id name').lean(),
        ]);

        const REVENUE_TYPES = ['INVOICE', 'SALES_RECEIPT'];
        const CREDIT_TYPES  = ['CREDIT_MEMO'];
        const COST_TYPES    = ['BILL', 'CHECK', 'EXPENSE', 'PAYCHECK', 'CREDIT_CARD_CHARGE'];

        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

        const byJob = {};
        const ensure = (id) => { if (!byJob[id]) byJob[id] = { revenue: 0, costs: 0 }; };

        for (const tx of transactions) {
            const custId = tx.entityId || tx.customerId;

            if (REVENUE_TYPES.includes(tx.type) && custId) {
                ensure(custId);
                byJob[custId].revenue += tx.total || 0;
            }

            // Credit memos reduce revenue
            if (CREDIT_TYPES.includes(tx.type) && custId) {
                ensure(custId);
                byJob[custId].revenue -= tx.total || 0;
            }

            if (COST_TYPES.includes(tx.type)) {
                // Prefer per-line job attribution; fall back to tx-level customer; last resort: tx.total to custId
                const lines = tx.items || [];
                if (lines.length > 0) {
                    for (const line of lines) {
                        const lineCust = line.customerId || custId;
                        if (!lineCust) continue;
                        ensure(lineCust);
                        byJob[lineCust].costs += line.amount || 0;
                    }
                } else if (custId) {
                    // Bill/check with no line items — attribute tx total to job
                    ensure(custId);
                    byJob[custId].costs += tx.total || 0;
                }
            }
        }

        const sections = [
            { title: `Job Profitability Summary (${start} to ${end})`, isHeading: true },
            { title: 'Job / Customer', extraValue: 'Revenue', extraValue2: 'Costs', value: 'Gross Profit', isColumnHeader: true },
        ];

        let totalRevenue = 0, totalCosts = 0;

        const rows = Object.entries(byJob)
            .map(([id, d]) => ({
                name: customerMap[id] || id,
                revenue: d.revenue,
                costs: d.costs,
                profit: d.revenue - d.costs,
                margin: d.revenue > 0 ? ((d.revenue - d.costs) / d.revenue) * 100 : 0,
            }))
            .sort((a, b) => b.profit - a.profit);

        for (const row of rows) {
            totalRevenue += row.revenue;
            totalCosts   += row.costs;
            sections.push({
                title:       row.name,
                value:       row.profit,
                extraValue:  row.revenue,
                extraValue2: row.costs,
                indent:      2,
                meta: { revenue: row.revenue, costs: row.costs, profit: row.profit, margin: +row.margin.toFixed(1) },
            });
        }

        if (!rows.length) sections.push({ title: 'No job data found for this period.', indent: 2 });
        sections.push({ title: 'TOTAL', value: totalRevenue - totalCosts, extraValue: totalRevenue, extraValue2: totalCosts, isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Job Profitability Detail
     * Per job → per transaction breakdown of revenue and costs.
     */
    getJobProfitabilityDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const REVENUE_TYPES = ['INVOICE', 'SALES_RECEIPT'];
        const CREDIT_TYPES  = ['CREDIT_MEMO'];
        const COST_TYPES    = ['BILL', 'CHECK', 'EXPENSE', 'PAYCHECK', 'CREDIT_CARD_CHARGE'];

        const [transactions, customers] = await Promise.all([
            Transaction.find({ userId, companyId, status: { $ne: 'VOID' }, date: { $gte: start, $lte: end } },
                'type entityId customerId total refNo id date items memo').lean(),
            Customer.find({ userId, companyId }, 'id name').lean(),
        ]);

        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

        const byJob = {};
        const ensureJob = (id) => { if (!byJob[id]) byJob[id] = { revenue: [], costs: [] }; };

        for (const tx of transactions) {
            const custId = tx.entityId || tx.customerId;
            if (REVENUE_TYPES.includes(tx.type) && custId) {
                ensureJob(custId);
                byJob[custId].revenue.push(tx);
            }
            if (CREDIT_TYPES.includes(tx.type) && custId) {
                // Show credit memos as negative revenue
                ensureJob(custId);
                byJob[custId].revenue.push({ ...tx, total: -(tx.total || 0) });
            }
            if (COST_TYPES.includes(tx.type)) {
                const effectiveCust = custId || (tx.items?.[0]?.customerId);
                if (effectiveCust) {
                    ensureJob(effectiveCust);
                    byJob[effectiveCust].costs.push(tx);
                }
            }
        }

        const sections = [{ title: `Job Profitability Detail (${start} to ${end})`, isHeading: true }];
        let grandRevenue = 0, grandCosts = 0;

        const sortedJobs = Object.entries(byJob).sort(([, a], [, b]) => {
            const pA = a.revenue.reduce((s, t) => s + (t.total || 0), 0) - a.costs.reduce((s, t) => s + (t.total || 0), 0);
            const pB = b.revenue.reduce((s, t) => s + (t.total || 0), 0) - b.costs.reduce((s, t) => s + (t.total || 0), 0);
            return pB - pA;
        });

        for (const [custId, data] of sortedJobs) {
            const jobName    = customerMap[custId] || custId;
            const jobRevenue = data.revenue.reduce((s, t) => s + (t.total || 0), 0);
            const jobCosts   = data.costs.reduce((s, t) => s + (t.total || 0), 0);
            const jobProfit  = jobRevenue - jobCosts;

            sections.push({ title: jobName, isHeading: true, indent: 1, spacing: true });

            if (data.revenue.length > 0) {
                sections.push({ title: 'Revenue', isHeading: true, indent: 2 });
                for (const tx of data.revenue) {
                    sections.push({
                        title:  `${tx.date}  ${tx.type} #${tx.refNo || tx.id.substring(0, 8)}`,
                        value:  tx.total || 0,
                        indent: 3,
                        meta:   { txId: tx.id, type: tx.type, date: tx.date },
                    });
                }
                sections.push({ title: 'Total Revenue', value: jobRevenue, isTotal: true, indent: 2 });
            }

            if (data.costs.length > 0) {
                sections.push({ title: 'Costs', isHeading: true, indent: 2 });
                for (const tx of data.costs) {
                    sections.push({
                        title:  `${tx.date}  ${tx.type} #${tx.refNo || tx.id.substring(0, 8)}`,
                        value:  tx.total || 0,
                        indent: 3,
                        meta:   { txId: tx.id, type: tx.type, date: tx.date },
                    });
                }
                sections.push({ title: 'Total Costs', value: jobCosts, isTotal: true, indent: 2 });
            }

            sections.push({
                title:  `${jobName} — Gross Profit`,
                value:  jobProfit,
                isTotal: true,
                indent: 2,
                spacing: true,
                meta:   { revenue: jobRevenue, costs: jobCosts, profit: jobProfit },
            });

            grandRevenue += jobRevenue;
            grandCosts   += jobCosts;
        }

        if (!sortedJobs.length) sections.push({ title: 'No job data found for this period.', indent: 2 });
        sections.push({ title: 'GRAND TOTAL PROFIT', value: grandRevenue - grandCosts, extraValue: grandRevenue, extraValue2: grandCosts, isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Job Costs by Job
     * All cost-type transactions grouped under each customer/job.
     */
    getJobCostsByJob: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';
        const COST_TYPES = ['BILL', 'CHECK', 'EXPENSE', 'CREDIT_CARD_CHARGE'];

        const [transactions, customers, vendors] = await Promise.all([
            Transaction.find({ userId, companyId, type: { $in: COST_TYPES }, status: { $ne: 'VOID' }, date: { $gte: start, $lte: end } },
                'type entityId vendorId customerId total refNo id date items memo').lean(),
            Customer.find({ userId, companyId }, 'id name').lean(),
            Vendor.find({ userId, companyId }, 'id name').lean(),
        ]);

        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
        const vendorMap   = Object.fromEntries(vendors.map(v => [v.id, v.name]));

        const byJob = {};
        for (const tx of transactions) {
            const linesToProcess = (tx.items || []).length ? tx.items : [null];
            for (const line of linesToProcess) {
                const custId = (line && line.customerId) || tx.entityId || tx.customerId;
                if (!custId) continue;
                if (!byJob[custId]) byJob[custId] = [];
                byJob[custId].push({ tx, line });
            }
        }

        const sections = [{ title: `Job Costs by Job (${start} to ${end})`, isHeading: true }];
        let grandTotal = 0;

        for (const [custId, entries] of Object.entries(byJob).sort(([a], [b]) => (customerMap[a] || a).localeCompare(customerMap[b] || b))) {
            const jobName  = customerMap[custId] || custId;
            const jobTotal = entries.reduce((s, { tx, line }) => s + (line ? (line.amount || 0) : (tx.total || 0)), 0);

            sections.push({ title: jobName, isHeading: true, indent: 1, spacing: true });

            for (const { tx, line } of entries) {
                const vendorName = vendorMap[tx.entityId || tx.vendorId] || '—';
                const amount     = line ? (line.amount || 0) : (tx.total || 0);
                sections.push({
                    title:      `${tx.date}  ${tx.type} #${tx.refNo || tx.id.substring(0, 8)}  ${vendorName}`,
                    value:      amount,
                    extraValue: line ? (line.description || '') : (tx.memo || ''),
                    indent:     2,
                    meta:       { txId: tx.id, vendor: vendorName, date: tx.date, type: tx.type },
                });
            }

            sections.push({ title: `Total — ${jobName}`, value: jobTotal, isTotal: true, indent: 2 });
            grandTotal += jobTotal;
        }

        if (!Object.keys(byJob).length) sections.push({ title: 'No job costs found for this period.', indent: 2 });
        sections.push({ title: 'GRAND TOTAL JOB COSTS', value: grandTotal, isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Job Costs by Vendor
     * Same cost pool, grouped by vendor then listing customer/job per line.
     */
    getJobCostsByVendor: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';
        const COST_TYPES = ['BILL', 'CHECK', 'EXPENSE', 'CREDIT_CARD_CHARGE'];

        const [transactions, customers, vendors] = await Promise.all([
            Transaction.find({ userId, companyId, type: { $in: COST_TYPES }, status: { $ne: 'VOID' }, date: { $gte: start, $lte: end } },
                'type entityId vendorId customerId total refNo id date items memo').lean(),
            Customer.find({ userId, companyId }, 'id name').lean(),
            Vendor.find({ userId, companyId }, 'id name').lean(),
        ]);

        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
        const vendorMap   = Object.fromEntries(vendors.map(v => [v.id, v.name]));

        const byVendor = {};
        for (const tx of transactions) {
            const vendorId   = tx.entityId || tx.vendorId || 'unknown';
            const vendorName = vendorMap[vendorId] || 'Unknown Vendor';
            if (!byVendor[vendorName]) byVendor[vendorName] = [];

            const linesToProcess = (tx.items || []).length ? tx.items : [null];
            for (const line of linesToProcess) {
                const custId = (line && line.customerId) || tx.entityId || tx.customerId;
                byVendor[vendorName].push({ tx, line, custId });
            }
        }

        const sections = [{ title: `Job Costs by Vendor (${start} to ${end})`, isHeading: true }];
        let grandTotal = 0;

        for (const [vendorName, entries] of Object.entries(byVendor).sort(([a], [b]) => a.localeCompare(b))) {
            const vendorTotal = entries.reduce((s, { tx, line }) => s + (line ? (line.amount || 0) : (tx.total || 0)), 0);

            sections.push({ title: vendorName, isHeading: true, indent: 1, spacing: true });

            for (const { tx, line, custId } of entries) {
                const jobName = customerMap[custId] || custId || '—';
                const amount  = line ? (line.amount || 0) : (tx.total || 0);
                sections.push({
                    title:      `${tx.date}  ${tx.type} #${tx.refNo || tx.id.substring(0, 8)}  ${jobName}`,
                    value:      amount,
                    extraValue: line ? (line.description || '') : (tx.memo || ''),
                    indent:     2,
                    meta:       { txId: tx.id, job: jobName, date: tx.date, type: tx.type },
                });
            }

            sections.push({ title: `Total — ${vendorName}`, value: vendorTotal, isTotal: true, indent: 2 });
            grandTotal += vendorTotal;
        }

        if (!Object.keys(byVendor).length) sections.push({ title: 'No job costs found for this period.', indent: 2 });
        sections.push({ title: 'GRAND TOTAL JOB COSTS', value: grandTotal, isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Job Costs by Type
     * Same cost pool, grouped by cost category (Labor, Materials, Subcontractors, Equipment, Overhead).
     */
    getJobCostsByType: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';
        const COST_TYPES = ['BILL', 'CHECK', 'EXPENSE', 'CREDIT_CARD_CHARGE'];

        const [transactions, items] = await Promise.all([
            Transaction.find({ userId, companyId, type: { $in: COST_TYPES }, status: { $ne: 'VOID' }, date: { $gte: start, $lte: end } },
                'type entityId customerId total refNo id date items memo').lean(),
            Item.find({ userId, companyId }, 'id type').lean(),
        ]);

        const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

        const deriveCostType = (itemId) => {
            const item = itemMap[itemId];
            if (!item) return 'Other';
            const t = item.type || '';
            if (t === 'Service') return 'Labor';
            if (['Inventory Part', 'Non-Inventory Part'].includes(t)) return 'Materials';
            if (t === 'Other Charge') return 'Subcontractors';
            if (t === 'Fixed Asset') return 'Equipment';
            return 'Overhead';
        };

        const byType = {};
        for (const tx of transactions) {
            const linesToProcess = (tx.items || []).length ? tx.items : [null];
            for (const line of linesToProcess) {
                const costType = line ? deriveCostType(line.itemId) : 'Other';
                if (!byType[costType]) byType[costType] = [];
                byType[costType].push({ tx, line });
            }
        }

        const TYPE_ORDER = ['Labor', 'Materials', 'Subcontractors', 'Equipment', 'Overhead', 'Other'];
        const sections = [{ title: `Job Costs by Type (${start} to ${end})`, isHeading: true }];
        let grandTotal = 0;

        const sortedTypes = TYPE_ORDER.filter(t => byType[t]).concat(Object.keys(byType).filter(t => !TYPE_ORDER.includes(t)));

        for (const costType of sortedTypes) {
            const entries   = byType[costType] || [];
            const typeTotal = entries.reduce((s, { tx, line }) => s + (line ? (line.amount || 0) : (tx.total || 0)), 0);

            sections.push({ title: costType, isHeading: true, indent: 1, spacing: true });

            for (const { tx, line } of entries) {
                const amount = line ? (line.amount || 0) : (tx.total || 0);
                sections.push({
                    title:      `${tx.date}  ${tx.type} #${tx.refNo || tx.id.substring(0, 8)}`,
                    value:      amount,
                    extraValue: line ? (line.description || '') : (tx.memo || ''),
                    indent:     2,
                    meta:       { txId: tx.id, date: tx.date, type: tx.type },
                });
            }

            sections.push({ title: `Total — ${costType}`, value: typeTotal, isTotal: true, indent: 2 });
            grandTotal += typeTotal;
        }

        if (!sortedTypes.length) sections.push({ title: 'No job costs found for this period.', indent: 2 });
        sections.push({ title: 'GRAND TOTAL JOB COSTS', value: grandTotal, isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Time by Job Summary
     * Total hours and billable amount per customer/job.
     */
    getTimeByJobSummary: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const [timeEntries, customers] = await Promise.all([
            TimeEntry.find({ userId, companyId, date: { $gte: start, $lte: end } },
                'employeeId customerId date hours rate isBillable status').lean(),
            Customer.find({ userId, companyId }, 'id name').lean(),
        ]);

        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

        const byJob = {};
        for (const te of timeEntries) {
            const custId = te.customerId || 'unassigned';
            if (!byJob[custId]) byJob[custId] = { hours: 0, billableHours: 0, amount: 0 };
            byJob[custId].hours += te.hours || 0;
            if (te.isBillable) {
                byJob[custId].billableHours += te.hours || 0;
                byJob[custId].amount        += (te.hours || 0) * (te.rate || 0);
            }
        }

        const sections = [
            { title: `Time by Job Summary (${start} to ${end})`, isHeading: true },
            { title: 'Job / Customer', extraValue: 'Total Hrs', extraValue2: 'Billable Hrs', value: 'Billable Amt', isColumnHeader: true },
        ];
        let totalHours = 0, totalBillableHours = 0, totalAmount = 0;

        const rows = Object.entries(byJob)
            .map(([id, d]) => ({ name: id === 'unassigned' ? '(Unassigned)' : (customerMap[id] || id), ...d }))
            .sort((a, b) => b.hours - a.hours);

        for (const row of rows) {
            totalHours         += row.hours;
            totalBillableHours += row.billableHours;
            totalAmount        += row.amount;
            sections.push({
                title:       row.name,
                value:       row.amount,
                extraValue:  +row.hours.toFixed(2),
                extraValue2: +row.billableHours.toFixed(2),
                indent:      2,
                meta:        { totalHours: row.hours, billableHours: row.billableHours, billableAmount: row.amount },
            });
        }

        if (!rows.length) sections.push({ title: 'No time entries for this period.', indent: 2 });
        sections.push({ title: 'TOTAL', value: totalAmount, extraValue: +totalHours.toFixed(2), extraValue2: +totalBillableHours.toFixed(2), isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Time by Job Detail
     * Per job → per employee → individual time entry rows.
     */
    getTimeByJobDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const [timeEntries, customers, employees] = await Promise.all([
            TimeEntry.find({ userId, companyId, date: { $gte: start, $lte: end } },
                'id employeeId customerId date hours rate isBillable status description').sort({ date: 1 }).lean(),
            Customer.find({ userId, companyId }, 'id name').lean(),
            Employee.find({ userId, companyId }, 'id name').lean(),
        ]);

        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
        const employeeMap = Object.fromEntries(employees.map(e => [e.id, e.name]));

        const byJob = {};
        for (const te of timeEntries) {
            const custId = te.customerId || 'unassigned';
            const empId  = te.employeeId || 'unknown';
            if (!byJob[custId]) byJob[custId] = {};
            if (!byJob[custId][empId]) byJob[custId][empId] = [];
            byJob[custId][empId].push(te);
        }

        const sections = [{ title: `Time by Job Detail (${start} to ${end})`, isHeading: true }];
        let grandHours = 0, grandAmount = 0;

        for (const [custId, byEmp] of Object.entries(byJob).sort(([a], [b]) => (customerMap[a] || a).localeCompare(customerMap[b] || b))) {
            const jobName   = custId === 'unassigned' ? '(Unassigned)' : (customerMap[custId] || custId);
            const allEntries = Object.values(byEmp).flat();
            const jobHours  = allEntries.reduce((s, te) => s + (te.hours || 0), 0);
            const jobAmount = allEntries.reduce((s, te) => s + (te.isBillable ? (te.hours || 0) * (te.rate || 0) : 0), 0);

            sections.push({ title: jobName, isHeading: true, indent: 1, spacing: true });

            for (const [empId, entries] of Object.entries(byEmp).sort(([a], [b]) => (employeeMap[a] || a).localeCompare(employeeMap[b] || b))) {
                const empName   = employeeMap[empId] || empId;
                const empHours  = entries.reduce((s, te) => s + (te.hours || 0), 0);
                const empAmount = entries.reduce((s, te) => s + (te.isBillable ? (te.hours || 0) * (te.rate || 0) : 0), 0);

                sections.push({ title: empName, isHeading: true, indent: 2 });

                for (const te of entries) {
                    const amount = te.isBillable ? (te.hours || 0) * (te.rate || 0) : 0;
                    sections.push({
                        title:      `${te.date}  ${te.description || '—'}${te.isBillable ? '  [Billable]' : ''}`,
                        value:      amount,
                        extraValue: +((te.hours || 0).toFixed(2)),
                        indent:     3,
                        meta:       { teId: te.id, hours: te.hours, rate: te.rate, billable: te.isBillable, status: te.status },
                    });
                }

                sections.push({ title: `  ${empName} Total`, value: empAmount, extraValue: +empHours.toFixed(2), isTotal: true, indent: 2 });
            }

            sections.push({ title: `${jobName} Total`, value: jobAmount, extraValue: +jobHours.toFixed(2), isTotal: true, indent: 1 });
            grandHours  += jobHours;
            grandAmount += jobAmount;
        }

        if (!Object.keys(byJob).length) sections.push({ title: 'No time entries for this period.', indent: 2 });
        sections.push({ title: 'GRAND TOTAL', value: grandAmount, extraValue: +grandHours.toFixed(2), isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Time by Name (Employee)
     * Per employee → individual time entries with job and billable flag.
     */
    getTimeByName: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const [timeEntries, customers, employees] = await Promise.all([
            TimeEntry.find({ userId, companyId, date: { $gte: start, $lte: end } },
                'id employeeId customerId date hours rate isBillable status description').sort({ date: 1 }).lean(),
            Customer.find({ userId, companyId }, 'id name').lean(),
            Employee.find({ userId, companyId }, 'id name').lean(),
        ]);

        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
        const employeeMap = Object.fromEntries(employees.map(e => [e.id, e.name]));

        const byEmp = {};
        for (const te of timeEntries) {
            const empId = te.employeeId || 'unknown';
            if (!byEmp[empId]) byEmp[empId] = [];
            byEmp[empId].push(te);
        }

        const sections = [
            { title: `Time by Name (${start} to ${end})`, isHeading: true },
            { title: 'Employee / Date / Job', extraValue: 'Hours', value: 'Billable Amount', isColumnHeader: true },
        ];
        let grandHours = 0, grandAmount = 0;

        const sortedEmps = Object.entries(byEmp).sort(([a], [b]) => (employeeMap[a] || a).localeCompare(employeeMap[b] || b));

        for (const [empId, entries] of sortedEmps) {
            const empName   = employeeMap[empId] || empId;
            const empHours  = entries.reduce((s, te) => s + (te.hours || 0), 0);
            const empAmount = entries.reduce((s, te) => s + (te.isBillable ? (te.hours || 0) * (te.rate || 0) : 0), 0);

            sections.push({ title: empName, isHeading: true, indent: 1, spacing: true });

            for (const te of entries) {
                const jobName = customerMap[te.customerId] || te.customerId || '—';
                const amount  = te.isBillable ? (te.hours || 0) * (te.rate || 0) : 0;
                sections.push({
                    title:      `${te.date}  ${jobName}  ${te.description || '—'}${te.isBillable ? '  [Billable]' : ''}`,
                    value:      amount,
                    extraValue: +((te.hours || 0).toFixed(2)),
                    indent:     2,
                    meta:       { teId: te.id, job: jobName, hours: te.hours, rate: te.rate, billable: te.isBillable, status: te.status },
                });
            }

            sections.push({ title: `${empName} Total`, value: empAmount, extraValue: +empHours.toFixed(2), isTotal: true, indent: 1 });
            grandHours  += empHours;
            grandAmount += empAmount;
        }

        if (!sortedEmps.length) sections.push({ title: 'No time entries for this period.', indent: 2 });
        sections.push({ title: 'GRAND TOTAL', value: grandAmount, extraValue: +grandHours.toFixed(2), isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Mileage by Vehicle
     * Total miles grouped by vehicle with per-entry detail.
     */
    getMileageByVehicle: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const entries = await MileageEntry.find({ userId, companyId, date: { $gte: start, $lte: end } },
            'id vehicle date odometerStart odometerEnd totalMiles notes isBillable status customerId').sort({ date: 1 }).lean();

        const byVehicle = {};
        for (const e of entries) {
            const v = e.vehicle || 'Unknown Vehicle';
            if (!byVehicle[v]) byVehicle[v] = [];
            byVehicle[v].push(e);
        }

        const sections = [
            { title: `Mileage by Vehicle (${start} to ${end})`, isHeading: true },
            { title: 'Vehicle / Date', extraValue: 'Odometer Start → End', value: 'Miles', isColumnHeader: true },
        ];
        let grandMiles = 0;

        for (const [vehicle, ents] of Object.entries(byVehicle).sort(([a], [b]) => a.localeCompare(b))) {
            const vehicleTotal = ents.reduce((s, e) => s + (e.totalMiles || 0), 0);
            sections.push({ title: vehicle, isHeading: true, indent: 1, spacing: true });

            for (const e of ents) {
                const odoLabel = (e.odometerStart != null && e.odometerEnd != null) ? `${e.odometerStart} → ${e.odometerEnd}` : '—';
                sections.push({
                    title:      `${e.date}  ${e.notes || '—'}${e.isBillable ? '  [Billable]' : ''}`,
                    value:      e.totalMiles || 0,
                    extraValue: odoLabel,
                    indent:     2,
                    meta:       { entryId: e.id, vehicle, date: e.date, miles: e.totalMiles, billable: e.isBillable, status: e.status },
                });
            }

            sections.push({ title: `${vehicle} Total`, value: vehicleTotal, isTotal: true, indent: 1 });
            grandMiles += vehicleTotal;
        }

        if (!Object.keys(byVehicle).length) sections.push({ title: 'No mileage entries for this period.', indent: 2 });
        sections.push({ title: 'TOTAL MILES', value: grandMiles, isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Mileage by Job Detail
     * Mileage entries grouped by customer/job.
     */
    getMileageByJobDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const [entries, customers] = await Promise.all([
            MileageEntry.find({ userId, companyId, date: { $gte: start, $lte: end } },
                'id vehicle date odometerStart odometerEnd totalMiles notes isBillable status customerId').sort({ date: 1 }).lean(),
            Customer.find({ userId, companyId }, 'id name').lean(),
        ]);

        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

        const byJob = {};
        for (const e of entries) {
            const custId = e.customerId || 'unassigned';
            if (!byJob[custId]) byJob[custId] = [];
            byJob[custId].push(e);
        }

        const sections = [
            { title: `Mileage by Job Detail (${start} to ${end})`, isHeading: true },
            { title: 'Job / Date / Vehicle', extraValue: 'Odometer', value: 'Miles', isColumnHeader: true },
        ];
        let grandMiles = 0;

        const sortedJobs = Object.entries(byJob).sort(([a], [b]) => {
            const na = a === 'unassigned' ? '~' : (customerMap[a] || a);
            const nb = b === 'unassigned' ? '~' : (customerMap[b] || b);
            return na.localeCompare(nb);
        });

        for (const [custId, ents] of sortedJobs) {
            const jobName  = custId === 'unassigned' ? '(No Job / Unassigned)' : (customerMap[custId] || custId);
            const jobMiles = ents.reduce((s, e) => s + (e.totalMiles || 0), 0);

            sections.push({ title: jobName, isHeading: true, indent: 1, spacing: true });

            for (const e of ents) {
                const odoLabel = (e.odometerStart != null && e.odometerEnd != null) ? `${e.odometerStart} → ${e.odometerEnd}` : '—';
                sections.push({
                    title:      `${e.date}  ${e.vehicle}  ${e.notes || '—'}${e.isBillable ? '  [Billable]' : ''}`,
                    value:      e.totalMiles || 0,
                    extraValue: odoLabel,
                    indent:     2,
                    meta:       { entryId: e.id, vehicle: e.vehicle, date: e.date, miles: e.totalMiles, billable: e.isBillable },
                });
            }

            sections.push({ title: `${jobName} Total`, value: jobMiles, isTotal: true, indent: 1 });
            grandMiles += jobMiles;
        }

        if (!sortedJobs.length) sections.push({ title: 'No mileage entries for this period.', indent: 2 });
        sections.push({ title: 'TOTAL MILES', value: grandMiles, isGrandTotal: true, spacing: true });
        return { sections };
    },

    // ══════════════════════════════════════════════════════════════════════════
    // BANKING REPORTS  (QB Desktop / Enterprise parity)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Transaction List by Date
     * All posted transactions sorted by date.  Mirrors QB Desktop "Banking →
     * Transaction List by Date".
     */
    getTransactionListByDate: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const [transactions, customers, vendors, accounts] = await Promise.all([
            Transaction.find({ userId, companyId, date: { $gte: start, $lte: end } })
                .sort({ date: 1, createdAt: 1 }).lean(),
            Customer.find({ userId, companyId }).lean(),
            Vendor.find({ userId, companyId }).lean(),
            Account.find({ userId, companyId }).lean(),
        ]);

        const entityMap  = Object.fromEntries([
            ...customers.map(c => [c.id, c.name]),
            ...vendors.map(v   => [v.id, v.name]),
        ]);
        const accountMap = Object.fromEntries(accounts.map(a => [a.id || a._id.toString(), a.name]));

        const TYPE_LABEL = {
            INVOICE: 'Invoice', SALES_RECEIPT: 'Sales Receipt', PAYMENT: 'Payment',
            CREDIT_MEMO: 'Credit Memo', CHECK: 'Check', BILL: 'Bill',
            BILL_PAYMENT: 'Bill Payment', DEPOSIT: 'Deposit', JOURNAL_ENTRY: 'Journal Entry',
            PAYROLL_CHECK: 'Payroll Check', PURCHASE_ORDER: 'Purchase Order',
        };

        const rows = transactions.map(tx => ({
            date:    tx.date,
            type:    TYPE_LABEL[tx.type] || tx.type,
            refNo:   tx.refNo || '',
            payee:   entityMap[tx.entityId] || tx.entityId || '',
            account: accountMap[tx.accountId] || tx.accountId || '',
            memo:    tx.memo || '',
            amount:  tx.total || 0,
        }));

        const grandTotal = rows.reduce((s, r) => s + r.amount, 0);
        const sections = [
            { title: `Transaction List by Date  (${start} — ${end})`, isHeading: true },
            ...rows.map(r => ({
                title: `${r.date}  ${r.type}  ${r.refNo}  ${r.payee}`,
                value: r.amount,
                meta: r,
                indent: 2,
            })),
            { title: 'TOTAL', value: grandTotal, isGrandTotal: true, spacing: true },
        ];
        return { sections, rows };
    },

    /**
     * Transaction Detail by Account
     * Transactions grouped by bank / other account with running balance.
     * QB Desktop parity: "Banking → Transaction Detail by Account".
     */
    getTransactionDetailByAccount: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const [transactions, customers, vendors, accounts] = await Promise.all([
            Transaction.find({ userId, companyId, date: { $gte: start, $lte: end } })
                .sort({ accountId: 1, date: 1 }).lean(),
            Customer.find({ userId, companyId }).lean(),
            Vendor.find({ userId, companyId }).lean(),
            Account.find({ userId, companyId }).lean(),
        ]);

        const entityMap  = Object.fromEntries([
            ...customers.map(c => [c.id, c.name]),
            ...vendors.map(v   => [v.id, v.name]),
        ]);
        const accountMap = Object.fromEntries(accounts.map(a => [a.id || a._id.toString(), a]));

        // Group by account
        const byAccount = {};
        transactions.forEach(tx => {
            const key = tx.accountId || 'UNASSIGNED';
            if (!byAccount[key]) byAccount[key] = [];
            byAccount[key].push(tx);
        });

        const sections = [{ title: `Transaction Detail by Account  (${start} — ${end})`, isHeading: true }];
        let grandTotal = 0;

        Object.entries(byAccount).forEach(([acctId, txns]) => {
            const acct = accountMap[acctId] || {};
            const acctName = acct.name || acctId;
            const openingBal = acct.openingBalance || 0;
            sections.push({ title: acctName, isHeading: true, indent: 1, spacing: true });
            sections.push({ title: 'Opening Balance', value: openingBal, indent: 2, isBold: true });

            let running = openingBal;
            txns.forEach(tx => {
                running += (tx.total || 0);
                sections.push({
                    title:  `${tx.date}  ${tx.type}  ${tx.refNo || ''}  ${entityMap[tx.entityId] || ''}`,
                    value:  tx.total || 0,
                    extraValue: running,
                    meta:   { txId: tx.id, date: tx.date, type: tx.type, payee: entityMap[tx.entityId] || '', amount: tx.total || 0, balance: running },
                    indent: 2,
                });
            });
            const acctTotal = txns.reduce((s, t) => s + (t.total || 0), 0);
            sections.push({ title: `Total ${acctName}`, value: acctTotal, isTotal: true, indent: 1 });
            grandTotal += acctTotal;
        });

        sections.push({ title: 'GRAND TOTAL', value: grandTotal, isGrandTotal: true, spacing: true });
        return { sections };
    },

    /**
     * Check Detail
     * All check-type transactions with full payee, amount, bank-account detail.
     */
    getCheckDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const [checks, vendors, customers, accounts] = await Promise.all([
            Transaction.find({
                userId, companyId,
                type: { $in: ['CHECK', 'BILL_PAYMENT', 'PAYROLL_CHECK'] },
                date: { $gte: start, $lte: end },
            }).sort({ date: 1 }).lean(),
            Vendor.find({ userId, companyId }).lean(),
            Customer.find({ userId, companyId }).lean(),
            Account.find({ userId, companyId }).lean(),
        ]);

        const entityMap  = Object.fromEntries([
            ...vendors.map(v   => [v.id, v.name]),
            ...customers.map(c => [c.id, c.name]),
        ]);
        const accountMap = Object.fromEntries(accounts.map(a => [a.id || a._id.toString(), a.name]));

        const TYPE_LABEL = { CHECK: 'Check', BILL_PAYMENT: 'Bill Payment', PAYROLL_CHECK: 'Payroll Check' };

        const sections = [{ title: `Check Detail  (${start} — ${end})`, isHeading: true }];
        let grandTotal = 0;

        // Group by bank account
        const byAccount = {};
        checks.forEach(tx => {
            const key = tx.bankAccountId || tx.accountId || 'UNASSIGNED';
            if (!byAccount[key]) byAccount[key] = [];
            byAccount[key].push(tx);
        });

        Object.entries(byAccount).forEach(([acctId, txns]) => {
            const acctName = accountMap[acctId] || acctId;
            sections.push({ title: acctName, isHeading: true, indent: 1, spacing: true });
            let acctTotal = 0;
            txns.forEach(tx => {
                const payee  = entityMap[tx.entityId] || tx.entityId || '—';
                const amount = tx.total || 0;
                sections.push({
                    title:  `${tx.date}  ${TYPE_LABEL[tx.type] || tx.type}  #${tx.refNo || '—'}  ${payee}`,
                    value:  amount,
                    meta:   { txId: tx.id, date: tx.date, type: tx.type, refNo: tx.refNo, payee, account: acctName, memo: tx.memo || '', amount },
                    indent: 2,
                });
                acctTotal += amount;
            });
            sections.push({ title: `Total ${acctName}`, value: acctTotal, isTotal: true, indent: 1 });
            grandTotal += acctTotal;
        });

        if (!checks.length) sections.push({ title: 'No check transactions found in the selected date range.', indent: 2 });
        sections.push({ title: 'TOTAL CHECKS', value: grandTotal, isGrandTotal: true, spacing: true });
        return { sections, grandTotal };
    },

    /**
     * Deposit Detail
     * All deposit transactions with payee, amount, memo, bank account.
     */
    getDepositDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const [deposits, customers, accounts] = await Promise.all([
            Transaction.find({
                userId, companyId,
                type: { $in: ['DEPOSIT', 'PAYMENT', 'SALES_RECEIPT'] },
                date: { $gte: start, $lte: end },
            }).sort({ date: 1 }).lean(),
            Customer.find({ userId, companyId }).lean(),
            Account.find({ userId, companyId }).lean(),
        ]);

        const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
        const accountMap  = Object.fromEntries(accounts.map(a => [a.id || a._id.toString(), a.name]));

        const TYPE_LABEL = { DEPOSIT: 'Deposit', PAYMENT: 'Payment Received', SALES_RECEIPT: 'Sales Receipt' };

        const sections = [{ title: `Deposit Detail  (${start} — ${end})`, isHeading: true }];
        let grandTotal = 0;

        const byAccount = {};
        deposits.forEach(tx => {
            // Model field is depositToId, not depositToAccountId
            const key = tx.depositToId || tx.bankAccountId || tx.accountId || 'UNASSIGNED';
            if (!byAccount[key]) byAccount[key] = [];
            byAccount[key].push(tx);
        });

        Object.entries(byAccount).forEach(([acctId, txns]) => {
            const acctName = accountMap[acctId] || acctId;
            sections.push({ title: acctName, isHeading: true, indent: 1, spacing: true });
            let acctTotal = 0;
            txns.forEach(tx => {
                const payer  = customerMap[tx.entityId] || tx.entityId || '—';
                const amount = tx.total || 0;
                sections.push({
                    title:  `${tx.date}  ${TYPE_LABEL[tx.type] || tx.type}  ${payer}`,
                    value:  amount,
                    meta:   { txId: tx.id, date: tx.date, type: tx.type, payer, account: acctName, memo: tx.memo || '', amount },
                    indent: 2,
                });
                acctTotal += amount;
            });
            sections.push({ title: `Total ${acctName}`, value: acctTotal, isTotal: true, indent: 1 });
            grandTotal += acctTotal;
        });

        if (!deposits.length) sections.push({ title: 'No deposit transactions found in the selected date range.', indent: 2 });
        sections.push({ title: 'TOTAL DEPOSITS', value: grandTotal, isGrandTotal: true, spacing: true });
        return { sections, grandTotal };
    },

    /**
     * Reconciliation Discrepancy
     * Compares the last recorded reconciliation balance for each bank account
     * against the current cleared-transaction balance and flags differences.
     */
    getReconciliationDiscrepancy: async (fromDate, toDate, userId, companyId) => {
        const end = toDate || new Date().toISOString().split('T')[0];

        const [accounts, transactions] = await Promise.all([
            Account.find({ userId, companyId, type: { $in: ['Bank', 'Credit Card'] } }).lean(),
            // Use status: 'CLEARED' — the field set by bank-import reconciliation
            Transaction.find({
                userId, companyId,
                date: { $lte: end },
                status: 'CLEARED',
            }).lean(),
        ]);

        // Also load all transactions to compute book balance (account.balance may lag)
        const allTxns = await Transaction.find({ userId, companyId, date: { $lte: end } }).lean();

        const sections = [{ title: `Reconciliation Discrepancy Report  (as of ${end})`, isHeading: true }];
        let discrepancyCount = 0;

        accounts.forEach(acct => {
            const acctId   = acct.id || acct._id.toString();
            const acctName = acct.name;

            // Cleared balance: opening + all CLEARED transactions
            const clearedSum = transactions
                .filter(tx => (tx.bankAccountId || tx.accountId) === acctId)
                .reduce((s, tx) => s + (tx.total || 0), 0);
            const clearedBalance = (acct.openingBalance || 0) + clearedSum;

            // Book balance: opening + ALL posted transactions (Account.balance is maintained by transactionService)
            const bookBalance = acct.balance !== undefined
                ? ((acct.openingBalance || 0) + acct.balance)
                : (acct.openingBalance || 0) + allTxns
                    .filter(tx => (tx.bankAccountId || tx.accountId) === acctId)
                    .reduce((s, tx) => s + (tx.total || 0), 0);

            const diff = bookBalance - clearedBalance;

            sections.push({ title: acctName, isHeading: true, indent: 1, spacing: true });
            sections.push({ title: `Cleared Balance (Reconciled)`, value: clearedBalance, indent: 2 });
            sections.push({ title: `Book Balance (All Transactions)`, value: bookBalance, indent: 2 });
            sections.push({
                title:  `Uncleared Difference`,
                value:  diff,
                isTotal: true,
                indent: 2,
                meta:   { status: Math.abs(diff) < 0.005 ? 'OK' : 'DISCREPANCY', amount: diff },
            });

            if (Math.abs(diff) >= 0.005) discrepancyCount++;
        });

        if (!accounts.length) sections.push({ title: 'No bank or credit-card accounts found.', indent: 2 });
        sections.push({
            title: `Total Accounts with Discrepancies: ${discrepancyCount}`,
            value: discrepancyCount,
            isGrandTotal: true,
            spacing: true,
        });
        return { sections, discrepancyCount };
    },

    /**
     * Banking Summary
     * One-line per bank/credit-card account: opening balance, total deposits,
     * total payments/checks, ending balance.
     */
    getBankingSummary: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const [accounts, transactions] = await Promise.all([
            Account.find({ userId, companyId, type: { $in: ['Bank', 'Credit Card'] } }).lean(),
            Transaction.find({ userId, companyId, date: { $gte: start, $lte: end } }).lean(),
        ]);

        const DEPOSIT_TYPES  = new Set(['DEPOSIT', 'PAYMENT', 'SALES_RECEIPT']);
        const PAYMENT_TYPES  = new Set(['CHECK', 'BILL_PAYMENT', 'PAYROLL_CHECK']);

        const sections = [{ title: `Banking Summary  (${start} — ${end})`, isHeading: true }];
        sections.push({
            title: 'Account',
            isHeading: true,
            indent: 1,
            columns: ['Opening Balance', 'Deposits / Credits', 'Payments / Checks', 'Ending Balance'],
        });

        let netDeposits = 0, netPayments = 0;

        accounts.forEach(acct => {
            const acctId  = acct.id || acct._id.toString();
            const opening = acct.openingBalance || 0;

            const acctTxns = transactions.filter(tx =>
                (tx.bankAccountId || tx.accountId) === acctId
            );

            const deposits  = acctTxns.filter(tx => DEPOSIT_TYPES.has(tx.type)).reduce((s, tx) => s + (tx.total || 0), 0);
            const payments  = acctTxns.filter(tx => PAYMENT_TYPES.has(tx.type)).reduce((s, tx) => s + Math.abs(tx.total || 0), 0);
            const ending    = opening + deposits - payments;

            sections.push({
                title:      acct.name,
                value:      ending,
                extraValue: deposits,
                meta:       { opening, deposits, payments, ending },
                indent:     2,
            });

            netDeposits  += deposits;
            netPayments  += payments;
        });

        if (!accounts.length) sections.push({ title: 'No bank or credit-card accounts found.', indent: 2 });
        sections.push({ title: 'Total Net Deposits',  value: netDeposits,  isTotal: true, spacing: true });
        sections.push({ title: 'Total Net Payments',  value: netPayments,  isTotal: true });
        sections.push({ title: 'Net Change',          value: netDeposits - netPayments, isGrandTotal: true, spacing: true });
        return { sections };
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ACCOUNTANT REPORTS  (QB Desktop / Enterprise parity)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Voided / Deleted Transactions — Summary
     * Lists every transaction whose status is VOID/VOIDED/DELETED.
     * The Transaction model tracks this via the status field (String), not boolean flags.
     */
    getVoidedDeletedTransactions: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || '1970-01-01';
        const end   = toDate   || '2100-01-01';

        const [transactions, customers, vendors, accounts] = await Promise.all([
            // Transaction model uses status field, not isVoided/isDeleted boolean flags
            Transaction.find({
                userId, companyId,
                status: { $in: ['VOID', 'VOIDED', 'DELETED', 'voided', 'deleted'] },
                date: { $gte: start, $lte: end },
            }).sort({ date: 1 }).lean(),
            Customer.find({ userId, companyId }).lean(),
            Vendor.find({ userId, companyId }).lean(),
            Account.find({ userId, companyId }).lean(),
        ]);

        const entityMap  = Object.fromEntries([
            ...customers.map(c => [c.id, c.name]),
            ...vendors.map(v   => [v.id, v.name]),
        ]);
        const accountMap = Object.fromEntries(accounts.map(a => [a.id || a._id.toString(), a.name]));

        const sections = [{ title: `Voided / Deleted Transactions  (${start} — ${end})`, isHeading: true }];
        sections.push({ title: `Date | Type | Ref # | Payee / Name | Account | Amount | Status`, isHeading: true, indent: 1 });

        transactions.forEach(tx => {
            const statusRaw = (tx.status || '').toUpperCase();
            const status    = statusRaw.includes('DELETE') ? 'Deleted' : 'Voided';
            // total is 0 after voiding; use memo or refNo to identify original
            sections.push({
                title:  `${tx.date}  ${tx.type}  #${tx.refNo || '—'}  ${entityMap[tx.entityId] || '—'}  ${accountMap[tx.accountId] || '—'}`,
                value:  tx.total || 0,
                meta:   { txId: tx.id, date: tx.date, type: tx.type, refNo: tx.refNo, status, account: accountMap[tx.accountId] || '—', payee: entityMap[tx.entityId] || '—', amount: tx.total || 0 },
                indent: 2,
                tag:    status,
            });
        });

        if (!transactions.length) sections.push({ title: 'No voided or deleted transactions found.', indent: 2 });
        sections.push({ title: `Total: ${transactions.length} transaction(s)`, value: transactions.length, isGrandTotal: true, spacing: true });
        return { sections, count: transactions.length };
    },

    /**
     * Account Listing
     * Complete chart of accounts with type, detail type, description, and balance.
     */
    getAccountListing: async (fromDate, toDate, userId, companyId) => {
        // Account.balance is a maintained field updated by transactionService on every save.
        // No need to re-aggregate all transactions — just use the stored balance.
        const accounts = await Account.find({ userId, companyId }).sort({ type: 1, name: 1 }).lean();

        // Group by type
        const byType = {};
        accounts.forEach(a => {
            const t = a.type || 'Other';
            if (!byType[t]) byType[t] = [];
            byType[t].push(a);
        });

        const sections = [{ title: 'Account Listing', isHeading: true }];

        Object.entries(byType).forEach(([type, accts]) => {
            sections.push({ title: type, isHeading: true, indent: 1, spacing: true });
            accts.forEach(a => {
                const id      = a.id || a._id.toString();
                // balance field is the running total maintained by the system; openingBalance is the seed
                const balance = (a.openingBalance || 0) + (a.balance || 0);
                sections.push({
                    title:      a.name,
                    value:      balance,
                    extraValue: a.description || '',
                    meta:       { accountId: id, name: a.name, type: a.type, number: a.number, description: a.description, balance },
                    indent:     2,
                });
            });
            const typeTotal = accts.reduce((s, a) => s + (a.openingBalance || 0) + (a.balance || 0), 0);
            sections.push({ title: `Total ${type}`, value: typeTotal, isTotal: true, indent: 1 });
        });

        if (!accounts.length) sections.push({ title: 'No accounts found.', indent: 2 });
        return { sections, totalAccounts: accounts.length };
    },

    /**
     * Fixed Asset Listing
     * Lists Fixed Asset items with purchase date, cost, depreciation, and book value.
     */
    getFixedAssetListing: async (fromDate, toDate, userId, companyId) => {
        // Item model has no dedicated Fixed Asset type in QB (items are tagged via category or assetAccountId).
        // Match items categorised as fixed assets via the category field, OR any item
        // that has an assetAccountId set and is a non-inventory type (closest proxy).
        const assets = await Item.find({
            userId, companyId,
            $or: [
                { type: 'Fixed Asset' },                             // explicit QB-style type
                { category: { $regex: /fixed.?asset/i } },          // category tag fallback
                // Non-inventory items with an asset account are treated as fixed assets
                { type: { $in: ['Non-inventory Part', 'Other Charge'] }, assetAccountId: { $exists: true, $ne: '' } },
            ],
        }).sort({ name: 1 }).lean();

        const sections = [{ title: 'Fixed Asset Listing', isHeading: true }];
        let totalCost = 0, totalDepreciation = 0, totalBookValue = 0;

        if (!assets.length) {
            sections.push({ title: 'No fixed asset items found. Set category to "Fixed Asset" or link an asset account to include items here.', indent: 2 });
        } else {
            assets.forEach(a => {
                const cost         = a.purchaseCost || a.cost || 0;
                const depreciation = a.accumulatedDepreciation || 0;
                const bookValue    = cost - depreciation;
                sections.push({
                    title:      a.name,
                    value:      bookValue,
                    extraValue: cost,
                    meta: {
                        itemId:             a.id,
                        name:               a.name,
                        description:        a.assetDescription || a.description || '',
                        assetTag:           a.assetTag || '',
                        serialNumber:       a.serialNumber || '',
                        location:           a.location || '',
                        purchaseDate:       a.purchaseDate || '',
                        cost,
                        depreciationMethod: a.depreciationMethod || 'Straight-Line',
                        usefulLifeYears:    a.usefulLifeYears || null,
                        salvageValue:       a.salvageValue || 0,
                        depreciation,
                        bookValue,
                        disposalDate:       a.disposalDate || '',
                        disposalAmount:     a.disposalAmount || null,
                    },
                    indent: 2,
                });
                totalCost         += cost;
                totalDepreciation += depreciation;
                totalBookValue    += bookValue;
            });
        }

        sections.push({ title: 'Total Cost',                value: totalCost,         isTotal: true, spacing: true });
        sections.push({ title: 'Total Accumulated Depreciation', value: totalDepreciation, isTotal: true });
        sections.push({ title: 'Total Net Book Value',       value: totalBookValue,    isGrandTotal: true, spacing: true });
        return { sections, totalAssets: assets.length };
    },

    /**
     * Journal Entries
     * All manual journal entries (type: JOURNAL_ENTRY) with their debit/credit lines.
     */
    getJournalEntries: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const [entries, accounts] = await Promise.all([
            Transaction.find({
                userId, companyId,
                type: 'JOURNAL_ENTRY',
                date: { $gte: start, $lte: end },
            }).sort({ date: 1 }).lean(),
            Account.find({ userId, companyId }).lean(),
        ]);

        const accountMap = Object.fromEntries(accounts.map(a => [a.id || a._id.toString(), a.name]));

        const sections = [{ title: `Journal Entries  (${start} — ${end})`, isHeading: true }];
        let grandDebit = 0, grandCredit = 0;

        entries.forEach(entry => {
            // Transaction.items is the line-item array; journalLines does not exist in the model.
            // Items store amounts as signed numbers: positive = debit, negative = credit (convention).
            // If all amounts are positive the entry is likely an unbalanced import — still display it.
            const lines = entry.items || [];

            sections.push({
                title:  `${entry.date}  Journal Entry  #${entry.refNo || entry.id}  ${entry.memo || ''}`,
                isHeading: true, indent: 1, spacing: true,
            });

            let entryDebit = 0, entryCredit = 0;
            lines.forEach(l => {
                const acctName = accountMap[l.accountId] || l.accountId || '—';
                const raw      = l.amount || 0;
                // Positive → debit side, negative → credit side
                const isDebit  = raw >= 0;
                const amount   = Math.abs(raw);
                sections.push({
                    title: `${acctName}  ${l.description || l.memo || ''}`,
                    value: raw,
                    meta:  { account: acctName, debit: isDebit ? amount : 0, credit: isDebit ? 0 : amount },
                    indent: 2,
                });
                if (isDebit) { grandDebit  += amount; entryDebit  += amount; }
                else         { grandCredit += amount; entryCredit += amount; }
            });

            // Entry-level balance indicator
            const entryDiff = entryDebit - entryCredit;
            if (lines.length && Math.abs(entryDiff) >= 0.005) {
                sections.push({ title: `⚠ Entry out of balance by ${Math.abs(entryDiff).toFixed(2)}`, indent: 2, isWarning: true });
            }
        });

        if (!entries.length) sections.push({ title: 'No journal entries found for the selected date range.', indent: 2 });
        sections.push({ title: 'TOTAL DEBITS',  value: grandDebit,  isTotal: true, spacing: true });
        sections.push({ title: 'TOTAL CREDITS', value: grandCredit, isTotal: true });
        const diff = grandDebit - grandCredit;
        sections.push({
            title: diff === 0 ? 'Entries are balanced.' : `OUT OF BALANCE by ${Math.abs(diff).toFixed(2)}`,
            value: diff, isGrandTotal: true, spacing: true,
        });
        return { sections, grandDebit, grandCredit, balanced: Math.abs(diff) < 0.005 };
    },

    /**
     * Income Tax Detail
     * Like Income Tax Summary but expands each tax-line category to show the
     * individual account-level transactions that feed into it.
     */
    getIncomeTaxDetail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end   = toDate   || new Date().toISOString().split('T')[0];

        const [transactions, accounts] = await Promise.all([
            Transaction.find({ userId, companyId, date: { $gte: start, $lte: end } }).lean(),
            Account.find({ userId, companyId }).lean(),
        ]);

        const accMap = Object.fromEntries(accounts.map(a => [a.id || a._id.toString(), a]));

        // Compute balance per account
        const balMap = {};
        accounts.forEach(a => { balMap[a.id || a._id.toString()] = 0; });
        transactions.forEach(tx => {
            if (tx.accountId && balMap[tx.accountId] !== undefined) balMap[tx.accountId] += (tx.total || 0);
        });

        // QB tax-line categories
        const TAX_LINES = [
            'Gross Receipts or Sales', 'Returns and Allowances', 'Cost of Goods Sold',
            'Ordinary Business Expenses', 'Other Income', 'Other Deductions',
        ];

        const sections = [{ title: `Income Tax Detail  (${start} — ${end})`, isHeading: true }];
        let grossIncome = 0, totalDeductions = 0;

        TAX_LINES.forEach(line => {
            // Account model uses taxLineMapping, not taxLine / taxCategory
            const cat = accounts.filter(a => a.taxLineMapping === line);
            if (!cat.length) return;

            const catTotal = cat.reduce((s, a) => s + (balMap[a.id || a._id.toString()] || 0), 0);
            if (catTotal === 0) return;

            sections.push({ title: line, isHeading: true, indent: 1, spacing: true });
            cat.forEach(a => {
                const acctId  = a.id || a._id.toString();
                const balance = balMap[acctId] || 0;
                if (balance === 0) return;
                sections.push({ title: a.name, value: balance, indent: 2 });

                // Expand transactions for this account
                transactions
                    .filter(tx => tx.accountId === acctId)
                    .forEach(tx => {
                        sections.push({
                            title:  `  ${tx.date}  ${tx.type}  #${tx.refNo || '—'}`,
                            value:  tx.total || 0,
                            indent: 3,
                            meta:   { txId: tx.id },
                        });
                    });
            });
            sections.push({ title: `Total ${line}`, value: catTotal, isTotal: true, indent: 1 });

            if (['Gross Receipts or Sales', 'Other Income'].includes(line)) grossIncome    += catTotal;
            if (['Cost of Goods Sold', 'Ordinary Business Expenses', 'Other Deductions'].includes(line)) totalDeductions += catTotal;
        });

        const taxableIncome = grossIncome - totalDeductions;
        sections.push({ title: 'Total Gross Income',      value: grossIncome,     isTotal:     true, spacing: true });
        sections.push({ title: 'Total Deductions',        value: totalDeductions, isTotal:     true });
        sections.push({ title: 'Estimated Taxable Income',value: taxableIncome,   isGrandTotal: true, spacing: true });
        return { sections, grossIncome, totalDeductions, taxableIncome };
    },

    // ══════════════════════════════════════════════════════════════════════════
    // QB ENTERPRISE — ROLE / PERMISSION AUDIT REPORT
    // ══════════════════════════════════════════════════════════════════════════

    getRolePermissionAudit: async (userId, companyId) => {
        const User = require('../models/User');

        const auditLogs = await AuditLogEntry.find({ companyId }).sort({ date: -1 }).lean();

        const companyUserIds = [...new Set(auditLogs.map(l => l.userId).filter(Boolean))];
        if (!companyUserIds.includes(String(userId))) companyUserIds.push(String(userId));

        const users = await User.find({ _id: { $in: companyUserIds } }).lean().catch(() => []);

        const lastActivity = {};
        const actionCounts = {};
        for (const log of auditLogs) {
            if (!log.userId) continue;
            if (!lastActivity[log.userId]) lastActivity[log.userId] = log.date || log.createdAt;
            actionCounts[log.userId] = (actionCounts[log.userId] || 0) + 1;
        }

        const sections = [
            { title: 'Role & Permission Audit Report', isHeading: true },
            { title: 'USER ACCESS', isSubheading: true, spacing: true },
        ];

        for (const uid of companyUserIds) {
            const u = users.find(x => String(x._id) === String(uid));
            const username = u?.username || u?.email || uid;
            const role = u?.role || 'Standard';
            const last = lastActivity[uid] ? new Date(lastActivity[uid]).toLocaleDateString() : 'Never';
            const count = actionCounts[uid] || 0;
            sections.push({
                title: username,
                col2: role,
                col3: last,
                col4: count,
                col5: u ? 'Active' : 'Audit-Only',
                indent: 2,
                isUserRow: true,
            });
        }

        sections.push({ title: 'PERMISSION MATRIX (Role Definitions)', isSubheading: true, spacing: true });
        const permMatrix = [
            { area: 'Accounts Receivable',  admin: 'Full',      standard: 'Create / View' },
            { area: 'Accounts Payable',      admin: 'Full',      standard: 'Create / View' },
            { area: 'Banking',               admin: 'Full',      standard: 'View' },
            { area: 'Reports',               admin: 'Full',      standard: 'Standard Only' },
            { area: 'Payroll',               admin: 'Full',      standard: 'No Access' },
            { area: 'Inventory',             admin: 'Full',      standard: 'Create / View' },
            { area: 'Sales Orders',          admin: 'Full',      standard: 'Create / View' },
            { area: 'Purchase Orders',       admin: 'Full',      standard: 'Create / View' },
            { area: 'Company Settings',      admin: 'Full',      standard: 'No Access' },
            { area: 'User Management',       admin: 'Full',      standard: 'No Access' },
            { area: 'Audit Log',             admin: 'View',      standard: 'No Access' },
            { area: 'Advanced Reports',      admin: 'Full',      standard: 'No Access' },
            { area: 'Management Reports',    admin: 'Full',      standard: 'No Access' },
            { area: 'Financial Planning',    admin: 'Full',      standard: 'No Access' },
        ];
        for (const p of permMatrix) {
            sections.push({
                title: p.area,
                col2: p.admin,
                col3: p.standard,
                indent: 2,
                isPermissionRow: true,
            });
        }

        sections.push({
            title: `Total Users Audited: ${companyUserIds.length}`,
            isGrandTotal: true,
            spacing: true,
            value: companyUserIds.length,
        });

        return { sections };
    },

    // ══════════════════════════════════════════════════════════════════════════
    // QB ENTERPRISE — BIN LOCATION REPORT
    // ══════════════════════════════════════════════════════════════════════════

    getBinLocationReport: async (fromDate, toDate, userId, companyId) => {
        const Bin = require('../models/Bin');
        const Warehouse = require('../models/Warehouse');
        const InventoryLot = require('../models/InventoryLot');

        const [bins, warehouses, items, lots] = await Promise.all([
            Bin.find({ companyId, userId }).lean(),
            Warehouse.find({ companyId, userId }).lean(),
            Item.find({ userId, companyId, type: { $in: ['Inventory Part', 'Inventory Assembly'] } }).lean(),
            InventoryLot.find({ userId, companyId, quantityRemaining: { $gt: 0 } }).lean(),
        ]);

        const warehouseMap = Object.fromEntries(warehouses.map(w => [w.id, w]));
        const itemMap = Object.fromEntries(items.map(i => [i.id, i]));

        const binQtyMap = {};
        const binItemMap = {};
        for (const lot of lots) {
            const binId = lot.binId || '__none__';
            binQtyMap[binId] = (binQtyMap[binId] || 0) + lot.quantityRemaining;
            if (!binItemMap[binId]) binItemMap[binId] = [];
            const item = itemMap[lot.itemId];
            if (item) {
                binItemMap[binId].push({ name: item.name, qty: lot.quantityRemaining, lotNumber: lot.lotNumber });
            }
        }

        const byWarehouse = {};
        for (const bin of bins) {
            const wh = bin.warehouseId;
            if (!byWarehouse[wh]) byWarehouse[wh] = [];
            byWarehouse[wh].push(bin);
        }

        const sections = [{ title: 'Bin Location Report', isHeading: true }];
        let grandQty = 0;
        let grandBins = 0;

        for (const [whId, whBins] of Object.entries(byWarehouse)) {
            const wh = warehouseMap[whId];
            sections.push({ title: wh?.name || whId, isSubheading: true, spacing: true });
            let whQty = 0;
            for (const bin of whBins) {
                const qty = binQtyMap[bin.id] || 0;
                const itemList = (binItemMap[bin.id] || []).map(i => `${i.name} (${i.qty})`).join(', ') || 'Empty';
                const location = [bin.zone, bin.aisle, bin.shelf, bin.position].filter(Boolean).join(' / ') || 'N/A';
                whQty += qty;
                grandBins++;
                sections.push({
                    title: bin.name,
                    col2: location,
                    col3: bin.code || '',
                    col4: qty,
                    col5: itemList,
                    col6: bin.isActive ? 'Active' : 'Inactive',
                    indent: 2,
                    isBinRow: true,
                    value: qty,
                });
            }
            sections.push({ title: `${wh?.name || whId} Total`, value: whQty, isTotal: true, indent: 1 });
            grandQty += whQty;
        }

        if (binItemMap['__none__']) {
            sections.push({ title: 'Unallocated (No Bin Assigned)', isSubheading: true, spacing: true });
            for (const itm of binItemMap['__none__']) {
                sections.push({ title: itm.name, value: itm.qty, indent: 2, isBinRow: true });
            }
            grandQty += binQtyMap['__none__'] || 0;
        }

        sections.push({
            title: `TOTAL — ${grandBins} Bins`,
            value: grandQty,
            isGrandTotal: true,
            spacing: true,
        });

        return { sections };
    },

    // ══════════════════════════════════════════════════════════════════════════
    // QB ENTERPRISE — ADVANCED QUERY (ODBC-equivalent cross-entity query)
    // ══════════════════════════════════════════════════════════════════════════

    getAdvancedQuery: async (params, userId, companyId) => {
        const { entity = 'TRANSACTIONS', filters = {}, groupBy, sortBy, sortDir = 'asc' } = params;
        const cap = Math.min(parseInt(params.limit) || 500, 2000);
        let rows = [];

        if (entity === 'TRANSACTIONS') {
            const query = { userId, companyId };
            if (filters.fromDate || filters.toDate) {
                query.date = {};
                if (filters.fromDate) query.date.$gte = filters.fromDate;
                if (filters.toDate) query.date.$lte = filters.toDate;
            }
            if (filters.type && filters.type !== 'All') query.type = filters.type;
            if (filters.status && filters.status !== 'All') query.status = filters.status;
            if (filters.minAmount) query.total = { $gte: parseFloat(filters.minAmount) };
            if (filters.maxAmount) query.total = { ...query.total, $lte: parseFloat(filters.maxAmount) };

            const txns = await Transaction.find(query).sort({ date: -1 }).limit(cap).lean();
            rows = txns.map(t => ({
                date: t.date,
                type: t.type,
                refNumber: t.refNumber || t.invoiceNumber || '',
                name: t.customerName || t.vendorName || '',
                memo: t.memo || '',
                total: t.total || 0,
                status: t.status || '',
            }));

        } else if (entity === 'CUSTOMERS') {
            const query = { userId, companyId };
            if (filters.isActive === 'true') query.isActive = true;
            if (filters.isActive === 'false') query.isActive = false;
            const custs = await Customer.find(query).sort({ displayName: 1 }).limit(cap).lean();
            rows = custs.map(c => ({
                name: c.displayName || c.companyName || '',
                email: c.email || '',
                phone: c.phone || '',
                balance: c.balance || 0,
                creditLimit: c.creditLimit || 0,
                terms: c.paymentTerms || '',
                isActive: c.isActive !== false ? 'Active' : 'Inactive',
            }));

        } else if (entity === 'ITEMS') {
            const query = { userId, companyId };
            if (filters.type && filters.type !== 'All') query.type = filters.type;
            if (filters.isActive === 'true') query.isActive = true;
            if (filters.isActive === 'false') query.isActive = false;
            const allItems = await Item.find(query).sort({ name: 1 }).limit(cap).lean();
            rows = allItems.map(i => ({
                name: i.name,
                sku: i.sku || '',
                type: i.type,
                salesPrice: i.salesPrice || 0,
                cost: i.averageCost || i.cost || 0,
                onHand: i.onHand || 0,
                reorderPoint: i.reorderPoint || 0,
                isActive: i.isActive !== false ? 'Active' : 'Inactive',
            }));

        } else if (entity === 'VENDORS') {
            const Vendor = require('../models/Vendor');
            const query = { userId, companyId };
            const vends = await Vendor.find(query).sort({ displayName: 1 }).limit(cap).lean();
            rows = vends.map(v => ({
                name: v.displayName || v.companyName || '',
                email: v.email || '',
                phone: v.phone || '',
                balance: v.balance || 0,
                terms: v.paymentTerms || '',
                isActive: v.isActive !== false ? 'Active' : 'Inactive',
            }));

        } else if (entity === 'INVENTORY') {
            const InventoryLot = require('../models/InventoryLot');
            const query = { userId, companyId };
            if (filters.fromDate || filters.toDate) {
                query.receivedDate = {};
                if (filters.fromDate) query.receivedDate.$gte = filters.fromDate;
                if (filters.toDate) query.receivedDate.$lte = filters.toDate;
            }
            const [lots, allItems] = await Promise.all([
                InventoryLot.find(query).sort({ receivedDate: -1 }).limit(cap).lean(),
                Item.find({ userId, companyId }).lean(),
            ]);
            const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]));
            rows = lots.map(l => ({
                lotNumber: l.lotNumber || '',
                itemName: itemMap[l.itemId]?.name || l.itemId,
                receivedDate: l.receivedDate || '',
                expiryDate: l.expiryDate || '',
                quantityReceived: l.quantityReceived || 0,
                quantityRemaining: l.quantityRemaining || 0,
                unitCost: l.unitCost || 0,
                status: l.lotStatus || 'active',
            }));
        } else {
            throw new Error(`Unknown entity: ${entity}. Valid: TRANSACTIONS, CUSTOMERS, ITEMS, VENDORS, INVENTORY`);
        }

        // Optional groupBy
        if (groupBy && rows.length > 0 && rows[0][groupBy] !== undefined) {
            const grouped = {};
            for (const row of rows) {
                const key = String(row[groupBy] ?? 'Other');
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(row);
            }
            const sections = [{ title: `Advanced Query — ${entity} grouped by ${groupBy}`, isHeading: true }];
            for (const [key, groupRows] of Object.entries(grouped)) {
                sections.push({ title: key, isSubheading: true });
                groupRows.forEach(r => sections.push({ ...r, title: r.name || r.lotNumber || r.date || key, indent: 2 }));
                sections.push({ title: `${key} subtotal`, isTotal: true, indent: 1, value: groupRows.length });
            }
            return { sections, entity, groupBy, totalRows: rows.length };
        }

        // Optional sort
        if (sortBy && rows.length > 0 && rows[0][sortBy] !== undefined) {
            rows.sort((a, b) => {
                const av = a[sortBy], bv = b[sortBy];
                const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
                return sortDir === 'desc' ? -cmp : cmp;
            });
        }

        return {
            sections: null,
            rows,
            columns: rows.length > 0 ? Object.keys(rows[0]) : [],
            entity,
            totalRows: rows.length,
        };
    },

    // ══════════════════════════════════════════════════════════════════════════
    // QB ENTERPRISE — MANAGEMENT REPORT PACKAGES
    // ══════════════════════════════════════════════════════════════════════════

    getManagementReportPackage: async (packageType, fromDate, toDate, userId, companyId) => {
        if (packageType === 'EXECUTIVE_SUMMARY') {
            const [pl, aging, cashFlow] = await Promise.all([
                reportService.getProfitAndLoss(fromDate, toDate, userId, companyId, {}),
                reportService.getARAging(fromDate, toDate, userId, companyId),
                reportService.getCashFlow(fromDate, toDate, userId, companyId),
            ]);

            const plSections = pl.sections || [];
            const totalIncome   = plSections.find(s => s.title === 'Total Income')?.value || 0;
            const totalExpenses = plSections.find(s => s.title === 'Total Expenses')?.value || 0;
            const netIncome     = plSections.find(s => s.isGrandTotal)?.value || (totalIncome - totalExpenses);
            const totalAR       = (aging.sections || []).find(s => s.isGrandTotal)?.value || 0;
            const netCash       = (cashFlow.sections || []).find(s => s.isGrandTotal)?.value || 0;

            const sections = [
                { title: 'Executive Summary', isHeading: true },
                { title: `Period: ${fromDate} — ${toDate}`, isSubheading: true },

                { title: 'INCOME STATEMENT HIGHLIGHTS', isSubheading: true, spacing: true },
                { title: 'Total Revenue',   value: totalIncome,   indent: 2 },
                { title: 'Total Expenses',  value: totalExpenses, indent: 2 },
                { title: 'Net Income',      value: netIncome,     isTotal: true, indent: 1 },

                { title: 'CASH POSITION', isSubheading: true, spacing: true },
                { title: 'Net Change in Cash',              value: netCash,  indent: 2 },
                { title: 'Accounts Receivable Outstanding', value: totalAR,  indent: 2 },

                { title: 'KEY RATIOS', isSubheading: true, spacing: true },
                {
                    title: 'Gross Margin %',
                    value: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
                    isPercent: true, indent: 2,
                },
                {
                    title: 'Expense Ratio %',
                    value: totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0,
                    isPercent: true, indent: 2,
                },

                { title: 'NET INCOME', isGrandTotal: true, value: netIncome, spacing: true },
            ];
            return { sections, packageType };

        } else if (packageType === 'COMPANY_OVERVIEW') {
            const [bs, equity] = await Promise.all([
                reportService.getBalanceSheet(toDate, userId, companyId),
                reportService.getStatementOfChangesInEquity(fromDate, toDate, userId, companyId),
            ]);

            const bsSections = bs.sections || [];
            const totalAssets      = bsSections.find(s => s.title?.toLowerCase().includes('total assets'))?.value || 0;
            const totalLiabilities = bsSections.find(s => s.title?.toLowerCase().includes('total liabilities'))?.value || 0;
            const totalEquity      = bsSections.find(s => s.isGrandTotal)?.value || 0;

            const sections = [
                { title: 'Company Overview', isHeading: true },
                { title: `As of ${toDate}`, isSubheading: true },

                { title: 'BALANCE SHEET SUMMARY', isSubheading: true, spacing: true },
                { title: 'Total Assets',      value: totalAssets,      indent: 2 },
                { title: 'Total Liabilities', value: totalLiabilities, indent: 2 },
                { title: 'Total Equity',      value: totalEquity,      isTotal: true, indent: 1 },

                { title: 'FINANCIAL HEALTH RATIOS', isSubheading: true, spacing: true },
                {
                    title: 'Debt-to-Equity',
                    value: totalEquity > 0 ? Math.round((totalLiabilities / totalEquity) * 100) / 100 : 0,
                    indent: 2,
                },
                {
                    title: 'Equity Ratio %',
                    value: totalAssets > 0 ? (totalEquity / totalAssets) * 100 : 0,
                    isPercent: true, indent: 2,
                },

                { title: 'NET EQUITY POSITION', isGrandTotal: true, value: totalEquity, spacing: true },
            ];
            return { sections, packageType };

        } else if (packageType === 'SALES_PERFORMANCE') {
            const [byCust, byRep, byItem] = await Promise.all([
                reportService.getSalesByCustomerSummary(fromDate, toDate, userId, companyId),
                reportService.getSalesByRepSummary(fromDate, toDate, userId, companyId),
                reportService.getSalesByItem(fromDate, toDate, userId, companyId),
            ]);

            const custSections = byCust.sections || [];
            const totalSales = custSections.find(s => s.isGrandTotal)?.value || 0;

            const sections = [
                { title: 'Sales Performance Report', isHeading: true },
                { title: `Period: ${fromDate} — ${toDate}`, isSubheading: true },

                { title: 'TOTAL PERIOD REVENUE', isSubheading: true, spacing: true },
                { title: 'Total Sales', value: totalSales, isTotal: true, indent: 1 },

                { title: 'SALES BY CUSTOMER', isSubheading: true, spacing: true },
                ...custSections.filter(s => !s.isHeading).slice(0, 25),

                { title: 'SALES BY REPRESENTATIVE', isSubheading: true, spacing: true },
                ...(byRep.sections || []).filter(s => !s.isHeading).slice(0, 25),

                { title: 'TOP ITEMS BY REVENUE', isSubheading: true, spacing: true },
                ...(byItem.sections || []).filter(s => !s.isHeading && !s.isGrandTotal).slice(0, 25),

                { title: 'TOTAL REVENUE', isGrandTotal: true, value: totalSales, spacing: true },
            ];
            return { sections, packageType };
        }

        throw new Error(`Unknown package type: ${packageType}. Valid: EXECUTIVE_SUMMARY, COMPANY_OVERVIEW, SALES_PERFORMANCE`);
    },

    // ── Customer Contact List ─────────────────────────────────────────────────
    getCustomerContactList: async (userId, companyId) => {
        const customers = await Customer.find({ userId, companyId }).sort({ name: 1 }).lean();
        const rows = customers.map(c => ({
            name: c.name,
            companyName: c.companyName || '',
            phone: c.phone || '',
            email: c.email || '',
            address: c.address || '',
            isActive: c.isActive !== false ? 'Active' : 'Inactive',
            balance: c.balance || 0,
        }));
        return {
            title: 'Customer Contact List',
            columns: ['Name', 'Company', 'Phone', 'Email', 'Address', 'Status', 'Balance'],
            rows,
        };
    },

    // ── Item Listing (full catalog) ───────────────────────────────────────────
    getItemListing: async (userId, companyId) => {
        const items = await Item.find({ userId, companyId }).sort({ name: 1 }).lean();
        const rows = items.map(i => ({
            name: i.name,
            type: i.type || '',
            description: i.description || '',
            salesPrice: i.salesPrice || 0,
            cost: i.cost || 0,
            averageCost: i.averageCost || 0,
            onHand: i.onHand || 0,
            reorderPoint: i.reorderPoint || 0,
            category: i.category || '',
            isActive: i.isActive !== false ? 'Active' : 'Inactive',
        }));
        return {
            title: 'Item Listing',
            columns: ['Name', 'Type', 'Description', 'Sales Price', 'Cost', 'Avg Cost', 'On Hand', 'Reorder Pt', 'Category', 'Status'],
            rows,
        };
    },

    // ── Item Price List ───────────────────────────────────────────────────────
    getItemPriceList: async (userId, companyId) => {
        const PriceLevel = require('../models/PriceLevel');
        const [items, priceLevels] = await Promise.all([
            Item.find({ userId, companyId, isActive: true }).sort({ name: 1 }).lean(),
            PriceLevel.find({ userId, companyId, isActive: true }).sort({ name: 1 }).lean(),
        ]);

        const sections = [{ title: 'Item Price List', isHeading: true }];
        const plNames = priceLevels.map(pl => pl.name);

        sections.push({ title: 'Standard Price', isSubheading: true, spacing: true });
        for (const item of items) {
            const row = { title: item.name, value: item.salesPrice || 0, indent: 1 };
            // Attach price-level specific prices if defined
            for (const pl of priceLevels) {
                const override = (pl.itemPrices || []).find(ip => ip.itemId === item.id);
                row[`pl_${pl.name}`] = override ? override.customPrice : null;
            }
            sections.push(row);
        }

        return { title: 'Item Price List', priceLevelNames: plNames, sections };
    },

    // ── Open Sales Orders ─────────────────────────────────────────────────────
    getOpenSalesOrders: async (fromDate, toDate, userId, companyId) => {
        const query = { userId, companyId, type: 'salesorder', status: { $in: ['OPEN', 'PARTIAL'] } };
        if (fromDate) query.date = { ...(query.date || {}), $gte: fromDate };
        if (toDate) query.date = { ...(query.date || {}), $lte: toDate };

        const orders = await Transaction.find(query).sort({ date: 1 }).lean();
        const customers = await Customer.find({ userId, companyId }).lean();
        const custMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

        const rows = orders.map(o => ({
            soNumber: o.refNumber || o.id,
            date: o.date,
            customer: custMap[o.customerId] || o.customerId || '',
            shipDate: o.shipDate || '',
            status: o.status || 'OPEN',
            total: o.total || 0,
            memo: o.memo || '',
        }));

        const grandTotal = rows.reduce((s, r) => s + r.total, 0);
        return {
            title: 'Open Sales Orders',
            columns: ['SO #', 'Date', 'Customer', 'Ship Date', 'Status', 'Total', 'Memo'],
            rows,
            grandTotal,
        };
    },

    // ── Backorder Report ──────────────────────────────────────────────────────
    getBackorderReport: async (fromDate, toDate, userId, companyId) => {
        const query = {
            userId, companyId,
            type: { $in: ['salesorder', 'invoice'] },
            backorderStatus: { $in: ['PARTIAL', 'FULL'] },
        };
        if (fromDate) query.date = { ...(query.date || {}), $gte: fromDate };
        if (toDate) query.date = { ...(query.date || {}), $lte: toDate };

        const txns = await Transaction.find(query).sort({ date: 1 }).lean();
        const customers = await Customer.find({ userId, companyId }).lean();
        const items = await Item.find({ userId, companyId }).lean();
        const custMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
        const itemMap = Object.fromEntries(items.map(i => [i.id, i.name]));

        const rows = [];
        for (const txn of txns) {
            for (const line of (txn.lines || [])) {
                const backordered = (line.quantity || 0) - (line.quantityFulfilled || 0);
                if (backordered <= 0) continue;
                rows.push({
                    docNumber: txn.refNumber || txn.id,
                    date: txn.date,
                    customer: custMap[txn.customerId] || '',
                    item: itemMap[line.itemId] || line.itemId || '',
                    orderedQty: line.quantity || 0,
                    fulfilledQty: line.quantityFulfilled || 0,
                    backorderedQty: backordered,
                    unitPrice: line.rate || 0,
                    backorderValue: backordered * (line.rate || 0),
                });
            }
        }

        const grandTotal = rows.reduce((s, r) => s + r.backorderValue, 0);
        return {
            title: 'Backorder Report',
            columns: ['Doc #', 'Date', 'Customer', 'Item', 'Ordered', 'Fulfilled', 'Backordered', 'Unit Price', 'Backorder Value'],
            rows,
            grandTotal,
        };
    },

    // ── Employee Contact List ─────────────────────────────────────────────────
    getEmployeeContactList: async (userId, companyId) => {
        const employees = await Employee.find({ userId, companyId }).sort({ name: 1 }).lean();
        const rows = employees.map(e => ({
            name: e.name,
            phone: e.phone || '',
            email: e.email || '',
            address: e.address || '',
            hiredDate: e.hiredDate || '',
            type: e.type || '',
            isActive: e.isActive !== false ? 'Active' : 'Inactive',
        }));
        return {
            title: 'Employee Contact List',
            columns: ['Name', 'Phone', 'Email', 'Address', 'Hire Date', 'Type', 'Status'],
            rows,
        };
    },

    // ── Payroll Detail Review (per-employee) ──────────────────────────────────
    getPayrollDetailReview: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end = toDate || new Date().toISOString().split('T')[0];

        const [txns, employees] = await Promise.all([
            Transaction.find({
                userId, companyId, type: 'paycheck',
                date: { $gte: start, $lte: end },
            }).sort({ date: 1 }).lean(),
            Employee.find({ userId, companyId }).lean(),
        ]);

        const empMap = Object.fromEntries(employees.map(e => [e.id, e.name]));
        // Group by employee
        const byEmp = {};
        for (const t of txns) {
            const empId = t.employeeId || 'Unknown';
            if (!byEmp[empId]) byEmp[empId] = { name: empMap[empId] || empId, paychecks: [] };
            byEmp[empId].paychecks.push({
                date: t.date,
                checkNumber: t.refNumber || '',
                grossPay: t.grossPay || t.total || 0,
                federalTax: t.federalTax || 0,
                stateTax: t.stateTax || 0,
                socialSecurity: t.socialSecurity || 0,
                medicare: t.medicare || 0,
                netPay: t.netPay || t.total || 0,
            });
        }

        const sections = [{ title: 'Payroll Detail Review', isHeading: true }];
        for (const [, emp] of Object.entries(byEmp)) {
            sections.push({ title: emp.name, isSubheading: true, spacing: true });
            let empGross = 0, empNet = 0;
            for (const p of emp.paychecks) {
                empGross += p.grossPay;
                empNet += p.netPay;
                sections.push({ title: `${p.date}  Ck#${p.checkNumber}`, value: p.netPay, indent: 2,
                    grossPay: p.grossPay, federalTax: p.federalTax, stateTax: p.stateTax,
                    socialSecurity: p.socialSecurity, medicare: p.medicare });
            }
            sections.push({ title: `${emp.name} Total`, value: empNet, isTotal: true, grossPay: empGross, indent: 1 });
        }

        const grandGross = Object.values(byEmp).flatMap(e => e.paychecks).reduce((s, p) => s + p.grossPay, 0);
        const grandNet = Object.values(byEmp).flatMap(e => e.paychecks).reduce((s, p) => s + p.netPay, 0);
        sections.push({ title: 'Grand Total Net Pay', value: grandNet, isGrandTotal: true, grossPay: grandGross, spacing: true });

        return { sections, title: 'Payroll Detail Review', fromDate: start, toDate: end };
    },

    // ── Workers' Comp Summary ─────────────────────────────────────────────────
    getWorkerCompSummary: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const end = toDate || new Date().toISOString().split('T')[0];

        const txns = await Transaction.find({
            userId, companyId, type: 'paycheck',
            date: { $gte: start, $lte: end },
        }).lean();

        // Group by workerCompCode (stored on transaction or employee)
        const byCode = {};
        for (const t of txns) {
            const code = t.workerCompCode || 'Unassigned';
            if (!byCode[code]) byCode[code] = { gross: 0, count: 0 };
            byCode[code].gross += t.grossPay || t.total || 0;
            byCode[code].count += 1;
        }

        const sections = [
            { title: "Workers' Comp Summary", isHeading: true },
            { title: `Period: ${start} — ${end}`, isSubheading: true },
        ];
        let grandTotal = 0;
        for (const [code, data] of Object.entries(byCode)) {
            sections.push({ title: code, value: data.gross, indent: 1, count: data.count });
            grandTotal += data.gross;
        }
        sections.push({ title: 'Total Gross Wages', value: grandTotal, isGrandTotal: true, spacing: true });

        return { sections, title: "Workers' Comp Summary" };
    },

    // ── 1099 Summary ──────────────────────────────────────────────────────────
    get1099Summary: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || `${new Date().getFullYear()}-01-01`;
        const end = toDate || `${new Date().getFullYear()}-12-31`;

        const [vendors, txns] = await Promise.all([
            Vendor.find({ userId, companyId, eligibleFor1099: true }).lean(),
            Transaction.find({
                userId, companyId,
                type: { $in: ['bill', 'check', 'vendorcredit'] },
                date: { $gte: start, $lte: end },
            }).lean(),
        ]);

        const eligible = new Set(vendors.map(v => v.id));
        const totals = {};
        for (const t of txns) {
            if (!t.vendorId || !eligible.has(t.vendorId)) continue;
            if (!totals[t.vendorId]) totals[t.vendorId] = 0;
            const sign = t.type === 'vendorcredit' ? -1 : 1;
            totals[t.vendorId] += sign * (t.total || 0);
        }

        const MIN_1099 = 600;
        const rows = vendors
            .map(v => ({ vendor: v.name, address: v.address || '', total: totals[v.id] || 0 }))
            .filter(r => r.total >= MIN_1099)
            .sort((a, b) => b.total - a.total);

        const grandTotal = rows.reduce((s, r) => s + r.total, 0);
        return {
            title: '1099 Summary',
            taxYear: new Date(start).getFullYear(),
            threshold: MIN_1099,
            columns: ['Vendor', 'Address', 'Total Paid'],
            rows,
            grandTotal,
        };
    },

    // ── 1099 Detail ───────────────────────────────────────────────────────────
    get1099Detail: async (fromDate, toDate, userId, companyId) => {
        const start = fromDate || `${new Date().getFullYear()}-01-01`;
        const end = toDate || `${new Date().getFullYear()}-12-31`;

        const [vendors, txns] = await Promise.all([
            Vendor.find({ userId, companyId, eligibleFor1099: true }).lean(),
            Transaction.find({
                userId, companyId,
                type: { $in: ['bill', 'check', 'vendorcredit'] },
                date: { $gte: start, $lte: end },
            }).sort({ date: 1 }).lean(),
        ]);

        const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));
        const eligible = new Set(vendors.map(v => v.id));

        // Group transactions by vendor
        const byVendor = {};
        for (const t of txns) {
            if (!t.vendorId || !eligible.has(t.vendorId)) continue;
            if (!byVendor[t.vendorId]) byVendor[t.vendorId] = [];
            byVendor[t.vendorId].push(t);
        }

        const sections = [
            { title: '1099 Detail', isHeading: true },
            { title: `Tax Year: ${new Date(start).getFullYear()}`, isSubheading: true },
        ];

        let grandTotal = 0;
        for (const [vendorId, vendorTxns] of Object.entries(byVendor)) {
            const v = vendorMap[vendorId];
            const vTotal = vendorTxns.reduce((s, t) => {
                const sign = t.type === 'vendorcredit' ? -1 : 1;
                return s + sign * (t.total || 0);
            }, 0);
            if (vTotal < 600) continue;

            sections.push({ title: v.name, isSubheading: true, spacing: true });
            for (const t of vendorTxns) {
                const sign = t.type === 'vendorcredit' ? -1 : 1;
                sections.push({
                    title: `${t.date}  ${t.type.toUpperCase()}  #${t.refNumber || t.id}`,
                    value: sign * (t.total || 0),
                    indent: 2,
                });
            }
            sections.push({ title: `${v.name} Total`, value: vTotal, isTotal: true, indent: 1 });
            grandTotal += vTotal;
        }
        sections.push({ title: 'Grand Total', value: grandTotal, isGrandTotal: true, spacing: true });

        return { sections, title: '1099 Detail' };
    },

    // ── Inventory Aging ───────────────────────────────────────────────────────
    getInventoryAging: async (asOfDate, userId, companyId) => {
        const asOf = asOfDate || new Date().toISOString().split('T')[0];
        const InventoryLot = require('../models/InventoryLot');

        const [items, lots] = await Promise.all([
            Item.find({ userId, companyId, isActive: true }).lean(),
            InventoryLot.find({ userId, companyId, remainingQty: { $gt: 0 } }).lean(),
        ]);

        const itemMap = Object.fromEntries(items.map(i => [i.id, i]));
        const asOfMs = new Date(asOf).getTime();

        const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, '180+': 0 };
        const rows = [];

        for (const lot of lots) {
            const item = itemMap[lot.itemId];
            if (!item) continue;
            const receivedMs = new Date(lot.receivedDate || lot.createdAt).getTime();
            const ageDays = Math.floor((asOfMs - receivedMs) / 86400000);
            const value = (lot.remainingQty || 0) * (lot.unitCost || item.averageCost || 0);

            let bucket = '180+';
            if (ageDays <= 30) bucket = '0-30';
            else if (ageDays <= 60) bucket = '31-60';
            else if (ageDays <= 90) bucket = '61-90';
            else if (ageDays <= 180) bucket = '91-180';

            buckets[bucket] += value;
            rows.push({
                item: item.name,
                lotNumber: lot.lotNumber || '',
                receivedDate: lot.receivedDate || '',
                ageDays,
                remainingQty: lot.remainingQty,
                unitCost: lot.unitCost || item.averageCost || 0,
                value,
                bucket,
            });
        }

        rows.sort((a, b) => b.ageDays - a.ageDays);
        const grandTotal = Object.values(buckets).reduce((s, v) => s + v, 0);

        const sections = [
            { title: 'Inventory Aging', isHeading: true },
            { title: `As of ${asOf}`, isSubheading: true },
            { title: '0–30 Days', value: buckets['0-30'], indent: 1 },
            { title: '31–60 Days', value: buckets['31-60'], indent: 1 },
            { title: '61–90 Days', value: buckets['61-90'], indent: 1 },
            { title: '91–180 Days', value: buckets['91-180'], indent: 1 },
            { title: '180+ Days', value: buckets['180+'], indent: 1 },
            { title: 'Total Inventory Value', value: grandTotal, isGrandTotal: true, spacing: true },
        ];

        return { sections, rows, buckets, grandTotal, title: 'Inventory Aging' };
    },

    // ── Assembly Component Usage ───────────────────────────────────────────────
    getAssemblyComponentUsage: async (userId, companyId) => {
        const assemblies = await Item.find({
            userId, companyId,
            type: { $in: ['Inventory Assembly', 'Assembly'] },
            isActive: true,
        }).lean();

        const allItemIds = [...new Set(assemblies.flatMap(a => (a.assemblyItems || []).map(c => c.itemId)))];
        const components = await Item.find({ userId, companyId, id: { $in: allItemIds } }).lean();
        const compMap = Object.fromEntries(components.map(c => [c.id, c]));

        // Build component → assemblies index
        const usageMap = {};
        for (const asm of assemblies) {
            for (const comp of (asm.assemblyItems || [])) {
                if (!usageMap[comp.itemId]) usageMap[comp.itemId] = [];
                usageMap[comp.itemId].push({ assemblyName: asm.name, qty: comp.qty || 1 });
            }
        }

        const sections = [{ title: 'Assembly Component Usage', isHeading: true }];
        for (const [compId, usages] of Object.entries(usageMap)) {
            const comp = compMap[compId];
            sections.push({ title: comp ? comp.name : compId, isSubheading: true, spacing: true });
            for (const u of usages) {
                sections.push({ title: u.assemblyName, value: u.qty, indent: 2, label: 'Qty per Assembly' });
            }
        }

        // Also provide assembly-centric view
        const assemblyRows = assemblies.map(asm => ({
            assemblyName: asm.name,
            components: (asm.assemblyItems || []).map(c => ({
                componentName: compMap[c.itemId]?.name || c.itemId,
                qty: c.qty || 1,
                unitCost: compMap[c.itemId]?.averageCost || 0,
                extCost: (c.qty || 1) * (compMap[c.itemId]?.averageCost || 0),
            })),
        }));

        return { sections, assemblyRows, title: 'Assembly Component Usage' };
    },

    // ── Memorized Reports (save/list/delete/run) ──────────────────────────────
    saveMemorizedReport: async (userId, companyId, { name, reportType, params, groupName }) => {
        const MemorizedReport = require('../models/MemorizedReport');
        const { v4: uuidv4 } = require('uuid');
        const doc = await MemorizedReport.findOneAndUpdate(
            { userId, companyId, name },
            { id: uuidv4(), userId, companyId, name, baseType: reportType, params: params || {}, groupName: groupName || null },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return doc;
    },

    getMemorizedReports: async (userId, companyId, groupName) => {
        const MemorizedReport = require('../models/MemorizedReport');
        const filter = { userId, companyId };
        if (groupName) filter.groupName = groupName;
        const reports = await MemorizedReport.find(filter).sort({ name: 1 }).lean();
        return reports;
    },

    deleteMemorizedReport: async (userId, companyId, id) => {
        const MemorizedReport = require('../models/MemorizedReport');
        await MemorizedReport.deleteOne({ userId, companyId, id });
        return { success: true };
    },

    runMemorizedReport: async (userId, companyId, id, overrideParams = {}) => {
        const MemorizedReport = require('../models/MemorizedReport');
        const mem = await MemorizedReport.findOne({ userId, companyId, id }).lean();
        if (!mem) throw new Error(`Memorized report not found: ${id}`);

        const params = { ...(mem.params || {}), ...overrideParams };
        const { fromDate, toDate } = params;

        // Dispatch to the correct service method based on baseType
        const methodMap = {
            'profit-and-loss': () => reportService.getProfitAndLoss(fromDate, toDate, userId, companyId, params),
            'balance-sheet': () => reportService.getBalanceSheet(toDate, userId, companyId),
            'ar-aging': () => reportService.getARAging(fromDate, toDate, userId, companyId),
            'ap-aging': () => reportService.getAPAging(fromDate, toDate, userId, companyId),
            'sales-by-item': () => reportService.getSalesByItem(fromDate, toDate, userId, companyId),
            'inventory-valuation': () => reportService.getInventoryValuation(fromDate, toDate, userId, companyId),
            'general-ledger': () => reportService.getGeneralLedger(fromDate, toDate, userId, companyId, params),
            'tax-liability': () => reportService.getTaxLiability(fromDate, toDate, userId, companyId),
            'trial-balance': () => reportService.getTrialBalance(fromDate, toDate, userId, companyId),
            'cash-flow': () => reportService.getCashFlow(fromDate, toDate, userId, companyId),
            'payroll-summary': () => reportService.getPayrollSummary(fromDate, toDate, userId, companyId),
            'budget-vs-actual': () => reportService.getBudgetVsActual(fromDate, toDate, userId, companyId),
            'forecast': () => reportService.getForecast(fromDate, toDate, userId, companyId, params),
            'pl-by-class': () => reportService.getProfitAndLossByClass(fromDate, toDate, userId, companyId),
            'sales-by-customer': () => reportService.getSalesByCustomerSummary(fromDate, toDate, userId, companyId),
            'customer-balance': () => reportService.getCustomerBalanceSummary(fromDate, toDate, userId, companyId),
            'vendor-balance': () => reportService.getVendorBalanceSummary(fromDate, toDate, userId, companyId),
            'inventory-valuation-detail': () => reportService.getInventoryValuationDetail(fromDate, toDate, userId, companyId),
            'ar-aging-detail': () => reportService.getARAgingDetail(fromDate, toDate, userId, companyId),
            'customer-balance-detail': () => reportService.getCustomerBalanceDetail(fromDate, toDate, userId, companyId),
            'open-sales-orders': () => reportService.getOpenSalesOrders(fromDate, toDate, userId, companyId),
            'backorder': () => reportService.getBackorderReport(fromDate, toDate, userId, companyId),
            '1099-summary': () => reportService.get1099Summary(fromDate, toDate, userId, companyId),
            '1099-detail': () => reportService.get1099Detail(fromDate, toDate, userId, companyId),
            'inventory-aging': () => reportService.getInventoryAging(toDate, userId, companyId),
            'customer-contact-list': () => reportService.getCustomerContactList(userId, companyId),
            'item-listing': () => reportService.getItemListing(userId, companyId),
            'item-price-list': () => reportService.getItemPriceList(userId, companyId),
            'employee-contact-list': () => reportService.getEmployeeContactList(userId, companyId),
            'payroll-detail-review': () => reportService.getPayrollDetailReview(fromDate, toDate, userId, companyId),
            'workers-comp-summary': () => reportService.getWorkerCompSummary(fromDate, toDate, userId, companyId),
            'assembly-component-usage': () => reportService.getAssemblyComponentUsage(userId, companyId),
            'mrp-reception-report': () => reportService.getMRPReceptionReport(params.moId, userId, companyId),
            'allocation-status': () => reportService.getAllocationStatusReport(fromDate, toDate, userId, companyId),
            'product-allocation': () => reportService.getProductAllocationReport(fromDate, toDate, userId, companyId),
        };

        const fn = methodMap[mem.baseType];
        if (!fn) throw new Error(`No handler for report type: ${mem.baseType}`);

        // Update lastRunAt
        await MemorizedReport.updateOne({ userId, companyId, id }, { $set: { lastRunAt: new Date() } });

        const data = await fn();
        return { memorizedReport: mem, params, data };
    },

    // ── Allocation Reports ────────────────────────────────────────────────────

    /**
     * MRP Reception Report — for a specific MO, list the open delivery orders (finished
     * product MOs) or open manufacturing orders (component MOs) that need the product,
     * together with what has already been allocated from this MO.
     *
     * @param {string} moId  - Transaction id of the source Manufacturing/Work Order
     */
    getMRPReceptionReport: async (moId, userId, companyId) => {
        if (!moId) throw new Error('Missing required parameter: moId');

        const Transaction = require('../models/Transaction');
        const Item = require('../models/Item');
        const Customer = require('../models/Customer');

        // Load the source MO
        const mo = await Transaction.findOne({ id: moId, userId, companyId }).lean();
        if (!mo) throw new Error(`Manufacturing/Work Order not found: ${moId}`);

        const isWorkOrder = mo.type === 'WORK_ORDER';
        const assemblyItemId = mo.items && mo.items[0] ? mo.items[0].itemId : null;

        if (!assemblyItemId) {
            return {
                title: 'MRP Reception Report',
                moRefNo: mo.refNo || moId,
                rows: [],
                columns: ['Order #', 'Customer / Assembly', 'Date', 'Line Item', 'Qty Required', 'Qty Allocated', 'Remaining', 'Status'],
            };
        }

        // Quantity this MO produced/will produce
        const moQty = isWorkOrder
            ? (mo.quantityPlanned || 0) - (mo.quantityCompleted || 0)  // remaining to build
            : (mo.items[0].quantity || 0);

        // Existing allocations from this MO
        const existingAllocations = mo.allocations || [];
        const allocatedByLine = {};
        for (const a of existingAllocations) {
            const key = `${a.targetTransactionId}__${a.lineItemId}`;
            allocatedByLine[key] = (allocatedByLine[key] || 0) + (a.quantity || 0);
        }

        // Fetch item record to decide whether this is a finished-product or component context
        const assemblyItem = await Item.findOne({ id: assemblyItemId, userId, companyId }).lean();
        const isComponent = assemblyItem && assemblyItem.type !== 'Inventory Assembly';

        let targetOrders = [];

        if (isComponent) {
            // Component → list open Work Orders / Assembly Builds that need this component
            const wos = await Transaction.find({
                userId, companyId,
                type: { $in: ['WORK_ORDER', 'ASSEMBLY_BUILD'] },
                workOrderStatus: { $in: ['OPEN', 'IN_PROGRESS', 'PARTIAL_COMPLETE'] },
            }).lean();

            for (const wo of wos) {
                if (!wo.items) continue;
                for (const line of wo.items) {
                    if (line.itemId !== assemblyItemId) continue;
                    const needed = line.quantity || 0;
                    const key = `${wo.id}__${line.id}`;
                    const allocated = allocatedByLine[key] || 0;
                    const remaining = Math.max(0, needed - allocated);
                    targetOrders.push({
                        orderId: wo.id,
                        orderRefNo: wo.refNo || wo.id,
                        entityName: wo.items[0]?.description || 'Assembly',
                        date: wo.date,
                        lineItemId: line.id,
                        lineDescription: line.description || assemblyItem.name || assemblyItemId,
                        qtyRequired: needed,
                        qtyAllocated: allocated,
                        remaining,
                        status: allocated === 0 ? 'Unassigned' : (remaining === 0 ? 'Fully Assigned' : 'Partially Assigned'),
                        targetType: 'WORK_ORDER',
                    });
                }
            }
        } else {
            // Finished product → list open Sales Orders / Delivery Orders that need this product
            const sos = await Transaction.find({
                userId, companyId,
                type: 'SALES_ORDER',
                status: { $in: ['OPEN', 'PARTIAL'] },
            }).lean();

            // Build customer map
            const customerIds = [...new Set(sos.map(s => s.customerId).filter(Boolean))];
            const customers = await Customer.find({ id: { $in: customerIds }, userId, companyId }).lean();
            const customerMap = {};
            for (const c of customers) customerMap[c.id] = c.name || c.companyName || c.id;

            for (const so of sos) {
                if (!so.items) continue;
                for (const line of so.items) {
                    if (line.itemId !== assemblyItemId) continue;
                    if (line.isClosed) continue;
                    const shipped = line.receivedQuantity || 0;
                    const needed = Math.max(0, (line.quantity || 0) - shipped);
                    if (needed === 0) continue;
                    const key = `${so.id}__${line.id}`;
                    const allocated = allocatedByLine[key] || 0;
                    const remaining = Math.max(0, needed - allocated);
                    targetOrders.push({
                        orderId: so.id,
                        orderRefNo: so.refNo || so.id,
                        entityName: customerMap[so.customerId] || so.customerId || 'Unknown',
                        date: so.date,
                        lineItemId: line.id,
                        lineDescription: line.description || (assemblyItem && assemblyItem.name) || assemblyItemId,
                        qtyRequired: needed,
                        qtyAllocated: allocated,
                        remaining,
                        status: allocated === 0 ? 'Unassigned' : (remaining === 0 ? 'Fully Assigned' : 'Partially Assigned'),
                        targetType: 'DELIVERY_ORDER',
                    });
                }
            }
        }

        // Sort: unassigned first, then partial, then fully assigned
        const statusOrder = { 'Unassigned': 0, 'Partially Assigned': 1, 'Fully Assigned': 2 };
        targetOrders.sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));

        const totalAllocated = targetOrders.reduce((s, r) => s + r.qtyAllocated, 0);
        const totalRequired = targetOrders.reduce((s, r) => s + r.qtyRequired, 0);

        return {
            title: 'MRP Reception Report',
            moRefNo: mo.refNo || moId,
            moType: mo.type,
            assemblyItemId,
            assemblyItemName: (assemblyItem && assemblyItem.name) || assemblyItemId,
            moQtyAvailable: moQty,
            totalRequired,
            totalAllocated,
            totalRemaining: Math.max(0, totalRequired - totalAllocated),
            isComponent,
            columns: ['Order #', isComponent ? 'Assembly' : 'Customer', 'Date', 'Line Item', 'Qty Required', 'Qty Allocated', 'Remaining', 'Status'],
            rows: targetOrders.map(r => ({
                'Order #': r.orderRefNo,
                [isComponent ? 'Assembly' : 'Customer']: r.entityName,
                'Date': r.date,
                'Line Item': r.lineDescription,
                'Qty Required': r.qtyRequired,
                'Qty Allocated': r.qtyAllocated,
                'Remaining': r.remaining,
                'Status': r.status,
                // Non-display metadata for assign/unassign actions
                _orderId: r.orderId,
                _lineItemId: r.lineItemId,
                _targetType: r.targetType,
            })),
        };
    },

    /**
     * Allocation Status Report — summary of all open SOs and WOs, showing per-item
     * how much has been allocated vs. still required across all MOs.
     */
    getAllocationStatusReport: async (fromDate, toDate, userId, companyId) => {
        const Transaction = require('../models/Transaction');
        const Item = require('../models/Item');
        const Customer = require('../models/Customer');

        const dateFilter = {};
        if (fromDate) dateFilter.$gte = fromDate;
        if (toDate) dateFilter.$lte = toDate;

        // Load all open SOs
        const soQuery = { userId, companyId, type: 'SALES_ORDER', status: { $in: ['OPEN', 'PARTIAL'] } };
        if (fromDate || toDate) soQuery.date = dateFilter;
        const sos = await Transaction.find(soQuery).lean();

        // Load all open WOs
        const woQuery = { userId, companyId, type: 'WORK_ORDER', workOrderStatus: { $in: ['OPEN', 'IN_PROGRESS', 'PARTIAL_COMPLETE'] } };
        if (fromDate || toDate) woQuery.date = dateFilter;
        const wos = await Transaction.find(woQuery).lean();

        // Load all MOs with allocations
        const mosWithAlloc = await Transaction.find({
            userId, companyId,
            type: { $in: ['WORK_ORDER', 'ASSEMBLY_BUILD'] },
            'allocations.0': { $exists: true },
        }).lean();

        // Build allocation map: itemId → allocated qty
        const allocMap = {};
        for (const mo of mosWithAlloc) {
            for (const a of (mo.allocations || [])) {
                if (!a.itemId) continue;
                allocMap[a.itemId] = (allocMap[a.itemId] || 0) + (a.quantity || 0);
            }
        }

        // Gather all referenced itemIds
        const allItemIds = new Set();
        for (const so of sos) for (const line of (so.items || [])) if (line.itemId) allItemIds.add(line.itemId);
        for (const wo of wos) for (const line of (wo.items || [])) if (line.itemId) allItemIds.add(line.itemId);

        const items = await Item.find({ id: { $in: [...allItemIds] }, userId, companyId }).lean();
        const itemMap = {};
        for (const it of items) itemMap[it.id] = it;

        const customerIds = [...new Set(sos.map(s => s.customerId).filter(Boolean))];
        const customers = await Customer.find({ id: { $in: customerIds }, userId, companyId }).lean();
        const customerMap = {};
        for (const c of customers) customerMap[c.id] = c.name || c.companyName || c.id;

        // Aggregate per-item demand
        const demandByItem = {};
        for (const so of sos) {
            for (const line of (so.items || [])) {
                if (!line.itemId) continue;
                const shipped = line.receivedQuantity || 0;
                const remaining = Math.max(0, (line.quantity || 0) - shipped);
                if (remaining === 0) continue;
                if (!demandByItem[line.itemId]) {
                    demandByItem[line.itemId] = { soQty: 0, woQty: 0, orders: [] };
                }
                demandByItem[line.itemId].soQty += remaining;
                demandByItem[line.itemId].orders.push({ ref: so.refNo || so.id, type: 'SO', customer: customerMap[so.customerId] || '', qty: remaining });
            }
        }
        for (const wo of wos) {
            for (const line of (wo.items || [])) {
                if (!line.itemId) continue;
                const needed = line.quantity || 0;
                if (!demandByItem[line.itemId]) {
                    demandByItem[line.itemId] = { soQty: 0, woQty: 0, orders: [] };
                }
                demandByItem[line.itemId].woQty += needed;
                demandByItem[line.itemId].orders.push({ ref: wo.refNo || wo.id, type: 'WO', customer: '', qty: needed });
            }
        }

        const rows = Object.entries(demandByItem).map(([itemId, d]) => {
            const item = itemMap[itemId] || {};
            const totalDemand = d.soQty + d.woQty;
            const allocated = allocMap[itemId] || 0;
            const onHand = item.onHand || 0;
            const shortfall = Math.max(0, totalDemand - onHand);
            return {
                'Item': item.name || itemId,
                'On Hand': onHand,
                'SO Demand': d.soQty,
                'WO Demand': d.woQty,
                'Total Demand': totalDemand,
                'Allocated': allocated,
                'Unallocated Demand': Math.max(0, totalDemand - allocated),
                'Shortfall': shortfall,
                'Status': allocated >= totalDemand ? 'Fully Allocated' : (allocated > 0 ? 'Partially Allocated' : 'Unallocated'),
            };
        });

        rows.sort((a, b) => b['Shortfall'] - a['Shortfall']);

        return {
            title: 'Allocation Status Report',
            columns: ['Item', 'On Hand', 'SO Demand', 'WO Demand', 'Total Demand', 'Allocated', 'Unallocated Demand', 'Shortfall', 'Status'],
            rows,
            grandTotal: rows.reduce((s, r) => s + r['Total Demand'], 0),
        };
    },

    /**
     * Product Allocation by Order — for each open SO and WO, show how much of each
     * product has been allocated vs. what is still needed, grouped by order.
     */
    getProductAllocationReport: async (fromDate, toDate, userId, companyId) => {
        const Transaction = require('../models/Transaction');
        const Item = require('../models/Item');
        const Customer = require('../models/Customer');

        const dateFilter = {};
        if (fromDate) dateFilter.$gte = fromDate;
        if (toDate) dateFilter.$lte = toDate;

        const soQuery = { userId, companyId, type: 'SALES_ORDER', status: { $in: ['OPEN', 'PARTIAL'] } };
        if (fromDate || toDate) soQuery.date = dateFilter;
        const sos = await Transaction.find(soQuery).lean();

        const woQuery = { userId, companyId, type: 'WORK_ORDER', workOrderStatus: { $in: ['OPEN', 'IN_PROGRESS', 'PARTIAL_COMPLETE'] } };
        if (fromDate || toDate) woQuery.date = dateFilter;
        const wos = await Transaction.find(woQuery).lean();

        // Build allocation map: targetTransactionId + lineItemId → qty
        const mosWithAlloc = await Transaction.find({
            userId, companyId,
            'allocations.0': { $exists: true },
        }).lean();
        const allocByLine = {};
        const sourceByLine = {};
        for (const mo of mosWithAlloc) {
            for (const a of (mo.allocations || [])) {
                const key = `${a.targetTransactionId}__${a.lineItemId}`;
                allocByLine[key] = (allocByLine[key] || 0) + (a.quantity || 0);
                if (!sourceByLine[key]) sourceByLine[key] = [];
                sourceByLine[key].push(mo.refNo || mo.id);
            }
        }

        const allItemIds = new Set();
        for (const so of sos) for (const l of (so.items || [])) if (l.itemId) allItemIds.add(l.itemId);
        for (const wo of wos) for (const l of (wo.items || [])) if (l.itemId) allItemIds.add(l.itemId);

        const items = await Item.find({ id: { $in: [...allItemIds] }, userId, companyId }).lean();
        const itemMap = {};
        for (const it of items) itemMap[it.id] = it;

        const customerIds = [...new Set(sos.map(s => s.customerId).filter(Boolean))];
        const customers = await Customer.find({ id: { $in: customerIds }, userId, companyId }).lean();
        const customerMap = {};
        for (const c of customers) customerMap[c.id] = c.name || c.companyName || c.id;

        const sections = [];

        // Sales Orders section
        if (sos.length > 0) {
            sections.push({ title: 'Sales Orders', isHeading: true });
            for (const so of sos) {
                const customerName = customerMap[so.customerId] || so.customerId || 'Unknown';
                sections.push({ title: `${so.refNo || so.id} — ${customerName} (${so.date})`, isSubheading: true });
                for (const line of (so.items || [])) {
                    if (!line.itemId) continue;
                    const shipped = line.receivedQuantity || 0;
                    const needed = Math.max(0, (line.quantity || 0) - shipped);
                    if (needed === 0) continue;
                    const key = `${so.id}__${line.id}`;
                    const allocated = allocByLine[key] || 0;
                    const sources = sourceByLine[key] || [];
                    const item = itemMap[line.itemId] || {};
                    sections.push({
                        title: item.name || line.description || line.itemId,
                        value: `${allocated} / ${needed} allocated`,
                        extraValue: allocated >= needed ? 'Fully Allocated' : (allocated > 0 ? 'Partial' : 'Unallocated'),
                        indent: 1,
                        meta: { sources },
                    });
                }
            }
        }

        // Work Orders section
        if (wos.length > 0) {
            sections.push({ title: 'Work Orders', isHeading: true });
            for (const wo of wos) {
                sections.push({ title: `${wo.refNo || wo.id} (${wo.date}) — ${wo.workOrderStatus}`, isSubheading: true });
                for (const line of (wo.items || [])) {
                    if (!line.itemId) continue;
                    const needed = line.quantity || 0;
                    const key = `${wo.id}__${line.id}`;
                    const allocated = allocByLine[key] || 0;
                    const sources = sourceByLine[key] || [];
                    const item = itemMap[line.itemId] || {};
                    sections.push({
                        title: item.name || line.description || line.itemId,
                        value: `${allocated} / ${needed} allocated`,
                        extraValue: allocated >= needed ? 'Fully Allocated' : (allocated > 0 ? 'Partial' : 'Unallocated'),
                        indent: 1,
                        meta: { sources },
                    });
                }
            }
        }

        if (sections.length === 0) {
            sections.push({ title: 'No open orders found for the selected period.' });
        }

        return { title: 'Product Allocation by Order', sections };
    },

    // ── Consolidated Reports (multi-company) ──────────────────────────────────
    getConsolidatedReport: async (reportType, fromDate, toDate, userId) => {
        const Company = require('../models/Company');
        const companies = await Company.find({ userId, isActive: true }).lean();

        if (companies.length === 0) {
            return {
                sections: [{ title: 'No active companies found for this user.' }],
                title: 'Consolidated Report',
                companies: [],
            };
        }

        // Run the chosen report for every company in parallel
        const results = await Promise.all(
            companies.map(async (c) => {
                const cid = c._id.toString();
                try {
                    if (reportType === 'profit-and-loss') {
                        return await reportService.getProfitAndLoss(fromDate, toDate, userId, cid);
                    }
                    if (reportType === 'balance-sheet') {
                        return await reportService.getBalanceSheet(toDate, userId, cid);
                    }
                    if (reportType === 'trial-balance') {
                        return await reportService.getTrialBalance(fromDate, toDate, userId, cid);
                    }
                    return null;
                } catch (_) {
                    return null;
                }
            })
        );

        // Merge sections: sum numeric values row-by-row by title key
        const order = [];
        const merged = {}; // title → { ...sectionMeta, value: combined }

        for (const result of results) {
            if (!result) continue;
            for (const section of (result.sections || [])) {
                const key = section.title;
                if (!merged[key]) {
                    order.push(key);
                    merged[key] = { ...section, value: typeof section.value === 'number' ? 0 : section.value };
                }
                if (typeof section.value === 'number') {
                    merged[key].value = (merged[key].value || 0) + section.value;
                }
            }
        }

        const sections = order.map(k => merged[k]);

        const reportLabel =
            reportType === 'profit-and-loss' ? 'Profit & Loss'
            : reportType === 'balance-sheet'  ? 'Balance Sheet'
            : 'Trial Balance';

        return {
            title: `Consolidated ${reportLabel}`,
            sections,
            companies: companies.map(c => c.name),
        };
    },
};

module.exports = reportService;
