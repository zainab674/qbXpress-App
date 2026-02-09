
import React, { useState } from 'react';
import { Vendor, Item, Transaction, TransactionItem } from '../types';

interface Props {
  vendors: Vendor[];
  items: Item[];
  onSave: (po: Transaction) => void;
  onClose: () => void;
}

const PurchaseOrderForm: React.FC<Props> = ({ vendors, items, onSave, onClose }) => {
  const [vendorId, setVendorId] = useState('');
  const [poDate, setPoDate] = useState(new Date().toLocaleDateString('en-US'));
  const [expectedDate, setExpectedDate] = useState(new Date().toLocaleDateString('en-US'));
  const [refNo, setRefNo] = useState('PO-' + Math.floor(Math.random() * 9000 + 1000));
  const [memo, setMemo] = useState('');
  const [vendorMessage, setVendorMessage] = useState('');
  const [orderItems, setOrderItems] = useState<TransactionItem[]>([
    { id: Math.random().toString(), description: '', quantity: 1, rate: 0, amount: 0, tax: false }
  ]);

  const inventoryItems = items.filter(i => i.type === 'Inventory Part' || i.type === 'Non-inventory Part' || i.type === 'Service');

  const addItemRow = () => {
    setOrderItems([...orderItems, { id: Math.random().toString(), description: '', quantity: 1, rate: 0, amount: 0, tax: false }]);
  };

  const handleItemChange = (index: number, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const newItems = [...orderItems];
    newItems[index] = {
      ...newItems[index],
      description: item.purchaseDescription || item.description || item.name,
      rate: item.cost || 0,
      amount: (item.cost || 0) * (newItems[index].quantity || 1)
    };
    // Note: We keep the row ID for local keys, but use the item.id as the reference
    (newItems[index] as any).actualItemId = item.id;
    setOrderItems(newItems);
  };

  const handleRecord = () => {
    if (!vendorId) return alert("Please select a vendor.");
    const po: Transaction = {
      id: Math.random().toString(),
      type: 'PURCHASE_ORDER',
      refNo,
      date: poDate,
      expectedDate,
      vendorMessage,
      entityId: vendorId,
      items: orderItems.filter(i => (i as any).actualItemId).map(i => ({
        ...i,
        itemId: (i as any).actualItemId
      })),
      total: orderItems.reduce((sum, i) => sum + i.amount, 0),
      status: 'OPEN'
    };
    onSave(po);
    onClose();
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
      <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-300 p-2 flex gap-4 shadow-sm">
          <button onClick={handleRecord} className="flex flex-col items-center group px-6 py-1 hover:bg-blue-50 rounded-sm border border-transparent hover:border-blue-200 transition-all">
            <div className="text-xl">💾</div>
            <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter text-blue-900">Save & Close</span>
          </button>
          <button onClick={onClose} className="flex flex-col items-center group px-6 py-1 hover:bg-red-50 rounded-sm border border-transparent hover:border-red-200 transition-all">
            <div className="text-xl">✖</div>
            <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter text-red-700">Cancel</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 bg-[#f5f7fa] custom-scrollbar">
          <div className="w-full max-w-5xl mx-auto bg-white border-2 border-gray-300 rounded shadow-2xl p-10 relative">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-5xl font-serif italic text-[#003366] drop-shadow-sm flex items-center gap-4">
                  Purchase Order
                  <span className="text-sm font-sans font-bold uppercase tracking-[0.4em] bg-[#003366] text-white px-3 py-1 rounded-full shadow-lg">QB2016</span>
                </h1>
              </div>
              <div className="text-right space-y-4">
                <div className="flex items-center justify-end gap-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">P.O. Number</label>
                  <input className="border-b-2 border-gray-300 p-1 text-sm w-32 bg-transparent text-right font-mono font-bold text-[#003366] outline-none focus:border-blue-600" value={refNo} readOnly />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</label>
                  <input className="border-b-2 border-gray-300 p-1 text-sm w-32 bg-transparent text-right font-bold outline-none focus:border-blue-600" value={poDate} onChange={e => setPoDate(e.target.value)} />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Expected Date</label>
                  <input className="border-b-2 border-blue-200 p-1 text-sm w-32 bg-blue-50/10 text-right font-bold outline-none focus:border-blue-600" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-20 mb-12">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest italic flex items-center gap-2">
                  <span className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-[8px] not-italic">V</span>
                  Vendor Selection
                </label>
                <select
                  className="w-full border-b-2 border-blue-200 p-2 text-lg font-serif italic bg-blue-50/20 outline-none focus:border-blue-600 transition-colors text-[#003366]"
                  value={vendorId}
                  onChange={e => setVendorId(e.target.value)}
                >
                  <option value="">&lt;Select Vendor&gt;</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic flex items-center gap-2">
                  <span className="text-lg">📦</span> Ship To
                </label>
                <div className="p-3 border-2 border-dashed border-gray-200 rounded text-xs text-gray-400 italic bg-gray-50/30">
                  [Your Company Address]
                </div>
              </div>
            </div>

            <div className="border-2 border-gray-300 rounded-sm overflow-hidden shadow-xl mb-12">
              <table className="w-full text-[11px] border-collapse">
                <thead className="bg-[#f0f0f0] border-b-2 border-gray-400 text-[#003366] font-black uppercase shadow-sm">
                  <tr>
                    <th className="px-4 py-2 border-r border-gray-300 text-left w-64">Item</th>
                    <th className="px-4 py-2 border-r border-gray-300 text-left">Description</th>
                    <th className="px-4 py-2 border-r border-gray-300 w-24 text-center">Qty</th>
                    <th className="px-4 py-2 border-r border-gray-300 w-32 text-right">Rate</th>
                    <th className="px-4 py-2 w-32 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((oi, idx) => (
                    <tr key={oi.id} className="border-b h-10 hover:bg-blue-50/50 group transition-colors">
                      <td className="p-0 border-r border-gray-200 relative">
                        <select
                          className="w-full h-full px-4 bg-transparent outline-none appearance-none font-bold text-[#003366]"
                          onChange={e => handleItemChange(idx, e.target.value)}
                        >
                          <option value="">--Select Item--</option>
                          {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </td>
                      <td className="p-0 border-r border-gray-200">
                        <input className="w-full h-full px-4 bg-transparent outline-none italic text-gray-600" value={oi.description} readOnly />
                      </td>
                      <td className="p-0 border-r border-gray-200">
                        <input
                          className="w-full h-full px-4 text-center font-bold outline-none"
                          type="number"
                          value={oi.quantity}
                          onChange={e => {
                            const newItems = [...orderItems];
                            newItems[idx].quantity = parseFloat(e.target.value) || 0;
                            newItems[idx].amount = newItems[idx].rate * newItems[idx].quantity;
                            setOrderItems(newItems);
                          }}
                        />
                      </td>
                      <td className="p-0 border-r border-gray-200 px-4 text-right text-gray-500 font-mono">
                        ${oi.rate.toFixed(2)}
                      </td>
                      <td className="p-0 px-4 text-right font-black text-blue-900 font-mono">
                        ${oi.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50/50">
                    <td colSpan={5} className="p-2 px-4 shadow-inner">
                      <button onClick={addItemRow} className="text-blue-600 font-black text-[10px] uppercase hover:underline tracking-tighter underline cursor-pointer">+ Add New Item Row</button>
                    </td>
                  </tr>
                  {[1, 2, 3].map(i => <tr key={i} className="h-10 border-b border-gray-100 opacity-10"><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td></td></tr>)}
                </tbody>
                <tfoot className="bg-[#003366] text-white">
                  <tr>
                    <td colSpan={4} className="p-4 text-right font-black uppercase text-[10px] tracking-widest opacity-70">Purchase order total:</td>
                    <td className="p-4 text-right font-black font-mono text-2xl drop-shadow-md">
                      ${orderItems.reduce((acc, i) => acc + i.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-12 items-start">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest italic block mb-1">Vendor Message</label>
                  <textarea
                    className="w-full border-2 border-blue-50 p-3 text-xs h-16 outline-none focus:border-blue-200 bg-blue-50/10 rounded resize-none italic text-blue-800"
                    placeholder="Message for vendor (will print on PO)..."
                    value={vendorMessage}
                    onChange={e => setVendorMessage(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic block mb-1">Memo</label>
                  <textarea
                    className="w-full border-2 border-gray-100 p-3 text-xs h-16 outline-none focus:border-blue-200 bg-gray-50/30 rounded resize-none"
                    placeholder="Internal communication for this order..."
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;
