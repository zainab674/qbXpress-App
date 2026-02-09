
import React, { useState, useMemo } from 'react';
import { Account, Transaction } from '../types';

interface Props {
  accounts: Account[];
  transactions: Transaction[];
  onFinish: (accountId: string, clearedIds: Set<string>) => void;
  onClose: () => void;
}

const ReconcileForm: React.FC<Props> = ({ accounts, transactions, onFinish, onClose }) => {
  const [step, setStep] = useState<'SETUP' | 'RECONCILE'>('SETUP');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts.find(a => a.type === 'Bank')?.id || '');
  const [endingBalance, setEndingBalance] = useState(0);
  const [statementDate, setStatementDate] = useState(new Date().toLocaleDateString());
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const relevantTransactions = useMemo(() => {
    return transactions.filter(t =>
      (t.bankAccountId === selectedAccountId || t.depositToId === selectedAccountId) &&
      t.status !== 'CLEARED'
    );
  }, [transactions, selectedAccountId]);

  const clearedTotal = useMemo(() => {
    let sum = 0;
    relevantTransactions.forEach(t => {
      if (clearedIds.has(t.id)) {
        if (['DEPOSIT', 'SALES_RECEIPT', 'PAYMENT'].includes(t.type)) sum += t.total;
        else sum -= t.total;
      }
    });
    return sum;
  }, [relevantTransactions, clearedIds]);

  const difference = endingBalance - ((selectedAccount?.balance || 0) + clearedTotal);

  const handleMarkAll = () => {
    setClearedIds(new Set(relevantTransactions.map(t => t.id)));
  };

  const handleUnmarkAll = () => {
    setClearedIds(new Set());
  };

  const handleAdjust = () => {
    if (confirm(`Enter adjustment for $${difference.toFixed(2)} to Opening Balance Equity?`)) {
      onFinish(selectedAccountId, clearedIds); // Pass the cleared IDs, App logic can detect the difference
    }
  };

  if (step === 'SETUP') {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 p-8">
        <div className="bg-white w-[500px] border border-gray-400 rounded shadow-2xl overflow-hidden flex flex-col">
          <div className="bg-[#003366] p-2 text-white font-bold text-sm flex justify-between">
            <span>Begin Reconciliation</span>
            <button onClick={onClose}>X</button>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Account</label>
              <select className="border p-2 text-sm bg-blue-50" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                {accounts.filter(a => a.type === 'Bank' || a.type === 'Credit Card').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Statement Date</label>
                <input className="border p-1 text-xs" value={statementDate} onChange={e => setStatementDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Ending Balance</label>
                <input type="number" className="border p-1 text-xs bg-yellow-50 font-bold" value={endingBalance} onChange={e => setEndingBalance(parseFloat(e.target.value))} />
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-100 border-t flex justify-end gap-2">
            <button onClick={() => setStep('RECONCILE')} className="bg-blue-600 text-white px-8 py-1.5 text-xs font-bold rounded shadow-sm hover:brightness-110">Continue</button>
            <button onClick={onClose} className="bg-white border border-gray-400 px-8 py-1.5 text-xs font-bold rounded">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white select-none">
      <div className="bg-[#f0f0f0] border-b p-3 flex justify-between items-center shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-[#003366]">Reconcile - {selectedAccount?.name}</h2>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Statement Date: {statementDate}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStep('SETUP')} className="bg-white border border-gray-400 px-4 py-1 text-xs font-bold rounded hover:bg-gray-50 uppercase tracking-tighter">Modify...</button>
          {Math.abs(difference) > 0.01 ? (
            <button onClick={handleAdjust} className="bg-yellow-500 text-white px-4 py-1 text-xs font-bold rounded shadow-sm hover:brightness-110 uppercase tracking-tighter italic">Enter Adjustment</button>
          ) : (
            <button onClick={() => onFinish(selectedAccountId, clearedIds)} className="bg-blue-600 text-white px-6 py-1 text-xs font-bold rounded shadow-sm hover:brightness-110 uppercase tracking-tighter">Reconcile Now</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left Side: Checks */}
        <div className="flex-1 flex flex-col border-r overflow-hidden">
          <div className="bg-gray-100 p-2 text-[10px] font-bold uppercase border-b flex justify-between items-center">
            <span>Checks and Payments</span>
            <div className="flex gap-2">
              <button onClick={handleMarkAll} className="text-blue-700 hover:underline">Mark All</button>
              <button onClick={handleUnmarkAll} className="text-blue-700 hover:underline border-l pl-2">Unmark All</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-white border-b shadow-sm z-10">
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px]"><th className="p-2 w-8">✓</th><th className="p-2">Date</th><th className="p-2">Num</th><th className="p-2 text-right">Amount</th></tr>
              </thead>
              <tbody>
                {relevantTransactions.filter(t => !['DEPOSIT', 'SALES_RECEIPT', 'PAYMENT'].includes(t.type)).map(t => (
                  <tr key={t.id} onClick={() => {
                    const next = new Set(clearedIds);
                    if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                    setClearedIds(next);
                  }} className={`border-b cursor-default hover:bg-blue-50/50 transition-colors ${clearedIds.has(t.id) ? 'bg-blue-100/50' : ''}`}>
                    <td className="p-2 text-center text-blue-800 font-bold">{clearedIds.has(t.id) ? '✓' : ''}</td>
                    <td className="p-2">{t.date}</td>
                    <td className="p-2">{t.refNo}</td>
                    <td className="p-2 text-right font-mono">-${t.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Deposits */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-gray-100 p-2 text-[10px] font-bold uppercase border-b">Deposits and Other Credits</div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-white border-b shadow-sm z-10">
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px]"><th className="p-2 w-8">✓</th><th className="p-2">Date</th><th className="p-2">Num</th><th className="p-2 text-right">Amount</th></tr>
              </thead>
              <tbody>
                {relevantTransactions.filter(t => ['DEPOSIT', 'SALES_RECEIPT', 'PAYMENT'].includes(t.type)).map(t => (
                  <tr key={t.id} onClick={() => {
                    const next = new Set(clearedIds);
                    if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                    setClearedIds(next);
                  }} className={`border-b cursor-default hover:bg-blue-50/50 transition-colors ${clearedIds.has(t.id) ? 'bg-blue-100/50' : ''}`}>
                    <td className="p-2 text-center text-blue-800 font-bold">{clearedIds.has(t.id) ? '✓' : ''}</td>
                    <td className="p-2">{t.date}</td>
                    <td className="p-2">{t.refNo}</td>
                    <td className="p-2 text-right font-mono">${t.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 border-t p-4 flex justify-between items-end shadow-inner">
        <div className="grid grid-cols-2 gap-x-12 gap-y-1 text-xs">
          <span className="text-gray-500 font-bold uppercase tracking-tighter">Statement Ending Balance</span>
          <span className="text-right font-bold font-mono text-blue-900">${endingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          <span className="text-gray-500 font-bold uppercase tracking-tighter">Cleared Balance</span>
          <span className="text-right font-bold font-mono text-blue-900">${((selectedAccount?.balance || 0) + clearedTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex flex-col items-end mr-8">
          <div className={`text-4xl font-bold font-mono tracking-tighter ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
            ${difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mt-1">Difference</span>
        </div>
      </div>
    </div>
  );
};

export default ReconcileForm;
