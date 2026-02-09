
import React, { useState } from 'react';
import { Item, Vendor, Transaction, TransactionItem } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onOrder: (pos: Transaction[]) => void;
    items: Item[];
    vendors: Vendor[];
}

interface ReorderProposal {
    itemId: string;
    name: string;
    onHand: number;
    reorderPoint: number;
    suggestedQty: number;
    selected: boolean;
    vendorId: string;
    cost: number;
}

const ReorderItemsDialog: React.FC<Props> = ({ isOpen, onClose, onOrder, items, vendors }) => {
    const lowStockItems = items.filter(i => i.type === 'Inventory Part' && (i.onHand || 0) < (i.reorderPoint || 0));

    const [proposals, setProposals] = useState<ReorderProposal[]>(
        lowStockItems.map(i => ({
            itemId: i.id,
            name: i.name,
            onHand: i.onHand || 0,
            reorderPoint: i.reorderPoint || 0,
            suggestedQty: (i.reorderPoint || 0) - (i.onHand || 0) + 10, // Suggested: enough to get above point
            selected: true,
            vendorId: i.preferredVendorId || '',
            cost: i.cost || 0
        }))
    );

    if (!isOpen) return null;

    const handleCreateOrders = () => {
        const selectedProposals = proposals.filter(p => p.selected && p.vendorId);
        if (selectedProposals.length === 0) {
            alert("Please select at least one item and ensure it has a vendor assigned.");
            return;
        }

        // Group by vendor
        const vendorGroups: { [vendorId: string]: ReorderProposal[] } = {};
        selectedProposals.forEach(p => {
            if (!vendorGroups[p.vendorId]) vendorGroups[p.vendorId] = [];
            vendorGroups[p.vendorId].push(p);
        });

        const newPOs: Transaction[] = Object.entries(vendorGroups).map(([vId, items]) => ({
            id: Math.random().toString(),
            type: 'PURCHASE_ORDER',
            refNo: 'PO-' + Math.floor(Math.random() * 9000 + 1000),
            date: new Date().toLocaleDateString('en-US'),
            expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
            entityId: vId,
            items: items.map(p => ({
                id: p.itemId,
                description: `Reorder item: ${p.name}`,
                quantity: p.suggestedQty,
                rate: p.cost,
                amount: p.cost * p.suggestedQty,
                tax: false
            })),
            total: items.reduce((sum, p) => sum + (p.cost * p.suggestedQty), 0),
            status: 'OPEN'
        }));

        onOrder(newPOs);
        onClose();
    };

    return (
        <div className="h-full w-full bg-[#f0f0f0] flex flex-col font-sans overflow-hidden">
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="bg-[#003366] text-white p-2 font-bold flex justify-between items-center text-sm shadow-md">
                    <div className="flex items-center gap-2 uppercase tracking-widest text-[11px]">
                        <span className="text-xl">📦</span>
                        Order Review: Inventory Stock (Ch. 8)
                    </div>
                    <button onClick={onClose} className="hover:bg-red-600 px-2 text-xl leading-none">×</button>
                </div>

                <div className="bg-yellow-50 p-3 border-b border-yellow-200 text-xs italic text-yellow-800 flex gap-2 items-center">
                    <span className="font-bold not-italic">⚠️ INFO:</span>
                    Showing all items where On Hand is below Reorder Point. Review and adjust quantities before creating Purchase Orders.
                </div>

                <div className="flex-1 overflow-auto p-4 bg-gray-50">
                    <table className="w-full text-xs text-left border-collapse bg-white shadow-sm border border-gray-200">
                        <thead className="bg-[#e0e0e0] border-b-2 border-gray-300 font-bold uppercase text-[10px] text-gray-600">
                            <tr>
                                <th className="p-2 border-r w-8">Order</th>
                                <th className="p-2 border-r">Item Name</th>
                                <th className="p-2 border-r w-20 text-center">On Hand</th>
                                <th className="p-2 border-r w-20 text-center">Reorder Pt</th>
                                <th className="p-2 border-r w-24 text-center">Order Qty</th>
                                <th className="p-2 border-r">Preferred Vendor</th>
                                <th className="p-2 text-right w-24">Estimated Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proposals.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-gray-400 font-bold italic uppercase tracking-[0.2em]">
                                        All inventory levels are safe.
                                    </td>
                                </tr>
                            ) : (
                                proposals.map((p, idx) => (
                                    <tr key={p.itemId} className={`border-b hover:bg-blue-50/50 ${!p.selected ? 'opacity-40 grayscale' : ''}`}>
                                        <td className="p-2 border-r text-center">
                                            <input
                                                type="checkbox"
                                                checked={p.selected}
                                                onChange={e => {
                                                    const next = [...proposals];
                                                    next[idx].selected = e.target.checked;
                                                    setProposals(next);
                                                }}
                                            />
                                        </td>
                                        <td className="p-2 border-r font-bold text-blue-900">{p.name}</td>
                                        <td className="p-2 border-r text-center font-mono">{p.onHand}</td>
                                        <td className="p-2 border-r text-center font-mono text-red-600">{p.reorderPoint}</td>
                                        <td className="p-2 border-r">
                                            <input
                                                type="number"
                                                className="w-full p-1 border rounded text-center font-black"
                                                value={p.suggestedQty}
                                                onChange={e => {
                                                    const next = [...proposals];
                                                    next[idx].suggestedQty = Math.max(0, parseInt(e.target.value) || 0);
                                                    setProposals(next);
                                                }}
                                            />
                                        </td>
                                        <td className="p-2 border-r">
                                            <select
                                                className="w-full p-1 border rounded bg-gray-50 text-[10px]"
                                                value={p.vendorId}
                                                onChange={e => {
                                                    const next = [...proposals];
                                                    next[idx].vendorId = e.target.value;
                                                    setProposals(next);
                                                }}
                                            >
                                                <option value="">&lt;Select Vendor&gt;</option>
                                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2 text-right font-mono font-bold">
                                            ${(p.suggestedQty * p.cost).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-gray-100 p-4 border-t-2 border-gray-400 flex justify-between items-center">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">
                        Total for Approved Orders:
                        <span className="ml-2 text-sm text-blue-900 font-black">
                            ${proposals.filter(p => p.selected).reduce((acc, p) => acc + (p.suggestedQty * p.cost), 0).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreateOrders}
                            className="px-10 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow-lg transition-all active:scale-95 uppercase text-xs"
                        >
                            Create {Object.keys(proposals.filter(p => p.selected && p.vendorId).reduce((acc, p) => ({ ...acc, [p.vendorId]: true }), {})).length} Purchase Orders
                        </button>
                        <button
                            onClick={onClose}
                            className="px-8 py-2 bg-white border-2 border-gray-400 hover:bg-gray-50 text-gray-700 font-bold rounded uppercase text-xs"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReorderItemsDialog;
