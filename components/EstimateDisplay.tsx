import React from 'react';
import { Transaction, Customer, Item, QBClass } from '../types';

interface Milestone {
    id: string;
    name: string;
    amount: number;
    dueDate?: string;
    status: 'PENDING' | 'BILLED' | 'PAID';
}

interface EstimateDisplayProps {
    estimate: Transaction;
    customer: Customer | undefined;
    items: Item[];
    classes: QBClass[];
    onClose: () => void;
    onConvertToInvoice?: (estimate: Transaction) => void;
    onConvertToSalesOrder?: (estimate: Transaction) => void;
    onSave?: (estimate: Transaction) => void;
}

const EstimateDisplay: React.FC<EstimateDisplayProps> = ({ estimate, customer, items, classes, onClose, onConvertToInvoice, onConvertToSalesOrder, onSave }) => {
    const totalAmount = estimate.total.toLocaleString(undefined, { minimumFractionDigits: 2 });
    const [milestones, setMilestones] = React.useState<Milestone[]>(((estimate as any).milestones || []) as Milestone[]);
    const [showAddMilestone, setShowAddMilestone] = React.useState(false);
    const [newMilestone, setNewMilestone] = React.useState<{ name: string; amount: string; dueDate: string }>({ name: '', amount: '', dueDate: '' });

    const saveMilestones = (updated: Milestone[]) => {
        setMilestones(updated);
        if (onSave) {
            const { _id, __v, ...clean } = estimate as any;
            onSave({ ...clean, milestones: updated });
        }
    };

    const addMilestone = () => {
        if (!newMilestone.name || !newMilestone.amount) return;
        const m: Milestone = {
            id: crypto.randomUUID(),
            name: newMilestone.name,
            amount: parseFloat(newMilestone.amount) || 0,
            dueDate: newMilestone.dueDate || undefined,
            status: 'PENDING',
        };
        saveMilestones([...milestones, m]);
        setNewMilestone({ name: '', amount: '', dueDate: '' });
        setShowAddMilestone(false);
    };

    const removeMilestone = (id: string) => {
        saveMilestones(milestones.filter(m => m.id !== id));
    };

    const milestonesTotal = milestones.reduce((s, m) => s + (m.amount || 0), 0);
    const estimateTotal = estimate.total || 0;

    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'Accepted':
            case 'Complete': return 'text-green-600 border-green-600/20';
            case 'Converted': return 'text-blue-600 border-blue-600/20';
            case 'Declined': return 'text-red-600 border-red-600/20';
            default: return 'text-amber-600 border-amber-600/20';
        }
    };

    return (
        <div className="h-full bg-slate-100 p-8 overflow-y-auto font-sans">
            <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-sm overflow-hidden min-h-[1056px] flex flex-col border border-slate-300 relative">

                {/* Status Watermark */}
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] border-[12px] ${getStatusColor(estimate.status)} text-opacity-20 text-8xl font-black px-12 py-4 pointer-events-none uppercase tracking-tighter opacity-10 z-0`}>
                    {estimate.status || 'PENDING'}
                </div>

                {/* Header / Toolbar */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center no-print z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="text-slate-600 hover:text-slate-900 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {(estimate.status === 'Pending' || estimate.status === 'Accepted' || estimate.status === 'Complete' || !estimate.status) && onConvertToSalesOrder && (
                            <button
                                onClick={() => onConvertToSalesOrder(estimate)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 mr-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7l3 3 3-3" />
                                </svg>
                                Create Sales Order
                            </button>
                        )}
                        {(estimate.status === 'Pending' || estimate.status === 'Accepted' || estimate.status === 'Complete' || !estimate.status) && onConvertToInvoice && (
                            <button
                                onClick={() => onConvertToInvoice(estimate)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 mr-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Convert to Invoice
                            </button>
                        )}
                        <button
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Estimate
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-16 flex-1 flex flex-col z-10 relative">
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <h1 className="text-6xl font-serif italic text-slate-900 border-l-8 border-blue-900 pl-6 mb-2 uppercase">Estimate</h1>
                            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] pl-8">Quote for Services</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4 italic">
                                {customer?.name || 'Unknown Customer'}
                            </h2>
                            <div className="text-sm text-slate-500 leading-relaxed font-medium">
                                {estimate.BillAddr?.Line1 ? (
                                    <p>{estimate.BillAddr.Line1}</p>
                                ) : customer?.address ? (
                                    customer.address.split('\n').map((line, i) => <p key={i}>{line}</p>)
                                ) : (
                                    <p>No address on file</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-8 bg-slate-50 border-y-2 border-slate-200 py-8 px-10 mb-12">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Estimate Date</p>
                            <p className="text-lg font-black text-slate-900 italic">{estimate.date}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Expiration Date</p>
                            <p className="text-lg font-black text-slate-900 italic">{estimate.dueDate || '-'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
                            <p className={`text-lg font-black italic ${estimate.status === 'Accepted' ? 'text-green-600' : estimate.status === 'Declined' ? 'text-red-600' : 'text-amber-600'}`}>
                                {estimate.status || 'Pending'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Estimate No.</p>
                            <p className="text-lg font-black text-slate-900 font-mono tracking-tighter">#{estimate.refNo}</p>
                        </div>
                    </div>

                    <div className="flex-1">
                        <table className="w-full mb-12">
                            <thead>
                                <tr className="border-b-4 border-slate-900">
                                    <th className="text-left py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                    <th className="text-left py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Description</th>
                                    <th className="text-center py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                                    <th className="text-right py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Rate</th>
                                    <th className="text-right py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {estimate.items.map((item, idx) => {
                                    const serviceItem = items.find(i => i.id === item.itemId);
                                    return (
                                        <tr key={idx} className="group">
                                            <td className="py-6 pr-4">
                                                <span className="font-black text-slate-900 text-sm">
                                                    {serviceItem?.name || item.itemId || 'Item'}
                                                </span>
                                            </td>
                                            <td className="py-6 px-4">
                                                <p className="text-sm text-slate-600 font-medium italic">
                                                    {item.description || '-'}
                                                </p>
                                            </td>
                                            <td className="py-6 px-4 text-center">
                                                <span className="text-sm font-bold text-slate-400">{item.quantity}</span>
                                            </td>
                                            <td className="py-6 px-4 text-right">
                                                <span className="text-sm font-bold text-slate-400">
                                                    ${item.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="py-6 pl-4 text-right">
                                                <span className="text-sm font-black text-slate-900">
                                                    ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-auto border-t-8 border-slate-900 pt-12">
                        <div className="flex justify-between items-center bg-slate-100 p-8 rounded shadow-inner">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Total Estimate Amount</p>
                                <p className="text-sm font-bold text-slate-500 italic">Valid for 30 days.</p>
                            </div>
                            <div className="text-right">
                                <span className="text-6xl font-black italic text-slate-900 tracking-tighter">
                                    ${totalAmount}
                                </span>
                            </div>
                        </div>
                        {estimate.acceptedBy && (
                            <div className="mt-8 grid grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Accepted By</p>
                                    <p className="text-sm font-bold text-slate-900">{estimate.acceptedBy}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Accepted Date</p>
                                    <p className="text-sm font-bold text-slate-900">{estimate.acceptedDate || '-'}</p>
                                </div>
                            </div>
                        )}
                        <div className="mt-8 flex gap-12">
                            {estimate.memo && (
                                <div className="flex-1 border-l-4 border-slate-200 pl-6">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Internal Note</p>
                                    <p className="text-sm text-slate-600 font-medium italic leading-relaxed">{estimate.memo}</p>
                                </div>
                            )}
                            {estimate.attachments && estimate.attachments.length > 0 && (
                                <div className="w-64 border-l-4 border-blue-200 pl-6">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Attachments ({estimate.attachments.length})</p>
                                    <div className="space-y-2">
                                        {estimate.attachments.map(att => (
                                            <div key={att.id} className="text-xs flex items-center gap-2 text-slate-600 group cursor-pointer hover:text-blue-600">
                                                <span>📄</span>
                                                <span className="font-bold border-b border-transparent group-hover:border-blue-600 truncate">{att.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Milestones Panel */}
                <div className="border-t-2 border-slate-200 bg-slate-50 px-8 py-6 no-print">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">Payment Milestones</span>
                            <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-full">{milestones.length}</span>
                        </div>
                        {onSave && (
                            <button
                                onClick={() => setShowAddMilestone(v => !v)}
                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                Add Milestone
                            </button>
                        )}
                    </div>

                    {showAddMilestone && (
                        <div className="mb-4 p-4 bg-white border border-blue-200 rounded-lg">
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Name</label>
                                    <input type="text" placeholder="e.g. Foundation Complete"
                                        value={newMilestone.name}
                                        onChange={e => setNewMilestone(p => ({ ...p, name: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Amount</label>
                                    <input type="number" min={0} step="0.01" placeholder="0.00"
                                        value={newMilestone.amount}
                                        onChange={e => setNewMilestone(p => ({ ...p, amount: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Due Date</label>
                                    <input type="date"
                                        value={newMilestone.dueDate}
                                        onChange={e => setNewMilestone(p => ({ ...p, dueDate: e.target.value }))}
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setShowAddMilestone(false)} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-slate-300 rounded hover:bg-slate-50">Cancel</button>
                                <button onClick={addMilestone} disabled={!newMilestone.name || !newMilestone.amount}
                                    className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                                    Save Milestone
                                </button>
                            </div>
                        </div>
                    )}

                    {milestones.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No milestones defined. Add milestones to enable milestone-based progress invoicing.</p>
                    ) : (
                        <div className="space-y-2">
                            {milestones.map(m => (
                                <div key={m.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
                                    <div>
                                        <p className="text-sm font-black text-slate-900">{m.name}</p>
                                        {m.dueDate && <p className="text-[10px] text-slate-400">Due: {m.dueDate}</p>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full
                                            ${m.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                              m.status === 'BILLED' ? 'bg-amber-100 text-amber-700' :
                                              'bg-slate-100 text-slate-500'}`}>{m.status}</span>
                                        <p className="text-sm font-black text-slate-900">${(m.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        {onSave && m.status === 'PENDING' && (
                                            <button onClick={() => removeMilestone(m.id)}
                                                className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors">
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Milestones Total</span>
                                <div className="text-right">
                                    <span className={`text-sm font-black ${Math.abs(milestonesTotal - estimateTotal) > 0.01 ? 'text-amber-600' : 'text-green-700'}`}>
                                        ${milestonesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                    {Math.abs(milestonesTotal - estimateTotal) > 0.01 && (
                                        <p className="text-[9px] text-amber-500 italic">Estimate total: ${estimateTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center mt-auto z-10">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black italic">EST</div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Reference ID</p>
                            <p className="text-xs font-mono">{estimate.id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EstimateDisplay;
