
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Account, Vendor, Customer } from '../types';

interface Props {
    account: Account;
    transactions: Transaction[];
    accounts: Account[];
    vendors: Vendor[];
    customers: Customer[];
    onSave: (tx: Transaction) => void;
    onClose: () => void;
}

const AccountRegister: React.FC<Props> = ({ account, transactions, accounts, vendors, customers, onSave, onClose }) => {
    const [filterType, setFilterType] = useState('All');
    const [isTwoLine, setIsTwoLine] = useState(true);

    const entities = useMemo(() => [
        ...vendors.map(v => ({ id: v.id, name: v.name, type: 'Vendor' })),
        ...customers.map(c => ({ id: c.id, name: c.name, type: 'Customer' }))
    ], [vendors, customers]);

    const accountTransactions = useMemo(() => {
        const txs = transactions.filter(t =>
            t.bankAccountId === account.id ||
            t.transferFromId === account.id ||
            t.transferToId === account.id ||
            t.items.some(i => i.accountId === account.id)
        );

        // Sort by date
        return txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions, account.id]);

    const [rows, setRows] = useState<any[]>([]);

    useEffect(() => {
        let runningBalance = 0;
        const mapped = accountTransactions.map(t => {
            const isLiabilityOrEquity = ['Accounts Payable', 'Credit Card', 'Other Current Liability', 'Long Term Liability', 'Equity', 'Income'].includes(account.type);
            let amount = t.total;
            let isIncrease = false;

            if (t.type === 'JOURNAL_ENTRY') {
                const line = t.items.find(i => i.accountId === account.id);
                const lineAmount = line?.amount || 0;
                isIncrease = isLiabilityOrEquity ? lineAmount < 0 : lineAmount > 0;
                amount = Math.abs(lineAmount);
            } else if (isLiabilityOrEquity) {
                if (t.type === 'BILL' || t.type === 'CC_CHARGE' || t.type === 'PAYCHECK') {
                    isIncrease = true;
                } else if (t.type === 'BILL_PAYMENT' || t.type === 'CHECK' || t.type === 'VENDOR_CREDIT' || t.type === 'TAX_PAYMENT') {
                    isIncrease = false;
                } else {
                    // Fallback: check if the line specifically credited this account
                    const line = t.items.find(i => i.accountId === account.id);
                    isIncrease = line ? line.amount < 0 : false;
                }
            } else {
                if (t.type === 'DEPOSIT' || t.type === 'SALES_RECEIPT' || t.type === 'PAYMENT' || t.transferToId === account.id) {
                    isIncrease = true;
                } else if (t.type === 'CHECK' || t.type === 'BILL_PAYMENT' || t.transferFromId === account.id || t.type === 'PAYCHECK' || t.type === 'TAX_PAYMENT') {
                    isIncrease = false;
                } else {
                    const line = t.items.find(i => i.accountId === account.id);
                    isIncrease = line ? line.amount > 0 : false;
                }
            }

            runningBalance += isIncrease ? amount : -amount;

            return {
                ...t,
                isIncrease,
                runningBalance,
                payee: entities.find(e => e.id === t.entityId)?.name || 'Multiple...'
            };
        });
        setRows(mapped);
    }, [accountTransactions, entities, account]);

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col font-sans select-none">
            {/* Register Header */}
            <div className="bg-white border-b border-gray-400 p-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-900 rounded flex items-center justify-center text-white font-bold text-xl shadow-inner">R</div>
                    <div>
                        <h1 className="text-xl font-bold text-blue-900 uppercase tracking-tight">{account.name} Register</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase italic mt-0.5">Chapter 4 Match: Bank Account Ledger View</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={isTwoLine} onChange={e => setIsTwoLine(e.target.checked)} id="twoline" />
                        <label htmlFor="twoline" className="font-bold text-gray-600">1-Line / 2-Line</label>
                    </div>
                    <button onClick={onClose} className="bg-white border border-gray-400 px-6 py-1 text-xs font-bold rounded hover:bg-gray-50 uppercase tracking-tighter shadow-sm">Close</button>
                </div>
            </div>

            {/* Control Bar */}


            {/* Register Grid */}
            <div className="flex-1 overflow-auto bg-[#fff] m-1 border-2 border-gray-300 rounded shadow-inner custom-scrollbar">
                <table className="w-full text-[11px] border-collapse">
                    <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-400 z-10 text-gray-600 font-bold text-left shadow-sm">
                        <tr>
                            <th className="px-2 py-1 border-r w-24">Date</th>
                            <th className="px-2 py-1 border-r w-20">Number</th>
                            <th className="px-2 py-1 border-r">Payee</th>
                            <th className="px-2 py-1 border-r text-right w-24">Payment</th>
                            <th className="px-2 py-1 border-r w-8">C</th>
                            <th className="px-2 py-1 border-r text-right w-24">Deposit</th>
                            <th className="px-2 py-1 text-right w-32 pr-4">Balance</th>
                        </tr>
                        {isTwoLine && (
                            <tr className="bg-[#f0f0f0] border-b border-gray-300">
                                <th className="px-2 py-0.5 border-r font-normal italic opacity-60">Type</th>
                                <th className="px-2 py-0.5 border-r" colSpan={2}>
                                    <div className="flex justify-between">
                                        <span className="font-normal italic opacity-60">Account</span>
                                        <span className="font-normal italic opacity-60 pr-2">Memo</span>
                                    </div>
                                </th>
                                <th colSpan={4}></th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <React.Fragment key={r.id}>
                                <tr className={`h-8 hover:bg-yellow-50 transition-colors border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-[#fcfcff]'}`}>
                                    <td className="px-2 border-r border-gray-200 font-bold">{r.date}</td>
                                    <td className="px-2 border-r border-gray-200 font-mono text-gray-400">{r.refNo}</td>
                                    <td className="px-2 border-r border-gray-200 font-black text-blue-900 group relative">
                                        {r.payee}
                                        <button className="absolute right-1 opacity-0 group-hover:opacity-100 text-[8px] text-blue-500">▼</button>
                                    </td>
                                    <td className="px-2 border-r border-gray-200 text-right font-black text-red-700 font-mono">
                                        {!r.isIncrease ? `$${r.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                                    </td>
                                    <td className="px-2 border-r border-gray-200 text-center font-bold text-blue-600 italic">
                                        {r.status === 'CLEARED' ? '✔' : ''}
                                    </td>
                                    <td className="px-2 border-r border-gray-200 text-right font-black text-green-700 font-mono">
                                        {r.isIncrease ? `$${r.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                                    </td>
                                    <td className="px-2 text-right font-black text-blue-900 font-mono pr-4 bg-gray-50/30">
                                        ${r.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                {isTwoLine && (
                                    <tr className={`h-6 border-b border-gray-300 transition-colors ${i % 2 === 0 ? 'bg-[#f8f9ff]' : 'bg-[#f0f2ff]'}`}>
                                        <td className="px-2 border-r border-gray-200 font-bold text-[9px] text-blue-600 italic uppercase bg-blue-50/50">{r.type}</td>
                                        <td className="px-2 border-r border-gray-200" colSpan={2}>
                                            <div className="flex justify-between items-center h-full">
                                                <span className="font-bold text-gray-500 uppercase text-[9px] tracking-tight hover:text-blue-600 cursor-pointer">
                                                    {r.items?.[0]?.description || 'Multiple Accounts...'}
                                                </span>
                                                <span className="italic text-gray-400 text-[10px] truncate max-w-[300px] font-serif">
                                                    {r.memo || 'No memo enterred...'}
                                                </span>
                                            </div>
                                        </td>
                                        <td colSpan={4} className="bg-gray-100/10"></td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {/* Empty New Entry Row */}

                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <tr key={n} className="h-8 border-b border-gray-100 opacity-20"><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Register Footer */}
            <div className="bg-[#003366] p-4 flex justify-between items-center text-white border-t-4 border-gray-400">
                <div className="flex gap-8">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase opacity-60 tracking-widest">Ending Balance</span>
                        <span className="text-2xl font-black font-mono leading-none">${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {account.type === 'Credit Card' && (
                        <div className="flex flex-col border-l border-white/20 pl-8">
                            <span className="text-[9px] font-bold uppercase opacity-60 tracking-widest">Available Credit</span>
                            <span className="text-xl font-black text-green-400 leading-none">$15,000.00</span>
                        </div>
                    )}
                </div>
                <div className="flex gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest italic pr-4">
                    Use banking forms to enter new transactions
                </div>
            </div>
        </div>
    );
};

export default AccountRegister;
