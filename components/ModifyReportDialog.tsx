
import React, { useState } from 'react';
import { Account, Customer, Vendor, QBClass } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: any) => void;
  reportType: string;
  reportTitle: string;
  availableColumns: string[];
  initialSettings?: any;
  accounts: Account[];
  customers: Customer[];
  vendors: Vendor[];
  classes: QBClass[];
  initialTab?: 'DISPLAY' | 'FILTERS' | 'HEADER_FOOTER' | 'FONTS';
}

const ModifyReportDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  onApply,
  reportType,
  reportTitle,
  availableColumns,
  initialSettings,
  accounts,
  customers,
  vendors,
  classes,
  initialTab = 'DISPLAY'
}) => {
  const [activeTab, setActiveTab] = useState<'DISPLAY' | 'FILTERS' | 'HEADER_FOOTER' | 'FONTS'>(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const defaultSettings = {
    fromDate: '01/01/2024',
    toDate: new Date().toLocaleDateString(),
    basis: 'Accrual',
    columns: [...availableColumns],
    header: {
      showLogo: true,
      companyName: true,
      reportTitle: reportTitle,
      subtitle: 'As of ' + new Date().toLocaleDateString(),
    },
    footer: {
      showPageNumbers: true,
      showDatePrepared: true,
      showTimePrepared: true,
    },
    bandedRows: false,
    groupBy: 'None',
    comparison: {
      previousYear: false,
      previousPeriod: false,
      dollarChange: false,
      percentChange: false,
    },
    filters: {
      accountIds: [] as string[],
      customerIds: [] as string[],
      vendorIds: [] as string[],
      classIds: [] as string[],
      transactionTypes: [] as string[],
      minAmount: '',
      maxAmount: '',
      clearedStatus: 'All',
      memoContains: '',
    },
    fontsNumbers: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      negativeFormat: 'minus',
      negativeColor: 'black',
      showCents: true,
    }
  };

  const [settings, setSettings] = useState(() => {
    if (!initialSettings) return defaultSettings;

    // Deep-ish merge logic for settings
    return {
      ...defaultSettings,
      ...initialSettings,
      header: { ...defaultSettings.header, ...initialSettings.header },
      footer: { ...defaultSettings.footer, ...initialSettings.footer },
      comparison: { ...defaultSettings.comparison, ...initialSettings.comparison },
      filters: { ...defaultSettings.filters, ...initialSettings.filters },
      fontsNumbers: { ...defaultSettings.fontsNumbers, ...initialSettings.fontsNumbers }
    };
  });

  const [searchColumn, setSearchColumn] = useState('');

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(settings);
    onClose();
  };

  const toggleColumn = (col: string) => {
    setSettings((prev: any) => ({
      ...prev,
      columns: prev.columns.includes(col)
        ? prev.columns.filter((c: string) => c !== col)
        : [...prev.columns, col]
    }));
  };

  const filteredColumns = availableColumns.filter(c => c.toLowerCase().includes(searchColumn.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000] animate-in slide-in-from-top-1">
      <div className="bg-white w-[95vw] h-[95vh] shadow-2xl border border-gray-400 overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="bg-[#003366] p-2.5 text-white font-bold text-[13px] flex justify-between items-center select-none qb-bevel-raised">
          <div className="flex items-center gap-2">
            <span className="opacity-80">Modify Report:</span>
            <span>{reportTitle}</span>
          </div>
          <button onClick={onClose} className="hover:bg-red-600 px-2 transition-colors">✕</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 bg-gray-100 border-r border-gray-300 p-2 space-y-1 select-none">
            {[
              { id: 'DISPLAY', label: 'Display' },
              { id: 'FILTERS', label: 'Filters' },
              { id: 'HEADER_FOOTER', label: 'Header/Footer' },
              { id: 'FONTS', label: 'Fonts & Numbers' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left px-4 py-2.5 text-[12px] font-bold rounded border transition-all ${activeTab === tab.id
                  ? 'bg-white text-blue-800 border-gray-300 shadow-sm'
                  : 'text-gray-600 border-transparent hover:bg-gray-200'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
            {activeTab === 'DISPLAY' && (
              <div className="space-y-8">
                {/* Report Period */}
                <section>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b mb-4 pb-1">Report Period</h4>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5">From</label>
                      <input
                        type="text"
                        className="w-full border p-2 text-sm qb-bevel-inset outline-none focus:ring-1 ring-blue-400"
                        value={settings.fromDate}
                        onChange={e => setSettings({ ...settings, fromDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5">To</label>
                      <input
                        type="text"
                        className="w-full border p-2 text-sm qb-bevel-inset outline-none focus:ring-1 ring-blue-400"
                        value={settings.toDate}
                        onChange={e => setSettings({ ...settings, toDate: e.target.value })}
                      />
                    </div>
                  </div>
                </section>

                {/* Report Basis */}
                <section>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b mb-4 pb-1">Report Basis</h4>
                  <div className="flex gap-10">
                    <label className="flex items-center gap-2.5 text-[12px] font-medium cursor-pointer group">
                      <input
                        type="radio"
                        name="basis"
                        className="w-4 h-4 cursor-pointer"
                        checked={settings.basis === 'Accrual'}
                        onChange={() => setSettings({ ...settings, basis: 'Accrual' })}
                      />
                      <span className="group-hover:text-blue-700">Accrual</span>
                    </label>
                    <label className="flex items-center gap-2.5 text-[12px] font-medium cursor-pointer group">
                      <input
                        type="radio"
                        name="basis"
                        className="w-4 h-4 cursor-pointer"
                        checked={settings.basis === 'Cash'}
                        onChange={() => setSettings({ ...settings, basis: 'Cash' })}
                      />
                      <span className="group-hover:text-blue-700">Cash</span>
                    </label>
                  </div>
                </section>

                {/* Columns Management (Only for detail reports) */}
                <section>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b mb-4 pb-1">Appearance</h4>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={settings.bandedRows}
                        onChange={e => setSettings({ ...settings, bandedRows: e.target.checked })}
                      />
                      <span className="text-[12px] font-bold text-gray-700 group-hover:text-blue-700">Banded rows (alternating colors)</span>
                    </label>
                  </div>
                </section>

                {/* Grouping */}
                <section>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b mb-4 pb-1">Grouping</h4>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Group by</label>
                    <select
                      className="w-full border p-2 text-xs qb-bevel-inset outline-none focus:ring-1 ring-blue-400"
                      value={settings.groupBy}
                      onChange={e => setSettings({ ...settings, groupBy: e.target.value })}
                    >
                      <option value="None">None</option>
                      <option value="Account">Account</option>
                      <option value="Customer">Customer</option>
                      <option value="Vendor">Vendor</option>
                      <option value="Class">Class</option>
                      <option value="Location">Location</option>
                      <option value="Month">Month</option>
                      <option value="Quarter">Quarter</option>
                    </select>
                  </div>
                </section>

                {/* Comparison */}
                <section>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b mb-4 pb-1">Compare with</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.comparison.previousPeriod}
                          onChange={e => setSettings({
                            ...settings,
                            comparison: { ...settings.comparison, previousPeriod: e.target.checked }
                          })}
                        />
                        Previous Period (PP)
                      </label>
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.comparison.previousYear}
                          onChange={e => setSettings({
                            ...settings,
                            comparison: { ...settings.comparison, previousYear: e.target.checked }
                          })}
                        />
                        Previous Year (PY)
                      </label>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.comparison.dollarChange}
                          onChange={e => setSettings({
                            ...settings,
                            comparison: { ...settings.comparison, dollarChange: e.target.checked }
                          })}
                        />
                        $ Change
                      </label>
                      <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.comparison.percentChange}
                          onChange={e => setSettings({
                            ...settings,
                            comparison: { ...settings.comparison, percentChange: e.target.checked }
                          })}
                        />
                        % Change
                      </label>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b mb-4 pb-1">Columns</h4>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search for a field..."
                      className="w-full p-2 text-xs border bg-gray-50 italic outline-none focus:bg-white"
                      value={searchColumn}
                      onChange={e => setSearchColumn(e.target.value)}
                    />
                  </div>
                  <div className="border h-44 overflow-y-auto bg-gray-50 qb-bevel-inset p-2 grid grid-cols-2 gap-1 custom-scrollbar">
                    {filteredColumns.map(col => (
                      <label key={col} className="flex items-center gap-2 text-[11px] hover:bg-white p-1.5 rounded cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5"
                          checked={settings.columns.includes(col)}
                          onChange={() => toggleColumn(col)}
                        />
                        <span className="truncate">{col}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'FILTERS' && (
              <div className="space-y-6">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b mb-4 pb-1">Filter Report Data</h4>

                <div className="grid grid-cols-1 gap-6">
                  {/* Account Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Account</label>
                    <select
                      multiple
                      className="w-full border p-2 h-32 text-xs qb-bevel-inset custom-scrollbar outline-none"
                      value={settings.filters.accountIds}
                      onChange={e => {
                        const target = e.target as HTMLSelectElement;
                        const values = Array.from(target.selectedOptions, option => option.value);
                        setSettings({
                          ...settings,
                          filters: { ...settings.filters, accountIds: values }
                        });
                      }}
                    >
                      <option value="All">All Accounts</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.number} · {acc.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1 italic">Hold Ctrl (Cmd) to select multiple.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Customer Filter */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Customer:Job</label>
                      <select
                        className="w-full border p-2 text-xs qb-bevel-inset outline-none"
                        value={settings.filters.customerIds[0] || 'All'}
                        onChange={e => setSettings({
                          ...settings,
                          filters: { ...settings.filters, customerIds: [e.target.value] }
                        })}
                      >
                        <option value="All">All Customers/Jobs</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Vendor Filter */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Vendor</label>
                      <select
                        className="w-full border p-2 text-xs qb-bevel-inset outline-none"
                        value={settings.filters.vendorIds[0] || 'All'}
                        onChange={e => setSettings({
                          ...settings,
                          filters: { ...settings.filters, vendorIds: [e.target.value] }
                        })}
                      >
                        <option value="All">All Vendors</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Class Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Class</label>
                    <select
                      className="w-full border p-2 text-xs qb-bevel-inset outline-none"
                      value={settings.filters.classIds[0] || 'All'}
                      onChange={e => setSettings({
                        ...settings,
                        filters: { ...settings.filters, classIds: [e.target.value] }
                      })}
                    >
                      <option value="All">All Classes</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Transaction Type Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Transaction Type</label>
                    <select
                      multiple
                      className="w-full border p-2 h-24 text-xs qb-bevel-inset custom-scrollbar outline-none"
                      value={settings.filters.transactionTypes}
                      onChange={e => {
                        const target = e.target as HTMLSelectElement;
                        const values = Array.from(target.selectedOptions, option => option.value);
                        setSettings({
                          ...settings,
                          filters: { ...settings.filters, transactionTypes: values }
                        });
                      }}
                    >
                      <option value="All">All types</option>
                      <option value="Invoice">Invoice</option>
                      <option value="Bill">Bill</option>
                      <option value="Check">Check</option>
                      <option value="Payment">Payment</option>
                      <option value="Credit Memo">Credit Memo</option>
                      <option value="Journal Entry">Journal Entry</option>
                    </select>
                  </div>

                  {/* Amount Filter */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Min Amount</label>
                      <input
                        type="text"
                        placeholder="0.00"
                        className="w-full border p-2 text-xs qb-bevel-inset outline-none"
                        value={settings.filters.minAmount}
                        onChange={e => setSettings({ ...settings, filters: { ...settings.filters, minAmount: e.target.value } })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Max Amount</label>
                      <input
                        type="text"
                        placeholder="Any"
                        className="w-full border p-2 text-xs qb-bevel-inset outline-none"
                        value={settings.filters.maxAmount}
                        onChange={e => setSettings({ ...settings, filters: { ...settings.filters, maxAmount: e.target.value } })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Cleared Status */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Cleared Status</label>
                      <select
                        className="w-full border p-2 text-xs qb-bevel-inset outline-none"
                        value={settings.filters.clearedStatus}
                        onChange={e => setSettings({ ...settings, filters: { ...settings.filters, clearedStatus: e.target.value } })}
                      >
                        <option value="All">All</option>
                        <option value="Cleared">Cleared</option>
                        <option value="Uncleared">Uncleared</option>
                      </select>
                    </div>
                    {/* Memo Contains */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Memo</label>
                      <input
                        type="text"
                        placeholder="Contains..."
                        className="w-full border p-2 text-xs qb-bevel-inset outline-none"
                        value={settings.filters.memoContains}
                        onChange={e => setSettings({ ...settings, filters: { ...settings.filters, memoContains: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'HEADER_FOOTER' && (
              <div className="space-y-8">
                <section>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b mb-4 pb-1">Header Information</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-[12px] font-medium w-40">
                        <input
                          type="checkbox"
                          checked={settings.header.showLogo}
                          onChange={e => setSettings({ ...settings, header: { ...settings.header, showLogo: e.target.checked } })}
                        />
                        Show Logo
                      </label>
                      <input
                        type="text"
                        disabled
                        placeholder="logo.png"
                        className="flex-1 border p-1.5 text-xs bg-gray-50 italic cursor-not-allowed"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-[12px] font-medium w-40">
                        <input
                          type="checkbox"
                          checked={settings.header.companyName}
                          onChange={e => setSettings({ ...settings, header: { ...settings.header, companyName: e.target.checked } })}
                        />
                        Company Name
                      </label>
                      <input
                        type="text"
                        className="flex-1 border p-1.5 text-xs qb-bevel-inset outline-none"
                        defaultValue="Sample Company, Inc."
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-[12px] font-medium w-40">
                        <span className="pl-6">Report Title</span>
                      </label>
                      <input
                        type="text"
                        className="flex-1 border p-1.5 text-xs qb-bevel-inset outline-none"
                        value={settings.header.reportTitle}
                        onChange={e => setSettings({ ...settings, header: { ...settings.header, reportTitle: e.target.value } })}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-[12px] font-medium w-40">
                        <span className="pl-6">Subtitle</span>
                      </label>
                      <input
                        type="text"
                        className="flex-1 border p-1.5 text-xs qb-bevel-inset outline-none"
                        value={settings.header.subtitle}
                        onChange={e => setSettings({ ...settings, header: { ...settings.header, subtitle: e.target.value } })}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b mb-4 pb-1">Footer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-[12px] font-medium">
                      <input
                        type="checkbox"
                        checked={settings.footer.showPageNumbers}
                        onChange={e => setSettings({ ...settings, footer: { ...settings.footer, showPageNumbers: e.target.checked } })}
                      />
                      Page Number
                    </label>
                    <label className="flex items-center gap-2 text-[12px] font-medium">
                      <input
                        type="checkbox"
                        checked={settings.footer.showDatePrepared}
                        onChange={e => setSettings({ ...settings, footer: { ...settings.footer, showDatePrepared: e.target.checked } })}
                      />
                      Date Prepared
                    </label>
                    <label className="flex items-center gap-2 text-[12px] font-medium">
                      <input
                        type="checkbox"
                        checked={settings.footer.showTimePrepared}
                        onChange={e => setSettings({ ...settings, footer: { ...settings.footer, showTimePrepared: e.target.checked } })}
                      />
                      Time Prepared
                    </label>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'FONTS' && (
              <div className="space-y-8">
                {/* Font Settings */}
                <section>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b mb-4 pb-1">Font Settings</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Font Family</label>
                      <select
                        className="w-full border p-2 text-xs qb-bevel-inset outline-none"
                        value={settings.fontsNumbers.fontFamily}
                        onChange={e => setSettings({ ...settings, fontsNumbers: { ...settings.fontsNumbers, fontFamily: e.target.value } })}
                      >
                        <option value="Inter, sans-serif">Standard (Inter)</option>
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="Times New Roman, serif">Serif (Times New Roman)</option>
                        <option value="monospace">Monospace</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase">Font Size</label>
                      <select
                        className="w-full border p-2 text-xs qb-bevel-inset outline-none"
                        value={settings.fontsNumbers.fontSize}
                        onChange={e => setSettings({ ...settings, fontsNumbers: { ...settings.fontsNumbers, fontSize: e.target.value } })}
                      >
                        <option value="11px">Small (11px)</option>
                        <option value="14px">Medium (14px)</option>
                        <option value="18px">Large (18px)</option>
                        <option value="24px">Extra Large (24px)</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Number Format Settings */}
                <section>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b mb-4 pb-1">Numbers & Formatting</h4>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-3 uppercase">Negative Numbers</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-[12px] font-medium cursor-pointer">
                            <input
                              type="radio"
                              name="negFormat"
                              checked={settings.fontsNumbers.negativeFormat === 'minus'}
                              onChange={() => setSettings({ ...settings, fontsNumbers: { ...settings.fontsNumbers, negativeFormat: 'minus' } })}
                            />
                            With a minus sign (-100.00)
                          </label>
                          <label className="flex items-center gap-2 text-[12px] font-medium cursor-pointer">
                            <input
                              type="radio"
                              name="negFormat"
                              checked={settings.fontsNumbers.negativeFormat === 'parentheses'}
                              onChange={() => setSettings({ ...settings, fontsNumbers: { ...settings.fontsNumbers, negativeFormat: 'parentheses' } })}
                            />
                            In parentheses (100.00)
                          </label>
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-[12px] font-medium cursor-pointer">
                            <input
                              type="radio"
                              name="negColor"
                              checked={settings.fontsNumbers.negativeColor === 'black'}
                              onChange={() => setSettings({ ...settings, fontsNumbers: { ...settings.fontsNumbers, negativeColor: 'black' } })}
                            />
                            In black
                          </label>
                          <label className="flex items-center gap-2 text-[12px] font-medium cursor-pointer">
                            <input
                              type="radio"
                              name="negColor"
                              checked={settings.fontsNumbers.negativeColor === 'red'}
                              onChange={() => setSettings({ ...settings, fontsNumbers: { ...settings.fontsNumbers, negativeColor: 'red' } })}
                            />
                            In red
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-[12px] font-bold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.fontsNumbers.showCents}
                          onChange={e => setSettings({ ...settings, fontsNumbers: { ...settings.fontsNumbers, showCents: e.target.checked } })}
                        />
                        Show cents (e.g., .00)
                      </label>
                    </div>
                  </div>
                </section>

                {/* Preview Placeholder */}
                <div className="mt-8 p-4 border bg-gray-50 rounded text-center">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Sample Preview</p>
                  <div style={{ fontFamily: settings.fontsNumbers.fontFamily, fontSize: settings.fontsNumbers.fontSize }}>
                    <span style={{ color: settings.fontsNumbers.negativeColor === 'red' ? '#e11d48' : 'inherit' }}>
                      {settings.fontsNumbers.negativeFormat === 'parentheses' ? '(1,234.56)' : '-1,234.56'}
                    </span>
                    <span className="mx-2">·</span>
                    <span>1,234{settings.fontsNumbers.showCents ? '.56' : ''}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-200 p-4 border-t border-gray-300 flex justify-end gap-3 select-none">
          <button
            onClick={onClose}
            className="px-8 py-1.5 bg-white border border-gray-400 text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm active:shadow-inner"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-10 py-1.5 bg-[#003366] text-white text-xs font-bold hover:brightness-110 transition-all shadow-md active:scale-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModifyReportDialog;
