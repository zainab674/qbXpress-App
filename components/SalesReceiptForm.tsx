
import React, { useState } from 'react';
import { fetchAvailableLots } from '../services/api';
import { Customer, Account, Item, TransactionItem } from '../types';

interface Props {
  customers: Customer[];
  accounts: Account[];
  items: Item[];
  paymentMethods: string[];
  onSave: (tx: any) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  initialData?: any;
}

const SalesReceiptForm: React.FC<Props> = ({ customers, accounts, items, paymentMethods, onSave, onDelete, onClose, initialData }) => {
  const [activeTab, setActiveTab] = useState('Main');
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialData?.entityId || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [receiptNo, setReceiptNo] = useState(initialData?.refNo || '1001');
  const [pmtMethod, setPmtMethod] = useState(initialData?.paymentMethod || paymentMethods[0] || '');
  const [checkNo, setCheckNo] = useState(initialData?.checkNo || '');
  const [depositTo, setDepositTo] = useState(initialData?.depositToId || '');
  const [memo, setMemo] = useState(initialData?.vendorMessage || '');
  const [shipViaSelected, setShipViaSelected] = useState(initialData?.shipVia || '');
  const [shipDate, setShipDate] = useState(initialData?.shipDate || '');
  const [trackingNo, setTrackingNo] = useState(initialData?.trackingNo || '');
  const [fob, setFob] = useState(initialData?.fob || '');
  const [lineItems, setLineItems] = useState<Partial<TransactionItem>[]>(
    initialData?.items?.map((li: any) => ({ ...li, id: li.id || Math.random().toString() })) ||
    [{ id: Math.random().toString(), itemId: '', description: '', quantity: 0, rate: 0, amount: 0, lotNumber: '' }]
  );

  const [availableLotsMap, setAvailableLotsMap] = useState<Record<string, any[]>>({});

  const updateLineItem = (id: string, updates: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        updated.amount = (updated.quantity || 0) * (updated.rate || 0);
        return updated;
      }
      return item;
    }));
  };

  const fetchAndSuggestLot = async (id: string, itemId: string) => {
    try {
      const lots = await fetchAvailableLots(itemId);
      setAvailableLotsMap(prev => ({ ...prev, [itemId]: lots }));
      if (lots && lots.length > 0) {
        // Suggested earliest lot (FIFO)
        updateLineItem(id, { lotNumber: lots[0].lotNumber });
      }
    } catch (err) {
      console.error('Error fetching lots:', err);
    }
  };

  const handleItemSelect = (id: string, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      updateLineItem(id, { itemId, description: item.description || item.name, rate: item.salesPrice || 0 });
      if (item.type === 'Inventory Part' || item.type === 'Inventory Assembly') {
        fetchAndSuggestLot(id, itemId);
      }
    }
  };

  const handleAddItem = () => {
    setLineItems([...lineItems, { id: Math.random().toString(), itemId: '', description: '', quantity: 0, rate: 0, amount: 0, lotNumber: '' }]);
  };

  const total = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);

  const handleSave = async () => {
    const tx = {
      id: initialData?.id || crypto.randomUUID(),
      type: 'SALES_RECEIPT',
      entityId: selectedCustomerId,
      date,
      refNo: receiptNo,
      paymentMethod: pmtMethod,
      checkNo,
      depositToId: depositTo,
      vendorMessage: memo,
      shipVia: shipViaSelected,
      shipDate,
      trackingNo,
      fob,
      total,
      items: lineItems.filter(li => li.itemId)
    };
    await onSave(tx);
    onClose();
  };

  const handleDelete = async () => {
    if (initialData?.id) {
      await onDelete(initialData.id);
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col">
      <div className="bg-white border-b border-gray-300">
        <div className="flex bg-gray-100 text-[10px] font-bold px-2 pt-1">
          {['Main', 'Send/Ship'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 border-t border-l border-r rounded-t-sm mr-0.5 transition-colors ${activeTab === tab ? 'bg-white border-gray-300' : 'bg-gray-200 border-transparent hover:bg-gray-50'}`}>{tab}</button>
          ))}
        </div>
        <div className="p-2 flex gap-4 bg-white border-t border-gray-300 overflow-x-auto shadow-sm">
          {activeTab === 'Main' && (
            <>
              <button onClick={handleAddItem} className="flex flex-col items-center group"><div className="w-8 h-8 bg-gray-50 border rounded flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors">✚</div><span className="text-[9px] font-bold mt-1">New Row</span></button>
              <button onClick={handleSave} className="flex flex-col items-center group"><div className="w-8 h-8 bg-gray-50 border rounded flex items-center justify-center text-blue-700 hover:bg-blue-100 transition-colors">💾</div><span className="text-[9px] font-bold mt-1">Save</span></button>
              <button onClick={handleDelete} className="flex flex-col items-center group"><div className="w-8 h-8 bg-gray-50 border rounded flex items-center justify-center text-red-600 hover:bg-red-100 transition-colors">✖</div><span className="text-[9px] font-bold mt-1">Delete</span></button>
              <button onClick={onClose} className="flex flex-col items-center group"><div className="w-8 h-8 bg-gray-50 border rounded flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">⎋</div><span className="text-[9px] font-bold mt-1">Close</span></button>
            </>
          )}
          {activeTab === 'Send/Ship' && (
            <div className="flex gap-6 items-center flex-1">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Ship Via</label>
                <input type="text" className="border border-gray-300 rounded px-1 py-0.5 text-xs w-32 outline-none focus:border-blue-500" value={shipViaSelected} onChange={e => setShipViaSelected(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Ship Date</label>
                <input type="text" className="border border-gray-300 rounded px-1 py-0.5 text-xs w-24 outline-none focus:border-blue-500" placeholder="MM/DD/YYYY" value={shipDate} onChange={e => setShipDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Tracking #</label>
                <input type="text" className="border border-gray-300 rounded px-1 py-0.5 text-xs w-40 outline-none focus:border-blue-500" value={trackingNo} onChange={e => setTrackingNo(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">FOB</label>
                <input type="text" className="border border-gray-300 rounded px-1 py-0.5 text-xs w-20 outline-none focus:border-blue-500" value={fob} onChange={e => setFob(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white border border-gray-300 m-2 rounded shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-4xl font-serif italic text-blue-900/80">Enter Sales Receipt</h1>
          <div className="text-right">
            <div className="text-[10px] font-bold text-gray-500 uppercase">Sale No.</div>
            <input className="border border-gray-300 rounded px-2 py-1 text-xs bg-blue-50 w-24 outline-none font-mono" value={receiptNo} onChange={e => setReceiptNo(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-2 flex flex-col">
            <label className="text-[10px] font-bold text-gray-500 uppercase italic">Customer:Job</label>
            <select className="border border-gray-300 rounded px-2 py-1 text-xs bg-blue-50 outline-none" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
              <option value="">&lt;Select Customer&gt;</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-500 uppercase italic">Date</label>
            <input type="text" className="border border-gray-300 rounded px-2 py-1 text-xs bg-blue-50 outline-none" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8 bg-gray-50 p-4 border rounded shadow-inner">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-500 uppercase italic">Payment Method</label>
            <select className="border border-gray-300 rounded px-2 py-1 text-xs bg-white outline-none" value={pmtMethod} onChange={e => setPmtMethod(e.target.value)}>
              {paymentMethods.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-500 uppercase italic">Check No.</label>
            <input className="border border-gray-300 rounded px-2 py-1 text-xs bg-white outline-none font-mono" value={checkNo} onChange={e => setCheckNo(e.target.value)} />
          </div>
          <div className="flex flex-col col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase italic">Deposit To</label>
            <select className="border border-gray-300 rounded px-2 py-1 text-xs bg-white outline-none" value={depositTo} onChange={e => setDepositTo(e.target.value)}>
              <option value="">--Select Account--</option>
              {accounts.filter(a => a.type === 'Bank' || a.type === 'Other Current Asset').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div className="border border-gray-300 rounded overflow-hidden min-h-[200px]">
          <table className="w-full text-xs">
            <thead className="bg-[#e8e8e8] border-b border-gray-400">
              <tr>
                <th className="px-3 py-2 text-left w-16 border-r">Qty</th>
                <th className="px-3 py-2 text-left border-r w-48">Item</th>
                <th className="px-3 py-2 text-left border-r">Description</th>
                <th className="px-3 py-2 text-left border-r w-32">Lot Number</th>
                <th className="px-3 py-2 text-right border-r w-24">Rate</th>
                <th className="px-3 py-2 text-right w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map(item => (
                <tr key={item.id} className="border-b h-8 hover:bg-blue-50/50">
                  <td className="border-r p-0"><input type="number" className="w-full h-full px-2 outline-none bg-transparent" value={item.quantity || ''} onChange={e => updateLineItem(item.id!, { quantity: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="border-r p-0 text-[10px]">
                    <select className="w-full h-full px-2 outline-none bg-transparent appearance-none font-bold" value={item.itemId} onChange={e => handleItemSelect(item.id!, e.target.value)}>
                      <option value="">Select Item...</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </td>
                  <td className="border-r p-0"><input className="w-full h-full px-2 outline-none bg-transparent text-[10px]" value={item.description} onChange={e => updateLineItem(item.id!, { description: e.target.value })} /></td>
                  <td className="border-r p-0">
                    <select
                      className="w-full h-full px-2 outline-none bg-transparent font-bold text-[10px]"
                      value={item.lotNumber || ''}
                      onChange={e => updateLineItem(item.id!, { lotNumber: e.target.value })}
                    >
                      <option value="">--Lot--</option>
                      {availableLotsMap[item.itemId!]?.map(lot => (
                        <option key={lot.lotNumber} value={lot.lotNumber}>
                          {lot.lotNumber} ({lot.quantityRemaining})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-r p-0"><input type="number" className="w-full h-full px-2 outline-none bg-transparent text-right font-mono" value={item.rate || ''} onChange={e => updateLineItem(item.id!, { rate: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="px-3 text-right font-bold text-blue-900 font-mono">${(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {[1, 2, 3].map(i => <tr key={i} className="border-b h-8 opacity-20"><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td></td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-8">
          <div className="bg-blue-50/50 p-4 border rounded min-w-[300px]">
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500 font-bold uppercase italic text-[10px]">Subtotal:</span>
              <span className="font-mono font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xl border-t border-blue-200 mt-2 pt-2 text-blue-900 font-serif italic">
              <span className="font-bold">Total:</span>
              <span className="font-bold font-mono">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesReceiptForm;
