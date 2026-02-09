
import React, { useState } from 'react';

interface Props {
  messages: string[];
  onUpdate: (messages: string[]) => void;
}

const CustomerMessageList: React.FC<Props> = ({ messages, onUpdate }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleAdd = () => {
    const msg = prompt("Enter new Customer Message:");
    const currentMessages = messages || [];
    if (msg && !currentMessages.includes(msg)) onUpdate([...currentMessages, msg]);
  };

  const handleDelete = () => {
    const currentMessages = messages || [];
    if (selected && window.confirm("Delete this message?")) {
      onUpdate(currentMessages.filter(m => m !== selected));
      setSelected(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0]">
      <div className="flex-1 overflow-auto bg-white m-1 border border-gray-400">
        <table className="w-full text-[11px] text-left border-collapse">
          <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-400">
            <tr className="h-6"><th className="px-3 border-r border-gray-300 font-bold uppercase">Customer Message</th></tr>
          </thead>
          <tbody>
            {(messages || []).map(m => (
              <tr key={m} onClick={() => setSelected(m)} className={`h-5 border-b border-gray-100 ${selected === m ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'}`}>
                <td className="px-3 italic font-semibold">{m}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-1 border-t border-gray-300">
        <div className="relative group inline-block">
          <button className="bg-gray-100 border border-gray-400 px-3 py-0.5 text-[11px] font-bold rounded">Customer Message ▼</button>
          <div className="hidden group-hover:block absolute bottom-full left-0 bg-white border border-gray-400 shadow-xl min-w-[150px] py-1 z-50">
            <button onClick={handleAdd} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs">New</button>
            <button onClick={handleDelete} className="w-full text-left px-4 py-1 hover:bg-blue-600 hover:text-white text-xs">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerMessageList;
