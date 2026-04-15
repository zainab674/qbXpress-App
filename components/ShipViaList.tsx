
import React, { useState, useEffect } from 'react';
import { ShipViaEntry, Vendor, Account } from '../types';

interface ShipViaListProps {
    shipVia: ShipViaEntry[];
    onUpdateShipVia: (shipVia: ShipViaEntry[]) => void;
    vendors?: Vendor[];
    accounts?: Account[];
}

const EMPTY: Partial<ShipViaEntry> = {
    name: '', carrier: '', serviceType: '', accountNumber: '',
    phone: '', email: '', trackingUrl: '', estimatedDays: undefined, notes: '',
};

/* ── Field wrapper ── */
const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-600 tracking-wide">{label}</label>
        {children}
        {hint && <span className="text-[10px] text-slate-400 leading-tight">{hint}</span>}
    </div>
);

/* ── Input shared style ── */
const inputCls = "border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition placeholder:text-slate-300";

/* ── Dialog ── */
const ShipViaDialog: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: Partial<ShipViaEntry>) => void;
    initialData?: ShipViaEntry;
    vendors?: Vendor[];
    accounts?: Account[];
}> = ({ isOpen, onClose, onSave, initialData, vendors = [], accounts = [] }) => {
    const [form, setForm] = useState<Partial<ShipViaEntry>>(EMPTY);

    useEffect(() => {
        setForm(initialData ? { ...initialData } : { ...EMPTY });
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const set = (k: keyof ShipViaEntry, v: any) => setForm(f => ({ ...f, [k]: v }));
    const isValid = !!(form.name?.trim() && form.carrier?.trim());

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white shadow-2xl w-[680px] max-h-[90vh] rounded-2xl flex flex-col overflow-hidden border border-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">
                            {initialData ? 'Edit Shipping Method' : 'New Shipping Method'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Configure carrier details and billing defaults</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition text-lg leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Section: Basic Info */}
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 mb-3">Carrier Info</p>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Method Name *">
                                <input autoFocus value={form.name || ''} onChange={e => set('name', e.target.value)}
                                    placeholder="e.g. FedEx Ground" className={inputCls} />
                            </Field>
                            <Field label="Carrier *">
                                <input value={form.carrier || ''} onChange={e => set('carrier', e.target.value)}
                                    placeholder="e.g. FedEx, UPS, USPS" className={inputCls} />
                            </Field>
                            <Field label="Service Type">
                                <input value={form.serviceType || ''} onChange={e => set('serviceType', e.target.value)}
                                    placeholder="e.g. Ground, Express" className={inputCls} />
                            </Field>
                            <Field label="Est. Delivery Days">
                                <input type="number" min={0} value={form.estimatedDays ?? ''}
                                    onChange={e => set('estimatedDays', e.target.value === '' ? undefined : parseInt(e.target.value))}
                                    placeholder="e.g. 3" className={inputCls + " w-32"} />
                            </Field>
                        </div>
                    </div>

                    {/* Section: Contact */}
                    <div className="border-t border-slate-100 pt-5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 mb-3">Contact & Tracking</p>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Account Number">
                                <input value={form.accountNumber || ''} onChange={e => set('accountNumber', e.target.value)}
                                    placeholder="Your carrier account #" className={inputCls} />
                            </Field>
                            <Field label="Phone Number">
                                <input value={form.phone || ''} onChange={e => set('phone', e.target.value)}
                                    placeholder="Customer service phone" className={inputCls} />
                            </Field>
                            <Field label="Email Address(es)" hint="Separate multiple emails with semicolons">
                                <input value={form.email || ''} onChange={e => set('email', e.target.value)}
                                    placeholder="contact@carrier.com" className={inputCls} />
                            </Field>
                            <Field label="Tracking URL">
                                <input value={form.trackingUrl || ''} onChange={e => set('trackingUrl', e.target.value)}
                                    placeholder="https://..." className={inputCls} />
                            </Field>
                        </div>
                    </div>

                    {/* Section: Billing */}
                    <div className="border-t border-slate-100 pt-5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 mb-3">Billing Defaults</p>
                        <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none w-fit group">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${form.isDefault ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                                {form.isDefault && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <input type="checkbox" checked={!!form.isDefault} onChange={e => set('isDefault', e.target.checked || undefined)} className="sr-only" />
                            <span className="text-sm font-semibold text-slate-700">Set as default carrier</span>
                            <span className="text-xs text-slate-400">(pre-selected on new POs, Receipts & Bills)</span>
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Carrier Vendor" hint="Link to auto-create bills when shipping costs are entered on POs/receipts.">
                                <select value={form.vendorId || ''} onChange={e => set('vendorId', e.target.value || undefined)}
                                    className={inputCls}>
                                    <option value="">— Not linked —</option>
                                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Default Expense Account">
                                <select value={form.defaultShippingAccountId || ''} onChange={e => set('defaultShippingAccountId', e.target.value || undefined)}
                                    className={inputCls}>
                                    <option value="">— None —</option>
                                    {accounts
                                        .filter(a => a.type === 'Expense' || a.type === 'Cost of Goods Sold' || a.accountType === 'Expense')
                                        .map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </Field>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="border-t border-slate-100 pt-5">
                        <Field label="Notes">
                            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
                                rows={3} placeholder="Additional notes about this shipping method..."
                                className={inputCls + " resize-none"} />
                        </Field>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                    <button onClick={onClose}
                        className="px-5 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 transition">
                        Cancel
                    </button>
                    <button
                        onClick={() => isValid && onSave(form)}
                        disabled={!isValid}
                        className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition shadow-sm"
                    >
                        {initialData ? 'Save Changes' : 'Add Method'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Main list ── */
const ShipViaList: React.FC<ShipViaListProps> = ({ shipVia, onUpdateShipVia, vendors = [], accounts = [] }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<{ open: boolean; data?: ShipViaEntry }>({ open: false });

    const selected = shipVia.find(s => s.id === selectedId);

    const handleAdd = () => setDialog({ open: true });
    const handleEdit = () => { if (selected) setDialog({ open: true, data: selected }); };
    const handleDelete = () => {
        if (!selected) return;
        if (window.confirm(`Delete "${selected.name}"?`)) {
            onUpdateShipVia(shipVia.filter(s => s.id !== selectedId));
            setSelectedId(null);
        }
    };

    const handleSave = (data: Partial<ShipViaEntry>) => {
        const clearOthers = (list: ShipViaEntry[], exceptId: string) =>
            data.isDefault ? list.map(s => s.id === exceptId ? s : { ...s, isDefault: false }) : list;
        if (dialog.data) {
            const updated = shipVia.map(s => s.id === dialog.data!.id ? { ...s, ...data } as ShipViaEntry : s);
            onUpdateShipVia(clearOthers(updated, dialog.data.id));
        } else {
            const newId = Math.random().toString(36).slice(2);
            const withNew = [...shipVia, { ...data, id: newId, isActive: true } as ShipViaEntry];
            onUpdateShipVia(clearOthers(withNew, newId));
        }
        setDialog({ open: false });
    };

    const sorted = [...shipVia].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

    const cols = [
        { label: 'Method Name', w: 'w-[200px]' },
        { label: 'Carrier', w: 'w-[120px]' },
        { label: 'Service Type', w: 'w-[120px]' },
        { label: 'Carrier Vendor', w: 'w-[160px]' },
        { label: 'Expense Account', w: 'w-[160px]' },
        { label: 'Account #', w: 'w-[130px]' },
        { label: 'Phone', w: 'w-[140px]' },
        { label: 'Est. Days', w: 'w-[80px]' },
        { label: 'Tracking URL', w: '' },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50">

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200">
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-sm transition"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
                    New
                </button>
                <button
                    onClick={handleEdit}
                    disabled={!selectedId}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold transition"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2L6 12H4v-2l7.5-7.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Edit
                </button>
                <button
                    onClick={handleDelete}
                    disabled={!selectedId}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed text-rose-600 text-xs font-semibold transition"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2.5h4V4M6.5 7v5M9.5 7v5M4 4l.8 8.5A1 1 0 005.8 13.5h4.4a1 1 0 001-.9L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Delete
                </button>
                <span className="ml-auto text-[11px] text-slate-400">
                    {sorted.length} method{sorted.length !== 1 ? 's' : ''} · click to select · double-click to edit
                </span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-100 border-b border-slate-200">
                            {cols.map(c => (
                                <th key={c.label} className={`px-4 py-2.5 font-semibold uppercase tracking-wider text-slate-500 text-[10px] ${c.w} whitespace-nowrap`}>
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {sorted.length === 0 ? (
                            <tr>
                                <td colSpan={9}>
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                        <svg className="w-12 h-12 mb-3 text-slate-200" viewBox="0 0 48 48" fill="none">
                                            <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2"/>
                                            <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                        <p className="font-semibold text-sm text-slate-500">No shipping methods yet</p>
                                        <p className="text-xs mt-1">Click <strong>New</strong> above to add your first carrier</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            sorted.map((s, i) => {
                                const linkedVendor = vendors.find(v => v.id === s.vendorId);
                                const linkedAccount = accounts.find(a => a.id === s.defaultShippingAccountId);
                                const isSelected = selectedId === s.id;
                                return (
                                    <tr
                                        key={s.id ?? i}
                                        onClick={() => setSelectedId(s.id)}
                                        onDoubleClick={() => { setSelectedId(s.id); setDialog({ open: true, data: s }); }}
                                        className={`cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white'
                                                : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        {/* Method Name */}
                                        <td className="px-4 py-2.5 font-semibold whitespace-nowrap">
                                            {s.name}
                                            {s.isDefault && (
                                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide ${
                                                    isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                                                }`}>
                                                    Default
                                                </span>
                                            )}
                                        </td>
                                        {/* Carrier */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">{s.carrier || <Dash sel={isSelected}/>}</td>
                                        {/* Service Type */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">{s.serviceType || <Dash sel={isSelected}/>}</td>
                                        {/* Carrier Vendor */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            {linkedVendor
                                                ? <span className={`font-semibold ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>{linkedVendor.name}</span>
                                                : <span className={`italic text-[10px] ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>Not linked</span>}
                                        </td>
                                        {/* Expense Account */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            {linkedAccount?.name || <Dash sel={isSelected}/>}
                                        </td>
                                        {/* Account # */}
                                        <td className="px-4 py-2.5 whitespace-nowrap font-mono text-[11px]">{s.accountNumber || <Dash sel={isSelected}/>}</td>
                                        {/* Phone */}
                                        <td className="px-4 py-2.5 whitespace-nowrap">{s.phone || <Dash sel={isSelected}/>}</td>
                                        {/* Est. Days */}
                                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                            {s.estimatedDays != null
                                                ? <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${isSelected ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{s.estimatedDays}d</span>
                                                : <Dash sel={isSelected}/>}
                                        </td>
                                        {/* Tracking URL */}
                                        <td className="px-4 py-2.5 max-w-[220px] truncate" title={s.trackingUrl}>
                                            {s.trackingUrl
                                                ? <span className={`underline underline-offset-2 ${isSelected ? 'text-blue-200' : 'text-indigo-600'}`}>{s.trackingUrl}</span>
                                                : <Dash sel={isSelected}/>}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ShipViaDialog
                isOpen={dialog.open}
                initialData={dialog.data}
                onClose={() => setDialog({ open: false })}
                onSave={handleSave}
                vendors={vendors}
                accounts={accounts}
            />
        </div>
    );
};

/* Tiny dash helper */
const Dash: React.FC<{ sel: boolean }> = ({ sel }) => (
    <span className={sel ? 'text-white/30' : 'text-slate-300'}>—</span>
);

export default ShipViaList;
