
import React, { useState } from 'react';
import { Account, Vendor, Customer, Transaction } from '../types';

interface Props {
    accounts: Account[];
    vendors: Vendor[];
    customers: Customer[];
    onSave: (tx: Transaction) => void;
    onClose: () => void;
}

const DepositForm: React.FC<Props> = ({ accounts, vendors, customers, onSave, onClose }) => {
    const [depositToId, setDepositToId] = useState(accounts.find(a => a.type === 'Bank')?.id || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [memo, setMemo] = useState('');
    const [rows, setRows] = useState<any[]>([
        { id: Math.random().toString(), entityId: '', accountId: '', memo: '', amount: 0, pmtMethod: 'Check', refNo: '' }
    ]);

    const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
    const entities = [...vendors.map(v => ({ id: v.id, name: v.name, type: 'Vendor' })), ...customers.map(c => ({ id: c.id, name: c.name, type: 'Customer' }))];

    const handleRecord = () => {
        if (!depositToId) return alert("Select an account to deposit to.");
        const tx: Transaction = {
            id: Math.random().toString(),
            type: 'DEPOSIT',
            refNo: 'DEP-' + Date.now().toString().slice(-4),
            date,
            entityId: 'Multi',
            total,
            status: 'CLOSED',
            bankAccountId: depositToId,
            items: rows.map(r => ({
                id: r.id,
                description: r.memo || memo,
                quantity: 1,
                rate: r.amount,
                amount: r.amount,
                tax: false,
                entityId: r.entityId,
                accountId: r.accountId
            }))
        };
        onSave(tx);
        onClose();
    };

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
            <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
                <div className="p-4 bg-gray-100 border-b flex justify-between items-center shadow-sm">
                    <h2 className="text-3xl font-serif italic text-[#003366] drop-shadow-sm">Make Deposits</h2>
                    <div className="flex gap-3">
                        <button onClick={handleRecord} className="bg-[#0077c5] text-white px-8 py-2 text-xs font-black rounded shadow-md hover:bg-[#005fa0] transition-colors uppercase tracking-widest">Save & Close</button>
                        <button onClick={onClose} className="bg-white border border-gray-400 px-8 py-2 text-xs font-black rounded hover:bg-gray-50 transition-colors uppercase tracking-widest shadow-sm">Cancel</button>
                    </div>
                </div>

                <div className="p-8 space-y-8 flex-1 overflow-auto bg-[#f8f9fa]">
                    <div className="flex gap-12 bg-white p-6 border rounded shadow-md">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Deposit To</label>
                            <select className="border-b-2 border-blue-200 p-1 text-sm bg-blue-50/10 font-bold outline-none w-64 focus:border-blue-500" value={depositToId} onChange={e => setDepositToId(e.target.value)}>
                                {accounts.filter(a => a.type === 'Bank').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Date</label>
                            <input className="border-b-2 border-gray-200 p-1 text-xs bg-transparent outline-none font-bold focus:border-blue-500" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="bg-white border-2 border-gray-300 rounded overflow-hidden shadow-xl">
                        <table className="w-full text-[11px] text-left border-collapse">
                            <thead className="bg-[#e8e8e8] border-b-2 border-gray-400 text-[#003366] font-black uppercase">
                                <tr>
                                    <th className="px-4 py-2 border-r">Received From</th>
                                    <th className="px-4 py-2 border-r">From Account</th>
                                    <th className="px-4 py-2 border-r">Memo</th>
                                    <th className="px-4 py-2 border-r">ChkNo.</th>
                                    <th className="px-4 py-2 border-r">Pmt Meth.</th>
                                    <th className="px-4 py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={r.id} className="border-b hover:bg-blue-50/30">
                                        <td className="p-0 border-r">
                                            <select className="w-full h-full p-2 bg-transparent outline-none appearance-none" value={r.entityId} onChange={e => {
                                                const nr = [...rows]; nr[i].entityId = e.target.value; setRows(nr);
                                            }}>
                                                <option value="">--Select Entity--</option>
                                                {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-0 border-r">
                                            <select className="w-full h-full p-2 bg-transparent outline-none appearance-none font-bold" value={r.accountId} onChange={e => {
                                                const nr = [...rows]; nr[i].accountId = e.target.value; setRows(nr);
                                            }}>
                                                <option value="">--Select Account--</option>
                                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-0 border-r"><input className="w-full h-full p-2 bg-transparent outline-none italic" value={r.memo} onChange={e => {
                                            const nr = [...rows]; nr[i].memo = e.target.value; setRows(nr);
                                        }} /></td>
                                        <td className="p-0 border-r"><input className="w-full h-full p-2 bg-transparent outline-none text-right font-mono" value={r.refNo} onChange={e => {
                                            const nr = [...rows]; nr[i].refNo = e.target.value; setRows(nr);
                                        }} /></td>
                                        <td className="p-0 border-r">
                                            <select className="w-full h-full p-2 bg-transparent outline-none appearance-none" value={r.pmtMethod} onChange={e => {
                                                const nr = [...rows]; nr[i].pmtMethod = e.target.value; setRows(nr);
                                            }}>
                                                <option>Check</option><option>Cash</option><option>Credit Card</option><option>Direct Deposit</option>
                                            </select>
                                        </td>
                                        <td className="p-0"><input type="number" className="w-full h-full p-2 text-right bg-transparent outline-none font-black text-blue-900" value={r.amount || ''} onChange={e => {
                                            const nr = [...rows]; nr[i].amount = parseFloat(e.target.value) || 0; setRows(nr);
                                        }} /></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-[#003366] text-white">
                                <tr>
                                    <td colSpan={5} className="p-3 text-right font-black uppercase text-[10px] tracking-widest opacity-70">Total Deposit:</td>
                                    <td className="p-3 text-right font-black font-mono text-xl">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <button onClick={() => setRows([...rows, { id: Math.random().toString(), entityId: '', accountId: '', memo: '', amount: 0, pmtMethod: 'Check', refNo: '' }])} className="text-blue-600 font-bold text-xs uppercase hover:underline">+ Add more lines</button>
                </div>
            </div>
        </div>
    );
};

export default DepositForm;
