
import React, { useState } from 'react';
import { Customer, Account, Item, TransactionItem, Transaction } from '../types';

interface Props {
    customers: Customer[];
    accounts: Account[];
    items: Item[];
    paymentMethods: string[];
    onSave: (tx: any) => void;
    onClose: () => void;
    initialData?: any;
}

const RefundReceiptForm: React.FC<Props> = ({ customers, accounts, items, paymentMethods, onSave, onClose, initialData }) => {
    const [selectedCustomerId, setSelectedCustomerId] = useState(initialData?.entityId || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [refundNo, setRefundNo] = useState(initialData?.refNo || 'REF-101');
    const [pmtMethod, setPmtMethod] = useState(initialData?.paymentMethod || paymentMethods[0] || 'Check');
    const [checkNo, setCheckNo] = useState(initialData?.checkNo || '');
    const [refundFromId, setRefundFromId] = useState(initialData?.depositToId || ''); // Reusing field for Bank Source
    const [memo, setMemo] = useState(initialData?.vendorMessage || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [taxRate, setTaxRate] = useState(initialData?.taxRate || 0);

    const [lineItems, setLineItems] = useState<Partial<TransactionItem>[]>(
        initialData?.items?.map((li: any) => ({ ...li, id: li.id || Math.random().toString() })) ||
        [{ id: Math.random().toString(), itemId: '', description: '', quantity: 1, rate: 0, amount: 0, tax: false }]
    );

    const updateLineItem = (id: string, updates: Partial<TransactionItem>) => {
        setLineItems(lineItems.map(item => {
            if (item.id === id) {
                const updated = { ...item, ...updates };
                updated.amount = (updated.quantity || 0) * (updated.rate || 0);
                return updated;
            }
            return item;
        }));
    };

    const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
    const taxAmount = lineItems.filter(li => li.tax).reduce((acc, li) => acc + ((li.amount || 0) * (taxRate / 100)), 0);
    const total = subtotal + taxAmount;

    const handleSave = async () => {
        if (!selectedCustomerId || !refundFromId) {
            alert("Please select a customer and a source account (Refund From).");
            return;
        }

        const tx = {
            id: initialData?.id || crypto.randomUUID(),
            type: 'REFUND_RECEIPT',
            entityId: selectedCustomerId,
            date,
            refNo: refundNo,
            paymentMethod: pmtMethod,
            checkNo,
            depositToId: refundFromId, // The source bank account
            vendorMessage: memo,
            email,
            taxAmount,
            taxRate,
            total,
            items: lineItems.filter(li => li.itemId),
            status: 'CLEARED'
        };
        await onSave(tx);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white w-full max-w-6xl h-[90vh] flex flex-col rounded-lg shadow-2xl overflow-hidden border-4 border-red-900/20">

                {/* Header Ribbon */}
                <div className="bg-[#003366] text-white p-4 flex justify-between items-center border-b-4 border-red-600 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center text-xl font-black">R</div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic">Refund Receipt</h2>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded font-black uppercase text-xs transition-all border border-white/20">Cancel</button>
                        <button onClick={handleSave} className="px-8 py-2 bg-red-600 hover:bg-red-700 rounded font-black uppercase text-xs shadow-[0_4px_0_rgb(0,0,0,0.2)] transition-all">Issue Refund</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-[#fdfdfd]">

                    <div className="grid grid-cols-4 gap-6 mb-8 bg-white p-6 border-2 border-gray-100 rounded-xl shadow-sm">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Refund To</label>
                            <select className="border-b-2 border-red-200 p-1 text-sm bg-red-50/10 font-bold outline-none focus:border-red-500" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                                <option value="">--Select Customer--</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 col-span-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Email</label>
                            <input className="border-b-2 border-gray-200 p-1 text-xs outline-none focus:border-red-500" value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@example.com" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Refund Date</label>
                            <input type="date" className="border-b-2 border-gray-200 p-1 text-xs outline-none focus:border-red-500 font-bold" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Refund No.</label>
                            <input className="border-b-2 border-red-200 p-1 text-xs text-right outline-none font-black text-red-900" value={refundNo} onChange={e => setRefundNo(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-8 bg-gray-50/50 p-6 border-2 border-dashed border-gray-200 rounded-xl">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black text-gray-400 uppercase italic mb-1">Payment Method</label>
                            <select className="border-2 border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-red-500 font-bold" value={pmtMethod} onChange={e => setPmtMethod(e.target.value)}>
                                {paymentMethods.map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black text-gray-400 uppercase italic mb-1">Check No.</label>
                            <input className="border-2 border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none font-mono focus:border-red-500" value={checkNo} onChange={e => setCheckNo(e.target.value)} />
                        </div>
                        <div className="flex flex-col col-span-2">
                            <label className="text-[10px] font-black text-red-400 uppercase italic mb-1">Refund From (Source Account)</label>
                            <select className="border-2 border-red-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-red-600 font-black text-red-900" value={refundFromId} onChange={e => setRefundFromId(e.target.value)}>
                                <option value="">--Select Bank Account--</option>
                                {accounts.filter(a => a.type === 'Bank' || a.type === 'Credit Card').map(a => <option key={a.id} value={a.id}>{a.name} ({a.balance.toLocaleString()})</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden mb-8 shadow-inner">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-100 border-b-2 border-gray-200">
                                <tr className="text-gray-500 uppercase font-black text-[10px] tracking-widest">
                                    <th className="px-4 py-3 text-left w-20 border-r">Qty</th>
                                    <th className="px-4 py-3 text-left border-r w-64">Product/Service</th>
                                    <th className="px-4 py-3 text-left border-r">Description</th>
                                    <th className="px-4 py-3 text-center w-16 border-r">Tax</th>
                                    <th className="px-4 py-3 text-right border-r w-32">Rate</th>
                                    <th className="px-4 py-3 text-right w-32">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map(item => (
                                    <tr key={item.id} className="border-b hover:bg-red-50/30 transition-colors h-12">
                                        <td className="border-r p-0"><input type="number" className="w-full h-full px-4 outline-none bg-transparent font-bold text-center" value={item.quantity || ''} onChange={e => updateLineItem(item.id!, { quantity: parseFloat(e.target.value) || 0 })} /></td>
                                        <td className="border-r p-0">
                                            <select className="w-full h-full px-4 outline-none bg-transparent font-black text-blue-900" value={item.itemId} onChange={e => {
                                                const itm = items.find(i => i.id === e.target.value);
                                                updateLineItem(item.id!, { itemId: e.target.value, description: itm?.description || itm?.name, rate: itm?.salesPrice || 0 });
                                            }}>
                                                <option value="">Select Item...</option>
                                                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="border-r p-0"><input className="w-full h-full px-4 outline-none bg-transparent italic" value={item.description} onChange={e => updateLineItem(item.id!, { description: e.target.value })} /></td>
                                        <td className="border-r p-0 text-center"><input type="checkbox" className="w-4 h-4 mt-1 accent-red-600" checked={item.tax || false} onChange={e => updateLineItem(item.id!, { tax: e.target.checked })} /></td>
                                        <td className="border-r p-0"><input type="number" className="w-full h-full px-4 outline-none bg-transparent text-right font-mono" value={item.rate || ''} onChange={e => updateLineItem(item.id!, { rate: parseFloat(e.target.value) || 0 })} /></td>
                                        <td className="px-4 text-right font-black text-gray-900 font-mono text-sm">${(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={() => setLineItems([...lineItems, { id: Math.random().toString(), itemId: '', description: '', quantity: 1, rate: 0, amount: 0, tax: false }])} className="w-full py-2 bg-gray-50 text-[10px] font-black uppercase text-gray-400 hover:bg-gray-100 transition-all">+ Add Line Item</button>
                    </div>

                    <div className="flex justify-between items-start">
                        <div className="w-1/2 p-6 bg-white border-2 border-gray-100 rounded-xl">
                            <label className="text-[10px] font-black text-gray-400 uppercase italic mb-2 block">Refund Message</label>
                            <textarea className="w-full h-24 p-3 border-2 border-gray-50 bg-gray-50/30 rounded-lg text-xs outline-none focus:border-red-200 resize-none" value={memo} onChange={e => setMemo(e.target.value)} placeholder="Note for the customer..." />
                        </div>

                        <div className="w-1/3 bg-white p-8 border-4 border-red-900/10 rounded-2xl shadow-xl space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-black text-gray-400 uppercase">Subtotal</span>
                                <span className="font-mono font-black text-gray-900">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-gray-400 uppercase">Sales Tax</span>
                                    <input type="number" className="w-16 border-b border-gray-300 text-center font-bold outline-none" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
                                    <span className="font-black text-gray-400">%</span>
                                </div>
                                <span className="font-mono font-black text-red-600">${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="border-t-4 border-red-900 pt-4 flex justify-between items-center">
                                <span className="text-2xl font-black italic text-red-900 uppercase">Refund Total</span>
                                <span className="text-3xl font-black font-mono text-red-600 drop-shadow-sm">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefundReceiptForm;
