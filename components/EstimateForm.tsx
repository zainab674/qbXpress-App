
import React, { useState } from 'react';
import { Customer, Item, Transaction, TransactionItem } from '../types';

interface Props {
   customers: Customer[];
   items: Item[];
   onSave: (estimate: Transaction) => void;
   onClose: () => void;
   onConvertToInvoice?: (estimate: Transaction) => void;
   initialData?: Transaction;
}

const EstimateForm: React.FC<Props> = ({ customers, items: availableItems, onSave, onClose, onConvertToInvoice, initialData }) => {
   const [selectedCustId, setSelectedCustId] = useState(initialData?.entityId || '');
   const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
   const [estimateNo, setEstimateNo] = useState(initialData?.refNo || (Math.floor(Math.random() * 9000) + 1000).toString());
   const [memo, setMemo] = useState(initialData?.memo || '');
   const [lineItems, setLineItems] = useState<Partial<TransactionItem>[]>(
      initialData?.items?.map(i => ({ ...i, id: i.id || crypto.randomUUID() })) ||
      [{ id: crypto.randomUUID(), description: '', quantity: 0, rate: 0, amount: 0, tax: true }]
   );
   const [billAddr, setBillAddr] = useState<string>(initialData?.BillAddr?.Line1 || '');
   const [shipAddr, setShipAddr] = useState<string>(initialData?.ShipAddr?.Line1 || '');
   const [status, setStatus] = useState<'Pending' | 'Accepted' | 'Converted' | 'Declined'>(initialData?.status as any || 'Pending');
   const [selectedTaxItemId, setSelectedTaxItemId] = useState(initialData?.taxItemId || '');

   const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
   const taxItem = availableItems.find(i => i.id === selectedTaxItemId);
   const taxRate = (taxItem?.taxRate || taxItem?.taxRateValue || 0) / 100;
   const taxAmount = lineItems.filter(i => i.tax).reduce((acc, item) => acc + (item.amount || 0) * taxRate, 0);
   const total = subtotal + taxAmount;

   const handleAddItem = () => {
      setLineItems([...lineItems, { id: crypto.randomUUID(), description: '', quantity: 0, rate: 0, amount: 0, tax: true }]);
   };

   const updateLineItem = (id: string, updates: Partial<TransactionItem>) => {
      setLineItems(lineItems.map(item => {
         if (item.id === id) {
            const updated = { ...item, ...updates };
            if (updates.quantity !== undefined || updates.rate !== undefined) {
               updated.amount = (updated.quantity || 0) * (updated.rate || 0);
            }
            return updated;
         }
         return item;
      }));
   };

   const handleItemSelect = (id: string, itemId: string) => {
      const item = availableItems.find(i => i.id === itemId);
      if (item) {
         updateLineItem(id, {
            description: item.description || item.name,
            rate: item.salesPrice || 0,
         });
      }
   };

   const getEstimateObject = (): Transaction => ({
      id: initialData?.id || crypto.randomUUID(),
      type: 'ESTIMATE',
      refNo: estimateNo,
      date: date,
      entityId: selectedCustId,
      subtotal: subtotal,
      taxAmount: taxAmount,
      taxItemId: selectedTaxItemId,
      total: total,
      status: status,
      items: lineItems.filter(i => i.description || i.rate).map(i => ({
         id: i.id || Math.random().toString(),
         description: i.description || '',
         quantity: i.quantity || 0,
         rate: i.rate || 0,
         amount: i.amount || 0,
         tax: !!i.tax
      })),
      memo: memo,
      BillAddr: { Line1: billAddr },
      ShipAddr: { Line1: shipAddr }
   });

   const handleRecord = () => {
      if (!selectedCustId) return alert("Select a customer.");
      onSave(getEstimateObject());
      onClose();
   };

   const handleCreateInvoice = () => {
      if (!selectedCustId) return alert("Select a customer.");
      if (onConvertToInvoice) {
         const estimate = getEstimateObject();
         estimate.status = 'Converted';
         setStatus('Converted');
         onConvertToInvoice(estimate);
      }
   };

   return (
      <div className="bg-[#f0f0f0] h-full flex flex-col font-sans">
         <div className="bg-white border-b border-gray-300 p-2 flex gap-4 shadow-sm">
            <button onClick={handleRecord} className="flex flex-col items-center group px-4 py-1 hover:bg-blue-50 rounded-sm border border-transparent hover:border-blue-200 transition-all">
               <div className="text-xl">💾</div>
               <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter text-blue-900">Save & Close</span>
            </button>

            <button onClick={onClose} className="flex flex-col items-center group px-4 py-1 hover:bg-red-50 rounded-sm border border-transparent hover:border-red-200 transition-all ml-auto">
               <div className="text-xl">✖</div>
               <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter text-red-700">Cancel</span>
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-8 bg-white m-2 border border-gray-300 rounded shadow-2xl">
            <div className="flex justify-between items-start mb-10">
               <h1 className="text-5xl font-serif italic text-[#003366] drop-shadow-sm">Estimate</h1>
               <div className="text-right space-y-2">
                  <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Estimate No.</label>
                     <input className="border-b border-gray-300 p-1 text-sm w-32 text-right outline-none focus:border-blue-500 font-mono" value={estimateNo} onChange={e => setEstimateNo(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Date</label>
                     <input className="border-b border-gray-300 p-1 text-sm w-32 text-right outline-none focus:border-blue-500" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Status</label>
                     <select
                        className="border-b border-gray-300 p-1 text-sm w-32 text-right outline-none focus:border-blue-500 bg-transparent font-bold"
                        value={status}
                        onChange={e => setStatus(e.target.value as any)}
                     >
                        <option value="Pending">Pending</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Converted">Converted</option>
                        <option value="Declined">Declined</option>
                     </select>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-20">
               <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-1 italic">Customer:Job</label>
                  <select
                     className="border-b-2 border-blue-200 bg-blue-50/20 px-3 py-2 text-sm font-bold w-full outline-none focus:border-blue-600 transition-colors"
                     value={selectedCustId}
                     onChange={e => {
                        const custId = e.target.value;
                        setSelectedCustId(custId);
                        const customer = customers.find(c => c.id === custId);
                        if (customer) {
                           const addr = customer.address || '';
                           setBillAddr(addr);
                           setShipAddr(addr);
                        }
                     }}
                  >
                     <option value="">&lt;Select Customer:Job&gt;</option>
                     {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-20 mt-6">
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block italic">Bill To</label>
                  <textarea
                     className="w-full border border-gray-300 rounded p-2 text-xs bg-gray-50 outline-none h-24 resize-none focus:ring-1 ring-blue-500 italic"
                     value={billAddr}
                     onChange={e => setBillAddr(e.target.value)}
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block italic">Ship To</label>
                  <textarea
                     className="w-full border border-gray-300 rounded p-2 text-xs bg-gray-50 outline-none h-24 resize-none focus:ring-1 ring-blue-500 italic"
                     value={shipAddr}
                     onChange={e => setShipAddr(e.target.value)}
                  />
               </div>
            </div>

            <div className="mt-12 border border-gray-400 rounded overflow-hidden shadow-inner bg-gray-50">
               <table className="w-full text-[11px]">
                  <thead className="bg-[#e8e8e8] border-b border-gray-400 text-[#003366] font-bold">
                     <tr>
                        <th className="px-4 py-2 border-r text-left w-24">Item</th>
                        <th className="px-4 py-2 border-r text-left">Description</th>
                        <th className="px-4 py-2 border-r text-center w-20">Qty</th>
                        <th className="px-4 py-2 border-r text-right w-28">Cost</th>
                        <th className="px-4 py-2 text-right w-32">Total</th>
                     </tr>
                  </thead>
                  <tbody className="bg-white">
                     {lineItems.map(item => (
                        <tr key={item.id} className="border-b border-gray-100 h-10 hover:bg-blue-50/50 group">
                           <td className="p-0 border-r">
                              <select className="w-full h-full px-4 bg-transparent outline-none appearance-none" onChange={e => handleItemSelect(item.id!, e.target.value)}>
                                 <option value="">Select Item...</option>
                                 {availableItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                              </select>
                           </td>
                           <td className="p-0 border-r">
                              <input className="w-full h-full px-4 bg-transparent outline-none italic text-gray-500" value={item.description || ''} onChange={e => updateLineItem(item.id!, { description: e.target.value })} />
                           </td>
                           <td className="p-0 border-r text-center">
                              <input type="number" className="w-full h-full px-4 bg-transparent border-none outline-none text-center" value={item.quantity || ''} onChange={e => updateLineItem(item.id!, { quantity: parseFloat(e.target.value) || 0 })} />
                           </td>
                           <td className="p-0 border-r text-right">
                              <input type="number" className="w-full h-full px-4 bg-transparent border-none outline-none text-right" value={item.rate || ''} onChange={e => updateLineItem(item.id!, { rate: parseFloat(e.target.value) || 0 })} />
                           </td>
                           <td className="px-4 py-2 text-right font-bold text-blue-900">
                              {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                           </td>
                        </tr>
                     ))}
                     <tr className="bg-gray-50/30">
                        <td colSpan={5} className="px-4 py-1.5">
                           <button onClick={handleAddItem} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest">+ Add Line Item</button>
                        </td>
                     </tr>
                     {[1, 2, 3, 4, 5].map(i => <tr key={i} className="border-b border-gray-100 h-10 opacity-10"><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td></td></tr>)}
                  </tbody>
               </table>
            </div>

            <div className="mt-12 flex justify-between items-end">
               <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 italic">Memo</label>
                  <textarea
                     className="w-full border border-gray-300 rounded p-3 text-xs bg-gray-50 outline-none h-20 resize-none focus:ring-1 ring-blue-500 italic"
                     placeholder="Internal notes about this estimate..."
                     value={memo}
                     onChange={e => setMemo(e.target.value)}
                  />
               </div>
               <div className="text-right space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Estimate Total</div>
                  <div className="text-5xl font-black text-[#003366] font-mono tracking-tighter">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default EstimateForm;
