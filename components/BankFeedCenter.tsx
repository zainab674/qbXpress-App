
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { BankTransaction } from '../types';

interface Props {
   onOpenWindow: (type: any, title: string) => void;
   onClose: () => void;
}

const BankFeedCenter: React.FC<Props> = ({ onOpenWindow, onClose }) => {
   const { bankFeeds, handleSaveBankFeed, accounts, transactions, vendors, customers } = useData();
   const [isDownloading, setIsDownloading] = useState(false);
   const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

   const bankAccounts = accounts.filter(a => a.type === 'Bank');
   const activeAccount = selectedAccountId ? bankAccounts.find(a => a.id === selectedAccountId) : bankAccounts[0];

   const filteredFeeds = bankFeeds.filter(f => f.bankAccountId === activeAccount?.id);

   // Helper to find potential matches in real transactions
   const findPotentialMatch = (bankTx: BankTransaction) => {
      return transactions.find(t => {
         // Match by absolute amount
         const amountMatches = Math.abs(t.total) === Math.abs(bankTx.amount);
         // Match by bank account
         const accountId = t.bankAccountId || t.depositToId || t.transferFromId || t.transferToId;
         const accountMatches = accountId === bankTx.bankAccountId;
         return amountMatches && accountMatches && t.id !== bankTx.id;
      });
   };

   const handleDownload = async () => {
      if (!activeAccount) return;
      setIsDownloading(true);

      // Simulate real bank connection time
      await new Promise(resolve => setTimeout(resolve, 1500));

      const existingIds = new Set(bankFeeds.map(f => f.id));

      // Filter internal transactions that involve this account but aren't in bank feeds yet
      const newTransactions: BankTransaction[] = transactions
         .filter(t => {
            const usesAccount = t.bankAccountId === activeAccount.id || t.depositToId === activeAccount.id || t.transferFromId === activeAccount.id || t.transferToId === activeAccount.id;
            const notAlreadyInFeed = !existingIds.has(`sync-${t.id}`);
            return usesAccount && notAlreadyInFeed;
         })
         .map(t => {
            // Get entity name for description
            let description = 'INTERNAL TRANSACTION';
            if (t.entityId) {
               const vendor = vendors.find(v => v.id === t.entityId);
               const customer = customers.find(c => c.id === t.entityId);
               description = (vendor?.name || customer?.name || 'UNKNOWN').toUpperCase();
            }

            return {
               id: `sync-${t.id}`,
               date: t.date,
               description,
               amount: (t.type === 'DEPOSIT' || (t.type === 'TRANSFER' && t.transferToId === activeAccount.id)) ? t.total : -t.total,
               bankAccountId: activeAccount.id,
               status: 'UNMATCHED' as 'UNMATCHED',
               potentialMatchId: t.id
            };
         });

      for (const tx of newTransactions) {
         await handleSaveBankFeed(tx);
      }
      setIsDownloading(false);
   };

   const handleImportCSV = () => {
      if (!activeAccount) return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.onchange = (e: any) => {
         const file = e.target.files[0];
         if (!file) return;

         const reader = new FileReader();
         reader.onload = async (event: any) => {
            const text = event.target.result;
            const lines = text.split('\n').filter((l: string) => l.trim());
            const newTxs: BankTransaction[] = lines.slice(1).map((line: string) => {
               const [date, description, amount] = line.split(',');
               return {
                  id: `csv-${Date.now()}-${Math.random()}`,
                  date: date?.trim() || new Date().toLocaleDateString(),
                  description: description?.trim() || 'Imported Transaction',
                  amount: parseFloat(amount) || 0,
                  bankAccountId: activeAccount.id,
                  status: 'UNMATCHED'
               };
            });
            for (const tx of newTxs) {
               await handleSaveBankFeed(tx);
            }
         };
         reader.readAsText(file);
      };
      input.click();
   };

   const handleMatch = async (id: string) => {
      const tx = bankFeeds.find(t => t.id === id);
      if (tx) {
         await handleSaveBankFeed({ ...tx, status: 'MATCHED' });
      }
   };

   const handleAdd = async (id: string) => {
      const tx = bankFeeds.find(t => t.id === id);
      if (tx) {
         await handleSaveBankFeed({ ...tx, status: 'ADDED' });
      }
   };

   return (
      <div className="bg-[#e4e9f2] h-full flex flex-col font-sans select-none">
         {/* Top Banner */}
         <div className="bg-[#003366] text-white p-4 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3">
               <div className="bg-white/10 p-2 rounded-full text-2xl">🏦</div>
               <div>
                  <h1 className="text-xl font-bold italic tracking-tight">Bank Feeds Center</h1>
                  <p className="text-[10px] opacity-70 uppercase font-black tracking-widest">Online Banking Integration</p>
               </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded text-xs font-bold transition-colors">Close Center</button>
         </div>

         <div className="flex-1 p-6 flex gap-6 overflow-hidden">
            {/* Left Sidebar: Bank List */}
            <div className="w-80 flex flex-col gap-4">
               <div className="bg-white border-2 border-slate-300 rounded-lg shadow-xl overflow-hidden">
                  <div className="bg-slate-200 p-2 text-[10px] font-black text-slate-500 uppercase flex justify-between">
                     <span>Connected Accounts</span>
                     <span>Status</span>
                  </div>
                  <div className="divide-y border-t text-sm font-sans">
                     {bankAccounts.map(account => (
                        <div
                           key={account.id}
                           onClick={() => setSelectedAccountId(account.id)}
                           className={`p-4 cursor-pointer transition-all border-l-4 ${activeAccount?.id === account.id ? 'bg-blue-50 border-l-blue-600' : 'hover:bg-slate-50 border-l-transparent'} flex justify-between items-center`}
                        >
                           <div className="flex flex-col gap-1">
                              <div className={`font-bold leading-tight ${activeAccount?.id === account.id ? 'text-blue-900' : 'text-slate-600'}`}>{account.name}</div>
                              <div className="text-[10px] text-blue-500 font-medium">**** **** {account.number?.slice(-4) || '0000'}</div>
                           </div>
                           <div className={`px-2 py-1 rounded text-[10px] font-black tracking-widest ${activeAccount?.id === account.id ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                              {activeAccount?.id === account.id ? 'ACTIVE' : 'CONNECTED'}
                           </div>
                        </div>
                     ))}
                  </div>
                  <button
                     onClick={() => onOpenWindow('BANK_FEED_MATCHING', 'Match Bank Transactions')}
                     className="w-full py-4 text-xs font-bold text-blue-600 border-t hover:bg-slate-50 transition-all font-sans uppercase tracking-widest"
                  >
                     Match / Review Transactions
                  </button>
               </div>

               <div className="bg-blue-900 rounded-lg p-4 text-white shadow-2xl space-y-3">
                  <h4 className="text-[10px] font-black uppercase opacity-60">Synchronize</h4>
                  <button
                     onClick={handleDownload}
                     disabled={isDownloading}
                     className="w-full bg-blue-500 hover:bg-blue-400 py-3 rounded-lg font-bold text-sm shadow-inner transition-all flex items-center justify-center gap-2 disabled:bg-slate-600"
                  >
                     {isDownloading ? (
                        <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> Connecting...</span>
                     ) : (
                        <><span>⬇️</span> Download Transactions</>
                     )}
                  </button>

               </div>
            </div>

            {/* Right Panel: Review Area */}
            <div className="flex-1 bg-white border-2 border-slate-300 rounded-lg shadow-2xl flex flex-col overflow-hidden">
               <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
                  <div>
                     <h2 className="text-lg font-bold text-slate-700">Review Transactions</h2>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeAccount?.name || 'Loading Account...'} • Last Synced Today</p>
                  </div>

               </div>

               <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-xs text-left border-collapse">
                     <thead className="sticky top-0 bg-slate-50 border-b-2 border-slate-200 text-slate-500 font-black uppercase text-[10px] z-10">
                        <tr>
                           <th className="p-3 border-r">Date</th>
                           <th className="p-3 border-r w-1/3">Downloaded Description</th>
                           <th className="p-3 border-r text-right">Amount</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y relative">
                        {filteredFeeds.map(tx => {
                           const match = tx.status === 'UNMATCHED' ? findPotentialMatch(tx) : null;
                           return (
                              <tr key={tx.id} className={`group hover:bg-blue-50/30 transition-colors ${tx.status !== 'UNMATCHED' ? 'opacity-50 grayscale' : ''}`}>
                                 <td className="p-3 border-r text-slate-500 font-medium">{tx.date}</td>
                                 <td className="p-3 border-r">
                                    <div className="font-bold text-slate-900 italic tracking-tight">{tx.description}</div>
                                    {match && (
                                       <div className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-1">
                                          <span>🔍</span> Potential match: {match.type} #{match.refNo} - {match.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                       </div>
                                    )}
                                 </td>
                                 <td className={`p-3 border-r text-right font-black text-sm ${tx.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {tx.amount < 0 ? `- $${Math.abs(tx.amount).toFixed(2)}` : `+ $${tx.amount.toFixed(2)}`}
                                 </td>


                              </tr>
                           );
                        })}
                        {filteredFeeds.length === 0 && (
                           <tr>
                              <td colSpan={5} className="p-20 text-center text-slate-400 italic font-bold uppercase tracking-widest text-sm bg-slate-50/50">
                                 No transactions to review for this account.<br />
                                 <span className="text-[10px] font-normal opacity-50 lowercase tracking-normal mt-2 block">Click 'Download Transactions' to pull the latest data.</span>
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>

               <div className="p-3 bg-slate-50 border-t flex justify-end gap-3 items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">All Transactions Finalized?</span>
                  <button onClick={onClose} className="bg-blue-900 text-white px-6 py-1.5 text-xs font-bold rounded shadow-xl hover:bg-blue-800 transition-all uppercase tracking-widest">Finish Sync</button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default BankFeedCenter;
