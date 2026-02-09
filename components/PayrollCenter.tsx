
import React, { useState, useMemo } from 'react';
import { Employee, PayrollLiability, Transaction } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
   employees: Employee[];
   liabilities: PayrollLiability[];
   onOpenPayEmployees: () => void;
   onOpenPayLiabilities: () => void;
   onOpenReport: (type: string, title: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const PayrollCenter: React.FC<Props> = ({ employees, liabilities, onOpenPayEmployees, onOpenPayLiabilities, onOpenReport }) => {
   const [activeTab, setActiveTab] = useState<'PAY_EMPLOYEES' | 'PAY_LIABILITIES'>('PAY_EMPLOYEES');

   const liabilityData = useMemo(() => {
      const groups: { [key: string]: number } = {};
      liabilities.forEach(l => {
         groups[l.type] = (groups[l.type] || 0) + l.amount;
      });
      return Object.entries(groups).map(([name, value]) => ({ name, value }));
   }, [liabilities]);

   return (
      <div className="flex h-full bg-white overflow-hidden select-none">
         {/* Dashboard Style Detail */}
         <div className="flex-1 flex flex-col min-w-0">
            <div className="p-6 bg-[#f0f4f8] border-b border-gray-300 flex justify-between items-center shadow-sm">
               <div>
                  <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Payroll Center</h1>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 italic">Running Payroll</p>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => onOpenReport('PAYROLL_SUMMARY', 'Payroll Summary')} className="bg-blue-900 text-white border border-blue-950 px-4 py-1 text-xs font-bold rounded shadow-lg hover:brightness-110 uppercase tracking-tighter">Payroll Summary</button>
               </div>
            </div>

            <div className="flex-1 flex flex-col">
               <div className="flex px-6 bg-gray-100 border-b border-gray-300">
                  {[
                     { id: 'PAY_EMPLOYEES', label: 'Pay Employees' },
                     { id: 'PAY_LIABILITIES', label: 'Pay Liabilities' }
                  ].map(t => (
                     <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`px-8 py-2.5 text-[11px] font-bold border-t border-l border-r rounded-t-sm mt-1 mr-1 transition-all ${activeTab === t.id ? 'bg-white border-gray-300 text-blue-900 z-10' : 'bg-gray-200 text-gray-500 hover:bg-gray-50'}`}
                     >
                        {t.label}
                     </button>
                  ))}
               </div>

               <div className="flex-1 p-8 overflow-auto bg-white">
                  {activeTab === 'PAY_EMPLOYEES' && (
                     <div className="space-y-8">
                        <div className="bg-blue-50 border border-blue-200 p-6 rounded shadow-inner flex justify-between items-center">
                           <div className="space-y-1">
                              <h3 className="text-lg font-bold text-blue-900">Create Paychecks</h3>
                              <p className="text-xs text-gray-600">Start the process to pay your employees for their tracked hours.</p>
                           </div>
                           <button
                              onClick={onOpenPayEmployees}
                              className="bg-blue-600 text-white px-10 py-2 rounded font-bold hover:brightness-110 shadow-lg active:scale-95 transition-all uppercase text-sm"
                           >
                              Start Scheduled Payroll
                           </button>
                        </div>

                        <div className="border border-gray-200 rounded">
                           <div className="bg-gray-50 p-2 text-[10px] font-bold uppercase text-gray-500 border-b tracking-widest">Active Employees</div>
                           <table className="w-full text-xs text-left">
                              <thead className="bg-white border-b">
                                 <tr>
                                    <th className="p-3 border-r">Employee</th>
                                    <th className="p-3 border-r">SSN</th>
                                    <th className="p-3 border-r">Pay Period</th>
                                    <th className="p-3 text-right">Hourly Rate</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {employees.map(e => (
                                    <tr key={e.id} className="border-b hover:bg-slate-50">
                                       <td className="p-3 border-r font-bold text-slate-800">{e.name}</td>
                                       <td className="p-3 border-r font-mono text-gray-400">{e.ssn}</td>
                                       <td className="p-3 border-r">Weekly</td>
                                       <td className="p-3 text-right font-bold text-blue-900">${e.hourlyRate.toFixed(2)}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  )}

                  {activeTab === 'PAY_LIABILITIES' && (
                     <div className="space-y-6">
                        <div className="flex justify-between items-start gap-8">
                           <div className="flex-1">
                              <h3 className="text-lg font-bold text-slate-700 mb-4">Pay Taxes & Other Liabilities</h3>
                              <table className="w-full text-xs text-left border border-gray-200">
                                 <thead className="bg-gray-50 border-b">
                                    <tr>
                                       <th className="p-3 border-r">Tax/Insurance Type</th>
                                       <th className="p-3 border-r">Payee</th>
                                       <th className="p-3 border-r">Due Date</th>
                                       <th className="p-3 text-right">Amount Due</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {liabilities.map(l => (
                                       <tr key={l.id} className="border-b hover:bg-yellow-50">
                                          <td className="p-3 border-r font-bold">{l.type}</td>
                                          <td className="p-3 border-r text-gray-500">U.S. Treasury</td>
                                          <td className="p-3 border-r">{l.dueDate}</td>
                                          <td className="p-3 text-right font-bold text-red-700 font-mono">${l.amount.toLocaleString()}</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                           <div className="w-80 bg-slate-50 border border-slate-200 p-4 rounded shadow-inner">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Liability Breakdown</h4>
                              <div className="h-48">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                       <Pie data={liabilityData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                          {liabilityData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                       </Pie>
                                       <Tooltip contentStyle={{ fontSize: '10px' }} />
                                       <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    </PieChart>
                                 </ResponsiveContainer>
                              </div>
                              <div className="mt-4 pt-4 border-t border-slate-200 text-right">
                                 <div className="text-[10px] text-slate-400 font-bold uppercase">Total Due</div>
                                 <div className="text-xl font-black text-slate-800">${liabilities.reduce((acc, l) => acc + l.amount, 0).toLocaleString()}</div>
                              </div>
                           </div>
                        </div>
                        <div className="flex justify-end">
                           <button
                              onClick={onOpenPayLiabilities}
                              className="bg-green-600 text-white px-8 py-2 rounded font-bold shadow-md hover:bg-green-700"
                           >
                              View/Pay Selected Liabilities
                           </button>
                        </div>
                     </div>
                  )}


               </div>
            </div>
         </div>
      </div>
   );
};

export default PayrollCenter;
