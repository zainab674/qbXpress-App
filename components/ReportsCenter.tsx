
import React, { useState } from 'react';
import { Transaction, Vendor, Item, Budget, MemorizedReport } from '../types';

interface Props {
   transactions: Transaction[];
   vendors: Vendor[];
   items: Item[];
   budgets: Budget[];
   memorized: MemorizedReport[];
   onMemorize: (report: MemorizedReport) => void;
   onOpenReport: (type: string, title: string) => void;
}

const ReportsCenter: React.FC<Props> = ({ transactions, vendors, items, budgets, memorized, onMemorize, onOpenReport }) => {
   const [activeTab, setActiveTab] = useState<'STANDARD' | 'MEMORIZED' | 'BUDGET'>('STANDARD');
   const [selectedCategory, setSelectedCategory] = useState('Company & Financial');

   const handleMemorizeCurrent = () => {
      const name = prompt("Enter a name for this memorized report:");
      if (name) {
         onMemorize({
            id: Math.random().toString(),
            name,
            baseType: 'PL',
            dateCreated: new Date().toLocaleDateString()
         });
      }
   };

   const categories = [
      {
         name: 'Company & Financial', reports: [
            { id: 'PROFIT_AND_LOSS', title: 'Profit & Loss Standard' },
            { id: 'BALANCE_SHEET', title: 'Balance Sheet Standard' },
            { id: 'GENERAL_LEDGER', title: 'General Ledger' },
            { id: 'TRIAL_BALANCE', title: 'Trial Balance' },
            { id: 'CASH_FLOW', title: 'Statement of Cash Flows' }
         ]
      },
      { name: 'Customers & Receivables', reports: [{ id: 'AGING', title: 'A/R Aging Summary' }, { id: 'CUSTOMER_BALANCE', title: 'Customer Balance Summary' }, { id: 'SALES_CUSTOMER', title: 'Sales by Customer Summary (Ch 24)' }] },
      { name: 'Sales', reports: [{ id: 'SALES_ITEM', title: 'Sales by Item Summary' }, { id: 'SALES_GRAPH', title: 'Sales Graph (Visual)' }] },
      { name: 'Jobs, Time & Mileage', reports: [{ id: 'JOB_PROFITABILITY', title: 'Job Profitability Summary' }, { id: 'JOB_ESTIMATES_VS_ACTUALS', title: 'Job Estimates vs. Actuals' }, { id: 'CHANGE_ORDER_LOG', title: 'Change Order History (Ch 23)' }, { id: 'MILEAGE_DETAIL', title: 'Mileage Detail Report (Ch 25)' }] },
      { name: 'Vendors & Payables', reports: [{ id: 'AP_AGING', title: 'A/P Aging Summary' }, { id: 'VENDOR_BALANCE', title: 'Vendor Balance Summary' }] },
      { name: 'Inventory', reports: [{ id: 'INV_VAL', title: 'Inventory Valuation Summary' }, { id: 'PHYSICAL_INVENTORY', title: 'Physical Inventory Worksheet' }] },
      { name: 'Employees & Payroll', reports: [{ id: 'PAYROLL_SUMMARY', title: 'Payroll Summary' }] },
      { name: 'Payroll', reports: [{ id: 'PAYROLL_LIABILITY', title: 'Payroll Liability Balances' }] },
      { name: 'Accountant & Taxes', reports: [{ id: 'AUDIT_TRAIL', title: 'Audit Trail' }, { id: 'AUDIT_TRAIL_DETAIL', title: 'Audit Trail Detail (Ch 27)' }, { id: 'PL_BY_CLASS', title: 'Profit & Loss by Class (Ch 26)' }, { id: 'FORECAST', title: 'Sales Forecast (Ch 23)' }] }
   ];

   const handleBatchProcess = () => {
      alert("Batch Processing: Preparing [Profit & Loss, Balance Sheet, A/R Aging] for printing... ");
   };

   return (
      <div className="flex flex-col h-full bg-white overflow-hidden text-gray-900">
         <div className="bg-gray-100 border-b p-2 flex justify-between items-center">
            <div className="flex gap-2">
               <button onClick={() => setActiveTab('STANDARD')} className={`px-4 py-1 text-xs font-bold rounded border ${activeTab === 'STANDARD' ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-gray-700 border-gray-300'}`}>Standard</button>
               <button onClick={() => setActiveTab('MEMORIZED')} className={`px-4 py-1 text-xs font-bold rounded border ${activeTab === 'MEMORIZED' ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-gray-700 border-gray-300'}`}>Memorized</button>
               <button onClick={() => setActiveTab('BUDGET')} className={`px-4 py-1 text-xs font-bold rounded border ${activeTab === 'BUDGET' ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-gray-700 border-gray-300'}`}>Budgets</button>
            </div>
            {activeTab === 'STANDARD' && (
               <div className="flex gap-2">
                  <button onClick={handleBatchProcess} className="bg-white border border-gray-400 px-3 py-1 text-[10px] font-bold uppercase rounded hover:bg-gray-50 shadow-sm text-gray-700">Process Multiple Reports</button>
                  <button onClick={handleMemorizeCurrent} className="bg-white border border-gray-400 px-3 py-1 text-[10px] font-bold uppercase rounded hover:bg-gray-50 shadow-sm text-gray-700">Memorize...</button>
               </div>
            )}
         </div>

         <div className="flex-1 flex overflow-hidden">
            {activeTab === 'STANDARD' && (
               <div className="w-64 border-r bg-gray-50 overflow-y-auto">
                  {categories.map(cat => (
                     <div
                        key={cat.name}
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`p-3 border-b cursor-pointer text-[11px] font-bold uppercase tracking-tight transition-colors ${selectedCategory === cat.name ? 'bg-blue-600 text-white shadow-inner' : 'hover:bg-white text-gray-800'}`}
                     >
                        {cat.name}
                     </div>
                  ))}
               </div>
            )}

            <div className="flex-1 overflow-auto bg-white">
               {activeTab === 'STANDARD' && (
                  <div className="p-8 space-y-4">
                     <h3 className="text-sm font-bold text-slate-500 uppercase border-b pb-2 tracking-widest">{selectedCategory} Reports</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Corrected: use selectedCategory state variable instead of its setter function in comparison */}
                        {categories.find(c => c.name === selectedCategory)?.reports.map(r => (
                           <div key={r.id} className="border rounded p-4 shadow-sm hover:border-blue-400 transition-colors group">
                              <div className="font-bold text-blue-900 group-hover:text-blue-600">{r.title}</div>
                              <p className="text-[10px] text-gray-400 mt-1 italic">Summary of financial data...</p>
                              <div className="mt-4 flex gap-2">
                                 <button
                                    onClick={() => {
                                       if (r.id === 'SALES_GRAPH') onOpenReport('COMPANY_SNAPSHOT' as any, 'Sales Graph');
                                       else onOpenReport(r.id, r.title);
                                    }}
                                    className="bg-blue-600 text-white px-4 py-1 text-[10px] font-bold rounded shadow-sm"
                                 >
                                    Run
                                 </button>
                                 <button className="bg-white border border-gray-300 px-4 py-1 text-[10px] font-bold rounded">Customize</button>
                              </div>
                           </div>
                        )) || (
                              <div className="col-span-3 text-center py-20 text-gray-300 font-bold italic uppercase tracking-tighter">
                                 Select a category on the left to see available reports.
                              </div>
                           )}
                     </div>
                  </div>
               )}

               {activeTab === 'MEMORIZED' && (
                  <div className="p-8 max-w-4xl mx-auto">
                     <h2 className="text-xl font-bold mb-4 text-gray-800 border-b-2 pb-2 uppercase tracking-tight">Memorized Reports</h2>
                     <table className="w-full text-sm text-left border border-gray-200">
                        <thead className="bg-gray-100 border-b">
                           <tr className="text-gray-700 font-bold uppercase text-[10px]">
                              <th className="p-3 border-r">Report Name</th>
                              <th className="p-3">Date Created</th>
                           </tr>
                        </thead>
                        <tbody>
                           {memorized.map(r => (
                              <tr key={r.id} className="border-b hover:bg-blue-50 cursor-pointer text-gray-800" onClick={() => onOpenReport('PROFIT_AND_LOSS', r.name)}>
                                 <td className="p-3 font-bold text-blue-900 border-r">{r.name}</td>
                                 <td className="p-3 text-gray-600 italic">{r.dateCreated}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
               {activeTab === 'BUDGET' && (
                  <div className="p-8 max-w-4xl mx-auto">
                     <h2 className="text-xl font-bold mb-4 text-gray-800 border-b-2 pb-2 uppercase tracking-tight">Budgets and Forecasting</h2>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="border rounded p-6 shadow-sm hover:border-blue-400 group">
                           <div className="font-bold text-blue-900 text-lg">Budget vs. Actual</div>
                           <p className="text-xs text-gray-500 mt-2">Compare your actual income and expenses to your budgeted amounts.</p>
                           <button onClick={() => onOpenReport('BUDGET_VS_ACTUAL', 'Budget vs. Actual')} className="mt-4 bg-blue-600 text-white px-6 py-2 text-xs font-bold rounded shadow-md group-hover:brightness-110">Run Report</button>
                        </div>
                        <div className="border rounded p-6 shadow-sm hover:border-blue-400 group">
                           <div className="font-bold text-blue-900 text-lg">Planning & Budgeting</div>
                           <p className="text-xs text-gray-500 mt-2">Create a new budget or edit an existing one for the fiscal year.</p>
                           <button onClick={() => onOpenReport('SET_UP_BUDGET' as any, 'Set Up Budgets')} className="mt-4 bg-[#003366] text-white px-6 py-2 text-xs font-bold rounded shadow-md group-hover:brightness-110">Set Up Budget</button>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

export default ReportsCenter;
