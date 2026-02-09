
import React, { useState } from 'react';
import { Item, Account, Transaction } from '../types';

interface Props {
  items: Item[];
  accounts: Account[];
  onSave: (adj: Transaction) => Promise<void>;
  onClose: () => void;
}

const InventoryAdjustmentForm: React.FC<Props> = ({ items, accounts, onSave, onClose }) => {
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toLocaleDateString());
  const [adjustmentAccount, setAdjustmentAccount] = useState('');
  const [adjustedQuantities, setAdjustedQuantities] = useState<Record<string, number>>({});

  const inventoryParts = items.filter(i => i.type === 'Inventory Part');

  const handleRecord = async () => {
    if (!adjustmentAccount) return alert("Please select an adjustment account ");

    const adj: Transaction = {
      id: crypto.randomUUID(),
      type: 'INVENTORY_ADJ',
      refNo: 'ADJ-' + Date.now().toString().slice(-4),
      date: adjustmentDate,
      entityId: 'Internal',
      bankAccountId: adjustmentAccount,
      items: Object.entries(adjustedQuantities).map(([id, q]): any => {
        const item = items.find(i => i.id === id);
        const diff = (q as number) - (item?.onHand || 0);
        return {
          id: crypto.randomUUID(),
          itemId: id,
          description: 'Inventory Adjustment - Count Update',
          quantity: diff,
          rate: item?.cost || 0,
          amount: (item?.cost || 0) * diff,
          tax: false
        };
      }).filter((i: any) => i.quantity !== 0),
      total: Object.entries(adjustedQuantities).reduce((sum, [id, q]) => {
        const item = items.find(i => i.id === id);
        return sum + ((item?.cost || 0) * ((q as number) - (item?.onHand || 0)));
      }, 0),
      status: 'CLEARED'
    };

    try {
      await onSave(adj);
      alert("Inventory adjustment recorded atomically. Quantities and account balances updated.");
      onClose();
    } catch (err) {
      alert("Failed to save inventory adjustment.");
    }
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col p-4">
      <div className="bg-white border border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-900 text-white flex items-center justify-center font-bold rounded">IA</div>
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Adjust Quantity/Value on Hand</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRecord} className="bg-blue-600 text-white px-8 py-1 text-xs font-bold rounded shadow-sm hover:bg-blue-700">Save & Close</button>
            <button onClick={onClose} className="bg-white border border-gray-400 px-8 py-1 text-xs font-bold rounded">Cancel</button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-3 gap-8 bg-[#f8fbff] border-b shadow-inner">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Adjustment Type</label>
            <select className="border p-1.5 text-xs bg-white outline-none font-bold shadow-sm">
              <option>Quantity and Total Value</option>
              <option>Quantity</option>
              <option>Total Value</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Adjustment Date</label>
            <input className="border p-1.5 text-xs bg-white outline-none shadow-sm" value={adjustmentDate} onChange={e => setAdjustmentDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Adjustment Account</label>
            <select className="border p-1.5 text-xs bg-white outline-none font-bold shadow-sm" value={adjustmentAccount} onChange={e => setAdjustmentAccount(e.target.value)}>
              <option value="">--Select Account--</option>
              {accounts.filter(a => a.type === 'Expense' || a.type === 'Cost of Goods Sold').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-white">
          <table className="w-full text-xs text-left border border-gray-200">
            <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">
              <tr>
                <th className="p-3 border-r">Item</th>
                <th className="p-3 border-r">Description</th>
                <th className="p-3 border-r text-right">Current QOH</th>
                <th className="p-3 border-r text-right bg-blue-50">New QOH</th>
                <th className="p-3 text-right">Qty Difference</th>
              </tr>
            </thead>
            <tbody>
              {inventoryParts.map(item => {
                const currentQoh = item.onHand || 0;
                const newQoh = adjustedQuantities[item.id] !== undefined ? adjustedQuantities[item.id] : currentQoh;
                const diff = newQoh - currentQoh;
                return (
                  <tr key={item.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-3 border-r font-bold text-blue-900">{item.name}</td>
                    <td className="p-3 border-r italic text-gray-500 truncate max-w-xs">{item.description}</td>
                    <td className="p-3 border-r text-right font-mono text-gray-400">{currentQoh}</td>
                    <td className="p-3 border-r text-right bg-blue-50/50">
                      <input
                        type="number"
                        className="w-24 border border-blue-200 text-right p-1 bg-white outline-none focus:ring-2 ring-blue-400 font-bold"
                        value={newQoh}
                        onChange={e => setAdjustedQuantities({ ...adjustedQuantities, [item.id]: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className={`p-3 text-right font-bold font-mono ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-300'}`}>
                      {diff > 0 ? '+' : ''}{diff === 0 ? '--' : diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default InventoryAdjustmentForm;
