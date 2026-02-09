
import React, { useState, useMemo } from 'react';
import { Employee, TimeEntry, Transaction } from '../types';

interface Props {
   employees: Employee[];
   timeEntries: TimeEntry[];
   onSave: (paychecks: Transaction[]) => void;
   onClose: () => void;
}

const PayEmployeesForm: React.FC<Props> = ({ employees, timeEntries, onSave, onClose }) => {
   const [payPeriodEnd, setPayPeriodEnd] = useState('03/18/2017');
   const [checkDate, setCheckDate] = useState('03/24/2017');
   const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>(employees.map(e => e.id));
   const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
   const [deductions, setDeductions] = useState<Record<string, { fed: number, ss: number, med: number }>>({});

   const getDeductionsFor = (id: string, gross: number) => {
      const emp = employees.find(e => e.id === id);

      // 2017 Standard Tax Calculations (Simplified for Functional Website)
      const deductions = {
         fed: gross * 0.10, // Default 10%
         ss: gross * 0.062, // 6.2%
         med: gross * 0.0145, // 1.45%
         state: gross * 0.035 // 3.5% Default State Tax
      };

      if (emp?.federalTax) {
         // Federal withholding based on allowances
         // Each allowance reduces taxable income by $4,050/year
         const allowDeduction = (emp.federalTax.allowances * 4050) / 52;
         const taxable = Math.max(0, gross - allowDeduction);

         // Basic bracket approximation
         let rate = 0.10;
         if (taxable > 2000) rate = 0.25;
         else if (taxable > 800) rate = 0.15;

         deductions.fed = (taxable * rate) + (emp.federalTax.extraWithholding || 0);
      }

      return deductions;
   };

   const handleDeductionChange = (id: string, field: 'fed' | 'ss' | 'med', val: string) => {
      const num = parseFloat(val) || 0;
      const emp = employees.find(e => e.id === id)!;
      const hours = timeEntries.filter(t => t.employeeId === id && t.status === 'PENDING').reduce((s, t) => s + t.hours, 0) || 40;
      const gross = hours * emp.hourlyRate;
      const current = getDeductionsFor(id, gross);
      setDeductions({ ...deductions, [id]: { ...current, [field]: num } });
   };

   const currentEmpCalcs = useMemo(() => {
      if (!editingEmpId) return { gross: 0, fed: 0, ss: 0, med: 0, net: 0 };
      const emp = employees.find(e => e.id === editingEmpId)!;
      const hours = timeEntries.filter(t => t.employeeId === editingEmpId && t.status === 'PENDING').reduce((s, t) => s + t.hours, 0) || 40;
      const gross = hours * emp.hourlyRate;
      const d = getDeductionsFor(editingEmpId, gross);
      return { gross, ...d, net: gross - (d.fed + d.ss + d.med) };
   }, [editingEmpId, deductions, employees, timeEntries]);

   const handleCreate = () => {
      const paychecks: Transaction[] = selectedEmpIds.map(id => {
         const emp = employees.find(e => e.id === id)!;
         // Filter time entries for this employee that are pending
         const hours = timeEntries
            .filter(t => t.employeeId === id && t.status === 'PENDING')
            .reduce((sum, t) => sum + t.hours, 0) || 40;

         const empDeductions = deductions[id] || {
            fed: hours * emp.hourlyRate * 0.10,
            ss: hours * emp.hourlyRate * 0.062,
            med: hours * emp.hourlyRate * 0.0145
         };

         const gross = hours * emp.hourlyRate;
         const totalDeductions = empDeductions.fed + empDeductions.ss + empDeductions.med + (empDeductions.state || 0);
         const net = gross - totalDeductions;

         return {
            id: Math.random().toString(),
            type: 'PAYCHECK',
            refNo: 'CH-' + Math.floor(Math.random() * 9000),
            date: checkDate,
            entityId: id,
            items: [
               { id: Math.random().toString(), description: 'Gross Wages', quantity: hours, rate: emp.hourlyRate, amount: gross, tax: false },
               { id: Math.random().toString(), description: 'Federal Withholding', quantity: 1, rate: -empDeductions.fed, amount: -empDeductions.fed, tax: false },
               { id: Math.random().toString(), description: 'Social Security', quantity: 1, rate: -empDeductions.ss, amount: -empDeductions.ss, tax: false },
               { id: Math.random().toString(), description: 'Medicare', quantity: 1, rate: -empDeductions.med, amount: -empDeductions.med, tax: false },
               { id: Math.random().toString(), description: 'State Withholding', quantity: 1, rate: -(empDeductions.state || 0), amount: -(empDeductions.state || 0), tax: false },
            ],
            total: net,
            status: 'PAID',
            bankAccountId: '1'
         };
      });

      onSave(paychecks);
      alert(`Generated ${paychecks.length} paychecks totaling $${paychecks.reduce((s, p) => s + p.total, 0).toLocaleString()}`);
      onClose();
   };

   return (
      <div className="bg-[#f0f0f0] h-full flex flex-col p-4">
         <div className="bg-white border border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-[#003366] text-white flex justify-between items-center select-none shadow-lg">
               <div className="flex items-center gap-3">
                  <span className="text-2xl">💸</span>
                  <h2 className="text-xl font-black uppercase tracking-tighter">Enter Payroll Information</h2>
               </div>
               <div className="flex gap-2">
                  <button onClick={handleCreate} className="bg-green-600 hover:bg-green-500 text-white px-8 py-2 text-xs font-black rounded shadow-md border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-widest">Create Paychecks</button>
                  <button onClick={onClose} className="bg-white/10 hover:bg-white/20 border border-white/30 px-6 py-2 text-xs font-bold rounded uppercase">Cancel</button>
               </div>
            </div>

            <div className="p-6 bg-slate-50 border-b grid grid-cols-3 gap-8 shadow-inner">
               <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Account</label>
                  <select className="border-2 border-slate-200 p-2 text-xs bg-white outline-none font-bold shadow-sm focus:border-blue-400">
                     <option>First Financial Checking</option>
                  </select>
               </div>
               <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pay Period Ends</label>
                  <input className="border-2 border-slate-200 p-2 text-xs font-bold focus:border-blue-400 focus:shadow-md outline-none" value={payPeriodEnd} onChange={e => setPayPeriodEnd(e.target.value)} />
               </div>
               <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[#003366]">Check Date</label>
                  <input className="border-2 border-blue-400 p-2 text-xs font-black shadow-md focus:brightness-105 outline-none" value={checkDate} onChange={e => setCheckDate(e.target.value)} />
               </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-white relative">
               <table className="w-full text-xs text-left">
                  <thead className="bg-[#e8f1f8] border-b-2 border-blue-200 sticky top-0 z-10 text-[#003366] font-black uppercase text-[10px]">
                     <tr>
                        <th className="p-3 w-8"><input type="checkbox" checked={selectedEmpIds.length === employees.length} onChange={() => setSelectedEmpIds(selectedEmpIds.length === employees.length ? [] : employees.map(e => e.id))} /></th>
                        <th className="p-3 border-r">Employee</th>
                        <th className="p-3 border-r text-right">Regular Hours</th>
                        <th className="p-3 border-r text-right">Hourly Rate</th>
                        <th className="p-3 text-right">Estimated Gross Pay</th>
                        <th className="p-3"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50">
                     {employees.map(e => {
                        const hours = timeEntries
                           .filter(t => t.employeeId === e.id && t.status === 'PENDING')
                           .reduce((sum, t) => sum + t.hours, 0) || 40;
                        return (
                           <tr key={e.id} className="hover:bg-blue-50/50 transition-colors group">
                              <td className="p-3 text-center">
                                 <input
                                    type="checkbox"
                                    className="w-4 h-4 cursor-pointer"
                                    checked={selectedEmpIds.includes(e.id)}
                                    onChange={() => {
                                       if (selectedEmpIds.includes(e.id)) setSelectedEmpIds(selectedEmpIds.filter(id => id !== e.id));
                                       else setSelectedEmpIds([...selectedEmpIds, e.id]);
                                    }}
                                 />
                              </td>
                              <td className="p-3 border-r font-black text-slate-700">{e.name}</td>
                              <td className="p-3 border-r text-right font-mono text-slate-500">{hours.toFixed(2)}</td>
                              <td className="p-3 border-r text-right text-slate-400 font-medium">${e.hourlyRate.toFixed(2)}</td>
                              <td className="p-3 text-right font-black text-blue-900 text-lg">${(hours * e.hourlyRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-center">
                                 <button
                                    onClick={() => setEditingEmpId(e.id)}
                                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded font-black text-[9px] hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest"
                                 >
                                    Edit Details
                                 </button>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>

            {editingEmpId && (
               <div className="fixed inset-0 bg-[#003366]/60 z-[200] flex items-center justify-center p-12 backdrop-blur-sm">
                  <div className="bg-white border-8 border-[#003366] w-[700px] shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 rounded-xl overflow-hidden flex flex-col">
                     <div className="bg-[#003366] p-4 text-white font-black flex justify-between items-center">
                        <span className="uppercase text-sm tracking-[0.2em] flex items-center gap-2">
                           <span className="text-xl">📃</span> Paycheck Detail: {employees.find(e => e.id === editingEmpId)?.name}
                        </span>
                        <button onClick={() => setEditingEmpId(null)} className="hover:bg-red-600 px-3 py-1 rounded transition-colors">✕</button>
                     </div>
                     <div className="p-10 space-y-8 flex-1 overflow-auto">
                        <div className="bg-slate-50 rounded-lg p-6 border-b-4 border-slate-200">
                           <h4 className="text-[11px] font-black text-slate-400 uppercase italic tracking-widest mb-4">Earnings</h4>
                           <div className="flex justify-between items-end border-b-2 border-dotted border-slate-300 pb-2">
                              <span className="text-sm font-bold text-slate-600">Regular Pay ({timeEntries.filter(t => t.employeeId === editingEmpId && t.status === 'PENDING').reduce((s, t) => s + t.hours, 0) || 40} hrs)</span>
                              <span className="text-xl font-black text-[#003366]">${currentEmpCalcs.gross.toFixed(2)}</span>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12">
                           <div>
                              <h4 className="text-[11px] font-black text-red-400 uppercase italic tracking-widest mb-4">Employee Taxes</h4>
                              <div className="space-y-4">
                                 <div className="flex justify-between items-center group">
                                    <span className="text-xs font-bold text-slate-500">Federal Withholding</span>
                                    <div className="flex items-center gap-1">
                                       <span className="text-slate-300 text-xs">$</span>
                                       <input
                                          className="w-24 text-right border-2 border-slate-100 p-1 font-mono text-xs focus:border-red-400 outline-none rounded"
                                          value={currentEmpCalcs.fed.toFixed(2)}
                                          onChange={(e) => handleDeductionChange(editingEmpId!, 'fed', e.target.value)}
                                       />
                                    </div>
                                 </div>
                                 <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">Social Security</span>
                                    <div className="flex items-center gap-1">
                                       <span className="text-slate-300 text-xs">$</span>
                                       <input
                                          className="w-24 text-right border-2 border-slate-100 p-1 font-mono text-xs focus:border-red-400 outline-none rounded"
                                          value={currentEmpCalcs.ss.toFixed(2)}
                                          onChange={(e) => handleDeductionChange(editingEmpId!, 'ss', e.target.value)}
                                       />
                                    </div>
                                 </div>
                                 <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">Medicare</span>
                                    <div className="flex items-center gap-1">
                                       <span className="text-slate-300 text-xs">$</span>
                                       <input
                                          className="w-24 text-right border-2 border-slate-100 p-1 font-mono text-xs focus:border-red-400 outline-none rounded"
                                          value={currentEmpCalcs.med.toFixed(2)}
                                          onChange={(e) => handleDeductionChange(editingEmpId!, 'med', e.target.value)}
                                       />
                                    </div>
                                 </div>
                                 <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">State Tax</span>
                                    <div className="flex items-center gap-1">
                                       <span className="text-slate-300 text-xs">$</span>
                                       <input
                                          className="w-24 text-right border-2 border-slate-100 p-1 font-mono text-xs focus:border-red-400 outline-none rounded"
                                          value={(currentEmpCalcs as any).state?.toFixed(2) || (currentEmpCalcs.gross * 0.035).toFixed(2)}
                                          onChange={(e) => handleDeductionChange(editingEmpId!, 'state' as any, e.target.value)}
                                       />
                                    </div>
                                 </div>
                              </div>
                           </div>
                           <div className="bg-slate-900 p-6 rounded-xl text-white shadow-2xl relative">
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10 border-b border-slate-800 pb-2">Check Summary</div>
                              <div className="space-y-2">
                                 <div className="flex justify-between text-xs opacity-60">
                                    <span>Total Earnings</span>
                                    <span>${currentEmpCalcs.gross.toFixed(2)}</span>
                                 </div>
                                 <div className="flex justify-between text-xs text-red-400">
                                    <span>Total Taxes</span>
                                    <span>-${(currentEmpCalcs.fed + currentEmpCalcs.ss + currentEmpCalcs.med + ((currentEmpCalcs as any).state || currentEmpCalcs.gross * 0.035)).toFixed(2)}</span>
                                 </div>
                              </div>
                              <div className="absolute bottom-6 left-6 right-6">
                                 <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Pay</span>
                                    <span className="text-4xl font-black text-blue-400 font-mono tracking-tighter">${(currentEmpCalcs.gross - (currentEmpCalcs.fed + currentEmpCalcs.ss + currentEmpCalcs.med + ((currentEmpCalcs as any).state || currentEmpCalcs.gross * 0.035))).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                     <div className="bg-slate-100 p-6 border-t flex justify-end gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                        <button onClick={() => setEditingEmpId(null)} className="bg-[#003366] text-white px-12 py-3 text-xs font-black rounded-lg shadow-xl hover:brightness-125 transition-all uppercase tracking-[0.2em]">Confirm & Save Detail</button>
                     </div>
                  </div>
               </div>
            )}

         </div>
      </div>
   );
};

export default PayEmployeesForm;
