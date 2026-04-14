
import React, { useState } from 'react';
import { SalesTaxCode } from '../types';

interface Props {
  codes: SalesTaxCode[];
  onUpdate: (codes: SalesTaxCode[]) => void;
}

const SalesTaxCodeDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (code: Partial<SalesTaxCode>) => void;
  initialData?: SalesTaxCode;
}> = ({ isOpen, onClose, onSave, initialData }) => {
  const [code, setCode] = useState(initialData?.code || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isTaxable, setIsTaxable] = useState(initialData?.isTaxable ?? true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#f0f0f0] border-2 border-[#003366] shadow-2xl w-[95vw] h-[95vh] rounded-sm flex flex-col overflow-hidden">
        <div className="bg-[#003366] text-white px-3 py-1 flex items-center justify-between font-sans">
          <span className="font-bold text-xs uppercase tracking-wider">{initialData ? 'Edit' : 'New'} Sales Tax Code</span>
          <button onClick={onClose} className="hover:bg-red-500 rounded px-1 transition-colors">✕</button>
        </div>
        <div className="p-4 bg-white space-y-4 font-sans">
          <div className="flex items-center gap-4">
            <label className="text-[11px] font-bold w-24 text-gray-700 uppercase">Sales Tax Code:</label>
            <input
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="flex-1 border border-gray-400 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              maxLength={3}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-gray-700 uppercase">Description:</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-400 px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isTaxable"
              checked={isTaxable}
              onChange={e => setIsTaxable(e.target.checked)}
              className="w-3 h-3"
            />
            <label htmlFor="isTaxable" className="text-[11px] font-bold text-gray-700 uppercase cursor-pointer select-none">Taxable</label>
          </div>
        </div>
        <div className="bg-[#e0e0e0] p-2 flex justify-end gap-2 border-t border-gray-300 font-sans">
          <button
            onClick={onClose}
            className="px-4 py-1 border border-gray-400 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ code, description, isTaxable })}
            disabled={!code}
            className="px-6 py-1 bg-[#003366] hover:bg-[#004488] text-white text-xs font-bold rounded shadow-md disabled:bg-gray-400 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

const SalesTaxCodeList: React.FC<Props> = ({ codes, onUpdate }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean, data?: SalesTaxCode }>({ open: false });

  const toggleActive = (id: string) => {
    onUpdate(codes.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  const handleAdd = () => setDialog({ open: true });
  const handleEdit = () => {
    const code = codes.find(c => c.id === selectedId);
    if (code) setDialog({ open: true, data: code });
  };

  const handleSave = (data: Partial<SalesTaxCode>) => {
    if (dialog.data) {
      // Edit
      onUpdate(codes.map(c => c.id === dialog.data!.id ? { ...c, ...data } as SalesTaxCode : c));
    } else {
      // New
      const newCode: SalesTaxCode = {
        id: Math.random().toString(36).substr(2, 9),
        code: data.code!,
        description: data.description || '',
        isTaxable: data.isTaxable ?? true,
        isActive: true
      };
      onUpdate([...codes, newCode]);
    }
    setDialog({ open: false });
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0] font-sans select-none">
      <div className="flex-1 overflow-auto bg-white m-1 border border-gray-400">
        <table className="w-full text-[11px] text-left border-collapse">
          <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-400 z-10">
            <tr className="h-6">
              <th className="px-2 border-r border-gray-300 font-bold w-8 text-center uppercase">X</th>
              <th className="px-2 border-r border-gray-300 font-bold w-24 uppercase">Code</th>
              <th className="px-2 border-r border-gray-300 font-bold uppercase">Description</th>
              <th className="px-2 font-bold w-24 text-center uppercase">Taxable</th>
            </tr>
          </thead>
          <tbody>
            {(codes || []).map(c => (
              <tr
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                onDoubleClick={handleEdit}
                className={`h-5 border-b border-gray-100 cursor-pointer ${selectedId === c.id ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'} ${!c.isActive ? 'italic text-gray-400' : ''}`}
              >
                <td className="px-2 border-r border-gray-200 text-center font-bold" onClick={(e) => { e.stopPropagation(); toggleActive(c.id); }}>
                  {!c.isActive && 'X'}
                </td>
                <td className="px-2 border-r border-gray-200 font-bold">{c.code}</td>
                <td className="px-2 border-r border-gray-200">{c.description}</td>
                <td className="px-2 text-center font-bold">{c.isTaxable ? 'Tax' : 'Non'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-[#f0f0f0] p-1 flex items-center justify-between border-t border-gray-300">
        <div className="flex gap-1">
          <div className="relative group inline-block">
            <button className="bg-white border border-gray-400 px-3 py-0.5 text-[11px] font-bold rounded shadow-sm hover:bg-gray-100 flex items-center gap-1">
              Tax Code <span className="text-[8px] transform translate-y-px">▼</span>
            </button>
            <div className="hidden group-hover:block absolute bottom-full left-0 bg-white border border-gray-400 shadow-xl min-w-[150px] py-1 z-50">
              <button onClick={handleAdd} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs">New</button>
              <button onClick={handleEdit} disabled={!selectedId} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-400">Edit</button>
              <button onClick={() => selectedId && toggleActive(selectedId)} disabled={!selectedId} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-400">Make Inactive</button>
            </div>
          </div>
        </div>
      </div>

      <SalesTaxCodeDialog
        isOpen={dialog.open}
        onClose={() => setDialog({ open: false })}
        onSave={handleSave}
        initialData={dialog.data}
      />
    </div>
  );
};

export default SalesTaxCodeList;
