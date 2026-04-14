import React, { useState, useEffect, useCallback } from 'react';
import { Warehouse, Bin } from '../types';
import {
    fetchWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
    fetchBins, createBin, updateBin, deleteBin,
    transferWarehouseStock,
    fetchWarehouseInventorySnapshot,
    fetchTransferHistory,
} from '../services/api';
import { fetchAvailableLots } from '../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Item {
    id: string;
    name: string;
    sku?: string;
    type?: string;
    onHand?: number;
}

interface WarehouseCenterProps {
    items: Item[];
    showAlert?: (msg: string, title?: string) => void;
}

type Tab = 'WAREHOUSES' | 'BINS' | 'TRANSFER' | 'ON_HAND' | 'HISTORY';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const inputCls = 'border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 w-full';
const labelCls = 'text-[10px] font-bold text-gray-500 uppercase block mb-0.5';
const btnPrimary = 'bg-[#003366] text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-[#002244] disabled:opacity-50';
const btnSecondary = 'bg-white border border-gray-400 text-xs font-bold px-3 py-1.5 rounded hover:bg-gray-50 disabled:opacity-50';
const btnDanger = 'bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-red-700 disabled:opacity-50';

const TabBtn: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap
            ${active ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
    >
        {label}
    </button>
);

// ─── Warehouse Form Modal ────────────────────────────────────────────────────────

interface WarehouseFormData {
    id?: string;
    name: string;
    code: string;
    address: string;
    isDefault: boolean;
}

