
import React, { useMemo } from 'react';
import { Transaction, Account, Item } from '../types';

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  items: Item[];
  companyName: string;
}

const CompanySnapshot: React.FC<Props> = ({ transactions, accounts, items, companyName }) => {
  // Financial summaries
  const incomeAccs = accounts.filter(a => a.type === 'Income');
  const expenseAccs = accounts.filter(a => a.type === 'Expense');

  const totalIncome = incomeAccs.reduce((s, a) => s + (a.balance || 0), 0);
  const totalExpenses = expenseAccs.reduce((s, a) => s + (a.balance || 0), 0);
  const netIncome = totalIncome - totalExpenses;

  // Chart data calculation (last 6 months)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();

  const chartData = useMemo(() => {
    const last6 = [];
    for (let i = 5; i >= 0; i--) {
      const m = (currentMonth - i + 12) % 12;
      last6.push({ name: months[m], monthIndex: m, income: 0, expenses: 0 });
    }

    transactions.forEach(tx => {
      const txMonth = new Date(tx.date).getMonth();
      const point = last6.find(p => p.monthIndex === txMonth);
      if (point) {
        if (['INVOICE', 'SALES_RECEIPT', 'PAYMENT'].includes(tx.type)) point.income += tx.total;
        if (['BILL', 'CHECK', 'VENDOR_CREDIT', 'EXPENSE'].includes(tx.type)) point.expenses += tx.total;
      }
    });

    // Normalize heights to percentage
    const max = Math.max(...last6.map(p => Math.max(p.income, p.expenses)), 1000);
    return last6.map(p => ({
      ...p,
      incH: (p.income / max) * 100,
      expH: (p.expenses / max) * 100
    }));
  }, [transactions, currentMonth]);

  // Previous year comparison
  const comparison = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    const lastYearIncome = transactions
      .filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === lastYear && ['INVOICE', 'SALES_RECEIPT', 'PAYMENT'].includes(tx.type);
      })
      .reduce((s, tx) => s + tx.total, 0);

    return {
      thisYear: totalIncome,
      lastYear: lastYearIncome,
      thisW: 100,
      lastW: lastYearIncome > 0 ? (lastYearIncome / (totalIncome || 1)) * 100 : 0
    };
  }, [transactions, totalIncome]);

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col font-sans p-4 overflow-y-auto">
      <div className="bg-[#003366] text-white p-3 rounded-t shadow-md flex justify-between items-center">
        <h1 className="text-lg font-bold">Company Snapshot</h1>
        <div className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded">Financial Dashboard</div>
      </div>

      <div className="bg-white border-x border-b border-gray-300 p-6 flex-1 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income/Expense Chart */}
          <div className="border border-gray-200 rounded p-4 shadow-sm bg-white flex flex-col">
            <h3 className="text-sm font-bold border-b pb-2 mb-4 text-[#003366]">Income and Expense (6 Months)</h3>
            <div className="flex-1 flex items-end justify-between h-48 px-4 border-b border-gray-100">
              {chartData.map((d) => (
                <div key={d.name} className="flex flex-col items-center gap-1 group relative flex-1">
                  <div className="flex gap-1 h-32 items-end w-full justify-center">
                    <div className="bg-blue-600 w-3 rounded-t-sm hover:brightness-110 transition-all duration-500" style={{ height: `${d.incH}%` }} title={`Income: $${d.income.toLocaleString()}`}></div>
                    <div className="bg-red-500 w-3 rounded-t-sm hover:brightness-110 transition-all duration-500" style={{ height: `${d.expH}%` }} title={`Expense: $${d.expenses.toLocaleString()}`}></div>
                  </div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase">{d.name}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-[10px] font-bold">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-600"></div> Income</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500"></div> Expense</div>
            </div>
          </div>

          {/* Previous Year Comparison */}
          <div className="border border-gray-200 rounded p-4 shadow-sm bg-white flex flex-col">
            <h3 className="text-sm font-bold border-b pb-2 mb-4 text-[#003366]">Income Comparison</h3>
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-bold">This Year</span>
                  <span className="font-mono">${comparison.thisYear.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 h-6 rounded-sm overflow-hidden border">
                  <div className="bg-[#0077c5] h-full transition-all duration-1000" style={{ width: `${comparison.thisW}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1 text-gray-400">
                  <span className="font-bold uppercase">Last Year</span>
                  <span className="font-mono">${comparison.lastYear.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 h-6 rounded-sm overflow-hidden border">
                  <div className="bg-gray-300 h-full transition-all duration-1000" style={{ width: `${comparison.lastW}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customers Who Owe Money */}
          <div className="border border-gray-200 rounded p-4 shadow-sm bg-white">
            <h3 className="text-sm font-bold border-b pb-2 mb-4 text-[#003366]">Top Unpaid Invoices</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 uppercase text-[9px] border-b">
                  <th className="pb-2">Ref #</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.filter(t => t.type === 'INVOICE' && t.status !== 'PAID').sort((a, b) => b.total - a.total).slice(0, 5).map(t => (
                  <tr key={t.id} className="border-b h-8 hover:bg-gray-50">
                    <td className="font-bold">#{t.refNo}</td>
                    <td className="text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="text-right font-mono font-bold">${t.total.toLocaleString()}</td>
                  </tr>
                ))}
                {transactions.filter(t => t.type === 'INVOICE' && t.status !== 'PAID').length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-gray-400 italic">No open invoices</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Account Balances */}
          <div className="border border-gray-200 rounded p-4 shadow-sm bg-white">
            <h3 className="text-sm font-bold border-b pb-2 mb-4 text-[#003366]">Account Balances</h3>
            <div className="space-y-3">
              {accounts.filter(a => ['Bank', 'Credit Card', 'Accounts Receivable', 'Accounts Payable'].includes(a.type)).map(a => (
                <div key={a.id} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-600">{a.name}</span>
                  <span className={`font-mono font-bold ${a.balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                    ${(a.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanySnapshot;

