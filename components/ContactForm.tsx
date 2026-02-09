
import React, { useState } from 'react';
import { EntityContact } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contacts: EntityContact[];
  onSave: (contacts: EntityContact[]) => void;
}

const ContactForm: React.FC<Props> = ({ isOpen, onClose, contacts, onSave }) => {
  const [list, setList] = useState<EntityContact[]>(contacts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<EntityContact>>({});

  if (!isOpen) return null;

  const handleAdd = () => {
    setEditingId('new');
    setEditData({ type: 'Additional' });
  };

  const handleSaveEdit = () => {
    if (editingId === 'new') {
      const newList = [...list, { ...editData, id: Math.random().toString() } as EntityContact];
      setList(newList);
    } else {
      setList(list.map(c => c.id === editingId ? { ...c, ...editData } as EntityContact : c));
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[500] p-4">
      <div className="bg-white w-[600px] h-[450px] rounded shadow-2xl border border-gray-500 flex flex-col">
        <div className="bg-[#003366] p-2 text-white font-bold text-sm flex justify-between items-center">
          <span>Manage Contacts (Figure 4-6)</span>
          <button onClick={onClose}>X</button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col p-4">
          {editingId ? (
            <div className="space-y-4 bg-gray-50 p-6 border rounded shadow-inner">
               <h4 className="text-xs font-bold text-blue-900 uppercase">Contact Details</h4>
               <div className="grid grid-cols-2 gap-4">
                  <input placeholder="First Name" className="border p-2 text-xs" value={editData.firstName} onChange={e => setEditData({...editData, firstName: e.target.value})} />
                  <input placeholder="Last Name" className="border p-2 text-xs" value={editData.lastName} onChange={e => setEditData({...editData, lastName: e.target.value})} />
                  <input placeholder="Job Title" className="border p-2 text-xs" value={editData.jobTitle} onChange={e => setEditData({...editData, jobTitle: e.target.value})} />
                  <select className="border p-2 text-xs" value={editData.type} onChange={e => setEditData({...editData, type: e.target.value as any})}>
                    <option>Primary</option>
                    <option>Secondary</option>
                    <option>Additional</option>
                  </select>
               </div>
               <div className="flex justify-end gap-2 mt-4">
                  <button onClick={handleSaveEdit} className="bg-blue-600 text-white px-4 py-1 rounded text-xs font-bold">Save Contact</button>
                  <button onClick={() => setEditingId(null)} className="bg-white border px-4 py-1 rounded text-xs font-bold">Cancel</button>
               </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto border border-gray-300 rounded bg-gray-50 mb-4">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#e8e8e8] border-b border-gray-300">
                    <tr>
                      <th className="px-3 py-2">NAME</th>
                      <th className="px-3 py-2">TITLE</th>
                      <th className="px-3 py-2">TYPE</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(c => (
                      <tr key={c.id} className="border-b hover:bg-blue-50">
                        <td className="px-3 py-2 font-bold">{c.firstName} {c.lastName}</td>
                        <td className="px-3 py-2 italic">{c.jobTitle}</td>
                        <td className="px-3 py-2">{c.type}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => { setEditingId(c.id); setEditData(c); }} className="text-blue-600 hover:underline font-bold">Edit</button>
                        </td>
                      </tr>
                    ))}
                    {list.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic">No contacts added.</td></tr>}
                  </tbody>
                </table>
              </div>
              <button onClick={handleAdd} className="w-fit bg-white border border-gray-400 px-4 py-1.5 rounded text-[11px] font-bold hover:bg-gray-100 shadow-sm">+ Add New Contact</button>
            </>
          )}
        </div>

        <div className="bg-gray-100 p-3 border-t border-gray-400 flex justify-end gap-2">
          <button onClick={() => { onSave(list); onClose(); }} className="px-6 py-1.5 bg-[#0077c5] text-white text-xs font-bold rounded shadow-sm">Save & Close</button>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
