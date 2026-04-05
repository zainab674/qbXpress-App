
import React, { useState } from 'react';
import { Customer, Item, Transaction, TransactionItem } from '../types';

interface Props {
   customers: Customer[];
   items: Item[];
   onSave: (cm: Transaction) => void;
   onClose: () => void;
   customerCreditCategories: any[];
   initialData?: Transaction;
   onRefund?: (data: any) => void;
   onMakeRecurring?: (data: any) => void;
}

const CreditMemoForm: React.FC<Props> = ({ customers, items, customerCreditCategories, onSave, onClose, initialData, onRefund, onMakeRecurring }) => {
   const [selectedCustomerId, setSelectedCustomerId] = useState(initialData?.entityId || '');
   const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
   const [refNo, setRefNo] = useState(initialData?.refNo || 'CM-' + Math.floor(Math.random() * 9000 + 1000));
   const [memo, setMemo] = useState(initialData?.memo || '');
   const [email, setEmail] = useState(initialData?.email || '');
   const [cc, setCc] = useState(initialData?.cc || '');
   const [bcc, setBcc] = useState(initialData?.bcc || '');
   const [location, setLocation] = useState(initialData?.location || '');
   const [internalNotes, setInternalNotes] = useState(initialData?.internalNotes || '');
   const [customerMessage, setCustomerMessage] = useState(initialData?.vendorMessage || '');
   const [statementMessage, setStatementMessage] = useState(initialData?.memoOnStatement || '');
   const [discountAmount, setDiscountAmount] = useState(initialData?.discountAmount || 0);
   const [discountPercentage, setDiscountPercentage] = useState(initialData?.discountPercentage || 0);
   const [isDiscountPercentage, setIsDiscountPercentage] = useState(initialData?.isDiscountPercentage || false);
   const [taxRate, setTaxRate] = useState(initialData?.taxRate || 0);

   const [lineItems, setLineItems] = useState<TransactionItem[]>(
      initialData?.items || [{ id: Math.random().toString(), itemId: '', description: '', quantity: 1, rate: 0, amount: 0, tax: false }]
   );

   const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
   const taxAmount = lineItems.filter(li => li.tax).reduce((acc, li) => acc + (li.amount * (taxRate / 100)), 0);
   const discVal = isDiscountPercentage ? (subtotal * (discountPercentage / 100)) : discountAmount;
   const total = subtotal + taxAmount - discVal;

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
         memo,
         email,
         cc,
         bcc,
         location,
         discountAmount,
         discountPercentage,
         isDiscountPercentage,
         taxAmount,
         taxRate,
         internalNotes,
         vendorMessage: customerMessage,
         memoOnStatement: statementMessage
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
               <div className="grid grid-cols-4 gap-6 mb-8 bg-white p-6 border rounded shadow-md">
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
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Email</label>
                     <input className="border-b-2 border-gray-200 p-1 text-xs bg-transparent outline-none focus:border-blue-500" value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@example.com" />
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Location</label>
                     <input className="border-b-2 border-gray-200 p-1 text-xs bg-transparent outline-none focus:border-blue-500" value={location} onChange={e => setLocation(e.target.value)} placeholder="Main Store" />
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Date</label>
                     <input type="date" className="border-b-2 border-gray-200 p-1 text-xs bg-transparent text-right outline-none focus:border-blue-500 font-bold" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Credit No.</label>
                     <input className="border-b-2 border-gray-200 p-1 text-xs bg-transparent outline-none focus:border-blue-500 font-mono font-bold" value={refNo} onChange={e => setRefNo(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">CC</label>
                     <input className="border-b-2 border-gray-200 p-1 text-xs bg-transparent outline-none focus:border-blue-500" value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@example.com" />
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">BCC</label>
                     <input className="border-b-2 border-gray-200 p-1 text-xs bg-transparent outline-none focus:border-blue-500" value={bcc} onChange={e => setBcc(e.target.value)} placeholder="bcc@example.com" />
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Memo on Statement</label>
                     <input className="border-b-2 border-gray-200 p-1 text-xs bg-transparent text-right outline-none focus:border-blue-500" value={statementMessage} onChange={e => setStatementMessage(e.target.value)} placeholder="Statement memo" />
                  </div>
               </div>

               <div className="bg-white border-2 border-gray-300 rounded overflow-hidden shadow-xl">
                  <table className="w-full text-[11px] text-left border-collapse">
                     <thead className="bg-[#e8e8e8] border-b-2 border-gray-400 text-[#003366] font-black uppercase">
                        <tr>
                           <th className="px-4 py-2 border-r w-16 text-center">Qty</th>
                           <th className="px-4 py-2 border-r w-48">Item</th>
                           <th className="px-4 py-2 border-r">Description</th>
                           <th className="px-4 py-2 border-r w-40">Category</th>
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
                              <td className="p-0 border-r">
                                 <select
                                    className="w-full h-full p-2 px-4 bg-transparent outline-none appearance-none font-bold text-blue-700"
                                    value={li.creditCategoryId || ''}
                                    onChange={e => setLineItems(prev => prev.map(x => x.id === li.id ? { ...x, creditCategoryId: e.target.value } : x))}
                                 >
                                    <option value="">--Category--</option>
                                    {customerCreditCategories.filter(c => c.isActive).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                 </select>
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
                           <td colSpan={4} className="p-3 text-right font-black uppercase text-[10px] tracking-widest opacity-70">Subtotal:</td>
                           <td className="p-3 text-right font-black font-mono text-xl">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>

               <div className="grid grid-cols-2 gap-8 mt-8">
                  <div className="space-y-4">
                     <div className="bg-white p-6 border rounded shadow-md border-l-8 border-l-red-600">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic block mb-2">Message on Credit Memo</label>
                        <textarea
                           className="w-full border-2 border-gray-100 p-3 text-xs h-20 outline-none focus:border-red-200 bg-red-50/10 rounded transition-all resize-none"
                           placeholder="Reason for credit..."
                           value={customerMessage}
                           onChange={e => setCustomerMessage(e.target.value)}
                        />
                     </div>
                     <div className="bg-white p-6 border rounded shadow-md border-l-8 border-l-blue-600">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic block mb-2">Internal Notes (Private)</label>
                        <textarea
                           className="w-full border-2 border-gray-100 p-3 text-xs h-20 outline-none focus:border-blue-200 bg-blue-50/10 rounded transition-all resize-none font-medium text-blue-900"
                           placeholder="Not visible to customer..."
                           value={internalNotes}
                           onChange={e => setInternalNotes(e.target.value)}
                        />
                     </div>
                  </div>

                  <div className="bg-white p-6 border-2 border-[#003366] rounded shadow-xl space-y-4">
                     <div className="flex justify-between items-center text-sm">
                        <span className="font-black text-[#003366] uppercase italic">Subtotal</span>
                        <span className="font-mono font-bold text-lg">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>

                     <div className="flex justify-between items-center gap-4 text-xs border-t pt-2">
                        <div className="flex items-center gap-2">
                           <span className="font-bold uppercase text-gray-400">Discount</span>
                           <div className="flex border rounded overflow-hidden">
                              <button onClick={() => setIsDiscountPercentage(false)} className={`px-2 py-0.5 text-[9px] font-bold ${!isDiscountPercentage ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>$</button>
                              <button onClick={() => setIsDiscountPercentage(true)} className={`px-2 py-0.5 text-[9px] font-bold ${isDiscountPercentage ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>%</button>
                           </div>
                        </div>
                        <div className="relative">
                           <span className="absolute left-2 top-1.5 text-gray-300">{isDiscountPercentage ? '%' : '$'}</span>
                           <input
                              type="number"
                              className="w-32 border border-gray-300 rounded pl-5 pr-2 py-1 text-right text-sm font-black focus:border-[#003366] outline-none"
                              value={isDiscountPercentage ? discountPercentage : discountAmount}
                              onChange={e => isDiscountPercentage ? setDiscountPercentage(parseFloat(e.target.value) || 0) : setDiscountAmount(parseFloat(e.target.value) || 0)}
                           />
                        </div>
                     </div>

                     <div className="flex justify-between items-center text-xs border-t pt-2">
                        <span className="font-bold uppercase text-gray-400">Tax Rate (%)</span>
                        <input type="number" className="w-32 border border-gray-300 rounded px-2 py-1 text-right text-sm font-black focus:border-[#003366] outline-none" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
                     </div>

                     <div className="flex justify-between items-center text-xs">
                        <span className="font-bold uppercase text-gray-400">Tax Amount</span>
                        <span className="font-mono font-bold shadow-sm bg-gray-50 px-2 py-1 border rounded text-red-600">${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>

                     <div className="flex justify-between items-end border-t-4 border-double border-[#003366] pt-4">
                        <span className="text-xl font-serif italic text-[#003366] font-black">Total Credit</span>
                        <span className="text-3xl font-black font-mono text-blue-900 drop-shadow-sm">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>

                     <div className="flex gap-4 pt-4">
                        <div className="flex gap-1 items-center">
                           <button
                              onClick={() => onRefund?.({ entityId: selectedCustomerId, items: lineItems, total, taxRate, email })}
                              className="text-[10px] font-black uppercase text-red-600 hover:bg-red-50 px-3 py-1 rounded transition-all border border-red-100"
                           >
                              Refund Customer
                           </button>
                           <button
                              onClick={() => onMakeRecurring?.({ entityId: selectedCustomerId, items: lineItems, total, taxRate, type: 'CREDIT_MEMO' })}
                              className="text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 px-3 py-1 rounded transition-all border border-blue-100"
                           >
                              Make Recurring
                           </button>
                        </div>         </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default CreditMemoForm;

