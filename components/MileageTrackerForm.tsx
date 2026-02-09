
import React, { useState } from 'react';
import { Customer, Item, Transaction } from '../types';

interface MileageEntry {
    id: string;
    date: string;
    vehicle: string;
    odometerStart: number;
    odometerEnd: number;
    totalMiles: number;
    customerId?: string;
    itemId?: string; // e.g., "Mileage Reimbursable"
    isBillable: boolean;
    notes: string;
    status: 'PENDING' | 'INVOICED' | 'PAID';
}

interface Props {
    customers: Customer[];
    items: Item[];
    onSave: (entry: MileageEntry) => void;
    onClose: () => void;
}

const MileageTrackerForm: React.FC<Props> = ({ customers, items, onSave, onClose }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [vehicle, setVehicle] = useState('');
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);
    const [customerId, setCustomerId] = useState('');
    const [itemId, setItemId] = useState('');
    const [isBillable, setIsBillable] = useState(false);
    const [notes, setNotes] = useState('');

    const handleSave = () => {
        if (end < start) {
            alert("End odometer cannot be less than start odometer.");
            return;
        }

        const entry: MileageEntry = {
            id: Math.random().toString(),
            date,
            vehicle,
            odometerStart: start,
            odometerEnd: end,
            totalMiles: end - start,
            customerId,
            itemId,
            isBillable,
            notes,
            status: 'PENDING'
        };

        onSave(entry);
        alert("Mileage record saved successfully!");
        onClose();
    };

    return (
        <div className="flex flex-col h-full bg-[#f0f0f0] select-none font-sans">
            <div className="bg-[#003366] text-white p-2 flex justify-between items-center shadow-md">
                <h2 className="text-sm font-bold flex items-center gap-2">🚗 Track Vehicle Mileage</h2>
                <button onClick={onClose} className="hover:bg-red-600 px-2 rounded transition-colors font-bold">✕</button>
            </div>

            <div className="p-1 bg-white border-b border-gray-300 flex gap-1 shadow-sm">
                <button onClick={handleSave} className="px-4 py-1 hover:bg-gray-100 text-xs font-bold text-blue-900 border border-transparent hover:border-gray-300 rounded flex flex-col items-center gap-1 group">
                    <span className="text-lg group-hover:scale-110 transition-transform">💾</span> Save & Close
                </button>
                <button className="px-4 py-1 hover:bg-gray-100 text-xs font-bold text-blue-900 border border-transparent hover:border-gray-300 rounded flex flex-col items-center gap-1 group">
                    <span className="text-lg group-hover:scale-110 transition-transform">🖨️</span> Print
                </button>
            </div>

            <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-2xl mx-auto bg-white p-8 border border-gray-300 shadow-xl rounded-sm">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Date</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Vehicle</label>
                                <input type="text" value={vehicle} onChange={e => setVehicle(e.target.value)} className="w-full border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Odometer Start</label>
                                    <input type="number" value={start} onChange={e => setStart(Number(e.target.value))} className="w-full border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner text-right" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Odometer End</label>
                                    <input type="number" value={end} onChange={e => setEnd(Number(e.target.value))} className="w-full border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner text-right" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Customer:Job (Optional)</label>
                                <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border border-gray-300 p-2 text-sm focus:border-blue-500 outline-none shadow-inner">
                                    <option value="">- None -</option>
                                    {customers.map(c => (
                                        <React.Fragment key={c.id}>
                                            <option value={c.id}>{c.name}</option>
                                            {(c.jobs || []).map(j => (
                                                <option key={j.id} value={j.id}>&nbsp;&nbsp;{c.name}:{j.name}</option>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </select>
                            </div>
                            {customerId && (
                                <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                                    <input type="checkbox" checked={isBillable} onChange={e => setIsBillable(e.target.checked)} id="billable" className="w-4 h-4" />
                                    <label htmlFor="billable" className="text-xs font-bold text-blue-900">Billable to Customer</label>
                                </div>
                            )}
                            {isBillable && (
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Service Item</label>
                                    <select value={itemId} onChange={e => setItemId(e.target.value)} className="w-full border border-gray-300 p-2 text-sm focus:border-blue-500 outline-none shadow-inner">
                                        <option value="">- Select Item -</option>
                                        {items.filter(i => i.type === 'Service' || i.type === 'Other Charge').map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 border-t pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calculated Distance</span>
                            <span className="text-3xl font-black text-blue-600 font-mono">{(end - start).toLocaleString()} MI</span>
                        </div>
                        <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Notes / Purpose of Trip</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-gray-300 p-4 text-sm focus:border-blue-500 outline-none h-24 bg-yellow-50 font-serif italic shadow-inner" placeholder="E.g., Site visit for Project X..."></textarea>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default MileageTrackerForm;
