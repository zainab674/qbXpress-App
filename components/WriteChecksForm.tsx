
import React, { useState } from 'react';
import { Account, Vendor, Transaction } from '../types';

interface Props {
   accounts: Account[];
   vendors: Vendor[];
   onSave: (tx: Transaction) => void;
   onClose: () => void;
}

const numberToWords = (num: number): string => {
   if (num === 0) return 'Zero';
   const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
   const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

   const intPart = Math.floor(num);
   const cents = Math.round((num - intPart) * 100);

   let result = '';
   if (intPart >= 1000) {
      result += ones[Math.floor(intPart / 1000)] + ' Thousand ';
   }
   const hnd = Math.floor((intPart % 1000) / 100);
   if (hnd > 0) result += ones[hnd] + ' Hundred ';

   const rem = intPart % 100;
   if (rem < 20) result += ones[rem];
   else result += tens[Math.floor(rem / 10)] + (rem % 10 !== 0 ? '-' + ones[rem % 10] : '');

   return `${result.trim()} and ${cents}/100`;
};

interface ExpenseRow {
   id: string;
   accountId: string;
   amount: number;
   memo: string;
}

const WriteChecksForm: React.FC<Props> = ({ accounts, vendors, onSave, onClose }) => {
   const [bankAccountId, setBankAccountId] = useState(accounts.find(a => a.type === 'Bank')?.id || '');
   const [vendorId, setVendorId] = useState('');
   const [totalAmount, setTotalAmount] = useState(0);
   const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
   const [checkNo, setCheckNo] = useState('1005');
   const [mainMemo, setMainMemo] = useState('');
   const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([
      { id: Math.random().toString(), accountId: '', amount: 0, memo: '' }
   ]);

   const selectedVendor = vendors.find(v => v.id === vendorId);
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
      if (!bankAccountId) return alert("Please select a bank account.");
      if (totalAmount <= 0) return alert("Amount must be greater than zero.");
      if (Math.abs(totalAmount - rowsTotal) > 0.01) {
         if (!confirm(`The total amount ($${totalAmount}) doesn't match the sum of expenses ($${rowsTotal}). Continue anyway?`)) {
            return;
         }
      }

      const tx: Transaction = {
         id: Math.random().toString(),
         type: 'CHECK',
         refNo: checkNo,
         date,
         entityId: vendorId,
         items: expenseRows.map(r => ({
            id: r.id,
            description: r.memo || mainMemo,
            quantity: 1,
            rate: r.amount,
            amount: r.amount,
            tax: false
         })),
         total: totalAmount,
         status: 'PAID',
         bankAccountId: bankAccountId
      };
      onSave(tx);
      onClose();
   };

   return (
      <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
         <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b bg-gray-50 flex gap-4 shadow-sm">
               <button onClick={handleRecord} className="flex flex-col items-center px-6 py-1 hover:bg-gray-200 rounded-sm border border-gray-300 transition-colors bg-white">
                  <span className="text-xl">💾</span>
                  <span className="text-[10px] font-bold uppercase text-blue-900">Save & Close</span>
               </button>
               <button onClick={onClose} className="flex flex-col items-center px-6 py-1 hover:bg-gray-200 rounded-sm border border-gray-300 transition-colors bg-white">
                  <span className="text-xl">✖</span>
                  <span className="text-[10px] font-bold uppercase text-red-700">Cancel</span>
               </button>
            </div>

            <div className="flex-1 p-8 bg-[#f5f7f9] flex flex-col items-center overflow-auto custom-scrollbar">
               <div className="w-[850px] bg-white border-2 border-gray-300 rounded shadow-2xl p-10 relative mb-8">
                  <div className="flex justify-between items-start">
                     <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank Account</label>
                           <select
                              className="border-b-2 border-blue-200 bg-transparent text-sm font-bold outline-none w-72 focus:border-blue-500 transition-colors"
                              value={bankAccountId}
                              onChange={e => setBankAccountId(e.target.value)}
                           >
                              <option value="">Select Account...</option>
                              {accounts.filter(a => a.type === 'Bank' || a.type === 'Credit Card').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                           </select>
                        </div>
                        <div className="text-[10px] text-blue-800 font-bold bg-blue-50 px-2 py-1 rounded inline-block">Ending Balance: ${accounts.find(a => a.id === bankAccountId)?.balance.toLocaleString()}</div>
                     </div>
                     <div className="text-right space-y-4">
                        <div className="flex items-center gap-2 justify-end">
                           <label className="text-[10px] font-bold text-gray-400 uppercase">No.</label>
                           <input className="border-b border-gray-300 w-24 text-right bg-transparent outline-none font-mono font-bold text-gray-700" value={checkNo} onChange={e => setCheckNo(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                           <label className="text-[10px] font-bold text-gray-400 uppercase">Date</label>
                           <input className="border-b border-gray-300 w-24 text-right bg-transparent outline-none" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                     </div>
                  </div>

                  <div className="mt-12 flex items-end gap-4 border-b-2 border-gray-200 pb-2">
                     <label className="text-[11px] font-bold text-blue-900 w-32 uppercase italic">Pay to the Order of</label>
                     <select className="flex-1 bg-transparent text-lg font-serif italic outline-none text-[#003366]" value={vendorId} onChange={e => setVendorId(e.target.value)}>
                        <option value="">&lt;Select Payee&gt;</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                     </select>
                     <div className="bg-blue-50 border-2 border-blue-200 p-2 flex items-center gap-2 rounded shadow-inner">
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

                  <div className="mt-6 flex items-end gap-2 text-lg font-serif italic border-b-2 border-gray-200 pb-1 text-gray-700">
                     <div className="flex-1 px-4">{totalAmount > 0 ? numberToWords(totalAmount) : 'Zero dollars '}</div>
                     <span className="text-[10px] font-bold text-gray-400 uppercase">DOLLARS</span>
                  </div>

                  <div className="mt-12 grid grid-cols-2 gap-12">
                     <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Address</label>
                        <textarea
                           className="w-full h-24 bg-gray-50/50 border border-gray-200 p-2 text-xs italic resize-none outline-none rounded-sm"
                           value={selectedVendor?.address || ''}
                           readOnly
                        />
                     </div>
                     <div className="flex flex-col justify-end space-y-8">
                        <div className="flex items-end gap-2 border-b border-gray-300 pb-1">
                           <label className="text-[10px] font-bold text-gray-400 uppercase w-12">Memo</label>
                           <input className="flex-1 bg-transparent outline-none text-xs" value={mainMemo} onChange={e => setMainMemo(e.target.value)} placeholder="Main memo for this check..." />
                        </div>
                        <div className="text-right border-t-2 border-gray-300 pt-1 italic font-serif text-gray-400 select-none">Authorized Signature</div>
                     </div>
                  </div>
               </div>

               <div className="w-[850px] bg-white border border-gray-300 shadow-xl rounded-sm overflow-hidden mb-12">
                  <div className="flex border-b text-[10px] font-bold uppercase bg-gray-100">
                     <div className="px-6 py-2 bg-white border-r text-blue-900 border-b-2 border-b-blue-600">Expenses</div>
                  </div>
                  <table className="w-full text-[11px] text-left">
                     <thead className="bg-[#f0f0f0] border-b border-gray-300 text-gray-600 font-bold">
                        <tr>
                           <th className="p-2 border-r w-64">Account</th>
                           <th className="p-2 border-r text-right w-32">Amount</th>
                           <th className="p-2 border-r">Memo</th>
                           <th className="p-2 w-8"></th>
                        </tr>
                     </thead>
                     <tbody>
                        {expenseRows.map(row => (
                           <tr key={row.id} className="border-b hover:bg-blue-50/30 group">
                              <td className="p-0 border-r">
                                 <select
                                    className="w-full p-2 bg-transparent outline-none appearance-none"
                                    value={row.accountId}
                                    onChange={e => updateRow(row.id, { accountId: e.target.value })}
                                 >
                                    <option value="">Select Account...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                 </select>
                              </td>
                              <td className="p-0 border-r">
                                 <input
                                    type="number"
                                    className="w-full p-2 text-right bg-transparent outline-none font-bold text-blue-800"
                                    value={row.amount || ''}
                                    onChange={e => updateRow(row.id, { amount: parseFloat(e.target.value) || 0 })}
                                 />
                              </td>
                              <td className="p-0 border-r">
                                 <input
                                    className="w-full p-2 bg-transparent outline-none italic text-gray-600"
                                    value={row.memo}
                                    onChange={e => updateRow(row.id, { memo: e.target.value })}
                                    placeholder="Line memo..."
                                 />
                              </td>
                              <td className="p-2 text-center">
                                 <button onClick={() => handleRemoveRow(row.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                              </td>
                           </tr>
                        ))}
                        <tr className="bg-gray-50/50">
                           <td colSpan={4} className="p-2">
                              <button onClick={handleAddRow} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-tighter">+ Add Line</button>
                           </td>
                        </tr>
                     </tbody>
                     <tfoot className="bg-gray-100 font-bold border-t border-gray-300">
                        <tr>
                           <td className="p-2 text-right uppercase text-[10px] text-gray-500">Expense Total</td>
                           <td className="p-2 text-right text-blue-900 font-mono">${rowsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                           <td colSpan={2} className="p-2">
                              {Math.abs(totalAmount - rowsTotal) > 0.01 && (
                                 <span className="text-[9px] text-red-500 uppercase tracking-tighter">Difference: ${(totalAmount - rowsTotal).toFixed(2)}</span>
                              )}
                           </td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </div>
         </div>
      </div>
   );
};

export default WriteChecksForm;
