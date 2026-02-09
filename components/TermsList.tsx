import React, { useState } from 'react';
import { Term } from '../types';

interface Props {
  terms: Term[];
  onUpdate: (terms: Term[]) => void;
}

const TermDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (term: Partial<Term>) => void;
  initialData?: Term;
}> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [dueDays, setDueDays] = useState(initialData?.stdDueDays?.toString() || '30');
  const [discount, setDiscount] = useState(initialData?.discountPercentage?.toString() || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#f0f0f0] border-2 border-[#003366] shadow-2xl w-[450px] rounded-sm flex flex-col overflow-hidden">
        <div className="bg-[#003366] text-white px-3 py-1 flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider">New Term</span>
          <button onClick={onClose} className="hover:bg-red-500 rounded px-1 transition-colors">✕</button>
        </div>
        <div className="p-4 bg-white space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-[11px] font-bold w-24 text-gray-700">TERMS:</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 border border-gray-400 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-[11px] font-bold w-24 text-gray-700">NET DUE (DAYS):</label>
            <input
              type="number"
              value={dueDays}
              onChange={e => setDueDays(e.target.value)}
              className="w-24 border border-gray-400 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-[11px] font-bold w-24 text-gray-700">DISCOUNT %:</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                className="w-24 border border-gray-400 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <span className="text-sm font-bold text-gray-500">%</span>
            </div>
          </div>
        </div>
        <div className="bg-[#e0e0e0] p-2 flex justify-end gap-2 border-t border-gray-300">
          <button
            onClick={onClose}
            className="px-4 py-1 border border-gray-400 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ name, stdDueDays: parseInt(dueDays) || 0, discountPercentage: parseFloat(discount) || undefined })}
            disabled={!name}
            className="px-6 py-1 bg-[#003366] hover:bg-[#004488] text-white text-xs font-bold rounded shadow-md disabled:bg-gray-400"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

const TermsList: React.FC<Props> = ({ terms, onUpdate }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAdd = () => setIsDialogOpen(true);

  const handleDelete = () => {
    if (selectedId && window.confirm("Delete this term?")) {
      onUpdate(terms.filter(t => t.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleSave = (data: Partial<Term>) => {
    onUpdate([...terms, {
      id: Math.random().toString(),
      name: data.name!,
      stdDueDays: data.stdDueDays || 0,
      discountPercentage: data.discountPercentage,
      isActive: true
    }]);
    setIsDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0]">
      <div className="flex-1 overflow-auto bg-white m-1 border border-gray-400">
        <table className="w-full text-[11px] text-left border-collapse">
          <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-400">
            <tr className="h-6">
              <th className="px-3 border-r border-gray-300 font-bold uppercase">Terms</th>
              <th className="px-3 border-r border-gray-300 font-bold w-32 uppercase text-right">Net Due (Days)</th>
              <th className="px-3 font-bold w-32 uppercase text-right">Discount %</th>
            </tr>
          </thead>
          <tbody>
            {(terms || []).map(t => (
              <tr
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`h-5 border-b border-gray-100 ${selectedId === t.id ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'}`}
              >
                <td className="px-3 font-bold">{t.name}</td>
                <td className="px-3 text-right">{t.stdDueDays}</td>
                <td className="px-3 text-right">{t.discountPercentage ? `${t.discountPercentage}%` : '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-[#f0f0f0] p-1 border-t border-gray-300">
        <div className="relative group inline-block">
          <button className="bg-gray-100 hover:bg-white border border-gray-400 px-3 py-0.5 text-[11px] font-bold rounded">Terms ▼</button>
          <div className="hidden group-hover:block absolute bottom-full left-0 bg-white border border-gray-400 shadow-xl min-w-[150px] py-1 z-50">
            <button onClick={handleAdd} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs">New</button>
            <button onClick={handleDelete} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs">Delete</button>
          </div>
        </div>
      </div>

      <TermDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};

export default TermsList;
