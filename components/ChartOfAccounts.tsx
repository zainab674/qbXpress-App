
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

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0]">
      <div className="flex-1 overflow-auto bg-white m-1 border border-gray-400 qb-window-shadow">
        <table className="w-full text-[11px] text-left border-collapse select-none">
          <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-400 z-10 shadow-sm">
            <tr className="h-6">
              <th className="px-2 border-r border-gray-300 font-bold w-8 text-center">X</th>
              <th className="px-2 border-r border-gray-300 font-bold">NAME</th>
              <th className="px-2 border-r border-gray-300 font-bold w-40">TYPE</th>
              <th className="px-2 border-r border-gray-300 font-bold w-20">CURRENCY</th>
              <th className="px-2 border-r border-gray-300 font-bold w-32 text-right">BALANCE TOTAL</th>
              <th className="px-2 font-bold w-12 text-center">ATTACH</th>
            </tr>
          </thead>
          <tbody>
            {displayedAccounts.sort((a, b) => a.number.localeCompare(b.number)).map(acc => {
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
                  className={`h-5 border-b border-gray-100 ${isSelected ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'} ${!acc.isActive ? 'italic text-gray-400' : ''}`}
                >
                  <td className="px-2 border-r border-gray-200 text-center font-bold text-xs" onClick={(e) => { e.stopPropagation(); toggleActive(acc.id); }}>
                    {!acc.isActive && 'X'}
                  </td>
                  <td className={`px-2 border-r border-gray-200 truncate ${isSub ? 'pl-8' : 'font-semibold'}`}>
                    <span className="mr-2 text-gray-400 font-normal">{prefs.useAccountNumbers && acc.number}</span>
                    <span className={isSub ? 'before:content-["•"] before:mr-2' : ''}>{acc.name}</span>
                  </td>
                  <td className="px-2 border-r border-gray-200 italic">{acc.type}</td>
                  <td className="px-2 border-r border-gray-200 text-gray-500">USD</td>
                  <td className="px-2 border-r border-gray-200 text-right font-mono">
                    {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 text-center"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-[#f0f0f0] p-1 flex items-center justify-between border-t border-gray-300">
        <div className="flex gap-1">
          <div className="relative group">
            <button className="bg-gray-100 hover:bg-white border border-gray-400 px-3 py-0.5 text-[11px] font-bold rounded flex items-center gap-2">
              Account <span className="text-[8px]">▼</span>
            </button>
            <div className="hidden group-hover:block absolute bottom-full left-0 bg-white border border-gray-400 shadow-xl min-w-[150px] z-[5000] py-1 rounded-sm text-gray-900">
              <button
                onClick={() => selectedAccountId && onOpenRegister(selectedAccountId)}
                className={`w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-xs font-bold ${!selectedAccountId ? 'opacity-30 pointer-events-none' : ''}`}
              >
                Use Register
              </button>
              <div className="h-px bg-gray-200 my-1"></div>
              <button onClick={handleNewAccount} className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-xs flex justify-between">
                <span>New</span> <span className="opacity-50">Ctrl+N</span>
              </button>
              <button onClick={handleEditAccount} className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-xs flex justify-between">
                <span>Edit Account</span> <span className="opacity-50">Ctrl+E</span>
              </button>
              <button onClick={handleDeleteAccount} className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-xs flex justify-between">
                <span>Delete Account</span> <span className="opacity-50">Ctrl+D</span>
              </button>
              <button onClick={() => selectedAccountId && toggleActive(selectedAccountId)} className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-xs">
                Make Account Inactive
              </button>
              <div className="h-px bg-gray-200 my-1"></div>
              <button className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-xs">Print List...</button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 px-2">
          <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 cursor-pointer">
            <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} />
            Include inactive
          </label>
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
