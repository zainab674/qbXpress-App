
import React, { useState } from 'react';
import { UOMSet, UOMUnit } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

/** All units in a set (base unit first, then related units sorted by factor) */
function allUnits(set: UOMSet): (UOMUnit & { isBase: boolean })[] {
    const base = { name: set.baseUnit.name, abbreviation: set.baseUnit.abbreviation || '', conversionFactor: 1, isBase: true };
    const related = [...set.relatedUnits]
        .sort((a, b) => a.conversionFactor - b.conversionFactor)
        .map(u => ({ ...u, isBase: false }));
    return [base, ...related];
}

// ─── empty form state ────────────────────────────────────────────────────────

const emptySet = (): Omit<UOMSet, 'id'> => ({
    name: '',
    baseUnit: { name: '', abbreviation: '' },
    relatedUnits: [],
    defaultPurchaseUnit: '',
    defaultSalesUnit: '',
    isActive: true,
});

// ─── UOMSetForm (modal) ──────────────────────────────────────────────────────

interface FormProps {
    initial: Omit<UOMSet, 'id'> & { id?: string };
    onSave: (s: Omit<UOMSet, 'id'> & { id?: string }) => void;
    onCancel: () => void;
}

const UOMSetForm: React.FC<FormProps> = ({ initial, onSave, onCancel }) => {
    const [form, setForm] = useState({ ...initial });

    // related-unit row being edited inline
    const [newRow, setNewRow] = useState<{ name: string; abbreviation: string; conversionFactor: string }>({
        name: '', abbreviation: '', conversionFactor: '',
    });
    const [rowError, setRowError] = useState('');

    const addRow = () => {
        const factor = parseFloat(newRow.conversionFactor);
        if (!newRow.name.trim()) { setRowError('Unit name is required'); return; }
        if (!newRow.conversionFactor || isNaN(factor) || factor <= 1) {
            setRowError('Conversion factor must be > 1 (relative to base unit)');
            return;
        }
        if (form.relatedUnits.some(u => u.name.toLowerCase() === newRow.name.trim().toLowerCase())) {
            setRowError('Unit name already exists in this set');
            return;
        }
        setForm(f => ({
            ...f,
            relatedUnits: [...f.relatedUnits, { name: newRow.name.trim(), abbreviation: newRow.abbreviation.trim(), conversionFactor: factor }],
        }));
        setNewRow({ name: '', abbreviation: '', conversionFactor: '' });
        setRowError('');
    };

    const removeRow = (name: string) => {
        setForm(f => ({
            ...f,
            relatedUnits: f.relatedUnits.filter(u => u.name !== name),
            defaultPurchaseUnit: f.defaultPurchaseUnit === name ? '' : f.defaultPurchaseUnit,
            defaultSalesUnit: f.defaultSalesUnit === name ? '' : f.defaultSalesUnit,
        }));
    };

    const allUnitNames = [form.baseUnit.name, ...form.relatedUnits.map(u => u.name)].filter(Boolean);

    const validate = () => {
        if (!form.name.trim()) { alert('Set name is required'); return false; }
        if (!form.baseUnit.name.trim()) { alert('Base unit name is required'); return false; }
        return true;
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000]">
            <div className="bg-[#f0f0f0] border-4 border-[#003366] w-[95vw] h-[95vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="bg-[#003366] px-4 py-2 flex justify-between items-center">
                    <h3 className="text-white font-bold text-xs uppercase tracking-widest">
                        {form.id ? 'Edit Unit of Measure Set' : 'New Unit of Measure Set'}
                    </h3>
                    <button onClick={onCancel} className="text-white hover:text-red-300 text-sm font-bold">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Set name */}
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Set Name *</label>
                        <input
                            className="w-full border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 mt-1"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Count by Box and Each"
                        />
                    </div>

                    {/* Base unit */}
                    <div>
                        <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Base Unit (smallest unit in the set) *</label>
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase">Name</label>
                                <input
                                    className="w-full border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600"
                                    value={form.baseUnit.name}
                                    onChange={e => setForm(f => ({
                                        ...f,
                                        baseUnit: { ...f.baseUnit, name: e.target.value },
                                        defaultPurchaseUnit: f.defaultPurchaseUnit === form.baseUnit.name ? e.target.value : f.defaultPurchaseUnit,
                                        defaultSalesUnit: f.defaultSalesUnit === form.baseUnit.name ? e.target.value : f.defaultSalesUnit,
                                    }))}
                                    placeholder="e.g. Each"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase">Abbreviation</label>
                                <input
                                    className="w-full border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600"
                                    value={form.baseUnit.abbreviation || ''}
                                    onChange={e => setForm(f => ({ ...f, baseUnit: { ...f.baseUnit, abbreviation: e.target.value } }))}
                                    placeholder="e.g. Ea"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Conversion factor for the base unit is always 1. All other units are defined relative to it.</p>
                    </div>

                    {/* Related units table */}
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Related Units</label>
                        <table className="w-full text-left text-[11px] mt-1 border border-gray-300">
                            <thead className="bg-[#003366] text-white">
                                <tr>
                                    <th className="px-3 py-1.5 font-bold">Unit Name</th>
                                    <th className="px-3 py-1.5 font-bold">Abbrev.</th>
                                    <th className="px-3 py-1.5 font-bold">= X {form.baseUnit.name || 'Base'}</th>
                                    <th className="px-3 py-1.5 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Base row (read-only) */}
                                <tr className="bg-blue-50">
                                    <td className="px-3 py-1 font-bold text-blue-800">{form.baseUnit.name || '(base unit)'}</td>
                                    <td className="px-3 py-1 text-blue-600">{form.baseUnit.abbreviation || ''}</td>
                                    <td className="px-3 py-1 text-blue-600 font-mono">1</td>
                                    <td></td>
                                </tr>
                                {/* Existing related rows */}
                                {[...form.relatedUnits].sort((a, b) => a.conversionFactor - b.conversionFactor).map(u => (
                                    <tr key={u.name} className="hover:bg-gray-50 border-t border-gray-200">
                                        <td className="px-3 py-1">{u.name}</td>
                                        <td className="px-3 py-1">{u.abbreviation}</td>
                                        <td className="px-3 py-1 font-mono">{u.conversionFactor}</td>
                                        <td className="px-3 py-1 text-center">
                                            <button onClick={() => removeRow(u.name)} className="text-red-400 hover:text-red-600 font-bold text-xs">✕</button>
                                        </td>
                                    </tr>
                                ))}
                                {/* Add-new row */}
                                <tr className="border-t-2 border-blue-200 bg-gray-50">
                                    <td className="px-2 py-1">
                                        <input
                                            className="w-full border border-gray-300 p-1 text-[11px] outline-none focus:border-blue-500"
                                            value={newRow.name}
                                            onChange={e => setNewRow(r => ({ ...r, name: e.target.value }))}
                                            placeholder="Unit name..."
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            className="w-full border border-gray-300 p-1 text-[11px] outline-none focus:border-blue-500"
                                            value={newRow.abbreviation}
                                            onChange={e => setNewRow(r => ({ ...r, abbreviation: e.target.value }))}
                                            placeholder="Abbrev."
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            type="number"
                                            min="1.000001"
                                            step="any"
                                            className="w-full border border-gray-300 p-1 text-[11px] outline-none focus:border-blue-500"
                                            value={newRow.conversionFactor}
                                            onChange={e => setNewRow(r => ({ ...r, conversionFactor: e.target.value }))}
                                            placeholder="e.g. 12"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <button
                                            onClick={addRow}
                                            className="w-full bg-[#003366] hover:bg-blue-800 text-white text-[10px] font-bold px-2 py-1 rounded"
                                        >+ Add</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        {rowError && <p className="text-[10px] text-red-600 mt-1">{rowError}</p>}
                    </div>

                    {/* Default units */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Default Purchase Unit</label>
                            <select
                                className="w-full border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 bg-white mt-1"
                                value={form.defaultPurchaseUnit || ''}
                                onChange={e => setForm(f => ({ ...f, defaultPurchaseUnit: e.target.value }))}
                            >
                                <option value="">— Same as base —</option>
                                {allUnitNames.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Default Sales Unit</label>
                            <select
                                className="w-full border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 bg-white mt-1"
                                value={form.defaultSalesUnit || ''}
                                onChange={e => setForm(f => ({ ...f, defaultSalesUnit: e.target.value }))}
                            >
                                <option value="">— Same as base —</option>
                                {allUnitNames.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Active */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="uom-active"
                            checked={form.isActive}
                            onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                            className="w-4 h-4 accent-[#003366]"
                        />
                        <label htmlFor="uom-active" className="text-xs font-bold text-gray-600">Active</label>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onCancel} className="px-6 py-1.5 border border-gray-400 text-xs font-bold hover:bg-gray-100">Cancel</button>
                        <button
                            onClick={() => { if (validate()) onSave(form); }}
                            className="px-8 py-1.5 bg-[#003366] text-white text-xs font-bold hover:bg-blue-900"
                        >OK</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main UOMList component ──────────────────────────────────────────────────

interface UOMListProps {
    uomSets: UOMSet[];
    onSaveUOMSet: (set: UOMSet) => Promise<void> | void;
    onDeleteUOMSet: (id: string) => Promise<void> | void;
    // Legacy simple-UOM props (kept for compatibility with old menu items)
    uoms?: any[];
    onUpdateUOMs?: (uoms: any[]) => Promise<void> | void;
}

const UOMList: React.FC<UOMListProps> = ({ uomSets = [], onSaveUOMSet, onDeleteUOMSet }) => {
    const [selected, setSelected] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editData, setEditData] = useState<(Omit<UOMSet, 'id'> & { id?: string }) | null>(null);
    const [showInactive, setShowInactive] = useState(false);

    const visible = showInactive ? uomSets : uomSets.filter(s => s.isActive);
    const selectedSet = uomSets.find(s => s.id === selected);

    const openNew = () => {
        setEditData(emptySet());
        setShowForm(true);
    };

    const openEdit = (set: UOMSet) => {
        setEditData({ ...set, relatedUnits: set.relatedUnits.map(u => ({ ...u })) });
        setShowForm(true);
    };

    const handleSave = async (form: Omit<UOMSet, 'id'> & { id?: string }) => {
        const toSave: UOMSet = {
            ...form,
            id: form.id || crypto.randomUUID(),
        };
        await onSaveUOMSet(toSave);
        setShowForm(false);
        setEditData(null);
        setSelected(toSave.id);
    };

    const handleDelete = async () => {
        if (!selected) return;
        if (!window.confirm('Delete this UOM Set? Items using it will keep their current UOM assignment.')) return;
        await onDeleteUOMSet(selected);
        setSelected(null);
    };

    const handleToggleActive = async () => {
        if (!selectedSet) return;
        await onSaveUOMSet({ ...selectedSet, isActive: !selectedSet.isActive });
    };

    return (
        <div className="flex flex-col h-full bg-white select-none">
            {/* Toolbar */}
            <div className="bg-gray-100 border-b border-gray-300 px-2 py-1 flex gap-1 items-center">
                <button
                    onClick={openNew}
                    className="px-4 py-1 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-300 transition-all text-[11px] font-bold text-gray-700"
                >New</button>
                <button
                    disabled={!selected}
                    onClick={() => selectedSet && openEdit(selectedSet)}
                    className="px-4 py-1 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-300 transition-all text-[11px] font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >Edit</button>
                <button
                    disabled={!selected}
                    onClick={handleToggleActive}
                    className="px-4 py-1 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-300 transition-all text-[11px] font-bold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >{selectedSet?.isActive ? 'Make Inactive' : 'Make Active'}</button>
                <button
                    disabled={!selected}
                    onClick={handleDelete}
                    className="px-4 py-1 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-300 transition-all text-[11px] font-bold text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >Delete</button>
                <div className="flex-1" />
                <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer pr-2">
                    <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="accent-[#003366]" />
                    Show inactive
                </label>
            </div>

            {/* Split pane: list left, detail right */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: set list */}
                <div className="w-72 border-r border-gray-200 overflow-y-auto flex-shrink-0">
                    {visible.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 italic text-xs">
                            No UOM Sets defined.<br />Click <strong>New</strong> to create one.
                        </div>
                    ) : (
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-gray-50 border-b sticky top-0">
                                <tr>
                                    <th className="px-3 py-1.5 font-bold text-gray-600">Name</th>
                                    <th className="px-3 py-1.5 font-bold text-gray-600 w-16">Base</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map(s => (
                                    <tr
                                        key={s.id}
                                        onClick={() => setSelected(s.id)}
                                        onDoubleClick={() => openEdit(s)}
                                        className={`cursor-default border-b border-gray-100 ${selected === s.id ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'} ${!s.isActive ? 'opacity-50' : ''}`}
                                    >
                                        <td className="px-3 py-1.5 font-medium">
                                            {s.name}
                                            {!s.isActive && <span className="ml-1 text-[9px] italic">(inactive)</span>}
                                        </td>
                                        <td className="px-3 py-1.5">{s.baseUnit.name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Right: set detail */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!selectedSet ? (
                        <div className="h-full flex items-center justify-center text-gray-300 text-sm italic">
                            Select a UOM Set to view details
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-lg">
                            <div>
                                <h2 className="text-2xl font-serif italic text-[#003366]">{selectedSet.name}</h2>
                                {!selectedSet.isActive && (
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-gray-200 text-gray-500 text-[10px] font-bold rounded">INACTIVE</span>
                                )}
                            </div>

                            {/* Default units */}
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Default Purchase Unit</span>
                                    <p className="font-bold text-gray-700 mt-0.5">{selectedSet.defaultPurchaseUnit || selectedSet.baseUnit.name || '—'}</p>
                                </div>
                                <div>
                                    <span className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Default Sales Unit</span>
                                    <p className="font-bold text-gray-700 mt-0.5">{selectedSet.defaultSalesUnit || selectedSet.baseUnit.name || '—'}</p>
                                </div>
                            </div>

                            {/* Units table */}
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Units in this Set</p>
                                <table className="w-full text-[11px] border border-gray-200">
                                    <thead className="bg-[#003366] text-white">
                                        <tr>
                                            <th className="px-3 py-1.5 font-bold text-left">Unit Name</th>
                                            <th className="px-3 py-1.5 font-bold text-left">Abbrev.</th>
                                            <th className="px-3 py-1.5 font-bold text-right">= X {selectedSet.baseUnit.name}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allUnits(selectedSet).map(u => (
                                            <tr key={u.name} className={`border-t border-gray-100 ${u.isBase ? 'bg-blue-50 font-bold' : 'hover:bg-gray-50'}`}>
                                                <td className="px-3 py-1.5">
                                                    {u.name}
                                                    {u.isBase && <span className="ml-2 text-[9px] font-normal text-blue-500 uppercase">base</span>}
                                                </td>
                                                <td className="px-3 py-1.5">{u.abbreviation || '—'}</td>
                                                <td className="px-3 py-1.5 text-right font-mono">{u.conversionFactor}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Conversion cheat-sheet */}
                            {selectedSet.relatedUnits.length > 0 && (
                                <div className="bg-blue-50 border border-blue-100 rounded p-3">
                                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2">Conversion Examples</p>
                                    <div className="space-y-1">
                                        {allUnits(selectedSet).filter(u => !u.isBase).map(u => (
                                            <p key={u.name} className="text-[11px] text-blue-700">
                                                1 <strong>{u.name}</strong> = <strong>{u.conversionFactor}</strong> {selectedSet.baseUnit.name}
                                                {selectedSet.relatedUnits.filter(r => r.name !== u.name && r.conversionFactor > u.conversionFactor).slice(0, 1).map(bigger => (
                                                    <span key={bigger.name}>
                                                        {' '}= {(u.conversionFactor / bigger.conversionFactor).toFixed(4).replace(/\.?0+$/, '')} {bigger.name}
                                                    </span>
                                                ))}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => openEdit(selectedSet)}
                                className="px-6 py-1.5 bg-[#003366] text-white text-xs font-bold hover:bg-blue-900"
                            >Edit Set</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal form */}
            {showForm && editData && (
                <UOMSetForm
                    initial={editData}
                    onSave={handleSave}
                    onCancel={() => { setShowForm(false); setEditData(null); }}
                />
            )}
        </div>
    );
};

export default UOMList;
