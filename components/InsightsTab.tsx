
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ModifyReportDialog from './ModifyReportDialog';
import { Transaction, Account } from '../types';

interface Props {
  isAdmin: boolean;
  transactions: Transaction[];
  accounts: Account[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const InsightsTab: React.FC<Props> = ({ isAdmin, transactions, accounts }) => {
  const [showModify, setShowModify] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  const [visibleGraphs, setVisibleGraphs] = useState({
    profitAndLoss: true,
    incomeStatus: true,
    expensesBreakdown: true,
    netProfitMargin: false,
    businessGrowth: false,
    prevYearComparison: false
  });

  // Calculate Real Profit & Loss Data for the last 6 months
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];

    for (let i = 5; i >= 0; i--) {
      const m = (currentMonth - i + 12) % 12;
      last6Months.push({ name: months[m], monthIndex: m, income: 0, expenses: 0 });
    }

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const txMonth = txDate.getMonth();
      const dataPoint = last6Months.find(d => d.monthIndex === txMonth);

      if (dataPoint) {
        if (['INVOICE', 'SALES_RECEIPT', 'PAYMENT'].includes(tx.type)) {
          dataPoint.income += tx.total;
        } else if (['BILL', 'CHECK', 'VENDOR_CREDIT', 'EXPENSE'].includes(tx.type)) {
          // BILLs and CHECKs are usually expenses
          dataPoint.expenses += tx.total;
        }
      }
    });

    return last6Months;
  }, [transactions]);

  // Calculate Expenses Breakdown by Account Category
  const pieData = useMemo(() => {
    const expenseMap: { [key: string]: number } = {};

    transactions.forEach(tx => {
      if (['BILL', 'CHECK', 'EXPENSE'].includes(tx.type)) {
        tx.items.forEach(item => {
          const acc = accounts.find(a => a.id === item.accountId);
          const category = acc?.name || 'Uncategorized';
          expenseMap[category] = (expenseMap[category] || 0) + (item.amount || 0);
        });
      }
    });

    return Object.entries(expenseMap)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 expense categories
  }, [transactions, accounts]);

  // Calculate Real Income Status
  const incomeStatus = useMemo(() => {
    const openInvoices = transactions
      .filter(tx => tx.type === 'INVOICE' && tx.status === 'OPEN')
      .reduce((sum, tx) => sum + tx.total, 0);

    const now = new Date();
    const overdueInvoices = transactions
      .filter(tx => tx.type === 'INVOICE' && tx.status === 'OPEN' && new Date(tx.dueDate || tx.date) < now)
      .reduce((sum, tx) => sum + tx.total, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const paidLast30 = transactions
      .filter(tx => (tx.type === 'PAYMENT' || tx.type === 'SALES_RECEIPT') && new Date(tx.date) >= thirtyDaysAgo)
      .reduce((sum, tx) => sum + tx.total, 0);

    return { openInvoices, overdueInvoices, paidLast30 };
  }, [transactions]);

  return (
    <div className="p-6 bg-white h-full overflow-y-auto space-y-8">
      <div className="flex items-center justify-between border-b pb-4 bg-gray-50 -m-6 p-6 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">Company Insights</h2>
          <p className="text-xs text-gray-500 italic uppercase font-bold tracking-tighter">Real-time Data Sync</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setShowModify(true)} className="bg-white border border-gray-300 px-3 py-1 text-xs font-bold rounded hover:bg-gray-100 shadow-sm">Modify Report</button>
          <select className="border rounded px-2 py-1 text-xs bg-white font-bold shadow-sm">
            <option>Last 6 Months</option>
            <option>This Fiscal Year</option>
          </select>
          <button
            onClick={() => setShowCustomize(!showCustomize)}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors relative"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            {showCustomize && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-300 shadow-xl rounded p-3 w-64 z-[130] text-left">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">What do you want to see?</p>
                {Object.entries(visibleGraphs).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 py-1 hover:bg-gray-50 text-xs cursor-pointer">
                    <input type="checkbox" checked={value} onChange={() => setVisibleGraphs(p => ({ ...p, [key]: !value }))} />
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                ))}
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {visibleGraphs.profitAndLoss && (
          <div className="border rounded p-4 bg-white shadow-sm h-[400px] flex flex-col">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase">Profit & Loss (6 Months)</h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend iconType="rect" />
                  <Bar dataKey="income" fill="#7cb342" name="Income" />
                  <Bar dataKey="expenses" fill="#4a90e2" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {visibleGraphs.incomeStatus && (
          <div className="border rounded p-4 bg-white shadow-sm h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase">Income Status</h3>
            </div>
            <div className="flex-1 space-y-6 flex flex-col justify-center px-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-500 uppercase">Open Invoices</span>
                  <span className="text-blue-900">${incomeStatus.openInvoices.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-blue-100 h-8 rounded-sm overflow-hidden border border-blue-200">
                  <div className="bg-blue-600 h-full" style={{ width: `${Math.min(100, (incomeStatus.openInvoices / (incomeStatus.openInvoices + incomeStatus.paidLast30 || 1)) * 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-500 uppercase">Overdue</span>
                  <span className="text-red-700">${incomeStatus.overdueInvoices.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-red-100 h-8 rounded-sm overflow-hidden border border-red-200">
                  <div className="bg-red-600 h-full" style={{ width: `${Math.min(100, (incomeStatus.overdueInvoices / (incomeStatus.openInvoices || 1)) * 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-500 uppercase">Paid Last 30 Days</span>
                  <span className="text-green-700">${incomeStatus.paidLast30.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-green-100 h-8 rounded-sm overflow-hidden border border-green-200">
                  <div className="bg-green-600 h-full" style={{ width: `${Math.min(100, (incomeStatus.paidLast30 / (incomeStatus.openInvoices + incomeStatus.paidLast30 || 1)) * 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {visibleGraphs.expensesBreakdown && (
          <div className="border rounded p-4 bg-white shadow-sm h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase">Top Expense Categories</h3>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-400 italic text-sm">No expenses recorded yet.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <ModifyReportDialog isOpen={showModify} onClose={() => setShowModify(false)} availableColumns={['Date', 'Type', 'Number', 'Name', 'Memo', 'Account', 'Amount', 'Balance']} />
    </div>
  );
};

export default InsightsTab;

