import React, { useState, useMemo, useRef } from 'react';
import { Customer, Transaction } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
    customers: Customer[];
    transactions: Transaction[];
    onClose: () => void;
}

type StatementType = 'BALANCE_FORWARD' | 'OPEN_ITEM' | 'TRANSACTION';
type BalanceStatus = 'OPEN' | 'OVERDUE' | 'ALL';

const StatementForm: React.FC<Props> = ({ customers, transactions, onClose }) => {
    const [statementType, setStatementType] = useState<StatementType>('BALANCE_FORWARD');
    const [balanceStatus, setBalanceStatus] = useState<BalanceStatus>('OPEN');
    const [startDate, setStartDate] = useState('01/01/2026');
    const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-US'));
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);

    // Calculate balances for each customer
    const customerListWithBalances = useMemo(() => {
        return customers.map(c => {
            const custTxs = transactions.filter(t => t.entityId === c.id);
            const totalBalance = custTxs.reduce((acc, t) => {
                if (['INVOICE', 'SALES_RECEIPT'].includes(t.type)) return acc + t.total;
                if (['PAYMENT', 'CREDIT_MEMO'].includes(t.type)) return acc - t.total;
                return acc;
            }, 0);

            const overdueBalance = custTxs
                .filter(t => t.type === 'INVOICE' && t.status === 'OPEN' && t.dueDate && new Date(t.dueDate) < new Date())
                .reduce((acc, t) => acc + t.total, 0);

            return {
                ...c,
                totalBalance,
                overdueBalance
            };
        });
    }, [customers, transactions]);

    const filteredCustomers = useMemo(() => {
        return customerListWithBalances.filter(c => {
            if (balanceStatus === 'OPEN') return c.totalBalance > 0;
            if (balanceStatus === 'OVERDUE') return c.overdueBalance > 0;
            return true;
        });
    }, [customerListWithBalances, balanceStatus]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedCustomerIds(filteredCustomers.map(c => c.id));
        } else {
            setSelectedCustomerIds([]);
        }
    };

    const toggleSelectCustomer = (id: string) => {
        setSelectedCustomerIds(prev =>
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    };

    const getStatementData = (custId: string) => {
        const custTxs = transactions.filter(t => t.entityId === custId)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let resultTxs: any[] = [];
        let balanceForward = 0;

        if (statementType === 'BALANCE_FORWARD') {
            const beforeStart = custTxs.filter(t => new Date(t.date) < new Date(startDate));
            balanceForward = beforeStart.reduce((acc, t) => {
                if (['INVOICE', 'SALES_RECEIPT'].includes(t.type)) return acc + t.total;
                if (['PAYMENT', 'CREDIT_MEMO'].includes(t.type)) return acc - t.total;
                return acc;
            }, 0);

            resultTxs = custTxs.filter(t =>
                new Date(t.date) >= new Date(startDate) &&
                new Date(t.date) <= new Date(endDate)
            );
        } else if (statementType === 'OPEN_ITEM') {
            resultTxs = custTxs.filter(t => t.status === 'OPEN' || t.type === 'PAYMENT'); // Payments usually shown in open item if unapplied
        } else {
            resultTxs = custTxs.filter(t =>
                new Date(t.date) >= new Date(startDate) &&
                new Date(t.date) <= new Date(endDate)
            );
        }

        const finalBalance = resultTxs.reduce((acc, t) => {
            if (['INVOICE', 'SALES_RECEIPT'].includes(t.type)) return acc + t.total;
            if (['PAYMENT', 'CREDIT_MEMO'].includes(t.type)) return acc - t.total;
            return acc;
        }, balanceForward);

        return { transactions: resultTxs, balanceForward, finalBalance };
    };

    const handleDownloadPDF = async () => {
        if (!previewRef.current) return;
        setIsGeneratingPDF(true);

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const elements = previewRef.current.querySelectorAll('.statement-page');

            for (let i = 0; i < elements.length; i++) {
                const element = elements[i] as HTMLElement;
                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false
                });
                const imgData = canvas.toDataURL('image/png');

                if (i > 0) doc.addPage();
                doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
            }

            doc.save(`Statements_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans overflow-hidden">
            <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
                <div className="p-4 bg-gray-100 border-b flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-serif italic text-[#003366] drop-shadow-sm">Create Statements</h2>
                    </div>
                    <div className="flex gap-3">
                        {!showPreview ? (
                            <button onClick={() => setShowPreview(true)} disabled={selectedCustomerIds.length === 0} className="bg-[#0077c5] text-white px-8 py-2 text-xs font-black rounded shadow-md hover:bg-[#005fa0] transition-colors uppercase tracking-widest disabled:opacity-50">Preview</button>
                        ) : (
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPDF}
                                className="bg-green-600 text-white px-8 py-2 text-xs font-black rounded shadow-md hover:bg-green-700 transition-colors uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
                            >
                                {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
                            </button>
                        )}
                        <button onClick={onClose} className="bg-white border border-gray-400 px-8 py-2 text-xs font-black rounded hover:bg-gray-50 transition-colors uppercase tracking-widest shadow-sm">Close</button>
                    </div>
                </div>

                {!showPreview ? (
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fa]">
                        {/* Options Bar */}
                        <div className="p-6 bg-white border-b grid grid-cols-4 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Statement Type</label>
                                <select className="w-full border-b-2 border-blue-200 p-2 text-sm font-bold bg-transparent" value={statementType} onChange={e => setStatementType(e.target.value as StatementType)}>
                                    <option value="BALANCE_FORWARD">Balance Forward</option>
                                    <option value="OPEN_ITEM">Open Item</option>
                                    <option value="TRANSACTION">Transaction Statement</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Statement Date</label>
                                <input className="w-full border-b font-bold p-2 text-sm bg-transparent" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Start Date</label>
                                <input className="w-full border-b font-bold p-2 text-sm bg-transparent" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Customer Status</label>
                                <select className="w-full border-b-2 border-blue-200 p-2 text-sm font-bold bg-transparent" value={balanceStatus} onChange={e => setBalanceStatus(e.target.value as BalanceStatus)}>
                                    <option value="OPEN">Open Balances</option>
                                    <option value="OVERDUE">Overdue Balances</option>
                                    <option value="ALL">All Customers</option>
                                </select>
                            </div>
                        </div>

                        {/* Customer List */}
                        <div className="flex-1 overflow-auto p-6">
                            <div className="bg-white border rounded shadow-sm overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#003366] text-white font-black uppercase tracking-widest text-[10px]">
                                        <tr>
                                            <th className="p-3 w-10">
                                                <input type="checkbox" checked={selectedCustomerIds.length === filteredCustomers.length && filteredCustomers.length > 0} onChange={e => handleSelectAll(e.target.checked)} />
                                            </th>
                                            <th className="p-3">Customer</th>
                                            <th className="p-3">Email</th>
                                            <th className="p-3 text-right">Balance</th>
                                            <th className="p-3 text-right">Overdue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredCustomers.map(c => (
                                            <tr key={c.id} className={`hover:bg-blue-50 transition-colors ${selectedCustomerIds.includes(c.id) ? 'bg-blue-50' : ''}`}>
                                                <td className="p-3">
                                                    <input type="checkbox" checked={selectedCustomerIds.includes(c.id)} onChange={() => toggleSelectCustomer(c.id)} />
                                                </td>
                                                <td className="p-3 font-bold text-blue-900">{c.name}</td>
                                                <td className="p-3 text-gray-500 italic">{c.email || 'no-email@example.com'}</td>
                                                <td className="p-3 text-right font-mono font-bold">${c.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className={`p-3 text-right font-mono ${c.overdueBalance > 0 ? 'text-red-500 font-bold' : 'text-gray-300'}`}>
                                                    ${c.overdueBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Bottom Total */}
                        <div className="p-4 bg-gray-100 border-t flex justify-end gap-10">
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Selected Customers</p>
                                <p className="text-2xl font-black text-blue-900">{selectedCustomerIds.length}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Selected Balance</p>
                                <p className="text-2xl font-black text-[#003366] font-mono">
                                    ${filteredCustomers
                                        .filter(c => selectedCustomerIds.includes(c.id))
                                        .reduce((acc, c) => acc + c.totalBalance, 0)
                                        .toLocaleString(undefined, { minimumFractionDigits: 2 })
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div ref={previewRef} className="flex-1 bg-gray-500 p-8 overflow-auto flex flex-col items-center custom-scrollbar gap-8">
                        <button onClick={() => setShowPreview(false)} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-xs font-bold transition-all backdrop-blur-sm self-start sticky top-0 z-10">← Back to Selection</button>

                        {selectedCustomerIds.map(custId => {
                            const customer = customers.find(c => c.id === custId);
                            const { transactions: previewTxs, balanceForward, finalBalance } = getStatementData(custId);
                            let runningTotal = balanceForward;

                            return (
                                <div key={custId} className="statement-page w-[800px] bg-white shadow-2xl p-16 flex flex-col min-h-[1000px] mb-10 relative">
                                    <div className="flex justify-between items-start mb-20">
                                        <div className="space-y-2">
                                            <h1 className="text-4xl font-serif text-[#003366] uppercase tracking-widest font-black">Statement</h1>
                                            <div className="text-xs text-gray-400 font-bold uppercase">Statement Date: {endDate}</div>
                                            <div className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Type: {statementType.replace('_', ' ')}</div>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <div className="text-sm font-bold text-gray-800">Your Business Name, Inc.</div>
                                            <div className="text-[10px] text-gray-500">123 Business Way, Suite 100</div>
                                            <div className="text-[10px] text-gray-500">New York, NY 10001</div>
                                        </div>
                                    </div>

                                    <div className="mb-20">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">To:</div>
                                        <div className="text-lg font-black text-blue-900">{customer?.name}</div>
                                        <div className="text-sm text-gray-600 italic">{customer?.email || 'Customer Address...'}</div>
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
                                            {statementType === 'BALANCE_FORWARD' && (
                                                <tr className="bg-gray-50 font-bold border-b border-gray-100 italic">
                                                    <td className="p-3">{startDate}</td>
                                                    <td className="p-3 uppercase text-[9px]">Balance Forward</td>
                                                    <td className="p-3">-</td>
                                                    <td className="p-3 text-right">-</td>
                                                    <td className="p-3 text-right text-blue-900">${balanceForward.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            )}
                                            {previewTxs.map((t, i) => {
                                                const amount = ['INVOICE', 'SALES_RECEIPT'].includes(t.type) ? t.total : -t.total;
                                                runningTotal += amount;
                                                return (
                                                    <tr key={t.id} className="border-b border-gray-100">
                                                        <td className="p-3 font-bold">{t.date}</td>
                                                        <td className="p-3 text-gray-500 uppercase font-black text-[9px]">{t.type}</td>
                                                        <td className="p-3 font-mono">{t.refNo}</td>
                                                        <td className={`p-3 text-right font-bold ${amount > 0 ? 'text-blue-900' : 'text-green-600'}`}>
                                                            ${Math.abs(t.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            {amount < 0 && ' (CR)'}
                                                        </td>
                                                        <td className="p-3 text-right font-black text-blue-900">${runningTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                );
                                            })}
                                            {previewTxs.length === 0 && statementType !== 'BALANCE_FORWARD' && (
                                                <tr><td colSpan={5} className="p-20 text-center italic text-gray-400">No activity for the selected period.</td></tr>
                                            )}
                                        </tbody>
                                        <tfoot className="border-t-2 border-[#003366]">
                                            <tr>
                                                <td colSpan={4} className="p-4 text-right font-black uppercase text-[10px] tracking-widest text-gray-400">Total Due:</td>
                                                <td className="p-4 text-right text-3xl font-black text-[#003366] font-mono leading-none">${finalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        </tfoot>
                                    </table>

                                    <div className="mt-20 pt-10 border-t border-gray-100 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">
                                        Please make your checks payable to Your Business Name, Inc.
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatementForm;
