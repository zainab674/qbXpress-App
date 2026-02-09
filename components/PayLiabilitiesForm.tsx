
import React, { useState } from 'react';
import { PayrollLiability, Transaction, Account } from '../types';

interface Props {
   liabilities: PayrollLiability[];
   accounts: Account[];
   onSave: (payment: Transaction) => void;
   onClose: () => void;
}

const PayLiabilitiesForm: React.FC<Props> = ({ liabilities, accounts, onSave, onClose }) => {
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [bankAccountId, setBankAccountId] = useState(accounts.find(a => a.type === 'Bank')?.id || '');

   const total = liabilities
      .filter(l => selectedIds.includes(l.id))
      .reduce((sum, l) => sum + l.amount, 0);

   const handleCreate = () => {
      if (selectedIds.length === 0) return alert("Select at least one liability to pay.");

      const payment: Transaction = {
         id: Math.random().toString(),
         type: 'TAX_PAYMENT',
         refNo: 'TAX-' + Math.floor(Math.random() * 9000),
         date: new Date().toLocaleDateString(),
         entityId: 'v_irs',
         items: [],
         total: total,
         status: 'PAID',
         bankAccountId: bankAccountId,
         appliedCreditIds: selectedIds
      };

      onSave(payment);
      onClose();
   };

   return (
      <div className="bg-[#f0f0f0] h-full flex flex-col p-4">
         <div className="bg-white border border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
               <h2 className="text-xl font-bold text-slate-700">Pay Payroll Liabilities</h2>
               <div className="flex gap-2">
                  <button onClick={handleCreate} className="bg-blue-600 text-white px-6 py-1 text-xs font-bold rounded shadow-sm hover:bg-blue-700">Create Payments</button>
                  <button onClick={onClose} className="bg-white border border-gray-400 px-6 py-1 text-xs font-bold rounded">Cancel</button>
               </div>
            </div>

            <div className="p-6 bg-white border-b grid grid-cols-2 gap-8">
               <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Checking Account</label>
                  <select className="border p-1 text-xs outline-none font-bold" value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}>
                     {accounts.filter(a => a.type === 'Bank').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
               <table className="w-full text-xs text-left">
                  <thead className="bg-[#e8e8e8] border-b border-gray-400 sticky top-0">
                     <tr>
                        <th className="p-2 w-8"><input type="checkbox" checked={selectedIds.length === liabilities.length} onChange={() => setSelectedIds(selectedIds.length === liabilities.length ? [] : liabilities.map(l => l.id))} /></th>
                        <th className="p-2 border-r">Payroll Item</th>
                        <th className="p-2 border-r">Vendor</th>
                        <th className="p-2 border-r text-right">Amt. Due</th>
                        <th className="p-2 text-right">Amt. To Pay</th>
                     </tr>
                  </thead>
                  <tbody>
                     {liabilities.map(l => (
                        <tr key={l.id} className={`border-b hover:bg-blue-50 ${selectedIds.includes(l.id) ? 'bg-blue-100' : ''}`} onClick={() => setSelectedIds(prev => prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev, l.id])}>
                           <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={selectedIds.includes(l.id)} onChange={() => { }} />
                           </td>
                           <td className="p-2 border-r font-bold">{l.type} Tax</td>
                           <td className="p-2 border-r text-gray-500">United States Treasury</td>
                           <td className="p-2 border-r text-right font-mono">${l.amount.toLocaleString()}</td>
                           <td className="p-2 text-right font-bold text-blue-900">${l.amount.toLocaleString()}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-gray-300 flex justify-between items-center">
               <div className="text-right">
                  <div className="text-2xl font-bold text-[#003366] font-mono">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Total Payment Amount</div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default PayLiabilitiesForm;
