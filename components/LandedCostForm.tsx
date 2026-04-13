import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, Item, Vendor } from '../types';
import { API_BASE_URL } from '../services/api';

// ── Types ────────────────────────────────────────────────────────────────────

type ChargeType = 'Freight' | 'Duty' | 'Insurance' | 'Shipping' | 'Handling' | 'Other';
type DistributionMethod = 'by_quantity' | 'by_value' | 'by_weight' | 'manual';
type LCStatus = 'draft' | 'posted' | 'voided';

interface ChargeLine {
    type: ChargeType;
    description: string;
    amount: string; // string for controlled input
    accountId: string;
}

interface AllocationLine {
    itemId: string;
    itemName: string;
    lotId?: string;
    lotNumber?: string;
    quantity: number;
    receiptValue: number;
    weight: number;
    manualAmount: string;
    allocatedAmount: number;
    allocatedUnitCost: number;
}

interface LandedCostDoc {
    _id?: string;
    refNo?: string;
    date: string;
    receiptId: string;
    receiptRefNo: string;
    vendorId: string;
    vendorName: string;
    charges: ChargeLine[];
    distributionMethod: DistributionMethod;
    allocations: AllocationLine[];
    totalCharges: number;
    status: LCStatus;
    notes: string;
}

interface Props {
    transactions: Transaction[];
    items: Item[];
    vendors: Vendor[];
    onClose: () => void;
    /** params.landedCostId — if provided, open existing record */
    params?: { landedCostId?: string; receiptId?: string };
}

// ── Constants ────────────────────────────────────────────────────────────────

const CHARGE_TYPES: ChargeType[] = ['Freight', 'Duty', 'Insurance', 'Shipping', 'Handling', 'Other'];

const METHOD_LABELS: Record<DistributionMethod, string> = {
    by_value: 'By Value (recommended)',
    by_quantity: 'By Quantity',
    by_weight: 'By Weight',
    manual: 'Manual',
};

const API_BASE = `${API_BASE_URL}/landed-costs`;

const getHeaders = () => {
    const token = localStorage.getItem('authToken');
    const companyId = localStorage.getItem('activeCompanyId');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Company-ID': companyId || '',
    };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
    n == null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const today = () => new Date().toISOString().split('T')[0];

function buildAllocationLines(receipt: Transaction, items: Item[]): AllocationLine[] {
    return (receipt.items || []).flatMap(line => {
        const item = items.find(i => i.id === line.itemId || i.id === line.id);
        const itemType = item?.type?.toLowerCase() || '';
        if (!item || (!itemType.includes('inventory part') && !itemType.includes('inventory assembly'))) return [];
        const qty = line.quantity || 0;
        if (qty === 0) return [];
        const unitCost = line.rate || item.averageCost || item.cost || 0;
        const receiptValue = qty * unitCost;
        const weight = qty * (item.weight || 0);
        return [{
            itemId: item.id,
            itemName: item.name,
            lotId: undefined,
            lotNumber: undefined,
            quantity: qty,
            receiptValue,
            weight,
            manualAmount: '0',
            allocatedAmount: 0,
            allocatedUnitCost: 0,
        }];
    });
}

// ── Component ────────────────────────────────────────────────────────────────

