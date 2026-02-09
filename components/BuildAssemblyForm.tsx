
import React, { useState, useMemo } from 'react';
import { Item, Transaction } from '../types';

interface Props {
    items: Item[];
    onSave: (adj: Transaction) => Promise<void>;
    onClose: () => void;
}

const BuildAssemblyForm: React.FC<Props> = ({ items, onSave, onClose }) => {
    const [selectedAssemblyId, setSelectedAssemblyId] = useState('');
    const [quantityToBuild, setQuantityToBuild] = useState(1);
    const [date, setDate] = useState(new Date().toLocaleDateString());

    const assemblies = items.filter(i => i.type === 'Inventory Assembly');
    const selectedAssembly = useMemo(() => items.find(i => i.id === selectedAssemblyId), [items, selectedAssemblyId]);

    const components = useMemo(() => {
        if (!selectedAssembly || !selectedAssembly.assemblyItems) return [];
        return selectedAssembly.assemblyItems.map(c => {
            const item = items.find(i => i.id === c.itemId);
            return {
                ...c,
                name: item?.name || 'Unknown Item',
                onHand: item?.onHand || 0,
                needed: c.quantity * quantityToBuild
            };
        });
    }, [selectedAssembly, items, quantityToBuild]);

    const maxPossible = useMemo(() => {
        if (!selectedAssembly || !selectedAssembly.assemblyItems) return 0;
        const limits = selectedAssembly.assemblyItems.map(c => {
            const item = items.find(i => i.id === c.itemId);
            const onHand = item?.onHand || 0;
            return Math.floor(onHand / c.quantity);
        });
        return Math.min(...limits);
    }, [selectedAssembly, items]);

    const handleBuild = async () => {
        if (!selectedAssembly) return;
        if (quantityToBuild > maxPossible) {
            if (!confirm("You don't have enough components for this build. Build anyway? (Will result in negative inventory)")) return;
        }

        const tx: Transaction = {
            id: crypto.randomUUID(),
            type: 'ASSEMBLY_BUILD',
            refNo: 'BUILD-' + Date.now().toString().slice(-4),
            date,
            entityId: 'Internal',
            items: [
                {
                    id: selectedAssemblyId,
                    description: `Build Assembly: ${selectedAssembly.name} (Qty: ${quantityToBuild})`,
                    quantity: quantityToBuild,
                    rate: 0,
                    amount: 0,
                    tax: false
                }
            ],
            total: 0,
            status: 'CLEARED'
        };

        try {
            await onSave(tx);
            alert(`Built ${quantityToBuild} of ${selectedAssembly.name}. Inventory has been updated atomically.`);
            onClose();
        } catch (err) {
            alert("Failed to build assembly. Please check component availability.");
        }
    };

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
            <div className="bg-white border border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
                <div className="p-4 bg-[#003366] text-white flex justify-between items-center select-none">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🛠️</span>
                        <h2 className="text-lg font-bold">Build Assemblies</h2>
                    </div>
                    <button onClick={onClose} className="hover:bg-red-600 px-2">✕</button>
                </div>

                <div className="p-6 bg-gray-50 border-b space-y-4">
                    <div className="flex items-end gap-8">
                        <div className="flex flex-col gap-1 w-64">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Assembly Item</label>
                            <select
                                className="border p-2 text-sm bg-white outline-none font-bold shadow-sm"
                                value={selectedAssemblyId}
                                onChange={e => setSelectedAssemblyId(e.target.value)}
                            >
                                <option value="">--Select Assembly--</option>
                                {assemblies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 w-32 text-center">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest underline">Quantity on Hand</label>
                            <div className="text-xl font-black text-blue-900 mt-1">{selectedAssembly?.onHand || 0}</div>
                        </div>
                        <div className="flex flex-col gap-1 w-32 text-center border-l pl-8">
                            <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Quantity to Build</label>
                            <input
                                type="number"
                                className="border-2 border-blue-400 p-2 text-center font-black text-lg outline-none"
                                value={quantityToBuild}
                                onChange={e => setQuantityToBuild(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div className="flex-1 text-right">
                            <button
                                onClick={handleBuild}
                                className="bg-blue-600 text-white px-10 py-3 rounded font-bold hover:bg-blue-700 shadow-md transform active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                disabled={!selectedAssemblyId || quantityToBuild <= 0}
                            >
                                BUILD & CLOSE
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 italic">
                        <div>Build Point: {selectedAssembly?.buildPoint || 'None'}</div>
                        <div className={maxPossible === 0 ? 'text-red-500 animate-pulse' : 'text-green-600'}>
                            Max. possible builds based on component quantities: <span className="text-lg ml-2">{maxPossible}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 bg-white relative">
                    <table className="w-full text-xs text-left border border-gray-200">
                        <thead className="bg-[#e8e8e8] border-b border-gray-400 text-[#003366] font-bold sticky top-0">
                            <tr>
                                <th className="p-3 border-r">Component Item</th>
                                <th className="p-3 border-r text-right">Qty Needed (ea)</th>
                                <th className="p-3 border-r text-right">Total Needed</th>
                                <th className="p-3 border-r text-right">On Hand</th>
                                <th className="p-3 text-right">Shortage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {components.map((c, idx) => {
                                const shortage = Math.max(0, c.needed - c.onHand);
                                return (
                                    <tr key={idx} className={`hover:bg-blue-50/50 transition-colors ${shortage > 0 ? 'bg-red-50/30' : ''}`}>
                                        <td className="p-3 border-r font-bold text-gray-700">{c.name}</td>
                                        <td className="p-3 border-r text-right font-mono text-gray-500">{c.quantity}</td>
                                        <td className="p-3 border-r text-right font-black text-blue-800 font-mono">{c.needed}</td>
                                        <td className="p-3 border-r text-right font-mono text-gray-400">{c.onHand}</td>
                                        <td className={`p-3 text-right font-bold font-mono ${shortage > 0 ? 'text-red-600 underline decoration-double' : 'text-gray-200'}`}>
                                            {shortage > 0 ? shortage : '--'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {components.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-gray-300 font-serif italic text-xl">Select an assembly item above to see component requirements.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default BuildAssemblyForm;
