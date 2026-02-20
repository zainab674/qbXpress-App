
import React, { useState } from 'react';
import { CustomerCreditCategory } from '../types';

interface Props {
    categories: CustomerCreditCategory[];
    onUpdateCategories: (categories: CustomerCreditCategory[]) => void;
    onClose: () => void;
}

const XIcon = ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const CustomerCreditCategoryList: React.FC<Props> = ({ categories, onUpdateCategories, onClose }) => {
    const [showNewForm, setShowNewForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);


    const handleSave = () => {
        if (!newName.trim()) return;
        if (editingId) {
            onUpdateCategories(categories.map(c => c.id === editingId ? { ...c, name: newName } : c));
            setEditingId(null);
        } else {
            const nextId = 'cust-cat-' + (categories.length + 1);
            onUpdateCategories([...categories, { id: nextId, name: newName, isActive: true }]);
        }
        setNewName('');
        setShowNewForm(false);
    };

    const toggleActive = (id: string) => {
        onUpdateCategories(categories.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
    };

    return (
        <div className="h-full flex flex-col bg-[#f0f0f0] font-sans">
            <div className="bg-white border-b border-gray-300 p-2 flex justify-between items-center shadow-sm">
                <div className="flex gap-2">
                    <button
                        onClick={() => { setShowNewForm(true); setEditingId(null); setNewName(''); }}
                        className="px-4 py-1.5 bg-[#003366] text-white text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
                    >
                        New Category
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <div className="bg-white border border-gray-300 rounded shadow-md overflow-hidden">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-100 border-b border-gray-300 text-gray-600 font-bold uppercase tracking-tighter">
                            <tr>
                                <th className="px-4 py-2 border-r">Category Name</th>
                                <th className="px-4 py-2 border-r w-24 text-center">Status</th>
                                <th className="px-4 py-2 w-24 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {categories.map(cat => (
                                <tr key={cat.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-4 py-2 border-r font-medium text-gray-800">{cat.name}</td>
                                    <td className="px-4 py-2 border-r text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {cat.isActive ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-center flex gap-4 justify-center">
                                        <button
                                            onClick={() => { setShowNewForm(true); setEditingId(cat.id); setNewName(cat.name); }}
                                            className="text-blue-600 hover:text-blue-800 font-bold uppercase text-[10px]"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => toggleActive(cat.id)}
                                            className={`${cat.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} font-bold uppercase text-[10px]`}
                                        >
                                            {cat.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic font-serif">
                                        No categories defined yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showNewForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-[400px] shadow-2xl border border-gray-400 animate-in fade-in zoom-in duration-200">
                        <div className="bg-[#003366] text-white p-3 flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-widest">{editingId ? 'Edit Category' : 'New Category'}</h3>
                            <button onClick={() => setShowNewForm(false)} className="hover:bg-red-500 p-1 rounded-sm transition-colors">
                                <XIcon size={14} />
                            </button>
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
                                    placeholder="e.g. Return, Defective, Promotion..."
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

export default CustomerCreditCategoryList;
