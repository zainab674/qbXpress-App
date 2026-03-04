import React, { useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    availableColumns: string[];
    selectedColumns: string[];
    onApply: (newOrder: string[], allSelected: string[]) => void;
}

const ColumnSettingsDialog: React.FC<Props> = ({ isOpen, onClose, availableColumns, selectedColumns, onApply }) => {
    const [activeTab, setActiveTab] = useState<'REORDER' | 'MORE'>('REORDER');
    const [orderedColumns, setOrderedColumns] = useState<string[]>(selectedColumns);
    const [currentSelected, setCurrentSelected] = useState<string[]>(selectedColumns);
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const handleToggleColumn = (col: string) => {
        if (currentSelected.includes(col)) {
            setCurrentSelected(currentSelected.filter(c => c !== col));
            setOrderedColumns(orderedColumns.filter(c => c !== col));
        } else {
            setCurrentSelected([...currentSelected, col]);
            setOrderedColumns([...orderedColumns, col]);
        }
    };

    const moveColumn = (index: number, direction: 'UP' | 'DOWN') => {
        const newOrder = [...orderedColumns];
        const targetIndex = direction === 'UP' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newOrder.length) return;

        [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
        setOrderedColumns(newOrder);
    };

    const filteredColumns = availableColumns.filter(c =>
        c.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-[500px] flex flex-col animate-in zoom-in-95 duration-200 border border-gray-300">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">Organize columns</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className="flex border-b bg-white">
                    <button
                        onClick={() => setActiveTab('REORDER')}
                        className={`px-6 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'REORDER' ? 'border-green-600 text-green-700 bg-green-50/30' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        Reorder
                    </button>
                    <button
                        onClick={() => setActiveTab('MORE')}
                        className={`px-6 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'MORE' ? 'border-green-600 text-green-700 bg-green-50/30' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        More Columns
                    </button>
                </div>

                <div className="p-6 h-[400px] overflow-hidden flex flex-col">
                    {activeTab === 'REORDER' ? (
                        <div className="flex-1 flex flex-col">
                            <p className="text-[11px] text-gray-500 mb-4 font-medium italic">Drag columns or use arrows to change their order in the report.</p>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-2">
                                {orderedColumns.map((col, idx) => (
                                    <div key={col} className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-100 rounded group hover:border-blue-300 hover:shadow-sm transition-all">
                                        <div className="cursor-grab text-gray-300 group-hover:text-blue-400">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                                        </div>
                                        <span className="flex-1 text-[13px] font-semibold text-gray-700">{col}</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => moveColumn(idx, 'UP')}
                                                disabled={idx === 0}
                                                className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300 disabled:opacity-30"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                            </button>
                                            <button
                                                onClick={() => moveColumn(idx, 'DOWN')}
                                                disabled={idx === orderedColumns.length - 1}
                                                className="p-1 hover:bg-white rounded border border-transparent hover:border-gray-300 disabled:opacity-30"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    placeholder="Find a column"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500 transition-all pl-9"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                <svg className="absolute left-3 top-2.5 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 pr-2">
                                {filteredColumns.map(col => (
                                    <label key={col} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer group transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={currentSelected.includes(col)}
                                            onChange={() => handleToggleColumn(col)}
                                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                        />
                                        <span className={`text-[13px] transition-colors ${currentSelected.includes(col) ? 'text-gray-900 font-bold' : 'text-gray-600 group-hover:text-gray-800'}`}>
                                            {col}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded font-bold text-[13px] text-gray-700 hover:bg-white transition-all active:scale-95 shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onApply(orderedColumns, currentSelected);
                            onClose();
                        }}
                        className="px-8 py-2 bg-[#2ca01c] text-white rounded font-bold text-[13px] hover:bg-[#218315] shadow-sm transition-all active:scale-95 border-none"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ColumnSettingsDialog;
