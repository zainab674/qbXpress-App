import React, { useState, useMemo, useEffect } from 'react';
import { Item, Transaction, ViewState } from '../types';
import { fetchAvailableLots } from '../services/api';

interface InventoryCenterProps {
    items: Item[];
    transactions: Transaction[];
    onUpdateItems: (items: Item[]) => void;
    onOpenForm: (item?: Item) => void;
    onOpenAdjustment?: () => void;
    onOpenBuild?: () => void;
    onOpenPO?: () => void;
    onOpenReceive?: () => void;
    onOpenWindow: (type: ViewState, title: string, params?: any) => void;
}

const InventoryCenter: React.FC<InventoryCenterProps> = ({
    items,
    transactions,
    onOpenForm,
    onOpenAdjustment,
    onOpenBuild,
    onOpenPO,
    onOpenReceive,
    onOpenWindow
}) => {
    const [activeTab, setActiveTab] = useState<'Products' | 'Services' | 'Adjustments'>('Products');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedLots, setExpandedLots] = useState<Record<string, any[]>>({});
    const [loadingLots, setLoadingLots] = useState<Record<string, boolean>>({});

    const toggleLots = async (itemId: string) => {
        if (expandedLots[itemId]) {
            setExpandedLots(prev => {
                const updated = { ...prev };
                delete updated[itemId];
                return updated;
            });
            return;
        }

        setLoadingLots(prev => ({ ...prev, [itemId]: true }));
        try {
            const lots = await fetchAvailableLots(itemId);
            setExpandedLots(prev => ({ ...prev, [itemId]: lots }));
        } catch (err) {
            console.error('Failed to fetch lots:', err);
        } finally {
            setLoadingLots(prev => ({ ...prev, [itemId]: false }));
        }
    };

    // Filter items by type
    const physicalItems = useMemo(() =>
        items.filter(i => i.type === 'Inventory Part' || i.type === 'Inventory Assembly'),
        [items]);

    const serviceItems = useMemo(() =>
        items.filter(i => i.type === 'Service' || i.type === 'Non-inventory Part'),
        [items]);

    const currentTabItems = useMemo(() => {
        if (activeTab === 'Products') return physicalItems;
        if (activeTab === 'Services') return serviceItems;
        return [];
    }, [activeTab, physicalItems, serviceItems]);

    // Calculate quantities from transactions
    const itemQuantities = useMemo(() => {
        const poQuantities: Record<string, number> = {};
        const soQuantities: Record<string, number> = {};

        transactions.forEach(tx => {
            if (tx.status === 'CLOSED' || tx.status === 'Closed') return;

            if (tx.type === 'PURCHASE_ORDER') {
                tx.items.forEach(li => {
                    if (li.itemId) {
                        poQuantities[li.itemId] = (poQuantities[li.itemId] || 0) + li.quantity;
                    }
                });
            } else if (tx.type === 'SALES_ORDER') {
                tx.items.forEach(li => {
                    if (li.itemId) {
                        soQuantities[li.itemId] = (soQuantities[li.itemId] || 0) + li.quantity;
                    }
                });
            }
        });

        return { poQuantities, soQuantities };
    }, [transactions]);

    const filteredItems = useMemo(() => {
        return currentTabItems.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [currentTabItems, searchTerm]);

    const lowStockCount = useMemo(() => {
        return physicalItems.filter(i => (i.onHand || 0) <= (i.reorderPoint || 0)).length;
    }, [physicalItems]);

    return (
        <div className="flex flex-col bg-white font-sans text-gray-700 min-h-full">
            {/* Header */}
            <header className="p-4 border-b border-gray-200 flex justify-between items-start">
                <div className="flex flex-col gap-4">
                    <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>

                    {/* Tabs */}
                    <div className="flex border border-gray-300 rounded overflow-hidden w-fit shadow-sm">
                        <button
                            className={`px-6 py-1.5 text-sm font-bold transition-colors ${activeTab === 'Products' ? 'bg-gray-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            onClick={() => setActiveTab('Products')}
                        >
                            Products
                        </button>
                        <button
                            className={`px-6 py-1.5 text-sm font-bold transition-colors ${activeTab === 'Services' ? 'bg-gray-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            onClick={() => setActiveTab('Services')}
                        >
                            Services
                        </button>
                        <button
                            className={`px-6 py-1.5 text-sm font-bold transition-colors ${activeTab === 'Adjustments' ? 'bg-gray-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            onClick={() => setActiveTab('Adjustments')}
                        >
                            Adjustments
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-700 rounded text-sm font-bold hover:bg-green-50 transition-colors">
                        More <span className="text-[10px]">▼</span>
                    </button>
                    <div className="flex border border-green-600 rounded bg-green-600 overflow-hidden shadow-sm">
                        <button
                            onClick={() => onOpenForm({ type: 'Inventory Part' } as any)}
                            className="px-4 py-2 text-white text-sm font-bold hover:bg-green-700 transition-colors"
                        >
                            Add items
                        </button>
                        <div className="w-[1px] bg-green-700"></div>
                        <button className="px-2 py-2 text-white text-sm font-bold hover:bg-green-700 transition-colors">
                            ▼
                        </button>
                    </div>
                </div>
            </header>

            {/* Low Stock Alert */}
            {lowStockCount > 0 && (
                <div className="px-6 py-2">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-start shadow-sm border-l-4 border-l-orange-500">
                        <div className="flex gap-3">
                            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">!</div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Low stock</h4>
                                <p className="text-xs text-gray-600 mt-0.5">
                                    {lowStockCount} item{lowStockCount > 1 ? 's are' : ' is'} running low on stock.
                                    <button className="text-blue-600 hover:underline ml-1">See all</button>
                                </p>
                            </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="p-4 flex justify-between items-center mt-2">
                <div className="flex gap-2 items-center">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search by name, SKU or category"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded text-sm w-80 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                        Filter <span>▼</span>
                    </button>
                </div>

                <div className="flex items-center gap-4 text-gray-400">
                    <button className="hover:text-gray-600 transition-colors">🖨️</button>
                    <button className="hover:text-gray-600 transition-colors">📤</button>
                    <button className="hover:text-gray-600 transition-colors">⚙️</button>
                </div>
            </div>

            {/* Table Header Extra Info */}
            <div className="px-4 py-1 text-right text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                1-{filteredItems.length} of {filteredItems.length} &nbsp; 〈 1 〉
            </div>

            {/* Table */}
            <div className="border-t border-gray-200">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f8f9fa] border-b border-gray-200 sticky top-0 z-10">
                        <tr className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-white">
                            <th className="px-6 py-5 w-10">
                                <input type="checkbox" className="rounded border-gray-300 w-4 h-4" />
                            </th>
                            <th className="px-6 py-5 w-20"></th>
                            <th className="px-6 py-5 min-w-[200px]">
                                <div className="flex items-center gap-1 cursor-pointer hover:text-gray-800 transition-colors">
                                    NAME <span>↕</span>
                                </div>
                            </th>
                            <th className="px-6 py-5 min-w-[250px]">SALES DESCRIPTION</th>
                            <th className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-800 transition-colors">
                                    QTY ON HAND <span>↕</span>
                                </div>
                            </th>
                            <th className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-800 transition-colors">
                                    QTY ON PO <span>↕</span>
                                </div>
                            </th>
                            <th className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-800 transition-colors">
                                    QTY ON SO <span>↕</span>
                                </div>
                            </th>
                            <th className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-800 transition-colors">
                                    AVAIL QTY <span>↕</span>
                                </div>
                            </th>
                            <th className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-800 transition-colors">
                                    REORDER POINT <span>↕</span>
                                </div>
                            </th>
                            <th className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-800 transition-colors">
                                    PRICE <span>↕</span>
                                </div>
                            </th>
                            <th className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-gray-800 transition-colors">
                                    COST <span>↕</span>
                                </div>
                            </th>
                            <th className="px-6 py-5 text-center">ACTION</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredItems.map(item => {
                            const poQty = itemQuantities.poQuantities[item.id] || 0;
                            const soQty = itemQuantities.soQuantities[item.id] || 0;
                            const availQty = (item.onHand || 0) - soQty;
                            const isLow = (item.onHand || 0) <= (item.reorderPoint || 0);

                            return (
                                <React.Fragment key={item.id}>
                                    <tr className={`hover:bg-blue-50/20 transition-all group ${expandedLots[item.id] ? 'bg-blue-50/40' : ''}`}>
                                        <td className="px-6 py-6">
                                            <input type="checkbox" className="rounded border-gray-300 w-4 h-4" />
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="w-14 h-14 border border-gray-200 rounded-lg flex items-center justify-center bg-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt="" className="w-full h-full object-contain" />
                                                ) : (
                                                    <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <button
                                                    onClick={() => onOpenForm(item)}
                                                    className="text-base font-bold text-blue-600 hover:text-blue-800 hover:underline text-left tracking-tight"
                                                >
                                                    {item.name}
                                                </button>
                                                <button
                                                    onClick={() => toggleLots(item.id)}
                                                    className="text-[11px] font-black text-gray-400 hover:text-blue-600 uppercase tracking-widest mt-1.5 flex items-center gap-1"
                                                >
                                                    {loadingLots[item.id] ? 'Loading...' : (expandedLots[item.id] ? 'Hide Lots ▲' : 'Show Lots ▼')}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-sm text-gray-500 leading-relaxed">
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className={`text-base font-bold ${isLow ? 'text-orange-600' : 'text-gray-800'}`}>
                                                    {item.onHand || 0}
                                                </span>
                                                {isLow && (
                                                    <span
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenWindow('PURCHASE_ORDER', 'Purchase Order', { initialData: { itemId: item.id } });
                                                        }}
                                                        className="bg-orange-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase leading-none cursor-pointer hover:bg-orange-700 transition-colors shadow-sm active:scale-95"
                                                        title="Click to create Purchase Order"
                                                    >
                                                        LOW
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right text-base text-gray-800">{poQty}</td>
                                        <td className="px-6 py-6 text-right text-base text-gray-800">{soQty}</td>
                                        <td className="px-6 py-6 text-right text-base text-gray-900 font-black">{availQty}</td>
                                        <td className="px-6 py-6 text-right text-base text-gray-500 font-medium italic">{item.reorderPoint || 0}</td>
                                        <td className="px-6 py-6 text-right text-base text-gray-900 font-bold">${(item.salesPrice || 0).toLocaleString()}</td>
                                        <td className="px-6 py-6 text-right text-base text-gray-900 font-bold">${(item.cost || 0).toLocaleString()}</td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => onOpenForm(item)}
                                                    className="text-sm font-bold text-green-700 hover:text-green-800 px-3 py-1 hover:bg-green-50 rounded transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
                                                <button className="text-gray-400 hover:text-gray-900 transition-colors p-1">
                                                    ▼
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedLots[item.id] && (
                                        <tr className="bg-gray-50/80">
                                            <td className="px-4 py-2"></td>
                                            <td className="px-4 py-2" colSpan={10}>
                                                <div className="p-4 bg-white border border-gray-200 rounded-md shadow-inner m-2">
                                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                        Lot Details Tracking
                                                    </h5>
                                                    <div className="grid grid-cols-4 gap-4">
                                                        {expandedLots[item.id].map(lot => (
                                                            <div key={lot._id || lot.lotNumber} className="border border-gray-100 p-3 rounded bg-gray-50/50 flex flex-col gap-1 shadow-sm">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-xs font-black text-blue-900">{lot.lotNumber}</span>
                                                                    <span className="text-[10px] font-bold text-gray-400">{new Date(lot.dateReceived).toLocaleDateString()}</span>
                                                                </div>
                                                                <div className="flex justify-between items-end">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[9px] uppercase font-bold text-gray-400">Remaining</span>
                                                                        <span className="text-sm font-black text-gray-800">{lot.quantityRemaining} <span className="text-[10px] font-medium text-gray-500">of {lot.quantityReceived}</span></span>
                                                                    </div>
                                                                    <div className="w-16 h-1 bg-gray-200 rounded overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-blue-500 rounded"
                                                                            style={{ width: `${(lot.quantityRemaining / lot.quantityReceived) * 100}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {expandedLots[item.id].length === 0 && (
                                                            <div className="col-span-4 py-4 text-center text-xs text-gray-400 italic">
                                                                No active lots found for this item.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={11} className="px-4 py-20 text-center text-gray-400 italic">
                                    No products or services found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Pagination */}
            <div className="px-4 py-4 border-t border-gray-200 text-right text-xs text-gray-500 bg-white">
                1-{filteredItems.length} of {filteredItems.length} &nbsp; 〈 <span className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">1</span> 〉
            </div>
        </div>
    );
};

export default InventoryCenter;
