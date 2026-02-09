
import React, { useState } from 'react';
import { Lead } from '../types';

interface Props {
  leads: Lead[];
  onUpdateLeads: (leads: Lead[]) => void;
  onConvertToCustomer: (lead: Lead) => void;
}

const LeadCenter: React.FC<Props> = ({ leads, onUpdateLeads, onConvertToCustomer }) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id);
  const [filter, setFilter] = useState('Active Leads');

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot': return 'text-red-600 bg-red-50 border-red-200';
      case 'Warm': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Cold': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="flex h-full bg-white overflow-hidden select-none">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-400 flex flex-col bg-white shadow-lg z-10">
        <div className="p-2 bg-[#e8e8e8] border-b border-gray-300 font-bold text-[11px] text-gray-700 uppercase">Leads</div>
        <div className="p-2 bg-gray-50 border-b border-gray-300 space-y-2 shadow-inner">
          <button className="w-full bg-white border border-gray-400 rounded px-2 py-1 text-[11px] font-bold hover:bg-gray-100 flex items-center justify-center gap-2 shadow-sm">
            <span className="text-red-600 text-sm">✚</span> New Lead
          </button>
          <select 
            className="w-full border border-gray-300 rounded px-1 py-1 text-[11px] outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>Active Leads</option>
            <option>All Leads</option>
            <option>Hot Leads</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {leads.map(lead => (
            <div 
              key={lead.id}
              onClick={() => setSelectedLeadId(lead.id)}
              className={`p-3 border-b cursor-default flex justify-between items-center transition-colors ${selectedLeadId === lead.id ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'}`}
            >
              <div className="flex-1 truncate">
                <div className="text-[11px] font-bold">{lead.name}</div>
                <div className={`text-[9px] uppercase font-bold mt-0.5 ${selectedLeadId === lead.id ? 'text-blue-200' : 'text-gray-400'}`}>{lead.companyName}</div>
              </div>
              <div className={`text-[10px] px-2 py-0.5 rounded border ${selectedLeadId === lead.id ? 'bg-white/10 border-white/20 text-white' : getStatusColor(lead.status)}`}>
                {lead.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f4f4f4]">
        {selectedLead ? (
          <div className="flex-1 flex flex-col">
            <div className="p-6 bg-white border-b border-gray-300 flex justify-between items-start shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-2xl font-bold border border-red-200">
                    L
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedLead.name}</h2>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-tighter italic">{selectedLead.companyName}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button className="bg-gray-100 hover:bg-white border border-gray-400 px-4 py-1 rounded text-xs font-bold shadow-sm transition-all">Edit Lead</button>
                  <button 
                    onClick={() => onConvertToCustomer(selectedLead)}
                    className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white border border-green-700 px-4 py-1 rounded text-xs font-bold shadow-sm active:scale-95 transition-all"
                  >
                    Convert to Customer
                  </button>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lead Status</div>
                <div className="text-xl font-bold text-red-600">{selectedLead.status}</div>
              </div>
            </div>

            <div className="flex-1 p-6 grid grid-cols-2 gap-6">
              <div className="bg-white border border-gray-300 rounded shadow-sm flex flex-col overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 text-[11px] font-bold text-gray-600 uppercase">Contact Information</div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-xs font-bold text-gray-400">Phone</span>
                    <span className="text-xs font-bold text-gray-800">{selectedLead.phone}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-xs font-bold text-gray-400">Email</span>
                    <span className="text-xs font-bold text-blue-600 underline">{selectedLead.email}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Address</span>
                    <div className="text-xs text-gray-700 bg-gray-50 p-2 border rounded italic">{selectedLead.address}</div>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-300 rounded shadow-sm flex flex-col overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 text-[11px] font-bold text-gray-600 uppercase">Lead Notes</div>
                <textarea 
                  className="flex-1 p-4 text-xs italic bg-yellow-50/30 resize-none outline-none"
                  defaultValue={selectedLead.notes}
                  placeholder="Click to add lead notes..."
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 font-bold italic">
            Select a lead to view details.
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadCenter;
