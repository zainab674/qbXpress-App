import React, { useState } from 'react';
import { fetchSerialHistory } from '../services/api';

interface HistoryEvent {
    event: string;
    date?: string;
    refNo: string;
    entityName: string;
    notes: string;
}

interface SerialRecord {
    serialNumber: string;
    itemId: string;
    status: string;
    unitCost?: number;
    dateReceived?: string;
    dateSold?: string;
    warrantyExpiry?: string;
    expirationDate?: string;
    manufacturingDate?: string;
    purchaseOrderId?: string;
    invoiceId?: string;
    customerId?: string;
    customerName?: string;
    vendorName?: string;
    warehouseId?: string;
    binLocation?: string;
    lotNumber?: string;
    notes?: string;
}

interface Props {
    onClose: () => void;
    initialSerialNumber?: string;
}

const STATUS_PILL: Record<string, string> = {
    'in-stock':    'bg-green-100 text-green-700 border-green-200',
    'sold':        'bg-blue-100 text-blue-700 border-blue-200',
    'transferred': 'bg-violet-100 text-violet-700 border-violet-200',
    'returned':    'bg-amber-100 text-amber-700 border-amber-200',
    'scrapped':    'bg-gray-100 text-gray-500 border-gray-200',
    'on-hold':     'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const EVENT_ICON: Record<string, string> = {
    'Received':       '📥',
    'Sold / Invoiced':'🧾',
    'Returned':       '↩️',
    'Transferred':    '📦',
    'Scrapped':       '🗑️',
};

const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const SerialHistoryView: React.FC<Props> = ({ onClose, initialSerialNumber = '' }) => {
    const [input, setInput] = useState(initialSerialNumber);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ serialNumber: SerialRecord; itemName: string; history: HistoryEvent[] } | null>(null);

    const handleSearch = async () => {
        const q = input.trim();
        if (!q) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await fetchSerialHistory(q);
            setResult(data);
        } catch (err: any) {
            setError(err?.message || 'Serial number not found.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col font-sans">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-300">
                <div className="flex bg-gray-100 text-sm font-bold px-2 pt-1">
                    <button className="px-5 py-2.5 border-t border-l border-r rounded-t-sm bg-white border-gray-400 text-[#003366]">
                        Serial Number History
                    </button>
                </div>
                <div className="p-2 flex gap-4 bg-white border-t border-gray-300">
                    <button onClick={onClose} className="flex flex-col items-center group">
                        <div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors text-xl">✖</div>
                        <span className="text-xs font-bold mt-1">Close</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Search Bar */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                        Look Up Serial Number — Where-Used Trace
                    </p>
                    <div className="flex gap-3 items-center">
                        <input
                            type="text"
                            placeholder="Enter serial number…"
                            className="flex-1 border-2 border-teal-200 rounded-lg px-4 py-2 text-sm font-bold text-teal-900 outline-none focus:border-teal-500 bg-teal-50/20"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={loading || !input.trim()}
                            className="bg-teal-600 text-white px-8 py-2 rounded-lg font-black text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors shadow"
                        >
                            {loading ? 'Searching…' : 'Search'}
                        </button>
                    </div>
                    {error && (
                        <div className="mt-3 text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                            {error}
                        </div>
                    )}
                </div>

                {result && (
                    <>
                        {/* Serial Info Card */}
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-[#003366] text-white px-5 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🔖</span>
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-widest text-teal-300">Serial Number</div>
                                        <div className="text-xl font-black font-mono">{result.serialNumber.serialNumber}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${STATUS_PILL[result.serialNumber.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                        {result.serialNumber.status}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100 text-sm">
                                <div className="p-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Item</div>
                                    <div className="font-bold text-gray-800">{result.itemName}</div>
                                </div>
                                <div className="p-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Unit Cost</div>
                                    <div className="font-mono font-bold text-gray-800">
                                        {result.serialNumber.unitCost != null ? `$${result.serialNumber.unitCost.toFixed(2)}` : '—'}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Warehouse / Bin</div>
                                    <div className="font-bold text-gray-800">
                                        {result.serialNumber.warehouseId || 'Default'}
                                        {result.serialNumber.binLocation ? ` › ${result.serialNumber.binLocation}` : ''}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Date Received</div>
                                    <div className="font-bold text-gray-700">{fmt(result.serialNumber.dateReceived)}</div>
                                </div>
                                <div className="p-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Date Sold</div>
                                    <div className="font-bold text-gray-700">{fmt(result.serialNumber.dateSold)}</div>
                                </div>
                                <div className="p-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Warranty Expiry</div>
                                    <div className="font-bold text-gray-700">{fmt(result.serialNumber.warrantyExpiry)}</div>
                                </div>
                                {result.serialNumber.vendorName && (
                                    <div className="p-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Vendor</div>
                                        <div className="font-bold text-gray-700">{result.serialNumber.vendorName}</div>
                                    </div>
                                )}
                                {result.serialNumber.customerName && (
                                    <div className="p-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Sold To</div>
                                        <div className="font-bold text-gray-700">{result.serialNumber.customerName}</div>
                                    </div>
                                )}
                                {result.serialNumber.lotNumber && (
                                    <div className="p-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Lot #</div>
                                        <div className="font-mono font-bold text-purple-800">{result.serialNumber.lotNumber}</div>
                                    </div>
                                )}
                                {result.serialNumber.notes && (
                                    <div className="p-4 col-span-3">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Notes</div>
                                        <div className="text-gray-600 italic text-sm">{result.serialNumber.notes}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                                Transaction History / Where-Used Trail
                            </div>
                            <div className="relative">
                                {/* vertical line */}
                                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                                <div className="space-y-4">
                                    {result.history.map((ev, i) => (
                                        <div key={i} className="flex gap-4 items-start pl-2">
                                            <div className="w-6 h-6 rounded-full bg-white border-2 border-teal-400 flex items-center justify-center text-xs z-10 flex-shrink-0 mt-0.5">
                                                {EVENT_ICON[ev.event] || '•'}
                                            </div>
                                            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-black uppercase tracking-widest text-teal-800">{ev.event}</span>
                                                    <span className="text-[10px] text-gray-400 font-mono">{fmt(ev.date)}</span>
                                                </div>
                                                <div className="flex gap-4 text-xs text-gray-600">
                                                    {ev.refNo !== '—' && (
                                                        <span><span className="font-bold text-gray-500">Ref:</span> {ev.refNo}</span>
                                                    )}
                                                    {ev.entityName !== '—' && (
                                                        <span><span className="font-bold text-gray-500">Entity:</span> {ev.entityName}</span>
                                                    )}
                                                    {ev.notes && (
                                                        <span className="italic text-gray-400">{ev.notes}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {!result && !loading && !error && (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-300 italic text-sm gap-3">
                        <span className="text-5xl opacity-20">🔖</span>
                        Enter a serial number above to view its full transaction history.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SerialHistoryView;
