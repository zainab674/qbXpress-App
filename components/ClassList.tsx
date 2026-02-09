
import React, { useState } from 'react';
import { QBClass } from '../types';

interface ClassListProps {
    classes: QBClass[];
    onUpdateClasses: (classes: QBClass[]) => void;
}

const ClassList: React.FC<ClassListProps> = ({ classes, onUpdateClasses }) => {
    const [showNewForm, setShowNewForm] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                setShowNewForm(true);
                setEditingId(null);
                setNewClassName('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSave = () => {
        if (!newClassName.trim()) return;

        if (editingId) {
            const updated = classes.map(c => c.id === editingId ? { ...c, name: newClassName } : c);
            onUpdateClasses(updated);
        } else {
            const newClass: QBClass = {
                id: crypto.randomUUID(),
                name: newClassName,
                isActive: true
            };
            onUpdateClasses([...classes, newClass]);
        }

        setNewClassName('');
        setShowNewForm(false);
        setEditingId(null);
    };

    const handleEdit = (c: QBClass) => {
        setNewClassName(c.name);
        setEditingId(c.id);
        setShowNewForm(true);
    };

    const toggleActive = (c: QBClass) => {
        const updated = classes.map(cls => cls.id === c.id ? { ...cls, isActive: !cls.isActive } : cls);
        onUpdateClasses(updated);
    };

    return (
        <div className="flex flex-col h-full bg-white select-none">
            <div className="bg-gray-100 border-b border-gray-300 p-1 flex gap-2">
                <button
                    onClick={() => { setShowNewForm(true); setEditingId(null); setNewClassName(''); }}
                    className="px-4 py-1 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-300 transition-all text-[11px] font-medium text-gray-700"
                >
                    New
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-[12px]">
                    <thead className="bg-gray-50 border-b sticky top-0">
                        <tr>
                            <th className="px-4 py-1 font-bold text-gray-600 border-x">Name</th>
                            <th className="px-4 py-1 font-bold text-gray-600 border-x w-20">Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classes.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="px-4 py-10 text-center text-gray-400 italic">No classes defined.</td>
                            </tr>
                        ) : (
                            classes.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                                <tr
                                    key={c.id}
                                    onDoubleClick={() => handleEdit(c)}
                                    className="hover:bg-blue-600 hover:text-white group cursor-default"
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
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-gray-100 border-t border-gray-300 p-1 text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">
                Double-click to edit class
            </div>

            {showNewForm && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[2000]">
                    <div className="bg-[#f0f0f0] border-4 border-[#003366] w-96 shadow-2xl">
                        <div className="bg-[#003366] p-2 flex justify-between items-center">
                            <h3 className="text-white font-bold text-xs uppercase tracking-widest">{editingId ? 'Edit Class' : 'New Class'}</h3>
                            <button onClick={() => setShowNewForm(false)} className="text-white hover:text-red-400 text-sm">✕</button>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Class Name</label>
                                <input
                                    autoFocus
                                    className="border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 bg-white"
                                    value={newClassName}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    onChange={e => setNewClassName(e.target.value)}
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
                                    className="px-8 py-1.5 bg-[#003366] text-white text-xs font-bold hover:bg-blue-900 transition-colors"
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

export default ClassList;
