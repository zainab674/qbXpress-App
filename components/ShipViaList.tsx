
import React, { useState } from 'react';

interface ShipViaListProps {
    shipVia: string[];
    onUpdateShipVia: (shipVia: string[]) => void;
}

const ShipViaList: React.FC<ShipViaListProps> = ({ shipVia, onUpdateShipVia }) => {
    const [showNewForm, setShowNewForm] = useState(false);
    const [newMethod, setNewMethod] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const handleSave = () => {
        if (!newMethod.trim()) return;

        let updated: string[];
        if (editingIndex !== null) {
            updated = [...shipVia];
            updated[editingIndex] = newMethod.trim();
        } else {
            updated = [...shipVia, newMethod.trim()];
        }

        onUpdateShipVia(updated);
        resetForm();
    };

    const resetForm = () => {
        setNewMethod('');
        setShowNewForm(false);
        setEditingIndex(null);
    };

    const handleEdit = (method: string, index: number) => {
        setNewMethod(method);
        setEditingIndex(index);
        setShowNewForm(true);
    };

    const handleDelete = (index: number) => {
        const updated = shipVia.filter((_, i) => i !== index);
        onUpdateShipVia(updated);
    };

    return (
        <div className="flex flex-col h-full bg-white select-none">
            <div className="bg-gray-100 border-b border-gray-300 p-1 flex gap-2">
                <button
                    onClick={() => { setShowNewForm(true); setEditingIndex(null); }}
                    className="px-4 py-1 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-300 transition-all text-[11px] font-medium text-gray-700"
                >
                    New
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-[12px]">
                    <thead className="bg-gray-50 border-b sticky top-0">
                        <tr>
                            <th className="px-4 py-1 font-bold text-gray-600 border-x">Shipping Method</th>
                            <th className="px-4 py-1 font-bold text-gray-600 border-x w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {shipVia.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="px-4 py-10 text-center text-gray-400 italic">No shipping methods defined.</td>
                            </tr>
                        ) : (
                            shipVia.sort().map((method, index) => (
                                <tr
                                    key={index}
                                    onDoubleClick={() => handleEdit(method, index)}
                                    className="hover:bg-blue-600 hover:text-white group cursor-default"
                                >
                                    <td className="px-4 py-0.5 border-x">{method}</td>
                                    <td className="px-4 py-0.5 border-x text-center">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(index); }}
                                            className="text-gray-300 hover:text-red-400 group-hover:text-red-200"
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-gray-100 border-t border-gray-300 p-1 text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">
                Double-click to edit shipping method
            </div>

            {showNewForm && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[2000]">
                    <div className="bg-[#f0f0f0] border-4 border-[#003366] w-96 shadow-2xl">
                        <div className="bg-[#003366] p-2 flex justify-between items-center">
                            <h3 className="text-white font-bold text-xs uppercase tracking-widest">{editingIndex !== null ? 'Edit Shipping Method' : 'New Shipping Method'}</h3>
                            <button onClick={resetForm} className="text-white hover:text-red-400 text-sm">✕</button>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Method Name</label>
                                <input
                                    autoFocus
                                    className="border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 bg-white"
                                    value={newMethod}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    onChange={e => setNewMethod(e.target.value)}
                                />
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    onClick={resetForm}
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

export default ShipViaList;
