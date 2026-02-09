
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

  const handleSave = () => {
    const finalData = { ...formData };
    if (formData.openingBalance && !initialData) {
      finalData.balance = formData.openingBalance;
    }
    onSave(finalData);
  };

  const renderStep0 = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-gray-50 shadow-inner">
        <p className="text-xs font-bold text-gray-700">Choose one account type and click Continue.</p>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 p-6 space-y-3 overflow-y-auto border-r bg-white">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-4">Categorize money your business earns or spends</p>
          {ACCOUNT_TYPES.slice(0, 7).map(type => (
            <label key={type} className="flex items-center gap-3 text-xs cursor-pointer hover:text-blue-700 font-bold group">
              <input type="radio" name="accType" checked={formData.type === type} onChange={() => setFormData({ ...formData, type })} className="w-3 h-3" />
              <span className="group-hover:underline">{type}</span>
            </label>
          ))}
          <div className="h-px bg-gray-200 my-4"></div>
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-xs cursor-pointer font-bold">
              <input type="radio" name="accType" checked={!ACCOUNT_TYPES.slice(0, 7).includes(formData.type!)} readOnly className="w-3 h-3" />
              Other Account Types
            </label>
            <select
              className="ml-6 border text-xs p-1 w-48 outline-none bg-blue-50 focus:bg-white"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              {ACCOUNT_TYPES.slice(7).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="w-1/2 p-6 bg-[#f8fbff] flex flex-col">
          <div className="border border-blue-200 bg-white p-4 flex-1 shadow-sm">
            <h4 className="font-bold text-sm text-blue-900 mb-2">{formData.type} Account</h4>
            <div className="text-xs text-gray-600 space-y-3">
              {formData.type === 'Bank' && (
                <>
                  <p>Tracks the money in your checking, savings, money market, or petty cash accounts.</p>
                  <p className="italic">Example: Checking Account 101, Petty Cash</p>
                </>
              )}
              {formData.type === 'Income' && (
                <>
                  <p>Tracks the revenue you generate through your main business functions, like sales or consulting services.</p>
                </>
              )}
              {formData.type === 'Expense' && <p>Tracks the money you spend to run your company.</p>}
              {formData.type === 'Cost of Goods Sold' && <p>Tracks the direct costs to produce the items that your business sells.</p>}
              <button className="text-blue-600 font-bold mt-4 block">More...</button>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 bg-gray-100 flex justify-end gap-2 border-t">
        <button onClick={handleNext} className="px-6 py-1 bg-[#0077c5] text-white text-xs font-bold rounded shadow-sm hover:brightness-110">Continue</button>
        <button onClick={onClose} className="px-6 py-1 border border-gray-400 bg-white text-xs font-bold rounded shadow-sm hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold w-24">Account Type</label>
              <select className="border text-xs p-1 bg-gray-100 w-48 font-bold" value={formData.type} disabled>
                <option>{formData.type}</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold w-24">Account Name</label>
              <input
                type="text"
                className="border text-xs p-1 flex-1 bg-blue-50 focus:bg-white outline-none"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-4 pl-24">
              <label className="flex items-center gap-2 text-xs cursor-pointer font-semibold">
                <input type="checkbox" checked={!!formData.parentId} onChange={e => setFormData({ ...formData, parentId: e.target.checked ? (existingAccounts[0]?.id || '') : undefined })} />
                Subaccount of
              </label>
              <select
                className="border text-xs p-1 flex-1 bg-blue-50 disabled:bg-gray-100 outline-none"
                disabled={!formData.parentId}
                value={formData.parentId || ''}
                onChange={e => setFormData({ ...formData, parentId: e.target.value })}
              >
                <option value="">&lt;Select Parent Account&gt;</option>
                {existingAccounts.filter(a => a.id !== initialData?.id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold w-24">Currency</label>
              <select className="border text-xs p-1 flex-1 bg-blue-50 outline-none" value={formData.currency || 'US Dollar'} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                <option>US Dollar</option>
                <option>GBP - British Pound</option>
                <option>CNY - Chinese Yuan</option>
              </select>
            </div>
          </div>
          <div className="w-32">
            <label className="text-xs font-bold block mb-1">Number</label>
            <input
              type="text"
              className="border text-xs p-1 w-full outline-none focus:ring-1 ring-blue-500"
              value={formData.number || ''}
              onChange={e => setFormData({ ...formData, number: e.target.value })}
              placeholder="e.g. 1000"
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1 text-gray-500 italic uppercase tracking-widest text-[9px]">Optional Information</label>
            <div className="flex gap-4">
              <label className="text-xs font-bold w-24">Description</label>
              <textarea
                className="border text-xs p-1 flex-1 h-16 outline-none focus:bg-white bg-blue-50"
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                maxLength={200}
              />
            </div>
          </div>

          {formData.type === 'Bank' && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold w-24">Bank Acct. No.</label>
                <input type="text" className="border text-xs p-1 w-48 outline-none bg-blue-50" value={formData.bankAccountNumber || ''} onChange={e => setFormData({ ...formData, bankAccountNumber: e.target.value })} />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold w-24">Routing Number</label>
                <input type="text" className="border text-xs p-1 w-48 outline-none bg-blue-50" value={formData.routingNumber || ''} onChange={e => setFormData({ ...formData, routingNumber: e.target.value })} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="text-xs font-bold w-24">Tax-Line Mapping</label>
            <select className="border text-xs p-1 flex-1 outline-none" value={formData.taxLineMapping || ''} onChange={e => setFormData({ ...formData, taxLineMapping: e.target.value })}>
              <option value="">&lt;Unassigned&gt;</option>
              <option>B/S-Assets: Cash</option>
              <option>I/S-Income: Service Income</option>
              <option>I/S-Expense: Office Supplies</option>
            </select>
          </div>

          <div className="bg-[#fff9e6] p-4 rounded border border-yellow-200 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex-1 mr-4">
                <span className="text-xs font-bold text-gray-700 italic">Enter Opening Balance (Page 54)</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Opening Balance</label>
                <div className="flex items-center border bg-white p-1">
                  <span className="text-xs text-gray-400 mr-1">$</span>
                  <input
                    type="number"
                    className="flex-1 outline-none text-xs"
                    value={formData.openingBalance || 0}
                    onChange={e => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">As of Date</label>
                <input
                  type="date"
                  className="border bg-white p-1 text-xs outline-none"
                  value={formData.openingBalanceDate || ''}
                  onChange={e => setFormData({ ...formData, openingBalanceDate: e.target.value })}
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-1 italic">Accountants usually prefer a journal entry for historical data.</p>
          </div>
        </div>
      </div>
      <div className="mt-auto p-4 bg-gray-100 flex justify-end gap-2 border-t sticky bottom-0">
        <button onClick={handleSave} className="px-4 py-1 bg-[#0077c5] text-white text-xs font-bold rounded shadow-sm hover:brightness-110">Save & Close</button>
        <button onClick={handleSave} className="px-4 py-1 border border-gray-400 bg-white text-xs font-bold rounded shadow-sm hover:bg-gray-50">Save & New</button>
        <button onClick={onClose} className="px-4 py-1 border border-gray-400 bg-white text-xs font-bold rounded shadow-sm hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[400]">
      <div className="bg-white w-[640px] h-[540px] rounded shadow-2xl border border-gray-500 overflow-hidden flex flex-col qb-window-shadow">
        <div className="bg-[#003366] p-2 text-white font-bold text-sm flex justify-between items-center select-none">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-400 rounded-sm"></div>
            <span>{initialData ? 'Edit' : 'Add New'} Account</span>
          </div>
          <button onClick={onClose} className="hover:bg-red-600 px-2 font-serif">X</button>
        </div>
        {step === 0 ? renderStep0() : renderStep1()}
      </div>
    </div>
  );
};

export default AccountForm;