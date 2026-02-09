
import React, { useState } from 'react';
import { CompanyConfig } from '../types';

interface Props {
  config: CompanyConfig;
  onUpdate: (config: CompanyConfig) => void;
}

const MyCompany: React.FC<Props> = ({ config, onUpdate }) => {
  const safeConfig = config || { businessName: 'My Company', industry: 'General', businessType: 'Sole Proprietorship' };
  const [editing, setEditing] = useState(false);
  const [tempConfig, setTempConfig] = useState(safeConfig);

  const handleSave = () => {
    onUpdate(tempConfig);
    setEditing(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f4f4] select-none">
      <div className="bg-[#003366] text-white p-4 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-xl font-bold">{safeConfig.businessName}</h1>
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">Company Information</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="bg-white/20 hover:bg-white/30 px-4 py-1 rounded border border-white/40 text-xs font-bold transition-all">
            Edit Profile ✏️
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 px-4 py-1 rounded text-xs font-bold transition-all">Save Changes</button>
            <button onClick={() => setEditing(false)} className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded text-xs font-bold transition-all">Cancel</button>
          </div>
        )}
      </div>

      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto grid grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-blue-900 border-b-2 border-blue-100 pb-1 uppercase tracking-tight">Contact Information</h2>
            <div className="space-y-4">
              <DetailField label="Company Name" value={safeConfig.businessName} editing={editing} onChange={v => setTempConfig({ ...tempConfig, businessName: v })} />
              <DetailField label="Legal Name" value={safeConfig.legalName || safeConfig.businessName} editing={editing} onChange={v => setTempConfig({ ...tempConfig, legalName: v })} />
              <DetailField label="Address" value={safeConfig.address} editing={editing} multiline onChange={v => setTempConfig({ ...tempConfig, address: v })} />
              <div className="grid grid-cols-2 gap-4">
                <DetailField label="City" value={safeConfig.city} editing={editing} onChange={v => setTempConfig({ ...tempConfig, city: v })} />
                <DetailField label="State" value={safeConfig.state} editing={editing} onChange={v => setTempConfig({ ...tempConfig, state: v })} />
              </div>
              <DetailField label="Phone" value={safeConfig.phone} editing={editing} onChange={v => setTempConfig({ ...tempConfig, phone: v })} />
              <DetailField label="Email" value={safeConfig.email} editing={editing} onChange={v => setTempConfig({ ...tempConfig, email: v })} />
              <DetailField label="Website" value={safeConfig.website} editing={editing} onChange={v => setTempConfig({ ...tempConfig, website: v })} />
            </div>
          </div>

          {/* Legal & Fiscal Info */}
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-blue-900 border-b-2 border-blue-100 pb-1 uppercase tracking-tight">Legal & Fiscal Information</h2>
            <div className="space-y-4">
              <DetailField label="Federal Tax ID" value={safeConfig.ein} editing={editing} onChange={v => setTempConfig({ ...tempConfig, ein: v })} />
              <DetailField label="Industry" value={safeConfig.industry} editing={editing} onChange={v => setTempConfig({ ...tempConfig, industry: v })} />
              <DetailField label="Business Type" value={safeConfig.businessType} editing={editing} select={['Sole Proprietorship', 'Partnership', 'LLC', 'Corporation', 'Non-profit']} onChange={v => setTempConfig({ ...tempConfig, businessType: v })} />
              <DetailField label="First Month of Fiscal Year" value={safeConfig.fiscalYearStart} editing={editing} select={['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']} onChange={v => setTempConfig({ ...tempConfig, fiscalYearStart: v })} />
            </div>

            <div className="bg-blue-50 p-4 border border-blue-100 rounded mt-8">
              <h3 className="text-xs font-bold text-blue-800 mb-2 italic">qbXpress Subscription</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailField = ({ label, value, editing, multiline, select, onChange }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{label}</label>
    {!editing ? (
      <div className={`text-sm text-gray-800 ${multiline ? 'whitespace-pre-wrap' : ''} font-semibold`}>
        {value || <span className="text-gray-300 italic">Not set</span>}
      </div>
    ) : select ? (
      <select className="border p-2 text-sm bg-white outline-none focus:ring-1 ring-blue-500" value={value} onChange={e => onChange(e.target.value)}>
        {select.map((s: string) => <option key={s} value={s}>{s}</option>)}
      </select>
    ) : multiline ? (
      <textarea className="border p-2 text-sm bg-white outline-none focus:ring-1 ring-blue-500 h-24" value={value} onChange={e => onChange(e.target.value)} />
    ) : (
      <input className="border p-2 text-sm bg-white outline-none focus:ring-1 ring-blue-500" value={value} onChange={e => onChange(e.target.value)} />
    )}
  </div>
);

export default MyCompany;
