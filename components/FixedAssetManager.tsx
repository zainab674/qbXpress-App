
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
        <div className="flex flex-col h-full bg-slate-50 font-sans antialiased text-slate-900">
            {/* Header Area */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                        <span className="text-2xl">🚜</span> Fixed Asset Manager
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Track and manage your long-term physical assets and depreciation</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
                    >
                        <span className="text-lg leading-none">+</span> Add Asset
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden p-6 gap-6">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset name</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchase Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Cost</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Life (Yrs)</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ann. Depr.</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acc. Depr.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {assets.map(a => {
                                        const { annual, accumulated } = calculateDepreciationLine(a);
                                        const isSelected = selectedAssetId === a.id;
                                        return (
                                            <tr
                                                key={a.id}
                                                onClick={() => setSelectedAssetId(a.id)}
                                                className={`group transition-all duration-150 cursor-pointer ${isSelected
                                                    ? 'bg-indigo-50/70'
                                                    : 'hover:bg-slate-50'
                                                    }`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors ${isSelected ? 'bg-indigo-100 text-indigo-600' : ''}`}>
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                            </svg>
                                                        </div>
                                                        <span className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>{a.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{new Date(a.purchaseDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right font-semibold text-sm text-slate-700">${a.purchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-right text-slate-600">{a.usefulLifeYears}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                        ${annual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                                        ${accumulated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {assets.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                <div className="text-4xl mb-3">🏢</div>
                                                <p>No fixed assets found. Click "Add Asset" to begin.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs font-medium text-slate-500">
                            <span>{assets.length} total assets</span>
                            <div className="flex gap-4">
                                <button className="hover:text-indigo-600 transition-colors">Generate Depr. Report</button>
                                <button className="hover:text-indigo-600 transition-colors">Export to Excel</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Popup Modal Form */}
                {isAdding && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md flex flex-col overflow-hidden ring-1 ring-slate-200 animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">New Asset Entry</h3>
                                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[70vh]">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Asset Details</label>
                                        <input
                                            placeholder="e.g. Delivery Van - 2024"
                                            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Purchase Date</label>
                                            <input type="date" className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Cost Value</label>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">$</span>
                                                <input type="number" className="w-full border border-slate-200 rounded-lg p-2 pl-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={form.purchaseCost} onChange={e => setForm({ ...form, purchaseCost: parseFloat(e.target.value) || 0 })} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Life (Years)</label>
                                            <input type="number" className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={form.usefulLifeYears} onChange={e => setForm({ ...form, usefulLifeYears: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Salvage Value</label>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">$</span>
                                                <input type="number" className="w-full border border-slate-200 rounded-lg p-2 pl-6 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={form.salvageValue} onChange={e => setForm({ ...form, salvageValue: parseFloat(e.target.value) || 0 })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Accounting Mapping</label>
                                    <select className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={form.assetAccountId} onChange={e => setForm({ ...form, assetAccountId: e.target.value })}>
                                        <option value="">Select Asset Account...</option>
                                        {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>

                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2">
                                    <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Depreciation Preview</h4>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-blue-600/70">Annual Amount:</span>
                                        <span className="text-sm font-bold text-blue-800">
                                            ${((form.purchaseCost || 0) - (form.salvageValue || 0)) / (form.usefulLifeYears || 1) > 0
                                                ? (((form.purchaseCost || 0) - (form.salvageValue || 0)) / (form.usefulLifeYears || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })
                                                : "0.00"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
                                <button onClick={() => setIsAdding(false)} className="bg-white border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleAdd} className="bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-indigo-200 shadow-lg active:scale-95">
                                    Save Asset
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FixedAssetManager;
