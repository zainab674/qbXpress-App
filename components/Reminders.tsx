
import React from 'react';
import { Transaction, Item } from '../types';

interface Props {
  transactions: Transaction[];
  items: Item[];
  onOrderLowStock: () => void;
}

const Reminders: React.FC<Props> = ({ transactions, items, onOrderLowStock }) => {
  const overdueInvoices = transactions.filter(t => t.type === 'INVOICE' && t.status === 'OVERDUE');
  const openBills = transactions.filter(t => t.type === 'BILL' && t.status === 'OPEN');
  const lowStock = items.filter(i => i.type === 'Inventory Part' && (i.onHand || 0) < (i.reorderPoint || 0));

  return (
    <div className="flex flex-col h-full bg-white select-none">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <h2 className="text-lg font-bold text-blue-900">Reminders</h2>
        <button className="text-xs text-blue-600 font-bold hover:underline uppercase tracking-tighter">Collapse All</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ReminderGroup
          title="Bills to Pay"
          count={openBills.length}
          amount={openBills.reduce((acc, b) => acc + b.total, 0)}
          isExpanded={true}
        />
        <ReminderGroup
          title="Inventory to Reorder (Ch. 8)"
          count={lowStock.length}
          amount={0}
          isExpanded={true}
          isAlert={lowStock.length > 0}
        >
          <button
            onClick={onOrderLowStock}
            className="text-[10px] bg-red-600 text-white font-bold px-3 py-1 rounded shadow-sm hover:bg-red-700 uppercase tracking-tighter"
          >
            Review and Create Purchase Orders
          </button>
        </ReminderGroup>
        <ReminderGroup
          title="Overdue Invoices"
          count={overdueInvoices.length}
          amount={overdueInvoices.reduce((acc, i) => acc + i.total, 0)}
          isExpanded={true}
          isAlert={true}
        />
      </div>
    </div>
  );
};

const ReminderGroup = ({ title, count, amount, isExpanded, isAlert, children }: any) => (
  <div className="border-b border-gray-100 italic">
    <div className={`flex items-center justify-between p-3 hover:bg-blue-50 cursor-default ${isAlert ? 'text-red-700' : 'text-gray-800'}`}>
      <div className="flex items-center gap-2">
        <span className="text-[8px]">{isExpanded ? '▼' : '▶'}</span>
        <span className={`text-[11px] ${count > 0 ? 'font-bold' : 'opacity-50'}`}>{title}</span>
      </div>
      <div className="flex gap-8 text-[11px] font-mono">
        <span className="w-8 text-right">{count}</span>
        <span className="w-32 text-right">{amount > 0 ? `$${amount.toLocaleString()}` : ''}</span>
      </div>
    </div>
    {count > 0 && children && (
      <div className="px-8 pb-3">
        {children}
      </div>
    )}
  </div>
);

export default Reminders;
