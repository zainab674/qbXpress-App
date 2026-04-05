
import React, { useState } from 'react';
import { Customer, Item, TransactionItem } from '../types';

interface Props {
    type: 'DELAYED_CHARGE' | 'DELAYED_CREDIT';
    customers: Customer[];
    items: Item[];
    onSave: (tx: any) => void;
    onClose: () => void;
    initialData?: any;
}

const DelayedTransactionForm: React.FC<Props> = ({ type, customers, items, onSave, onClose, initialData }) => {
    const isCredit = type === 'DELAYED_CREDIT';
    const title = isCredit ? 'Delayed Credit' : 'Delayed Charge';
    const themeColor = isCredit ? 'red' : 'green';
    const borderColor = isCredit ? 'border-l-red-600' : 'border-l-green-600';
    const focusBorder = isCredit ? 'focus:border-red-500' : 'focus:border-green-500';

    const [selectedCustomerId, setSelectedCustomerId] = useState(initialData?.entityId || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [memo, setMemo] = useState(initialData?.memo || '');
    const [lineItems, setLineItems] = useState<TransactionItem[]>(
        initialData?.items || [{ id: Math.random().toString(), itemId: '', description: '', quantity: 1, rate: 0, amount: 0, tax: false }]
    );

    const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
    const total = subtotal; // Delayed transactions usually don't have tax/discounts until converted, but we'll stick to a clean UI

    const handleItemChange = (id: string, itemId: string) => {
        const item = items.find(i => i.id === itemId);
        setLineItems(lineItems.map(li => {
            if (li.id === id) {
                const amount = (li.quantity || 0) * (item?.salesPrice || 0);
                return { ...li, itemId, description: item?.description || item?.name || '', rate: item?.salesPrice || 0, amount };
            }
            return li;
        }));
    };

    const updateLineItem = (id: string, updates: Partial<TransactionItem>) => {
        setLineItems(lineItems.map(li => {
            if (li.id === id) {
                const updated = { ...li, ...updates };
                updated.amount = (updated.quantity || 0) * (updated.rate || 0);
                return updated;
            }
            return li;
        }));
    };

    const addItem = () => {
        setLineItems([...lineItems, { id: Math.random().toString(), itemId: '', description: '', quantity: 1, rate: 0, amount: 0, tax: false }]);
    };

    const handleRecord = () => {
        const tx = {
            id: initialData?.id || crypto.randomUUID(),
            type,
            entityId: selectedCustomerId,
            items: lineItems.filter(li => li.itemId),
            total,
            status: 'OPEN',
            date,
            memo
        };
        onSave(tx);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white w-full max-w-6xl h-[90vh] flex flex-col rounded-lg shadow-2xl overflow-hidden border border-gray-300">
                {/* Header */}
                <div className={`bg-[#003366] text-white p-4 flex justify-between items-center border-b-4 border-${themeColor}-500 shadow-lg`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-10 bg-${themeColor}-400 rounded-full animate-pulse`} />
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic">{title}</h2>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded font-black uppercase text-xs transition-all border border-white/20">Cancel</button>
                        <button onClick={handleRecord} className={`px-8 py-2 bg-${themeColor}-500 hover:bg-${themeColor}-600 rounded font-black uppercase text-xs shadow-[0_4px_0_rgb(0,0,0,0.2)] transition-all`}>Save</button>
                    </div>
                </div>

                <div className="p-8 flex-1 overflow-auto bg-[#f8f9fa] custom-scrollbar">
                    {/* Customer Info */}
                    <div className="grid grid-cols-3 gap-8 mb-8 bg-white p-6 border rounded shadow-md">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Customer</label>
                            <select
                                className={`border-b-2 border-blue-200 p-1 text-sm bg-blue-50/10 font-bold outline-none ${focusBorder}`}
                                value={selectedCustomerId}
                                onChange={e => setSelectedCustomerId(e.target.value)}
                            >
                                <option value="">--Select Customer--</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Date</label>
                            <input type="date" className="border-b-2 border-gray-200 p-1 text-xs bg-transparent outline-none focus:border-blue-500 font-bold" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1 text-right italic text-gray-400 font-bold text-xs uppercase pt-4">
                            * Non-Posting Transaction
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border-2 border-gray-300 rounded overflow-hidden shadow-xl">
                        <table className="w-full text-[11px] text-left border-collapse">
                            <thead className="bg-[#f0f0f0] border-b-2 border-gray-400">
                                <tr className="text-gray-600 uppercase font-black tracking-widest">
                                    <th className="p-3 w-48 border-r">Item/Service</th>
                                    <th className="p-3 border-r">Description</th>
                                    <th className="p-3 w-20 border-r text-center">Qty</th>
                                    <th className="p-3 w-28 border-r text-right">Rate</th>
                                    <th className="p-3 w-28 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map(item => (
                                    <tr key={item.id} className="border-b hover:bg-blue-50/50 transition-colors h-10 group">
                                        <td className="p-0 border-r relative">
                                            <select
                                                className="w-full h-full p-3 bg-transparent outline-none font-bold text-blue-900 group-hover:bg-white"
                                                value={item.itemId}
                                                onChange={e => handleItemChange(item.id!, e.target.value)}
                                            >
                                                <option value="">Select Item...</option>
                                                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-0 border-r">
                                            <input
                                                className="w-full h-full p-3 bg-transparent outline-none italic font-medium group-hover:bg-white focus:bg-white"
                                                value={item.description}
                                                onChange={e => updateLineItem(item.id!, { description: e.target.value })}
                                            />
                                        </td>
                                        <td className="p-0 border-r">
                                            <input
                                                type="number"
                                                className="w-full h-full p-3 bg-transparent outline-none text-center font-bold group-hover:bg-white focus:bg-white"
                                                value={item.quantity}
                                                onChange={e => updateLineItem(item.id!, { quantity: parseFloat(e.target.value) || 0 })}
                                            />
                                        </td>
                                        <td className="p-0 border-r">
                                            <input
                                                type="number"
                                                className="w-full h-full p-3 bg-transparent outline-none text-right font-mono font-bold text-gray-600 group-hover:bg-white focus:bg-white"
                                                value={item.rate}
                                                onChange={e => updateLineItem(item.id!, { rate: parseFloat(e.target.value) || 0 })}
                                            />
                                        </td>
                                        <td className="p-3 text-right font-black font-mono text-blue-800 drop-shadow-sm">
                                            ${(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={addItem} className="p-3 w-full text-left text-blue-600 font-black uppercase text-[10px] hover:bg-blue-50 transition-all border-t border-gray-200">
                            + Add Line
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="grid grid-cols-2 gap-8 mt-8">
                        <div className={`bg-white p-6 border rounded shadow-md border-l-8 ${borderColor}`}>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic block mb-2">Memo</label>
                            <textarea
                                className={`w-full border-2 border-gray-100 p-3 text-xs h-20 outline-none focus:border-${themeColor}-200 rounded transition-all resize-none`}
                                placeholder="Internal note..."
                                value={memo}
                                onChange={e => setMemo(e.target.value)}
                            />
                        </div>

                        <div className="bg-[#003366] p-6 rounded shadow-xl flex flex-col justify-center items-end text-white">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Pending Amount</span>
                            <span className="text-4xl font-black font-mono drop-shadow-md">
                                ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DelayedTransactionForm;
