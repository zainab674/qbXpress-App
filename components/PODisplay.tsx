import React from 'react';
import { Transaction, Vendor, Account, QBClass, Item, Warehouse } from '../types';
import { fetchWarehouses } from '../services/api';

const API_BASE = '/api';

async function poApprovalAction(poId: string, action: 'submit-for-approval' | 'approve' | 'reject', notes?: string) {
    const res = await fetch(`${API_BASE}/transactions/${poId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes }),
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Request failed');
    return res.json();
}

interface PODisplayProps {
    po: Transaction;
    vendor: Vendor | undefined;
    items: Item[];
    accounts: Account[];
    classes: QBClass[];
    transactions?: Transaction[];
    onClose: () => void;
    onConvertToBill?: (po: Transaction) => void;
    onReceiveMore?: (po: Transaction) => void;
    onNavigateToTransaction?: (id: string, type: string) => void;
    receipts?: Transaction[]; // All BILL/RECEIVE_ITEM transactions linked to this PO
    onSave?: (po: Transaction) => void;
}

// Map transaction type to label + badge color
const typeLabel = (type: string) => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
        INVOICE: { label: 'Invoice', bg: 'bg-emerald-100', text: 'text-emerald-800' },
        SALES_ORDER: { label: 'Sales Order', bg: 'bg-blue-100', text: 'text-blue-800' },
        PURCHASE_ORDER: { label: 'Purchase Order', bg: 'bg-indigo-100', text: 'text-indigo-800' },
        BILL: { label: 'Bill', bg: 'bg-amber-100', text: 'text-amber-800' },
        RECEIVE_ITEM: { label: 'Item Receipt', bg: 'bg-cyan-100', text: 'text-cyan-800' },
        ESTIMATE: { label: 'Estimate', bg: 'bg-purple-100', text: 'text-purple-800' },
        PAYMENT: { label: 'Payment', bg: 'bg-green-100', text: 'text-green-800' },
        SHIPMENT: { label: 'Shipment', bg: 'bg-violet-100', text: 'text-violet-800' },
    };
    return map[type] || { label: type, bg: 'bg-slate-100', text: 'text-slate-700' };
};

const approvalBadge = (status: string | undefined) => {
    switch (status) {
        case 'PENDING_APPROVAL': return { label: 'Pending Approval', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
        case 'APPROVED':         return { label: 'Approved',         bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300' };
        case 'REJECTED':         return { label: 'Rejected',         bg: 'bg-red-100',    text: 'text-red-800',   border: 'border-red-300' };
        default:                 return { label: 'Draft',            bg: 'bg-slate-100',  text: 'text-slate-600', border: 'border-slate-300' };
    }
};

const PODisplay: React.FC<PODisplayProps> = ({
    po, vendor, items, accounts, classes, transactions = [], onClose,
    onConvertToBill, onReceiveMore, onNavigateToTransaction, receipts = [], onSave
}) => {
    const [showBackorderMenu, setShowBackorderMenu] = React.useState(false);
    const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
    const [approvalStatus, setApprovalStatus] = React.useState<string>(po.approvalStatus || 'DRAFT');
    const [showRejectModal, setShowRejectModal] = React.useState(false);
    const [rejectNotes, setRejectNotes] = React.useState('');
    const [approvalLoading, setApprovalLoading] = React.useState(false);

    React.useEffect(() => {
        fetchWarehouses().then(setWarehouses).catch(() => {});
    }, []);

    const handleApprovalAction = async (action: 'submit-for-approval' | 'approve' | 'reject', notes?: string) => {
        setApprovalLoading(true);
        try {
            const result = await poApprovalAction(po.id, action, notes);
            setApprovalStatus(result.approvalStatus);
            if (onSave) {
                const { _id, __v, ...clean } = po as any;
                onSave({ ...clean, approvalStatus: result.approvalStatus });
            }
            setShowRejectModal(false);
            setRejectNotes('');
        } catch (e) {
            alert((e as Error).message);
        } finally {
            setApprovalLoading(false);
        }
    };

    const shipToWarehouse = warehouses.find((w: Warehouse) => w.id === po.shipToWarehouseId);
    // Resolve all linked docs from all transactions (excluding receipts already shown)
    const receiptIds = new Set(receipts.map(r => r.id));
    const otherLinkedDocs = (po.linkedDocumentIds || [])
        .map(id => transactions.find(t => t.id === id))
        .filter(Boolean)
        .filter(d => !receiptIds.has(d!.id)) as Transaction[];
    const totalAmount = po.total.toLocaleString(undefined, { minimumFractionDigits: 2 });

    const isPartial = po.status === 'PARTIALLY_RECEIVED';
    const isClosed = po.status === 'CLOSED';

    const totalOrdered = po.items.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalReceived = po.items.reduce((s, i) => s + (i.receivedQuantity || 0), 0);
    const overallPct = totalOrdered > 0 ? Math.min(100, (totalReceived / totalOrdered) * 100) : 0;

    return (
        <React.Fragment>
        <div className="h-full bg-slate-100 p-8 overflow-y-auto font-sans">
            <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-sm overflow-hidden min-h-[1056px] flex flex-col border border-slate-300">

                {/* Header / Toolbar */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center no-print">
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

                        {/* Approval Status Badge */}
                        {(() => { const b = approvalBadge(approvalStatus); return (
                            <span className={`${b.bg} ${b.text} border ${b.border} text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full`}>
                                {b.label}
                            </span>
                        ); })()}

                        {/* Status Badge */}
                        {isPartial && (
                            <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                Partially Received
                            </span>
                        )}
                        {isClosed && (
                            <span className="bg-gray-100 text-gray-600 border border-gray-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                Closed
                            </span>
                        )}
                        {po.status === 'OPEN' && (
                            <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                Open
                            </span>
                        )}
                        {po.backorderStatus === 'FULL' && (
                            <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                Fully Backordered
                            </span>
                        )}
                        {po.backorderStatus === 'PARTIAL' && (
                            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                Partial Backorder
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* PO Approval Actions */}
                        {approvalStatus === 'DRAFT' || approvalStatus === 'REJECTED' ? (
                            <button
                                disabled={approvalLoading}
                                onClick={() => handleApprovalAction('submit-for-approval')}
                                className="px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 border bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 disabled:opacity-50"
                            >
                                Submit for Approval
                            </button>
                        ) : approvalStatus === 'PENDING_APPROVAL' ? (
                            <>
                                <button
                                    disabled={approvalLoading}
                                    onClick={() => handleApprovalAction('approve')}
                                    className="px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 border bg-green-100 text-green-800 border-green-300 hover:bg-green-200 disabled:opacity-50"
                                >
                                    Approve
                                </button>
                                <button
                                    disabled={approvalLoading}
                                    onClick={() => setShowRejectModal(true)}
                                    className="px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 border bg-red-100 text-red-800 border-red-300 hover:bg-red-200 disabled:opacity-50"
                                >
                                    Reject
                                </button>
                            </>
                        ) : null}

                        {/* Backorder button for OPEN or PARTIALLY_RECEIVED */}
                        {onSave && (po.status === 'OPEN' || po.status === 'PARTIALLY_RECEIVED') && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowBackorderMenu(v => !v)}
                                    className={`px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 border
                                        ${po.backorderStatus === 'FULL' ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' :
                                            po.backorderStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' :
                                                'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                    {po.backorderStatus === 'FULL' ? 'Fully Backordered' :
                                        po.backorderStatus === 'PARTIAL' ? 'Partial Backorder' : 'Set Backorder'} ▾
                                </button>
                                {showBackorderMenu && (
                                    <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden min-w-[160px]">
                                        {(['NONE', 'PARTIAL', 'FULL'] as const).map(status => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    const { _id, __v, ...clean } = po as any;
                                                    onSave({ ...clean, backorderStatus: status });
                                                    setShowBackorderMenu(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors
                                                    ${po.backorderStatus === status ? 'text-blue-700 bg-blue-50' : 'text-slate-700'}`}
                                            >
                                                {status === 'NONE' ? 'None' : status === 'PARTIAL' ? 'Partial Backorder' : 'Fully Backordered'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Receive More button for OPEN or PARTIALLY_RECEIVED */}
                        {onReceiveMore && (po.status === 'OPEN' || po.status === 'PARTIALLY_RECEIVED') && (
                            <button
                                onClick={() => onReceiveMore(po)}
                                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1.293 13.293A1 1 0 007.28 22h9.44a1 1 0 00.987-1.707L19 8" />
                                </svg>
                                {isPartial ? 'Receive Remaining' : 'Receive Items'}
                            </button>
                        )}

                        {onConvertToBill && (po.status === 'OPEN' || po.status === 'PARTIALLY_RECEIVED') && (
                            <button
                                onClick={() => onConvertToBill(po)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                </svg>
                                {isPartial ? 'Bill Remaining' : 'Convert to Bill'}
                            </button>
                        )}

                        <button
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print PO
                        </button>
                    </div>
                </div>



                {/* PO Content */}
                <div className="p-16 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <h1 className="text-6xl font-serif italic text-slate-900 border-l-8 border-blue-900 pl-6 mb-2">P.O.</h1>
                            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs pl-8">Purchase Order</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4 italic">
                                {vendor?.name || 'Unknown Vendor'}
                            </h2>
                            <div className="text-sm text-slate-500 leading-relaxed font-medium">
                                {vendor?.address ? (
                                    vendor.address.split('\n').map((line, i) => <p key={i}>{line}</p>)
                                ) : (
                                    <p>No address on file</p>
                                )}
                                {vendor?.phone && <p>Tel: {vendor.phone}</p>}
                                {vendor?.email && <p>Email: {vendor.email}</p>}
                            </div>
                        </div>
                    </div>

                    <div className={`grid ${shipToWarehouse ? 'grid-cols-4' : 'grid-cols-3'} gap-12 bg-slate-50 border-y-2 border-slate-200 py-8 px-10 mb-12`}>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Order Date</p>
                            <p className="text-lg font-black text-slate-900 italic">{po.date}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Expected Date</p>
                            <p className="text-lg font-black italic text-slate-900">{po.dueDate || po.date}</p>
                        </div>
                        {shipToWarehouse && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Receiving Warehouse</p>
                                <p className="text-base font-black text-indigo-800">{shipToWarehouse.name}</p>
                                {shipToWarehouse.code && <p className="text-[10px] text-indigo-400 font-mono">[{shipToWarehouse.code}]</p>}
                                {shipToWarehouse.address && <p className="text-[10px] text-slate-400 italic mt-0.5">{shipToWarehouse.address}</p>}
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">P.O. Number</p>
                            <p className="text-lg font-black text-slate-900 font-mono tracking-tighter">#{po.refNo}</p>
                        </div>
                    </div>

                    {/* Line Items Table with Receiving Columns */}
                    <div className="flex-1">
                        <table className="w-full mb-12">
                            <thead>
                                <tr className="border-b-4 border-slate-900">
                                    <th className="text-left py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Item / Description</th>
                                    <th className="text-center py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Qty Ordered</th>
                                    <th className="text-center py-4 text-[11px] font-black uppercase tracking-widest text-amber-500">Rcvd</th>
                                    <th className="text-center py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Remaining</th>
                                    <th className="text-right py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Rate</th>
                                    <th className="text-right py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {po.items.map((item, idx) => {
                                    const serviceItem = items.find(i => i.id === item.itemId);
                                    const rcvd = item.receivedQuantity ?? 0;
                                    const remaining = Math.max(0, item.quantity - rcvd);
                                    const linePct = item.quantity > 0 ? Math.min(100, (rcvd / item.quantity) * 100) : 0;
                                    const lineComplete = rcvd >= item.quantity || item.isClosed;

                                    return (
                                        <tr key={idx} className={`group ${lineComplete ? 'opacity-60' : ''}`}>
                                            <td className="py-5 pr-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-900 text-sm">
                                                            {serviceItem?.name || item.itemId || 'Item'}
                                                        </span>
                                                        {lineComplete && (
                                                            <span className="text-[8px] bg-green-100 text-green-700 font-black uppercase px-1.5 py-0.5 rounded">
                                                                {item.isClosed && rcvd < item.quantity ? 'Closed' : 'Complete'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 font-medium italic mt-1">
                                                        {item.description || '—'}
                                                    </p>
                                                    {item.classId && (
                                                        <span className="text-[9px] font-bold text-blue-600 uppercase mt-1 tracking-tighter px-1.5 py-0.5 bg-blue-50 w-fit rounded">
                                                            Class: {classes.find(c => c.id === item.classId)?.name || item.classId}
                                                        </span>
                                                    )}
                                                    {/* Per-line progress bar */}
                                                    {rcvd > 0 && (
                                                        <div className="mt-2 w-32">
                                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                <div
                                                                    className="h-1.5 rounded-full"
                                                                    style={{
                                                                        width: `${linePct}%`,
                                                                        background: lineComplete ? '#16a34a' : '#f59e0b'
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="text-[8px] text-slate-400 mt-0.5">{linePct.toFixed(0)}% received</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <span className="text-sm font-bold text-slate-500">{item.quantity}</span>
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <span className={`text-sm font-black ${rcvd > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                                                    {rcvd > 0 ? rcvd : '—'}
                                                </span>
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <span className={`text-sm font-black ${remaining > 0 ? 'text-slate-600' : 'text-green-600'}`}>
                                                    {remaining > 0 ? remaining : '✓'}
                                                </span>
                                            </td>
                                            <td className="py-5 px-4 text-right">
                                                <span className="text-sm font-bold text-slate-400">
                                                    ${item.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="py-5 pl-4 text-right">
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

                    {/* Total & Status Footer */}
                    <div className="mt-auto border-t-8 border-slate-900 pt-12">
                        <div className="flex justify-between items-center bg-slate-100 p-8 rounded shadow-inner relative overflow-hidden">
                            {isClosed && (
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] border-8 border-slate-600/20 text-slate-600/20 text-8xl font-black px-12 py-4 pointer-events-none uppercase">
                                    CLOSED
                                </div>
                            )}
                            {isPartial && (
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] border-8 border-amber-400/20 text-amber-400/20 text-5xl font-black px-12 py-4 pointer-events-none uppercase whitespace-nowrap">
                                    PARTIAL
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Total Order Value</p>
                                <p className="text-sm font-bold text-slate-500 italic">Pre-authorized Purchase Order</p>
                            </div>
                            <div className="text-right">
                                <span className="text-6xl font-black italic text-slate-900 tracking-tighter">
                                    ${totalAmount}
                                </span>
                            </div>
                        </div>
                        {po.memo && (
                            <div className="mt-8 border-l-4 border-slate-200 pl-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Vendor Instructions</p>
                                <p className="text-sm text-slate-600 font-medium italic leading-relaxed">{po.memo}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Receipt History Panel */}
                {receipts.length > 0 && (
                    <div className="border-t-2 border-slate-200 bg-slate-50 no-print">
                        <div className="px-8 py-4 border-b border-slate-200 flex items-center gap-3">
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">Receipt History</span>
                            <span className="bg-amber-200 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-full">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="px-8 py-4">
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left pb-2 font-black uppercase text-slate-400 tracking-widest">Ref #</th>
                                        <th className="text-left pb-2 font-black uppercase text-slate-400 tracking-widest">Date</th>
                                        <th className="text-left pb-2 font-black uppercase text-slate-400 tracking-widest">Type</th>
                                        <th className="text-right pb-2 font-black uppercase text-slate-400 tracking-widest">Amount</th>
                                        <th className="text-center pb-2 font-black uppercase text-slate-400 tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {receipts.map((r, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => onNavigateToTransaction?.(r.id, r.type)}
                                            className={`transition-colors ${onNavigateToTransaction ? 'cursor-pointer hover:bg-blue-50 group' : 'hover:bg-white'}`}
                                        >
                                            <td className="py-2.5 font-mono font-bold text-slate-700 group-hover:text-blue-700 transition-colors">
                                                {r.refNo}
                                                {onNavigateToTransaction && (
                                                    <svg className="inline w-3 h-3 text-blue-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                )}
                                            </td>
                                            <td className="py-2.5 text-slate-600">{r.date}</td>
                                            <td className="py-2.5">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${r.type === 'RECEIVE_ITEM' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                    {r.type === 'RECEIVE_ITEM' ? 'Item Receipt' : 'Bill'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 text-right font-mono font-black text-slate-800">
                                                ${r.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-2.5 text-center">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${r.status === 'PAID' || r.status === 'CLOSED' ? 'bg-gray-100 text-gray-500' :
                                                        r.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-200">
                                        <td colSpan={3} className="pt-3 font-black uppercase text-[10px] tracking-widest text-slate-400">Total Received Value</td>
                                        <td className="pt-3 text-right font-black font-mono text-slate-900">
                                            ${receipts.reduce((s, r) => s + r.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* Linked Documents Panel (non-receipt links: e.g. Sales Orders that originated this PO) */}
                {otherLinkedDocs.length > 0 && (
                    <div className="border-t-2 border-slate-200 bg-slate-50 px-8 py-4 no-print">
                        <div className="flex items-center gap-2 mb-3">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Linked Documents</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {otherLinkedDocs.map((doc, i) => {
                                const tl = typeLabel(doc.type);
                                return (
                                    <button
                                        key={i}
                                        onClick={() => onNavigateToTransaction?.(doc.id, doc.type)}
                                        className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded px-3 py-2 transition-all group"
                                    >
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${tl.bg} ${tl.text}`}>
                                            {tl.label}
                                        </span>
                                        <div className="text-left">
                                            <div className="text-[10px] font-black text-slate-800 group-hover:text-blue-700">
                                                #{doc.refNo || doc.id.slice(0, 8)}
                                            </div>
                                            <div className="text-[9px] text-slate-400">{doc.date}</div>
                                        </div>
                                        <svg className="w-3 h-3 text-slate-300 group-hover:text-blue-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Approval Notes Panel (shown when approved or rejected) */}
                {(approvalStatus === 'APPROVED' || approvalStatus === 'REJECTED') && po.approvalNotes && (
                    <div className={`border-t-2 px-8 py-4 no-print ${approvalStatus === 'APPROVED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${approvalStatus === 'APPROVED' ? 'text-green-700' : 'text-red-700'}`}>
                            {approvalStatus === 'APPROVED' ? 'Approval Notes' : 'Rejection Reason'}
                        </p>
                        <p className="text-sm text-slate-700 italic">{po.approvalNotes}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center mt-auto">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black italic">QB</div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Logistics ID</p>
                            <p className="text-xs font-mono">{po.id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl p-8 w-[95vw] h-[95vh] overflow-y-auto">
                    <h3 className="text-base font-black uppercase tracking-widest text-slate-900 mb-4">Reject Purchase Order</h3>
                    <p className="text-sm text-slate-600 mb-4">Provide a reason for rejection (optional):</p>
                    <textarea
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                        rows={4}
                        placeholder="Reason for rejection..."
                        value={rejectNotes}
                        onChange={e => setRejectNotes(e.target.value)}
                    />
                    <div className="flex gap-3 mt-6 justify-end">
                        <button
                            onClick={() => { setShowRejectModal(false); setRejectNotes(''); }}
                            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={approvalLoading}
                            onClick={() => handleApprovalAction('reject', rejectNotes)}
                            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                            Confirm Rejection
                        </button>
                    </div>
                </div>
            </div>
        )}
    </React.Fragment>
    );
};

export default PODisplay;
