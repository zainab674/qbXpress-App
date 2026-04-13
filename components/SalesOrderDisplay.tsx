import React from 'react';
import { Transaction, Customer, Item, QBClass, Warehouse } from '../types';
import { fetchWarehouses } from '../services/api';

interface SalesOrderDisplayProps {
    salesOrder: Transaction;
    customer: Customer | undefined;
    items: Item[];
    classes: QBClass[];
    transactions: Transaction[];
    onClose: () => void;
    onConvertToInvoice?: (salesOrder: Transaction) => void;
    onCreatePO?: (salesOrder: Transaction) => void;
    onNavigateToTransaction?: (id: string, type: string) => void;
    onSave?: (so: Transaction) => void;
    onPickPackShip?: (salesOrder: Transaction) => void;
}

// Map transaction type to a human-readable label and type badge color
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

const SalesOrderDisplay: React.FC<SalesOrderDisplayProps> = ({
    salesOrder, customer, items, classes, transactions, onClose,
    onConvertToInvoice, onCreatePO, onNavigateToTransaction, onSave, onPickPackShip
}) => {
    const [showBackorderMenu, setShowBackorderMenu] = React.useState(false);
    const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);

    React.useEffect(() => {
        fetchWarehouses().then(setWarehouses).catch(() => {});
    }, []);

    const fulfillmentWarehouse = warehouses.find((w: Warehouse) => w.id === salesOrder.fulfillmentWarehouseId);
    const totalAmount = salesOrder.total.toLocaleString(undefined, { minimumFractionDigits: 2 });

    // Linked documents resolved from all transactions
    const linkedDocs = (salesOrder.linkedDocumentIds || [])
        .map(id => transactions.find(t => t.id === id))
        .filter(Boolean) as Transaction[];

    const linkedShipments = linkedDocs.filter(d => d.type === 'SHIPMENT');
    const nonShipmentDocs = linkedDocs.filter(d => d.type !== 'SHIPMENT');

    // Backorder analysis: compare SO line quantities vs total invoiced
    const linkedInvoices = linkedDocs.filter(d => d.type === 'INVOICE');
    const invoicedQtyMap: Record<string, number> = {};
    for (const inv of linkedInvoices) {
        for (const li of inv.items) {
            const key = li.itemId || li.id!;
            invoicedQtyMap[key] = (invoicedQtyMap[key] || 0) + (li.quantity || 0);
        }
    }
    const backorderedLines = salesOrder.items.map(soLine => {
        const key = soLine.itemId || soLine.id!;
        const ordered = soLine.quantity || 0;
        const invoiced = Math.min(invoicedQtyMap[key] || 0, ordered);
        const remaining = ordered - invoiced;
        return { ...soLine, ordered, invoiced, remaining };
    }).filter(l => l.remaining > 0);

    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'Accepted':
            case 'Complete': return 'text-green-600 border-green-600/20';
            case 'Converted': return 'text-blue-600 border-blue-600/20';
            case 'Declined': return 'text-red-600 border-red-600/20';
            default: return 'text-amber-600 border-amber-600/20';
        }
    };

    return (
        <div className="h-full bg-slate-100 p-8 overflow-y-auto font-sans">
            <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-sm overflow-hidden min-h-[1056px] flex flex-col border border-slate-300 relative">

                {/* Status Watermark */}
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] border-[12px] ${getStatusColor(salesOrder.status)} text-opacity-20 text-8xl font-black px-12 py-4 pointer-events-none uppercase tracking-tighter opacity-10 z-0`}>
                    {salesOrder.status || 'OPEN'}
                </div>

                {/* Header / Toolbar */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center no-print z-10">
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
                    </div>
                    <div className="flex items-center gap-2">
                        {(salesOrder.status === 'Open' || salesOrder.status === 'OPEN' || !salesOrder.status) && onSave && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowBackorderMenu(v => !v)}
                                    className={`px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 mr-2 border
                                        ${salesOrder.backorderStatus === 'FULL' ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' :
                                          salesOrder.backorderStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' :
                                          'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                    {salesOrder.backorderStatus === 'FULL' ? 'Fully Backordered' :
                                     salesOrder.backorderStatus === 'PARTIAL' ? 'Partial Backorder' : 'Set Backorder'} ▾
                                </button>
                                {showBackorderMenu && (
                                    <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden min-w-[160px]">
                                        {(['NONE', 'PARTIAL', 'FULL'] as const).map(status => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    const { _id, __v, ...clean } = salesOrder as any;
                                                    onSave({ ...clean, backorderStatus: status });
                                                    setShowBackorderMenu(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors
                                                    ${salesOrder.backorderStatus === status ? 'text-blue-700 bg-blue-50' : 'text-slate-700'}`}
                                            >
                                                {status === 'NONE' ? 'None' : status === 'PARTIAL' ? 'Partial Backorder' : 'Fully Backordered'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {(salesOrder.status === 'Open' || salesOrder.status === 'OPEN' || !salesOrder.status) && onCreatePO && (
                            <button
                                onClick={() => onCreatePO(salesOrder)}
                                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 mr-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1.293 13.293A1 1 0 007.28 22h9.44a1 1 0 00.987-1.707L19 8" />
                                </svg>
                                Create P.O.
                            </button>
                        )}
                        {(salesOrder.status === 'Open' || salesOrder.status === 'OPEN' || !salesOrder.status) && onPickPackShip && (
                            <button
                                onClick={() => onPickPackShip(salesOrder)}
                                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 mr-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                                </svg>
                                Pick, Pack &amp; Ship
                            </button>
                        )}
                        {(salesOrder.status === 'Open' || salesOrder.status === 'OPEN' || !salesOrder.status) && onConvertToInvoice && (
                            <button
                                onClick={() => onConvertToInvoice(salesOrder)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 mr-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Convert to Invoice
                            </button>
                        )}
                        <button
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Sales Order
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-16 flex-1 flex flex-col z-10 relative">
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <h1 className="text-6xl font-serif italic text-slate-900 border-l-8 border-blue-900 pl-6 mb-2 uppercase">Sales Order</h1>
                            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] pl-8">Order Confirmation</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4 italic">
                                {customer?.name || 'Unknown Customer'}
                            </h2>
                            <div className="text-sm text-slate-500 leading-relaxed font-medium">
                                {salesOrder.BillAddr?.Line1 ? (
                                    <p>{salesOrder.BillAddr.Line1}</p>
                                ) : customer?.address ? (
                                    customer.address.split('\n').map((line, i) => <p key={i}>{line}</p>)
                                ) : (
                                    <p>No address on file</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={`grid ${fulfillmentWarehouse ? 'grid-cols-5' : 'grid-cols-4'} gap-12 bg-slate-50 border-y-2 border-slate-200 py-8 px-10 mb-12`}>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Order Date</p>
                            <p className="text-lg font-black text-slate-900 italic">{salesOrder.date}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
                            <p className={`text-lg font-black italic ${salesOrder.status === 'Converted' ? 'text-blue-600' : 'text-amber-600'}`}>
                                {salesOrder.status || 'Open'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1">Fulfillment</p>
                            {(() => {
                                const fs = (salesOrder as any).fulfillmentStatus || 'UNFULFILLED';
                                const map: Record<string, { label: string; color: string }> = {
                                    FULFILLED: { label: 'Fulfilled', color: 'text-violet-700' },
                                    PARTIALLY_FULFILLED: { label: 'Partial', color: 'text-amber-600' },
                                    UNFULFILLED: { label: 'Unfulfilled', color: 'text-slate-400' },
                                };
                                const m = map[fs] || map.UNFULFILLED;
                                return <p className={`text-lg font-black italic ${m.color}`}>{m.label}</p>;
                            })()}
                        </div>
                        {fulfillmentWarehouse && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1">Fulfillment Site</p>
                                <p className="text-base font-black text-violet-800">{fulfillmentWarehouse.name}</p>
                                {fulfillmentWarehouse.code && <p className="text-[10px] text-violet-400 font-mono">[{fulfillmentWarehouse.code}]</p>}
                                {fulfillmentWarehouse.address && <p className="text-[10px] text-slate-400 italic mt-0.5">{fulfillmentWarehouse.address}</p>}
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Sales Order No.</p>
                            <p className="text-lg font-black text-slate-900 font-mono tracking-tighter">#{salesOrder.refNo}</p>
                        </div>
                    </div>

                    <div className="flex-1">
                        <table className="w-full mb-12">
                            <thead>
                                <tr className="border-b-4 border-slate-900">
                                    <th className="text-left py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                    <th className="text-left py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Description</th>
                                    <th className="text-center py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                                    <th className="text-center py-4 text-[11px] font-black uppercase tracking-widest text-violet-500">Fulfilled</th>
                                    <th className="text-center py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Remaining</th>
                                    <th className="text-right py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Rate</th>
                                    <th className="text-right py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {salesOrder.items.map((item, idx) => {
                                    const productItem = items.find(i => i.id === item.itemId);
                                    const fulfilled = (item as any).fulfilledQty || 0;
                                    const remaining = Math.max(0, item.quantity - fulfilled);
                                    const linePct = item.quantity > 0 ? Math.min(100, (fulfilled / item.quantity) * 100) : 0;
                                    const lineComplete = fulfilled >= item.quantity;
                                    return (
                                        <tr key={idx} className={`group ${lineComplete ? 'opacity-70' : ''}`}>
                                            <td className="py-6 pr-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-900 text-sm">
                                                            {productItem?.name || item.itemId || 'Item'}
                                                        </span>
                                                        {lineComplete && (
                                                            <span className="text-[8px] bg-violet-100 text-violet-700 font-black uppercase px-1.5 py-0.5 rounded">Fulfilled</span>
                                                        )}
                                                    </div>
                                                    {item.lotNumber && (
                                                        <span className="text-[10px] font-black text-purple-700 uppercase mt-1 tracking-tighter px-2 py-0.5 bg-purple-50 w-fit rounded border border-purple-200">
                                                            Lot: {item.lotNumber}
                                                        </span>
                                                    )}
                                                    {fulfilled > 0 && (
                                                        <div className="mt-2 w-28">
                                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                <div className="h-1.5 rounded-full" style={{ width: `${linePct}%`, background: lineComplete ? '#7c3aed' : '#8b5cf6' }} />
                                                            </div>
                                                            <p className="text-[8px] text-slate-400 mt-0.5">{linePct.toFixed(0)}% fulfilled</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-6 px-4">
                                                <p className="text-sm text-slate-600 font-medium italic">
                                                    {item.description || '-'}
                                                </p>
                                            </td>
                                            <td className="py-6 px-4 text-center">
                                                <span className="text-sm font-bold text-slate-400">{item.quantity}</span>
                                            </td>
                                            <td className="py-6 px-4 text-center">
                                                <span className={`text-sm font-black ${fulfilled > 0 ? 'text-violet-600' : 'text-slate-300'}`}>
                                                    {fulfilled > 0 ? fulfilled : '—'}
                                                </span>
                                            </td>
                                            <td className="py-6 px-4 text-center">
                                                <span className={`text-sm font-black ${remaining > 0 ? 'text-slate-600' : 'text-violet-600'}`}>
                                                    {remaining > 0 ? remaining : '✓'}
                                                </span>
                                            </td>
                                            <td className="py-6 px-4 text-right">
                                                <span className="text-sm font-bold text-slate-400">
                                                    PKR{item.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="py-6 pl-4 text-right">
                                                <span className="text-sm font-black text-slate-900">
                                                    PKR{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Backorder Status Panel ─────────────────────────────────────────────── */}
                    {(salesOrder.backorderStatus === 'FULL' || salesOrder.backorderStatus === 'PARTIAL' || backorderedLines.length > 0) && (
                        <div className="mb-8 bg-amber-50 border border-amber-200 rounded p-5 no-print">
                            <div className="flex items-center gap-2 mb-3">
                                <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                                    Backorder Status —{' '}
                                    <span className={salesOrder.backorderStatus === 'FULL' ? 'text-red-700' : 'text-amber-700'}>
                                        {salesOrder.backorderStatus === 'FULL' ? 'Fully Backordered' : salesOrder.backorderStatus === 'PARTIAL' ? 'Partially Backordered' : 'Items Pending Fulfillment'}
                                    </span>
                                </span>
                            </div>
                            {backorderedLines.length > 0 ? (
                                <table className="w-full text-[11px]">
                                    <thead>
                                        <tr className="border-b border-amber-200">
                                            <th className="text-left pb-2 font-black uppercase text-amber-600 tracking-widest">Item</th>
                                            <th className="text-center pb-2 font-black uppercase text-amber-600 tracking-widest">Ordered</th>
                                            <th className="text-center pb-2 font-black uppercase text-amber-600 tracking-widest">Invoiced</th>
                                            <th className="text-center pb-2 font-black uppercase text-amber-600 tracking-widest">Remaining B/O</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-amber-100">
                                        {backorderedLines.map((l, i) => {
                                            const itemMaster = items.find(it => it.id === (l.itemId || l.id));
                                            const pct = l.ordered > 0 ? Math.round((l.invoiced / l.ordered) * 100) : 0;
                                            return (
                                                <tr key={i}>
                                                    <td className="py-2 font-bold text-slate-800">{itemMaster?.name || l.description || 'Item'}</td>
                                                    <td className="py-2 text-center text-slate-600">{l.ordered}</td>
                                                    <td className="py-2 text-center text-emerald-700 font-bold">{l.invoiced}</td>
                                                    <td className="py-2 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="font-black text-red-700">{l.remaining}</span>
                                                            <div className="w-20 bg-amber-100 rounded-full h-1.5 overflow-hidden">
                                                                <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                                                            </div>
                                                            <span className="text-[9px] text-amber-600">{pct}% fulfilled</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-[10px] text-amber-600 italic">All line items are awaiting invoicing.</p>
                            )}
                        </div>
                    )}

                    {/* ── Shipment History Panel ─────────────────────────────────────────────── */}
                    {linkedShipments.length > 0 && (
                        <div className="mb-8 bg-violet-50 border border-violet-200 rounded p-5 no-print">
                            <div className="flex items-center gap-2 mb-3">
                                <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                                </svg>
                                <span className="text-[10px] font-black uppercase tracking-widest text-violet-700">Shipment History</span>
                                <span className="bg-violet-200 text-violet-900 text-[9px] font-black px-2 py-0.5 rounded-full">{linkedShipments.length}</span>
                            </div>
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="border-b border-violet-200">
                                        <th className="text-left pb-2 font-black uppercase text-violet-400 tracking-widest">Ref #</th>
                                        <th className="text-left pb-2 font-black uppercase text-violet-400 tracking-widest">Date</th>
                                        <th className="text-left pb-2 font-black uppercase text-violet-400 tracking-widest">Carrier</th>
                                        <th className="text-left pb-2 font-black uppercase text-violet-400 tracking-widest">Tracking</th>
                                        <th className="text-center pb-2 font-black uppercase text-violet-400 tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-violet-100">
                                    {linkedShipments.map((s, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => onNavigateToTransaction?.(s.id, s.type)}
                                            className={`transition-colors ${onNavigateToTransaction ? 'cursor-pointer hover:bg-violet-100 group' : ''}`}
                                        >
                                            <td className="py-2.5 font-mono font-bold text-violet-800 group-hover:text-violet-900">{s.refNo || s.id.slice(0, 8)}</td>
                                            <td className="py-2.5 text-slate-600">{s.date}</td>
                                            <td className="py-2.5 font-bold text-slate-700">{(s as any).carrier || '—'}</td>
                                            <td className="py-2.5 font-mono text-slate-500">{s.trackingNo || '—'}</td>
                                            <td className="py-2.5 text-center">
                                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                    {s.status || 'Shipped'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Linked Documents Panel ─────────────────────────────────────────────── */}
                    {nonShipmentDocs.length > 0 && (
                        <div className="mb-8 bg-slate-50 border border-slate-200 rounded p-5 no-print">
                            <div className="flex items-center gap-2 mb-3">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Linked Documents</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {nonShipmentDocs.map((doc, i) => {
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

                    <div className="mt-auto border-t-8 border-slate-900 pt-12">
                        <div className="flex justify-between items-center bg-slate-100 p-8 rounded shadow-inner">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Total Order Amount</p>
                                <p className="text-sm font-bold text-slate-500 italic">Thank you for your business.</p>
                            </div>
                            <div className="text-right">
                                <span className="text-6xl font-black italic text-slate-900 tracking-tighter">
                                    PKR{totalAmount}
                                </span>
                            </div>
                        </div>
                        {salesOrder.memo && (
                            <div className="mt-8 border-l-4 border-slate-200 pl-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Internal Note</p>
                                <p className="text-sm text-slate-600 font-medium italic leading-relaxed">{salesOrder.memo}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center mt-auto z-10">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black italic">SO</div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Reference ID</p>
                            <p className="text-xs font-mono">{salesOrder.id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesOrderDisplay;
