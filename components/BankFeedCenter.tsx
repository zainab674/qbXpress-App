
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
   const [showConfig, setShowConfig] = React.useState(false);
   const [configMatchDays, setConfigMatchDays] = React.useState(10);
   const [configAutoMatch, setConfigAutoMatch] = React.useState(true);
   const [configRules, setConfigRules] = React.useState<{ keyword: string; category: string }[]>([]);
   const [newRuleKeyword, setNewRuleKeyword] = React.useState('');
   const [newRuleCategory, setNewRuleCategory] = React.useState('');

   const [uploadingForId, setUploadingForId] = React.useState<string | null>(null);
   const [viewingAttachmentsId, setViewingAttachmentsId] = React.useState<string | null>(null);

   // Recent Transactions Tab State
   const [activeTab, setActiveTab] = React.useState<'feed' | 'transactions' | 'accounts'>('feed');
   const [txFilterAccount, setTxFilterAccount] = React.useState<string>('ALL');
   const [txSearch, setTxSearch] = React.useState('');
   const [txDateFrom, setTxDateFrom] = React.useState('');
   const [txDateTo, setTxDateTo] = React.useState('');
   const [txAttachUploading, setTxAttachUploading] = React.useState<string | null>(null);
   const txFileInputRef = React.useRef<HTMLInputElement>(null);
   const [txAttachTargetId, setTxAttachTargetId] = React.useState<string | null>(null);

   const handleTxAttachClick = (txId: string) => {
      setTxAttachTargetId(txId);
      txFileInputRef.current?.click();
   };

   const handleTxFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length || !txAttachTargetId) return;
      setTxAttachUploading(txAttachTargetId);
      try {
         for (const file of files) {
            await api.uploadTransactionAttachment(txAttachTargetId, file);
         }
         await refreshData();
      } catch (err) {
         console.error('Attachment upload failed:', err);
         alert('Failed to upload attachment.');
      } finally {
         setTxAttachUploading(null);
         setTxAttachTargetId(null);
         e.target.value = '';
      }
   };

   const handleTxDeleteAttachment = async (txId: string, fileName: string) => {
      if (!window.confirm(`Delete attachment "${fileName}"?`)) return;
      try {
         await api.deleteTransactionAttachment(txId, fileName);
         await refreshData();
      } catch (err) {
         console.error('Delete failed:', err);
         alert('Failed to delete attachment.');
      }
   };

   // Chart of Accounts Tab State
   const ACCOUNT_TYPES = ['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset', 'Other Asset',
      'Accounts Payable', 'Credit Card', 'Other Current Liability', 'Long Term Liability', 'Equity',
      'Income', 'Cost of Goods Sold', 'Expense', 'Other Income', 'Other Expense'];
   const [acctSearch, setAcctSearch] = React.useState('');
   const [acctTypeFilter, setAcctTypeFilter] = React.useState('All');
   const [showAcctForm, setShowAcctForm] = React.useState(false);
   const [editingAcct, setEditingAcct] = React.useState<any>(null);
   const [acctForm, setAcctForm] = React.useState({
      name: '', number: '', type: 'Expense', description: '',
      openingBalance: '', openingBalanceDate: '', isActive: true
   });
   const [acctSaving, setAcctSaving] = React.useState(false);

   const filteredAccounts = React.useMemo(() => {
      return accounts
         .filter(a => acctTypeFilter === 'All' || a.type === acctTypeFilter)
         .filter(a => {
            if (!acctSearch) return true;
            const t = acctSearch.toLowerCase();
            return a.name.toLowerCase().includes(t) || a.number?.toLowerCase().includes(t) || a.description?.toLowerCase().includes(t);
         })
         .sort((a, b) => {
            const typeOrder = ACCOUNT_TYPES.indexOf(a.type) - ACCOUNT_TYPES.indexOf(b.type);
            if (typeOrder !== 0) return typeOrder;
            return a.name.localeCompare(b.name);
         });
   }, [accounts, acctSearch, acctTypeFilter]);

   const openNewAcctForm = () => {
      setEditingAcct(null);
      setAcctForm({ name: '', number: '', type: 'Expense', description: '', openingBalance: '', openingBalanceDate: '', isActive: true });
      setShowAcctForm(true);
   };

   const openEditAcctForm = (acct: any) => {
      setEditingAcct(acct);
      setAcctForm({
         name: acct.name || '',
         number: acct.number || '',
         type: acct.type || 'Expense',
         description: acct.description || '',
         openingBalance: acct.openingBalance != null ? String(acct.openingBalance) : '',
         openingBalanceDate: acct.openingBalanceDate || '',
         isActive: acct.isActive !== false
      });
      setShowAcctForm(true);
   };

   const handleSaveAcct = async () => {
      if (!acctForm.name.trim()) { alert('Account name is required.'); return; }
      setAcctSaving(true);
      try {
         await api.saveAccount({
            ...(editingAcct ? { id: editingAcct.id } : {}),
            name: acctForm.name.trim(),
            number: acctForm.number.trim(),
            type: acctForm.type,
            description: acctForm.description.trim(),
            openingBalance: acctForm.openingBalance !== '' ? parseFloat(acctForm.openingBalance) : undefined,
            openingBalanceDate: acctForm.openingBalanceDate || undefined,
            isActive: acctForm.isActive,
            balance: editingAcct ? editingAcct.balance : 0,
         });
         await refreshData();
         setShowAcctForm(false);
      } catch (err: any) {
         alert(`Failed to save account: ${err.message}`);
      } finally {
         setAcctSaving(false);
      }
   };

   const handleDeleteAcct = async (acct: any) => {
      if (!window.confirm(`Delete account "${acct.name}"? This cannot be undone.`)) return;
      try {
         await api.deleteAccount(acct.id);
         await refreshData();
      } catch (err: any) {
         alert(`Failed to delete account: ${err.message}`);
      }
   };

   // Compute filtered ledger transactions for the Account Transactions tab
   const filteredLedgerTx = React.useMemo(() => {
      return transactions
         .filter(tx => {
            if (txFilterAccount === 'ALL') return true;
            return (
               tx.bankAccountId === txFilterAccount ||
               tx.depositToId === txFilterAccount ||
               tx.transferFromId === txFilterAccount ||
               tx.transferToId === txFilterAccount ||
               tx.items?.some((item: any) => item.accountId === txFilterAccount)
            );
         })
         .filter(tx => {
            if (!txSearch) return true;
            const term = txSearch.toLowerCase();
            const entity = [...customers, ...vendors].find(e => e.id === tx.entityId);
            return (
               tx.refNo?.toLowerCase().includes(term) ||
               tx.type?.toLowerCase().includes(term) ||
               tx.memo?.toLowerCase().includes(term) ||
               entity?.name?.toLowerCase().includes(term)
            );
         })
         .filter(tx => {
            if (txDateFrom && tx.date < txDateFrom) return false;
            if (txDateTo && tx.date > txDateTo) return false;
            return true;
         })
         .sort((a, b) => b.date.localeCompare(a.date));
   }, [transactions, txFilterAccount, txSearch, txDateFrom, txDateTo, customers, vendors]);

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
               {/* Tabs */}
               <div className="bg-white border-b flex">
                  <button
                     onClick={() => setActiveTab('feed')}
                     className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'feed' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                     Bank Feed
                  </button>
                  <button
                     onClick={() => setActiveTab('transactions')}
                     className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'transactions' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                     Recent Transactions
                  </button>
                  <button
                     onClick={() => setActiveTab('accounts')}
                     className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'accounts' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                     Chart of Accounts
                  </button>
               </div>

               {activeTab === 'accounts' ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                     {/* Accounts Toolbar */}
                     <div className="p-4 bg-white border-b flex flex-wrap gap-3 items-center">
                        <button
                           onClick={openNewAcctForm}
                           className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                           + New Account
                        </button>
                        <select
                           value={acctTypeFilter}
                           onChange={e => setAcctTypeFilter(e.target.value)}
                           className="px-3 py-1.5 border border-slate-300 rounded text-xs bg-white outline-none focus:border-blue-400"
                        >
                           <option value="All">All Types</option>
                           {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="relative">
                           <input
                              type="text" placeholder="Search accounts…" value={acctSearch}
                              onChange={e => setAcctSearch(e.target.value)}
                              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs w-56 outline-none focus:border-blue-400"
                           />
                           <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
                        </div>
                        <span className="ml-auto text-xs text-slate-400 font-medium">{filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}</span>
                     </div>

                     {/* Accounts Table */}
                     <div className="flex-1 overflow-auto bg-white">
                        <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                           <thead className="sticky top-0 bg-[#f4f7f9] border-b-2 border-slate-200 text-slate-500 font-black uppercase text-[9px] z-10">
                              <tr>
                                 <th className="p-3 border-r w-20">Number</th>
                                 <th className="p-3 border-r">Name</th>
                                 <th className="p-3 border-r w-44">Type</th>
                                 <th className="p-3 border-r">Description</th>
                                 <th className="p-3 border-r w-32 text-right">Balance</th>
                                 <th className="p-3 border-r w-16 text-center">Active</th>
                                 <th className="p-3 w-24 text-center">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {filteredAccounts.length === 0 ? (
                                 <tr>
                                    <td colSpan={7} className="p-10 text-center text-slate-400 italic text-sm">
                                       No accounts found.
                                    </td>
                                 </tr>
                              ) : filteredAccounts.map((acct, i) => (
                                 <tr key={acct.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} hover:bg-blue-50/30 transition-colors group`}>
                                    <td className="p-3 border-r font-mono text-slate-500">{acct.number || '—'}</td>
                                    <td className="p-3 border-r font-bold text-slate-800">{acct.name}</td>
                                    <td className="p-3 border-r">
                                       <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">{acct.type}</span>
                                    </td>
                                    <td className="p-3 border-r text-slate-500 italic truncate max-w-[200px]" title={acct.description}>{acct.description || ''}</td>
                                    <td className="p-3 border-r text-right font-medium text-slate-700">
                                       {acct.balance != null ? `$${Number(acct.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                    </td>
                                    <td className="p-3 border-r text-center">
                                       <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${acct.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                          {acct.isActive !== false ? 'YES' : 'NO'}
                                       </span>
                                    </td>
                                    <td className="p-3 text-center">
                                       <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                             onClick={() => openEditAcctForm(acct)}
                                             className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[10px] font-bold hover:bg-blue-100 transition-colors"
                                          >
                                             Edit
                                          </button>
                                          <button
                                             onClick={() => handleDeleteAcct(acct)}
                                             className="px-2 py-1 bg-red-50 border border-red-200 text-red-600 rounded text-[10px] font-bold hover:bg-red-100 transition-colors"
                                          >
                                             Del
                                          </button>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>

                     {/* Account Form Modal */}
                     {showAcctForm && (
                        <div className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center">
                           <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
                              <div className="bg-[#003366] text-white px-6 py-4 flex justify-between items-center">
                                 <h2 className="font-bold text-sm">{editingAcct ? 'Edit Account' : 'New Account'}</h2>
                                 <button onClick={() => setShowAcctForm(false)} className="text-white/70 hover:text-white text-lg leading-none">&times;</button>
                              </div>
                              <div className="p-6 flex flex-col gap-4">
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                       <label className="text-[9px] font-black text-slate-500 uppercase">Account Name *</label>
                                       <input
                                          type="text" value={acctForm.name} onChange={e => setAcctForm(f => ({ ...f, name: e.target.value }))}
                                          className="px-3 py-2 border border-slate-300 rounded text-xs outline-none focus:border-blue-400"
                                          placeholder="e.g. Office Supplies"
                                       />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                       <label className="text-[9px] font-black text-slate-500 uppercase">Account Number</label>
                                       <input
                                          type="text" value={acctForm.number} onChange={e => setAcctForm(f => ({ ...f, number: e.target.value }))}
                                          className="px-3 py-2 border border-slate-300 rounded text-xs outline-none focus:border-blue-400"
                                          placeholder="e.g. 6100"
                                       />
                                    </div>
                                 </div>
                                 <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase">Account Type *</label>
                                    <select
                                       value={acctForm.type} onChange={e => setAcctForm(f => ({ ...f, type: e.target.value }))}
                                       className="px-3 py-2 border border-slate-300 rounded text-xs bg-white outline-none focus:border-blue-400"
                                    >
                                       {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                 </div>
                                 <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase">Description</label>
                                    <input
                                       type="text" value={acctForm.description} onChange={e => setAcctForm(f => ({ ...f, description: e.target.value }))}
                                       className="px-3 py-2 border border-slate-300 rounded text-xs outline-none focus:border-blue-400"
                                       placeholder="Optional description"
                                    />
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                       <label className="text-[9px] font-black text-slate-500 uppercase">Opening Balance</label>
                                       <input
                                          type="number" step="0.01" value={acctForm.openingBalance}
                                          onChange={e => setAcctForm(f => ({ ...f, openingBalance: e.target.value }))}
                                          className="px-3 py-2 border border-slate-300 rounded text-xs outline-none focus:border-blue-400"
                                          placeholder="0.00"
                                       />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                       <label className="text-[9px] font-black text-slate-500 uppercase">As of Date</label>
                                       <input
                                          type="date" value={acctForm.openingBalanceDate}
                                          onChange={e => setAcctForm(f => ({ ...f, openingBalanceDate: e.target.value }))}
                                          className="px-3 py-2 border border-slate-300 rounded text-xs outline-none focus:border-blue-400"
                                       />
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <input
                                       type="checkbox" id="acctActive" checked={acctForm.isActive}
                                       onChange={e => setAcctForm(f => ({ ...f, isActive: e.target.checked }))}
                                       className="w-4 h-4"
                                    />
                                    <label htmlFor="acctActive" className="text-xs text-slate-700 font-medium">Account is Active</label>
                                 </div>
                              </div>
                              <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
                                 <button onClick={() => setShowAcctForm(false)} className="px-4 py-2 text-xs border border-slate-300 rounded hover:bg-slate-100 transition-colors">Cancel</button>
                                 <button
                                    onClick={handleSaveAcct} disabled={acctSaving}
                                    className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                 >
                                    {acctSaving ? 'Saving…' : (editingAcct ? 'Save Changes' : 'Create Account')}
                                 </button>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               ) : activeTab === 'transactions' ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                     {/* Transactions Filter Bar */}
                     <div className="p-4 bg-white border-b flex flex-wrap gap-3 items-end">
                        <div className="flex flex-col gap-1">
                           <label className="text-[9px] font-black text-slate-400 uppercase">Account</label>
                           <select
                              value={txFilterAccount}
                              onChange={e => setTxFilterAccount(e.target.value)}
                              className="px-3 py-1.5 border border-slate-300 rounded text-xs bg-white outline-none focus:border-blue-400 min-w-[200px]"
                           >
                              <option value="ALL">All Accounts ({transactions.length})</option>
                              {accounts.map(acc => (
                                 <option key={acc.id} value={acc.id}>{acc.name}</option>
                              ))}
                           </select>
                        </div>
                        <div className="flex flex-col gap-1">
                           <label className="text-[9px] font-black text-slate-400 uppercase">From</label>
                           <input type="date" value={txDateFrom} onChange={e => setTxDateFrom(e.target.value)}
                              className="px-3 py-1.5 border border-slate-300 rounded text-xs bg-white outline-none focus:border-blue-400" />
                        </div>
                        <div className="flex flex-col gap-1">
                           <label className="text-[9px] font-black text-slate-400 uppercase">To</label>
                           <input type="date" value={txDateTo} onChange={e => setTxDateTo(e.target.value)}
                              className="px-3 py-1.5 border border-slate-300 rounded text-xs bg-white outline-none focus:border-blue-400" />
                        </div>
                        <div className="relative">
                           <input type="text" placeholder="Search payee, ref, memo…" value={txSearch} onChange={e => setTxSearch(e.target.value)}
                              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs w-56 outline-none focus:border-blue-400" />
                           <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
                        </div>
                        {(txFilterAccount !== 'ALL' || txSearch || txDateFrom || txDateTo) && (
                           <button onClick={() => { setTxFilterAccount('ALL'); setTxSearch(''); setTxDateFrom(''); setTxDateTo(''); }}
                              className="px-3 py-1.5 text-xs text-slate-500 border border-slate-300 rounded hover:bg-slate-50">
                              Clear
                           </button>
                        )}
                        <span className="ml-auto text-xs text-slate-400 font-medium self-end">{filteredLedgerTx.length} transaction{filteredLedgerTx.length !== 1 ? 's' : ''}</span>
                     </div>

                     {/* Hidden file input for row-level attachment upload */}
                     <input ref={txFileInputRef} type="file" multiple className="hidden" onChange={handleTxFileChange} />

                     {/* Transactions Table */}
                     <div className="flex-1 overflow-auto bg-white">
                        <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
                           <thead className="sticky top-0 bg-[#f4f7f9] border-b-2 border-slate-200 text-slate-500 font-black uppercase text-[9px] z-10">
                              <tr>
                                 <th className="p-3 border-r w-24">Date</th>
                                 <th className="p-3 border-r w-28">Type</th>
                                 <th className="p-3 border-r w-24">Ref #</th>
                                 <th className="p-3 border-r">Payee / Entity</th>
                                 <th className="p-3 border-r">Account</th>
                                 <th className="p-3 border-r w-28 text-right">Debit</th>
                                 <th className="p-3 border-r w-28 text-right">Credit</th>
                                 <th className="p-3 border-r w-40">Memo</th>
                                 <th className="p-3 w-36">Attachments</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {filteredLedgerTx.length === 0 ? (
                                 <tr>
                                    <td colSpan={9} className="p-10 text-center text-slate-400 italic text-sm">
                                       No transactions found for the selected filters.
                                    </td>
                                 </tr>
                              ) : filteredLedgerTx.map((tx, i) => {
                                 const entity = [...customers, ...vendors].find(e => e.id === tx.entityId);
                                 const topLevelAccountId = tx.bankAccountId || tx.depositToId || tx.transferFromId || tx.transferToId;
                                 const lineItemAccountId = !topLevelAccountId && tx.items?.length > 0
                                    ? tx.items.find((item: any) => item.accountId)?.accountId
                                    : undefined;
                                 const acct = accounts.find(a =>
                                    a.id === topLevelAccountId ||
                                    a.id === lineItemAccountId
                                 );
                                 const isDebit = ['CHECK', 'BILL_PAYMENT', 'CC_CHARGE', 'PAYCHECK', 'TAX_PAYMENT'].includes(tx.type);
                                 const debitAmt = isDebit ? tx.total : 0;
                                 const creditAmt = !isDebit ? tx.total : 0;
                                 const txAttachments: any[] = (tx as any).attachments || [];
                                 const isUploading = txAttachUploading === tx.id;
                                 return (
                                    <tr key={tx.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} hover:bg-blue-50/30 transition-colors`}>
                                       <td className="p-3 border-r text-slate-500 whitespace-nowrap">{tx.date}</td>
                                       <td className="p-3 border-r">
                                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">{tx.type.replace('_', ' ')}</span>
                                       </td>
                                       <td className="p-3 border-r font-mono text-slate-600">{tx.refNo || '—'}</td>
                                       <td className="p-3 border-r font-bold text-slate-800">{entity?.name || <span className="italic text-slate-400">—</span>}</td>
                                       <td className="p-3 border-r text-slate-600">
                                          {acct ? acct.name : <span className="italic text-slate-400">—</span>}
                                       </td>
                                       <td className="p-3 border-r text-right text-red-600 font-medium">{debitAmt > 0 ? `$${debitAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}</td>
                                       <td className="p-3 border-r text-right text-green-700 font-medium">{creditAmt > 0 ? `$${creditAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}</td>
                                       <td className="p-3 border-r text-slate-400 italic truncate max-w-[160px]" title={tx.memo}>{tx.memo || ''}</td>
                                       <td className="p-3">
                                          <div className="flex flex-col gap-1">
                                             {txAttachments.map((att: any, ai: number) => (
                                                <div key={ai} className="flex items-center gap-1 group">
                                                   {att.url
                                                      ? <a href={att.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline truncate max-w-[100px]" title={att.name}>📎 {att.name}</a>
                                                      : <span className="text-[10px] text-slate-500 truncate max-w-[100px]">📎 {att.name}</span>
                                                   }
                                                   <button
                                                      onClick={() => handleTxDeleteAttachment(tx.id, att.url?.split('/').pop() || att.name)}
                                                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none"
                                                      title="Delete"
                                                   >✕</button>
                                                </div>
                                             ))}
                                             <button
                                                onClick={() => handleTxAttachClick(tx.id)}
                                                disabled={isUploading}
                                                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 transition-colors mt-0.5 disabled:opacity-50"
                                                title="Attach file"
                                             >
                                                {isUploading ? <span className="animate-pulse">uploading…</span> : <><span>📎</span><span>Attach</span></>}
                                             </button>
                                          </div>
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>
               ) : (
               <React.Fragment>
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
                           <button onClick={() => setShowConfig(true)} className="text-xl opacity-60 hover:opacity-100 transition-opacity" title="Bank Feed Settings">⚙️</button>
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
            </React.Fragment>
            )}
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

         {showConfig && (
            <div className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center">
               <div className="bg-white rounded-xl shadow-2xl w-[520px] flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="bg-[#003366] text-white px-6 py-4 flex justify-between items-center">
                     <div>
                        <h3 className="font-bold text-sm">Bank Feed Settings</h3>
                        <p className="text-[10px] opacity-60 mt-0.5">{activeAccount?.name || 'No account selected'}</p>
                     </div>
                     <button onClick={() => setShowConfig(false)} className="hover:bg-white/20 px-2 py-1 rounded text-xs">✕</button>
                  </div>

                  <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                     {/* Connection Info */}
                     <section>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Connection</h4>
                        <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-xs">
                           <div className="flex justify-between">
                              <span className="text-slate-500 font-medium">Account</span>
                              <span className="font-bold text-slate-800">{activeAccount?.name || '—'}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-slate-500 font-medium">Account #</span>
                              <span className="font-mono text-slate-600">**** **** {activeAccount?.number?.slice(-4) || '0000'}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-slate-500 font-medium">Import Method</span>
                              <span className="font-bold text-blue-700">Manual (CSV / OFX)</span>
                           </div>
                        </div>
                     </section>

                     {/* Auto-match settings */}
                     <section>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Auto-Match</h4>
                        <div className="space-y-4">
                           <label className="flex items-center justify-between gap-4">
                              <span className="text-xs font-bold text-slate-700">Enable automatic transaction matching</span>
                              <input
                                 type="checkbox"
                                 className="w-4 h-4 accent-blue-600"
                                 checked={configAutoMatch}
                                 onChange={e => setConfigAutoMatch(e.target.checked)}
                              />
                           </label>
                           <div className="flex items-center justify-between gap-4">
                              <span className="text-xs font-bold text-slate-700">Match window (±days)</span>
                              <input
                                 type="number"
                                 min={1} max={30}
                                 className="border border-slate-300 rounded px-2 py-1 text-xs w-20 text-center outline-none focus:border-blue-400"
                                 value={configMatchDays}
                                 onChange={e => setConfigMatchDays(parseInt(e.target.value) || 10)}
                                 disabled={!configAutoMatch}
                              />
                           </div>
                        </div>
                     </section>

                     {/* Auto-categorization rules */}
                     <section>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Auto-Categorization Rules</h4>
                        <div className="space-y-2 mb-3">
                           {configRules.length === 0 && (
                              <p className="text-xs text-slate-400 italic">No rules yet. Add a rule below to auto-categorize transactions.</p>
                           )}
                           {configRules.map((rule, idx) => (
                              <div key={idx} className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg text-xs">
                                 <span className="flex-1 font-mono text-slate-600 truncate">"{rule.keyword}"</span>
                                 <span className="text-slate-400">→</span>
                                 <span className="font-bold text-blue-700 truncate">{accounts.find(a => a.id === rule.category)?.name || rule.category}</span>
                                 <button onClick={() => setConfigRules(r => r.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                              </div>
                           ))}
                        </div>
                        <div className="flex gap-2 items-end">
                           <div className="flex flex-col gap-1 flex-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">If description contains</label>
                              <input
                                 type="text"
                                 placeholder="e.g. AMAZON, PAYROLL..."
                                 className="border border-slate-300 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-400"
                                 value={newRuleKeyword}
                                 onChange={e => setNewRuleKeyword(e.target.value)}
                              />
                           </div>
                           <div className="flex flex-col gap-1 flex-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Then categorize as</label>
                              <select
                                 className="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white outline-none focus:border-blue-400"
                                 value={newRuleCategory}
                                 onChange={e => setNewRuleCategory(e.target.value)}
                              >
                                 <option value="">Select account...</option>
                                 {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                           </div>
                           <button
                              onClick={() => {
                                 if (!newRuleKeyword.trim() || !newRuleCategory) return;
                                 setConfigRules(r => [...r, { keyword: newRuleKeyword.trim(), category: newRuleCategory }]);
                                 setNewRuleKeyword('');
                                 setNewRuleCategory('');
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 whitespace-nowrap"
                           >
                              + Add
                           </button>
                        </div>
                     </section>
                  </div>

                  {/* Footer */}
                  <div className="border-t px-6 py-4 flex justify-end gap-3">
                     <button onClick={() => setShowConfig(false)} className="px-4 py-2 border border-slate-300 text-slate-600 rounded text-xs font-bold hover:bg-slate-50">
                        Cancel
                     </button>
                     <button
                        onClick={() => setShowConfig(false)}
                        className="px-5 py-2 bg-[#003366] text-white rounded text-xs font-bold hover:bg-blue-900"
                     >
                        Save Settings
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default BankFeedCenter;
