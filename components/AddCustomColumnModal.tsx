import React, { useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, formula: string) => void;
    availableFields: string[];
    initialData?: { name: string; formula: string };
}

const AddCustomColumnModal: React.FC<Props> = ({ isOpen, onClose, onSave, availableFields, initialData }) => {
    const [name, setName] = React.useState(initialData?.name || '');
    const [formula, setFormula] = React.useState(initialData?.formula || '');
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (isOpen && initialData) {
            setName(initialData.name);
            setFormula(initialData.formula);
        } else if (isOpen) {
            setName('');
            setFormula('');
        }
        setError('');
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name.trim()) {
            setError('Column name is required');
            return;
        }
        if (!formula.trim()) {
            setError('Formula is required');
            return;
        }
        // Basic formula validation: check for unauthorized characters (simple whitelist)
        const unauthorized = formula.match(/[^a-zA-Z0-9\s\+\-\*\/\(\)\._]/);
        if (unauthorized) {
            setError(`Unauthorized character in formula: ${unauthorized[0]}`);
            return;
        }

        onSave(name, formula);
        onClose();
        setName('');
        setFormula('');
        setError('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg shadow-2xl w-[95vw] h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-[#003366] text-white p-4 flex justify-between items-center">
                    <h2 className="text-sm font-bold uppercase tracking-widest">{initialData ? 'Edit Formula Column' : 'Add Custom Formula Column'}</h2>
                    <button onClick={onClose} className="hover:text-gray-300 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-2 text-xs border border-red-200 rounded animate-pulse">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Column Name</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="e.g. Total Margin"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={!!initialData} // Usually better not to change the name if it's used as a key
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Formula</label>
                        <div className="relative">
                            <textarea
                                className="w-full border border-gray-300 p-2 rounded text-sm font-mono h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="e.g. (value - extraValue) / value"
                                value={formula}
                                onChange={(e) => setFormula(e.target.value)}
                            />
                        </div>
                        <p className="text-[9px] text-gray-400 italic">
                            Use basic operators: +, -, *, /, (, ).
                        </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-tight">Available Fields</label>
                        <div className="flex flex-wrap gap-2">
                            {availableFields.map(field => (
                                <button
                                    key={field}
                                    onClick={() => setFormula(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + field)}
                                    className="px-2 py-1 bg-white border border-gray-300 rounded text-[10px] text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                                >
                                    {field}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-100 border-t flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded text-xs font-bold text-gray-600 hover:bg-white transition-all shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                    >
                        {initialData ? 'Update Column' : 'Add Column'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddCustomColumnModal;
