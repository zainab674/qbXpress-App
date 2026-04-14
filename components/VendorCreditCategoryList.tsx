
import React, { useState } from 'react';
import { VendorCreditCategory } from '../types';

interface VendorCreditCategoryListProps {
    categories: VendorCreditCategory[];
    onUpdateCategories: (categories: VendorCreditCategory[]) => void;
}

const VendorCreditCategoryList: React.FC<VendorCreditCategoryListProps> = ({ categories = [], onUpdateCategories }) => {
    const [showNewForm, setShowNewForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                setShowNewForm(true);
                setEditingId(null);
                setNewName('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);


    const handleSave = () => {
        if (!newName.trim()) return;

        if (editingId) {
            const updated = categories.map(c => c.id === editingId ? { ...c, name: newName } : c);
            onUpdateCategories(updated);
        } else {
            const newCategory: VendorCreditCategory = {
                id: crypto.randomUUID(),
                name: newName,
                isActive: true
            };
            onUpdateCategories([...categories, newCategory]);
        }

        setNewName('');
        setShowNewForm(false);
        setEditingId(null);
    };

    const handleEdit = (c: VendorCreditCategory) => {
        setNewName(c.name);
        setEditingId(c.id);
        setShowNewForm(true);
    };

    const toggleActive = (c: VendorCreditCategory) => {
        const updated = categories.map(cls => cls.id === c.id ? { ...cls, isActive: !cls.isActive } : cls);
        onUpdateCategories(updated);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 select-none animate-in">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 p-2 flex gap-3 items-center shadow-sm z-10">
                <button
                    onClick={() => { setShowNewForm(true); setEditingId(null); setNewName(''); }}
                    className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-[12px] font-semibold flex items-center gap-2 shadow-sm active:scale-95"
                >
                    <span className="text-lg leading-none">+</span> New Category
                </button>
                <div className="h-6 w-px bg-slate-200 mx-1"></div>
                <span className="text-slate-400 text-[11px] font-medium italic">Double-click any row to edit</span>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto custom-scrollbar p-0.5">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden m-2">
                    <table className="w-full text-left text-[13px] border-collapse">
                        <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-slate-600 uppercase text-[11px] tracking-wider">Vendor Credit Reason Category</th>
                                <th className="px-6 py-3 w-32 text-center font-semibold text-slate-600 uppercase text-[11px] tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                                <tr
                                    key={c.id}
                                    onDoubleClick={() => handleEdit(c)}
                                    className="hover:bg-blue-50/50 group cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-3.5 text-slate-700 font-medium">{c.name}</td>
                                    <td className="px-6 py-3.5 text-center">
                                        <div className="flex items-center justify-center">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={c.isActive}
                                                    onChange={() => toggleActive(c)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                <span className="ml-2 text-[11px] font-medium text-slate-500 w-12 text-left">
                                                    {c.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </label>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Bar */}
            <div className="bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center text-[11px] text-slate-400 font-medium">
                <div className="flex gap-4">
                    <span>Total: {categories.length} Categories</span>
                    <span>Active: {categories.filter(c => c.isActive).length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-600 text-[10px]">Ctrl + N</kbd>
                    <span>Quick New</span>
                </div>
            </div>

            {/* Modal */}
            {showNewForm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[2000] animate-in">
                    <div className="bg-white rounded-2xl w-[95vw] h-[95vh] shadow-2xl overflow-hidden border border-white/20 flex flex-col slide-in-from-top-1">
                        <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
                            <h3 className="text-slate-800 font-bold text-sm tracking-tight">
                                {editingId ? 'Edit Category' : 'Create New Category'}
                            </h3>
                            <button
                                onClick={() => setShowNewForm(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="space-y-2">
                                <label className="text-[12px] font-semibold text-slate-500 ml-1">Category Name</label>
                                <input
                                    autoFocus
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm transition-all focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-slate-700 placeholder:text-slate-300"
                                    value={newName}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g. Defective Item, Shortage..."
                                />
                            </div>
                            <div className="mt-10 flex gap-3">
                                <button
                                    onClick={() => setShowNewForm(false)}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-[1.5] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
                                    disabled={!newName.trim()}
                                >
                                    {editingId ? 'Update Category' : 'Save Category'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorCreditCategoryList;
