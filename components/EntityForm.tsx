
import React, { useState } from 'react';
import { Customer, Vendor, Employee, EntityContact, CustomFieldDefinition, Note, Address, Item } from '../types';
import ContactForm from './ContactForm';
import AddressDialog from './AddressDialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  type: 'CUSTOMER' | 'VENDOR' | 'EMPLOYEE';
  initialData?: any;
  customFields: CustomFieldDefinition[];
  accounts: { id: string, name: string }[];
  customers?: Customer[];
  customerTypes?: string[];
  vendorTypes?: string[];
  items?: Item[];
}

const EntityForm: React.FC<Props> = ({
  isOpen, onClose, onSave, type, initialData, customFields, accounts,
  customers = [], customerTypes = [], vendorTypes = [], items = []
}) => {
  const [activeTab, setActiveTab] = useState(type === 'EMPLOYEE' ? 'Personal' : 'Address Info');
  const [showContactForm, setShowContactForm] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer & Vendor & Employee>>(() => {
    const defaults = {
      name: '',
      companyName: '',
      GivenName: '',
      MiddleName: '',
      FamilyName: '',
      Suffix: '',
      Title: '',
      DisplayName: '',
      PrintOnCheckName: '',
      vendorAccountNo: '',
      TaxIdentifier: '',
      ssn: '',
      isActive: true,
      balance: 0,
      contacts: [],
      taxCode: 'Tax',
      preFillAccounts: [],
      customFieldValues: {},
      notes: [],
      type: 'Regular',
      hiredDate: new Date().toLocaleDateString('en-US'),
      OpenBalanceDate: new Date().toLocaleDateString('en-US'),
      PrimaryPhone: { FreeFormNumber: '' },
      AlternatePhone: { FreeFormNumber: '' },
      Mobile: { FreeFormNumber: '' },
      Fax: { FreeFormNumber: '' },
      PrimaryEmailAddr: { Address: '' },
      WebAddr: { URI: '' },
      BillAddr: { Line1: '', Line2: '', City: '', CountrySubDivisionCode: '', PostalCode: '', Country: '' },
      ShipAddr: { Line1: '', Line2: '', City: '', CountrySubDivisionCode: '', PostalCode: '', Country: '' },
      TermsRef: { value: '', name: '' },
      PreferredPaymentMethodRef: { value: '', name: '' },
      CurrencyRef: { value: 'USD', name: 'United States Dollar' },
      CreditLimit: 0,
      hourlyRate: 0,
      salary: 0,
      federalTax: { filingStatus: 'Single', allowances: 0, extraWithholding: 0 },
      sickLeave: { accrued: 0, used: 0 },
      vacation: { accrued: 0, used: 0 }
    };
    return initialData ? { ...defaults, ...initialData } : (defaults as any);
  });

  const [newNoteText, setNewNoteText] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const note: Note = {
      id: Math.random().toString(),
      text: newNoteText,
      date: new Date().toISOString(),
      author: 'Admin',
      isPinned: false
    };
    setFormData({ ...formData, notes: [...(formData.notes || []), note] });
    setNewNoteText('');
  };

  const getTabs = () => {
    if (type === 'CUSTOMER') return ['Address Info', 'Payment Settings', 'Sales Tax Settings', 'Additional Info', 'Notes'];
    if (type === 'VENDOR') return ['Address Info', 'Payment Settings', 'Tax Settings', 'Account Settings', 'Additional Info', 'Notes'];
    return ['Personal', 'Address & Contact', 'Payroll Info', 'Employment Info', 'Notes'];
  };

  const tabs = getTabs();
  const filteredCustomFields = customFields.filter(f => {
    if (type === 'CUSTOMER') return f.useForCust;
    if (type === 'VENDOR') return f.useForVend;
    return f.useForEmpl;
  });

  return (
    <div className="h-full w-full bg-[#f0f0f0] flex flex-col font-sans overflow-hidden">
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Title Bar - Classic QB 2016 Style */}
        <div className={`p-2 text-white font-bold text-xs flex justify-between items-center select-none ${type === 'EMPLOYEE' ? 'bg-[#336666]' : 'bg-[#003366]'}`}>
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-widest text-[10px]">{initialData ? 'Edit' : 'New'} {type.charAt(0) + type.slice(1).toLowerCase()}</span>
          </div>
          <button onClick={onClose} className="hover:bg-red-600 px-3 font-serif rounded-sm transition-colors text-white">X</button>
        </div>

        {/* Top Header - Key Identifiers */}
        <div className="p-5 bg-gray-50 border-b border-gray-300 grid grid-cols-2 gap-x-12 shadow-inner">
          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-black text-blue-900 uppercase tracking-widest mb-1 italic">
                {type === 'EMPLOYEE' ? 'Legal Name' : (type === 'CUSTOMER' ? 'Customer Name' : 'Vendor Name')}
              </label>
              <input
                className="w-full border-b-2 border-blue-200 p-1.5 text-sm outline-none focus:border-blue-600 font-bold bg-white"
                value={formData.name || ''}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({ ...formData, name: val, DisplayName: val });
                }}
              />
            </div>

            <div className="grid grid-cols-10 gap-1 mt-2">
              <div className="col-span-2">
                <label className="text-[8px] font-bold text-gray-400 uppercase">Title</label>
                <input className="w-full border p-1 text-[10px]" value={formData.Title || ''} onChange={e => setFormData({ ...formData, Title: e.target.value })} />
              </div>
              <div className="col-span-3">
                <label className="text-[8px] font-bold text-gray-400 uppercase">First Name</label>
                <input className="w-full border p-1 text-[10px]" value={formData.GivenName || ''} onChange={e => setFormData({ ...formData, GivenName: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className="text-[8px] font-bold text-gray-400 uppercase">M.I.</label>
                <input className="w-full border p-1 text-[10px] text-center" value={formData.MiddleName || ''} onChange={e => setFormData({ ...formData, MiddleName: e.target.value })} />
              </div>
              <div className="col-span-3">
                <label className="text-[8px] font-bold text-gray-400 uppercase">Last Name</label>
                <input className="w-full border p-1 text-[10px]" value={formData.FamilyName || ''} onChange={e => setFormData({ ...formData, FamilyName: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className="text-[8px] font-bold text-gray-400 uppercase">Suffix</label>
                <input className="w-full border p-1 text-[10px]" value={formData.Suffix || ''} onChange={e => setFormData({ ...formData, Suffix: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {type === 'VENDOR' && (
              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Print on Check as</label>
                <input
                  className="w-full border-b-2 border-gray-200 p-1.5 text-sm outline-none focus:border-blue-500 bg-transparent"
                  value={formData.PrintOnCheckName || formData.name || ''}
                  onChange={e => setFormData({ ...formData, PrintOnCheckName: e.target.value })}
                />
              </div>
            )}
            {type === 'CUSTOMER' && (
              <div className="flex items-center gap-4 mt-2 pl-4 border-l-2 border-blue-400">
                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={!!formData.parentId} onChange={e => setFormData({ ...formData, parentId: e.target.checked ? 'PREVIOUS' : undefined })} />
                  Is Sub-customer / Job of
                </label>
                <select
                  className="border text-[10px] p-1 bg-white outline-none disabled:bg-gray-100 min-w-[200px]"
                  disabled={!formData.parentId}
                  value={formData.parentId === 'PREVIOUS' ? '' : formData.parentId || ''}
                  onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                >
                  <option value="">&lt;Select Parent Customer&gt;</option>
                  {customers.filter(c => c.id !== formData.id).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-between items-end mt-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-red-600 uppercase tracking-[0.2em] mb-1">Current Balance</span>
                <span className="text-2xl font-black text-blue-900 font-mono tracking-tighter">${(formData.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-bold text-gray-400 uppercase">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${formData.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Navigation Sidebar */}
          <div className="w-48 bg-gray-100 border-r border-gray-300 flex flex-col py-3 shadow-inner">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-left px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white border-y border-gray-300 text-blue-900 shadow-sm relative z-10' : 'hover:bg-gray-200 text-gray-400'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8 overflow-y-auto bg-white custom-scrollbar">
            {activeTab === 'Personal' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase italic">Job Title</label>
                    <input className="border-b-2 border-gray-100 p-1 text-xs outline-none focus:border-blue-400" value={formData.Title || ''} onChange={e => setFormData({ ...formData, Title: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase italic">Social Security No.</label>
                    <input className="border-b-2 border-gray-100 p-1 text-xs outline-none w-48 font-mono focus:border-blue-400" placeholder="000-00-0000" value={formData.ssn || ''} onChange={e => setFormData({ ...formData, ssn: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'Address Info' || activeTab === 'Address & Contact') && (
              <div className="space-y-8">
                <div className="flex items-center gap-6">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Company Name</label>
                  <input
                    className="flex-1 border-b-2 border-gray-100 p-1.5 text-xs outline-none focus:border-blue-500 font-bold"
                    value={formData.companyName || ''}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest italic flex items-center justify-between">
                        <span>Address</span>
                        <button
                          onClick={() => setShowAddressDialog(true)}
                          className="text-[8px] bg-gray-100 px-2 py-0.5 border rounded shadow-sm hover:bg-white text-gray-600 transition-colors uppercase"
                        >
                          Edit Details
                        </button>
                      </label>
                      <textarea
                        className="w-full border border-gray-200 p-3 text-xs h-32 outline-none focus:ring-2 ring-blue-50/50 rounded-sm bg-[#fafbfc] italic text-gray-600"
                        value={`${formData.BillAddr?.Line1 || ''}${formData.BillAddr?.Line2 ? '\n' + formData.BillAddr.Line2 : ''}\n${formData.BillAddr?.City || ''}${formData.BillAddr?.City && formData.BillAddr?.CountrySubDivisionCode ? ', ' : ''}${formData.BillAddr?.CountrySubDivisionCode || ''} ${formData.BillAddr?.PostalCode || ''}`.trim()}
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic block">Contact</label>
                      <input className="w-full border-b border-gray-200 p-1 text-xs outline-none focus:border-blue-400" placeholder="Primary Contact Person" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { field: 'PrimaryPhone', label: 'Main Phone' },
                      { field: 'AlternatePhone', label: 'Alt. Phone' },
                      { field: 'Fax', label: 'Fax' },
                      { field: 'AlternateContact', label: 'Alt. Contact' },
                      { field: 'PrimaryEmailAddr', label: 'E-mail' },
                      { field: 'WebAddr', label: 'Web Address' }
                    ].map(f => (
                      <div key={f.label} className="grid grid-cols-3 items-center gap-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter text-right">{f.label}</label>
                        <input
                          className="col-span-2 border-b border-gray-100 p-1 text-xs outline-none focus:border-blue-400 bg-[#f8fbff]/50"
                          value={f.field === 'PrimaryEmailAddr' ? formData.PrimaryEmailAddr?.Address : (f.field === 'WebAddr' ? formData.WebAddr?.URI : (formData as any)[f.field]?.FreeFormNumber || '')}
                          onChange={e => {
                            const val = e.target.value;
                            if (f.field === 'PrimaryEmailAddr') setFormData({ ...formData, PrimaryEmailAddr: { Address: val } });
                            else if (f.field === 'WebAddr') setFormData({ ...formData, WebAddr: { URI: val } });
                            else setFormData({ ...formData, [f.field]: { FreeFormNumber: val } });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Payment Settings' && (
              <div className="space-y-8 max-w-md">
                <div className="grid grid-cols-2 items-center gap-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account No.</label>
                  <input className="border-b-2 border-gray-100 p-1 text-xs outline-none focus:border-blue-400 font-mono" value={formData.vendorAccountNo || ''} onChange={e => setFormData({ ...formData, vendorAccountNo: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Terms</label>
                  <select
                    className="border-b-2 border-blue-100 p-1 text-xs font-bold bg-blue-50/10 outline-none"
                    value={formData.TermsRef?.value || ''}
                    onChange={e => setFormData({ ...formData, TermsRef: { value: e.target.value, name: e.target.options[e.target.selectedIndex].text } })}
                  >
                    <option value="">&lt;Choose Term&gt;</option>
                    <option value="1">Net 15</option>
                    <option value="2">Net 30</option>
                    <option value="3">Net 60</option>
                    <option value="4">Due on Receipt</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Credit Limit</label>
                  <div className="flex items-center border-b-2 border-gray-100">
                    <span className="text-xs text-gray-400 mr-1">$</span>
                    <input type="number" className="p-1 text-xs flex-1 outline-none font-bold" value={formData.CreditLimit || ''} onChange={e => setFormData({ ...formData, CreditLimit: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preferred Method</label>
                  <select
                    className="border-b-2 border-blue-100 p-1 text-xs font-bold bg-blue-50/10 outline-none"
                    value={formData.PreferredPaymentMethodRef?.value || ''}
                    onChange={e => setFormData({ ...formData, PreferredPaymentMethodRef: { value: e.target.value, name: e.target.options[e.target.selectedIndex].text } })}
                  >
                    <option value="">Select Method</option>
                    <option>Check</option>
                    <option>Cash</option>
                    <option>Credit Card</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'Tax Settings' && (
              <div className="space-y-8">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vendor Tax ID</label>
                  <input className="border-b-2 border-gray-100 p-2 text-sm outline-none w-64 bg-[#f8fbff] font-mono" placeholder="XX-XXXXXXX" value={formData.TaxIdentifier || ''} onChange={e => setFormData({ ...formData, TaxIdentifier: e.target.value })} />
                </div>
                <div className="space-y-3 bg-gray-50 p-6 rounded border border-gray-200 shadow-inner">
                  <p className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] mb-4">Regulatory / 1099 Settings</p>
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded cursor-pointer" checked={formData.Vendor1099 || false} onChange={e => setFormData({ ...formData, Vendor1099: e.target.checked, eligibleFor1099: e.target.checked })} />
                    <span className="text-xs font-bold text-gray-700">Vendor eligible for 1099</span>
                  </label>
                  <p className="text-[10px] text-gray-400 italic ml-9">Checking this box will track payments to this vendor for 1099-MISC reporting.</p>
                </div>
              </div>
            )}

            {activeTab === 'Payroll Info' && type === 'EMPLOYEE' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-green-50 p-4 border border-green-200 rounded">
                    <h4 className="font-black text-green-900 uppercase tracking-widest text-[10px] mb-4">Earnings</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-600">Pay Period</label>
                        <select
                          className="border p-1 text-xs outline-none bg-white w-32"
                          value={formData.payPeriod || 'Weekly'}
                          onChange={e => setFormData({ ...formData, payPeriod: e.target.value as any })}
                        >
                          <option>Weekly</option>
                          <option>Bi-Weekly</option>
                          <option>Semi-Monthly</option>
                          <option>Monthly</option>
                        </select>
                      </div>
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-600">Hourly Rate</label>
                        <div className="flex items-center w-32 border bg-white px-2">
                          <span className="text-xs mr-1">$</span>
                          <input
                            type="number"
                            className="w-full text-xs p-1 outline-none font-bold"
                            value={formData.hourlyRate || 0}
                            onChange={e => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-600">Annual Salary</label>
                        <div className="flex items-center w-32 border bg-white px-2">
                          <span className="text-xs mr-1">$</span>
                          <input
                            type="number"
                            className="w-full text-xs p-1 outline-none font-bold"
                            value={formData.salary || 0}
                            onChange={e => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 border border-red-200 rounded">
                    <h4 className="font-black text-red-900 uppercase tracking-widest text-[10px] mb-4">Taxes (Federal)</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-600">Filing Status</label>
                        <select
                          className="border p-1 text-xs outline-none bg-white w-32"
                          value={formData.federalTax?.filingStatus || 'Single'}
                          onChange={e => setFormData({ ...formData, federalTax: { ...formData.federalTax, filingStatus: e.target.value as any } })}
                        >
                          <option>Single</option>
                          <option>Married</option>
                          <option>Head of Household</option>
                        </select>
                      </div>
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-600">Allowances</label>
                        <input
                          type="number"
                          className="border p-1 text-xs outline-none bg-white w-32"
                          value={formData.federalTax?.allowances || 0}
                          onChange={e => setFormData({ ...formData, federalTax: { ...formData.federalTax, allowances: parseInt(e.target.value) || 0 } })}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-600">Extra Withholding</label>
                        <div className="flex items-center w-32 border bg-white px-2">
                          <span className="text-xs mr-1">$</span>
                          <input
                            type="number"
                            className="w-full text-xs p-1 outline-none font-bold"
                            value={formData.federalTax?.extraWithholding || 0}
                            onChange={e => setFormData({ ...formData, federalTax: { ...formData.federalTax, extraWithholding: parseFloat(e.target.value) || 0 } })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-4 border-t">
                  <div className="space-y-4">
                    <h4 className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Sick & Vacation</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 mb-1">Sick Hours</p>
                        <label className="text-[9px] block">Availability</label>
                        <input
                          type="number"
                          className="border p-1 text-xs w-full"
                          value={formData.sickLeave?.accrued || 0}
                          onChange={e => setFormData({ ...formData, sickLeave: { ...formData.sickLeave, accrued: parseFloat(e.target.value) || 0 } })}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 mb-1">Vacation Hours</p>
                        <label className="text-[9px] block">Availability</label>
                        <input
                          type="number"
                          className="border p-1 text-xs w-full"
                          value={formData.vacation?.accrued || 0}
                          onChange={e => setFormData({ ...formData, vacation: { ...formData.vacation, accrued: parseFloat(e.target.value) || 0 } })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Account Settings' && type === 'VENDOR' && (
              <div className="space-y-8">
                <div className="border-l-4 border-blue-600 pl-4">
                  <h4 className="text-sm font-black text-blue-900 uppercase tracking-tighter">Pre-fill Accounts</h4>
                  <p className="text-[10px] text-gray-400 italic">Automatically assign these accounts when entering bills for this vendor.</p>
                </div>
                <div className="space-y-4 max-w-lg">
                  {[1, 2, 3].map(idx => (
                    <div key={idx} className="flex items-center gap-6">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-40 text-right">Account {idx}</label>
                      <select
                        className="flex-1 border-b-2 border-blue-100 p-1.5 text-xs font-bold bg-blue-50/10 outline-none focus:border-blue-500"
                        value={formData.preFillAccounts?.[idx - 1] || ''}
                        onChange={(e) => {
                          const newAccounts = [...(formData.preFillAccounts || [])];
                          newAccounts[idx - 1] = e.target.value;
                          setFormData({ ...formData, preFillAccounts: newAccounts });
                        }}
                      >
                        <option value="">--Select Account--</option>
                        {accounts.filter(a => a.type === 'Expense' || a.type === 'Cost of Goods Sold').map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Sales Tax Settings' && type === 'CUSTOMER' && (
              <div className="space-y-8">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tax Code</label>
                  <select
                    className="border-b-2 border-gray-100 p-2 text-sm outline-none w-64 bg-white"
                    value={formData.taxCode || 'Tax'}
                    onChange={e => setFormData({ ...formData, taxCode: e.target.value as any })}
                  >
                    <option value="Tax">Tax</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tax Item</label>
                  <select
                    className="border-b-2 border-gray-100 p-2 text-sm outline-none w-64 bg-white"
                    value={formData.taxItemId || ''}
                    onChange={e => setFormData({ ...formData, taxItemId: e.target.value })}
                  >
                    <option value="">&lt;No Tax Item&gt;</option>
                    {items.filter(i => i.type === 'Sales Tax Item' || i.type === 'Sales Tax Group').map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.taxRateValue || i.taxRate || 0}%)</option>
                    ))}
                  </select>
                  <p className="text-[9px] text-gray-400 italic">Select the default sales tax to apply to this customer.</p>
                </div>
              </div>
            )}

            {activeTab === 'Additional Info' && (
              <div className="space-y-10">
                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-6">
                    {type === 'CUSTOMER' && formData.parentId && (
                      <div className="bg-blue-50 p-4 rounded border border-blue-200 space-y-4">
                        <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Job Information (Ch. 4)</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-500 uppercase italic">Job Status</label>
                            <select
                              className="border p-1 text-xs outline-none bg-white"
                              value={(formData as any).status || 'Pending'}
                              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            >
                              <option>Pending</option>
                              <option>Awarded</option>
                              <option>In progress</option>
                              <option>Closed</option>
                              <option>Not awarded</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-500 uppercase italic">Start Date</label>
                            <input type="date" className="border p-1 text-xs" value={(formData as any).startDate || ''} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-500 uppercase italic">Proj. End Date</label>
                            <input type="date" className="border p-1 text-xs" value={(formData as any).projectedEndDate || ''} onChange={e => setFormData({ ...formData, projectedEndDate: e.target.value })} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-500 uppercase italic">Act. End Date</label>
                            <input type="date" className="border p-1 text-xs" value={(formData as any).actualEndDate || ''} onChange={e => setFormData({ ...formData, actualEndDate: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                        {type === 'CUSTOMER' ? 'Customer Type' : 'Vendor Type'}
                      </label>
                      <select
                        className="border-b-2 border-blue-100 p-2 text-xs font-bold bg-blue-50/10 outline-none"
                        value={(type === 'CUSTOMER' ? (formData as any).customerType : formData.vendorType) || ''}
                        onChange={e => setFormData({
                          ...formData,
                          [type === 'CUSTOMER' ? 'customerType' : 'vendorType']: e.target.value
                        })}
                      >
                        <option value="">&lt;None&gt;</option>
                        {(type === 'CUSTOMER' ? customerTypes : vendorTypes).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-red-700 uppercase tracking-widest italic">Opening Balance</label>
                      <div className="flex items-center border-b-2 border-red-50 px-2">
                        <span className="text-sm text-gray-400 mr-2 font-mono">$</span>
                        <input type="number" className="flex-1 p-2 text-lg font-black text-blue-900 outline-none bg-transparent" value={formData.OpenBalance || ''} onChange={e => setFormData({ ...formData, OpenBalance: parseFloat(e.target.value) || 0, balance: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">As of Date</label>
                      <input type="date" className="border-b-2 border-gray-100 p-2 text-xs outline-none bg-gray-50/30" value={formData.OpenBalanceDate || ''} onChange={e => setFormData({ ...formData, OpenBalanceDate: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-yellow-50/50 p-6 border-2 border-dashed border-yellow-200 rounded text-center">
                      <p className="text-[10px] font-black text-yellow-800 uppercase tracking-widest mb-4">Entity Customization</p>
                      <button onClick={() => setShowContactForm(true)} className="w-full bg-white border border-gray-400 py-3 text-[10px] font-black uppercase tracking-widest rounded shadow-sm hover:shadow-md transition-all">🏠 Define Custom Fields</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Notes' && (
              <div className="flex flex-col h-full space-y-6">
                <div className="flex-1 overflow-auto space-y-4 pr-4 custom-scrollbar">
                  {(formData.notes || []).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 italic">
                      <span className="text-4xl mb-4">📓</span>
                      No notes recorded for this vendor.
                    </div>
                  ) : (
                    formData.notes?.map(note => (
                      <div key={note.id} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 shadow-sm rounded-sm animate-in fade-in slide-in-from-left-2 transition-all">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-black text-yellow-800 uppercase tracking-widest">{new Date(note.date).toLocaleString()}</span>
                          <span className="text-[8px] font-bold text-gray-400">By {note.author}</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed font-serif italic">{note.text}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="bg-white border-2 border-gray-200 p-4 rounded-sm shadow-inner flex flex-col gap-3">
                  <textarea
                    className="w-full h-24 p-2 text-xs outline-none bg-transparent resize-none italic"
                    placeholder="Add a new note with timestamp..."
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                  />
                  <button
                    onClick={handleAddNote}
                    className="self-end bg-blue-600 text-white px-8 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm shadow-md hover:bg-blue-700 transition-all active:translate-y-px"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f0f3f6] p-5 border-t border-gray-400 flex justify-between items-center shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          <label className="flex items-center gap-3 text-[10px] font-black uppercase text-gray-500 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4" checked={!formData.isActive} onChange={e => setFormData({ ...formData, isActive: !e.target.checked, Active: !e.target.checked })} />
            <span>{type.charAt(0) + type.slice(1).toLowerCase()} is inactive</span>
          </label>
          <div className="flex gap-4">
            <button onClick={handleSave} className="px-12 py-2.5 bg-[#0077c5] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded shadow-lg hover:brightness-110 active:translate-y-px transition-all">OK</button>
            <button onClick={onClose} className="px-12 py-2.5 bg-white border border-gray-400 text-[#003366] text-[10px] font-black uppercase tracking-[0.2em] rounded shadow-md hover:bg-gray-50 active:translate-y-px transition-all">Cancel</button>
          </div>
        </div>
      </div>

      <ContactForm
        isOpen={showContactForm}
        onClose={() => setShowContactForm(false)}
        contacts={formData.contacts || []}
        onSave={(contacts) => setFormData({ ...formData, contacts })}
      />

      <AddressDialog
        isOpen={showAddressDialog}
        onClose={() => setShowAddressDialog(false)}
        title="Edit Address Information"
        initialAddress={formData.BillAddr || {}}
        onSave={(address) => setFormData({ ...formData, BillAddr: address, address: `${address.Line1 || ''} ${address.City || ''} ${address.CountrySubDivisionCode || ''} ${address.PostalCode || ''}`.trim() })}
      />
    </div>
  );
};

export default EntityForm;
