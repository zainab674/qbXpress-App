
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { BankTransaction } from '../types';
import * as api from '../services/api';
import BankImportWizard from './BankImportWizard';

interface Props {
   onOpenWindow: (type: any, title: string) => void;
   onClose: () => void;
}

const BankFeedCenter: React.FC<Props> = ({ onOpenWindow, onClose }) => {
   const { bankFeeds, handleSaveBankFeed, accounts, transactions, vendors, customers, refreshData } = useData();
   const [isDownloading, setIsDownloading] = useState(false);
   const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
   const [showImportWizard, setShowImportWizard] = useState(false);
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

   // Row Editing State
   const [rowActions, setRowActions] = useState<Record<string, 'ADD' | 'TRANSFER' | 'MATCH'>>({});
   const [rowPayees, setRowPayees] = useState<Record<string, string>>({});
   const [rowAccounts, setRowAccounts] = useState<Record<string, string>>({});

   // Filter State
   const [searchTerm, setSearchTerm] = useState('');
   const [filterDate, setFilterDate] = useState('All');
   const [filterStatus, setFilterStatus] = useState('For Review');

   const bankAccounts = accounts.filter(a => a.type === 'Bank');
   const activeAccount = selectedAccountId ? bankAccounts.find(a => a.id === selectedAccountId) : bankAccounts[0];

   const filteredFeeds = bankFeeds
      .filter(f => f.bankAccountId === activeAccount?.id)
      .filter(f => {
         if (filterStatus === 'For Review') return f.status === 'FOR_REVIEW' || f.status === 'UNMATCHED';
         if (filterStatus === 'Categorized') return f.status === 'CATEGORIZED' || f.status === 'ADDED' || f.status === 'MATCHED';
         if (filterStatus === 'Excluded') return f.status === 'EXCLUDED';
         return true;
      })
      .filter(f => {
         if (!searchTerm) return true;
         const term = searchTerm.toLowerCase();
         return (
            f.description.toLowerCase().includes(term) ||
            f.amount.toString().includes(term) ||
            f.date.includes(term)
         );
      });

   const handleBulkExclude = async () => {
      if (selectedIds.size === 0) return;
      try {
         for (const id of Array.from(selectedIds) as string[]) {
            await api.categorizeBankTransaction({
               transactionId: id,
               action: 'EXCLUDE'
            });
         }
         setSelectedIds(new Set());
         await refreshData();
      } catch (err: any) {
         console.error('Bulk exclude error:', err);
         alert(`Failed to exclude some transactions: ${err.message || 'Unknown error'}`);
      }
   };

   const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.size} transactions?`)) return;

      try {
         await api.bulkDeleteBankFeeds(Array.from(selectedIds));
         setSelectedIds(new Set());
         await refreshData();
      } catch (err: any) {
         console.error('Bulk delete error:', err);
         alert(`Failed to delete transactions: ${err.message || 'Unknown error'}`);
      }
   };

   const handleDeleteAllExcluded = async () => {
      if (!window.confirm('Are you sure you want to permanently delete ALL excluded transactions? This cannot be undone.')) return;

      try {
         await api.deleteAllExcludedBankFeeds();
         await refreshData();
      } catch (err: any) {
         console.error('Delete all excluded error:', err);
         alert(`Failed to delete all excluded transactions: ${err.message || 'Unknown error'}`);
      }
   };

   const handleUndo = async (tx: BankTransaction) => {
      try {
         await api.saveBankFeed({ ...tx, status: 'FOR_REVIEW', category: undefined });
         await refreshData();
      } catch (err) {
         alert('Failed to undo categorization');
      }
   };

   const findPotentialMatch = (bankTx: BankTransaction) => {
      const bankDate = new Date(bankTx.date);
      return transactions.find(t => {
         const amountMatches = Math.abs(t.total) === Math.abs(bankTx.amount);
         const accountId = t.bankAccountId || t.depositToId || t.transferFromId || t.transferToId;
         const accountMatches = accountId === bankTx.bankAccountId;

         // Date proximity check (±10 days)
         const ledgerDate = new Date(t.date);
         const diffTime = Math.abs(bankDate.getTime() - ledgerDate.getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         const dateMatches = diffDays <= 10;

         return amountMatches && accountMatches && dateMatches && t.id !== bankTx.id;
      });
   };

   const handleDownload = async () => {
      if (!activeAccount) return;
      setIsDownloading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      await refreshData();
      setIsDownloading(false);
   };

   const handleCategorize = async (txId: string, actionOverride?: 'ADD' | 'EXCLUDE' | 'TRANSFER' | 'MATCH', matchId?: string) => {
      const action = actionOverride || rowActions[txId] || 'ADD';
      const categoryId = action === 'MATCH' ? matchId : rowAccounts[txId];
      const entityId = rowPayees[txId];
      const toAccountId = rowAccounts[txId];

      try {
         await api.categorizeBankTransaction({
            transactionId: txId,
            categoryId: categoryId || undefined,
            action: action as any,
            entityId: entityId || undefined,
            toAccountId: action === 'TRANSFER' ? toAccountId : undefined
         });
         await refreshData();
      } catch (err) {
         alert('Failed to categorize transaction');
      }
   };

   const payees = [
      ...customers.map(c => ({ id: c.id, name: c.name, type: 'Customer' })),
      ...vendors.map(v => ({ id: v.id, name: v.name, type: 'Vendor' }))
   ];

   const fileInputRef = React.useRef<HTMLInputElement>(null);
   const [uploadingForId, setUploadingForId] = React.useState<string | null>(null);
   const [viewingAttachmentsId, setViewingAttachmentsId] = React.useState<string | null>(null);

   const handleAttachmentClick = (id: string, hasAttachments: boolean) => {
      if (hasAttachments) {
         setViewingAttachmentsId(viewingAttachmentsId === id ? null : id);
      } else {
         setUploadingForId(id);
         fileInputRef.current?.click();
      }
   };

   const handleDeleteAttachment = async (id: string, fileName: string) => {
      if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;
      try {
         await api.deleteBankFeedAttachment(id, fileName);
         await refreshData();
      } catch (err) {
         alert('Failed to delete attachment');
      }
   };

   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !uploadingForId) return;

      try {
         await api.uploadBankFeedAttachment(uploadingForId, file);
         await refreshData();
      } catch (err) {
         alert('Failed to upload attachment');
      } finally {
         setUploadingForId(null);
         if (fileInputRef.current) fileInputRef.current.value = '';
      }
   };

   const handlePrint = () => {
      window.print();
   };

   const handleExportCSV = () => {
      const headers = ['Date', 'Description', 'Spent', 'Received', 'Status'];
      const rows = filteredFeeds.map(tx => [
         tx.date,
         `"${tx.description.replace(/"/g, '""')}"`, // Escape quotes for CSV
         tx.amount < 0 ? Math.abs(tx.amount).toFixed(2) : '',
         tx.amount > 0 ? tx.amount.toFixed(2) : '',
         tx.status
      ]);

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `bank_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   };

   return (
      <div className="bg-[#e4e9f2] h-full flex flex-col font-sans select-none overflow-hidden">
         {/* Top Banner */}
         <div className="bg-[#003366] text-white p-4 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3">
               <div className="bg-white/10 p-2 rounded-full text-2xl">🏦</div>
               <div>
                  <h1 className="text-xl font-bold italic tracking-tight">Bank Feed Center</h1>
                  <p className="text-[10px] opacity-70 uppercase font-black tracking-widest">Enterprise Financial Sync</p>
               </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded text-xs font-bold transition-colors">Close Center</button>
         </div>

         <div className="flex-1 p-6 flex gap-6 overflow-hidden">
            {/* Left Sidebar: Bank List */}
            <div className="w-80 flex flex-col gap-4">
               <div className="bg-white border-2 border-slate-300 rounded-lg shadow-xl overflow-hidden">
                  <div className="bg-slate-200 p-2 text-[10px] font-black text-slate-500 uppercase">Connected Accounts</div>
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
               </div>

               <div className="bg-blue-900 rounded-lg p-4 text-white shadow-2xl space-y-3">
                  <h4 className="text-[10px] font-black uppercase opacity-60">Synchronize</h4>

                  <button onClick={() => setShowImportWizard(true)} className="w-full bg-white/10 hover:bg-white/20 border border-white/30 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2">
                     Import from File
                  </button>
               </div>
            </div>

            {/* Right Panel: Review Area */}
            <div className="flex-1 bg-[#f4f7f9] border border-slate-300 rounded-xl shadow-2xl flex flex-col overflow-hidden">
               {/* Top Filter Bar */}
               <div className="p-4 bg-white border-b flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                        <div className="relative">
                           <input
                              type="text" placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-9 pr-4 py-1.5 border border-slate-300 rounded text-sm w-64 outline-none focus:border-green-600"
                           />
                           <span className="absolute left-3 top-2 text-slate-400">🔍</span>
                        </div>
                        <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded text-sm bg-white">
                           <option>All dates</option>
                           <option>Today</option>
                        </select>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded text-sm bg-white min-w-[160px]">
                           <option>All transactions ({filteredFeeds.length})</option>
                           <option>For Review</option>
                           <option>Categorized</option>
                           <option>Excluded</option>
                        </select>
                        {filterStatus === 'Excluded' && (
                           <button
                              onClick={handleDeleteAllExcluded}
                              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700 transition-colors"
                           >
                              Delete All Excluded
                           </button>
                        )}
                     </div>
                     <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">1-{filteredFeeds.length} of {filteredFeeds.length}</span>
                        <div className="flex items-center gap-3 border-l pl-4 border-slate-300">
                           <button onClick={handlePrint} className="text-xl opacity-60 hover:opacity-100 transition-opacity" title="Print table">🖨️</button>
                           <button onClick={handleExportCSV} className="text-xl opacity-60 hover:opacity-100 transition-opacity" title="Export to CSV">📤</button>
                           <button className="text-xl opacity-60">⚙️</button>
                        </div>
                     </div>
                  </div>

                  {selectedIds.size > 0 && (
                     <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-slate-700">{selectedIds.size} selected</span>
                        {filterStatus === 'Excluded' ? (
                           <button onClick={handleBulkDelete} className="px-4 py-1.5 border border-red-200 text-red-600 bg-red-50 rounded text-sm font-bold">Delete Selected</button>
                        ) : (
                           <button onClick={handleBulkExclude} className="px-4 py-1.5 border border-red-200 text-red-600 bg-red-50 rounded text-sm font-bold">Exclude</button>
                        )}
                     </div>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
               </div>

               {/* Transactions Table */}
               <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
                     <thead className="sticky top-0 bg-[#f4f7f9] border-b-2 border-slate-200 text-slate-500 font-black uppercase text-[9px] z-10">
                        <tr>
                           <th className="p-4 w-10 text-center border-r"><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredFeeds.map(f => f.id)) : new Set())} /></th>
                           <th className="p-4 border-r w-24">Date</th>
                           <th className="p-4 border-r">Bank Description</th>
                           <th className="p-4 border-r w-24 text-right">Spent</th>
                           <th className="p-4 border-r w-24 text-right">Received</th>
                           <th className="p-4 border-r w-8 opacity-100">Attachments</th>

                           <th className="p-4 border-r w-48">From/To</th>
                           <th className="p-4 border-r w-64">Match/Categorize</th>
                           <th className="p-4 text-center w-32">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {filteredFeeds.map(tx => {
                           const match = tx.status === 'FOR_REVIEW' || tx.status === 'UNMATCHED' ? findPotentialMatch(tx) : null;
                           const isProcessed = tx.status !== 'FOR_REVIEW' && tx.status !== 'UNMATCHED';
                           const currentAction = rowActions[tx.id] || 'ADD';

                           return (
                              <tr key={tx.id} className={`hover:bg-blue-50/20 group transition-colors ${isProcessed ? 'opacity-40 bg-slate-50' : ''}`}>
                                 <td className="p-4 text-center border-r"><input type="checkbox" checked={selectedIds.has(tx.id)} onChange={() => {
                                    const next = new Set(selectedIds);
                                    if (next.has(tx.id)) next.delete(tx.id); else next.add(tx.id);
                                    setSelectedIds(next);
                                 }} disabled={isProcessed} /></td>
                                 <td className="p-4 border-r text-slate-500">{tx.date}</td>
                                 <td className="p-4 border-r">
                                    <div className="font-bold text-slate-800">{tx.description}</div>
                                    {match && <div className="text-[10px] text-green-600 mt-1 font-bold">🔍 Potential match found</div>}
                                 </td>
                                 <td className="p-4 border-r text-right font-medium text-slate-600">{tx.amount < 0 ? `$${Math.abs(tx.amount).toFixed(2)}` : ''}</td>
                                 <td className="p-4 border-r text-center font-medium text-slate-600">{tx.amount > 0 ? `$${tx.amount.toFixed(2)}` : ''}</td>
                                 <td className="p-4 border-r text-center relative">
                                    <button
                                       onClick={() => !isProcessed && handleAttachmentClick(tx.id, !!tx.attachments?.length)}
                                       className={`text-base transition-all ${tx.attachments?.length ? 'grayscale-0 opacity-100' : 'grayscale opacity-30 hover:grayscale-0 hover:opacity-100'} ${isProcessed ? 'cursor-default' : 'cursor-pointer'}`}
                                       title={tx.attachments?.length ? `${tx.attachments.length} attachment(s)` : 'Add attachment'}
                                    >
                                       📎
                                    </button>
                                    {tx.attachments?.length > 0 && (
                                       <div className="text-[9px] text-blue-500 font-bold mt-0.5">{tx.attachments.length}</div>
                                    )}

                                    {viewingAttachmentsId === tx.id && (
                                       <div className="absolute top-full left-1/2 -translate-x-1/2 z-[200] mt-3 w-96 bg-white border border-slate-200 rounded-xl shadow-2xl p-5 text-left animate-in fade-in zoom-in duration-200">
                                          <div className="flex justify-between items-center mb-4 border-b pb-3">
                                             <span className="text-lg font-black text-slate-800 tracking-tight">Attachments</span>
                                             <button onClick={() => setViewingAttachmentsId(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                                          </div>
                                          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                             {tx.attachments.map((att: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg group transition-all">
                                                   <a
                                                      href={`${api.API_BASE_URL.replace('/api', '')}${att.url}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="flex-1 text-sm text-blue-600 hover:text-blue-700 hover:underline truncate font-bold"
                                                      title={att.name}
                                                   >
                                                      {att.name}
                                                   </a>
                                                   <button
                                                      onClick={() => handleDeleteAttachment(tx.id, att.url.split('/').pop())}
                                                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                      title="Delete"
                                                   >
                                                      🗑️
                                                   </button>
                                                </div>
                                             ))}
                                          </div>
                                          <button
                                             onClick={() => { setViewingAttachmentsId(null); setUploadingForId(tx.id); fileInputRef.current?.click(); }}
                                             className="w-full mt-5 p-4 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                                          >
                                             <span className="text-lg">+</span> Add Another
                                          </button>
                                       </div>
                                    )}
                                 </td>
                                 <td className="p-4 border-r">
                                    {!isProcessed && !match && (
                                       <select
                                          value={rowPayees[tx.id] || ''} onChange={(e) => setRowPayees(p => ({ ...p, [tx.id]: e.target.value }))}
                                          className="w-full p-1.5 border border-slate-200 rounded text-[11px] bg-white outline-none focus:border-blue-400"
                                       >
                                          <option value="">{tx.amount < 0 ? 'Select supplier' : 'Select customer'}</option>
                                          {payees.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                       </select>
                                    )}
                                    {!isProcessed && match && (
                                       <div className="text-[11px] font-bold text-green-700 bg-green-50 p-1 px-2 rounded border border-green-200">
                                          {payees.find(p => p.id === match.entityId)?.name || 'Matching record'}
                                       </div>
                                    )}
                                 </td>
                                 <td className="p-4 border-r">
                                    {!isProcessed && !match && (
                                       <select
                                          value={rowAccounts[tx.id] || ''} onChange={(e) => setRowAccounts(p => ({ ...p, [tx.id]: e.target.value }))}
                                          className="w-full p-1.5 border border-slate-200 rounded text-[11px] bg-white outline-none focus:border-blue-400"
                                       >
                                          <option value="">Select category</option>
                                          {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                       </select>
                                    )}
                                    {!isProcessed && match && (
                                       <div className="text-[11px] font-bold text-green-700 bg-green-50 p-1 px-2 rounded border border-green-200">
                                          {accounts.find(acc => acc.id === (match.bankAccountId || match.depositToId || match.transferFromId || match.transferToId))?.name || 'Matched'}
                                       </div>
                                    )}
                                    {isProcessed && <div className="text-[11px] italic text-slate-400">{tx.category ? accounts.find(a => a.id === tx.category)?.name : tx.status}</div>}
                                 </td>
                                 <td className="p-4">
                                    {!isProcessed ? (
                                       <div className="flex gap-1 justify-center items-center">
                                          <div className="flex border border-slate-300 rounded overflow-hidden">
                                             <button
                                                onClick={() => handleCategorize(tx.id, match ? 'MATCH' : 'ADD', match?.id)}
                                                className={`px-3 py-1.5 text-[10px] font-bold hover:bg-slate-50 border-r border-slate-300 ${match ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-white'}`}
                                             >
                                                {match ? 'Match' : 'Categorize'}
                                             </button>
                                             <select
                                                className="bg-white px-1 py-1.5 text-[10px] outline-none cursor-pointer hover:bg-slate-50"
                                                onChange={(e) => {
                                                   if (e.target.value === 'exclude') handleCategorize(tx.id, 'EXCLUDE');
                                                   if (e.target.value === 'transfer') setRowActions(prev => ({ ...prev, [tx.id]: 'TRANSFER' }));
                                                }}
                                             >
                                                <option value="">Post</option>
                                                <option value="transfer">Transfer</option>
                                                <option value="exclude">Exclude</option>
                                             </select>
                                          </div>
                                       </div>
                                    ) : (
                                       <button onClick={() => handleUndo(tx)} className="text-[10px] text-blue-600 font-bold hover:underline mx-auto block">Undo</button>
                                    )}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         {showImportWizard && (
            <BankImportWizard
               onClose={() => setShowImportWizard(false)}
               onComplete={async () => {
                  setShowImportWizard(false);
                  await refreshData();
               }}
            />
         )}
      </div>
   );
};

export default BankFeedCenter;
