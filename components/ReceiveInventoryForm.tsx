
import React, { useState } from 'react';
import { Vendor, Transaction, Item } from '../types';

interface Props {
  vendors: Vendor[];
  transactions: Transaction[];
  items: Item[];
  onSave: (receipt: Transaction) => void;
  onClose: () => void;
}

const ReceiveInventoryForm: React.FC<Props> = ({ vendors, transactions, items, onSave, onClose }) => {
  const [vendorId, setVendorId] = useState('');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [receiveWithBill, setReceiveWithBill] = useState(true);
  const [refNo] = useState('RECV-' + Date.now().toString().slice(-4));
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});

  const vendorPos = transactions.filter(t => t.type === 'PURCHASE_ORDER' && t.entityId === vendorId && t.status === 'OPEN');
  const selectedPo = vendorPos.find(p => p.id === selectedPoId);

  const handleQtyChange = (itemId: string, qty: number) => {
    setReceivedQtys(prev => ({ ...prev, [itemId]: qty }));
  };

  const currentItems = selectedPo?.items.map(item => ({
    ...item,
    quantity: receivedQtys[item.id] ?? item.quantity
  })) || [];

  const currentTotal = currentItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

  const handleRecord = () => {
    if (!selectedPo) return;
    const receipt: Transaction = {
      id: Math.random().toString(),
      type: receiveWithBill ? 'BILL' : 'RECEIVE_ITEM',
      refNo: refNo,
      date: new Date().toLocaleDateString('en-US'),
      entityId: vendorId,
      items: currentItems,
      total: currentTotal,
      status: receiveWithBill ? 'OPEN' : 'RECEIVED',
      purchaseOrderId: selectedPoId
    };
    onSave(receipt);
    onClose();
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
      <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-white border-b-4 border-blue-900 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-serif italic text-[#003366] drop-shadow-sm">Receive Inventory</h2>
            <div className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200 shadow-inner">Step 1: Receipt</div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleRecord} disabled={!selectedPoId} className="bg-[#0077c5] text-white px-10 py-2 text-xs font-black rounded shadow-md hover:bg-[#005fa0] disabled:bg-gray-400 transition-all uppercase tracking-widest shadow-lg">Receive Items</button>
            <button onClick={onClose} className="bg-white border border-gray-400 px-10 py-2 text-xs font-black rounded hover:bg-gray-50 transition-all uppercase tracking-widest shadow-sm">Cancel</button>
          </div>
        </div>

        <div className="p-8 space-y-10 bg-[#f8f9fa] flex-1 overflow-auto custom-scrollbar">
          <div className="bg-white p-6 border-2 border-gray-100 rounded-sm shadow-xl flex justify-around items-center">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${receiveWithBill ? 'bg-blue-600 border-blue-700 shadow-inner' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                {receiveWithBill && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </div>
              <input type="radio" className="hidden" checked={receiveWithBill} onChange={() => setReceiveWithBill(true)} />
              <span className={`text-sm font-black uppercase tracking-widest ${receiveWithBill ? 'text-blue-900' : 'text-gray-400'}`}>Receive items with bill</span>
            </label>
            <div className="h-10 w-px bg-gray-200"></div>
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${!receiveWithBill ? 'bg-blue-600 border-blue-700 shadow-inner' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                {!receiveWithBill && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </div>
              <input type="radio" className="hidden" checked={!receiveWithBill} onChange={() => setReceiveWithBill(false)} />
              <span className={`text-sm font-black uppercase tracking-widest ${!receiveWithBill ? 'text-blue-900' : 'text-gray-400'}`}>Receive items without bill</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-12 bg-white p-8 border-2 border-gray-100 rounded shadow-lg relative">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic flex items-center gap-2">
                <span className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center text-[8px] not-italic">V</span>
                Select Vendor
              </label>
              <select
                className="border-b-2 border-blue-200 p-2 text-lg font-bold bg-blue-50/10 outline-none focus:border-blue-600 text-[#003366] transition-colors"
                value={vendorId}
                onChange={e => { setVendorId(e.target.value); setSelectedPoId(''); setReceivedQtys({}); }}
              >
                <option value="">--Select Vendor--</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            {vendorId && (
              <div className="flex flex-col gap-2 animate-in slide-in-from-right-4 duration-300">
                <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest italic flex items-center gap-2">
                  <span className="text-lg">📜</span> Open Purchase Order
                </label>
                <select
                  className="border-b-2 border-blue-200 p-2 text-sm bg-blue-50/20 font-black outline-none focus:border-blue-600 text-[#003366] shadow-sm"
                  value={selectedPoId}
                  onChange={e => { setSelectedPoId(e.target.value); setReceivedQtys({}); }}
                >
                  <option value="">--Choose PO--</option>
                  {vendorPos.map(p => <option key={p.id} value={p.id}>{p.refNo} ({p.date}) - ${p.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="bg-white border-2 border-gray-300 rounded shadow-2xl overflow-hidden min-h-[300px]">
            {selectedPo ? (
              <table className="w-full text-[11px] text-left border-collapse">
                <thead className="bg-[#e8e8e8] border-b-2 border-gray-400 text-[#003366] font-black uppercase">
                  <tr>
                    <th className="p-3 border-r border-gray-300">Item</th>
                    <th className="p-3 border-r border-gray-300">Description</th>
                    <th className="p-3 border-r border-gray-300 text-center w-32">Qty Ordered</th>
                    <th className="p-3 border-r border-gray-300 text-center w-32">Qty to Receive</th>
                    <th className="p-3 text-right w-32">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPo.items.map((item, i) => (
                    <tr key={i} className="border-b h-10 hover:bg-blue-50/50 group transition-colors">
                      <td className="p-3 border-r border-gray-200 font-black text-gray-800 uppercase tracking-tighter">{items.find(it => it.id === item.id)?.name}</td>
                      <td className="p-3 border-r border-gray-200 italic text-gray-500">{item.description}</td>
                      <td className="p-3 border-r border-gray-200 text-center font-bold text-gray-400">{item.quantity}</td>
                      <td className="p-3 border-r border-gray-200 text-center font-black text-blue-900 bg-blue-50/30">
                        <input
                          type="number"
                          className="w-full h-full text-center bg-transparent outline-none"
                          value={receivedQtys[item.id!] ?? item.quantity}
                          onChange={(e) => handleQtyChange(item.id!, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-gray-600">${item.rate.toFixed(2)}</td>
                    </tr>
                  ))}
                  {[1, 2].map(i => <tr key={i} className="h-10 border-b border-gray-100 opacity-20"><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td></td></tr>)}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={4} className="p-4 text-right font-black uppercase text-[10px] tracking-widest text-gray-500">Total Selection Value:</td>
                    <td className="p-4 text-right font-black font-mono text-xl text-blue-900">${currentTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-300 italic p-10 text-center bg-gray-50/50">
                <span className="text-6xl mb-4 opacity-10">📦</span>
                Select a vendor and an open purchase order to view and receive items.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveInventoryForm;
