
import React, { useState, useMemo } from 'react';
import { Transaction, Item } from '../types';

interface Props {
    transactions: Transaction[];
    items: Item[];
    onOpenWorkOrder: (wo: Transaction) => void;
    onNewWorkOrder: () => void;
    onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    PARTIAL_COMPLETE: 'bg-orange-100 text-orange-800',
    COMPLETE: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-200 text-gray-500',
};

const WorkOrderCenter: React.FC<Props> = ({ transactions, items, onOpenWorkOrder, onNewWorkOrder, onClose }) => {
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [activeView, setActiveView] = useState<'list' | 'mrp'>('list');

    const workOrders = transactions.filter(t => t.type === 'WORK_ORDER');

    const filtered = workOrders.filter(wo => {
        const matchSearch =
            !search ||
            (wo.refNo || '').toLowerCase().includes(search.toLowerCase()) ||
            (wo.items?.[0]?.description || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'ALL' || wo.workOrderStatus === filterStatus;
        return matchSearch && matchStatus;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const getAssemblyName = (wo: Transaction) => {
        const itemId = wo.items?.[0]?.id;
        return items.find(i => i.id === itemId)?.name || wo.items?.[0]?.description || '—';
    };

    const totalOpen = workOrders.filter(w => w.workOrderStatus === 'OPEN' || w.workOrderStatus === 'IN_PROGRESS').length;
    const totalComplete = workOrders.filter(w => w.workOrderStatus === 'COMPLETE').length;

    // MRP: compute total material demand across all open/in-progress WOs
    const mrpDemand = useMemo(() => {
        const activeWOs = workOrders.filter(w =>
            w.workOrderStatus === 'OPEN' || w.workOrderStatus === 'IN_PROGRESS' || w.workOrderStatus === 'PARTIAL_COMPLETE'
        );
        const demandMap: Record<string, { itemId: string; name: string; totalNeeded: number; onHand: number; uom: string }> = {};

        activeWOs.forEach(wo => {
            const assemblyId = wo.items?.[0]?.id;
            if (!assemblyId) return;
            const assembly = items.find(i => i.id === assemblyId);
            if (!assembly?.assemblyItems) return;

            const planned = wo.quantityPlanned || 0;
            const completed = wo.quantityCompleted || 0;
            const remaining = Math.max(0, planned - completed);

            assembly.assemblyItems.forEach(comp => {
                const compItem = items.find(i => i.id === comp.itemId);
                const scrap = (comp as any).scrapPercent || 0;
                const yield_ = (comp as any).yieldPercent || 100;
                const effQty = comp.quantity * (1 + scrap / 100) / (yield_ / 100);
                const needed = effQty * remaining;

                if (!demandMap[comp.itemId]) {
                    demandMap[comp.itemId] = {
                        itemId: comp.itemId,
                        name: compItem?.name || 'Unknown',
                        totalNeeded: 0,
                        onHand: compItem?.onHand || 0,
                        uom: (compItem as any)?.uom || '',
                    };
                }
                demandMap[comp.itemId].totalNeeded += needed;
            });
        });

        return Object.values(demandMap).sort((a, b) => {
            const aShort = Math.max(0, a.totalNeeded - a.onHand);
            const bShort = Math.max(0, b.totalNeeded - b.onHand);
            return bShort - aShort; // shortages first
        });
    }, [workOrders, items]);

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
            <div className="bg-white border border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-4 bg-[#003366] text-white flex justify-between items-center select-none">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📋</span>
                        <h2 className="text-lg font-bold">Work Order Center</h2>
                    </div>
                    <button onClick={onClose} className="hover:bg-red-600 px-2">✕</button>
                </div>

                {/* Summary strip */}
                <div className="flex gap-4 px-5 py-3 bg-[#f7f9fc] border-b text-xs font-bold">
                    <div className="text-blue-700">Open / In Progress: <span className="text-lg ml-1">{totalOpen}</span></div>
                    <div className="text-green-700">Complete: <span className="text-lg ml-1">{totalComplete}</span></div>
                    <div className="text-gray-500">Total: <span className="text-lg ml-1">{workOrders.length}</span></div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-3 px-4 py-2 border-b bg-white">
                    <button
                        onClick={onNewWorkOrder}
                        className="bg-[#003366] text-white px-4 py-1.5 text-xs font-bold rounded hover:bg-blue-900 shadow"
                    >
                        + New Work Order
                    </button>
                    {activeView === 'list' && <>
                        <input
                            type="text"
                            placeholder="Search WO #, assembly..."
                            className="border px-3 py-1.5 text-xs outline-none w-56 rounded"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <select
                            className="border px-2 py-1.5 text-xs outline-none rounded"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="PARTIAL_COMPLETE">Partial Complete</option>
                            <option value="COMPLETE">Complete</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </>}
                    <div className="ml-auto flex border border-gray-200 rounded overflow-hidden text-[11px] font-bold">
                        <button
                            onClick={() => setActiveView('list')}
                            className={`px-3 py-1.5 transition-colors ${activeView === 'list' ? 'bg-[#003366] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                        >
                            Work Orders
                        </button>
                        <button
                            onClick={() => setActiveView('mrp')}
                            className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${activeView === 'mrp' ? 'bg-[#003366] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                        >
                            MRP
                        </button>
                    </div>
                </div>

                {/* MRP Panel */}
                {activeView === 'mrp' && (
                    <div className="flex-1 overflow-auto p-4">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Material Requirements Planning</div>
                        <p className="text-[10px] text-gray-400 italic mb-4">
                            Demand across all open / in-progress work orders vs. current on-hand inventory.
                        </p>
                        {mrpDemand.length === 0 ? (
                            <div className="p-16 text-center text-gray-300 font-serif italic text-lg">
                                No active work orders with BOM components found.
                            </div>
                        ) : (
                            <table className="w-full text-xs text-left border border-gray-200">
                                <thead className="bg-[#e8e8e8] border-b border-gray-400 text-[#003366] font-bold sticky top-0">
                                    <tr>
                                        <th className="p-3 border-r">Component</th>
                                        <th className="p-3 border-r text-right">Total Demand</th>
                                        <th className="p-3 border-r text-right">On Hand</th>
                                        <th className="p-3 border-r text-right">Available</th>
                                        <th className="p-3 text-right">Shortage</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {mrpDemand.map(row => {
                                        const shortage = Math.max(0, row.totalNeeded - row.onHand);
                                        const available = row.onHand - row.totalNeeded;
                                        return (
                                            <tr key={row.itemId} className={shortage > 0 ? 'bg-red-50/40' : 'hover:bg-blue-50/30'}>
                                                <td className="p-3 border-r font-bold text-gray-700">{row.name}</td>
                                                <td className="p-3 border-r text-right font-mono font-black text-blue-800">{+row.totalNeeded.toFixed(4)}</td>
                                                <td className="p-3 border-r text-right font-mono text-gray-500">{row.onHand}</td>
                                                <td className={`p-3 border-r text-right font-mono font-bold ${available >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                    {available >= 0 ? `+${+available.toFixed(4)}` : +available.toFixed(4)}
                                                </td>
                                                <td className={`p-3 text-right font-bold font-mono ${shortage > 0 ? 'text-red-600 underline decoration-double' : 'text-gray-200'}`}>
                                                    {shortage > 0 ? +shortage.toFixed(4) : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Table */}
                {activeView === 'list' && <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-[#e8e8e8] border-b border-gray-400 text-[#003366] font-bold sticky top-0">
                            <tr>
                                <th className="p-3 border-r">WO #</th>
                                <th className="p-3 border-r">Assembly</th>
                                <th className="p-3 border-r text-right">Planned</th>
                                <th className="p-3 border-r text-right">Completed</th>
                                <th className="p-3 border-r text-right">Remaining</th>
                                <th className="p-3 border-r">Start Date</th>
                                <th className="p-3 border-r">Due Date</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(wo => {
                                const planned = wo.quantityPlanned || 0;
                                const completed = wo.quantityCompleted || 0;
                                const remaining = Math.max(0, planned - completed);
                                const pct = planned > 0 ? Math.min(100, (completed / planned) * 100) : 0;
                                return (
                                    <tr
                                        key={wo.id}
                                        className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                                        onDoubleClick={() => onOpenWorkOrder(wo)}
                                    >
                                        <td className="p-3 border-r font-mono text-blue-700 font-bold">
                                            <button onClick={() => onOpenWorkOrder(wo)} className="hover:underline text-left">
                                                {wo.refNo}
                                            </button>
                                        </td>
                                        <td className="p-3 border-r font-bold text-gray-700">{getAssemblyName(wo)}</td>
                                        <td className="p-3 border-r text-right font-mono">{planned}</td>
                                        <td className="p-3 border-r text-right font-mono text-green-700">{completed}</td>
                                        <td className="p-3 border-r text-right font-mono text-orange-600">{remaining}</td>
                                        <td className="p-3 border-r text-gray-500">{wo.date}</td>
                                        <td className={`p-3 border-r ${wo.dueDate && wo.workOrderStatus !== 'COMPLETE' && wo.dueDate < new Date().toISOString().split('T')[0] ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                            {wo.dueDate || '—'}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_COLORS[wo.workOrderStatus || 'OPEN'] || 'bg-gray-100 text-gray-500'}`}>
                                                    {(wo.workOrderStatus || 'OPEN').replace(/_/g, ' ')}
                                                </span>
                                                {planned > 0 && (
                                                    <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-blue-400' : 'bg-gray-300'}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-20 text-center text-gray-300 font-serif italic text-lg">
                                        {workOrders.length === 0
                                            ? 'No Work Orders found. Click "+ New Work Order" to create your first.'
                                            : 'No results match your search.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>}

            </div>
        </div>
    );
};

export default WorkOrderCenter;
