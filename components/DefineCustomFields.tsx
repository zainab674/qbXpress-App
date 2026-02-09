
import React, { useState } from 'react';
import { CustomFieldDefinition } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fields: CustomFieldDefinition[];
  onSave: (fields: CustomFieldDefinition[]) => void;
}

const DefineCustomFields: React.FC<Props> = ({ isOpen, onClose, fields, onSave }) => {
  const [list, setList] = useState<CustomFieldDefinition[]>(fields);

  if (!isOpen) return null;

  const handleUpdate = (idx: number, key: keyof CustomFieldDefinition, val: any) => {
    const newList = [...list];
    // Ensure the entry exists before updating
    if (!newList[idx]) {
       newList[idx] = { id: Math.random().toString(), label: '', useForCust: false, useForVend: false, useForEmpl: false, useForItem: false };
    }
    newList[idx] = { ...newList[idx], [key]: val };
    setList(newList);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[500] p-4">
      <div className="bg-white w-[640px] h-[550px] rounded shadow-2xl border border-gray-500 flex flex-col">
        <div className="bg-[#003366] p-2 text-white font-bold text-sm flex justify-between items-center">
          <span>Set up Custom Fields for Names and Items (Page 101)</span>
          <button onClick={onClose} className="hover:bg-red-600 px-2 font-serif">X</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <p className="text-xs text-gray-600 font-bold mb-4 italic">Assign custom fields to your customers, vendors, employees, or items.</p>
          
          <div className="border rounded overflow-hidden shadow-inner bg-gray-50">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-[#e8e8e8] border-b border-gray-300">
                <tr>
                  <th className="px-3 py-2 border-r uppercase tracking-tighter font-bold">Label</th>
                  <th className="px-1 py-2 border-r text-center w-12 uppercase tracking-tighter font-bold">Cust</th>
                  <th className="px-1 py-2 border-r text-center w-12 uppercase tracking-tighter font-bold">Vend</th>
                  <th className="px-1 py-2 border-r text-center w-12 uppercase tracking-tighter font-bold">Empl</th>
                  <th className="px-1 py-2 text-center w-12 uppercase tracking-tighter font-bold">Item</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 15 }).map((_, i) => {
                  const f = list[i] || { id: i.toString(), label: '', useForCust: false, useForVend: false, useForEmpl: false, useForItem: false };
                  return (
                    <tr key={i} className="border-b hover:bg-blue-50/50">
                      <td className="px-2 py-1 border-r">
                        <input 
                          className="w-full bg-transparent outline-none focus:bg-white px-1 font-bold"
                          placeholder={`Field ${i+1}`}
                          value={f.label}
                          onChange={(e) => handleUpdate(i, 'label', e.target.value)}
                        />
                      </td>
                      <td className="border-r text-center">
                        <input type="checkbox" checked={f.useForCust} onChange={e => handleUpdate(i, 'useForCust', e.target.checked)} />
                      </td>
                      <td className="border-r text-center">
                        <input type="checkbox" checked={f.useForVend} onChange={e => handleUpdate(i, 'useForVend', e.target.checked)} />
                      </td>
                      <td className="border-r text-center">
                        <input type="checkbox" checked={f.useForEmpl} onChange={e => handleUpdate(i, 'useForEmpl', e.target.checked)} />
                      </td>
                      <td className="text-center">
                        <input type="checkbox" checked={f.useForItem} onChange={e => handleUpdate(i, 'useForItem', e.target.checked)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-100 p-4 border-t border-gray-400 flex justify-end gap-2">
          <button onClick={() => { onSave(list.filter(f => f.label.trim())); onClose(); }} className="px-8 py-1.5 bg-[#0077c5] text-white text-xs font-bold rounded shadow-sm hover:brightness-110">OK</button>
          <button onClick={onClose} className="px-8 py-1.5 border border-gray-400 bg-white text-xs font-bold rounded shadow-sm hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default DefineCustomFields;
