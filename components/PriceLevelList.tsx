
import React, { useState } from 'react';
import { PriceLevel } from '../types';

interface Props {
  levels: PriceLevel[];
  onUpdate: (levels: PriceLevel[]) => void;
}

const PriceLevelList: React.FC<Props> = ({ levels, onUpdate }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<PriceLevel>>({});

  const handleSave = () => {
    if (!formData.name) return;
    if (formData.id) {
      onUpdate(levels.map(l => l.id === formData.id ? { ...l, ...formData } as PriceLevel : l));
    } else {
      onUpdate([...levels, { ...formData, id: Math.random().toString(), isActive: true } as PriceLevel]);
    }
    setIsFormOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0]">
      <div className="flex-1 overflow-auto bg-white m-1 border border-gray-400">
        <table className="w-full text-[11px] text-left border-collapse">
          <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-400 z-10">
            <tr className="h-6">
              <th className="px-2 border-r border-gray-300 font-bold uppercase">Price Level Name</th>
              <th className="px-2 border-r border-gray-300 font-bold w-32 uppercase">Type</th>
              <th className="px-2 font-bold w-32 text-right uppercase">Fixed %</th>
            </tr>
          </thead>
          <tbody>
            {levels.map(l => (
              <tr
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                onDoubleClick={() => { setFormData(l); setIsFormOpen(true); }}
                className={`h-5 border-b border-gray-100 ${selectedId === l.id ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'}`}
              >
                <td className="px-2 border-r border-gray-200 font-bold">{l.name}</td>
                <td className="px-2 border-r border-gray-200 italic">{l.type}</td>
                <td className="px-2 text-right font-mono">
                  {l.type === 'Fixed %' ? `${l.percentage}%` : l.type === 'Formula' ? 'Formula' : 'Per Item'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[#f0f0f0] p-1 flex items-center justify-between border-t border-gray-300">
        <div className="flex gap-1">
          <button onClick={() => { setFormData({ type: 'Fixed %' }); setIsFormOpen(true); }} className="bg-white border border-gray-400 px-3 py-0.5 text-[11px] font-bold rounded shadow-sm hover:bg-gray-50">Price Level ▼</button>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[510]">
          <div className="bg-white w-96 rounded shadow-2xl border border-gray-500 overflow-hidden">
            <div className="bg-[#003366] p-2 text-white font-bold text-sm flex justify-between items-center">
              <span>{formData.id ? 'Edit' : 'New'} Price Level</span>
              <button onClick={() => setIsFormOpen(false)}>X</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Price Level Name</label>
                <input className="border p-1 text-xs outline-none" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Price Level Type</label>
                <select className="border p-1 text-xs outline-none" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                  <option>Fixed %</option>
                  <option>Per Item</option>
                </select>
              </div>
              {formData.type === 'Fixed %' && (
                <div className="flex items-center gap-4">
                  <label className="text-xs font-bold">This price level will</label>
                  <input className="border p-1 text-xs w-16 text-right" type="number" value={formData.percentage} onChange={e => setFormData({ ...formData, percentage: parseFloat(e.target.value) })} />
                  <span className="text-xs">% higher than standard price</span>
                </div>
              )}
              {formData.type === 'Formula' && (
                <div className="space-y-3 bg-blue-50 p-2 border border-blue-200 rounded">
                  <div className="flex items-center gap-2 text-xs">
                    <span>Base on:</span>
                    <select className="border p-1" value={formData.formulaConfig?.baseOn} onChange={e => setFormData({ ...formData, formulaConfig: { ...(formData.formulaConfig || { baseOn: 'Cost', adjustmentType: 'Increase', adjustmentAmount: 0 }), baseOn: e.target.value as any } })}>
                      <option>Cost</option>
                      <option>Current Price</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <select className="border p-1 font-bold" value={formData.formulaConfig?.adjustmentType} onChange={e => setFormData({ ...formData, formulaConfig: { ...(formData.formulaConfig || { baseOn: 'Cost', adjustmentType: 'Increase', adjustmentAmount: 0 }), adjustmentType: e.target.value as any } })}>
                      <option>Increase</option>
                      <option>Decrease</option>
                    </select>
                    <span>by</span>
                    <input type="number" className="border p-1 w-16" value={formData.formulaConfig?.adjustmentAmount} onChange={e => setFormData({ ...formData, formulaConfig: { ...(formData.formulaConfig || { baseOn: 'Cost', adjustmentType: 'Increase', adjustmentAmount: 0 }), adjustmentAmount: parseFloat(e.target.value) } })} />
                    <span>%</span>
                  </div>
                  <p className="text-[9px] text-blue-600 italic">Formula price levels dynamically update as costs change. (Ch 13)</p>
                </div>
              )}
            </div>
            <div className="bg-gray-100 p-3 flex justify-end gap-2 border-t">
              <button onClick={handleSave} className="px-6 py-1 bg-[#0077c5] text-white text-xs font-bold rounded shadow-sm">OK</button>
              <button onClick={() => setIsFormOpen(false)} className="px-6 py-1 border border-gray-400 bg-white text-xs font-bold rounded shadow-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceLevelList;
