
import React, { useState } from 'react';
import { Customer, Item, Transaction, TransactionItem } from '../types';

interface Props {
   customers: Customer[];
   items: Item[];
   onSave: (cm: Transaction) => void;
   onClose: () => void;
   initialData?: Transaction;
}

const CreditMemoForm: React.FC<Props> = ({ customers, items, onSave, onClose, initialData }) => {
   const [selectedCustomerId, setSelectedCustomerId] = useState(initialData?.entityId || '');
   const [date, setDate] = useState(initialData?.date || new Date().toLocaleDateString('en-US'));
   const [refNo, setRefNo] = useState(initialData?.refNo || 'CM-' + Math.floor(Math.random() * 9000 + 1000));
   const [memo, setMemo] = useState(initialData?.memo || '');
   const [lineItems, setLineItems] = useState<TransactionItem[]>(
      initialData?.items || [{ id: Math.random().toString(), itemId: '', description: '', quantity: 1, rate: 0, amount: 0, tax: false }]
   );

   const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
   const total = subtotal; // Simplified (no tax for now)

   const handleItemChange = (id: string, itemId: string) => {
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      setLineItems(prev => prev.map(li => li.id === id ? {
         ...li,
         itemId,
         description: item.description || item.name,
         rate: item.salesPrice || 0,
         amount: (item.salesPrice || 0) * li.quantity
      } : li));
   };

   const handleQtyChange = (id: string, qty: number) => {
      setLineItems(prev => prev.map(li => li.id === id ? {
         ...li,
         quantity: qty,
         amount: qty * li.rate
      } : li));
   };

   const addRow = () => {
      setLineItems([...lineItems, { id: Math.random().toString(), itemId: '', description: '', quantity: 1, rate: 0, amount: 0, tax: false }]);
   };

   const handleRecord = () => {
      if (!selectedCustomerId) return alert("Please select a customer.");
      const cm: Transaction = {
         id: initialData?.id || Math.random().toString(),
         type: 'CREDIT_MEMO',
         refNo,
         date,
         entityId: selectedCustomerId,
         items: lineItems.filter(li => li.itemId),
         total,
         status: 'OPEN',
         memo
      };
      onSave(cm);
      onClose();
   };

   return (
      <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
         <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-white border-b-2 border-gray-100 flex justify-between items-center shadow-sm">
               <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-serif italic text-[#003366] drop-shadow-sm">Credit Memo</h2>
                  <div className="bg-red-100 text-red-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-200">Returns & Credits</div>
               </div>
               <div className="flex gap-3">
                  <button onClick={handleRecord} className="bg-[#0077c5] text-white px-8 py-2 text-xs font-black rounded shadow-md hover:bg-[#005fa0] transition-all uppercase tracking-widest">Save & Close</button>
                  <button onClick={onClose} className="bg-white border border-gray-400 px-8 py-2 text-xs font-black rounded hover:bg-gray-50 transition-all uppercase tracking-widest shadow-sm">Cancel</button>
               </div>
            </div>

            <div className="p-8 flex-1 overflow-auto bg-[#f8f9fa] custom-scrollbar">
               <div className="grid grid-cols-3 gap-8 mb-8 bg-white p-6 border rounded shadow-md">
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Customer:Job</label>
                     <select
                        className="border-b-2 border-blue-200 p-1 text-sm bg-blue-50/10 font-bold outline-none focus:border-blue-500"
                        value={selectedCustomerId}
                        onChange={e => setSelectedCustomerId(e.target.value)}
                     >
                        <option value="">--Select Customer--</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Date</label>
                     <input className="border-b-2 border-gray-200 p-1 text-xs bg-transparent outline-none focus:border-blue-500 font-bold" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Credit No.</label>
                     <input className="border-b-2 border-gray-200 p-1 text-xs bg-transparent text-right outline-none focus:border-blue-500 font-mono font-bold" value={refNo} onChange={e => setRefNo(e.target.value)} />
                  </div>
               </div>

               <div className="bg-white border-2 border-gray-300 rounded overflow-hidden shadow-xl">
                  <table className="w-full text-[11px] text-left border-collapse">
                     <thead className="bg-[#e8e8e8] border-b-2 border-gray-400 text-[#003366] font-black uppercase">
                        <tr>
                           <th className="px-4 py-2 border-r w-16 text-center">Qty</th>
                           <th className="px-4 py-2 border-r w-48">Item</th>
                           <th className="px-4 py-2 border-r">Description</th>
                           <th className="px-4 py-2 border-r text-right w-24">Rate</th>
                           <th className="px-4 py-2 text-right w-32">Amount</th>
                        </tr>
                     </thead>
                     <tbody>
                        {lineItems.map(li => (
                           <tr key={li.id} className="border-b hover:bg-blue-50/30">
                              <td className="p-0 border-r">
                                 <input type="number" className="w-full h-full p-2 text-center bg-transparent outline-none font-bold" value={li.quantity} onChange={e => handleQtyChange(li.id, parseFloat(e.target.value) || 0)} />
                              </td>
                              <td className="p-0 border-r">
                                 <select className="w-full h-full p-2 px-4 bg-transparent outline-none appearance-none font-bold" value={li.itemId || ''} onChange={e => handleItemChange(li.id, e.target.value)}>
                                    <option value="">--Select Item--</option>
                                    {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                                 </select>
                              </td>
                              <td className="p-0 border-r">
                                 <input className="w-full h-full p-2 px-4 bg-transparent outline-none italic text-gray-500" value={li.description} readOnly />
                              </td>
                              <td className="p-2 px-4 text-right border-r text-gray-500 font-mono">${li.rate.toFixed(2)}</td>
                              <td className="p-2 px-4 text-right font-black text-blue-900 font-mono">${li.amount.toFixed(2)}</td>
                           </tr>
                        ))}
                        <tr className="bg-gray-50/50">
                           <td colSpan={5} className="p-2 px-4">
                              <button onClick={addRow} className="text-blue-600 font-black text-[10px] uppercase hover:underline tracking-tighter cursor-pointer underline">+ Add Line</button>
                           </td>
                        </tr>
                     </tbody>
                     <tfoot className="bg-[#003366] text-white">
                        <tr>
                           <td colSpan={4} className="p-3 text-right font-black uppercase text-[10px] tracking-widest opacity-70">Credit Total:</td>
                           <td className="p-3 text-right font-black font-mono text-xl">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>

               <div className="mt-8 bg-white p-6 border rounded shadow-md border-l-8 border-l-red-600">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic block mb-2">Memo / Reason for Credit</label>
                  <textarea
                     className="w-full border-2 border-gray-100 p-3 text-xs h-20 outline-none focus:border-red-200 bg-red-50/10 rounded transition-all resize-none"
                     placeholder="Internal record of why this credit was issued..."
                     value={memo}
                     onChange={e => setMemo(e.target.value)}
                  />
               </div>
            </div>
         </div>
      </div>
   );
};

export default CreditMemoForm;

