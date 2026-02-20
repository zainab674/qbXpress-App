import React, { useState } from 'react';
import { HomePagePreferences, AccountingPreferences, BillsPreferences, CheckingPreferences, Account } from '../types';
import { API_BASE_URL } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  homePrefs: HomePagePreferences;
  setHomePrefs: (p: HomePagePreferences) => void;
  accPrefs: AccountingPreferences;
  setAccPrefs: (p: AccountingPreferences) => void;
  billPrefs: BillsPreferences;
  setBillPrefs: (p: BillsPreferences) => void;
  checkingPrefs: CheckingPreferences;
  setCheckingPrefs: (p: CheckingPreferences) => void;
  closingDate: string;
  setClosingDate: (d: string) => void;
  userRole: 'Admin' | 'Standard';
  setUserRole: (r: 'Admin' | 'Standard') => void;
  accounts: Account[];
  uiPrefs: any;
  setUiPrefs: (p: any) => void;
}

const PreferencesDialog: React.FC<Props> = ({ isOpen, onClose, homePrefs, setHomePrefs, accPrefs, setAccPrefs, billPrefs, setBillPrefs, checkingPrefs, setCheckingPrefs, closingDate, setClosingDate, userRole, setUserRole, accounts }) => {
  const [activeCategory, setActiveCategory] = useState('Desktop View');
  const [smtpSettings, setSmtpSettings] = useState({ host: '', port: 587, user: '', pass: '', from: '' });
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  React.useEffect(() => {
    if (isOpen && activeCategory === 'Email') {
      const fetchSettings = async () => {
        setLoadingEmail(true);
        try {
          const token = localStorage.getItem('authToken');
          const res = await fetch(`${API_BASE_URL}/email/settings`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
          });
          const data = await res.json();
          setSmtpSettings({ ...data, pass: '' });
          setHasPassword(data.hasPassword);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingEmail(false);
        }
      };
      fetchSettings();
    }
  }, [isOpen, activeCategory]);

  const saveEmailSettings = async () => {
    setLoadingEmail(true);
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/email/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(smtpSettings)
      });
      alert('SMTP Settings Saved!');
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setLoadingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-full w-full bg-[#f0f0f0] flex flex-col font-sans overflow-hidden">
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="bg-[#0077c5] p-2 text-white font-bold text-sm flex justify-between items-center select-none">
          <span>Preferences</span>
          <button onClick={onClose} className="hover:bg-red-600 px-2 font-serif">X</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar Categories */}
          <div className="w-44 bg-gray-100 border-r border-gray-300 text-[11px] overflow-y-auto">
            {[
              'Accounting', 'Bills', 'Checking', 'Desktop View', 'Email'
            ].map(cat => (
              <div
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 cursor-pointer border-b border-gray-200 transition-colors ${activeCategory === cat ? 'bg-white font-bold text-blue-800 border-r-transparent' : 'hover:bg-gray-200'}`}
              >
                {cat}
              </div>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs border-t border-gray-200">
              {activeCategory === 'Email' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 border border-blue-200 rounded">
                    <h3 className="font-bold text-blue-900 uppercase text-[10px] mb-3">SMTP (Outgoing Email) Settings</h3>
                    {loadingEmail ? <div className="italic text-gray-500">Loading settings...</div> : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block font-bold text-gray-700 mb-1">SMTP Host</label>
                          <input type="text" className="w-full border p-1 rounded" placeholder="smtp.gmail.com" value={smtpSettings.host} onChange={e => setSmtpSettings({ ...smtpSettings, host: e.target.value })} />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-700 mb-1">Port</label>
                          <input type="number" className="w-full border p-1 rounded" placeholder="587" value={smtpSettings.port} onChange={e => setSmtpSettings({ ...smtpSettings, port: parseInt(e.target.value) })} />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-700 mb-1">From Name/Email</label>
                          <input type="text" className="w-full border p-1 rounded" placeholder="Company <info@biz.com>" value={smtpSettings.from} onChange={e => setSmtpSettings({ ...smtpSettings, from: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                          <label className="block font-bold text-gray-700 mb-1">SMTP Username (Email)</label>
                          <input type="text" className="w-full border p-1 rounded" value={smtpSettings.user} onChange={e => setSmtpSettings({ ...smtpSettings, user: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                          <label className="block font-bold text-gray-700 mb-1">SMTP Password {hasPassword && <span className="text-green-600">(Saved)</span>}</label>
                          <input type="password" title="Leave blank to keep current password" placeholder={hasPassword ? "••••••••" : "Enter Password"} className="w-full border p-1 rounded" value={smtpSettings.pass} onChange={e => setSmtpSettings({ ...smtpSettings, pass: e.target.value })} />
                        </div>
                        <div className="col-span-2 pt-2">
                          <button onClick={saveEmailSettings} className="bg-[#0077c5] text-white px-4 py-1.5 rounded font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all">Save Email Cloud Settings</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeCategory === 'Desktop View' && (
                <>
                  <p className="font-bold text-gray-700 font-serif">Select the features that you want to show on the Dashboard.</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-4">
                    <div className="font-bold border-b border-gray-100 col-span-2 text-blue-800 uppercase text-[9px] tracking-widest">Main Financial Stats</div>
                    <label className="flex items-center gap-2 cursor-pointer group hover:bg-blue-50 p-1 transition-colors rounded">
                      <input type="checkbox" checked={homePrefs.showOverallHealth} onChange={e => setHomePrefs({ ...homePrefs, showOverallHealth: e.target.checked })} />
                      <span className="group-hover:text-blue-600 transition-colors">Overall Profit (All Time)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group hover:bg-blue-50 p-1 transition-colors rounded">
                      <input type="checkbox" checked={homePrefs.showNetChange} onChange={e => setHomePrefs({ ...homePrefs, showNetChange: e.target.checked })} />
                      <span className="group-hover:text-blue-600 transition-colors">Net Profit (Last 30 Days)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group hover:bg-blue-50 p-1 transition-colors rounded">
                      <input type="checkbox" checked={homePrefs.showTotalIncome} onChange={e => setHomePrefs({ ...homePrefs, showTotalIncome: e.target.checked })} />
                      <span className="group-hover:text-blue-600 transition-colors">Total Income</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group hover:bg-blue-50 p-1 transition-colors rounded">
                      <input type="checkbox" checked={homePrefs.showTotalExpenses} onChange={e => setHomePrefs({ ...homePrefs, showTotalExpenses: e.target.checked })} />
                      <span className="group-hover:text-blue-600 transition-colors">Total Expenses</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group hover:bg-blue-50 p-1 transition-colors rounded">
                      <input type="checkbox" checked={homePrefs.showCashIn} onChange={e => setHomePrefs({ ...homePrefs, showCashIn: e.target.checked })} />
                      <span className="group-hover:text-blue-600 transition-colors">Cash In Flow</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group hover:bg-blue-50 p-1 transition-colors rounded">
                      <input type="checkbox" checked={homePrefs.showCashOut} onChange={e => setHomePrefs({ ...homePrefs, showCashOut: e.target.checked })} />
                      <span className="group-hover:text-blue-600 transition-colors">Cash Out Flow</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group hover:bg-blue-50 p-1 transition-colors rounded">
                      <input type="checkbox" checked={homePrefs.showProfitMargin} onChange={e => setHomePrefs({ ...homePrefs, showProfitMargin: e.target.checked })} />
                      <span className="group-hover:text-blue-600 transition-colors">Profit Margin %</span>
                    </label>

                    <div className="font-bold border-b border-gray-100 col-span-2 text-blue-800 uppercase text-[9px] mt-4 tracking-widest">Action Items</div>
                    <label className="flex items-center gap-2 cursor-pointer group hover:bg-blue-50 p-1 transition-colors rounded">
                      <input type="checkbox" checked={homePrefs.showCashAlerts} onChange={e => setHomePrefs({ ...homePrefs, showCashAlerts: e.target.checked })} />
                      <span className="group-hover:text-blue-600 transition-colors">Cash Alerts (Overdue Invoices)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group hover:bg-blue-50 p-1 transition-colors rounded">
                      <input type="checkbox" checked={homePrefs.showUpcomingObligations} onChange={e => setHomePrefs({ ...homePrefs, showUpcomingObligations: e.target.checked })} />
                      <span className="group-hover:text-blue-600 transition-colors">Upcoming Obligations (Bills Chart)</span>
                    </label>

                    <div className="font-bold border-b border-gray-100 col-span-2 text-blue-800 uppercase text-[9px] mt-4 tracking-widest">Banking Overview</div>
                    <label className="flex items-center gap-2 cursor-pointer group hover:bg-blue-50 p-1 transition-colors rounded">
                      <input type="checkbox" checked={homePrefs.showFlowOverview} onChange={e => setHomePrefs({ ...homePrefs, showFlowOverview: e.target.checked })} />
                      <span className="group-hover:text-blue-600 transition-colors">Flow Overview (Account Balances)</span>
                    </label>
                  </div>
                </>
              )}

              {activeCategory === 'Accounting' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-3 border border-blue-100 rounded-sm">
                    <p className="text-[10px] text-blue-800 font-bold italic mb-2">Accounting Preferences</p>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4" checked={accPrefs.useAccountNumbers} onChange={e => setAccPrefs({ ...accPrefs, useAccountNumbers: e.target.checked })} />
                      <div className="flex flex-col">
                        <span className="font-bold">Use account numbers</span>
                        <span className="text-[10px] text-gray-500">Show account numbers in lists and transactions.</span>
                      </div>
                    </label>
                  </div>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4" checked={accPrefs.showLowestSubaccountOnly} onChange={e => setAccPrefs({ ...accPrefs, showLowestSubaccountOnly: e.target.checked })} />
                      <div className="flex flex-col">
                        <span className="font-bold">Show lowest subaccount only</span>
                        <span className="text-[10px] text-gray-500">Hides parent accounts when subaccounts are present.</span>
                      </div>
                    </label>
                  </div>

                  <div className="border-t pt-4">
                    <div className="font-bold text-[#003366] mb-2 uppercase text-[10px]">Closing Date</div>
                    <div className="bg-yellow-50 p-3 border border-yellow-200 rounded">
                      <p className="mb-2">Set the date through which the books are closed.</p>
                      <div className="flex items-center gap-4">
                        <input
                          type="date"
                          className="border p-1 rounded font-mono"
                          value={closingDate.includes('/') ? new Date(closingDate).toISOString().split('T')[0] : closingDate}
                          onChange={e => setClosingDate(e.target.value)}
                        />
                        <span className="italic text-gray-500">Transactions on or before this date will trigger a warning.</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="font-bold text-[#003366] mb-2 uppercase text-[10px]">User Permissions</div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold">Current Role:</span>
                      <select
                        className="border p-1 rounded"
                        value={userRole}
                        onChange={e => setUserRole(e.target.value as any)}
                      >
                        <option value="Admin">Admin (Full Access)</option>
                        <option value="Standard">Standard (Limited)</option>
                      </select>
                      {userRole === 'Standard' && <span className="text-red-600 font-bold animate-pulse">Standard users cannot change the closing date!</span>}
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === 'Bills' && (
                <div className="space-y-4">
                  <h4 className="font-bold border-b pb-1 text-[#003366] uppercase text-[10px]">Bills & Accounts Payable</h4>
                  <div className="bg-blue-50 p-4 border rounded">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={billPrefs.showPastDueWarning} onChange={e => setBillPrefs({ ...billPrefs, showPastDueWarning: e.target.checked })} />
                      <div>
                        <span className="font-bold">Show past due warning</span>
                        <p className="text-[10px] text-gray-500">Warn me when I haven't paid a bill by its due date.</p>
                      </div>
                    </label>
                  </div>
                  <div className="flex items-center gap-3 px-1">
                    <span>Bills are due</span>
                    <input type="number" className="w-16 border p-1 rounded text-right" value={billPrefs.defaultDaysUntilDue} onChange={e => setBillPrefs({ ...billPrefs, defaultDaysUntilDue: parseInt(e.target.value) || 0 })} />
                    <span>days after receipt</span>
                  </div>
                  <label className="flex items-center gap-3 px-1 cursor-pointer">
                    <input type="checkbox" checked={billPrefs.autoApplyCredits} onChange={e => setBillPrefs({ ...billPrefs, autoApplyCredits: e.target.checked })} />
                    <span>Automatically use credits</span>
                  </label>
                </div>
              )}

              {activeCategory === 'Checking' && (
                <div className="space-y-4">
                  <h4 className="font-bold border-b pb-1 text-[#003366] uppercase text-[10px]">Checking & Banking</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block font-bold mb-1">Default Check Account</label>
                      <select className="w-full border p-1 rounded" value={checkingPrefs.defaultCheckAccount} onChange={e => setCheckingPrefs({ ...checkingPrefs, defaultCheckAccount: e.target.value })}>
                        <option value="">Select Account...</option>
                        {accounts.filter(a => a.type === 'Bank').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Default Payroll Account</label>
                      <select className="w-full border p-1 rounded" value={checkingPrefs.defaultPayrollAccount} onChange={e => setCheckingPrefs({ ...checkingPrefs, defaultPayrollAccount: e.target.value })}>
                        <option value="">Select Account...</option>
                        {accounts.filter(a => a.type === 'Bank').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                      <input type="checkbox" checked={checkingPrefs.showAccountBalanceInFooter} onChange={e => setCheckingPrefs({ ...checkingPrefs, showAccountBalanceInFooter: e.target.checked })} />
                      <span>Show account balance in register footer</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-100 p-3 flex justify-end gap-2 border-t border-gray-300">
          <button onClick={onClose} className="px-6 py-1 bg-[#0077c5] text-white text-xs font-bold rounded shadow-sm hover:brightness-110 active:scale-95">OK</button>
          <button onClick={onClose} className="px-6 py-1 border border-gray-400 bg-white text-xs font-bold rounded shadow-sm hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesDialog;
