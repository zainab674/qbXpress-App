
import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';

interface Props {
   transactions: Transaction[];
   onOpenReport: (type: string, title: string) => void;
   onOpenTransaction?: (id: string, type: string) => void;
}

const PayrollCenter: React.FC<Props> = ({ transactions, onOpenReport, onOpenTransaction }) => {
   const [activeTab, setActiveTab] = useState<'CONNECTED_PROVIDER' | 'PAYROLL_HISTORY'>('CONNECTED_PROVIDER');

   const payrollTransactions = useMemo(() => {
      return transactions.filter(t =>
         t.type === 'JOURNAL_ENTRY' &&
         t.refNo?.startsWith('PAY-')
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
   }, [transactions]);

   const lastSync = useMemo(() => {
      if (payrollTransactions.length === 0) return null;
      return payrollTransactions[0].date;
   }, [payrollTransactions]);

   return (
      <div className="flex h-full bg-white overflow-hidden select-none">
         <div className="flex-1 flex flex-col min-w-0">
            <div className="p-6 bg-[#f0f4f8] border-b border-gray-300 flex justify-between items-center shadow-sm">
               <div>
                  <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Payroll Center</h1>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 italic">3rd Party Payroll Integration</p>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => onOpenReport('PAYROLL_SUMMARY', 'Payroll Summary')} className="bg-blue-900 text-white border border-blue-950 px-4 py-1 text-xs font-bold rounded shadow-lg hover:brightness-110 uppercase tracking-tighter">Payroll Summary</button>
               </div>
            </div>

            <div className="flex-1 flex flex-col">
               <div className="flex px-6 bg-gray-100 border-b border-gray-300">
                  {[
                     { id: 'CONNECTED_PROVIDER', label: 'Connected Provider' },
                     { id: 'PAYROLL_HISTORY', label: 'Payroll History' }
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
                  {activeTab === 'CONNECTED_PROVIDER' && (
                     <div className="space-y-6 max-w-2xl">
                        {/* Connection Status Banner */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded p-5 flex items-start gap-4">
                           <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold shrink-0">P</div>
                           <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                 <span className="text-sm font-bold text-emerald-800">PayrollOS Connected</span>
                                 <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wider">Active</span>
                              </div>
                              <p className="text-xs text-gray-500">Payroll is processed externally by your connected provider. Journal entries sync automatically into qbXpress.</p>
                              {lastSync && (
                                 <p className="text-[10px] text-gray-400 mt-2">Last sync: <span className="font-mono font-bold text-gray-600">{lastSync}</span></p>
                              )}
                           </div>
                        </div>

                        {/* How it Works */}
                        <div className="border border-gray-200 rounded">
                           <div className="bg-gray-50 p-3 text-[10px] font-bold uppercase text-gray-500 border-b tracking-widest">How Payroll Sync Works</div>
                           <div className="p-5 space-y-4">
                              <div className="flex items-start gap-3">
                                 <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                                 <div>
                                    <div className="text-xs font-bold text-slate-700">Run payroll in your provider</div>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Process payroll, tax calculations, and direct deposits in PayrollOS or your connected provider.</p>
                                 </div>
                              </div>
                              <div className="flex items-start gap-3">
                                 <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                                 <div>
                                    <div className="text-xs font-bold text-slate-700">Sync to qbXpress</div>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Your provider pushes payroll journal entries to qbXpress automatically. Each run creates a journal entry with a <span className="font-mono bg-gray-100 px-1 rounded">PAY-</span> reference.</p>
                                 </div>
                              </div>
                              <div className="flex items-start gap-3">
                                 <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                                 <div>
                                    <div className="text-xs font-bold text-slate-700">View payroll reports</div>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Synced payroll data flows into your Payroll Summary, P&L, and other financial reports automatically.</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Sync Stats */}
                        <div className="grid grid-cols-3 gap-4">
                           <div className="bg-slate-50 border border-slate-200 rounded p-4">
                              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total Synced Runs</div>
                              <div className="text-2xl font-black text-slate-800">{payrollTransactions.length}</div>
                           </div>
                           <div className="bg-slate-50 border border-slate-200 rounded p-4">
                              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total Gross</div>
                              <div className="text-2xl font-black text-slate-800">
                                 ${payrollTransactions.reduce((sum, t) => sum + (t.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                           </div>
                           <div className="bg-slate-50 border border-slate-200 rounded p-4">
                              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Provider</div>
                              <div className="text-lg font-black text-emerald-700">PayrollOS</div>
                           </div>
                        </div>

                        <p className="text-[10px] text-gray-400 italic">
                           To manage connection settings, authorize a new provider, or disconnect, contact your administrator.
                        </p>
                     </div>
                  )}

                  {activeTab === 'PAYROLL_HISTORY' && (
                     <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 p-4 border border-gray-200 rounded">
                           <div>
                              <h3 className="text-lg font-bold text-slate-700">Payroll Records</h3>
                              <p className="text-xs text-gray-500">History of payroll runs synchronized from your connected provider.</p>
                           </div>
                           <div className="text-right">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Total Transactions</span>
                              <div className="text-2xl font-black text-blue-900">{payrollTransactions.length}</div>
                           </div>
                        </div>

                        <div className="border border-gray-200 rounded overflow-hidden">
                           <table className="w-full text-xs text-left">
                              <thead className="bg-[#f8fafc] border-b border-gray-200 uppercase text-[10px] font-bold text-gray-500">
                                 <tr>
                                    <th className="p-3 border-r w-32">Date</th>
                                    <th className="p-3 border-r w-48">Reference No</th>
                                    <th className="p-3 border-r w-32">Type</th>
                                    <th className="p-3 border-r">Memo</th>
                                    <th className="p-3 text-right w-40">Amount</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {payrollTransactions.length === 0 ? (
                                    <tr>
                                       <td colSpan={5} className="p-20 text-center text-gray-400 italic">
                                          No payroll sync records found. Connect a payroll provider to get started.
                                       </td>
                                    </tr>
                                 ) : (
                                    payrollTransactions.map(t => (
                                       <tr
                                          key={t.id}
                                          className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                                          onClick={() => onOpenTransaction?.(t.id, t.type)}
                                       >
                                          <td className="p-3 border-r font-mono">{t.date}</td>
                                          <td className="p-3 border-r">
                                             <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${t.refNo?.startsWith('PAY-') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {t.refNo}
                                             </span>
                                          </td>
                                          <td className="p-3 border-r uppercase text-[9px] font-bold text-gray-400">{t.type.replace('_', ' ')}</td>
                                          <td className="p-3 border-r italic text-gray-600">{t.memo || 'No memo available'}</td>
                                          <td className="p-3 text-right font-bold text-slate-800">
                                             ${t.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </td>
                                       </tr>
                                    ))
                                 )}
                              </tbody>
                           </table>
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
