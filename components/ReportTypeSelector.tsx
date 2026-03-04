import React, { useState } from 'react';

interface ReportType {
    id: string;
    title: string;
    icon: React.ReactNode;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (type: string) => void;
}

const ReportTypeSelector: React.FC<Props> = ({ isOpen, onClose, onCreate }) => {
    const [selectedType, setSelectedType] = useState<string | null>(null);

    if (!isOpen) return null;

    const types: ReportType[] = [
        {
            id: 'BLANK',
            title: 'Blank',
            icon: (
                <div className="w-12 h-12 flex items-center justify-center text-green-600">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </div>
            )
        },
        {
            id: 'INVOICE',
            title: 'Invoice',
            icon: (
                <div className="w-12 h-12 flex items-center justify-center text-green-600">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
            )
        },
        {
            id: 'EXPENSES',
            title: 'Expenses',
            icon: (
                <div className="w-12 h-12 flex items-center justify-center text-blue-500 text-xs">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </div>
            )
        },
        {
            id: 'SALES',
            title: 'Sales',
            icon: (
                <div className="w-12 h-12 flex items-center justify-center text-green-600">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                </div>
            )
        },
        {
            id: 'BILLS',
            title: 'Bills',
            icon: (
                <div className="w-12 h-12 flex items-center justify-center text-blue-400">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                </div>
            )
        },
        {
            id: 'JOURNAL',
            title: 'Journal Entry',
            icon: (
                <div className="w-12 h-12 flex items-center justify-center text-blue-400">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </div>
            )
        },
        {
            id: 'BANKING',
            title: 'Banking Transactions',
            icon: (
                <div className="w-12 h-12 flex items-center justify-center text-green-700">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 21h18"></path>
                        <path d="M3 10h18"></path>
                        <path d="M5 6l7-3 7 3"></path>
                        <path d="M4 10v11"></path>
                        <path d="M20 10v11"></path>
                        <path d="M8 14v3"></path>
                        <path d="M12 14v3"></path>
                        <path d="M16 14v3"></path>
                    </svg>
                </div>
            )
        },
        {
            id: 'TRANSACTIONS',
            title: 'Transactions List',
            icon: (
                <div className="w-12 h-12 flex items-center justify-center text-green-600">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                </div>
            )
        },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-lg shadow-2xl w-[800px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#f8f9fa]">
                    <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">Select the report type</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="p-8 grid grid-cols-4 gap-6 overflow-y-auto max-h-[500px] bg-white custom-scrollbar">
                    {types.map((t) => (
                        <div
                            key={t.id}
                            onClick={() => setSelectedType(t.id)}
                            className={`
                group cursor-pointer flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200
                ${selectedType === t.id
                                    ? 'border-green-500 bg-green-50/50 shadow-md ring-4 ring-green-100'
                                    : 'border-gray-100 hover:border-green-200 hover:bg-gray-50/80'}
              `}
                        >
                            <div className={`
                mb-4 transition-transform duration-200 group-hover:scale-110 relative
                ${selectedType === t.id ? 'text-green-600' : 'text-gray-600'}
              `}>
                                {t.icon}
                                {selectedType === t.id && (
                                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 animate-in zoom-in-50 duration-200 shadow-sm">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <span className={`
                text-[13px] font-bold text-center leading-tight
                ${selectedType === t.id ? 'text-green-700' : 'text-gray-600 group-hover:text-gray-900'}
              `}>
                                {t.title}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-[#f8f9fa]">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded font-bold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors active:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => selectedType && onCreate(selectedType)}
                        disabled={!selectedType}
                        className={`
              px-8 py-2 rounded font-bold text-[13px] transition-all
              ${selectedType
                                ? 'bg-[#2ca01c] text-white hover:bg-[#218315] shadow-sm active:transform active:scale-95'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportTypeSelector;
