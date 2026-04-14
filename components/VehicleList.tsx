
import React, { useState } from 'react';
import { Vehicle } from '../types';

interface Props {
    vehicles: Vehicle[];
    onUpdate: (v: Vehicle) => void;
    onDelete: (id: string) => void;
}

const VehicleDialog: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (v: Partial<Vehicle>) => void;
    initialData?: Vehicle;
}> = ({ isOpen, onClose, onSave, initialData }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [make, setMake] = useState(initialData?.make || '');
    const [model, setModel] = useState(initialData?.model || '');
    const [year, setYear] = useState(initialData?.year || '');
    const [vin, setVin] = useState(initialData?.vin || '');
    const [desc, setDesc] = useState(initialData?.description || '');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#f0f0f0] border-2 border-[#003366] shadow-2xl w-[95vw] h-[95vh] rounded-sm flex flex-col overflow-hidden">
                <div className="bg-[#003366] text-white px-3 py-1 flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider">{initialData ? 'Edit' : 'New'} Vehicle</span>
                    <button onClick={onClose} className="hover:bg-red-500 rounded px-1 transition-colors">✕</button>
                </div>
                <div className="p-4 bg-white space-y-3">
                    <div className="flex items-center gap-4">
                        <label className="text-[11px] font-bold w-24 text-gray-700 uppercase">Vehicle Name:</label>
                        <input
                            autoFocus
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="flex-1 border border-gray-400 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-[11px] font-bold w-24 text-gray-700 uppercase">Make:</label>
                        <input
                            value={make}
                            onChange={e => setMake(e.target.value)}
                            className="flex-1 border border-gray-400 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-[11px] font-bold w-24 text-gray-700 uppercase">Model:</label>
                        <input
                            value={model}
                            onChange={e => setModel(e.target.value)}
                            className="flex-1 border border-gray-400 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-[11px] font-bold w-24 text-gray-700 uppercase">Year:</label>
                        <input
                            value={year}
                            onChange={e => setYear(e.target.value)}
                            className="w-32 border border-gray-400 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-[11px] font-bold w-24 text-gray-700 uppercase">VIN:</label>
                        <input
                            value={vin}
                            onChange={e => setVin(e.target.value)}
                            className="flex-1 border border-gray-400 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-gray-700 uppercase">Description:</label>
                        <textarea
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-400 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                        />
                    </div>
                </div>
                <div className="bg-[#e0e0e0] p-2 flex justify-end gap-2 border-t border-gray-300">
                    <button
                        onClick={onClose}
                        className="px-4 py-1 border border-gray-400 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave({ name, make, model, year, vin, description: desc })}
                        disabled={!name}
                        className="px-6 py-1 bg-[#003366] hover:bg-[#004488] text-white text-xs font-bold rounded shadow-md disabled:bg-gray-400"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

const VehicleList: React.FC<Props> = ({ vehicles, onUpdate, onDelete }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<{ open: boolean, data?: Vehicle }>({ open: false });

    const handleAdd = () => setDialog({ open: true });
    const handleEdit = () => {
        const v = vehicles.find(x => x.id === selectedId);
        if (v) setDialog({ open: true, data: v });
    };

    const handleDelete = () => {
        if (selectedId && window.confirm("Delete this vehicle?")) {
            onDelete(selectedId);
            setSelectedId(null);
        }
    };

    const handleSave = (data: Partial<Vehicle>) => {
        onUpdate({
            id: dialog.data?.id || Math.random().toString(),
            name: data.name!,
            make: data.make,
            model: data.model,
            year: data.year,
            vin: data.vin,
            description: data.description,
            isActive: true
        });
        setDialog({ open: false });
    };

    return (
        <div className="flex flex-col h-full bg-[#f0f0f0]">
            <div className="flex-1 overflow-auto bg-white m-1 border border-gray-400">
                <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-400">
                        <tr className="h-6">
                            <th className="px-3 border-r border-gray-300 font-bold uppercase w-1/4">Vehicle Name</th>
                            <th className="px-3 border-r border-gray-300 font-bold uppercase w-1/4">Make/Model</th>
                            <th className="px-3 border-r border-gray-300 font-bold uppercase w-1/4">Year</th>
                            <th className="px-3 font-bold uppercase w-1/4">VIN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(vehicles || []).map(v => (
                            <tr
                                key={v.id}
                                onDoubleClick={handleEdit}
                                onClick={() => setSelectedId(v.id)}
                                className={`h-5 border-b border-gray-100 ${selectedId === v.id ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'}`}
                            >
                                <td className="px-3 font-bold">{v.name}</td>
                                <td className="px-3">{v.make && v.model ? `${v.make} ${v.model}` : v.make || v.model || '--'}</td>
                                <td className="px-3">{v.year || '--'}</td>
                                <td className="px-3">{v.vin || '--'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="bg-[#f0f0f0] p-1 border-t border-gray-300">
                <div className="relative group inline-block">
                    <button className="bg-gray-100 hover:bg-white border border-gray-400 px-3 py-0.5 text-[11px] font-bold rounded uppercase">Vehicle ▼</button>
                    <div className="hidden group-hover:block absolute bottom-full left-0 bg-white border border-gray-400 shadow-xl min-w-[150px] py-1 z-50">
                        <button onClick={handleAdd} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs">New</button>
                        <button onClick={handleEdit} disabled={!selectedId} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs disabled:opacity-50">Edit</button>
                        <button onClick={handleDelete} disabled={!selectedId} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs disabled:opacity-50">Delete</button>
                    </div>
                </div>
            </div>

            <VehicleDialog
                isOpen={dialog.open}
                initialData={dialog.data}
                onClose={() => setDialog({ open: false })}
                onSave={handleSave}
            />
        </div>
    );
};

export default VehicleList;
