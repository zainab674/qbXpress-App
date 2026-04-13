import React, { useState, useEffect, useCallback } from 'react';
import { fetchLotsForQC, quarantineLot, releaseLot, fetchAvailableLots } from '../services/api';
import { Item } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QCLot {
    _id: string;
    lotNumber: string;
    itemId: string;
    itemName?: string;
    quantityReceived: number;
    quantityRemaining: number;
    quantityOnHold: number;
    dateReceived?: string;
    expirationDate?: string;
    lotStatus: 'available' | 'on-hold' | 'expired' | 'quarantine' | 'consumed';
    vendorName?: string;
    vendorLotNumber?: string;
    warehouseId?: string;
    binLocation?: string;
    notes?: string;
    qcHistory?: { action: string; date: string; by: string; reason?: string; notes?: string }[];
}

interface Props {
    items: Item[];
    onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
    'on-hold': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    quarantine: 'bg-orange-100 text-orange-800 border-orange-300',
    available: 'bg-green-100 text-green-800 border-green-300',
    expired: 'bg-red-100 text-red-800 border-red-300',
    consumed: 'bg-gray-100 text-gray-600 border-gray-300',
};

type ModalMode = 'quarantine' | 'release' | null;

// ── Component ─────────────────────────────────────────────────────────────────