const WarehouseFormModal: React.FC<{
    initial: WarehouseFormData | null;
    onSave: (data: WarehouseFormData) => Promise<void>;
    onClose: () => void;
    saving: boolean;
}> = ({ initial, onSave, onClose, saving }) => {
    const [form, setForm] = useState<WarehouseFormData>(
        initial ?? { name: '', code: '', address: '', isDefault: false }
    );

    const set = (k: keyof WarehouseFormData, v: any) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[520]">
            <div className="bg-white w-[95vw] h-[95vh] rounded shadow-2xl border border-gray-400 overflow-hidden flex flex-col">
                <div className="bg-[#003366] px-4 py-2.5 text-white font-bold text-sm flex justify-between items-center">
                    <span>{form.id ? 'Edit' : 'New'} Warehouse</span>
                    <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none">×</button>
                </div>
                <div className="p-5 space-y-3">
                    <div>
                        <label className={labelCls}>Warehouse Name *</label>
                        <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
                    </div>
                    <div>
                        <label className={labelCls}>Code</label>
                        <input className={inputCls} value={form.code} onChange={e => set('code', e.target.value)}
                            placeholder="Auto-generated from name" />
                    </div>
                    <div>
                        <label className={labelCls}>Address</label>
                        <textarea className={inputCls + ' resize-none'} rows={2} value={form.address}
                            onChange={e => set('address', e.target.value)} />
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                        <input type="checkbox" checked={form.isDefault} onChange={e => set('isDefault', e.target.checked)} className="w-3.5 h-3.5" />
                        Set as Default Warehouse
                    </label>
                </div>
                <div className="px-5 pb-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
                    <button className={btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
                    <button className={btnPrimary} onClick={() => onSave(form)} disabled={saving || !form.name.trim()}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Bin Form Modal ──────────────────────────────────────────────────────────────

interface BinFormData {
    id?: string;
    name: string;
    code: string;
    warehouseId: string;
    zone: string;
    aisle: string;
    shelf: string;
    position: string;
    capacity: string;
    notes: string;
    isActive: boolean;
}

const BinFormModal: React.FC<{
    initial: BinFormData | null;
    warehouses: Warehouse[];
    defaultWarehouseId?: string;
    onSave: (data: BinFormData) => Promise<void>;
    onClose: () => void;
    saving: boolean;
}> = ({ initial, warehouses, defaultWarehouseId, onSave, onClose, saving }) => {
    const [form, setForm] = useState<BinFormData>(
        initial ?? {
            name: '', code: '', warehouseId: defaultWarehouseId ?? warehouses[0]?.id ?? '',
            zone: '', aisle: '', shelf: '', position: '', capacity: '', notes: '', isActive: true
        }
    );

    const set = (k: keyof BinFormData, v: any) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[520]">
            <div className="bg-white w-[95vw] h-[95vh] rounded shadow-2xl border border-gray-400 overflow-hidden flex flex-col">
                <div className="bg-[#003366] px-4 py-2.5 text-white font-bold text-sm flex justify-between items-center">
                    <span>{form.id ? 'Edit' : 'New'} Bin</span>
                    <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none">×</button>
                </div>
                <div className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className={labelCls}>Warehouse *</label>
                            <select className={inputCls} value={form.warehouseId} onChange={e => set('warehouseId', e.target.value)}>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Bin Name *</label>
                            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
                        </div>
                        <div>
                            <label className={labelCls}>Code</label>
                            <input className={inputCls} value={form.code} onChange={e => set('code', e.target.value)} placeholder="Auto-generated" />
                        </div>
                        <div>
                            <label className={labelCls}>Zone</label>
                            <input className={inputCls} value={form.zone} onChange={e => set('zone', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>Aisle</label>
                            <input className={inputCls} value={form.aisle} onChange={e => set('aisle', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>Shelf</label>
                            <input className={inputCls} value={form.shelf} onChange={e => set('shelf', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>Position</label>
                            <input className={inputCls} value={form.position} onChange={e => set('position', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>Capacity (units)</label>
                            <input className={inputCls} type="number" min="0" value={form.capacity} onChange={e => set('capacity', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className={labelCls}>Notes</label>
                            <input className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-3.5 h-3.5" />
                                Active
                            </label>
                        </div>
                    </div>
                </div>
                <div className="px-5 pb-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
                    <button className={btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
                    <button className={btnPrimary} onClick={() => onSave(form)} disabled={saving || !form.name.trim() || !form.warehouseId}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Warehouses Tab ──────────────────────────────────────────────────────────────

const WarehousesTab: React.FC<{
    warehouses: Warehouse[];
    onRefresh: () => void;
    showAlert: (msg: string, title?: string) => void;
}> = ({ warehouses, onRefresh, showAlert }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [modal, setModal] = useState<WarehouseFormData | null | false>(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const selected = warehouses.find(w => w.id === selectedId);

    const openNew = () => setModal({ name: '', code: '', address: '', isDefault: false });
    const openEdit = (w: Warehouse) => setModal({ id: w.id, name: w.name, code: w.code ?? '', address: w.address ?? '', isDefault: w.isDefault });

    const handleSave = async (form: WarehouseFormData) => {
        setSaving(true);
        try {
            if (form.id) {
                await updateWarehouse(form.id, { name: form.name, code: form.code, address: form.address, isDefault: form.isDefault });
            } else {
                await createWarehouse({ name: form.name, code: form.code, address: form.address, isDefault: form.isDefault });
            }
            setModal(false);
            onRefresh();
        } catch (err: any) {
            showAlert(err.message ?? 'Failed to save warehouse', 'Error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selected) return;
        if (!window.confirm(`Delete warehouse "${selected.name}"? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await deleteWarehouse(selected.id);
            setSelectedId(null);
            onRefresh();
        } catch (err: any) {
            showAlert(err.message ?? 'Failed to delete warehouse', 'Error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f5] border-b border-gray-300">
                <button className={btnPrimary} onClick={openNew}>+ New Warehouse</button>
                <button className={btnSecondary} disabled={!selected} onClick={() => selected && openEdit(selected)}>Edit</button>
                <button className={btnDanger} disabled={!selected || deleting} onClick={handleDelete}>
                    {deleting ? 'Deleting…' : 'Delete'}
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-[12px] border-collapse">
                    <thead className="sticky top-0 bg-[#e8e8e8] z-10">
                        <tr className="h-7 border-b-2 border-gray-400">
                            <th className="px-3 text-left font-bold uppercase border-r border-gray-300 w-8"></th>
                            <th className="px-3 text-left font-bold uppercase border-r border-gray-300">Name</th>
                            <th className="px-3 text-left font-bold uppercase border-r border-gray-300 w-24">Code</th>
                            <th className="px-3 text-left font-bold uppercase border-r border-gray-300">Address</th>
                            <th className="px-3 text-center font-bold uppercase w-20">Default</th>
                        </tr>
                    </thead>
                    <tbody>
                        {warehouses.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400 text-xs italic">No warehouses yet. Click "+ New Warehouse" to add one.</td></tr>
                        )}
                        {warehouses.map(w => (
                            <tr
                                key={w.id}
                                onClick={() => setSelectedId(w.id)}
                                onDoubleClick={() => openEdit(w)}
                                className={`h-7 border-b border-gray-100 cursor-pointer transition-colors
                                    ${selectedId === w.id ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'}`}
                            >
                                <td className="px-3 border-r border-gray-200 text-center">
                                    {w.isDefault && <span className="text-yellow-500 font-bold">★</span>}
                                </td>
                                <td className="px-3 border-r border-gray-200 font-semibold">{w.name}</td>
                                <td className="px-3 border-r border-gray-200 font-mono">{w.code}</td>
                                <td className="px-3 border-r border-gray-200 text-gray-500 truncate max-w-xs">{w.address || '—'}</td>
                                <td className="px-3 text-center">{w.isDefault ? 'Yes' : ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Detail panel for selected warehouse */}
            {selected && (
                <div className="border-t border-gray-300 bg-[#f9f9f9] px-4 py-3 text-xs text-gray-600 flex gap-6">
                    <div><span className="font-bold">Name: </span>{selected.name}</div>
                    <div><span className="font-bold">Code: </span>{selected.code ?? '—'}</div>
                    <div><span className="font-bold">Address: </span>{selected.address ?? '—'}</div>
                    <div><span className="font-bold">Default: </span>{selected.isDefault ? 'Yes' : 'No'}</div>
                </div>
            )}

            {modal !== false && (
                <WarehouseFormModal
                    initial={modal}
                    onSave={handleSave}
                    onClose={() => setModal(false)}
                    saving={saving}
                />
            )}
        </div>
    );
};

// ─── Bins Tab ────────────────────────────────────────────────────────────────────

const BinsTab: React.FC<{
    warehouses: Warehouse[];
    bins: Bin[];
    onRefresh: () => void;
    showAlert: (msg: string, title?: string) => void;
}> = ({ warehouses, bins, onRefresh, showAlert }) => {
    const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [modal, setModal] = useState<BinFormData | null | false>(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const warehouseName = (id: string) => warehouses.find(w => w.id === id)?.name ?? id;

    const visibleBins = warehouseFilter === 'ALL' ? bins : bins.filter(b => b.warehouseId === warehouseFilter);
    const selected = bins.find(b => b.id === selectedId);

    const openNew = () => setModal({
        name: '', code: '', warehouseId: warehouseFilter !== 'ALL' ? warehouseFilter : (warehouses[0]?.id ?? ''),
        zone: '', aisle: '', shelf: '', position: '', capacity: '', notes: '', isActive: true
    });

    const openEdit = (b: Bin) => setModal({
        id: b.id, name: b.name, code: b.code ?? '', warehouseId: b.warehouseId,
        zone: b.zone ?? '', aisle: b.aisle ?? '', shelf: b.shelf ?? '',
        position: b.position ?? '', capacity: b.capacity != null ? String(b.capacity) : '',
        notes: b.notes ?? '', isActive: b.isActive
    });

    const handleSave = async (form: BinFormData) => {
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                code: form.code || undefined,
                warehouseId: form.warehouseId,
                zone: form.zone || undefined,
                aisle: form.aisle || undefined,
                shelf: form.shelf || undefined,
                position: form.position || undefined,
                capacity: form.capacity ? Number(form.capacity) : undefined,
                notes: form.notes || undefined,
                isActive: form.isActive,
            };
            if (form.id) {
                await updateBin(form.id, payload);
            } else {
                await createBin(payload);
            }
            setModal(false);
            onRefresh();
        } catch (err: any) {
            showAlert(err.message ?? 'Failed to save bin', 'Error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selected) return;
        if (!window.confirm(`Delete bin "${selected.name}"? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await deleteBin(selected.id);
            setSelectedId(null);
            onRefresh();
        } catch (err: any) {
            showAlert(err.message ?? 'Failed to delete bin', 'Error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f5] border-b border-gray-300">
                <button className={btnPrimary} onClick={openNew} disabled={warehouses.length === 0}>+ New Bin</button>
                <button className={btnSecondary} disabled={!selected} onClick={() => selected && openEdit(selected)}>Edit</button>
                <button className={btnDanger} disabled={!selected || deleting} onClick={handleDelete}>
                    {deleting ? 'Deleting…' : 'Delete'}
                </button>
                <div className="ml-auto flex items-center gap-2">
                    <label className="text-xs text-gray-600 font-semibold">Warehouse:</label>
                    <select
                        className="border border-gray-300 rounded px-2 py-1 text-xs outline-none"
                        value={warehouseFilter}
                        onChange={e => setWarehouseFilter(e.target.value)}
                    >
                        <option value="ALL">All Warehouses</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-[12px] border-collapse">
                    <thead className="sticky top-0 bg-[#e8e8e8] z-10">
                        <tr className="h-7 border-b-2 border-gray-400">
                            <th className="px-3 text-left font-bold uppercase border-r border-gray-300">Name</th>
                            <th className="px-3 text-left font-bold uppercase border-r border-gray-300 w-24">Code</th>
                            <th className="px-3 text-left font-bold uppercase border-r border-gray-300">Warehouse</th>
                            <th className="px-3 text-left font-bold uppercase border-r border-gray-300 w-20">Zone</th>
                            <th className="px-3 text-left font-bold uppercase border-r border-gray-300 w-16">Aisle</th>
                            <th className="px-3 text-left font-bold uppercase border-r border-gray-300 w-16">Shelf</th>
                            <th className="px-3 text-right font-bold uppercase border-r border-gray-300 w-20">Capacity</th>
                            <th className="px-3 text-center font-bold uppercase w-16">Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleBins.length === 0 && (
                            <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400 text-xs italic">
                                {warehouses.length === 0 ? 'Create a warehouse first, then add bins.' : 'No bins found. Click "+ New Bin" to add one.'}
                            </td></tr>
                        )}
                        {visibleBins.map(b => (
                            <tr
                                key={b.id}
                                onClick={() => setSelectedId(b.id)}
                                onDoubleClick={() => openEdit(b)}
                                className={`h-7 border-b border-gray-100 cursor-pointer transition-colors
                                    ${selectedId === b.id ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'}`}
                            >
                                <td className="px-3 border-r border-gray-200 font-semibold">{b.name}</td>
                                <td className="px-3 border-r border-gray-200 font-mono">{b.code ?? '—'}</td>
                                <td className="px-3 border-r border-gray-200">{warehouseName(b.warehouseId)}</td>
                                <td className="px-3 border-r border-gray-200">{b.zone ?? '—'}</td>
                                <td className="px-3 border-r border-gray-200">{b.aisle ?? '—'}</td>
                                <td className="px-3 border-r border-gray-200">{b.shelf ?? '—'}</td>
                                <td className="px-3 border-r border-gray-200 text-right font-mono">{b.capacity ?? '—'}</td>
                                <td className="px-3 text-center">{b.isActive ? '✓' : ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal !== false && (
                <BinFormModal
                    initial={modal}
                    warehouses={warehouses}
                    defaultWarehouseId={warehouseFilter !== 'ALL' ? warehouseFilter : undefined}
                    onSave={handleSave}
                    onClose={() => setModal(false)}
                    saving={saving}
                />
            )}
        </div>
    );
};

// ─── Transfer Order Document (printable) ─────────────────────────────────────────

interface CompletedTransfer {
    transferNumber: string;
    date: string;
    itemName: string;
    itemSku?: string;
    fromWarehouse: string;
    fromBin?: string;
    toWarehouse: string;
    toBin?: string;
    quantity: number;
    lotNumber?: string;
    fromAddress?: string;
    toAddress?: string;
}

const TransferOrderDocument: React.FC<{
    transfer: CompletedTransfer;
    onClose: () => void;
}> = ({ transfer, onClose }) => {
    const handlePrint = () => window.print();

    return (
        <div className="fixed top-7 inset-x-0 bottom-0 bg-slate-200 z-[600] flex flex-col overflow-auto">
            {/* Toolbar (hidden when printing) */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center gap-4 no-print">
                <button
                    onClick={onClose}
                    className="text-slate-600 hover:text-slate-900 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                </button>
                <span className="text-slate-400 text-xs">|</span>
                <span className="text-slate-600 text-xs font-semibold">Transfer Order · {transfer.transferNumber}</span>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        className="bg-[#003366] text-white text-xs font-bold px-4 py-1.5 rounded hover:bg-[#002244] flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                    </button>
                </div>
            </div>

            {/* Document body */}
            <div className="flex-1 p-8">
                <div className="max-w-3xl mx-auto bg-white shadow-2xl rounded-sm border border-slate-300 min-h-[1056px] flex flex-col">

                    {/* Document header */}
                    <div className="p-8 border-b border-slate-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Internal Document</div>
                                <h1 className="text-2xl font-bold text-[#003366]">Transfer Order</h1>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500 mb-0.5">Transfer #</div>
                                <div className="text-base font-bold text-slate-800">{transfer.transferNumber}</div>
                                <div className="text-xs text-slate-500 mt-1 mb-0.5">Date</div>
                                <div className="text-sm font-semibold text-slate-700">{transfer.date}</div>
                            </div>
                        </div>
                    </div>

                    {/* From / To locations */}
                    <div className="grid grid-cols-2 gap-0 border-b border-slate-200">
                        <div className="p-6 border-r border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Transfer From</div>
                            <div className="text-sm font-bold text-slate-800">
                                {transfer.fromWarehouse || <span className="text-slate-400 font-normal italic">Unassigned</span>}
                            </div>
                            {transfer.fromBin && (
                                <div className="text-xs text-slate-500 mt-0.5">Bin: {transfer.fromBin}</div>
                            )}
                            {transfer.fromAddress && (
                                <div className="text-xs text-slate-500 mt-1 whitespace-pre-line">{transfer.fromAddress}</div>
                            )}
                        </div>
                        <div className="p-6">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Transfer To</div>
                            <div className="text-sm font-bold text-slate-800">{transfer.toWarehouse}</div>
                            {transfer.toBin && (
                                <div className="text-xs text-slate-500 mt-0.5">Bin: {transfer.toBin}</div>
                            )}
                            {transfer.toAddress && (
                                <div className="text-xs text-slate-500 mt-1 whitespace-pre-line">{transfer.toAddress}</div>
                            )}
                        </div>
                    </div>

                    {/* Line items table */}
                    <div className="p-6 flex-1">
                        <table className="w-full border border-slate-200 text-[12px] border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-3 py-2 text-left font-bold uppercase text-[10px] text-slate-500 tracking-wider border-r border-slate-200">Item</th>
                                    <th className="px-3 py-2 text-left font-bold uppercase text-[10px] text-slate-500 tracking-wider border-r border-slate-200 w-28">SKU</th>
                                    <th className="px-3 py-2 text-left font-bold uppercase text-[10px] text-slate-500 tracking-wider border-r border-slate-200 w-36">Lot / Serial #</th>
                                    <th className="px-3 py-2 text-right font-bold uppercase text-[10px] text-slate-500 tracking-wider w-24">Qty Transferred</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-100">
                                    <td className="px-3 py-3 font-semibold text-slate-800 border-r border-slate-100">{transfer.itemName}</td>
                                    <td className="px-3 py-3 text-slate-500 font-mono border-r border-slate-100">{transfer.itemSku ?? '—'}</td>
                                    <td className="px-3 py-3 text-slate-500 font-mono border-r border-slate-100">{transfer.lotNumber ?? '—'}</td>
                                    <td className="px-3 py-3 text-right font-bold text-slate-800">{transfer.quantity.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Summary row */}
                        <div className="mt-4 flex justify-end">
                            <div className="bg-slate-50 border border-slate-200 rounded px-5 py-3 text-right">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Total Units Transferred</div>
                                <div className="text-xl font-bold text-[#003366]">{transfer.quantity.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Signature block */}
                    <div className="border-t border-slate-200 p-6 grid grid-cols-3 gap-8">
                        {['Prepared By', 'Approved By', 'Received By'].map(label => (
                            <div key={label}>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-6">{label}</div>
                                <div className="border-b border-slate-400 mb-1" />
                                <div className="text-[10px] text-slate-400">Signature / Date</div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 px-8 py-3 text-center text-[10px] text-slate-400">
                        This is an internal warehouse transfer document. No monetary value.
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Transfer Tab ────────────────────────────────────────────────────────────────

interface TransferForm {
    itemId: string;
    fromWarehouseId: string;
    fromBinId: string;
    toWarehouseId: string;
    toBinId: string;
    quantity: string;
    lotNumber: string;
}

interface SplitState {
    mode: 'split' | 'move';
    available: number;
    requested: number;
    binName: string;
    qty1: string;        // split mode: to original bin
    toWarehouseId2: string;
    toBinId2: string;
    qty2: string;        // split mode: to second bin
    moveToWarehouseId: string;  // move mode: redirect all to this warehouse
    moveToBinId: string;        // move mode: redirect all to this bin
}

let _transferSeq = 1;
const nextTransferNumber = () => {
    const n = String(_transferSeq).padStart(5, '0');
    _transferSeq++;
    return `TO-${n}`;
};

const TransferTab: React.FC<{
    items: Item[];
    warehouses: Warehouse[];
    bins: Bin[];
    showAlert: (msg: string, title?: string) => void;
}> = ({ items, warehouses, bins, showAlert }) => {
    const invItems = items.filter(i => i.type === 'Inventory Part' || i.type === 'Inventory Assembly');

    const [form, setForm] = useState<TransferForm>({
        itemId: '', fromWarehouseId: '', fromBinId: '', toWarehouseId: '', toBinId: '', quantity: '', lotNumber: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [completedTransfer, setCompletedTransfer] = useState<CompletedTransfer | null>(null);
    const [splitState, setSplitState] = useState<SplitState | null>(null);

    const set = (k: keyof TransferForm, v: string) => setForm(f => ({ ...f, [k]: v }));

    const fromBins = bins.filter(b => b.warehouseId === form.fromWarehouseId && b.isActive);
    const toBins = bins.filter(b => b.warehouseId === form.toWarehouseId && b.isActive);
    const splitToBins2 = splitState
        ? bins.filter(b => b.warehouseId === splitState.toWarehouseId2 && b.isActive && b.id !== form.toBinId)
        : [];
    const moveBins = splitState
        ? bins.filter(b => b.warehouseId === splitState.moveToWarehouseId && b.isActive && b.id !== form.toBinId)
        : [];

    const canSubmit = form.itemId && form.toWarehouseId && Number(form.quantity) > 0;

    const buildPayload = (overrideToBinId?: string, overrideQty?: number) => {
        const payload: any = {
            itemId: form.itemId,
            fromWarehouseId: form.fromWarehouseId,
            toWarehouseId: form.toWarehouseId,
            quantity: overrideQty ?? Number(form.quantity),
        };
        const bin = overrideToBinId !== undefined ? overrideToBinId : form.toBinId;
        if (form.fromBinId) payload.fromBinId = form.fromBinId;
        if (bin) payload.toBinId = bin;
        if (form.lotNumber) payload.lotNumber = form.lotNumber;
        return payload;
    };

    const finishTransfer = (qty: number, toBinId?: string) => {
        const item = invItems.find(i => i.id === form.itemId);
        const fromWh = warehouses.find(w => w.id === form.fromWarehouseId);
        const toWh = warehouses.find(w => w.id === form.toWarehouseId);
        const fromBinObj = form.fromBinId ? bins.find(b => b.id === form.fromBinId) : undefined;
        const toBinObj = toBinId ? bins.find(b => b.id === toBinId) : undefined;
        const today = new Date().toLocaleDateString('en-CA');
        setCompletedTransfer({
            transferNumber: nextTransferNumber(),
            date: today,
            itemName: item?.name ?? form.itemId,
            itemSku: item?.sku,
            fromWarehouse: fromWh?.name ?? form.fromWarehouseId,
            fromBin: fromBinObj?.name,
            toWarehouse: toWh?.name ?? form.toWarehouseId,
            toBin: toBinObj?.name,
            quantity: qty,
            lotNumber: form.lotNumber || undefined,
            fromAddress: fromWh?.address,
            toAddress: toWh?.address,
        });
        setForm({ itemId: '', fromWarehouseId: '', fromBinId: '', toWarehouseId: '', toBinId: '', quantity: '', lotNumber: '' });
        setSplitState(null);
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;
        if (form.fromWarehouseId && form.fromWarehouseId === form.toWarehouseId && form.fromBinId === form.toBinId) {
            showAlert('Source and destination must be different.', 'Transfer Error');
            return;
        }
        setSubmitting(true);
        try {
            await transferWarehouseStock(buildPayload());
            finishTransfer(Number(form.quantity), form.toBinId);
        } catch (err: any) {
            if (err?.capacityExceeded) {
                setSplitState({
                    mode: 'split',
                    available: err.available,
                    requested: err.requested,
                    binName: err.binName,
                    qty1: String(err.available),
                    toWarehouseId2: form.toWarehouseId,
                    toBinId2: '',
                    qty2: String(err.requested - err.available),
                    moveToWarehouseId: form.toWarehouseId,
                    moveToBinId: '',
                });
            } else {
                showAlert(err.message ?? 'Transfer failed', 'Transfer Error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleSplitConfirm = async () => {
        if (!splitState) return;
        const qty1 = Number(splitState.qty1);
        const qty2 = Number(splitState.qty2);
        if (qty1 <= 0 || qty2 <= 0 || qty1 + qty2 !== splitState.requested) {
            showAlert(`Quantities must sum to ${splitState.requested} and both be positive.`, 'Split Error');
            return;
        }
        if (!splitState.toWarehouseId2) {
            showAlert('Please select a warehouse for the second destination.', 'Split Error');
            return;
        }
        setSubmitting(true);
        try {
            // First transfer: to original bin
            await transferWarehouseStock(buildPayload(form.toBinId, qty1));
            // Second transfer: to new bin (may be different warehouse)
            const payload2: any = {
                itemId: form.itemId,
                fromWarehouseId: form.fromWarehouseId,
                toWarehouseId: splitState.toWarehouseId2,
                quantity: qty2,
            };
            if (form.fromBinId) payload2.fromBinId = form.fromBinId;
            if (splitState.toBinId2) payload2.toBinId = splitState.toBinId2;
            if (form.lotNumber) payload2.lotNumber = form.lotNumber;
            await transferWarehouseStock(payload2);
            finishTransfer(splitState.requested, form.toBinId);
        } catch (err: any) {
            showAlert(err.message ?? 'Split transfer failed', 'Transfer Error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMoveAll = async () => {
        if (!splitState) return;
        if (!splitState.moveToWarehouseId) {
            showAlert('Please select a warehouse for the destination.', 'Move Error');
            return;
        }
        setSubmitting(true);
        try {
            const payload: any = {
                itemId: form.itemId,
                fromWarehouseId: form.fromWarehouseId,
                toWarehouseId: splitState.moveToWarehouseId,
                quantity: splitState.requested,
            };
            if (form.fromBinId) payload.fromBinId = form.fromBinId;
            if (splitState.moveToBinId) payload.toBinId = splitState.moveToBinId;
            if (form.lotNumber) payload.lotNumber = form.lotNumber;
            await transferWarehouseStock(payload);
            finishTransfer(splitState.requested, splitState.moveToBinId || undefined);
        } catch (err: any) {
            showAlert(err.message ?? 'Move failed', 'Transfer Error');
        } finally {
            setSubmitting(false);
        }
    };

    if (completedTransfer) {
        return (
            <TransferOrderDocument
                transfer={completedTransfer}
                onClose={() => setCompletedTransfer(null)}
            />
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* ── Bin Capacity Modal ─────────────────────────────────── */}
            {splitState && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white border border-gray-300 rounded shadow-lg w-[95vw] h-[95vh] overflow-y-auto p-6 space-y-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Bin Capacity Exceeded</h3>
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                            <strong>{splitState.binName}</strong> can only accept <strong>{splitState.available}</strong> more unit(s).
                            Choose how to handle your <strong>{splitState.requested}</strong> units.
                        </p>

                        {/* Mode tabs */}
                        <div className="flex border-b border-gray-200">
                            <button
                                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${splitState.mode === 'move' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setSplitState(s => s ? { ...s, mode: 'move' } : s)}
                            >
                                Move All to Another Bin
                            </button>
                            <button
                                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${splitState.mode === 'split' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setSplitState(s => s ? { ...s, mode: 'split' } : s)}
                            >
                                Split Between Two Bins
                            </button>
                        </div>

                        {/* ── Move All mode ── */}
                        {splitState.mode === 'move' && (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500">Select a different destination bin with enough capacity for all {splitState.requested} units.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelCls}>Warehouse *</label>
                                        <select
                                            className={inputCls}
                                            value={splitState.moveToWarehouseId}
                                            onChange={e => setSplitState(s => s ? { ...s, moveToWarehouseId: e.target.value, moveToBinId: '' } : s)}
                                        >
                                            <option value="">-- Select --</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Bin (optional)</label>
                                        <select
                                            className={inputCls}
                                            value={splitState.moveToBinId}
                                            disabled={!splitState.moveToWarehouseId}
                                            onChange={e => setSplitState(s => s ? { ...s, moveToBinId: e.target.value } : s)}
                                        >
                                            <option value="">-- Any / Unassigned --</option>
                                            {moveBins.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name}{b.capacity ? ` (cap: ${b.capacity})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Split mode ── */}
                        {splitState.mode === 'split' && (
                            <div className="space-y-3">
                                {/* Destination 1 — original bin */}
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Destination 1 — {splitState.binName}</h4>
                                    <div>
                                        <label className={labelCls}>Quantity (max {splitState.available})</label>
                                        <input
                                            className={inputCls}
                                            type="number"
                                            min="1"
                                            max={splitState.available}
                                            value={splitState.qty1}
                                            onChange={e => {
                                                const v = e.target.value;
                                                const n = Number(v);
                                                setSplitState(s => s ? { ...s, qty1: v, qty2: String(s.requested - n) } : s);
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Destination 2 */}
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Destination 2</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls}>Warehouse *</label>
                                            <select
                                                className={inputCls}
                                                value={splitState.toWarehouseId2}
                                                onChange={e => setSplitState(s => s ? { ...s, toWarehouseId2: e.target.value, toBinId2: '' } : s)}
                                            >
                                                <option value="">-- Select --</option>
                                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Bin (optional)</label>
                                            <select
                                                className={inputCls}
                                                value={splitState.toBinId2}
                                                disabled={!splitState.toWarehouseId2}
                                                onChange={e => setSplitState(s => s ? { ...s, toBinId2: e.target.value } : s)}
                                            >
                                                <option value="">-- Any / Unassigned --</option>
                                                {splitToBins2.map(b => (
                                                    <option key={b.id} value={b.id}>
                                                        {b.name}{b.capacity ? ` (cap: ${b.capacity})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <label className={labelCls}>Quantity</label>
                                        <input
                                            className={inputCls}
                                            type="number"
                                            min="1"
                                            value={splitState.qty2}
                                            onChange={e => {
                                                const v = e.target.value;
                                                const n = Number(v);
                                                setSplitState(s => s ? { ...s, qty2: v, qty1: String(s.requested - n) } : s);
                                            }}
                                        />
                                    </div>
                                </div>

                                {Number(splitState.qty1) + Number(splitState.qty2) !== splitState.requested && (
                                    <p className="text-xs text-red-600">
                                        Quantities must sum to {splitState.requested} (currently {Number(splitState.qty1) + Number(splitState.qty2)})
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                className="px-4 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                onClick={() => setSplitState(null)}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            {splitState.mode === 'move' ? (
                                <button
                                    className={btnPrimary + ' px-5 py-2'}
                                    onClick={handleMoveAll}
                                    disabled={submitting || !splitState.moveToWarehouseId}
                                >
                                    {submitting ? 'Moving…' : 'Move All'}
                                </button>
                            ) : (
                                <button
                                    className={btnPrimary + ' px-5 py-2'}
                                    onClick={handleSplitConfirm}
                                    disabled={submitting || Number(splitState.qty1) + Number(splitState.qty2) !== splitState.requested || Number(splitState.qty1) <= 0 || Number(splitState.qty2) <= 0 || !splitState.toWarehouseId2}
                                >
                                    {submitting ? 'Transferring…' : 'Confirm Split'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Transfer Inventory Between Locations</h2>

                    <div className="bg-white border border-gray-300 rounded shadow-sm p-5 space-y-4">
                        {/* Item */}
                        <div>
                            <label className={labelCls}>Item *</label>
                            <select className={inputCls} value={form.itemId} onChange={e => set('itemId', e.target.value)}>
                                <option value="">-- Select Item --</option>
                                {invItems.map(i => (
                                    <option key={i.id} value={i.id}>
                                        {i.name}{i.sku ? ` (${i.sku})` : ''}{i.onHand != null ? ` — ${i.onHand} on hand` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* FROM */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase border-b pb-1">From</h3>
                                <div>
                                    <label className={labelCls}>Warehouse (optional)</label>
                                    <select className={inputCls} value={form.fromWarehouseId}
                                        onChange={e => { set('fromWarehouseId', e.target.value); set('fromBinId', ''); }}>
                                        <option value="">-- No Warehouse / Unassigned --</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Bin (optional)</label>
                                    <select className={inputCls} value={form.fromBinId} onChange={e => set('fromBinId', e.target.value)}
                                        disabled={!form.fromWarehouseId}>
                                        <option value="">-- Any / Unassigned --</option>
                                        {fromBins.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* TO */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase border-b pb-1">To</h3>
                                <div>
                                    <label className={labelCls}>Warehouse *</label>
                                    <select className={inputCls} value={form.toWarehouseId}
                                        onChange={e => { set('toWarehouseId', e.target.value); set('toBinId', ''); }}>
                                        <option value="">-- Select --</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Bin (optional)</label>
                                    <select className={inputCls} value={form.toBinId} onChange={e => set('toBinId', e.target.value)}
                                        disabled={!form.toWarehouseId}>
                                        <option value="">-- Any / Unassigned --</option>
                                        {toBins.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Quantity *</label>
                                <input
                                    className={inputCls}
                                    type="number"
                                    min="0.001"
                                    step="any"
                                    value={form.quantity}
                                    onChange={e => set('quantity', e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Lot / Serial # (optional)</label>
                                <input
                                    className={inputCls}
                                    value={form.lotNumber}
                                    onChange={e => set('lotNumber', e.target.value)}
                                    placeholder="Transfer specific lot"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                className={btnPrimary + ' px-6 py-2'}
                                onClick={handleSubmit}
                                disabled={!canSubmit || submitting}
                            >
                                {submitting ? 'Transferring…' : 'Transfer Stock'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Transfer History Tab ────────────────────────────────────────────────────────

interface TransferLogEntry {
    id: string;
    transferNumber: string;
    date: string;
    itemName: string;
    sku?: string;
    fromWarehouseName: string;
    fromBinName?: string;
    toWarehouseName: string;
    toBinName?: string;
    quantity: number;
    lotNumber?: string;
    unitCost?: number;
    totalValue?: number;
}

const TransferHistoryTab: React.FC<{
    warehouses: Warehouse[];
}> = ({ warehouses }) => {
    const [logs, setLogs] = useState<TransferLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warehouseFilter, setWarehouseFilter] = useState('ALL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: any = {};
            if (warehouseFilter !== 'ALL') params.warehouseId = warehouseFilter;
            if (fromDate) params.fromDate = fromDate;
            if (toDate)   params.toDate   = toDate;
            const data = await fetchTransferHistory(params);
            setLogs(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.message ?? 'Failed to load transfer history');
        } finally {
            setLoading(false);
        }
    }, [warehouseFilter, fromDate, toDate]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center flex-wrap gap-3 px-3 py-2 bg-[#f5f5f5] border-b border-gray-300">
                <button className={btnSecondary} onClick={load}>↻ Refresh</button>

                <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-600 font-semibold">Warehouse:</label>
                    <select className="border border-gray-300 rounded px-2 py-1 text-xs outline-none"
                        value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
                        <option value="ALL">All Warehouses</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-600 font-semibold">From:</label>
                    <input type="date" className="border border-gray-300 rounded px-2 py-1 text-xs outline-none"
                        value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </div>
                <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-600 font-semibold">To:</label>
                    <input type="date" className="border border-gray-300 rounded px-2 py-1 text-xs outline-none"
                        value={toDate} onChange={e => setToDate(e.target.value)} />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center flex-1 text-sm text-gray-400">Loading transfer history…</div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-2">
                    <div className="text-red-600 text-sm font-semibold">{error}</div>
                    <button className={btnSecondary} onClick={load}>Retry</button>
                </div>
            ) : (
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-[12px] border-collapse">
                        <thead className="sticky top-0 bg-[#e8e8e8] z-10">
                            <tr className="h-7 border-b-2 border-gray-400">
                                <th className="px-3 text-left font-bold uppercase border-r border-gray-300 w-28">Transfer #</th>
                                <th className="px-3 text-left font-bold uppercase border-r border-gray-300 w-24">Date</th>
                                <th className="px-3 text-left font-bold uppercase border-r border-gray-300">Item</th>
                                <th className="px-3 text-left font-bold uppercase border-r border-gray-300 w-24">SKU</th>
                                <th className="px-3 text-left font-bold uppercase border-r border-gray-300">From</th>
                                <th className="px-3 text-left font-bold uppercase border-r border-gray-300">To</th>
                                <th className="px-3 text-right font-bold uppercase border-r border-gray-300 w-20">Qty</th>
                                <th className="px-3 text-left font-bold uppercase border-r border-gray-300 w-28">Lot #</th>
                                <th className="px-3 text-right font-bold uppercase border-r border-gray-300 w-24">Unit Cost</th>
                                <th className="px-3 text-right font-bold uppercase w-28">Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 && (
                                <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-400 text-xs italic">
                                    No transfers recorded yet.
                                </td></tr>
                            )}
                            {logs.map((log, i) => (
                                <tr key={log.id || i}
                                    className={`h-7 border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                    <td className="px-3 border-r border-gray-200 font-mono font-bold text-[#003366]">{log.transferNumber}</td>
                                    <td className="px-3 border-r border-gray-200 text-gray-500">
                                        {log.date ? new Date(log.date).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-3 border-r border-gray-200 font-semibold truncate max-w-[180px]">{log.itemName}</td>
                                    <td className="px-3 border-r border-gray-200 font-mono text-gray-400">{log.sku || '—'}</td>
                                    <td className="px-3 border-r border-gray-200 text-gray-700">
                                        {log.fromWarehouseName}{log.fromBinName ? <span className="text-gray-400"> › {log.fromBinName}</span> : ''}
                                    </td>
                                    <td className="px-3 border-r border-gray-200 text-gray-700">
                                        {log.toWarehouseName}{log.toBinName ? <span className="text-gray-400"> › {log.toBinName}</span> : ''}
                                    </td>
                                    <td className="px-3 border-r border-gray-200 text-right font-mono font-bold">
                                        {(log.quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-3 border-r border-gray-200 font-mono text-gray-500">{log.lotNumber || '—'}</td>
                                    <td className="px-3 border-r border-gray-200 text-right font-mono text-gray-600">
                                        {log.unitCost != null ? `$${log.unitCost.toFixed(2)}` : '—'}
                                    </td>
                                    <td className="px-3 text-right font-mono font-bold text-gray-800">
                                        {log.totalValue != null ? `$${log.totalValue.toFixed(2)}` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {logs.length > 0 && (
                            <tfoot className="sticky bottom-0 bg-[#e8e8e8] border-t-2 border-gray-400">
                                <tr className="h-7">
                                    <td colSpan={6} className="px-3 font-black text-[11px] uppercase text-gray-700">
                                        {logs.length} transfer{logs.length !== 1 ? 's' : ''}
                                    </td>
                                    <td className="px-3 text-right font-black font-mono text-gray-800">
                                        {logs.reduce((s, l) => s + (l.quantity || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                    <td></td>
                                    <td></td>
                                    <td className="px-3 text-right font-black font-mono text-gray-800">
                                        ${logs.reduce((s, l) => s + (l.totalValue || 0), 0).toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}
        </div>
    );
};

// ─── On Hand Tab ─────────────────────────────────────────────────────────────────
// QB Enterprise parity: shows per-warehouse and per-bin quantities for every item,
// including reorder-point alerts when Item.warehouseReorderPoints are configured.

interface SnapshotEntry {
    itemId: string;
    itemName: string;
    sku?: string;
    totalOnHand: number;
    byWarehouse: Record<string, {
        qty: number;
        warehouseName: string;
        warehouseCode?: string;
        bins: Record<string, { qty: number; binName: string; binCode?: string }>;
    }>;
}

const OnHandTab: React.FC<{
    items: Item[];
    warehouses: Warehouse[];
    bins: Bin[];
}> = ({ items, warehouses, bins }) => {
    const [snapshot, setSnapshot] = useState<SnapshotEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [showBins, setShowBins] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchWarehouseInventorySnapshot();
            setSnapshot(result.snapshot || []);
        } catch (err: any) {
            setError(err.message ?? 'Failed to load inventory snapshot');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const toggleItem = (id: string) =>
        setExpandedItems(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const visibleItems = snapshot.filter(entry => {
        if (searchTerm && !entry.itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !(entry.sku || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (warehouseFilter !== 'ALL') {
            const qty = entry.byWarehouse[warehouseFilter]?.qty ?? 0;
            if (qty <= 0) return false;
        }
        return true;
    });

    const itemReorderMap: Record<string, { warehouseId: string; reorderPoint: number; reorderQty: number }[]> =
        Object.fromEntries(
            items.map(i => [i.id, (i as any).warehouseReorderPoints || []])
        );

    const getReorderPoint = (itemId: string, warehouseId: string) => {
        const rp = itemReorderMap[itemId]?.find(r => r.warehouseId === warehouseId);
        if (rp) return rp.reorderPoint;
        return items.find(i => i.id === itemId)?.reorderPoint ?? 0;
    };

    const statusBg = (qty: number, rp: number) => {
        if (qty <= 0) return 'bg-red-50 text-red-700';
        if (rp > 0 && qty <= rp) return 'bg-amber-50 text-amber-700';
        return '';
    };

    if (loading) return <div className="flex items-center justify-center h-full text-sm text-gray-400">Loading inventory snapshot…</div>;
    if (error) return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="text-red-600 text-sm font-semibold">{error}</div>
            <button className={btnSecondary} onClick={load}>Retry</button>
        </div>
    );

    const activeWarehouses = warehouseFilter === 'ALL' ? warehouses : warehouses.filter(w => w.id === warehouseFilter);

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap px-3 py-2 bg-[#f5f5f5] border-b border-gray-300">
                <button className={btnSecondary} onClick={load}>↻ Refresh</button>

                <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-600 font-semibold">Warehouse:</label>
                    <select className="border border-gray-300 rounded px-2 py-1 text-xs outline-none"
                        value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
                        <option value="ALL">All Warehouses</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-1.5">
                    <input
                        className="border border-gray-300 rounded px-2 py-1 text-xs outline-none w-44"
                        placeholder="Search items…"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer select-none ml-auto">
                    <input type="checkbox" className="w-3.5 h-3.5" checked={showBins}
                        onChange={e => setShowBins(e.target.checked)} />
                    Show Bin Detail
                </label>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-[12px] border-collapse">
                    <thead className="sticky top-0 bg-[#e8e8e8] z-10">
                        <tr className="h-7 border-b-2 border-gray-400">
                            <th className="px-2 w-6 border-r border-gray-300"></th>
                            <th className="px-3 text-left font-bold uppercase border-r border-gray-300">Item</th>
                            <th className="px-3 text-left font-bold uppercase border-r border-gray-300 w-28">SKU</th>
                            <th className="px-3 text-right font-bold uppercase border-r border-gray-300 w-24">Total On Hand</th>
                            {(warehouseFilter === 'ALL' ? warehouses : [warehouses.find(w => w.id === warehouseFilter)!]).filter(Boolean).map(w => (
                                <th key={w.id} className="px-3 text-right font-bold uppercase border-r border-gray-300 w-24">{w.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visibleItems.length === 0 && (
                            <tr><td colSpan={99} className="px-3 py-6 text-center text-gray-400 text-xs italic">
                                {snapshot.length === 0 ? 'No inventory on hand.' : 'No items match the current filter.'}
                            </td></tr>
                        )}
                        {visibleItems.map(entry => {
                            const isExpanded = expandedItems.has(entry.itemId);
                            const whsToShow = warehouseFilter === 'ALL'
                                ? warehouses
                                : warehouses.filter(w => w.id === warehouseFilter);

                            const hasBinDetail = showBins && Object.values(entry.byWarehouse).some(wh =>
                                Object.values(wh.bins).some(b => b.qty > 0 && b.binName !== 'Unassigned')
                            );

                            return (
                                <React.Fragment key={entry.itemId}>
                                    {/* Item row */}
                                    <tr
                                        className={`h-7 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors
                                            ${hasBinDetail ? '' : ''}`}
                                        onClick={() => hasBinDetail && toggleItem(entry.itemId)}
                                    >
                                        <td className="px-2 text-center border-r border-gray-200 text-gray-400">
                                            {hasBinDetail ? (isExpanded ? '▾' : '▸') : ''}
                                        </td>
                                        <td className="px-3 border-r border-gray-200 font-semibold text-gray-800 truncate max-w-xs">
                                            {entry.itemName}
                                        </td>
                                        <td className="px-3 border-r border-gray-200 font-mono text-gray-500">{entry.sku || '—'}</td>
                                        <td className="px-3 border-r border-gray-200 text-right font-mono font-bold text-gray-800">
                                            {(entry.totalOnHand || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </td>
                                        {whsToShow.map(w => {
                                            const qty = entry.byWarehouse[w.id]?.qty ?? 0;
                                            const rp  = getReorderPoint(entry.itemId, w.id);
                                            return (
                                                <td key={w.id} className={`px-3 border-r border-gray-200 text-right font-mono ${statusBg(qty, rp)}`}>
                                                    {qty > 0 ? qty.toLocaleString(undefined, { maximumFractionDigits: 2 }) : <span className="text-gray-300">—</span>}
                                                    {rp > 0 && qty > 0 && qty <= rp && (
                                                        <span className="ml-1 text-[9px] font-bold text-amber-600" title="Below reorder point">▲</span>
                                                    )}
                                                    {qty <= 0 && rp > 0 && (
                                                        <span className="ml-1 text-[9px] font-bold text-red-600" title="Out of stock">!</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>

                                    {/* Bin detail rows (expandable) */}
                                    {hasBinDetail && isExpanded && whsToShow.map(w => {
                                        const whData = entry.byWarehouse[w.id];
                                        if (!whData) return null;
                                        const activeBins = Object.entries(whData.bins).filter(([, b]) => b.qty > 0);
                                        if (activeBins.length === 0) return null;
                                        return activeBins.map(([binId, binData]) => (
                                            <tr key={`${entry.itemId}-${w.id}-${binId}`}
                                                className="h-6 border-b border-gray-50 bg-blue-50/30">
                                                <td className="border-r border-gray-200"></td>
                                                <td className="px-6 border-r border-gray-200 text-gray-500 italic text-[11px]" colSpan={2}>
                                                    {w.name} › {binData.binName}
                                                </td>
                                                <td className="px-3 border-r border-gray-200 text-right font-mono text-gray-500 text-[11px]">
                                                    {binData.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </td>
                                                {whsToShow.slice(1).map(ww => (
                                                    <td key={ww.id} className="px-3 border-r border-gray-200"></td>
                                                ))}
                                            </tr>
                                        ));
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                    {visibleItems.length > 0 && (
                        <tfoot className="sticky bottom-0 bg-[#e8e8e8] border-t-2 border-gray-400">
                            <tr className="h-7">
                                <td></td>
                                <td colSpan={2} className="px-3 font-black text-[11px] uppercase text-gray-700">
                                    {visibleItems.length} item{visibleItems.length !== 1 ? 's' : ''}
                                </td>
                                <td className="px-3 text-right font-black font-mono text-gray-800">
                                    {visibleItems.reduce((s, e) => s + (e.totalOnHand || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </td>
                                {(warehouseFilter === 'ALL' ? warehouses : [warehouses.find(w => w.id === warehouseFilter)!]).filter(Boolean).map(w => (
                                    <td key={w.id} className="px-3 text-right font-black font-mono text-gray-800">
                                        {visibleItems.reduce((s, e) => s + (e.byWarehouse[w.id]?.qty ?? 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-3 py-1.5 bg-white border-t border-gray-200 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="font-bold text-amber-600">▲</span> Below reorder point</span>
                <span className="flex items-center gap-1"><span className="font-bold text-red-600">!</span> Out of stock</span>
                <span className="ml-auto italic">Quantities from lot records · click ▸ to expand bin detail</span>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────────

const WarehouseCenter: React.FC<WarehouseCenterProps> = ({ items, showAlert: propAlert }) => {
    const [tab, setTab] = useState<Tab>('WAREHOUSES');
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [bins, setBins] = useState<Bin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const alert = propAlert ?? ((msg: string, title?: string) => window.alert(title ? `${title}\n${msg}` : msg));

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [whs, bns] = await Promise.all([fetchWarehouses(), fetchBins()]);
            setWarehouses(whs);
            setBins(bns);
        } catch (err: any) {
            setError(err.message ?? 'Failed to load warehouse data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    if (loading) return (
        <div className="flex items-center justify-center h-full text-sm text-gray-400">Loading warehouses…</div>
    );
    if (error) return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="text-red-600 text-sm font-semibold">{error}</div>
            <button className={btnSecondary} onClick={refresh}>Retry</button>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#f0f0f0]">
            {/* Header */}
            <div className="bg-[#003366] text-white px-4 py-2.5 flex items-center gap-3">
                <span className="text-base font-bold">Warehouse & Bin Manager</span>
                <span className="text-white/50 text-xs">|</span>
                <span className="text-white/70 text-xs">{warehouses.length} warehouse{warehouses.length !== 1 ? 's' : ''} · {bins.length} bin{bins.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-300 flex">
                <TabBtn active={tab === 'WAREHOUSES'} label="Warehouses" onClick={() => setTab('WAREHOUSES')} />
                <TabBtn active={tab === 'BINS'} label="Bins" onClick={() => setTab('BINS')} />
                <TabBtn active={tab === 'ON_HAND'} label="On Hand by Site" onClick={() => setTab('ON_HAND')} />
                <TabBtn active={tab === 'TRANSFER'} label="Transfer Stock" onClick={() => setTab('TRANSFER')} />
                <TabBtn active={tab === 'HISTORY'} label="Transfer History" onClick={() => setTab('HISTORY')} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {tab === 'WAREHOUSES' && (
                    <WarehousesTab warehouses={warehouses} onRefresh={refresh} showAlert={alert} />
                )}
                {tab === 'BINS' && (
                    <BinsTab warehouses={warehouses} bins={bins} onRefresh={refresh} showAlert={alert} />
                )}
                {tab === 'ON_HAND' && (
                    <OnHandTab items={items} warehouses={warehouses} bins={bins} />
                )}
                {tab === 'TRANSFER' && (
                    <TransferTab items={items} warehouses={warehouses} bins={bins} showAlert={alert} />
                )}
                {tab === 'HISTORY' && (
                    <TransferHistoryTab warehouses={warehouses} />
                )}
            </div>
        </div>
    );
};

export default WarehouseCenter;
