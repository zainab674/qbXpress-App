import React, { useState, useEffect, useCallback } from 'react';
import { fetchCustomColumns, deleteCustomColumn, updateCustomColumn, addCustomColumn } from '../services/api';
import AddCustomColumnModal from './AddCustomColumnModal';

interface CustomColumn {
    id: string;
    columnName: string;
    formula: string;
    reportType: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    reportType: string;
    onChanged: () => void; // called after any add/edit/delete so the report re-fetches
}

const AVAILABLE_FIELDS = ['value', 'extraValue', 'extraValue2', 'ppValue', 'pyValue', 'Amount', 'quantity', 'open_balance'];

const ManageCustomColumnsModal: React.FC<Props> = ({ isOpen, onClose, reportType, onChanged }) => {
    const [columns, setColumns] = useState<CustomColumn[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editTarget, setEditTarget] = useState<CustomColumn | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        setError('');
        try {
            const result = await fetchCustomColumns(reportType);
            setColumns(Array.isArray(result) ? result : []);
        } catch (err: any) {
            setError('Failed to load custom columns.');
        } finally {
            setLoading(false);
        }
    }, [isOpen, reportType]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (col: CustomColumn) => {
        if (!window.confirm(`Delete column "${col.columnName}"?`)) return;
        setDeletingId(col.id);
        try {
            await deleteCustomColumn(col.id);
            await load();
            onChanged();
        } catch {
            setError(`Failed to delete "${col.columnName}".`);
        } finally {
            setDeletingId(null);
        }
    };

    const handleSaveNew = async (name: string, formula: string) => {
        await addCustomColumn({ reportType, columnName: name, formula });
        setShowAdd(false);
        await load();
        onChanged();
    };

    const handleSaveEdit = async (name: string, formula: string) => {
        await updateCustomColumn({ reportType, columnName: name, formula });
        setEditTarget(null);
        await load();
        onChanged();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998]">
                <div className="bg-white rounded-lg shadow-2xl w-[95vw] h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                    {/* Header */}
                    <div className="bg-[#003366] text-white p-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-widest">Manage Custom Formula Columns</h2>
                            <p className="text-[10px] text-blue-200 mt-0.5">{reportType}</p>
                        </div>
                        <button onClick={onClose} className="hover:text-gray-300 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-2 text-xs border border-red-200 rounded">{error}</div>
                        )}

                        {/* Formula reference */}
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Available Formula Fields</p>
                            <div className="flex flex-wrap gap-1">
                                {AVAILABLE_FIELDS.map(f => (
                                    <code key={f} className="bg-white border border-blue-200 rounded px-1.5 py-0.5 text-[10px] text-blue-800 font-mono">{f}</code>
                                ))}
                            </div>
                            <p className="text-[9px] text-blue-500 mt-1">Operators: + - * / ( ) | Functions: abs, round, ceil, floor, min, max, sqrt, pow</p>
                        </div>

                        {/* Table */}
                        {loading ? (
                            <div className="text-center text-xs text-gray-400 py-6">Loading...</div>
                        ) : columns.length === 0 ? (
                            <div className="text-center text-xs text-gray-400 py-6 border-2 border-dashed border-gray-200 rounded-lg">
                                No custom columns yet. Click <strong>Add Column</strong> to create one.
                            </div>
                        ) : (
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Column Name</th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Formula</th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-center w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {columns.map((col, i) => (
                                        <tr key={col.id} className={`border-t ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-purple-50 transition-colors`}>
                                            <td className="px-3 py-2 font-semibold text-purple-800">{col.columnName}</td>
                                            <td className="px-3 py-2 font-mono text-gray-700 max-w-[200px] truncate" title={col.formula}>{col.formula}</td>
                                            <td className="px-3 py-2 text-center">
                                                <div className="flex justify-center gap-1">
                                                    <button
                                                        onClick={() => setEditTarget(col)}
                                                        className="px-2 py-1 bg-blue-50 border border-blue-300 text-blue-700 rounded text-[10px] font-bold hover:bg-blue-100 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(col)}
                                                        disabled={deletingId === col.id}
                                                        className="px-2 py-1 bg-red-50 border border-red-300 text-red-700 rounded text-[10px] font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                                                    >
                                                        {deletingId === col.id ? '...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-gray-100 border-t flex justify-between items-center">
                        <button
                            onClick={() => setShowAdd(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 transition-all shadow-sm flex items-center gap-1"
                        >
                            <span className="text-sm font-bold">+</span> Add Column
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded text-xs font-bold text-gray-600 hover:bg-white transition-all shadow-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Add new column sub-modal */}
            <AddCustomColumnModal
                isOpen={showAdd}
                onClose={() => setShowAdd(false)}
                onSave={handleSaveNew}
                availableFields={AVAILABLE_FIELDS}
            />

            {/* Edit existing column sub-modal */}
            {editTarget && (
                <AddCustomColumnModal
                    isOpen={true}
                    onClose={() => setEditTarget(null)}
                    onSave={handleSaveEdit}
                    availableFields={AVAILABLE_FIELDS}
                    initialData={{ name: editTarget.columnName, formula: editTarget.formula }}
                />
            )}
        </>
    );
};

export default ManageCustomColumnsModal;