const LandedCostForm: React.FC<Props> = ({ transactions, items, vendors, onClose, params }) => {
    const isEditing = !!params?.landedCostId;

    // ── State ────────────────────────────────────────────────────────────────
    const [docId, setDocId] = useState<string | undefined>(undefined);
    const [refNo, setRefNo] = useState('');
    const [date, setDate] = useState(today());
    const [receiptId, setReceiptId] = useState(params?.receiptId || '');
    const [vendorId, setVendorId] = useState('');
    const [charges, setCharges] = useState<ChargeLine[]>([
        { type: 'Freight', description: '', amount: '', accountId: '' }
    ]);
    const [method, setMethod] = useState<DistributionMethod>('by_value');
    const [allocations, setAllocations] = useState<AllocationLine[]>([]);
    const [totalCharges, setTotalCharges] = useState(0);
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState<LCStatus>('draft');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState('');
    const [previewDirty, setPreviewDirty] = useState(false);

    // Eligible receipts: RECEIVE_ITEM or BILL with inventory items
    const eligibleReceipts = transactions.filter(t =>
        t.type === 'RECEIVE_ITEM' || t.type === 'BILL'
    );

    const selectedReceipt = eligibleReceipts.find(r => r.id === receiptId);

    // ── Load existing document ────────────────────────────────────────────────
    useEffect(() => {
        if (!isEditing) return;
        setLoading(true);
        fetch(`${API_BASE}/${params!.landedCostId}`, { headers: getHeaders() })
            .then(r => r.json())
            .then((doc: LandedCostDoc) => {
                setDocId(doc._id);
                setRefNo(doc.refNo || '');
                setDate(doc.date ? doc.date.split('T')[0] : today());
                setReceiptId(doc.receiptId || '');
                setVendorId(doc.vendorId || '');
                setCharges(doc.charges.map(c => ({ ...c, amount: String(c.amount) })));
                setMethod(doc.distributionMethod);
                setAllocations(doc.allocations.map(a => ({ ...a, manualAmount: String(a.manualAmount ?? 0) })));
                setTotalCharges(doc.totalCharges);
                setNotes(doc.notes || '');
                setStatus(doc.status);
            })
            .catch(() => setError('Failed to load landed cost'))
            .finally(() => setLoading(false));
    }, [isEditing, params]);

    // Auto-populate allocations when receipt changes
    useEffect(() => {
        if (!selectedReceipt) { setAllocations([]); return; }
        const lines = buildAllocationLines(selectedReceipt, items);
        setAllocations(lines);
        setVendorId(selectedReceipt.entityId || '');
        setPreviewDirty(true);
    }, [receiptId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Mark preview dirty when charges or method change
    useEffect(() => { setPreviewDirty(true); }, [charges, method]);

    // ── Charge line helpers ───────────────────────────────────────────────────
    const addCharge = () => setCharges(prev => [...prev, { type: 'Freight', description: '', amount: '', accountId: '' }]);

    const removeCharge = (i: number) => setCharges(prev => prev.filter((_, idx) => idx !== i));

    const updateCharge = (i: number, field: keyof ChargeLine, value: string) =>
        setCharges(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

    const chargeTotal = charges.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

    // ── Preview allocation ────────────────────────────────────────────────────
    const handlePreview = useCallback(async () => {
        if (!allocations.length || !charges.length) return;
        setPreviewDirty(false);
        const body = {
            charges: charges.map(c => ({ ...c, amount: parseFloat(c.amount) || 0 })),
            distributionMethod: method,
            lines: allocations.map(a => ({ ...a, manualAmount: parseFloat(a.manualAmount) || 0 })),
        };
        try {
            const r = await fetch(`${API_BASE}/calculate`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body),
            });
            const data = await r.json();
            if (!r.ok) { setError(data.message || 'Preview failed'); return; }
            setAllocations(data.allocations.map((a: any) => ({
                ...a, manualAmount: String(a.manualAmount ?? 0)
            })));
            setTotalCharges(data.totalCharges);
        } catch { setError('Preview request failed'); }
    }, [charges, method, allocations]);

    // ── Save draft ────────────────────────────────────────────────────────────
    const handleSave = async (): Promise<string | undefined> => {
        setError('');
        if (!charges.length || charges.every(c => !parseFloat(c.amount))) {
            setError('Add at least one charge with an amount'); return undefined;
        }
        setSaving(true);
        const body = {
            date,
            receiptId,
            receiptRefNo: selectedReceipt?.refNo || '',
            vendorId,
            vendorName: vendors.find(v => v.id === vendorId)?.name || '',
            charges: charges.map(c => ({ ...c, amount: parseFloat(c.amount) || 0 })),
            distributionMethod: method,
            allocations: allocations.map(a => ({ ...a, manualAmount: parseFloat(a.manualAmount) || 0 })),
            notes,
        };
        try {
            const url = docId ? `${API_BASE}/${docId}` : API_BASE;
            const r = await fetch(url, {
                method: docId ? 'PUT' : 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body),
            });
            const data = await r.json();
            if (!r.ok) { setError(data.message || 'Save failed'); return undefined; }
            setDocId(data._id);
            setRefNo(data.refNo);
            setStatus(data.status);
            return data._id;
        } catch { setError('Save request failed'); return undefined; }
        finally { setSaving(false); }
    };

    // ── Post ─────────────────────────────────────────────────────────────────
    const handlePost = async () => {
        let id = docId;
        if (!id) {
            id = await handleSave();
            if (!id) return; // save failed
        }
        if (!window.confirm(`Post ${refNo || 'this landed cost'}? This will update inventory costs and cannot be easily undone.`)) return;
        setPosting(true);
        setError('');
        try {
            const r = await fetch(`${API_BASE}/${id}/post`, {
                method: 'POST', headers: getHeaders()
            });
            const data = await r.json();
            if (!r.ok) { setError(data.message || 'Post failed'); return; }
            setStatus('posted');
            setRefNo(data.refNo || refNo);
            const updated = data.updatedItems || [];
            const skipped = data.warning || '';
            const summary = updated.length
                ? updated.map((u: any) => `• ${u.name}: $${u.oldAvgCost?.toFixed(4)} → $${u.newAvgCost?.toFixed(4)}`).join('\n')
                : 'No item costs were updated.';
            alert(`${data.refNo} posted.\n\nAverage cost changes:\n${summary}${skipped ? '\n\nWarning: ' + skipped : ''}`);
        } catch { setError('Post request failed'); }
        finally { setPosting(false); }
    };

    // ── Void ─────────────────────────────────────────────────────────────────
    const handleVoid = async () => {
        if (!docId) return;
        if (!window.confirm(`Void ${refNo}? This will reverse the cost additions applied to inventory.`)) return;
        setError('');
        try {
            const r = await fetch(`${API_BASE}/${docId}/void`, {
                method: 'POST', headers: getHeaders()
            });
            const data = await r.json();
            if (!r.ok) { setError(data.message || 'Void failed'); return; }
            setStatus('voided');
        } catch { setError('Void request failed'); }
    };

    const isPosted = status === 'posted';
    const isVoided = status === 'voided';
    const isReadOnly = isPosted || isVoided;

    // ── Render ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="bg-[#f0f0f0] h-full flex items-center justify-center">
                <div className="text-gray-500 text-sm">Loading…</div>
            </div>
        );
    }

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
            <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="p-4 bg-white border-b-4 border-blue-900 flex justify-between items-center shadow-md">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-serif italic text-[#003366] drop-shadow-sm">
                            Enter Landed Costs
                        </h2>
                        {refNo && (
                            <span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">
                                {refNo}
                            </span>
                        )}
                        {isPosted && (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-300">
                                Posted
                            </span>
                        )}
                        {isVoided && (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-300">
                                Voided
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {!isReadOnly && (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-white border border-gray-400 px-6 py-2 text-xs font-black rounded hover:bg-gray-50 disabled:opacity-50 transition-all uppercase tracking-widest shadow-sm"
                                >
                                    {saving ? 'Saving…' : 'Save Draft'}
                                </button>
                                <button
                                    onClick={handlePost}
                                    disabled={posting || !allocations.length}
                                    className="bg-[#0077c5] text-white px-10 py-2 text-xs font-black rounded shadow-md hover:bg-[#005fa0] disabled:bg-gray-400 transition-all uppercase tracking-widest"
                                >
                                    {posting ? 'Posting…' : 'Post'}
                                </button>
                            </>
                        )}
                        {isPosted && (
                            <button
                                onClick={handleVoid}
                                className="bg-red-600 text-white px-6 py-2 text-xs font-black rounded hover:bg-red-700 transition-all uppercase tracking-widest"
                            >
                                Void
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="bg-white border border-gray-400 px-10 py-2 text-xs font-black rounded hover:bg-gray-50 transition-all uppercase tracking-widest shadow-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* ── Error banner ───────────────────────────────────────── */}
                {error && (
                    <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-sm text-red-700 font-semibold">
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-auto custom-scrollbar p-8 space-y-8 bg-[#f8f9fa]">

                    {/* ── Header fields ──────────────────────────────────── */}
                    <div className="bg-white border-2 border-gray-100 rounded-sm shadow-xl p-6">
                        <div className="grid grid-cols-3 gap-6">
                            {/* Receipt */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                                    Item Receipt / Bill *
                                </label>
                                <select
                                    value={receiptId}
                                    onChange={e => setReceiptId(e.target.value)}
                                    disabled={isReadOnly}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                >
                                    <option value="">— Select Receipt —</option>
                                    {eligibleReceipts.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.refNo} ({r.type === 'BILL' ? 'Bill' : 'Item Receipt'}) — {r.date}
                                        </option>
                                    ))}
                                </select>
                                {selectedReceipt && (
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        {selectedReceipt.items?.length || 0} line(s) · Total: {fmtCurrency(selectedReceipt.total || 0)}
                                    </p>
                                )}
                                {selectedReceipt && allocations.length === 0 && (
                                    <p className="text-[10px] text-amber-600 font-semibold mt-1">
                                        No inventory items found on this receipt. Landed costs only apply to Inventory Part and Inventory Assembly items.
                                    </p>
                                )}
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    disabled={isReadOnly}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                />
                            </div>

                            {/* Vendor */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                                    Vendor (optional)
                                </label>
                                <select
                                    value={vendorId}
                                    onChange={e => setVendorId(e.target.value)}
                                    disabled={isReadOnly}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                                >
                                    <option value="">— None —</option>
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Distribution Method */}
                        <div className="mt-6">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                Distribution Method
                            </label>
                            <div className="flex gap-4 flex-wrap">
                                {(Object.entries(METHOD_LABELS) as [DistributionMethod, string][]).map(([val, label]) => (
                                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                                        <div
                                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${method === val ? 'bg-blue-600 border-blue-700' : 'bg-white border-gray-300 hover:border-blue-400'}`}
                                            onClick={() => !isReadOnly && setMethod(val)}
                                        >
                                            {method === val && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                        <span className={`text-xs font-semibold ${method === val ? 'text-blue-900' : 'text-gray-500'}`}>
                                            {label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <p className="mt-1 text-[10px] text-gray-400">
                                {method === 'by_value' && 'Distributes proportionally to each line\'s receipt value (qty × unit cost). QB default.'}
                                {method === 'by_quantity' && 'Distributes proportionally to the number of units received per line.'}
                                {method === 'by_weight' && 'Distributes proportionally to item weight × qty. Requires weight on items.'}
                                {method === 'manual' && 'Enter the exact amount to allocate per line.'}
                            </p>
                        </div>
                    </div>

                    {/* ── Charge Lines ───────────────────────────────────── */}
                    <div className="bg-white border-2 border-gray-100 rounded-sm shadow-xl overflow-hidden">
                        <div className="bg-[#003366] text-white px-6 py-3 flex justify-between items-center">
                            <span className="text-xs font-black uppercase tracking-widest">
                                Charges
                            </span>
                            {!isReadOnly && (
                                <button
                                    onClick={addCharge}
                                    className="text-white border border-white/40 px-3 py-1 text-[10px] font-black uppercase rounded hover:bg-white/10 transition-colors"
                                >
                                    + Add Charge
                                </button>
                            )}
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 w-32">Type</th>
                                    <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Description</th>
                                    <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-gray-500 w-32">Amount</th>
                                    {!isReadOnly && <th className="px-4 py-2 w-10"></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {charges.map((c, i) => (
                                    <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                                        <td className="px-4 py-2">
                                            <select
                                                value={c.type}
                                                onChange={e => updateCharge(i, 'type', e.target.value)}
                                                disabled={isReadOnly}
                                                className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50"
                                            >
                                                {CHARGE_TYPES.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                value={c.description}
                                                onChange={e => updateCharge(i, 'description', e.target.value)}
                                                disabled={isReadOnly}
                                                placeholder="Optional note"
                                                className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={c.amount}
                                                onChange={e => updateCharge(i, 'amount', e.target.value)}
                                                disabled={isReadOnly}
                                                placeholder="0.00"
                                                className="border border-gray-300 rounded px-2 py-1 text-xs w-full text-right focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50"
                                            />
                                        </td>
                                        {!isReadOnly && (
                                            <td className="px-2 py-2 text-center">
                                                {charges.length > 1 && (
                                                    <button
                                                        onClick={() => removeCharge(i)}
                                                        className="text-red-400 hover:text-red-600 text-xs font-bold"
                                                        title="Remove"
                                                    >✕</button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                <tr className="bg-gray-50 font-semibold">
                                    <td className="px-4 py-2 text-xs text-gray-500" colSpan={2}>Total Charges</td>
                                    <td className="px-4 py-2 text-right text-sm font-black text-blue-900">
                                        {fmtCurrency(chargeTotal)}
                                    </td>
                                    {!isReadOnly && <td />}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ── Allocation Preview ─────────────────────────────── */}
                    {allocations.length > 0 && (
                        <div className="bg-white border-2 border-gray-100 rounded-sm shadow-xl overflow-hidden">
                            <div className="bg-[#003366] text-white px-6 py-3 flex justify-between items-center">
                                <span className="text-xs font-black uppercase tracking-widest">
                                    Allocation Preview
                                </span>
                                {!isReadOnly && (
                                    <button
                                        onClick={handlePreview}
                                        className={`border px-3 py-1 text-[10px] font-black uppercase rounded transition-colors ${previewDirty ? 'bg-yellow-400 text-yellow-900 border-yellow-300 animate-pulse' : 'text-white border-white/40 hover:bg-white/10'}`}
                                    >
                                        {previewDirty ? 'Recalculate ↻' : 'Calculated ✓'}
                                    </button>
                                )}
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Item</th>
                                        <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-gray-500 w-20">Qty</th>
                                        <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-gray-500 w-28">Receipt Value</th>
                                        {method === 'by_weight' && (
                                            <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-gray-500 w-20">Weight</th>
                                        )}
                                        {method === 'manual' && (
                                            <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-gray-500 w-28">Manual Amt</th>
                                        )}
                                        <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-gray-500 w-28">Allocated $</th>
                                        <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-widest text-gray-500 w-28">Per Unit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allocations.map((a, i) => (
                                        <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                                            <td className="px-4 py-2 font-semibold text-gray-800">
                                                {a.itemName}
                                                {a.lotNumber && (
                                                    <span className="ml-2 text-[10px] text-gray-400 font-normal">Lot: {a.lotNumber}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right text-gray-700">{a.quantity}</td>
                                            <td className="px-4 py-2 text-right text-gray-700">{fmtCurrency(a.receiptValue)}</td>
                                            {method === 'by_weight' && (
                                                <td className="px-4 py-2 text-right text-gray-700">{a.weight?.toFixed(2)} lb</td>
                                            )}
                                            {method === 'manual' && (
                                                <td className="px-4 py-2 text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={a.manualAmount}
                                                        disabled={isReadOnly}
                                                        onChange={e => {
                                                            const v = e.target.value;
                                                            setAllocations(prev => prev.map((l, idx) => idx === i ? { ...l, manualAmount: v } : l));
                                                            setPreviewDirty(true);
                                                        }}
                                                        className="border border-gray-300 rounded px-2 py-1 text-xs w-24 text-right focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-4 py-2 text-right font-semibold text-blue-800">
                                                {fmtCurrency(a.allocatedAmount)}
                                            </td>
                                            <td className="px-4 py-2 text-right text-gray-600 text-xs">
                                                +{fmtCurrency(a.allocatedUnitCost)}/unit
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-50 font-semibold">
                                        <td className="px-4 py-2 text-xs text-gray-500" colSpan={method === 'by_weight' ? 4 : method === 'manual' ? 4 : 3}>
                                            Total Allocated
                                        </td>
                                        <td className="px-4 py-2 text-right font-black text-blue-900">
                                            {fmtCurrency(allocations.reduce((s, a) => s + a.allocatedAmount, 0))}
                                        </td>
                                        <td />
                                    </tr>
                                </tbody>
                            </table>

                            {/* Mismatch warning */}
                            {Math.abs(allocations.reduce((s, a) => s + a.allocatedAmount, 0) - chargeTotal) > 0.01 && (
                                <div className="bg-yellow-50 border-t border-yellow-200 px-6 py-2 text-xs text-yellow-700 font-semibold">
                                    Warning: Allocated total does not match charges. Click Recalculate.
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Notes ──────────────────────────────────────────── */}
                    <div className="bg-white border-2 border-gray-100 rounded-sm shadow-xl p-6">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            disabled={isReadOnly}
                            rows={3}
                            placeholder="Customs reference, shipping carrier, invoice number…"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none disabled:bg-gray-50"
                        />
                    </div>

                    {/* ── Info panel ─────────────────────────────────────── */}
                    <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 text-xs text-blue-800 space-y-1">
                        <p className="font-black uppercase tracking-widest text-blue-900 mb-2">How it works</p>
                        <p>1. Select the item receipt or bill that brought in the inventory.</p>
                        <p>2. Add all extra charges (freight, duty, insurance, etc.).</p>
                        <p>3. Choose how to spread the charges — by value is QB's default.</p>
                        <p>4. Click <strong>Recalculate</strong> to preview the per-unit cost addition.</p>
                        <p>5. Click <strong>Post</strong> to apply the charges — this updates each lot's unit cost and recalculates the item's average cost.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandedCostForm;
