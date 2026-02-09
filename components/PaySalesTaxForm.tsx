
import React, { useState, useMemo } from 'react';
import { Transaction, Account } from '../types';

interface Props {
   accounts: Account[];
   transactions: Transaction[];
   onSave: (tx: Transaction) => void;
   onClose: () => void;
}

const PaySalesTaxForm: React.FC<Props> = ({ accounts, transactions, onSave, onClose }) => {
   const [checkingId, setCheckingId] = useState(accounts.find(a => a.type === 'Bank')?.id || '');

   // Dynamic Tax Calculation
   const taxAmount = useMemo(() => {
      const collected = transactions
         .filter(t => t.type === 'INVOICE' || t.type === 'SALES_RECEIPT')
         .reduce((sum, t) => sum + (t.items.filter(i => i.tax).reduce((s, i) => s + i.amount, 0) * 0.08), 0);
      const adjusted = transactions.filter(t => t.type === 'TAX_ADJUSTMENT').reduce((s, t) => s + t.total, 0);
      const paid = transactions.filter(t => t.type === 'TAX_PAYMENT').reduce((s, t) => s + t.total, 0);
      return Math.max(0, collected + adjusted - paid);
   }, [transactions]);

   const handleRecord = () => {
      const tx: Transaction = {
         id: Math.random().toString(),
         type: 'TAX_PAYMENT',
         refNo: 'TAX-' + Date.now().toString().slice(-4),
         date: new Date().toLocaleDateString(),
         entityId: 'v_irs',
         items: [],
         total: taxAmount,
         status: 'PAID',
         bankAccountId: checkingId
      };
      onSave(tx);
      alert("Sales Tax Check has been recorded.");
      onClose();
   };

   return (
      <div className="bg-[#f0f0f0] h-full flex items-center justify-center p-8">
         <div className="bg-white w-[600px] border border-gray-400 rounded shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-[#003366] p-2 text-white font-bold text-sm flex justify-between">
               <span>Pay Sales Tax</span>
               <button onClick={onClose}>X</button>
            </div>
            <div className="p-6 space-y-6">
               <div className="bg-blue-50 p-4 border rounded shadow-inner">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Pay From Account</label>
                  <select className="w-full border p-2 text-sm bg-white mt-1 outline-none font-bold" value={checkingId} onChange={e => setCheckingId(e.target.value)}>
                     {accounts.filter(a => a.type === 'Bank').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
               </div>

               <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Tax Items to Pay</h4>
                  <div className="border rounded overflow-hidden">
                     <table className="w-full text-xs text-left">
                        <thead className="bg-gray-100 border-b">
                           <tr><th className="p-2">✓</th><th className="p-2">Tax Item</th><th className="p-2 text-right">Amt Due</th></tr>
                        </thead>
                        <tbody>
                           <tr className="border-b bg-blue-50">
                              <td className="p-2"><input type="checkbox" checked readOnly /></td>
                              <td className="p-2 font-bold">State Sales Tax (8%)</td>
                              <td className="p-2 text-right font-mono font-bold">${taxAmount.toLocaleString()}</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

               <div className="flex justify-between items-end border-t pt-4">
                  <div className="text-[10px] text-gray-400 italic">Payments will be dated {new Date().toLocaleDateString()}</div>
                  <div className="text-right">
                     <div className="text-3xl font-bold text-blue-900 font-mono">${taxAmount.toLocaleString()}</div>
                     <div className="text-[10px] font-bold text-gray-500 uppercase">Total Payment</div>
                  </div>
               </div>
            </div>
            <div className="bg-gray-100 p-4 border-t flex justify-end gap-2">
               <button onClick={handleRecord} className="bg-blue-600 text-white px-8 py-1.5 text-xs font-bold rounded shadow-sm hover:brightness-110">OK</button>
               <button onClick={onClose} className="bg-white border border-gray-400 px-8 py-1.5 text-xs font-bold rounded">Cancel</button>
            </div>
         </div>
      </div>
   );
};

export default PaySalesTaxForm;
