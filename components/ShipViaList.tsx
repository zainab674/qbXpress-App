
import React, { useState, useEffect } from 'react';
import { ShipViaEntry } from '../types';

interface ShipViaListProps {
    shipVia: ShipViaEntry[];
    onUpdateShipVia: (shipVia: ShipViaEntry[]) => void;
}

const EMPTY: Partial<ShipViaEntry> = {
    name: '', carrier: '', serviceType: '', accountNumber: '',
    phone: '', email: '', trackingUrl: '', estimatedDays: undefined, notes: '',
};

const ShipViaDialog: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: Partial<ShipViaEntry>) => void;
    initialData?: ShipViaEntry;
}> = ({ isOpen, onClose, onSave, initialData }) => {
    const [form, setForm] = useState<Partial<ShipViaEntry>>(EMPTY);

    useEffect(() => {
        setForm(initialData ? { ...initialData } : { ...EMPTY });
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const set = (k: keyof ShipViaEntry, v: any) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#f0f0f0] border-2 border-[#003366] shadow-2xl w-[95vw] h-[95vh] rounded-sm flex flex-col overflow-hidden">
                {/* Title bar */}
                <div className="bg-gradient-to-r from-[#003366] to-[#0055aa] text-white px-4 py-2 flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider">
                        {initialData ? 'Edit Shipping Method' : 'New Shipping Method'}
                    </span>
                    <button onClick={onClose} className="hover:bg-red-500 rounded px-1.5 transition-colors">✕</button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-white p-6 space-y-5">
                    {/* Row 1 */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wide">Method Name *</label>
                            <input
                                autoFocus
                                value={form.name || ''}
                                onChange={e => set('name', e.target.value)}
                                placeholder="e.g. FedEx Ground"
                                className="border border-gray-400 px-2 py-1.5 text-sm outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wide">Carrier *</label>
                            <input
                                value={form.carrier || ''}
                                onChange={e => set('carrier', e.target.value)}
                                placeholder="e.g. FedEx, UPS, USPS, In-House"
                                className="border border-gray-400 px-2 py-1.5 text-sm outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                            />
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wide">Service Type</label>
                            <input
                                value={form.serviceType || ''}
                                onChange={e => set('serviceType', e.target.value)}
                                placeholder="e.g. Ground, Express, Priority Mail"
                                className="border border-gray-400 px-2 py-1.5 text-sm outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wide">Account Number</label>
                            <input
                                value={form.accountNumber || ''}
                                onChange={e => set('accountNumber', e.target.value)}
                                placeholder="Your carrier account #"
                                className="border border-gray-400 px-2 py-1.5 text-sm outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                            />
                        </div>
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wide">Phone Number</label>
                            <input
                                value={form.phone || ''}
                                onChange={e => set('phone', e.target.value)}
                                placeholder="Carrier customer service phone"
                                className="border border-gray-400 px-2 py-1.5 text-sm outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wide">Email Address(es)</label>
                            <input
                                value={form.email || ''}
                                onChange={e => set('email', e.target.value)}
                                placeholder="contact@carrier.com; notify@carrier.com"
                                className="border border-gray-400 px-2 py-1.5 text-sm outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                            />
                            <span className="text-[9px] text-gray-400">Separate multiple emails with semicolons</span>
                        </div>
                    </div>

                    {/* Row 4 */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wide">Tracking URL</label>
                            <input
                                value={form.trackingUrl || ''}
                                onChange={e => set('trackingUrl', e.target.value)}
                                placeholder="https://www.fedex.com/fedextrack/"
                                className="border border-gray-400 px-2 py-1.5 text-sm outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wide">Est. Delivery Days</label>
                            <input
                                type="number"
                                min={0}
                                value={form.estimatedDays ?? ''}
                                onChange={e => set('estimatedDays', e.target.value === '' ? undefined : parseInt(e.target.value))}
                                placeholder="e.g. 3"
                                className="border border-gray-400 px-2 py-1.5 text-sm outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366] w-32"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wide">Notes</label>
                        <textarea
                            value={form.notes || ''}
                            onChange={e => set('notes', e.target.value)}
                            rows={3}
                            placeholder="Additional notes about this shipping method..."
                            className="border border-gray-400 px-2 py-1.5 text-sm outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366] resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-[#e0e0e0] px-4 py-2.5 flex justify-end gap-2 border-t border-gray-300">
                    <button
                        onClick={onClose}
                        className="px-5 py-1.5 border border-gray-400 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded shadow-sm transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => form.name?.trim() && form.carrier?.trim() && onSave(form)}
                        disabled={!form.name?.trim() || !form.carrier?.trim()}
                        className="px-6 py-1.5 bg-[#003366] hover:bg-[#004488] text-white text-xs font-bold rounded shadow-md transition-all active:scale-95 disabled:bg-gray-400"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

const ShipViaList: React.FC<ShipViaListProps> = ({ shipVia, onUpdateShipVia }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<{ open: boolean; data?: ShipViaEntry }>({ open: false });

    const handleAdd = () => setDialog({ open: true });

    const handleEdit = () => {
        const entry = shipVia.find(s => s.id === selectedId);
        if (entry) setDialog({ open: true, data: entry });
    };

    const handleDelete = () => {
        const entry = shipVia.find(s => s.id === selectedId);
        if (!entry) return;
        if (window.confirm(`Delete "${entry.name}"?`)) {
            onUpdateShipVia(shipVia.filter(s => s.id !== selectedId));
            setSelectedId(null);
        }
    };

    const handleSave = (data: Partial<ShipViaEntry>) => {
        if (dialog.data) {
            onUpdateShipVia(shipVia.map(s => s.id === dialog.data!.id ? { ...s, ...data } as ShipViaEntry : s));
        } else {
            onUpdateShipVia([...shipVia, { ...data, id: Math.random().toString(36).slice(2), isActive: true } as ShipViaEntry]);
        }
        setDialog({ open: false });
    };

    const sorted = [...shipVia].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="flex flex-col h-full bg-[#f0f0f0]">
            <div className="flex-1 overflow-auto bg-white m-1 border border-gray-400">
                <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-400 z-10">
                        <tr className="h-6">
                            <th className="px-3 border-r border-gray-300 font-bold uppercase">Method Name</th>
                            <th className="px-3 border-r border-gray-300 font-bold uppercase">Carrier</th>
                            <th className="px-3 border-r border-gray-300 font-bold uppercase">Service Type</th>
                            <th className="px-3 border-r border-gray-300 font-bold uppercase">Account #</th>
                            <th className="px-3 border-r border-gray-300 font-bold uppercase">Phone</th>
                            <th className="px-3 border-r border-gray-300 font-bold uppercase">Email</th>
                            <th className="px-3 border-r border-gray-300 font-bold uppercase text-right">Est. Days</th>
                            <th className="px-3 font-bold uppercase">Tracking URL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center text-gray-400 italic text-xs">
                                    No shipping methods defined. Click Ship Via ▼ → New to add one.
                                </td>
                            </tr>
                        ) : (
                            sorted.map(s => (
                                <tr
                                    key={s.id}
                                    onClick={() => setSelectedId(s.id)}
                                    onDoubleClick={() => { setSelectedId(s.id); setDialog({ open: true, data: s }); }}
                                    className={`h-5 border-b border-gray-100 cursor-default ${selectedId === s.id ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'}`}
                                >
                                    <td className="px-3 font-bold">{s.name}</td>
                                    <td className="px-3">{s.carrier || '--'}</td>
                                    <td className="px-3">{s.serviceType || '--'}</td>
                                    <td className="px-3">{s.accountNumber || '--'}</td>
                                    <td className="px-3">{s.phone || '--'}</td>
                                    <td className="px-3 max-w-[160px] truncate" title={s.email}>{s.email || '--'}</td>
                                    <td className="px-3 text-right">{s.estimatedDays != null ? `${s.estimatedDays}d` : '--'}</td>
                                    <td className="px-3 max-w-[180px] truncate" title={s.trackingUrl}>
                                        {s.trackingUrl
                                            ? <span className={selectedId === s.id ? 'text-blue-200 underline' : 'text-blue-600 underline'}>{s.trackingUrl}</span>
                                            : '--'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-[#f0f0f0] p-1 border-t border-gray-300 flex items-center gap-2">
                <div className="relative group inline-block">
                    <button className="bg-gray-100 hover:bg-white border border-gray-400 px-3 py-0.5 text-[11px] font-bold rounded uppercase">
                        Ship Via ▼
                    </button>
                    <div className="hidden group-hover:block absolute bottom-full left-0 bg-white border border-gray-400 shadow-xl min-w-[150px] py-1 z-50">
                        <button onClick={handleAdd} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs">New</button>
                        <button onClick={handleEdit} disabled={!selectedId} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs disabled:opacity-40">Edit</button>
                        <button onClick={handleDelete} disabled={!selectedId} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs disabled:opacity-40">Delete</button>
                    </div>
                </div>
                <span className="text-[10px] text-gray-400">Double-click a row to edit</span>
            </div>

            <ShipViaDialog
                isOpen={dialog.open}
                initialData={dialog.data}
                onClose={() => setDialog({ open: false })}
                onSave={handleSave}
            />
        </div>
    );
};

export default ShipViaList;
