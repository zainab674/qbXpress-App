
import React, { useState } from 'react';
import { Account, Budget } from '../types';

interface Props {
   accounts: Account[];
   budgets: Budget[];
   onSave: (budgets: Budget[]) => void;
   onClose: () => void;
}

const BudgetForm: React.FC<Props> = ({ accounts, budgets, onSave, onClose }) => {
   const [fiscalYear, setFiscalYear] = useState(2017);
   const [selectedAccountId, setSelectedAccountId] = useState(accounts.find(a => a.type === 'Income')?.id || '');
   const [monthlyAmounts, setMonthlyAmounts] = useState<number[]>(new Array(12).fill(0));
   const [showAdjust, setShowAdjust] = useState(false);
   const [adjustPct, setAdjustPct] = useState(5);

   const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

   const handleCopyAcross = () => {
      const val = monthlyAmounts[0];
      setMonthlyAmounts(new Array(12).fill(val));
   };

   const handleAdjustAmounts = () => {
      const multiplier = 1 + (adjustPct / 100);
      const next = monthlyAmounts.map((val, i) => i === 0 ? val : val * multiplier);
      setMonthlyAmounts(next);
      setShowAdjust(false);
   };

   const handleRecord = () => {
      if (!selectedAccountId) return;
      const newBudget: Budget = {
         id: Math.random().toString(),
         year: fiscalYear,
         accountId: selectedAccountId,
         monthlyAmounts: [...monthlyAmounts]
      };

      const exists = budgets.findIndex(b => b.accountId === selectedAccountId && b.year === fiscalYear);
      const nextBudgets = [...budgets];
      if (exists !== -1) nextBudgets[exists] = newBudget;
      else nextBudgets.push(newBudget);

      onSave(nextBudgets);
      alert("Budget saved successfully!");
   };

   return (
      <div className="flex flex-col h-full bg-[#f0f0f0] relative">
         {showAdjust && (
            <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center">
               <div className="bg-white w-80 rounded shadow-2xl border p-4 space-y-4">
                  <h3 className="font-bold text-sm border-b pb-2">Adjust Row Amounts</h3>
                  <div className="space-y-2">
                     <p className="text-xs">Enter percentage to increase each month following the first month:</p>
                     <div className="flex items-center gap-2">
                        <input type="number" className="border p-1 w-20 text-right font-bold" value={adjustPct} onChange={e => setAdjustPct(parseFloat(e.target.value))} />
                        <span className="text-xs">%</span>
                     </div>
                  </div>
                  <div className="flex justify-end gap-2">
                     <button onClick={handleAdjustAmounts} className="bg-blue-600 text-white px-4 py-1 text-xs font-bold rounded">Apply</button>
                     <button onClick={() => setShowAdjust(false)} className="bg-white border px-4 py-1 text-xs font-bold rounded">Cancel</button>
                  </div>
               </div>
            </div>
         )}

         <div className="bg-[#003366] text-white p-3 flex justify-between items-center shadow-md">
            <h1 className="text-lg font-bold">Set Up Budgets</h1>
            <button onClick={onClose} className="hover:text-gray-300 font-bold ml-4">X</button>
         </div>

         <div className="p-6 bg-white border border-gray-400 m-2 rounded shadow-sm flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-8">
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <label className="text-[10px] font-bold text-gray-500 uppercase">Fiscal Year</label>
                     <input type="number" className="border p-1 text-sm bg-blue-50 w-24" value={fiscalYear} onChange={e => setFiscalYear(parseInt(e.target.value))} />
                  </div>
                  <div className="flex items-center gap-4">
                     <label className="text-[10px] font-bold text-gray-500 uppercase">Account</label>
                     <select className="border p-1 text-sm bg-blue-50 w-64 outline-none font-bold" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                        <option value="">--Select Account--</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.number} · {a.name}</option>)}
                     </select>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-auto border rounded bg-gray-50 p-4">
               <div className="grid grid-cols-4 gap-6">
                  {monthNames.map((m, idx) => (
                     <div key={m} className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{m} {fiscalYear}</label>
                        <input
                           type="number"
                           className="border p-2 text-sm font-bold font-mono text-right focus:bg-white bg-blue-50 outline-none"
                           value={monthlyAmounts[idx]}
                           onChange={e => {
                              const next = [...monthlyAmounts];
                              next[idx] = parseFloat(e.target.value) || 0;
                              setMonthlyAmounts(next);
                           }}
                        />
                     </div>
                  ))}
               </div>
               <div className="mt-8 pt-4 border-t flex justify-between items-center">
                  <div className="flex gap-2">
                     <button onClick={handleCopyAcross} className="bg-white border border-gray-400 px-4 py-1 text-[10px] font-bold uppercase rounded shadow-sm hover:bg-gray-100">Copy Across &gt;&gt;</button>
                     <button onClick={() => setShowAdjust(true)} className="bg-white border border-gray-400 px-4 py-1 text-[10px] font-bold uppercase rounded shadow-sm hover:bg-gray-100">Adjust Row...</button>
                  </div>
                  <div className="text-right">
                     <div className="text-[10px] font-bold text-gray-500 uppercase">Annual Budget Total</div>
                     <div className="text-2xl font-bold text-[#003366] font-mono">${monthlyAmounts.reduce((s, a) => s + a, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
               </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
               <button onClick={handleRecord} className="bg-blue-600 text-white px-8 py-1.5 text-xs font-bold rounded shadow-sm hover:brightness-110">Save</button>
               <button onClick={onClose} className="bg-white border border-gray-400 px-8 py-1.5 text-xs font-bold rounded">Cancel</button>
            </div>
         </div>
      </div>
   );
};

export default BudgetForm;
