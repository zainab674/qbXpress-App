
import React, { useState } from 'react';
import { FixedAsset, Account, Vendor } from '../types';

interface Props {
    fixedAssets: FixedAsset[];
    accounts: Account[];
    vendors: Vendor[];
    onSave: (assets: FixedAsset[]) => void;
    onClose: () => void;
}

const FixedAssetManager: React.FC<Props> = ({ fixedAssets, accounts, vendors, onSave, onClose }) => {
    const [assets, setAssets] = useState<FixedAsset[]>(fixedAssets);
    const [isAdding, setIsAdding] = useState(false);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    const assetAccounts = accounts.filter(a => a.type === 'Fixed Asset');
    const expenseAccounts = accounts.filter(a => a.type === 'Expense');

    const [form, setForm] = useState<Partial<FixedAsset>>({
        name: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseCost: 0,
        usefulLifeYears: 5,
        salvageValue: 0,
        depreciationMethod: 'Straight Line',
        isActive: true
    });

    const handleAdd = () => {
        const newAsset: FixedAsset = {
            ...form as FixedAsset,
            id: Math.random().toString()
        };
        const next = [...assets, newAsset];
        setAssets(next);
        onSave(next);
        setIsAdding(false);
        setForm({
            name: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            purchaseCost: 0,
            usefulLifeYears: 5,
            salvageValue: 0,
            depreciationMethod: 'Straight Line',
            isActive: true
        });
    };

    const calculateDepreciationLine = (asset: FixedAsset) => {
        const annual = (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeYears;
        const purchaseYear = new Date(asset.purchaseDate).getFullYear();
        const currentYear = new Date().getFullYear();
        const yearsHeld = Math.max(0, currentYear - purchaseYear);
        const accumulated = Math.min(asset.purchaseCost - asset.salvageValue, annual * yearsHeld);
        return { annual, accumulated };
    };

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col font-sans select-none">
            <div className="bg-[#003366] text-white p-2 flex justify-between items-center shadow-md">
                <h2 className="text-sm font-bold flex items-center gap-2">🚜 Fixed Asset Manager</h2>
                <button onClick={onClose} className="hover:bg-red-600 px-2 rounded font-bold">✕</button>
            </div>

            <div className="p-1 bg-white border-b border-gray-300 flex gap-2 overflow-x-auto min-h-[36px]">
                <button onClick={() => setIsAdding(true)} className="px-3 py-1 bg-gray-100 border border-gray-400 text-[10px] font-bold hover:bg-white rounded shadow-sm">Add New Asset</button>

            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 bg-white overflow-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-100 sticky top-0 border-b border-gray-300">
                            <tr className="text-blue-900 font-bold">
                                <th className="p-3 border-r">Asset Name</th>
                                <th className="p-3 border-r">Purchase Date</th>
                                <th className="p-3 border-r text-right">Cost</th>
                                <th className="p-3 border-r text-right">Life (Yrs)</th>
                                <th className="p-3 border-r text-right">Ann. Depr.</th>
                                <th className="p-3 text-right">Acc. Depr.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.map(a => {
                                const { annual, accumulated } = calculateDepreciationLine(a);
                                return (
                                    <tr
                                        key={a.id}
                                        onClick={() => setSelectedAssetId(a.id)}
                                        className={`border-b cursor-pointer transition-colors ${selectedAssetId === a.id ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
                                    >
                                        <td className="p-3 border-r font-bold">{a.name}</td>
                                        <td className="p-3 border-r">{a.purchaseDate}</td>
                                        <td className="p-3 border-r text-right font-mono">${a.purchaseCost.toLocaleString()}</td>
                                        <td className="p-3 border-r text-right">{a.usefulLifeYears}</td>
                                        <td className="p-3 border-r text-right font-mono text-blue-700">${annual.toFixed(2)}</td>
                                        <td className="p-3 text-right font-mono text-red-600">${accumulated.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {isAdding && (
                    <div className="w-80 bg-gray-100 border-l border-gray-300 p-4 space-y-4 animate-in slide-in-from-right duration-200">
                        <h3 className="font-bold text-blue-900 border-b pb-2 text-xs uppercase tracking-widest">New Fixed Asset Info</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Asset Name</label>
                                <input className="w-full border p-2 text-xs" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Purchase Date</label>
                                    <input type="date" className="w-full border p-2 text-xs" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Cost</label>
                                    <input type="number" className="w-full border p-2 text-xs font-mono" value={form.purchaseCost} onChange={e => setForm({ ...form, purchaseCost: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Life (Years)</label>
                                    <input type="number" className="w-full border p-2 text-xs" value={form.usefulLifeYears} onChange={e => setForm({ ...form, usefulLifeYears: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Salvage</label>
                                    <input type="number" className="w-full border p-2 text-xs font-mono" value={form.salvageValue} onChange={e => setForm({ ...form, salvageValue: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Asset Account</label>
                                <select className="w-full border p-2 text-xs" value={form.assetAccountId} onChange={e => setForm({ ...form, assetAccountId: e.target.value })}>
                                    <option value="">--Select--</option>
                                    {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="pt-4 flex gap-2">
                            <button onClick={handleAdd} className="flex-1 bg-blue-600 text-white p-2 rounded text-xs font-bold hover:bg-blue-700 shadow-md">Save Asset</button>
                            <button onClick={() => setIsAdding(false)} className="flex-1 bg-white border p-2 rounded text-xs font-bold hover:bg-gray-50">Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FixedAssetManager;
