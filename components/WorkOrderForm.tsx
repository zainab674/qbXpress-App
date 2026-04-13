
import React, { useState, useMemo } from 'react';
import { Item, Transaction } from '../types';

interface Props {
    items: Item[];
    transactions: Transaction[];
    onSave: (tx: Transaction) => Promise<void>;
    onClose: () => void;
    onOpenBuild: (params: {
        linkedWorkOrderId: string;
        linkedWorkOrderRefNo: string;
        workOrderPlannedQty: number;
        workOrderRemainingQty: number;
        preselectedAssemblyId: string;
    }) => void;
    initialData?: Partial<Transaction>;
}

const STATUS_COLORS: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    PARTIAL_COMPLETE: 'bg-orange-100 text-orange-800',
    COMPLETE: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-200 text-gray-500 line-through',
};

const WorkOrderForm: React.FC<Props> = ({ items, transactions, onSave, onClose, onOpenBuild, initialData }) => {
    const isEdit = !!initialData?.id;

    const [selectedAssemblyId, setSelectedAssemblyId] = useState(
        initialData?.items?.[0]?.id || ''
    );
    const [quantityPlanned, setQuantityPlanned] = useState(initialData?.quantityPlanned || 1);
    const [startDate, setStartDate] = useState(
        initialData?.date || new Date().toISOString().split('T')[0]
    );
    const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
    const [memo, setMemo] = useState(initialData?.memo || '');
    const [saving, setSaving] = useState(false);

    const assemblies = items.filter(i => i.type === 'Inventory Assembly');
    const selectedAssembly = useMemo(() => items.find(i => i.id === selectedAssemblyId), [items, selectedAssemblyId]);

    // Derive live status from linked ASSEMBLY_BUILD transactions
    const linkedBuilds = useMemo(() => {
        if (!initialData?.id) return [];
        return transactions.filter(tx =>
            tx.type === 'ASSEMBLY_BUILD' && tx.linkedWorkOrderId === initialData.id
        );
    }, [transactions, initialData?.id]);

    const liveCompleted = useMemo(() =>
        linkedBuilds.reduce((sum, tx) => sum + (tx.items?.[0]?.quantity || 0), 0),
        [linkedBuilds]
    );

    const woStatus = initialData?.workOrderStatus || 'OPEN';
    const quantityCompleted = isEdit ? liveCompleted : 0;
    const remaining = Math.max(0, quantityPlanned - quantityCompleted);

    // Component requirements
    const components = useMemo(() => {
        if (!selectedAssembly?.assemblyItems) return [];
        return selectedAssembly.assemblyItems.map(c => {
            const item = items.find(i => i.id === c.itemId);
            const isStocked = item?.type === 'Inventory Part' || item?.type === 'Inventory Assembly';
            const scrap = (c as any).scrapPercent || 0;
            const yield_ = (c as any).yieldPercent || 100;
            const effQtyPerBuild = c.quantity * (1 + scrap / 100) / (yield_ / 100);
            const needed = effQtyPerBuild * quantityPlanned;
            return {
                ...c,
                name: item?.name || 'Unknown',
                isStocked,
                onHand: item?.onHand || 0,
                needed,
                effQtyPerBuild,
                shortage: isStocked ? Math.max(0, needed - (item?.onHand || 0)) : 0,
            };
        });
    }, [selectedAssembly, items, quantityPlanned]);

    const buildTx = (overrides: Partial<Transaction> = {}): Transaction => {
        const woRefNo = initialData?.refNo || ('WO-' + Date.now().toString().slice(-6));
        return {
            id: initialData?.id || crypto.randomUUID(),
            type: 'WORK_ORDER',
            refNo: woRefNo,
            date: startDate,
            dueDate: dueDate || undefined,
            entityId: 'Internal',
            memo,
            items: [{
                id: selectedAssemblyId,
                description: `Work Order: ${selectedAssembly?.name} × ${quantityPlanned}`,
                quantity: quantityPlanned,
                rate: 0,
                amount: 0,
                tax: false,
            }],
            total: 0,
            status: 'OPEN',
            // Preserve current status on edits — only override when explicitly cancelling
            workOrderStatus: initialData?.workOrderStatus || 'OPEN',
            quantityPlanned,
            quantityCompleted: initialData?.quantityCompleted || 0,
            ...overrides,
        };
    };

    const handleSave = async () => {
        if (!selectedAssemblyId) { alert('Select an assembly item.'); return; }
        if (quantityPlanned <= 0) { alert('Planned quantity must be > 0.'); return; }
        // Guard: don't allow reducing planned qty below what's already been built
        if (isEdit && quantityPlanned < quantityCompleted) {
            alert(`Cannot set planned quantity (${quantityPlanned}) below already-completed quantity (${quantityCompleted}).`);
            return;
        }
        setSaving(true);
        try {
            await onSave(buildTx());
            onClose();
        } catch {
            alert('Failed to save Work Order.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async () => {
        if (!initialData?.id) return;
        if (!confirm(`Cancel Work Order ${initialData.refNo}? This cannot be undone.`)) return;
        setSaving(true);
        try {
            await onSave(buildTx({ workOrderStatus: 'CANCELLED', status: 'CLOSED' }));
            onClose();
        } catch {
            alert('Failed to cancel Work Order.');
        } finally {
            setSaving(false);
        }
    };

    const handlePostBuild = () => {
        if (!initialData?.id) return;
        if (remaining <= 0) { alert('Work Order is fully complete. Nothing left to build.'); return; }
        if (woStatus === 'CANCELLED') { alert('Cannot post builds against a cancelled Work Order.'); return; }
        onOpenBuild({
            linkedWorkOrderId: initialData.id,
            linkedWorkOrderRefNo: initialData.refNo || '',
            workOrderPlannedQty: quantityPlanned,
            workOrderRemainingQty: remaining,
            preselectedAssemblyId: selectedAssemblyId,
        });
    };

    const progressPct = quantityPlanned > 0 ? Math.min(100, (quantityCompleted / quantityPlanned) * 100) : 0;

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
            <div className="bg-white border border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-4 bg-[#003366] text-white flex justify-between items-center select-none">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">📋</span>
                        <h2 className="text-lg font-bold">Work Order</h2>
                        {isEdit && (
                            <span className="text-sm font-mono text-blue-200">#{initialData.refNo}</span>
                        )}
                        {isEdit && (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${STATUS_COLORS[woStatus] || 'bg-gray-100 text-gray-600'}`}>
                                {woStatus.replace(/_/g, ' ')}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="hover:bg-red-600 px-2">✕</button>
                </div>

                {/* Form fields */}
                <div className="p-5 bg-gray-50 border-b flex flex-wrap gap-5">
                    <div className="flex flex-col gap-1 w-72">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Assembly Item</label>
                        <select
                            className="border p-2 text-sm bg-white outline-none font-bold shadow-sm"
                            value={selectedAssemblyId}
                            onChange={e => setSelectedAssemblyId(e.target.value)}
                            disabled={isEdit}
                        >
                            <option value="">-- Select Assembly --</option>
                            {assemblies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1 w-32">
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Qty to Build</label>
                        <input
                            type="number" min={1}
                            className="border-2 border-blue-400 p-2 text-center font-black text-lg outline-none"
                            value={quantityPlanned}
                            onChange={e => setQuantityPlanned(parseInt(e.target.value) || 1)}
                            disabled={isEdit && (woStatus === 'COMPLETE' || woStatus === 'CANCELLED')}
                        />
                    </div>

                    <div className="flex flex-col gap-1 w-36">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Start Date</label>
                        <input
                            type="date"
                            className="border p-2 text-sm bg-white outline-none"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1 w-36">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Due Date</label>
                        <input
                            type="date"
                            className="border p-2 text-sm bg-white outline-none"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Memo / Notes</label>
                        <input
                            type="text"
                            className="border p-2 text-sm bg-white outline-none"
                            value={memo}
                            onChange={e => setMemo(e.target.value)}
                            placeholder="Optional notes..."
                        />
                    </div>
                </div>

                {/* Progress bar — shown when editing */}
                {isEdit && (
                    <div className="px-5 py-3 bg-white border-b">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Build Progress</span>
                            <span className="text-[11px] font-bold text-gray-700">
                                {quantityCompleted} / {quantityPlanned} built
                                <span className="ml-2 text-gray-400">({remaining} remaining)</span>
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-3 rounded-full transition-all ${progressPct >= 100 ? 'bg-green-500' : progressPct > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] font-bold text-gray-400">
                            <span>0</span>
                            <span className="text-blue-500">{progressPct.toFixed(0)}%</span>
                            <span>{quantityPlanned}</span>
                        </div>
                    </div>
                )}

                {/* Component requirements table */}
                <div className="flex-1 overflow-auto p-4 bg-white">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Bill of Materials — Component Requirements</div>
                    <table className="w-full text-xs text-left border border-gray-200">
                        <thead className="bg-[#e8e8e8] border-b border-gray-400 text-[#003366] font-bold sticky top-0">
                            <tr>
                                <th className="p-3 border-r">Component</th>
                                <th className="p-3 border-r text-right">Qty/Each</th>
                                <th className="p-3 border-r text-right">Total Needed</th>
                                <th className="p-3 border-r text-right">On Hand</th>
                                <th className="p-3 text-right">Shortage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {components.map((c, idx) => (
                                <tr key={idx} className={`hover:bg-blue-50/50 ${c.shortage > 0 ? 'bg-red-50/30' : ''}`}>
                                    <td className="p-3 border-r font-bold text-gray-700">
                                        {c.name}
                                        {!c.isStocked && <span className="ml-2 text-[10px] font-normal text-purple-500 bg-purple-50 px-1 rounded">SERVICE</span>}
                                    </td>
                                    <td className="p-3 border-r text-right font-mono text-gray-500">{c.quantity}</td>
                                    <td className="p-3 border-r text-right font-black text-blue-800 font-mono">{+c.needed.toFixed(4)}</td>
                                    <td className="p-3 border-r text-right font-mono text-gray-500">{c.isStocked ? c.onHand : '∞'}</td>
                                    <td className={`p-3 text-right font-bold font-mono ${c.shortage > 0 ? 'text-red-600 underline decoration-double' : 'text-gray-200'}`}>
                                        {!c.isStocked ? <span className="text-purple-400 text-[10px]">N/A</span> : c.shortage > 0 ? +c.shortage.toFixed(4) : '--'}
                                    </td>
                                </tr>
                            ))}
                            {components.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center text-gray-300 font-serif italic text-lg">
                                        Select an assembly item above to see BOM requirements.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Build history — only shown when editing */}
                    {isEdit && linkedBuilds.length > 0 && (
                        <div className="mt-6">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Build History</div>
                            <table className="w-full text-xs border border-gray-200">
                                <thead className="bg-[#e8e8e8] text-[#003366] font-bold border-b border-gray-400">
                                    <tr>
                                        <th className="p-2 border-r text-left">Build Ref #</th>
                                        <th className="p-2 border-r text-left">Date</th>
                                        <th className="p-2 border-r text-right">Qty Built</th>
                                        <th className="p-2 text-left">Lot #</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {linkedBuilds.map(b => (
                                        <tr key={b.id} className="hover:bg-blue-50/40">
                                            <td className="p-2 border-r font-mono text-blue-700 font-bold">{b.refNo}</td>
                                            <td className="p-2 border-r text-gray-500">{b.date}</td>
                                            <td className="p-2 border-r text-right font-black text-gray-700">{b.items?.[0]?.quantity || 0}</td>
                                            <td className="p-2 font-mono text-amber-700">{b.outputLotNumber || <span className="text-gray-300 italic">—</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-6 py-2 border border-gray-400 text-gray-600 text-sm font-bold rounded hover:bg-gray-100 transition-colors">
                            Close
                        </button>
                        {/* Cancel WO — only shown when editable (not complete, not already cancelled) */}
                        {isEdit && woStatus !== 'COMPLETE' && woStatus !== 'CANCELLED' && (
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="px-4 py-2 border border-red-300 text-red-600 text-sm font-bold rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                                Cancel WO
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {isEdit && woStatus !== 'COMPLETE' && woStatus !== 'CANCELLED' && (
                            <button
                                onClick={handlePostBuild}
                                className="px-6 py-2 bg-orange-500 text-white text-sm font-bold rounded hover:bg-orange-600 shadow transition-colors"
                            >
                                Post Build ({remaining} remaining)
                            </button>
                        )}
                        {/* Save on new; Update on edit (when not complete/cancelled) */}
                        {woStatus !== 'CANCELLED' && (
                            <button
                                onClick={handleSave}
                                disabled={saving || !selectedAssemblyId}
                                className="px-8 py-2 bg-[#003366] text-white text-sm font-bold rounded hover:bg-blue-900 shadow disabled:opacity-50 transition-colors"
                            >
                                {saving ? 'Saving...' : isEdit ? 'Update Work Order' : 'Save Work Order'}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default WorkOrderForm;
