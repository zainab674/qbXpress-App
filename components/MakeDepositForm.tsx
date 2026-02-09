
import React, { useState } from 'react';
import { Transaction, Account } from '../types';

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  onSave: (deposit: Transaction) => void;
  onClose: () => void;
}

const MakeDepositForm: React.FC<Props> = ({ transactions, accounts, onSave, onClose }) => {
  const [step, setStep] = useState<'SELECT' | 'DEPOSIT'>('SELECT');
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [depositToId, setDepositToId] = useState(accounts.find(a => a.type === 'Bank')?.id || '');
  const [memo, setMemo] = useState('');

  // Transactions that are "Paid" but not yet "Cleared" (Deposited) 
  // and were pointed to Undeposited Funds (Account ID 8 in our store)
  const undeposited = transactions.filter(t => 
    (t.type === 'PAYMENT' || t.type === 'SALES_RECEIPT') && 
    t.status !== 'CLEARED' &&
    t.depositToId === '8'
  );

  const handleSelectToggle = (id: string) => {
    setSelectedTxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const totalSelected = undeposited
    .filter(t => selectedTxIds.includes(t.id))
    .reduce((sum, t) => sum + t.total, 0);

  const handleRecord = () => {
    const deposit: Transaction = {
      id: Math.random().toString(),
      type: 'DEPOSIT',
      refNo: 'DEP-' + Date.now().toString().slice(-4),
      date: new Date().toLocaleDateString(),
      entityId: 'Internal',
      items: selectedTxIds.map(id => ({
        id,
        description: 'Payment Deposit',
        quantity: 1,
        rate: transactions.find(t => t.id === id)?.total || 0,
        amount: transactions.find(t => t.id === id)?.total || 0,
        tax: false
      })),
      total: totalSelected,
      status: 'CLEARED',
      depositToId: depositToId
    };
    onSave(deposit);
    onClose();
  };

  if (step === 'SELECT') {
    return (
      <div className="bg-[#f0f0f0] h-full flex items-center justify-center p-4">
        <div className="bg-white w-[600px] border border-gray-400 rounded shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-[#003366] p-2 text-white font-bold text-sm flex justify-between">
            <span>Payments to Deposit</span>
            <button onClick={onClose}>X</button>
          </div>
          <div className="p-4 bg-gray-100 border-b italic text-xs text-gray-600">
            Select the payments you want to deposit and then click OK.
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-200 border-b sticky top-0">
                <tr>
                  <th className="p-2 border-r w-8">✓</th>
                  <th className="p-2 border-r">Date</th>
                  <th className="p-2 border-r">No.</th>
                  <th className="p-2 border-r">Pmt. Method</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {undeposited.map(t => (
                  <tr key={t.id} className="border-b hover:bg-blue-50">
                    <td className="p-2 border-r text-center">
                      <input type="checkbox" checked={selectedTxIds.includes(t.id)} onChange={() => handleSelectToggle(t.id)} />
                    </td>
                    <td className="p-2 border-r">{t.date}</td>
                    <td className="p-2 border-r">{t.refNo}</td>
                    <td className="p-2 border-r">{t.paymentMethod || 'Check'}</td>
                    <td className="p-2 text-right font-mono">${t.total.toLocaleString()}</td>
                  </tr>
                ))}
                {undeposited.length === 0 && (
                  <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic">No payments waiting to be deposited.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-gray-50 border-t flex justify-between items-center font-bold">
            <span className="text-sm text-blue-900 uppercase">Subtotal: ${totalSelected.toLocaleString()}</span>
            <div className="flex gap-2">
              <button onClick={() => setStep('DEPOSIT')} disabled={selectedTxIds.length === 0} className="bg-blue-600 text-white px-6 py-1 text-xs rounded disabled:bg-gray-400">OK</button>
              <button onClick={onClose} className="bg-white border border-gray-400 px-6 py-1 text-xs rounded">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col p-4">
      <div className="bg-white border border-gray-400 rounded shadow-xl flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
           <h2 className="text-2xl font-bold text-[#003366]">Make Deposits</h2>
           <div className="flex gap-2">
              <button onClick={handleRecord} className="bg-blue-600 text-white px-4 py-1 text-xs font-bold rounded">Save & Close</button>
              <button onClick={onClose} className="bg-white border border-gray-400 px-4 py-1 text-xs font-bold rounded">Cancel</button>
           </div>
        </div>
        <div className="p-6 space-y-6">
           <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-1">
                 <label className="text-[10px] font-bold text-gray-500 uppercase italic">Deposit To</label>
                 <select className="border border-gray-300 rounded px-2 py-1 text-xs bg-blue-50" value={depositToId} onChange={e => setDepositToId(e.target.value)}>
                   {accounts.filter(a => a.type === 'Bank').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                 </select>
              </div>
              <div className="flex flex-col gap-1 text-right">
                 <label className="text-[10px] font-bold text-gray-500 uppercase">Date</label>
                 <input className="border border-gray-300 rounded px-2 py-1 text-xs bg-blue-50 text-right w-32 ml-auto" defaultValue={new Date().toLocaleDateString()} />
              </div>
           </div>
           
           <div className="border border-gray-300 rounded min-h-[200px]">
              <table className="w-full text-xs">
                 <thead className="bg-gray-100 border-b font-bold">
                    <tr><th className="p-2 border-r">Received From</th><th className="p-2 border-r">Pmt. Method</th><th className="p-2 text-right">Amount</th></tr>
                 </thead>
                 <tbody>
                    {undeposited.filter(t => selectedTxIds.includes(t.id)).map(t => (
                      <tr key={t.id} className="border-b">
                         <td className="p-2 border-r">{t.entityId}</td>
                         <td className="p-2 border-r">{t.paymentMethod}</td>
                         <td className="p-2 text-right font-mono">${t.total.toLocaleString()}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           <div className="flex justify-between items-start">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-500 uppercase">Memo</label>
                 <textarea className="border w-64 h-16 p-2 text-xs" value={memo} onChange={e => setMemo(e.target.value)} />
              </div>
              <div className="text-right">
                 <div className="text-xs text-gray-500 font-bold uppercase mb-1">Deposit Total</div>
                 <div className="text-3xl font-bold text-[#003366] font-mono">${totalSelected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MakeDepositForm;
