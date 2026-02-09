
import React, { useState } from 'react';
import { Account, Transaction } from '../types';

interface Props {
  accounts: Account[];
  onSave: (tx: Transaction) => void;
  onClose: () => void;
}

const TransferFundsForm: React.FC<Props> = ({ accounts, onSave, onClose }) => {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toLocaleDateString());

  const handleTransfer = () => {
    if (!fromId || !toId || amount <= 0) return alert("Complete all fields.");
    const tx: Transaction = {
      id: Math.random().toString(),
      type: 'TRANSFER',
      refNo: 'XFER-' + Date.now().toString().slice(-4),
      date,
      entityId: 'Internal',
      items: [],
      total: amount,
      status: 'CLEARED',
      transferFromId: fromId,
      transferToId: toId
    };
    onSave(tx);
    onClose();
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex items-center justify-center p-8">
      <div className="bg-white w-[500px] border border-gray-400 rounded shadow-2xl overflow-hidden">
        <div className="bg-[#003366] p-2 text-white font-bold text-sm flex justify-between">
          <span>Transfer Funds Between Accounts</span>
          <button onClick={onClose}>X</button>
        </div>
        <div className="p-8 space-y-8">
           <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase italic">Date</label>
              <input className="border p-1 text-xs w-32 bg-blue-50" value={date} onChange={e => setDate(e.target.value)} />
           </div>
           <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Transfer Funds From</label>
              <select className="border p-2 text-sm bg-blue-50" value={fromId} onChange={e => setFromId(e.target.value)}>
                <option value="">&lt;Select Account&gt;</option>
                {accounts.filter(a => a.type === 'Bank' || a.type === 'Credit Card').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="text-[10px] text-gray-400 mt-1">Balance: ${accounts.find(a => a.id === fromId)?.balance.toLocaleString() || '0.00'}</div>
           </div>
           <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Transfer Funds To</label>
              <select className="border p-2 text-sm bg-blue-50" value={toId} onChange={e => setToId(e.target.value)}>
                <option value="">&lt;Select Account&gt;</option>
                {accounts.filter(a => a.type === 'Bank' || a.type === 'Credit Card').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="text-[10px] text-gray-400 mt-1">Balance: ${accounts.find(a => a.id === toId)?.balance.toLocaleString() || '0.00'}</div>
           </div>
           <div className="flex flex-col gap-1 text-right">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Transfer Amount</label>
              <input type="number" className="border p-2 text-2xl font-bold font-mono text-right bg-blue-50 w-48 ml-auto" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} />
           </div>
        </div>
        <div className="bg-gray-100 p-4 border-t flex justify-end gap-2">
          <button onClick={handleTransfer} className="bg-blue-600 text-white px-8 py-1.5 text-xs font-bold rounded shadow-sm hover:brightness-110">Save & Close</button>
          <button onClick={onClose} className="bg-white border border-gray-400 px-8 py-1.5 text-xs font-bold rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default TransferFundsForm;
