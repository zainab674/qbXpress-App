
import React, { useState, useMemo } from 'react';
import { Customer, Transaction } from '../types';

interface Props {
    customers: Customer[];
    transactions: Transaction[];
    onClose: () => void;
}

const StatementForm: React.FC<Props> = ({ customers, transactions, onClose }) => {
    const [selectedCustId, setSelectedCustId] = useState('');
    const [startDate, setStartDate] = useState('01/01/2024');
    const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-US'));
    const [showPreview, setShowPreview] = useState(false);

    const customerTransactions = useMemo(() => {
        if (!selectedCustId) return [];
        return transactions.filter(t =>
            t.entityId === selectedCustId &&
            ['INVOICE', 'PAYMENT', 'SALES_RECEIPT', 'CREDIT_MEMO'].includes(t.type) &&
            new Date(t.date) >= new Date(startDate) &&
            new Date(t.date) <= new Date(endDate)
        ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [selectedCustId, startDate, endDate, transactions]);

    const balance = customerTransactions.reduce((acc, t) => {
        if (t.type === 'INVOICE') return acc + t.total;
        if (['PAYMENT', 'CREDIT_MEMO', 'SALES_RECEIPT'].includes(t.type)) return acc - t.total;
        return acc;
    }, 0);

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
            <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
                <div className="p-4 bg-gray-100 border-b flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-serif italic text-[#003366] drop-shadow-sm">Create Statements</h2>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowPreview(true)} disabled={!selectedCustId} className="bg-[#0077c5] text-white px-8 py-2 text-xs font-black rounded shadow-md hover:bg-[#005fa0] transition-colors uppercase tracking-widest disabled:opacity-50">Preview</button>
                        <button onClick={onClose} className="bg-white border border-gray-400 px-8 py-2 text-xs font-black rounded hover:bg-gray-50 transition-colors uppercase tracking-widest shadow-sm">Close</button>
                    </div>
                </div>

                {!showPreview ? (
                    <div className="p-12 flex-1 overflow-auto bg-[#f8f9fa] flex flex-col items-center">
                        <div className="w-[500px] bg-white p-10 border rounded-sm shadow-xl space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Select Customer</label>
                                <select className="w-full border-b-2 border-blue-200 p-2 text-sm bg-blue-50/10 font-bold outline-none focus:border-blue-500" value={selectedCustId} onChange={e => setSelectedCustId(e.target.value)}>
                                    <option value="">--Select a Customer--</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Start Date</label>
                                    <input className="w-full border-b font-bold p-2 text-xs outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">End Date</label>
                                    <input className="w-full border-b font-bold p-2 text-xs outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="pt-8 border-t space-y-4">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Statement Options</p>
                                <div className="flex items-center gap-3 text-xs">
                                    <input type="checkbox" defaultChecked />
                                    <span>Include only open invoices</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                    <input type="checkbox" />
                                    <span>Show invoice details</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-gray-500 p-8 overflow-auto flex flex-col items-center custom-scrollbar">
                        <div className="w-[800px] bg-white shadow-2xl p-16 flex flex-col min-h-[1000px] relative">
                            <button onClick={() => setShowPreview(false)} className="absolute top-4 left-4 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">← Back to Setup</button>
                            <div className="flex justify-between items-start mb-20">
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-serif text-[#003366] uppercase tracking-widest font-black">Statement</h1>
                                    <div className="text-xs text-gray-400 font-bold">DATE: {endDate}</div>
                                </div>
                                <div className="text-right space-y-1">
                                    <div className="text-sm font-bold text-gray-800">Your Business Name, Inc.</div>
                                    <div className="text-[10px] text-gray-500">123 Business Way, Suite 100</div>
                                    <div className="text-[10px] text-gray-500">New York, NY 10001</div>
                                </div>
                            </div>

                            <div className="mb-20">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">To:</div>
                                <div className="text-lg font-black text-blue-900">{customers.find(c => c.id === selectedCustId)?.name}</div>
                                <div className="text-sm text-gray-600 italic">Billing Address...</div>
                            </div>

                            <table className="flex-1 w-full text-xs text-left">
                                <thead className="bg-[#003366] text-white font-black uppercase tracking-widest text-[10px]">
                                    <tr>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Transaction</th>
                                        <th className="p-3">Number</th>
                                        <th className="p-3 text-right">Amount</th>
                                        <th className="p-3 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerTransactions.map((t, i) => {
                                        let runningBal = customerTransactions.slice(0, i + 1).reduce((acc, tx) => {
                                            if (tx.type === 'INVOICE') return acc + tx.total;
                                            return acc - tx.total;
                                        }, 0);
                                        return (
                                            <tr key={t.id} className="border-b border-gray-100">
                                                <td className="p-3 font-bold">{t.date}</td>
                                                <td className="p-3 text-gray-500 uppercase font-black text-[9px]">{t.type}</td>
                                                <td className="p-3 font-mono">{t.refNo}</td>
                                                <td className={`p-3 text-right font-bold ${t.type === 'INVOICE' ? 'text-blue-900' : 'text-green-600'}`}>
                                                    {t.type === 'INVOICE' ? '' : '-'}${t.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-3 text-right font-black text-blue-900">${runningBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })}
                                    {customerTransactions.length === 0 && (
                                        <tr><td colSpan={5} className="p-20 text-center italic text-gray-400">No activity for the selected period.</td></tr>
                                    )}
                                </tbody>
                                <tfoot className="border-t-2 border-[#003366]">
                                    <tr>
                                        <td colSpan={4} className="p-4 text-right font-black uppercase text-[10px] tracking-widest text-gray-400">Current Balance:</td>
                                        <td className="p-4 text-right text-3xl font-black text-[#003366] font-mono leading-none">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="mt-20 pt-10 border-t border-gray-100 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">
                                Thank you for your continued business!
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatementForm;
