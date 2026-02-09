
import React, { useState, useMemo } from 'react';
import { Account, Transaction, QBClass, Customer, Vendor, Employee } from '../types';

interface Props {
    accounts: Account[];
    classes: QBClass[];
    customers: Customer[];
    vendors: Vendor[];
    employees: Employee[];
    onSave: (tx: Transaction) => void;
    onClose: () => void;
}

interface JournalLine {
    id: string;
    accountId: string;
    debit: number;
    credit: number;
    memo: string;
    entityId: string;
    classId: string;
}

const JournalEntryForm: React.FC<Props> = ({ accounts, classes, customers, vendors, employees, onSave, onClose }) => {
    const [refNo, setRefNo] = useState('JE-' + Math.floor(Math.random() * 10000));
    const [date, setDate] = useState(new Date().toLocaleDateString());
    const [lines, setLines] = useState<JournalLine[]>([
        { id: '1', accountId: '', debit: 0, credit: 0, memo: '', entityId: '', classId: '' },
        { id: '2', accountId: '', debit: 0, credit: 0, memo: '', entityId: '', classId: '' },
    ]);

    const entities = useMemo(() => [
        ...customers.map(c => ({ id: c.id, name: c.name, type: 'Customer' })),
        ...vendors.map(v => ({ id: v.id, name: v.name, type: 'Vendor' })),
        ...employees.map(e => ({ id: e.id, name: e.name, type: 'Employee' })),
    ], [customers, vendors, employees]);

    const totalDebits = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0);
    const difference = totalDebits - totalCredits;

    const handleAddLine = () => {
        setLines([...lines, { id: Math.random().toString(), accountId: '', debit: 0, credit: 0, memo: '', entityId: '', classId: '' }]);
    };

    const updateLine = (id: string, updates: Partial<JournalLine>) => {
        setLines(lines.map(l => l.id === id ? { ...l, ...updates } : l));
    };

    const handleSave = () => {
        if (Math.abs(difference) > 0.01) {
            alert("Journal entry must be in balance (Debits = Credits).");
            return;
        }
        if (lines.some(l => !l.accountId && (l.debit || l.credit))) {
            alert("All lines with amounts must have an account.");
            return;
        }

        const tx: Transaction = {
            id: Math.random().toString(),
            type: 'JOURNAL_ENTRY',
            refNo,
            date,
            items: lines.filter(l => l.accountId && (l.debit || l.credit)).map(l => ({
                id: l.id,
                description: l.memo,
                quantity: 1,
                rate: l.debit || -l.credit,
                amount: l.debit || -l.credit,
                tax: false,
                accountId: l.accountId as any,
                classId: l.classId,
                entityId: l.entityId as any
            })),
            total: totalDebits,
            status: 'PAID',
            entityId: 'Multi',
            memo: lines[0]?.memo
        };

        onSave(tx);
        onClose();
    };

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col font-sans select-none">
            {/* Toolbar */}
            <div className="bg-gray-50 p-2 border-b border-gray-300 flex gap-4 shadow-sm items-center">
                <button onClick={handleSave} className="flex flex-col items-center px-6 py-1 hover:bg-gray-200 rounded-sm border border-gray-300 bg-white group transition-all">
                    <span className="text-xl group-hover:scale-110">💾</span>
                    <span className="text-[10px] font-bold uppercase text-blue-900">Save & Close</span>
                </button>
                <button onClick={onClose} className="flex flex-col items-center px-6 py-1 hover:bg-gray-200 rounded-sm border border-gray-300 bg-white transition-all text-red-700">
                    <span className="text-xl">✖</span>
                    <span className="text-[10px] font-bold uppercase">Cancel</span>
                </button>
                <div className="w-px h-10 bg-gray-300 mx-2"></div>
                <button onClick={handleAddLine} className="flex flex-col items-center px-6 py-1 hover:bg-gray-200 rounded-sm border border-gray-300 bg-white font-bold text-blue-600">
                    <span className="text-xl">+</span>
                    <span className="text-[10px] uppercase">Add Line</span>
                </button>
            </div>

            <div className="p-8 flex-1 overflow-auto custom-scrollbar flex flex-col items-center bg-[#f5f7f9]">
                <div className="w-[1000px] bg-white border border-gray-300 rounded shadow-2xl p-8 flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-2xl font-serif italic text-blue-900 opacity-30">Make General Journal Entries</h1>
                        </div>
                        <div className="flex gap-8">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Date</label>
                                <input className="border border-gray-300 p-1 text-xs w-24 outline-none focus:border-blue-500" value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Entry No.</label>
                                <input className="border border-gray-300 p-1 text-xs w-24 outline-none font-mono focus:border-blue-500" value={refNo} onChange={e => setRefNo(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 border border-gray-300 rounded-sm overflow-hidden flex flex-col">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-gray-100 font-bold text-gray-600 border-b border-gray-300 uppercase text-[10px]">
                                <tr>
                                    <th className="p-2 border-r w-64">Account</th>
                                    <th className="p-2 border-r text-right w-32">Debit</th>
                                    <th className="p-2 border-r text-right w-32">Credit</th>
                                    <th className="p-2 border-r">Memo</th>
                                    <th className="p-2 border-r w-48">Name</th>
                                    <th className="p-2 w-32">Class</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line, idx) => (
                                    <tr key={line.id} className="border-b border-gray-200 hover:bg-blue-50/30">
                                        <td className="p-0 border-r">
                                            <select className="w-full p-2 bg-transparent outline-none" value={line.accountId} onChange={e => updateLine(line.id, { accountId: e.target.value })}>
                                                <option value="">Select Account...</option>
                                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-0 border-r">
                                            <input
                                                type="number"
                                                className="w-full p-2 bg-transparent outline-none text-right font-bold"
                                                value={line.debit || ''}
                                                onChange={e => updateLine(line.id, { debit: parseFloat(e.target.value) || 0, credit: 0 })}
                                            />
                                        </td>
                                        <td className="p-0 border-r">
                                            <input
                                                type="number"
                                                className="w-full p-2 bg-transparent outline-none text-right font-bold"
                                                value={line.credit || ''}
                                                onChange={e => updateLine(line.id, { credit: parseFloat(e.target.value) || 0, debit: 0 })}
                                            />
                                        </td>
                                        <td className="p-0 border-r">
                                            <input className="w-full p-2 bg-transparent outline-none italic" value={line.memo} onChange={e => updateLine(line.id, { memo: e.target.value })} />
                                        </td>
                                        <td className="p-0 border-r">
                                            <select className="w-full p-2 bg-transparent outline-none" value={line.entityId} onChange={e => updateLine(line.id, { entityId: e.target.value })}>
                                                <option value="">(Optional Name)</option>
                                                {entities.map(en => <option key={en.id} value={en.id}>{en.name} ({en.type})</option>)}
                                            </select>
                                        </td>
                                        <td className="p-0">
                                            <select className="w-full p-2 bg-transparent outline-none" value={line.classId} onChange={e => updateLine(line.id, { classId: e.target.value })}>
                                                <option value="">None</option>
                                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex-1 bg-white min-h-[100px]" onClick={handleAddLine}></div>
                    </div>

                    <div className="mt-4 flex justify-between items-center px-4 py-2 bg-gray-50 border border-gray-300 rounded shadow-inner">
                        <div className="flex gap-8">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Debit</span>
                                <span className="text-xl font-bold font-mono text-blue-900">${totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Credit</span>
                                <span className="text-xl font-bold font-mono text-blue-900">${totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Out of Balance</span>
                            <span className={`text-2xl font-bold font-mono ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                                ${difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JournalEntryForm;