const LotQCWorkflow: React.FC<Props> = ({ items, onClose }) => {
    const [lots, setLots] = useState<QCLot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'on-hold' | 'quarantine'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedLot, setSelectedLot] = useState<QCLot | null>(null);
    const [modalReason, setModalReason] = useState('');
    const [modalNotes, setModalNotes] = useState('');
    const [modalReleasedBy, setModalReleasedBy] = useState('');
    const [modalHoldStatus, setModalHoldStatus] = useState<'on-hold' | 'quarantine'>('quarantine');
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // "Put on Hold" quick-add panel for available lots
    const [showHoldPanel, setShowHoldPanel] = useState(false);
    const [holdItemId, setHoldItemId] = useState('');
    const [availableForHold, setAvailableForHold] = useState<any[]>([]);
    const [holdLotId, setHoldLotId] = useState('');

    const itemMap = Object.fromEntries(items.map(i => [i.id, i.name]));

    const loadQCLots = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const status = statusFilter === 'all' ? undefined : statusFilter;
            const data = await fetchLotsForQC(status);
            setLots(data);
        } catch (e: any) {
            setError(e.message || 'Failed to load QC lots');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { loadQCLots(); }, [loadQCLots]);

    useEffect(() => {
        if (!holdItemId) { setAvailableForHold([]); setHoldLotId(''); return; }
        fetchAvailableLots(holdItemId).then(setAvailableForHold).catch(() => setAvailableForHold([]));
    }, [holdItemId]);

    const openModal = (lot: QCLot, mode: ModalMode) => {
        setSelectedLot(lot);
        setModalMode(mode);
        setModalReason('');
        setModalNotes('');
        setModalReleasedBy('');
        setModalHoldStatus('quarantine');
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedLot(null);
    };

    const handleQuarantine = async () => {
        if (!selectedLot) return;
        setSaving(true);
        try {
            await quarantineLot(selectedLot._id, modalReason, modalHoldStatus);
            setSuccessMsg(`Lot ${selectedLot.lotNumber} set to ${modalHoldStatus}`);
            closeModal();
            await loadQCLots();
        } catch (e: any) {
            alert(e.message || 'Failed to quarantine lot');
        } finally {
            setSaving(false);
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    const handleRelease = async () => {
        if (!selectedLot) return;
        setSaving(true);
        try {
            await releaseLot(selectedLot._id, modalNotes, modalReleasedBy || undefined);
            setSuccessMsg(`Lot ${selectedLot.lotNumber} released to available`);
            closeModal();
            await loadQCLots();
        } catch (e: any) {
            alert(e.message || 'Failed to release lot');
        } finally {
            setSaving(false);
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    const handlePutAvailableLotOnHold = async () => {
        if (!holdLotId || !holdItemId) return;
        const lot = availableForHold.find(l => l._id === holdLotId);
        if (!lot) return;
        setSaving(true);
        try {
            await quarantineLot(holdLotId, modalReason || 'Manual QC hold', 'on-hold');
            setSuccessMsg(`Lot ${lot.lotNumber} placed on hold`);
            setShowHoldPanel(false);
            setHoldItemId('');
            setHoldLotId('');
            setModalReason('');
            await loadQCLots();
        } catch (e: any) {
            alert(e.message || 'Failed to place lot on hold');
        } finally {
            setSaving(false);
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    const filtered = lots.filter(l => {
        const term = searchTerm.toLowerCase();
        return (
            l.lotNumber.toLowerCase().includes(term) ||
            (l.itemName || itemMap[l.itemId] || '').toLowerCase().includes(term) ||
            (l.vendorName || '').toLowerCase().includes(term)
        );
    });

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col font-sans">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-300">
                <div className="flex bg-gray-100 text-sm font-bold px-2 pt-1">
                    <button className="px-5 py-2.5 border-t border-l border-r rounded-t-sm bg-white border-gray-400 text-[#003366]">
                        QC / Lot Hold Management
                    </button>
                </div>
                <div className="p-2 flex gap-3 bg-white border-t border-gray-300 items-center">
                    <button onClick={onClose} className="flex flex-col items-center group">
                        <div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors text-xl">✖</div>
                        <span className="text-xs font-bold mt-1">Close</span>
                    </button>
                    <button onClick={() => setShowHoldPanel(v => !v)} className="flex flex-col items-center group">
                        <div className="w-10 h-10 bg-yellow-50 border-2 border-yellow-200 rounded flex items-center justify-center text-yellow-700 hover:bg-yellow-100 transition-colors text-xl">⏸</div>
                        <span className="text-xs font-bold mt-1">Hold Lot</span>
                    </button>
                    <button onClick={loadQCLots} className="flex flex-col items-center group">
                        <div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-blue-700 hover:bg-blue-100 transition-colors text-xl">↻</div>
                        <span className="text-xs font-bold mt-1">Refresh</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {successMsg && (
                    <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-xs font-bold text-green-700">
                        ✓ {successMsg}
                    </div>
                )}

                {/* Put on Hold Quick Panel */}
                {showHoldPanel && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5 shadow">
                        <h3 className="text-sm font-black text-yellow-900 uppercase tracking-widest mb-3">Place Available Lot on Hold / Quarantine</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-yellow-700 uppercase block mb-1">Item</label>
                                <select
                                    className="w-full border-2 border-yellow-200 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-yellow-500"
                                    value={holdItemId}
                                    onChange={e => setHoldItemId(e.target.value)}
                                >
                                    <option value="">-- Select Item --</option>
                                    {items.filter(i => i.type === 'Inventory Part' || i.type === 'Inventory Assembly').map(i => (
                                        <option key={i.id} value={i.id}>{i.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-yellow-700 uppercase block mb-1">Lot (available)</label>
                                <select
                                    className="w-full border-2 border-yellow-200 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-yellow-500"
                                    value={holdLotId}
                                    onChange={e => setHoldLotId(e.target.value)}
                                    disabled={!holdItemId}
                                >
                                    <option value="">-- Select Lot --</option>
                                    {availableForHold.map(l => (
                                        <option key={l._id} value={l._id}>{l.lotNumber} ({l.quantityRemaining} avail)</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-yellow-700 uppercase block mb-1">Hold Type</label>
                                <select
                                    className="w-full border-2 border-yellow-200 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-yellow-500"
                                    value={modalHoldStatus}
                                    onChange={e => setModalHoldStatus(e.target.value as 'on-hold' | 'quarantine')}
                                >
                                    <option value="on-hold">On Hold (QC review)</option>
                                    <option value="quarantine">Quarantine (do not use)</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-3">
                            <label className="text-[10px] font-black text-yellow-700 uppercase block mb-1">Reason</label>
                            <input
                                type="text"
                                placeholder="e.g. Suspected contamination, customer complaint…"
                                className="w-full border-2 border-yellow-200 rounded px-3 py-1.5 text-sm bg-white outline-none focus:border-yellow-500"
                                value={modalReason}
                                onChange={e => setModalReason(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3 mt-3">
                            <button
                                onClick={handlePutAvailableLotOnHold}
                                disabled={!holdLotId || saving}
                                className="px-6 py-2 bg-yellow-600 text-white text-xs font-black uppercase rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 transition-all"
                            >
                                {saving ? 'Saving…' : 'Place on Hold'}
                            </button>
                            <button onClick={() => setShowHoldPanel(false)} className="px-4 py-2 bg-white border border-gray-300 text-xs font-bold rounded-lg hover:bg-gray-50">Cancel</button>
                        </div>
                    </div>
                )}

                {/* Header & Filters */}
                <div className="bg-white border-2 border-gray-100 rounded-xl shadow p-4 flex flex-wrap gap-4 items-center">
                    <h2 className="text-xl font-serif italic text-[#003366] mr-2">QC Lot Dashboard</h2>
                    <div className="flex gap-2">
                        {(['all', 'on-hold', 'quarantine'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all
                                    ${statusFilter === s
                                        ? s === 'quarantine' ? 'bg-orange-600 text-white border-orange-600'
                                        : s === 'on-hold' ? 'bg-yellow-500 text-white border-yellow-500'
                                        : 'bg-[#003366] text-white border-[#003366]'
                                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-500'}`}
                            >
                                {s === 'all' ? 'All Holds' : s}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Search lot, item, vendor…"
                        className="ml-auto border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-400 w-56"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Table */}
                {loading ? (
                    <div className="text-center py-16 text-gray-400 text-sm">Loading QC lots…</div>
                ) : error ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-bold">{error}</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-20 text-gray-300">
                        <div className="text-6xl mb-3 opacity-20">✓</div>
                        <p className="text-sm font-bold text-gray-400">No lots currently on hold or in quarantine</p>
                        <p className="text-xs text-gray-300 mt-1">Use the Hold Lot button above to place an available lot under QC review</p>
                    </div>
                ) : (
                    <div className="bg-white border-2 border-gray-100 rounded-xl shadow overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-[#003366] text-white">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Lot #</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Item</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Status</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase">Qty on Hold</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Vendor</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Received</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Expiry</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Last QC Action</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((lot, i) => {
                                    const lastQC = lot.qcHistory && lot.qcHistory.length > 0
                                        ? lot.qcHistory[lot.qcHistory.length - 1]
                                        : null;
                                    const isExpired = lot.expirationDate && new Date(lot.expirationDate) < new Date();
                                    return (
                                        <tr key={lot._id} className={`hover:bg-orange-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                                            <td className="px-4 py-3 font-mono font-black text-[#003366] text-xs">{lot.lotNumber}</td>
                                            <td className="px-4 py-3 font-bold text-slate-700 text-xs">{lot.itemName || itemMap[lot.itemId] || lot.itemId}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_PILL[lot.lotStatus] || STATUS_PILL['available']}`}>
                                                    {lot.lotStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-black text-orange-700 text-sm">{lot.quantityRemaining}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600">{lot.vendorName || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{lot.dateReceived ? new Date(lot.dateReceived).toLocaleDateString() : '—'}</td>
                                            <td className="px-4 py-3 text-xs">
                                                {lot.expirationDate
                                                    ? <span className={isExpired ? 'font-black text-red-600' : 'text-gray-500'}>{new Date(lot.expirationDate).toLocaleDateString()}{isExpired && ' ⚠️'}</span>
                                                    : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-[10px] text-gray-500">
                                                {lastQC ? (
                                                    <div>
                                                        <span className={`font-black uppercase ${lastQC.action === 'released' ? 'text-green-700' : 'text-orange-700'}`}>{lastQC.action}</span>
                                                        <span className="block text-gray-400">{new Date(lastQC.date).toLocaleDateString()} · {lastQC.by}</span>
                                                        {(lastQC.reason || lastQC.notes) && <span className="italic text-gray-400">{lastQC.reason || lastQC.notes}</span>}
                                                    </div>
                                                ) : <span className="text-gray-300">No history</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex gap-2 justify-center">
                                                    {lot.lotStatus !== 'quarantine' && (
                                                        <button
                                                            onClick={() => openModal(lot, 'quarantine')}
                                                            className="px-2 py-1 bg-orange-100 text-orange-700 border border-orange-200 rounded text-[9px] font-black uppercase hover:bg-orange-200 transition-colors"
                                                        >Quarantine</button>
                                                    )}
                                                    {lot.lotStatus !== 'on-hold' && lot.lotStatus !== 'expired' && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedLot(lot);
                                                                setModalMode('quarantine');
                                                                setModalHoldStatus('on-hold');
                                                                setModalReason('');
                                                            }}
                                                            className="px-2 py-1 bg-yellow-100 text-yellow-700 border border-yellow-200 rounded text-[9px] font-black uppercase hover:bg-yellow-200 transition-colors"
                                                        >Hold</button>
                                                    )}
                                                    <button
                                                        onClick={() => openModal(lot, 'release')}
                                                        className="px-2 py-1 bg-green-100 text-green-700 border border-green-200 rounded text-[9px] font-black uppercase hover:bg-green-200 transition-colors"
                                                    >Release</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="px-4 py-2 bg-gray-50 border-t text-[10px] text-gray-400 font-bold">
                            {filtered.length} lot{filtered.length !== 1 ? 's' : ''} shown
                        </div>
                    </div>
                )}
            </div>

            {/* Quarantine / Release Modal */}
            {modalMode && selectedLot && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className={`text-lg font-black mb-1 ${modalMode === 'release' ? 'text-green-700' : 'text-orange-700'}`}>
                            {modalMode === 'release' ? '✓ Release Lot from QC' : '⏸ Quarantine / Hold Lot'}
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Lot: <span className="font-mono font-black text-[#003366]">{selectedLot.lotNumber}</span>
                            &nbsp;·&nbsp;{selectedLot.itemName || itemMap[selectedLot.itemId] || selectedLot.itemId}
                            &nbsp;·&nbsp;<span className="font-bold">{selectedLot.quantityRemaining} units</span>
                        </p>

                        {modalMode === 'quarantine' ? (
                            <>
                                <div className="mb-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Hold Type</label>
                                    <div className="flex gap-3">
                                        {(['on-hold', 'quarantine'] as const).map(s => (
                                            <label key={s} className="flex items-center gap-2 cursor-pointer">
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${modalHoldStatus === s ? 'bg-orange-500 border-orange-600' : 'bg-white border-gray-300'}`}>
                                                    {modalHoldStatus === s && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                </div>
                                                <input type="radio" className="hidden" checked={modalHoldStatus === s} onChange={() => setModalHoldStatus(s)} />
                                                <span className="text-xs font-bold capitalize">{s}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Reason *</label>
                                    <textarea
                                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none h-20"
                                        placeholder="Describe the reason for this hold (e.g. failed inspection, customer complaint…)"
                                        value={modalReason}
                                        onChange={e => setModalReason(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={handleQuarantine}
                                        disabled={!modalReason.trim() || saving}
                                        className="flex-1 py-2.5 bg-orange-600 text-white text-xs font-black uppercase rounded-lg hover:bg-orange-700 disabled:bg-gray-300 transition-all"
                                    >{saving ? 'Saving…' : `Place ${modalHoldStatus === 'quarantine' ? 'in Quarantine' : 'on Hold'}`}</button>
                                    <button onClick={closeModal} className="px-5 py-2.5 bg-white border border-gray-300 text-xs font-bold rounded-lg hover:bg-gray-50">Cancel</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 text-xs text-green-700 font-bold">
                                    Releasing this lot will make it <span className="underline">available</span> for picking and invoicing again.
                                </div>
                                <div className="mb-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Released By</label>
                                    <input
                                        type="text"
                                        placeholder="QC Inspector name"
                                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400"
                                        value={modalReleasedBy}
                                        onChange={e => setModalReleasedBy(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">QC Sign-off Notes</label>
                                    <textarea
                                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400 resize-none h-20"
                                        placeholder="Passed visual inspection, test results within spec, cleared by QC lab…"
                                        value={modalNotes}
                                        onChange={e => setModalNotes(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={handleRelease}
                                        disabled={saving}
                                        className="flex-1 py-2.5 bg-green-600 text-white text-xs font-black uppercase rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-all"
                                    >{saving ? 'Saving…' : 'Release to Available'}</button>
                                    <button onClick={closeModal} className="px-5 py-2.5 bg-white border border-gray-300 text-xs font-bold rounded-lg hover:bg-gray-50">Cancel</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LotQCWorkflow;
