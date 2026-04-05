
import React, { useState } from 'react';
import { Account, AccountingPreferences } from '../types';
import AccountForm from './AccountForm';

interface Props {
  accounts: Account[];
  prefs: AccountingPreferences;
  onUpdateAccounts: (accounts: Account[]) => void;
  onOpenRegister: (accountId: string) => void;
  isSingleUser: boolean;
}

const ChartOfAccounts: React.FC<Props> = ({ accounts, prefs, onUpdateAccounts, onOpenRegister, isSingleUser }) => {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);

  const displayedAccounts = accounts.filter(a => includeInactive || a.isActive);

  const handleNewAccount = () => {
    setEditingAccount(undefined);
    setIsFormOpen(true);
  };

  const handleEditAccount = () => {
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (acc) {
      setEditingAccount(acc);
      setIsFormOpen(true);
    }
  };

  const handleDeleteAccount = () => {
    if (!selectedAccountId) return;
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (acc?.balance !== 0) {
      alert("This account has a balance. You must move the balance or make it inactive instead of deleting it. (Page 57)");
      return;
    }
    if (window.confirm("Are you sure you want to delete this account? This cannot be undone.")) {
      onUpdateAccounts(accounts.filter(a => a.id !== selectedAccountId));
      setSelectedAccountId(null);
    }
  };

  const handleSave = (accountData: Partial<Account>) => {
    const existing = accounts.find(a => a.name === accountData.name && a.id !== editingAccount?.id);

    if (existing && isSingleUser) {
      if (window.confirm(`This name is already in use. Do you want to merge '${editingAccount?.name}' into '${existing.name}'? (Page 58)`)) {
        // Simple merge: delete the one being edited, existing stays
        onUpdateAccounts(accounts.filter(a => a.id !== editingAccount?.id));
        setIsFormOpen(false);
        return;
      }
    }

    if (editingAccount) {
      onUpdateAccounts(accounts.map(a => a.id === editingAccount.id ? { ...a, ...accountData } as Account : a));
    } else {
      const newAcc: Account = {
        id: Math.random().toString(),
        isActive: true,
        balance: 0,
        ...accountData
      } as Account;
      onUpdateAccounts([...accounts, newAcc]);
    }
    setIsFormOpen(false);
  };

  const toggleActive = (id: string) => {
    onUpdateAccounts(accounts.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Chart of Accounts</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; font-size: 12px; }
            th { background-color: #f4f4f4; font-weight: bold; text-transform: uppercase; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; }
            h1 { margin: 0; font-size: 24px; }
            .date { font-size: 12px; color: #666; margin-top: 5px; }
            .balance { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Chart of Accounts</h1>
            <div class="date">Printed on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Type</th>
                <th>Currency</th>
                <th class="balance">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${displayedAccounts.map(acc => `
                <tr>
                  <td>${acc.number ? acc.number + ' ' : ''}${acc.name}</td>
                  <td>${acc.type}</td>
                  <td>USD</td>
                  <td class="balance">${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    const headers = ['Account Number', 'Account Name', 'Type', 'Currency', 'Balance'];
    const rows = displayedAccounts.map(acc => [
      acc.number || '',
      acc.name,
      acc.type,
      'USD',
      acc.balance.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `chart_of_accounts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAccountTypeColor = (type: string) => {
    const assetTypes = ['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset', 'Other Asset'];
    const liabilityTypes = ['Accounts Payable', 'Credit Card', 'Other Current Liability', 'Long Term Liability'];
    const incomeTypes = ['Income', 'Other Income'];
    const expenseTypes = ['Expense', 'Other Expense', 'Cost of Goods Sold'];

    if (assetTypes.includes(type)) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (liabilityTypes.includes(type)) return 'bg-amber-50 text-amber-700 border-amber-100';
    if (incomeTypes.includes(type)) return 'bg-blue-50 text-blue-700 border-blue-100';
    if (expenseTypes.includes(type)) return 'bg-rose-50 text-rose-700 border-rose-100';
    if (type === 'Equity') return 'bg-purple-50 text-purple-700 border-purple-100';
    return 'bg-gray-50 text-gray-700 border-gray-100';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans antialiased text-slate-900">
      {/* Header Area */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Chart of Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your financial structure and account balances</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNewAccount}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> New Account
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12 text-center">Active</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account name</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">Type</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Currency</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40 text-right">Balance</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedAccounts.sort((a, b) => (a.number || '').localeCompare(b.number || '')).map(acc => {
                  const isSelected = selectedAccountId === acc.id;
                  const isSub = !!acc.parentId;

                  return (
                    <tr
                      key={acc.id}
                      onClick={() => setSelectedAccountId(acc.id)}
                      onDoubleClick={() => {
                        const balanceSheetTypes = ['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset', 'Other Asset', 'Accounts Payable', 'Credit Card', 'Other Current Liability', 'Long Term Liability', 'Equity'];
                        if (balanceSheetTypes.includes(acc.type)) {
                          onOpenRegister(acc.id);
                        } else {
                          handleEditAccount();
                        }
                      }}
                      className={`group transition-all duration-150 cursor-pointer ${isSelected
                        ? 'bg-indigo-50/70 border-l-4 border-l-indigo-500'
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                        } ${!acc.isActive ? 'opacity-60' : ''}`}
                    >
                      <td className="px-6 py-3 text-center" onClick={(e) => { e.stopPropagation(); toggleActive(acc.id); }}>
                        <div className={`w-5 h-5 mx-auto rounded border flex items-center justify-center transition-colors ${acc.isActive
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-slate-100 border-slate-300 text-transparent'
                          }`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </td>
                      <td className={`px-6 py-3 ${isSub ? 'pl-14' : 'font-medium text-slate-800'}`}>
                        <div className="flex items-center gap-2">
                          {prefs.useAccountNumbers && acc.number && (
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{acc.number}</span>
                          )}
                          <span className={isSub ? 'text-slate-600' : ''}>{acc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${getAccountTypeColor(acc.type)}`}>
                          {acc.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-500 text-sm italic">USD</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`text-sm font-semibold ${acc.balance < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {acc.balance.toLocaleString(undefined, {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedAccountId(acc.id); handleEditAccount(); }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedAccountId(acc.id); handleDeleteAccount(); }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Info Bar */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs font-medium text-slate-500">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={e => setIncludeInactive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="group-hover:text-slate-700 transition-colors">Include inactive accounts</span>
              </label>
              <span>{displayedAccounts.length} accounts total</span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handlePrint}
                className="hover:text-indigo-600 transition-colors pointer-events-auto"
              >
                Print List
              </button>
              <button
                onClick={handleExport}
                className="hover:text-indigo-600 transition-colors pointer-events-auto"
              >
                Export to Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <AccountForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        existingAccounts={accounts}
        initialData={editingAccount}
      />
    </div>
  );
};

export default ChartOfAccounts;
