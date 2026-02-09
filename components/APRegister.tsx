
import React from 'react';
import { Transaction, Vendor } from '../types';

interface Props {
  transactions: Transaction[];
  vendors: Vendor[];
}

const APRegister: React.FC<Props> = ({ transactions, vendors }) => {
  const apTxs = transactions
    .filter(t => ['BILL', 'BILL_PAYMENT', 'VENDOR_CREDIT'].includes(t.type))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;

  return (
    <div className="p-6 h-full bg-white flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[#003366] uppercase tracking-tighter">Accounts Payable Register</h2>
        <div className="flex gap-4">
          <button className="bg-gray-100 border border-gray-400 px-3 py-1 text-[10px] font-bold uppercase rounded shadow-sm">Print Register</button>
          <button className="text-[10px] font-bold text-blue-700 border border-blue-700 px-3 py-1 rounded">Go to Vendor Center</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto border border-gray-400">
        <table className="w-full text-[12px] border-collapse">
          <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-500 shadow-sm z-10">
            <tr>
              <th className="px-2 py-2 border-r border-gray-400 text-left w-24">Date</th>
              <th className="px-2 py-2 border-r border-gray-400 text-left w-20">Number</th>
              <th className="px-2 py-2 border-r border-gray-400 text-left">Vendor / Memo</th>
              <th className="px-2 py-2 border-r border-gray-400 text-right w-32">Billed / Paid</th>
              <th className="px-2 py-2 text-right w-32">Balance</th>
            </tr>
          </thead>
          <tbody>
            {apTxs.map((tx, i) => {
              const vendor = vendors.find(v => v.id === tx.entityId);
              const amount = tx.type === 'BILL' ? tx.total : -tx.total;
              runningBalance += amount;

              return (
                <tr key={tx.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200 h-10`}>
                  <td className="p-2 border-r font-bold">{tx.date}</td>
                  <td className="p-2 border-r">{tx.refNo}</td>
                  <td className="p-2 border-r">
                    <div className="font-bold">{vendor?.name || 'Multiple'}</div>
                    <div className="text-[10px] text-gray-500 italic truncate max-w-xs">{tx.type.replace('_', ' ')}</div>
                  </td>
                  <td className={`p-2 border-r text-right font-mono font-bold ${amount > 0 ? 'text-blue-900' : 'text-red-700'}`}>
                    {amount > 0 ? `+${amount.toFixed(2)}` : `${amount.toFixed(2)}`}
                  </td>
                  <td className="p-2 text-right font-mono font-bold bg-blue-50/50">
                    ${runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default APRegister;
