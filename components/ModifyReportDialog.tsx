
import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableColumns: string[];
}

const ModifyReportDialog: React.FC<Props> = ({ isOpen, onClose, availableColumns }) => {
  const [search, setSearch] = useState('');
  
  if (!isOpen) return null;

  const filtered = availableColumns.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110]">
      <div className="bg-white w-[500px] rounded shadow-2xl border border-gray-400 overflow-hidden">
        <div className="bg-[#0077c5] p-2 text-white font-bold text-sm flex justify-between">
          <span>Modify Report</span>
          <button onClick={onClose}>X</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-4 border-b pb-2 text-xs font-bold text-gray-500 uppercase">
            <button className="text-blue-700 border-b-2 border-blue-700 pb-1">Display</button>
            <button className="hover:text-gray-800 pb-1">Filters</button>
            <button className="hover:text-gray-800 pb-1">Header/Footer</button>
            <button className="hover:text-gray-800 pb-1">Fonts & Numbers</button>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Search Columns</label>
            <input 
              type="text" 
              className="w-full border p-1 text-sm outline-none focus:ring-1 ring-blue-500"
              placeholder="Start typing the name of the field..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="border h-48 overflow-y-auto bg-gray-50 p-2 space-y-1">
            {filtered.map(col => (
              <label key={col} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-blue-100 p-0.5">
                <input type="checkbox" defaultChecked />
                {col}
              </label>
            ))}
          </div>
        </div>
        <div className="bg-gray-100 p-3 flex justify-end gap-2 border-t">
          <button onClick={onClose} className="px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded">OK</button>
          <button onClick={onClose} className="px-4 py-1 border border-gray-400 text-xs font-bold rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ModifyReportDialog;
