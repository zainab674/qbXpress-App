import React, { useState } from 'react';
import { Item, Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface InventoryCenterProps {
    items: Item[];
    transactions: Transaction[];
    onUpdateItems: (items: Item[]) => void;
    onOpenForm: (item?: Item) => void;
    onOpenAdjustment?: () => void;
    onOpenBuild?: () => void;
    onOpenPO?: () => void;
    onOpenReceive?: () => void;
}

const InventoryCenter: React.FC<InventoryCenterProps> = ({
    items,
    transactions,
    onUpdateItems,
    onOpenForm,
    onOpenAdjustment,
    onOpenBuild,
    onOpenPO,
    onOpenReceive
}) => {
    const [selectedItemId, setSelectedItemId] = useState<string | null>(items[0]?.id || null);
    const [filter, setFilter] = useState('All');
    const [showTxMenu, setShowTxMenu] = useState(false);

    const selectedItem = items.find(i => i.id === selectedItemId);
    const chartData = selectedItem ? [
        { name: 'Stock Level', value: selectedItem.onHand || 0, color: (selectedItem.onHand || 0) <= (selectedItem.reorderPoint || 0) ? '#dc2626' : '#2563eb' },
        { name: 'Reorder Point', value: selectedItem.reorderPoint || 0, color: '#94a3b8' }
    ] : [];

    // Filter items to show only inventory-related ones if needed
    const filteredItems = items.filter(i => {
        if (filter === 'All') return true;
        if (filter === 'Low Stock') return (i.onHand || 0) <= (i.reorderPoint || 0);
        if (filter === 'Out of Stock') return (i.onHand || 0) <= 0;
        return true;
    });

    const itemTransactions = transactions.filter(t =>
        t.items.some(li => li.id === selectedItemId)
    );

    return (
        <div className="flex flex-col h-full bg-[#f0f4f7] font-sans">
            <div className="bg-white border-b border-gray-300 p-4 shadow-sm">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-[#003366]">Inventory Center</h1>
                    <div className="flex gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setShowTxMenu(!showTxMenu)}
                                className="bg-[#003366] text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-[#002244] transition-colors shadow-sm flex items-center gap-2"
                            >
                                New Transaction <span>▼</span>
                            </button>
                            {showTxMenu && (
                                <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-300 shadow-xl z-50 rounded text-gray-800 py-1">
                                    <button onClick={() => { onOpenAdjustment?.(); setShowTxMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-blue-600 hover:text-white transition-colors">Adjust Quantity/Value on Hand</button>
                                    <button onClick={() => { onOpenBuild?.(); setShowTxMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-blue-600 hover:text-white transition-colors">Build Assemblies</button>
                                    <div className="h-px bg-gray-200 my-1"></div>
                                    <button onClick={() => { onOpenPO?.(); setShowTxMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-blue-600 hover:text-white transition-colors">Purchase Order</button>
                                    <button onClick={() => { onOpenReceive?.(); setShowTxMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-blue-600 hover:text-white transition-colors">Receive Items</button>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => onOpenForm()}
                            className="bg-green-700 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-green-800 transition-colors shadow-sm"
                        >
                            New Item
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Item List */}
                <div className="w-[300px] border-r border-gray-300 bg-white flex flex-col">
                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                        <select
                            className="w-full text-xs border border-gray-300 p-1.5 rounded outline-none"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        >
                            <option value="All">All Inventory Items</option>
                            <option value="Low Stock">Low Stock</option>
                            <option value="Out of Stock">Out of Stock</option>
                        </select>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItemId(item.id)}
                                className={`p-3 border-b border-gray-100 cursor-default hover:bg-blue-50 transition-colors ${selectedItemId === item.id ? 'bg-[#e0eaf3] border-l-4 border-l-blue-600' : ''}`}
                            >
                                <div className="flex justify-between">
                                    <span className="text-xs font-bold text-gray-800 truncate">{item.name}</span>
                                    <span className={`text-xs font-mono ${(item.onHand || 0) <= (item.reorderPoint || 0) ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                        {item.onHand || 0}
                                    </span>
                                </div>
                                <div className="text-[10px] text-gray-500 truncate">{item.type}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content - Item Details */}
                <div className="flex-1 flex flex-col overflow-y-auto">
                    {selectedItem ? (
                        <>
                            <div className="bg-white p-6 border-b border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl font-bold text-[#003366]">{selectedItem.name}</h2>
                                        <div className="text-sm text-gray-500 italic mt-1">{selectedItem.description}</div>
                                    </div>
                                    <button
                                        onClick={() => onOpenForm(selectedItem)}
                                        className="text-blue-600 text-xs font-bold hover:underline"
                                    >
                                        Edit Item
                                    </button>
                                </div>

                                <div className="grid grid-cols-4 gap-6 mt-6">
                                    <div className="bg-blue-50/50 p-3 rounded border border-blue-100 shadow-inner">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">On Hand</div>
                                        <div className="text-lg font-black text-blue-900">{selectedItem.onHand || 0}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Sales Price</div>
                                        <div className="text-lg font-black text-gray-800">${(selectedItem.salesPrice || 0).toFixed(2)}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border border-gray-200 col-span-2 row-span-2">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight mb-2">Stock Analysis</div>
                                        <div className="h-32">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData} layout="vertical" margin={{ left: -10, right: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fontWeight: 'bold' }} stroke="#64748b" />
                                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontSize: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Cost</div>
                                        <div className="text-lg font-black text-gray-800">${(selectedItem.cost || 0).toFixed(2)}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Reorder Point</div>
                                        <div className="text-lg font-black text-gray-800 text-red-600">{selectedItem.reorderPoint || 0}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-6 flex flex-col min-h-[400px]">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Transaction History</h3>
                                <div className="flex-1 bg-white border border-gray-300 rounded shadow-sm overflow-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-100 border-b sticky top-0 font-bold uppercase text-[10px] text-gray-600">
                                            <tr>
                                                <th className="px-4 py-2 text-left border-r">Date</th>
                                                <th className="px-4 py-2 text-left border-r">Type</th>
                                                <th className="px-4 py-2 text-left border-r">Ref No</th>
                                                <th className="px-4 py-2 text-right border-r">Qty</th>
                                                <th className="px-4 py-2 text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itemTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => {
                                                const lineItem = t.items.find(li => li.id === selectedItemId);
                                                return (
                                                    <tr key={t.id} className="border-b hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-2 border-r">{t.date}</td>
                                                        <td className="px-4 py-2 border-r font-bold">{t.type}</td>
                                                        <td className="px-4 py-2 border-r">{t.refNo}</td>
                                                        <td className={`px-4 py-2 border-r text-right font-bold ${['INVOICE', 'SALES_RECEIPT'].includes(t.type) ? 'text-red-600' : 'text-green-600'}`}>
                                                            {['INVOICE', 'SALES_RECEIPT'].includes(t.type) ? '-' : '+'}{lineItem?.quantity || 0}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-mono text-gray-400 italic">--</td>
                                                    </tr>
                                                );
                                            })}
                                            {itemTransactions.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-20 text-center text-gray-400 italic">No transactions found for this item.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 italic">
                            Select an item to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryCenter;
