
import React, { useState, useMemo } from 'react';
import { Account, Transaction } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  accounts: Account[];
  transactions: Transaction[];
  onClose?: () => void;
}

const CashFlowProjector: React.FC<Props> = ({ accounts, transactions, onClose }) => {
  const bankAccounts = accounts.filter(a => a.type === 'Bank');
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || '');

  // Calculate Average Weekly Income and Expenses from real data
  const weeklyAverages = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTx = transactions.filter(tx => new Date(tx.date) >= thirtyDaysAgo);
    const income = recentTx
      .filter(tx => ['INVOICE', 'SALES_RECEIPT', 'PAYMENT'].includes(tx.type))
      .reduce((s, tx) => s + tx.total, 0);
    const expenses = recentTx
      .filter(tx => ['BILL', 'CHECK', 'EXPENSE'].includes(tx.type))
      .reduce((s, tx) => s + tx.total, 0);

    return {
      receipts: Math.round(income / 4), // Weekly approx
      payments: Math.round(expenses / 4)
    };
  }, [transactions]);

  const [projections, setProjections] = useState<{ week: string, receipts: number, payments: number }[]>(() => {
    const weeks = [];
    for (let i = 1; i <= 6; i++) {
      weeks.push({
        week: `Week ${i}`,
        receipts: weeklyAverages.receipts || 0,
        payments: weeklyAverages.payments || 0
      });
    }
    return weeks;
  });

  const startingBalance = accounts.find(a => a.id === selectedBankId)?.balance || 0;

  const chartData = useMemo(() => {
    let current = startingBalance;
    return projections.map(p => {
      current = current + p.receipts - p.payments;
      return { ...p, balance: current };
    });
  }, [projections, startingBalance]);

  return (
    <div className="flex flex-col h-full bg-[#f4f4f4]">
      <div className="bg-[#003366] text-white p-3 flex justify-between items-center shadow-md">
        <h1 className="text-lg font-bold">Cash Flow Projector</h1>
        {onClose && <button onClick={onClose} className="hover:text-gray-300 font-bold ml-4">X</button>}
      </div>

      <div className="p-6 space-y-6 flex-1 flex flex-col overflow-hidden">
        {/* Step 1: Account Selection */}
        <div className="bg-white border p-4 rounded shadow-sm flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Step 1: Select Bank Account</label>
            <select className="border p-1 text-sm bg-blue-50 w-full md:w-64 font-bold outline-none" value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)}>
              {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="text-left">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opening Balance</div>
            <div className="text-xl font-bold text-blue-900 font-mono">${startingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="md:ml-auto p-3 bg-green-50 border border-green-100 rounded text-[10px] text-green-700 font-bold uppercase">
            Initial averages seeded from last 30 days activity
          </div>
        </div>

        {/* Step 2: Visualization */}
        <div className="bg-white border p-6 rounded shadow-sm h-64">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase mb-4">Projected Cash Balance (Next 6 Weeks)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" axisLine={false} tick={{ fontSize: 10 }} />
              <YAxis axisLine={false} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Balance']} />
              <Area type="monotone" dataKey="balance" stroke="#82ca9d" fillOpacity={1} fill="url(#colorBal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Step 3: Grid Inputs */}
        <div className="bg-white border rounded shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="bg-gray-100 p-2 border-b text-[10px] font-bold uppercase text-gray-600">Manual Projections</div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b sticky top-0 uppercase text-[9px]">
                <tr>
                  <th className="p-3 border-r">Week Beginning</th>
                  <th className="p-3 border-r text-right">Projected Receipts</th>
                  <th className="p-3 border-r text-right">Projected Payments</th>
                  <th className="p-3 text-right bg-blue-50">Ending Cash</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 border-r font-bold text-gray-600">{row.week}</td>
                    <td className="p-3 border-r text-right">
                      <input
                        type="number"
                        className="w-full bg-transparent text-right outline-none font-mono focus:bg-yellow-50"
                        value={projections[idx].receipts}
                        onChange={e => {
                          const next = [...projections];
                          next[idx].receipts = parseFloat(e.target.value) || 0;
                          setProjections(next);
                        }}
                      />
                    </td>
                    <td className="p-3 border-r text-right">
                      <input
                        type="number"
                        className="w-full bg-transparent text-right outline-none font-mono focus:bg-yellow-50"
                        value={projections[idx].payments}
                        onChange={e => {
                          const next = [...projections];
                          next[idx].payments = parseFloat(e.target.value) || 0;
                          setProjections(next);
                        }}
                      />
                    </td>
                    <td className="p-3 text-right bg-blue-50 font-bold font-mono">
                      ${row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowProjector;

