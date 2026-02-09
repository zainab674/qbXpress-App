
import React, { useState } from 'react';

interface Props {
  methods: string[];
  onUpdate: (methods: string[]) => void;
}

const PaymentMethodList: React.FC<Props> = ({ methods, onUpdate }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleAdd = () => {
    const name = prompt("Enter new Payment Method name:");
    const currentMethods = methods || [];
    if (name && !currentMethods.includes(name)) onUpdate([...currentMethods, name]);
  };

  const handleDelete = () => {
    const currentMethods = methods || [];
    if (selected && window.confirm(`Delete ${selected}?`)) {
      onUpdate(currentMethods.filter(m => m !== selected));
      setSelected(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0]">
      <div className="flex-1 overflow-auto bg-white m-1 border border-gray-400">
        <table className="w-full text-[11px] text-left border-collapse">
          <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-400">
            <tr className="h-6">
              <th className="px-3 border-r border-gray-300 font-bold uppercase">Payment Method</th>
            </tr>
          </thead>
          <tbody>
            {(methods || []).map(m => (
              <tr
                key={m}
                onClick={() => setSelected(m)}
                className={`h-5 border-b border-gray-100 ${selected === m ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'}`}
              >
                <td className="px-3 font-bold">{m}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-[#f0f0f0] p-1 flex items-center justify-between border-t border-gray-300">
        <div className="flex gap-1">
          <div className="relative group">
            <button className="bg-gray-100 hover:bg-white border border-gray-400 px-3 py-0.5 text-[11px] font-bold rounded">Payment Method ▼</button>
            <div className="hidden group-hover:block absolute bottom-full left-0 bg-white border border-gray-400 shadow-xl min-w-[150px] py-1 z-50">
              <button onClick={handleAdd} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs">New</button>
              <button onClick={handleDelete} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodList;
