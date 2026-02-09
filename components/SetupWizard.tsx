
import React, { useState } from 'react';
import { CompanyConfig } from '../types';

interface Props {
  onComplete: (config: CompanyConfig) => void;
  onCancel: () => void;
  isAdvanced: boolean;
}

const INDUSTRIES = [
  "Accounting/Bookkeeping", "Artistic Services", "Construction/Contractors",
  "Consulting", "Design", "Financial Services", "General Business",
  "Information Technology", "Legal Services", "Medical/Healthcare",
  "Non-Profit", "Other/None", "Product Sales", "Real Estate",
  "Retail", "Wholesale"
];

const FISCAL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const SetupWizard: React.FC<Props> = ({ onComplete, onCancel, isAdvanced }) => {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<CompanyConfig>({
    businessName: '',
    industry: 'Consulting',
    businessType: 'Sole Proprietorship',
    ein: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    phone: '',
    fiscalYearStart: 'January',
    whatDoYouSell: 'Both',
    chargeSalesTax: false,
    createEstimates: false,
    useStatements: true,
    useProgressInvoicing: false,
    manageBills: true,
    trackInventory: false,
    trackTime: false,
    haveEmployees: false,
    startDateOption: 'Beginning of fiscal year'
  });

  const updateField = (field: keyof CompanyConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const steps = [
    {
      title: "Glad you're here!",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed font-sans">QuickBooks is going to help you get your business finances in order. We'll start by asking a few questions.</p>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest italic mb-1">* Your Business Name</label>
              <input
                type="text"
                className="w-full border-b-2 border-blue-200 p-2 text-lg focus:border-blue-500 outline-none bg-blue-50/20 font-serif italic"
                value={config.businessName}
                onChange={e => updateField('businessName', e.target.value)}
                placeholder="e.g. Rock Castle Construction"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest italic mb-1">Your Legal Name</label>
              <input type="text" className="w-full border-b-2 border-gray-200 p-2 text-sm outline-none focus:border-blue-400" placeholder="If different from business name" />
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Select your industry",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Selecting your industry helps QuickBooks set up the right accounts for you.</p>
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto border p-2 bg-white rounded shadow-inner">
            {INDUSTRIES.map(ind => (
              <button
                key={ind}
                onClick={() => updateField('industry', ind)}
                className={`text-left px-3 py-1.5 text-xs rounded transition-all ${config.industry === ind ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-50 text-gray-700'}`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "How is your business organized?",
      content: (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">QuickBooks uses this to help with your tax returns.</p>
          <div className="space-y-3">
            {['Sole Proprietorship', 'Partnership', 'LLC', 'Corporation', 'S Corporation', 'Non-profit'].map(type => (
              <label key={type} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${config.businessType === type ? 'bg-blue-600 border-blue-700' : 'bg-white border-gray-300'}`}>
                  {config.businessType === type && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <input type="radio" className="hidden" checked={config.businessType === type} onChange={() => updateField('businessType', type)} />
                <span className={`text-sm ${config.businessType === type ? 'font-bold text-blue-900' : 'text-gray-600'}`}>{type}</span>
              </label>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Select the first month of your fiscal year",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Many businesses start their fiscal year in January, but yours might start at another time.</p>
          <select
            className="w-full border-2 border-blue-100 p-3 rounded text-sm font-bold bg-blue-50/20 outline-none focus:border-blue-500"
            value={config.fiscalYearStart}
            onChange={e => updateField('fiscalYearStart', e.target.value)}
          >
            {FISCAL_MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      )
    },
    {
      title: "Contact Information",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase italic">Street Address</label>
              <input type="text" className="w-full border p-2 text-sm" value={config.address} onChange={e => updateField('address', e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase italic">City</label>
              <input type="text" className="w-full border p-2 text-sm" value={config.city} onChange={e => updateField('city', e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase italic">State</label>
              <input type="text" className="w-full border p-2 text-sm" value={config.state} onChange={e => updateField('state', e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase italic">Tax ID (EIN/SSN)</label>
              <input type="text" className="w-full border p-2 text-sm" value={config.ein} onChange={e => updateField('ein', e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase italic">Phone</label>
              <input type="text" className="w-full border p-2 text-sm" value={config.phone} onChange={e => updateField('phone', e.target.value)} />
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Administrator Password",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Setting a password protects your financial data. If you lose this password, you cannot recover it!</p>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase italic tracking-widest">Admin Password</label>
              <input
                type="password"
                className="w-full border-b-2 border-blue-100 p-2 text-sm bg-blue-50/10 focus:border-blue-400 outline-none"
                onChange={e => updateField('adminPassword', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase italic tracking-widest">Retype Password</label>
              <input type="password" className="w-full border-b-2 border-blue-100 p-2 text-sm bg-blue-50/10 focus:border-blue-400 outline-none" />
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Customizing for your business",
      content: (
        <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
          <div className="border-b pb-4">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest italic mb-2">What do you sell?</label>
            <div className="flex gap-8 text-sm">
              {['Services', 'Products', 'Both'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={config.whatDoYouSell === opt} onChange={() => updateField('whatDoYouSell', opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          {[
            { field: 'chargeSalesTax', label: 'Do you charge sales tax?' },
            { field: 'createEstimates', label: 'Do you want to create estimates?' },
            { field: 'useProgressInvoicing', label: 'Using progress invoicing?' },
            { field: 'manageBills', label: 'Want to keep track of bills you owe?' },
            { field: 'trackInventory', label: 'Will you track inventory in QuickBooks?' },
            { field: 'trackTime', label: 'Do you track time?' },
            { field: 'haveEmployees', label: 'Do you have employees?' }
          ].map(q => (
            <div key={q.field} className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs font-semibold text-gray-700">{q.label}</span>
              <div className="flex gap-2">
                <button onClick={() => updateField(q.field as any, true)} className={`px-4 py-1 rounded text-[10px] uppercase font-black transition-all ${config[q.field as keyof CompanyConfig] ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>Yes</button>
                <button onClick={() => updateField(q.field as any, false)} className={`px-4 py-1 rounded text-[10px] uppercase font-black transition-all ${!config[q.field as keyof CompanyConfig] ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>No</button>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Choose a start date",
      content: (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">Select the date you want to start tracking your finances.</p>
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 border rounded hover:bg-blue-50 cursor-pointer transition-colors">
              <input type="radio" className="mt-1" checked={config.startDateOption === 'Beginning of fiscal year'} onChange={() => updateField('startDateOption', 'Beginning of fiscal year')} />
              <div>
                <p className="text-sm font-bold text-blue-900">Use today's date</p>
                <p className="text-[10px] text-gray-500 italic">Select this if you want to start tracking from today onwards.</p>
              </div>
            </label>
            <div className={`p-4 border rounded transition-all ${config.startDateOption === 'Custom' ? 'bg-blue-50 border-blue-400' : 'hover:bg-blue-50'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" className="mt-1" checked={config.startDateOption === 'Custom'} onChange={() => updateField('startDateOption', 'Custom')} />
                <div>
                  <p className="text-sm font-bold text-blue-900">Use a custom date (Enter history)</p>
                  <p className="text-[10px] text-gray-500 italic">Select this if you want to enter previous transactions to maintain history.</p>
                </div>
              </label>
              {config.startDateOption === 'Custom' && (
                <div className="mt-4 pl-8 animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black text-blue-900 uppercase tracking-widest italic mb-1">Start Date</label>
                  <input
                    type="date"
                    className="border-2 border-blue-200 p-2 rounded text-sm bg-white outline-none focus:border-blue-600 font-bold"
                    value={config.customStartDate || ''}
                    onChange={e => updateField('customStartDate', e.target.value)}
                  />
                  <p className="text-[9px] text-blue-500 mt-1 italic">QuickBooks will use this date to create your opening balances.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Congratulations!",
      content: (
        <div className="text-center space-y-8 animate-in fade-in duration-700">
          <div className="bg-[#003366] text-white p-6 rounded-sm font-serif italic text-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer scale-150"></div>
            You're all set!
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">QuickBooks has all the information it needs to build your company file. Click **Finish** to start your accounting journey.</p>
          <div className="bg-white p-6 border-2 border-dashed border-blue-200 text-left text-xs space-y-3 rounded shadow-inner">
            <p className="flex justify-between border-b pb-1"><strong>Company:</strong> <span className="text-blue-800 font-bold uppercase">{config.businessName}</span></p>
            <p className="flex justify-between border-b pb-1"><strong>Industry:</strong> <span className="text-blue-800 font-bold">{config.industry}</span></p>
            <p className="flex justify-between"><strong>Fiscal Year:</strong> <span className="text-blue-800 font-bold">Starts in {config.fiscalYearStart}</span></p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    setStep(s => s + 1);
  };

  return (
    <div className="h-full w-full bg-[#f0f3f6] flex flex-col font-sans overflow-hidden">
      <div className="flex-1 flex flex-col bg-white overflow-hidden shadow-2xl border border-gray-600">
        <div className="bg-[#0077c5] p-3 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xs">📘</span>
            <span className="font-bold text-sm uppercase tracking-tighter">QuickBooks Setup - EasyStep Interview</span>
          </div>
          <button onClick={onCancel} className="text-white hover:bg-red-600 px-3 rounded-sm transition-colors font-serif">X</button>
        </div>

        <div className="flex flex-1 min-h-[500px]">
          {/* Progress Sidebar */}
          <div className="w-56 bg-[#f0f3f6] border-r border-gray-300 p-6 flex flex-col shadow-inner">
            <div className="text-[#003366] font-black text-[10px] uppercase mb-6 tracking-widest border-b border-blue-200 pb-2 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] italic">i</span>
              Progress
            </div>
            <div className="space-y-5 flex-1">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${i <= step ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-300'} flex items-center justify-center text-[10px] font-black`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-[10px] leading-tight transition-colors ${i === step ? 'font-black text-blue-900 underline underline-offset-4' : 'text-gray-400 font-medium'}`}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden shadow-inner">
                <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${(step / (steps.length - 1)) * 100}%` }}></div>
              </div>
              <div className="text-[9px] text-gray-400 mt-2 font-bold text-center uppercase">{Math.round((step / (steps.length - 1)) * 100)}% Complete</div>
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 p-12 flex flex-col relative">
            <h2 className="text-3xl font-serif italic text-[#003366] border-b-2 border-blue-50 pb-4 mb-8 drop-shadow-sm">{steps[step].title}</h2>
            <div className="flex-1">
              {steps[step].content}
            </div>

            <div className="mt-12 flex justify-end gap-3 border-t border-gray-100 pt-6">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="px-8 py-2 border border-gray-300 bg-gray-50 rounded shadow-sm text-xs font-black uppercase tracking-tighter hover:bg-white active:translate-y-px transition-all"
                >
                  Back
                </button>
              )}
              {step < steps.length - 1 ? (
                <button
                  disabled={step === 0 && !config.businessName}
                  onClick={handleNext}
                  className="px-10 py-2 bg-[#0077c5] text-white rounded shadow-lg text-xs font-black uppercase tracking-widest hover:bg-[#005fa0] disabled:bg-gray-300 active:translate-y-px transition-all"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => onComplete(config)}
                  className="px-10 py-2 bg-green-600 text-white rounded shadow-lg text-xs font-black uppercase tracking-widest hover:bg-green-700 active:translate-y-px transition-all"
                >
                  Finish
                </button>
              )}
              <button onClick={onCancel} className="px-8 py-2 border border-blue-900 text-blue-900 rounded text-xs font-black uppercase tracking-tighter ml-6 hover:bg-blue-50 transition-all">Leave</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
