
import React, { useState } from 'react';
import { Account, Vendor, Transaction } from '../types';

interface Props {
   accounts: Account[];
   vendors: Vendor[];
   onSave: (tx: Transaction) => void;
   onClose: () => void;
}

interface ExpenseRow {
   id: string;
   accountId: string;
   amount: number;
   memo: string;
}

const CreditCardChargeForm: React.FC<Props> = ({ accounts, vendors, onSave, onClose }) => {
   const [ccAccountId, setCcAccountId] = useState(accounts.find(a => a.type === 'Credit Card')?.id || '');
   const [vendorId, setVendorId] = useState('');
   const [totalAmount, setTotalAmount] = useState(0);
   const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
   const [memo, setMemo] = useState('');
   const [refNo, setRefNo] = useState('CC-' + Date.now().toString().slice(-4));
   const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([
      { id: Math.random().toString(), accountId: '', amount: 0, memo: '' }
   ]);

   const rowsTotal = expenseRows.reduce((sum, row) => sum + row.amount, 0);

   const handleAddRow = () => {
      setExpenseRows([...expenseRows, { id: Math.random().toString(), accountId: '', amount: 0, memo: '' }]);
   };

   const handleRemoveRow = (id: string) => {
      setExpenseRows(expenseRows.filter(r => r.id !== id));
   };

   const updateRow = (id: string, updates: Partial<ExpenseRow>) => {
      setExpenseRows(expenseRows.map(r => r.id === id ? { ...r, ...updates } : r));
   };

   const handleRecord = () => {
      if (!ccAccountId || !vendorId || totalAmount <= 0) return alert("Required fields missing.");

      if (Math.abs(totalAmount - rowsTotal) > 0.01 && rowsTotal > 0) {
         if (!confirm("Expense total doesn't match charge amount. Continue?")) return;
      }

      const tx: Transaction = {
         id: Math.random().toString(),
         type: 'CC_CHARGE',
         refNo: refNo,
         date,
         entityId: vendorId,
         items: expenseRows.map(r => ({
            id: r.id,
            description: r.memo || memo,
            quantity: 1,
            rate: r.amount,
            amount: r.amount,
            tax: false,
            accountId: r.accountId
         })),
         total: totalAmount,
         status: 'OPEN',
         bankAccountId: ccAccountId,
         memo: memo
      };
      onSave(tx);
      onClose();
   };

   return (
      <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans select-none">
         <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-2 border-b bg-gray-50 flex gap-4 shadow-sm items-center">
               <button onClick={handleRecord} className="flex flex-col items-center px-6 py-1 hover:bg-gray-200 rounded-sm border border-gray-300 transition-colors bg-white group">
                  <span className="text-xl group-hover:scale-110 transition-transform">💾</span>
                  <span className="text-[10px] font-bold uppercase text-blue-900">Save & Close</span>
               </button>
               <button className="flex flex-col items-center px-6 py-1 hover:bg-gray-200 rounded-sm border border-gray-300 transition-colors bg-white">
                  <span className="text-xl">🖨️</span>
                  <span className="text-[10px] font-bold uppercase text-gray-700">Print</span>
               </button>
               <div className="w-px h-10 bg-gray-300 mx-2"></div>
               <button onClick={onClose} className="flex flex-col items-center px-6 py-1 hover:bg-gray-200 rounded-sm border border-gray-300 transition-colors bg-white">
                  <span className="text-xl text-red-500">✖</span>
                  <span className="text-[10px] font-bold uppercase text-red-700">Cancel</span>
               </button>
            </div>

            <div className="flex-1 p-8 bg-blue-50/30 overflow-auto custom-scrollbar flex flex-col items-center">
               <div className="w-[850px] bg-white border border-gray-300 rounded shadow-xl p-8 relative">
                  <h1 className="absolute top-4 left-8 text-2xl font-serif italic text-blue-900 opacity-20 select-none">Credit Card Charge</h1>

                  <div className="flex justify-between items-start mt-8">
                     <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                           <label className="text-[10px] font-bold text-gray-500 uppercase w-20">Credit Card</label>
                           <select className="border-b-2 border-blue-200 bg-transparent text-sm font-bold w-64 outline-none focus:border-blue-500" value={ccAccountId} onChange={e => setCcAccountId(e.target.value)}>
                              {accounts.filter(a => a.type === 'Credit Card').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                           </select>
                        </div>
                        <div className="flex items-center gap-4">
                           <label className="text-[10px] font-bold text-gray-500 uppercase w-20">Purchased From</label>
                           <select className="border-b-2 border-blue-200 bg-transparent text-sm font-bold w-64 outline-none focus:border-blue-500" value={vendorId} onChange={e => setVendorId(e.target.value)}>
                              <option value="">&lt;Select Vendor&gt;</option>
                              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                           </select>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center gap-4 justify-end">
                           <label className="text-[10px] font-bold text-gray-500 uppercase">Date</label>
                           <input className="border-b border-gray-300 w-24 text-right outline-none text-xs" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-4 justify-end">
                           <label className="text-[10px] font-bold text-gray-500 uppercase">Ref No.</label>
                           <input className="border-b border-gray-300 w-24 text-right outline-none text-xs font-mono" value={refNo} onChange={e => setRefNo(e.target.value)} />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                           <label className="text-[10px] font-bold text-blue-900 uppercase">Charge Amount</label>
                           <div className="bg-blue-50 border-2 border-blue-200 p-2 rounded shadow-inner flex items-center gap-2">
                              <span className="text-xl font-bold font-serif text-blue-900">$</span>
                              <input
                                 type="number"
                                 className="w-32 bg-transparent text-xl font-bold font-mono text-right outline-none text-blue-900"
                                 value={totalAmount || ''}
                                 onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)}
                                 placeholder="0.00"
                              />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="mt-8 flex items-center gap-4 border-b border-gray-200 pb-1">
                     <label className="text-[10px] font-bold text-gray-500 uppercase w-12">Memo</label>
                     <input className="flex-1 bg-transparent outline-none text-sm italic" value={memo} onChange={e => setMemo(e.target.value)} placeholder="Overall charge memo..." />
                  </div>

                  <div className="mt-12 bg-white border border-gray-300 rounded-sm overflow-hidden">
                     <div className="bg-gray-100 border-b flex text-[10px] font-bold uppercase">
                        <div className="px-6 py-2 bg-white border-r text-blue-900 border-b-2 border-b-blue-600">Expenses</div>
                     </div>
                     <table className="w-full text-xs">
                        <thead className="bg-[#f8f9fa] border-b border-gray-200 text-gray-500">
                           <tr>
                              <th className="p-2 text-left border-r w-64">Account</th>
                              <th className="p-2 text-right border-r w-32">Amount</th>
                              <th className="p-2 text-left border-r">Memo</th>
                              <th className="p-2 w-8"></th>
                           </tr>
                        </thead>
                        <tbody>
                           {expenseRows.map(row => (
                              <tr key={row.id} className="border-b hover:bg-blue-50/50 group">
                                 <td className="p-0 border-r">
                                    <select className="w-full p-2 bg-transparent outline-none" value={row.accountId} onChange={e => updateRow(row.id, { accountId: e.target.value })}>
                                       <option value="">Select Account...</option>
                                       {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                 </td>
                                 <td className="p-0 border-r text-right">
                                    <input type="number" className="w-full p-2 text-right bg-transparent outline-none font-bold" value={row.amount || ''} onChange={e => updateRow(row.id, { amount: parseFloat(e.target.value) || 0 })} />
                                 </td>
                                 <td className="p-0 border-r">
                                    <input className="w-full p-2 bg-transparent outline-none italic" value={row.memo} onChange={e => updateRow(row.id, { memo: e.target.value })} />
                                 </td>
                                 <td className="p-2 text-center text-gray-300 hover:text-red-500 cursor-pointer" onClick={() => handleRemoveRow(row.id)}>✕</td>
                              </tr>
                           ))}
                           <tr className="bg-gray-50/30">
                              <td colSpan={4} className="p-2">
                                 <button onClick={handleAddRow} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-tighter">+ Add Line</button>
                              </td>
                           </tr>
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold border-t border-gray-200 text-sm">
                           <tr>
                              <td className="p-2 text-right uppercase text-[10px] text-gray-400 tracking-widest">Expense Total</td>
                              <td className="p-2 text-right text-blue-900 font-mono">${rowsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td colSpan={2} className="p-2 text-[9px] text-red-500 italic">
                                 {Math.abs(totalAmount - rowsTotal) > 0.01 && `Unbalanced: ${(totalAmount - rowsTotal).toFixed(2)}`}
                              </td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default CreditCardChargeForm;
