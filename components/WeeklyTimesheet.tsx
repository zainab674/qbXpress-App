
import React, { useState } from 'react';
import { Employee, Customer, Item, TimeEntry } from '../types';

interface Props {
  employees: Employee[];
  customers: Customer[];
  items: Item[];
  onSave: (entries: TimeEntry[]) => void;
  onClose: () => void;
}

const WeeklyTimesheet: React.FC<Props> = ({ employees, customers, items, onSave, onClose }) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');
  const [startDate, setStartDate] = useState('03/12/2017');
  const [rows, setRows] = useState<any[]>([
    { customerId: '', itemId: '', serviceDate: '', billable: true, m: 0, tu: 0, w: 0, th: 0, f: 0, sa: 0, su: 0 }
  ]);

  const addRow = () => {
    setRows([...rows, { customerId: '', itemId: '', serviceDate: '', billable: true, m: 0, tu: 0, w: 0, th: 0, f: 0, sa: 0, su: 0 }]);
  };

  const handleRecord = () => {
    const entries: TimeEntry[] = [];
    rows.forEach(row => {
      const days = ['m', 'tu', 'w', 'th', 'f', 'sa', 'su'];
      days.forEach((day, i) => {
        if (row[day] > 0) {
          entries.push({
            id: Math.random().toString(),
            employeeId: selectedEmployeeId,
            customerId: row.customerId,
            itemId: row.itemId,
            date: startDate, // Simplified logic for demo
            hours: row[day],
            isBillable: row.billable,
            description: 'Time tracking entry',
            status: 'PENDING'
          });
        }
      });
    });
    onSave(entries);
    onClose();
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col">
       <div className="bg-white border-b border-gray-300 p-2 flex gap-4">
          <button onClick={handleRecord} className="flex flex-col items-center px-4 py-1 hover:bg-gray-100 rounded">
             <span className="text-xl">💾</span>
             <span className="text-[9px] font-bold uppercase">Save & Close</span>
          </button>
          <button className="flex flex-col items-center px-4 py-1 hover:bg-gray-100 rounded text-gray-400">
             <span className="text-xl">📋</span>
             <span className="text-[9px] font-bold uppercase">Copy Last Week</span>
          </button>
       </div>

       <div className="flex-1 overflow-y-auto p-6 bg-white border border-gray-300 m-2 rounded shadow-sm">
          <div className="flex justify-between items-start mb-8">
             <h1 className="text-3xl font-serif italic text-blue-900/80">Weekly Timesheet</h1>
             <div className="flex gap-8">
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] font-bold text-gray-500 uppercase">Name</label>
                   <select className="border p-1 text-sm bg-blue-50 w-64 outline-none font-bold" value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)}>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                   </select>
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] font-bold text-gray-500 uppercase">Week Of</label>
                   <div className="flex items-center gap-2">
                      <button className="text-gray-400 font-bold px-2">◀</button>
                      <input className="border p-1 text-xs w-24 text-center bg-blue-50" value={startDate} readOnly />
                      <button className="text-gray-400 font-bold px-2">▶</button>
                   </div>
                </div>
             </div>
          </div>

          <div className="border border-gray-300 rounded overflow-hidden">
             <table className="w-full text-[11px] text-left">
                <thead className="bg-[#e8e8e8] border-b border-gray-400">
                   <tr className="h-10">
                      <th className="px-2 border-r w-48">Customer:Job</th>
                      <th className="px-2 border-r w-40">Service Item</th>
                      <th className="px-2 border-r text-center w-12">Billable</th>
                      <th className="px-1 border-r text-center w-10">M</th>
                      <th className="px-1 border-r text-center w-10">Tu</th>
                      <th className="px-1 border-r text-center w-10">W</th>
                      <th className="px-1 border-r text-center w-10">Th</th>
                      <th className="px-1 border-r text-center w-10">F</th>
                      <th className="px-1 border-r text-center w-10">Sa</th>
                      <th className="px-1 border-r text-center w-10">Su</th>
                      <th className="px-2 text-right">Total</th>
                   </tr>
                </thead>
                <tbody>
                   {rows.map((row, idx) => (
                      <tr key={idx} className="border-b h-10 hover:bg-blue-50/50">
                         <td className="px-1 border-r">
                            <select className="w-full bg-transparent outline-none" value={row.customerId} onChange={e => {
                               const nr = [...rows]; nr[idx].customerId = e.target.value; setRows(nr);
                            }}>
                               <option value="">--Select Job--</option>
                               {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                         </td>
                         <td className="px-1 border-r">
                            <select className="w-full bg-transparent outline-none" value={row.itemId} onChange={e => {
                               const nr = [...rows]; nr[idx].itemId = e.target.value; setRows(nr);
                            }}>
                               <option value="">--Service--</option>
                               {items.filter(i => i.type === 'Service').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                         </td>
                         <td className="border-r text-center">
                            <input type="checkbox" checked={row.billable} onChange={e => {
                               const nr = [...rows]; nr[idx].billable = e.target.checked; setRows(nr);
                            }} />
                         </td>
                         {['m', 'tu', 'w', 'th', 'f', 'sa', 'su'].map(day => (
                            <td key={day} className="border-r px-1">
                               <input 
                                className="w-full text-center bg-transparent outline-none focus:bg-white" 
                                value={row[day] || ''} 
                                onChange={e => {
                                   const nr = [...rows]; nr[idx][day] = parseFloat(e.target.value) || 0; setRows(nr);
                                }}
                               />
                            </td>
                         ))}
                         <td className="text-right px-2 font-bold bg-gray-50">
                            {(row.m + row.tu + row.w + row.th + row.f + row.sa + row.su).toFixed(2)}
                         </td>
                      </tr>
                   ))}
                   <tr className="h-10">
                      <td colSpan={11} className="p-2 border-t bg-gray-50">
                         <button onClick={addRow} className="text-blue-600 font-bold uppercase tracking-tighter hover:underline">+ New Row</button>
                      </td>
                   </tr>
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                   <tr className="h-10">
                      <td colSpan={10} className="px-2 text-right uppercase">Total Hours</td>
                      <td className="px-2 text-right font-mono text-lg text-blue-900">
                         {rows.reduce((s, r) => s + (r.m + r.tu + r.w + r.th + r.f + r.sa + r.su), 0).toFixed(2)}
                      </td>
                   </tr>
                </tfoot>
             </table>
          </div>
       </div>
    </div>
  );
};

export default WeeklyTimesheet;
