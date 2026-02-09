
import React, { useState } from 'react';
import { Employee, Customer, Item, TimeEntry } from '../types';

interface Props {
   employees: Employee[];
   customers: Customer[];
   items: Item[];
   onSave: (entry: TimeEntry) => void;
   onClose: () => void;
}

const SingleTimeEntry: React.FC<Props> = ({ employees, customers, items, onSave, onClose }) => {
   const [formData, setFormData] = useState<Partial<TimeEntry>>({
      date: new Date().toLocaleDateString(),
      employeeId: employees[0]?.id || '',
      customerId: '',
      itemId: '',
      hours: 0,
      isBillable: true,
      description: '',
      status: 'PENDING'
   });

   const handleRecord = () => {
      if (!formData.employeeId || !formData.hours) return alert("Please enter employee and duration.");
      onSave({
         ...formData,
         id: Math.random().toString(),
      } as TimeEntry);
      onClose();
   };

   return (
      <div className="bg-[#f0f0f0] h-full flex flex-col p-4">
         <div className="bg-white border border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden max-w-2xl mx-auto w-full">
            <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
               <h2 className="text-xl font-bold text-[#003366]">Time/Enter Single Activity</h2>
               <div className="flex gap-2">
                  <button onClick={handleRecord} className="bg-blue-600 text-white px-6 py-1 text-xs font-bold rounded shadow-sm">Save & Close</button>
                  <button onClick={onClose} className="bg-white border border-gray-400 px-6 py-1 text-xs font-bold rounded">Cancel</button>
               </div>
            </div>

            <div className="p-8 space-y-6 flex-1 overflow-auto">
               <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-bold text-gray-500 uppercase">Date</label>
                     <input className="border p-2 text-sm bg-blue-50 outline-none" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-bold text-gray-500 uppercase">Employee</label>
                     <select className="border p-2 text-sm bg-blue-50 font-bold outline-none" value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value })}>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                     </select>
                  </div>
               </div>

               <div className="space-y-4 border-t pt-4">
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-bold text-gray-500 uppercase italic">Customer:Job</label>
                     <select className="border p-2 text-sm bg-white outline-none" value={formData.customerId} onChange={e => setFormData({ ...formData, customerId: e.target.value })}>
                        <option value="">--Select Customer or Project--</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-bold text-gray-500 uppercase italic">Service Item</label>
                     <select className="border p-2 text-sm bg-white outline-none" value={formData.itemId} onChange={e => setFormData({ ...formData, itemId: e.target.value })}>
                        <option value="">--Select Service--</option>
                        {items.filter(i => i.type === 'Service').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                     </select>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-8 items-end">
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-bold text-gray-500 uppercase">Duration (Hours)</label>
                     <div className="flex items-center gap-2">
                        <input type="number" className="border p-2 text-2xl font-bold font-mono text-center w-32 bg-yellow-50 outline-none" value={formData.hours} onChange={e => setFormData({ ...formData, hours: parseFloat(e.target.value) || 0 })} />
                        <button className="bg-gray-100 border p-2 rounded text-xs font-bold hover:bg-gray-200">⏱ Start Timer</button>
                     </div>
                  </div>
                  <label className="flex items-center gap-2 font-bold text-xs cursor-pointer mb-3">
                     <input type="checkbox" checked={formData.isBillable} onChange={e => setFormData({ ...formData, isBillable: e.target.checked })} />
                     Billable to Customer
                  </label>
               </div>

               <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Notes / Work Description</label>
                  <textarea className="border p-2 text-xs h-24 outline-none focus:ring-1 ring-blue-500" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the work performed..." />
               </div>
            </div>

         </div>
      </div>
   );
};

export default SingleTimeEntry;
