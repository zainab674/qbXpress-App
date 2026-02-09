
import React, { useState } from 'react';
import { Job } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Job) => void;
  initialData?: Job;
  customerName: string;
}

const JobForm: React.FC<Props> = ({ isOpen, onClose, onSave, initialData, customerName }) => {
  const [formData, setFormData] = useState<Job>(initialData || {
    id: Math.random().toString(),
    name: '',
    status: 'In progress',
    isActive: true
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[460] p-4">
      <div className="bg-white w-[600px] rounded shadow-2xl border border-gray-500 overflow-hidden flex flex-col">
        <div className="bg-[#003366] p-2 text-white font-bold text-sm flex justify-between items-center select-none">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
            <span>{initialData ? 'Edit' : 'New'} Job</span>
          </div>
          <button onClick={onClose} className="hover:bg-red-600 px-2 font-serif">X</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 border rounded-sm flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase">Customer</span>
            <span className="text-sm font-bold text-gray-800">{customerName}</span>
          </div>

          <div className="grid grid-cols-4 gap-4 items-center">
            <label className="text-xs font-bold uppercase italic text-gray-500">Job Name</label>
            <input
              className="border p-1 text-xs col-span-3 outline-none focus:ring-1 ring-blue-500 font-bold"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />
          </div>

          <div className="border-t pt-4 space-y-4">

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold">Job Status</label>
                  <select className="border p-1 text-xs outline-none" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                    <option>Pending</option>
                    <option>Awarded</option>
                    <option>In progress</option>
                    <option>Closed</option>
                    <option>Not awarded</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold">Start Date</label>
                  <input type="text" className="border p-1 text-xs outline-none" placeholder="mm/dd/yyyy" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold">Job Description</label>
                <textarea
                  className="border p-2 text-xs h-24 outline-none focus:ring-1 ring-blue-500"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 p-4 border-t border-gray-400 flex justify-end gap-2">
          <button onClick={() => onSave(formData)} className="px-6 py-1 bg-[#0077c5] text-white text-xs font-bold rounded shadow-sm">OK</button>
          <button onClick={onClose} className="px-6 py-1 border border-gray-400 bg-white text-xs font-bold rounded shadow-sm hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default JobForm;
