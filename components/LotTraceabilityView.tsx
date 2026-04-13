import React, { useState } from 'react';
import { fetchLotForwardTrace, fetchLotBackwardTrace } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LotRecord {
    _id?: string;
    lotNumber: string;
    itemId: string;
    quantityReceived: number;
    quantityRemaining: number;
    dateReceived?: string;
    expirationDate?: string;
    manufacturingDate?: string;
    lotStatus?: string;
    vendorName?: string;
    vendorLotNumber?: string;
    warehouseId?: string;
    binLocation?: string;
    unitCost?: number;
    totalCost?: number;
    notes?: string;
    qcHistory?: { action: string; date: string; by: string; reason?: string; notes?: string }[];
}

interface TraceEntry {
    transactionId: string;
    type: string;
    refNo: string;
    date: string;
    entityId: string;
    status: string;
    lines: { itemId: string; description: string; quantity: number; rate?: number }[];
}

interface Props {
    onClose: () => void;
    initialLotNumber?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    INVOICE: 'bg-blue-100 text-blue-800',
    SALES_ORDER: 'bg-violet-100 text-violet-800',
    SALES_RECEIPT: 'bg-teal-100 text-teal-800',
    SHIPMENT: 'bg-emerald-100 text-emerald-800',
    BILL: 'bg-amber-100 text-amber-800',
    RECEIVE_ITEM: 'bg-orange-100 text-orange-800',
    PURCHASE_ORDER: 'bg-indigo-100 text-indigo-800',
};

const LOT_STATUS_PILL: Record<string, string> = {
    available: 'bg-green-100 text-green-700 border-green-200',
    'on-hold': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    expired: 'bg-red-100 text-red-700 border-red-200',
    quarantine: 'bg-orange-100 text-orange-700 border-orange-200',
    consumed: 'bg-gray-100 text-gray-500 border-gray-200',
};

const fmt = (n?: number) =>
    n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Component ─────────────────────────────────────────────────────────────────

