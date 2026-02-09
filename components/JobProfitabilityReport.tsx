
import React from 'react';
import { Transaction, Customer, Job } from '../types';

interface Props {
   transactions: Transaction[];
   customers: Customer[];
   selectedJobId?: string;
   companyName: string;
}

const JobProfitabilityReport: React.FC<Props> = ({ transactions, customers, selectedJobId, companyName }) => {
   // Find the selected job/customer
   const allJobs = customers.flatMap(c => c.jobs.map(j => ({ ...j, customerName: c.name })));
   const job = allJobs.find(j => j.id === selectedJobId);

   // Filter transactions related to this job
   const jobTransactions = transactions.filter(t =>
      t.entityId === selectedJobId ||
      t.items.some(i => i.customerId === selectedJobId)
   );

   const revenue = jobTransactions
      .filter(t => t.type === 'INVOICE' || t.type === 'SALES_RECEIPT')
      .reduce((s, t) => s + t.total, 0);

   const costs = jobTransactions
      .filter(t => ['BILL', 'CHECK', 'CC_CHARGE'].includes(t.type))
      .reduce((sum, t) => {
         // Only count line items specifically tagged for this job
         const jobLineSum = t.items
            .filter(i => i.customerId === selectedJobId)
            .reduce((s, i) => s + i.amount, 0);

         // If the whole transaction is for the job (e.g. specialized subcontract)
         const totalCost = t.entityId === selectedJobId ? t.total : jobLineSum;
         return sum + totalCost;
      }, 0);

   return (
      <div className="bg-white p-12 min-h-full flex flex-col items-center select-none">
         <div className="w-full max-w-4xl">
            <div className="text-center mb-12 border-b-2 border-gray-800 pb-4">
               <h1 className="text-xl font-bold uppercase tracking-[0.2em]">{companyName}</h1>
               <h2 className="text-3xl font-serif italic text-blue-900 mt-2">Job Profitability Summary</h2>
               <p className="text-[10px] font-bold text-gray-500 uppercase mt-1 italic">As of {new Date().toLocaleDateString()}</p>
            </div>

            <div className="bg-blue-50 p-4 border rounded mb-8 flex justify-between items-center shadow-inner">
               <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Project</span>
                  <span className="text-lg font-bold text-slate-800">{job ? `${job.customerName}: ${job.name}` : 'All Jobs'}</span>
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Status</span>
                  <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${job?.status === 'Closed' ? 'bg-gray-200' : 'bg-green-100 text-green-800'}`}>
                     {job?.status || 'Active'}
                  </span>
               </div>
            </div>

            <table className="w-full text-sm">
               <thead className="border-b-2 border-slate-400">
                  <tr className="text-left h-10 uppercase text-[10px] font-black text-slate-600">
                     <th className="px-2">Account/Category</th>
                     <th className="px-2 text-right">Actual Revenue</th>
                     <th className="px-2 text-right">Actual Cost</th>
                     <th className="px-2 text-right">Profit ($)</th>
                     <th className="px-2 text-right">% Profit</th>
                  </tr>
               </thead>
               <tbody>
                  <tr className="h-12 border-b border-gray-100 hover:bg-slate-50 font-bold text-slate-800">
                     <td className="px-2">Project Totals</td>
                     <td className="px-2 text-right text-green-700 font-mono">${revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                     <td className="px-2 text-right text-red-700 font-mono">${costs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                     <td className="px-2 text-right font-mono">${(revenue - costs).toLocaleString()}</td>
                     <td className="px-2 text-right font-mono">{revenue > 0 ? ((revenue - costs) / revenue * 100).toFixed(1) : 0}%</td>
                  </tr>
                  {/* Simulated detail rows */}
                  <tr className="h-10 border-b border-gray-50 text-xs italic text-gray-500">
                     <td className="px-4">↳ Materials</td>
                     <td className="px-2 text-right font-mono">---</td>
                     <td className="px-2 text-right font-mono">${(costs * 0.6).toLocaleString()}</td>
                     <td className="px-2"></td><td className="px-2"></td>
                  </tr>
                  <tr className="h-10 border-b border-gray-50 text-xs italic text-gray-500">
                     <td className="px-4">↳ Labor (Timesheet pass-through)</td>
                     <td className="px-2 text-right font-mono">---</td>
                     <td className="px-2 text-right font-mono">${(costs * 0.4).toLocaleString()}</td>
                     <td className="px-2"></td><td className="px-2"></td>
                  </tr>
               </tbody>
               <tfoot>
                  <tr className="h-16 border-t-4 border-slate-800 font-black text-lg">
                     <td className="px-2 uppercase">Net Profit</td>
                     <td colSpan={3} className="px-2 text-right text-blue-900 font-mono">
                        ${(revenue - costs).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                     </td>
                     <td className="px-2"></td>
                  </tr>
               </tfoot>
            </table>

            <div className="mt-16 text-center">
               <div className="inline-block border-2 border-gray-200 px-10 py-2 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                  qbXpress - Job Costing Engine
               </div>
            </div>
         </div>
      </div>
   );
};

export default JobProfitabilityReport;
