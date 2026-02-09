
import React, { useState } from 'react';
import { Transaction, Item } from '../types';

interface Props {
   transactions: Transaction[];
   items: Item[];
   onOpenPaySalesTax: () => void;
   onOpenLiabilityReport: () => void;
   onAdjustTax: (adj: { date: string; amount: number; account: string }) => void;
}

const SalesTaxCenter: React.FC<Props> = ({ transactions, items, onOpenPaySalesTax, onOpenLiabilityReport, onAdjustTax }) => {
   // Dynamic calculation of collected sales tax
   const totalTaxCollected = transactions
      .filter(t => t.type === 'INVOICE' || t.type === 'SALES_RECEIPT')
      .reduce((sum, t) => {
         const taxableAmount = t.items.filter(i => i.tax).reduce((s, i) => s + i.amount, 0);
         // Simplified: Use 8% if no specific tax item logic, but track taxable subtotal
         return sum + (taxableAmount * 0.08);
      }, 0);

   const adjustments = transactions
      .filter(t => t.type === 'TAX_ADJUSTMENT')
      .reduce((sum, t) => sum + t.total, 0);

   const totalPaid = transactions
      .filter(t => t.type === 'TAX_PAYMENT')
      .reduce((sum, t) => sum + t.total, 0);

   const netOwed = totalTaxCollected + adjustments - totalPaid;
   const [showAdjustment, setShowAdjustment] = useState(false);
   const [adjForm, setAdjForm] = useState({
      date: new Date().toLocaleDateString(),
      amount: 0,
      account: 'Miscellaneous Expense'
   });

   const handleAdjust = () => {
      onAdjustTax(adjForm);
      setShowAdjustment(false);
   };

   return (
      <div className="flex h-full bg-white overflow-hidden select-none">
         <div className="flex-1 flex flex-col min-w-0">
            <div className="p-6 bg-[#f8fbff] border-b border-gray-300 flex justify-between items-center shadow-sm">
               <div>
                  <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Sales Tax Center</h1>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 italic">Managing Sales Tax</p>
               </div>
               <div className="flex gap-4">
                  <button onClick={onOpenLiabilityReport} className="bg-white border border-gray-400 px-4 py-1 text-xs font-bold rounded shadow-sm hover:bg-gray-50">Sales Tax Liability Report</button>
               </div>
            </div>

            <div className="flex-1 p-8 overflow-auto">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left: Summary Card */}
                  <div className="bg-blue-900 text-white rounded-lg shadow-xl p-8 flex flex-col justify-between">
                     <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-70">Total Sales Tax Owed</h3>
                        <div className="text-5xl font-black mt-2 font-mono">${netOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                     </div>
                     <div className="mt-8 space-y-4">
                        <p className="text-xs opacity-80 italic">Last Payment: {totalPaid > 0 ? `Total Paid: $${totalPaid.toLocaleString()}` : 'None recorded this quarter.'}</p>
                        <button
                           onClick={onOpenPaySalesTax}
                           className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded font-black uppercase text-sm shadow-lg transform active:scale-95 transition-all"
                        >
                           Pay Sales Tax
                        </button>
                     </div>
                  </div>

                  {/* Right: Setup & Tasks */}
                  <div className="space-y-6">
                     <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 shadow-inner">
                        <h4 className="font-bold text-slate-700 uppercase text-[10px] mb-4 tracking-wider">Common Tasks</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <button
                              onClick={() => setShowAdjustment(true)}
                              className="bg-white border p-4 rounded shadow-sm flex flex-col items-center hover:bg-blue-50 transition-colors"
                           >
                              <span className="text-2xl mb-2">⚙️</span>
                              <span className="text-[10px] font-bold uppercase">Adjust Tax Due</span>
                           </button>
                           <button className="bg-white border p-4 rounded shadow-sm flex flex-col items-center hover:bg-blue-50 transition-colors">
                              <span className="text-2xl mb-2">🏢</span>
                              <span className="text-[10px] font-bold uppercase">Tax Agencies</span>
                           </button>
                        </div>
                     </div>


                  </div>
               </div>

               <div className="mt-12">
                  <h4 className="font-bold text-gray-500 uppercase text-[10px] mb-4 tracking-widest">Recent Sales Tax Payments</h4>
                  <div className="border rounded bg-white overflow-hidden">
                     <table className="w-full text-xs text-left">
                        <thead className="bg-gray-100 border-b font-bold">
                           <tr>
                              <th className="p-3 border-r">Date</th>
                              <th className="p-3 border-r">Type</th>
                              <th className="p-3 border-r">Vendor/Account</th>
                              <th className="p-3 text-right">Amount</th>
                           </tr>
                        </thead>
                        <tbody>
                           {transactions.filter(t => t.type === 'TAX_PAYMENT' || t.type === 'TAX_ADJUSTMENT').map(t => (
                              <tr key={t.id} className="border-b h-10">
                                 <td className="p-3 border-r">{t.date}</td>
                                 <td className="p-3 border-r italic text-gray-500">{t.type === 'TAX_ADJUSTMENT' ? 'Adjustment' : 'Payment'}</td>
                                 <td className="p-3 border-r font-bold">{t.type === 'TAX_ADJUSTMENT' ? t.bankAccountId : 'State Board of Equalization'}</td>
                                 <td className={`p-3 text-right font-black font-mono ${t.type === 'TAX_ADJUSTMENT' ? 'text-red-600' : 'text-blue-900'}`}>
                                    ${t.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                 </td>
                              </tr>
                           ))}
                           {transactions.filter(t => t.type === 'TAX_PAYMENT' || t.type === 'TAX_ADJUSTMENT').length === 0 && (
                              <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic">No sales tax activities recorded yet.</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

               {showAdjustment && (
                  <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                     <div className="bg-white w-[400px] border-4 border-slate-700 shadow-2xl animate-in zoom-in-95">
                        <div className="bg-slate-700 p-2 text-white font-bold text-xs uppercase tracking-widest flex justify-between">
                           <span>Adjust Sales Tax Due</span>
                           <button onClick={() => setShowAdjustment(false)}>✕</button>
                        </div>
                        <div className="p-8 space-y-4">
                           <p className="text-xs text-gray-600 italic">Enter an adjustment to your sales tax liability (Page 172).</p>
                           <div>
                              <label className="text-[10px] font-bold uppercase text-gray-400">Adjustment Date</label>
                              <input
                                 className="w-full border-b p-1 text-sm outline-none"
                                 value={adjForm.date}
                                 onChange={e => setAdjForm({ ...adjForm, date: e.target.value })}
                              />
                           </div>
                           <div>
                              <label className="text-[10px] font-bold uppercase text-gray-400">Amount (increase or decrease)</label>
                              <input
                                 type="number"
                                 className="w-full border-b p-1 text-sm outline-none font-bold"
                                 placeholder="0.00"
                                 value={adjForm.amount}
                                 onChange={e => setAdjForm({ ...adjForm, amount: parseFloat(e.target.value) || 0 })}
                              />
                           </div>
                           <div>
                              <label className="text-[10px] font-bold uppercase text-gray-400">Adjustment Account</label>
                              <select
                                 className="w-full border-b p-1 text-sm outline-none font-bold bg-white"
                                 value={adjForm.account}
                                 onChange={e => setAdjForm({ ...adjForm, account: e.target.value })}
                              >
                                 <option>Miscellaneous Expense</option>
                                 <option>Other Income</option>
                                 <option>Office Supplies</option>
                              </select>
                           </div>
                           <div className="flex justify-end gap-2 pt-4">
                              <button onClick={handleAdjust} className="bg-slate-700 text-white px-8 py-1.5 text-xs font-bold rounded uppercase">OK</button>
                              <button onClick={() => setShowAdjustment(false)} className="bg-white border px-8 py-1.5 text-xs font-bold rounded uppercase">Cancel</button>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

export default SalesTaxCenter;