const LotTraceabilityView: React.FC<Props> = ({ onClose, initialLotNumber = '' }) => {
    const [lotNumber, setLotNumber] = useState(initialLotNumber);
    const [input, setInput] = useState(initialLotNumber);
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Forward trace result
    const [forwardResult, setForwardResult] = useState<{ lot: LotRecord | null; forwardRecords: TraceEntry[] } | null>(null);
    // Backward trace result
    const [backwardResult, setBackwardResult] = useState<{ lot: LotRecord | null; vendorName: string | null; vendorLotNumber: string | null; backwardRecords: TraceEntry[] } | null>(null);

    const handleSearch = async () => {
        const q = input.trim();
        if (!q) return;
        setLotNumber(q);
        setLoading(true);
        setError('');
        setForwardResult(null);
        setBackwardResult(null);
        try {
            if (direction === 'forward') {
                const data = await fetchLotForwardTrace(q);
                setForwardResult(data);
            } else {
                const data = await fetchLotBackwardTrace(q);
                setBackwardResult(data);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load trace data');
        } finally {
            setLoading(false);
        }
    };

    const lot = forwardResult?.lot || backwardResult?.lot;
    const records = direction === 'forward' ? (forwardResult?.forwardRecords || []) : (backwardResult?.backwardRecords || []);

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col font-sans">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-300">
                <div className="flex bg-gray-100 text-sm font-bold px-2 pt-1">
                    <button className="px-5 py-2.5 border-t border-l border-r rounded-t-sm bg-white border-gray-400 text-[#003366]">
                        Lot Traceability
                    </button>
                </div>
                <div className="p-2 flex gap-3 bg-white border-t border-gray-300 items-center">
                    <button onClick={onClose} className="flex flex-col items-center group">
                        <div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors text-xl">✖</div>
                        <span className="text-xs font-bold mt-1">Close</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Search Panel */}
                <div className="bg-white border-2 border-blue-100 rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-serif italic text-[#003366] mb-4">Lot Traceability</h2>
                    <p className="text-xs text-gray-500 mb-4">
                        Search any lot number to trace its complete history — from the vendor who supplied it (<span className="font-bold">backward</span>) to the customers who received it (<span className="font-bold">forward</span>).
                    </p>

                    {/* Direction toggle */}
                    <div className="flex gap-3 mb-4">
                        {(['forward', 'backward'] as const).map(dir => (
                            <button
                                key={dir}
                                onClick={() => setDirection(dir)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest border-2 transition-all
                                    ${direction === dir
                                        ? dir === 'forward'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                            : 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                            >
                                {dir === 'forward' ? '→ Forward Trace' : '← Backward Trace'}
                            </button>
                        ))}
                        <div className="ml-2 text-[10px] text-gray-400 self-center max-w-xs">
                            {direction === 'forward'
                                ? 'Which customers / invoices / shipments consumed lot X?'
                                : 'Which vendor / PO / receipt sourced lot X?'}
                        </div>
                    </div>

                    {/* Search bar */}
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Enter lot number (e.g. LOT-2024-001)"
                            className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono font-bold outline-none focus:border-blue-500"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={!input.trim() || loading}
                            className="px-8 py-2.5 bg-[#003366] text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-[#004d99] disabled:bg-gray-300 transition-all shadow-md"
                        >
                            {loading ? 'Searching…' : 'Trace'}
                        </button>
                    </div>

                    {error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-bold">
                            {error}
                        </div>
                    )}
                </div>

                {/* Lot Metadata Card */}
                {lot && (
                    <div className="bg-white border-2 border-gray-100 rounded-xl shadow p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-base font-black text-[#003366] font-mono">Lot: {lot.lotNumber}</h3>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Item ID: {lot.itemId}</p>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${LOT_STATUS_PILL[lot.lotStatus || 'available'] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                {lot.lotStatus || 'available'}
                            </span>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-[11px]">
                            <div><span className="text-gray-400 uppercase text-[9px] font-bold block">Qty Received</span><span className="font-black text-gray-800">{lot.quantityReceived}</span></div>
                            <div><span className="text-gray-400 uppercase text-[9px] font-bold block">Qty Remaining</span><span className="font-black text-gray-800">{lot.quantityRemaining}</span></div>
                            <div><span className="text-gray-400 uppercase text-[9px] font-bold block">Date Received</span><span className="font-black text-gray-800">{lot.dateReceived ? new Date(lot.dateReceived).toLocaleDateString() : '—'}</span></div>
                            <div><span className="text-gray-400 uppercase text-[9px] font-bold block">Expiration</span><span className={`font-black ${lot.expirationDate && new Date(lot.expirationDate) < new Date() ? 'text-red-600' : 'text-gray-800'}`}>{lot.expirationDate ? new Date(lot.expirationDate).toLocaleDateString() : '—'}</span></div>
                            <div><span className="text-gray-400 uppercase text-[9px] font-bold block">Unit Cost</span><span className="font-black text-gray-800">${fmt(lot.unitCost)}</span></div>
                            <div><span className="text-gray-400 uppercase text-[9px] font-bold block">Total Cost</span><span className="font-black text-gray-800">${fmt(lot.totalCost)}</span></div>
                            {(backwardResult?.vendorName || lot.vendorName) && (
                                <div><span className="text-gray-400 uppercase text-[9px] font-bold block">Vendor</span><span className="font-black text-gray-800">{backwardResult?.vendorName || lot.vendorName}</span></div>
                            )}
                            {(backwardResult?.vendorLotNumber || lot.vendorLotNumber) && (
                                <div><span className="text-gray-400 uppercase text-[9px] font-bold block">Vendor Lot #</span><span className="font-black font-mono text-gray-800">{backwardResult?.vendorLotNumber || lot.vendorLotNumber}</span></div>
                            )}
                            {lot.warehouseId && (
                                <div><span className="text-gray-400 uppercase text-[9px] font-bold block">Warehouse</span><span className="font-black text-gray-800">{lot.warehouseId}</span></div>
                            )}
                            {lot.binLocation && (
                                <div><span className="text-gray-400 uppercase text-[9px] font-bold block">Bin</span><span className="font-black text-gray-800">{lot.binLocation}</span></div>
                            )}
                        </div>
                        {lot.notes && (
                            <p className="mt-3 text-[10px] text-gray-500 italic border-t pt-2">{lot.notes}</p>
                        )}
                        {lot.qcHistory && lot.qcHistory.length > 0 && (
                            <div className="mt-3 border-t pt-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">QC History</p>
                                <div className="flex flex-col gap-1">
                                    {lot.qcHistory.map((h, i) => (
                                        <div key={i} className="flex items-start gap-2 text-[10px]">
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${h.action === 'released' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{h.action}</span>
                                            <span className="text-gray-500">{new Date(h.date).toLocaleString()}</span>
                                            <span className="text-gray-600 font-bold">by {h.by}</span>
                                            {(h.reason || h.notes) && <span className="text-gray-400 italic">{h.reason || h.notes}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Trace Results */}
                {(forwardResult || backwardResult) && (
                    <div className="bg-white border-2 border-gray-100 rounded-xl shadow overflow-hidden">
                        <div className={`px-6 py-3 flex items-center gap-3 ${direction === 'forward' ? 'bg-blue-50 border-b border-blue-100' : 'bg-emerald-50 border-b border-emerald-100'}`}>
                            <span className="text-sm font-black uppercase tracking-widest text-gray-700">
                                {direction === 'forward' ? '→ Forward Trace' : '← Backward Trace'} — Lot {lotNumber}
                            </span>
                            <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${direction === 'forward' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                {records.length} transaction{records.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {records.length === 0 ? (
                            <div className="p-10 text-center text-gray-400 italic text-sm">
                                {direction === 'forward'
                                    ? 'No sales transactions found for this lot number.'
                                    : 'No source purchase transactions found for this lot number.'}
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-500">Type</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-500">Ref #</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-500">Date</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-500">{direction === 'forward' ? 'Customer' : 'Vendor'}</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-500">Status</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-500">Line Items</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {records.map((rec, i) => (
                                        <tr key={i} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[rec.type] || 'bg-gray-100 text-gray-600'}`}>
                                                    {rec.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono font-black text-[#003366] text-xs">#{rec.refNo}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600">{rec.date}</td>
                                            <td className="px-4 py-3 text-xs text-gray-700 font-bold truncate max-w-[120px]">{rec.entityId}</td>
                                            <td className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">{rec.status}</td>
                                            <td className="px-4 py-3">
                                                {rec.lines.map((l, j) => (
                                                    <div key={j} className="text-[10px] text-gray-600">
                                                        <span className="font-bold">{l.description || l.itemId}</span>
                                                        <span className="ml-2 text-gray-400">× {l.quantity}</span>
                                                    </div>
                                                ))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Empty state */}
                {!loading && !forwardResult && !backwardResult && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                        <div className="text-7xl mb-4 opacity-20">🏷️</div>
                        <p className="text-sm font-bold">Enter a lot number above to trace its history</p>
                        <p className="text-xs mt-1 opacity-70">Forward trace shows customers — backward trace shows the source vendor</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LotTraceabilityView;
