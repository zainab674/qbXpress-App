
import React from 'react';

interface PrintFormsProps {
    isOpen: boolean;
    onClose: () => void;
}

const PrintFormsDialog: React.FC<PrintFormsProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const fakeQueue = [
        { type: 'Check', ref: '1001', date: '2026-01-31', amount: '$1,200.00' },
        { type: 'Invoice', ref: 'INV-001', date: '2026-01-30', amount: '$450.00' },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100]">
            <div className="bg-[#f0f0f0] w-[95vw] h-[95vh] border border-gray-400 shadow-2xl flex flex-col">
                <div className="bg-[#003366] text-white px-2 py-1 flex justify-between items-center text-sm font-bold">
                    <span>Print Forms Queue</span>
                    <button onClick={onClose} className="hover:bg-red-600 px-1">✕</button>
                </div>

                <div className="p-4 space-y-4 text-[12px]">
                    <p>The following forms are marked "To be printed". Select the items you want to print now.</p>

                    <div className="border border-gray-400 bg-white h-40 overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 border-b sticky top-0">
                                <tr>
                                    <th className="px-2 py-1 border-r w-8"><input type="checkbox" defaultChecked /></th>
                                    <th className="px-2 py-1 border-r">Type</th>
                                    <th className="px-2 py-1 border-r">Ref No.</th>
                                    <th className="px-2 py-1">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fakeQueue.map((item, i) => (
                                    <tr key={i} className="hover:bg-blue-50 border-b">
                                        <td className="px-2 py-1 border-r text-center"><input type="checkbox" defaultChecked /></td>
                                        <td className="px-2 py-1 border-r">{item.type}</td>
                                        <td className="px-2 py-1 border-r">{item.ref}</td>
                                        <td className="px-2 py-1">{item.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                        <button onClick={() => { alert('Connecting to printer...'); onClose(); }} className="bg-[#0077c5] text-white px-4 py-1 hover:brightness-110 min-w-[80px] font-bold">Print</button>
                        <button onClick={onClose} className="bg-white border border-gray-400 px-4 py-1 hover:bg-gray-100 min-w-[80px]">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintFormsDialog;
