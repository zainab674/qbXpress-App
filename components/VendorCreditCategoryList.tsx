
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
        <div className="flex flex-col h-full bg-white select-none">
            <div className="bg-gray-100 border-b border-gray-300 p-1 flex gap-2">
                <button
                    onClick={() => { setShowNewForm(true); setEditingId(null); setNewName(''); }}
                    className="px-4 py-1 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-300 transition-all text-[11px] font-medium text-gray-700"
                >
                    New
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-[12px]">
                    <thead className="bg-gray-50 border-b sticky top-0 font-bold text-[#003366] uppercase tracking-tighter">
                        <tr>
                            <th className="px-4 py-1 border-x">Vendor Credit Reason Category</th>
                            <th className="px-4 py-1 border-x w-20 text-center">Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                            <tr
                                key={c.id}
                                onDoubleClick={() => handleEdit(c)}
                                className="hover:bg-blue-600 hover:text-white group cursor-default border-b border-gray-100"
                            >
                                <td className="px-4 py-0.5 border-x">{c.name}</td>
                                <td className="px-4 py-0.5 border-x text-center">
                                    <input
                                        type="checkbox"
                                        checked={c.isActive}
                                        onChange={() => toggleActive(c)}
                                        className="accent-blue-600"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-[#003366] text-white p-1 text-[9px] font-bold uppercase tracking-widest text-center">
                Double-click to edit category • Ctrl+N for New
            </div>

            {showNewForm && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[2000]">
                    <div className="bg-[#f0f0f0] border-4 border-[#003366] w-96 shadow-2xl">
                        <div className="bg-[#003366] p-2 flex justify-between items-center">
                            <h3 className="text-white font-bold text-xs uppercase tracking-widest">{editingId ? 'Edit Category' : 'New Credit Category'}</h3>
                            <button onClick={() => setShowNewForm(false)} className="text-white hover:text-red-400 text-sm">✕</button>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Category Name</label>
                                <input
                                    autoFocus
                                    className="border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 bg-white"
                                    value={newName}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g. Defective Item, Shortage..."
                                />
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowNewForm(false)}
                                    className="px-6 py-1.5 border border-gray-400 text-xs font-bold hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-8 py-1.5 bg-[#003366] text-white text-xs font-bold hover:bg-blue-900 transition-colors shadow-md"
                                >
                                    Save
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
