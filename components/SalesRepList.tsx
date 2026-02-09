
import React, { useState } from 'react';
import { SalesRep, Employee, Vendor } from '../types';

interface SalesRepListProps {
    salesReps: SalesRep[];
    employees: Employee[];
    vendors: Vendor[];
    onUpdateReps: (reps: SalesRep[]) => void;
}

const SalesRepList: React.FC<SalesRepListProps> = ({ salesReps, employees, vendors, onUpdateReps }) => {
    const [showNewForm, setShowNewForm] = useState(false);
    const [selectedEntityId, setSelectedEntityId] = useState('');
    const [initials, setInitials] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const getEntityName = (rep: SalesRep) => {
        const emp = employees.find(e => e.id === rep.entityId);
        if (emp) return emp.name;
        const vend = vendors.find(v => v.id === rep.entityId);
        if (vend) return vend.name;
        return 'Unknown';
    };

    const handleSave = () => {
        if (!selectedEntityId || !initials.trim()) return;

        if (editingId) {
            const updated = salesReps.map(r => r.id === editingId ? { ...r, entityId: selectedEntityId, initials: initials.toUpperCase() } : r);
            onUpdateReps(updated);
        } else {
            const newRep: SalesRep = {
                id: crypto.randomUUID(),
                entityId: selectedEntityId,
                initials: initials.toUpperCase(),
                isActive: true
            };
            onUpdateReps([...salesReps, newRep]);
        }

        resetForm();
    };

    const resetForm = () => {
        setSelectedEntityId('');
        setInitials('');
        setShowNewForm(false);
        setEditingId(null);
    };

    const handleEdit = (r: SalesRep) => {
        setSelectedEntityId(r.entityId);
        setInitials(r.initials);
        setEditingId(r.id);
        setShowNewForm(true);
    };

    const toggleActive = (r: SalesRep) => {
        const updated = salesReps.map(rep => rep.id === r.id ? { ...rep, isActive: !rep.isActive } : rep);
        onUpdateReps(updated);
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
                            <th className="px-4 py-1 font-bold text-gray-600 border-x">Initials</th>
                            <th className="px-4 py-1 font-bold text-gray-600 border-x">Sales Rep Name</th>
                            <th className="px-4 py-1 font-bold text-gray-600 border-x w-20">Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salesReps.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-4 py-10 text-center text-gray-400 italic">No sales representatives defined.</td>
                            </tr>
                        ) : (
                            salesReps.sort((a, b) => a.initials.localeCompare(b.initials)).map(r => (
                                <tr
                                    key={r.id}
                                    onDoubleClick={() => handleEdit(r)}
                                    className="hover:bg-blue-600 hover:text-white group cursor-default"
                                >
                                    <td className="px-4 py-0.5 border-x font-mono">{r.initials}</td>
                                    <td className="px-4 py-0.5 border-x">{getEntityName(r)}</td>
                                    <td className="px-4 py-0.5 border-x text-center">
                                        <input
                                            type="checkbox"
                                            checked={r.isActive}
                                            onChange={() => toggleActive(r)}
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
                Double-click to edit sales rep
            </div>

            {showNewForm && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[2000]">
                    <div className="bg-[#f0f0f0] border-4 border-[#003366] w-[400px] shadow-2xl">
                        <div className="bg-[#003366] p-2 flex justify-between items-center">
                            <h3 className="text-white font-bold text-xs uppercase tracking-widest">{editingId ? 'Edit Sales Rep' : 'New Sales Rep'}</h3>
                            <button onClick={resetForm} className="text-white hover:text-red-400 text-sm">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Sales Rep Name (Employee or Vendor)</label>
                                <select
                                    className="border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 bg-white"
                                    value={selectedEntityId}
                                    onChange={e => setSelectedEntityId(e.target.value)}
                                >
                                    <option value="">--Select Name--</option>
                                    <optgroup label="Employees">
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </optgroup>
                                    <optgroup label="Vendors">
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1 w-24">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Initials</label>
                                <input
                                    maxLength={3}
                                    className="border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 bg-white uppercase font-mono"
                                    value={initials}
                                    onChange={e => setInitials(e.target.value)}
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

export default SalesRepList;
