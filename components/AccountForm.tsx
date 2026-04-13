
import React, { useState } from 'react';
import { Account } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Partial<Account>) => void;
  existingAccounts: Account[];
  initialData?: Account;
}

const ACCOUNT_TYPES = [
  'Income', 'Expense', 'Fixed Asset', 'Bank', 'Loan', 'Credit Card', 'Equity',
  'Accounts Receivable', 'Other Current Asset', 'Other Asset', 'Accounts Payable',
  'Other Current Liability', 'Long Term Liability', 'Cost of Goods Sold',
  'Other Income', 'Other Expense'
];

const AccountForm: React.FC<Props> = ({ isOpen, onClose, onSave, existingAccounts, initialData }) => {
  const [step, setStep] = useState(initialData ? 1 : 0);
  const [formData, setFormData] = useState<Partial<Account>>(initialData || {
    type: 'Bank',
    isActive: true,
    balance: 0,
    currency: 'US Dollar',
    openingBalance: 0,
    openingBalanceDate: new Date().toISOString().split('T')[0]
  });

  if (!isOpen) return null;

  const handleNext = () => setStep(1);

  const defaultFormData: Partial<Account> = {
    type: 'Bank',
    isActive: true,
    balance: 0,
    currency: 'US Dollar',
    openingBalance: 0,
    openingBalanceDate: new Date().toISOString().split('T')[0]
  };

  const handleSaveAndClose = () => {
    const finalData = { ...formData };
    if (formData.openingBalance && !initialData) {
      finalData.balance = formData.openingBalance;
    }
    onSave(finalData);
    onClose();
  };

  const handleSaveAndNew = () => {
    const finalData = { ...formData };
    if (formData.openingBalance && !initialData) {
      finalData.balance = formData.openingBalance;
    }
    onSave(finalData);
    setFormData(defaultFormData);
    setStep(0);
  };

  const renderStep0 = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="px-8 py-4 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800">Assign Account Type</h3>
        <p className="text-xs text-slate-500 mt-1">Select the category that best describes this account's purpose.</p>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 p-8 space-y-4 overflow-y-auto border-r border-slate-100">
          <div className="space-y-2">
            {ACCOUNT_TYPES.slice(0, 7).map(type => (
              <label
                key={type}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer group ${formData.type === type
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-100 hover:border-slate-300 text-slate-600'
                  }`}
              >
                <input
                  type="radio"
                  name="accType"
                  checked={formData.type === type}
                  onChange={() => setFormData({ ...formData, type })}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-sm font-medium">{type}</span>
              </label>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 italic">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block px-1">Other types</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="" disabled>Select another type...</option>
              {ACCOUNT_TYPES.slice(7).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="w-1/2 p-8 bg-slate-50/50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 text-indigo-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-800 mb-3">{formData.type} Account</h4>
            <div className="text-sm text-slate-600 space-y-4 leading-relaxed">
              {formData.type === 'Bank' && (
                <>
                  <p>Tracks the money in your checking, savings, money market, or petty cash accounts.</p>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Examples</p>
                    <p className="italic text-slate-500">Checking, Savings, Petty Cash</p>
                  </div>
                </>
              )}
              {formData.type === 'Income' && (
                <p>Tracks the revenue you generate through your main business functions, like sales or consulting services.</p>
              )}
              {formData.type === 'Expense' && <p>Tracks the money you spend to run your company.</p>}
              {['Expense', 'Income', 'Bank', 'Cost of Goods Sold'].includes(formData.type || '') || (
                <p>A specialized account category used for {formData.type?.toLowerCase()} tracking in your general ledger.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Top Info Section */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Account Type</label>
              <div className="bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-500 font-medium">
                {formData.type}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Account Name *</label>
              <input
                type="text"
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sales Income"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Account Number</label>
            <input
              type="text"
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              value={formData.number || ''}
              onChange={e => setFormData({ ...formData, number: e.target.value })}
              placeholder="1000"
            />
          </div>
        </div>

        {/* Subaccount & Currency */}
        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                checked={!!formData.parentId}
                onChange={e => setFormData({ ...formData, parentId: e.target.checked ? (existingAccounts[0]?.id || '') : undefined })}
              />
              <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">Is subaccount of</span>
            </label>
            <select
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all"
              disabled={!formData.parentId}
              value={formData.parentId || ''}
              onChange={e => setFormData({ ...formData, parentId: e.target.value })}
            >
              <option value="">Select parent account...</option>
              {existingAccounts.filter(a => a.id !== initialData?.id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Currency</label>
            <select className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.currency || 'US Dollar'} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
              <option>US Dollar</option>
              <option>GBP - British Pound</option>
              <option>CNY - Chinese Yuan</option>
            </select>
          </div>
        </div>

        {/* Details & Optional */}
        <div className="space-y-5 pt-6 border-t border-slate-100">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Description</label>
            <textarea
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px] transition-all"
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Briefly describe the purpose of this account..."
            />
          </div>

          {formData.type === 'Bank' && (
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Bank Account No.</label>
                <input type="text" className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.bankAccountNumber || ''} onChange={e => setFormData({ ...formData, bankAccountNumber: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Routing Number</label>
                <input type="text" className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.routingNumber || ''} onChange={e => setFormData({ ...formData, routingNumber: e.target.value })} />
              </div>
            </div>
          )}

          {/* Opening Balance Card */}
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-6">
            <div className="flex items-center gap-2 mb-4 text-amber-800">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-sm font-bold uppercase tracking-wide">Beginning Balance</h4>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-amber-600 uppercase mb-1.5 block">Opening Balance</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    className="w-full bg-white border border-amber-200 rounded-lg p-2.5 pl-7 text-sm outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    value={formData.openingBalance || 0}
                    onChange={e => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-amber-600 uppercase mb-1.5 block">As of Date</label>
                <input
                  type="date"
                  className="w-full bg-white border border-amber-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 font-medium cursor-pointer"
                  value={formData.openingBalanceDate || ''}
                  onChange={e => setFormData({ ...formData, openingBalanceDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0">
        <button
          onClick={onClose}
          className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all"
        >
          Cancel
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleSaveAndNew}
            className="px-5 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            Save & New
          </button>
          <button
            onClick={handleSaveAndClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[5000] p-4 font-sans">
      <div className="bg-white w-full max-w-2xl h-[700px] max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-200">
        <div className="bg-white px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${initialData ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
            <h2 className="text-lg font-bold text-slate-800">
              {initialData ? 'Edit Account' : 'New Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {step === 0 ? renderStep0() : renderStep1()}
        </div>
      </div>
    </div>
  );
};

export default AccountForm;