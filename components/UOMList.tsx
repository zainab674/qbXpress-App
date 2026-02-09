
import React, { useState } from 'react';

interface UOM {
    id: string;
    name: string;
    abbreviation: string;
    type: 'Count' | 'Weight' | 'Length' | 'Volume' | 'Area' | 'Time';
}

interface UOMListProps {
    uoms: UOM[];
    onUpdateUOMs: (uoms: UOM[]) => Promise<void> | void;
}

const UOMList: React.FC<UOMListProps> = ({ uoms = [], onUpdateUOMs }) => {
    const [showNewForm, setShowNewForm] = useState(false);
    const [name, setName] = useState('');
    const [abbrev, setAbbrev] = useState('');
    const [type, setType] = useState<'Count' | 'Weight' | 'Length' | 'Volume' | 'Area' | 'Time'>('Count');
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleSave = async () => {
        if (!name.trim()) return;

        if (editingId) {
            const updated = uoms.map(u => u.id === editingId ? { ...u, name, abbreviation: abbrev, type } : u);
            await onUpdateUOMs(updated);
        } else {
            const newUom: UOM = {
                id: Math.random().toString(36).substring(2, 11),
                name,
                abbreviation: abbrev,
                type
            };
            await onUpdateUOMs([...uoms, newUom]);
        }

        resetForm();
    };

    const resetForm = () => {
        setName('');
        setAbbrev('');
        setType('Count');
        setShowNewForm(false);
        setEditingId(null);
    };

    const handleEdit = (u: UOM) => {
        setName(u.name);
        setAbbrev(u.abbreviation);
        setType(u.type);
        setEditingId(u.id);
        setShowNewForm(true);
    };

    return (
        <div className="flex flex-col h-full bg-white select-none">
            <div className="bg-gray-100 border-b border-gray-300 p-1 flex gap-2">
                <button
                    onClick={() => { setShowNewForm(true); setEditingId(null); }}
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
                            <th className="px-4 py-1 font-bold text-gray-600 border-x">Abbreviation</th>
                            <th className="px-4 py-1 font-bold text-gray-600 border-x">Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(!uoms || uoms.length === 0) ? (
                            <tr>
                                <td colSpan={3} className="px-4 py-10 text-center text-gray-400 italic">No units of measure defined.</td>
                            </tr>
                        ) : (
                            uoms.map(u => (
                                <tr
                                    key={u.id}
                                    onDoubleClick={() => handleEdit(u)}
                                    className="hover:bg-blue-600 hover:text-white group cursor-default"
                                >
                                    <td className="px-4 py-0.5 border-x">{u.name}</td>
                                    <td className="px-4 py-0.5 border-x">{u.abbreviation}</td>
                                    <td className="px-4 py-0.5 border-x">{u.type}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showNewForm && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[2000]">
                    <div className="bg-[#f0f0f0] border-4 border-[#003366] w-96 shadow-2xl">
                        <div className="bg-[#003366] p-2 flex justify-between items-center">
                            <h3 className="text-white font-bold text-xs uppercase tracking-widest">{editingId ? 'Edit Unit' : 'New Unit'}</h3>
                            <button onClick={resetForm} className="text-white hover:text-red-400 text-sm">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Unit Name</label>
                                <input className="w-full border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Abbreviation</label>
                                <input className="w-full border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600" value={abbrev} onChange={e => setAbbrev(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Unit Type</label>
                                <select className="w-full border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 bg-white" value={type} onChange={e => setType(e.target.value as any)}>
                                    <option>Count</option>
                                    <option>Weight</option>
                                    <option>Length</option>
                                    <option>Volume</option>
                                    <option>Area</option>
                                    <option>Time</option>
                                </select>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button onClick={resetForm} className="px-6 py-1.5 border border-gray-400 text-xs font-bold hover:bg-gray-100">Cancel</button>
                                <button onClick={handleSave} className="px-8 py-1.5 bg-[#003366] text-white text-xs font-bold hover:bg-blue-900">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UOMList;
