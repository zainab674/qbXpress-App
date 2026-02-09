
import React, { useState, useRef } from 'react';
import { Customer, Transaction } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
    customers: Customer[];
    transactions: Transaction[];
    onClose: () => void;
}

const CollectionLetterGenerator: React.FC<Props> = ({ customers, transactions, onClose }) => {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [letterType, setLetterType] = useState<'Standard' | 'Urgent' | 'Formal'>('Standard');
    const [isGenerating, setIsGenerating] = useState(false);
    const letterRef = useRef<HTMLDivElement>(null);

    const customer = customers.find(c => c.id === selectedCustomerId);
    const balance = transactions
        .filter(t => t.entityId === selectedCustomerId && (t.type === 'INVOICE' || t.type === 'BILL' || t.type === 'SALES_RECEIPT'))
        .reduce((sum, t) => sum + (t.status === 'OPEN' || t.status === 'OVERDUE' ? t.total : 0), 0);

    const handleGeneratePDF = async () => {
        if (!letterRef.current || !customer) return;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(letterRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Collection_Letter_${customer.name.replace(/\s+/g, '_')}.pdf`);
        } catch (err) {
            alert("Failed to generate PDF");
        } finally {
            setIsGenerating(false);
        }
    };

    const getLetterContent = () => {
        if (!customer) return "Please select a customer to generate a letter.";

        const date = new Date().toLocaleDateString();
        const header = `${date}\n\n${customer.name}\n${customer.address}\n\nRE: Outstanding Balance of $${balance.toFixed(2)}`;

        const templates = {
            Standard: `Dear ${customer.name},\n\nWe are writing to remind you of your outstanding account balance. According to our records, your balance of $${balance.toFixed(2)} is now past due. We would appreciate it if you could remit payment at your earliest convenience.\n\nThank you for your business.`,
            Urgent: `URGENT NOTICE\n\nDear ${customer.name},\n\nOur records show that your account balance of $${balance.toFixed(2)} is significantly overdue. Total payment is required within 7 days to avoid a suspension of services and further collection actions. Please contact our office immediately.`,
            Formal: `Formal Demand for Payment\n\nTo: ${customer.name},\n\nThis letter serves as formal notice regarding your unpaid balance of $${balance.toFixed(2)}. Despite multiple reminders, we have yet to receive payment. We expect full payment by ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}.`
        };

        return `${header}\n\n${templates[letterType]}\n\nSincerely,\nAccounts Receivable\n `;
    };

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col font-sans select-none overflow-hidden text-gray-900">
            <div className="bg-[#003366] text-white p-2 flex justify-between items-center shadow-md">
                <h2 className="text-sm font-bold flex items-center gap-2">✉️ Prepare Collection Letters</h2>
                <button onClick={onClose} className="hover:bg-red-600 px-2 rounded font-bold">✕</button>
            </div>

            <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                <div className="w-80 space-y-4 bg-white p-4 border border-gray-300 shadow-sm rounded-lg overflow-y-auto">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Select Customer</label>
                        <select className="w-full border p-2 text-xs" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                            <option value="">&lt;Select Customer&gt;</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Template Style</label>
                        <div className="space-y-2 text-xs">
                            {['Standard', 'Urgent', 'Formal'].map(type => (
                                <label key={type} className="flex items-center gap-2 p-2 border border-gray-100 rounded hover:bg-gray-50 cursor-pointer">
                                    <input type="radio" checked={letterType === type} onChange={() => setLetterType(type as any)} />
                                    <span className="font-bold">{type} Notice</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <div className="text-[10px] text-gray-500 flex justify-between mb-1">
                            <span>Balance Calculated:</span>
                            <span className="font-black text-red-600">${balance.toFixed(2)}</span>
                        </div>
                        <button
                            disabled={!customer || isGenerating}
                            onClick={handleGeneratePDF}
                            className="w-full bg-[#003366] text-white p-3 rounded font-bold text-xs shadow-lg hover:bg-black transition-colors disabled:opacity-50"
                        >
                            {isGenerating ? 'Generating...' : 'Save as PDF'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-white border border-gray-300 shadow-xl rounded-lg p-10 overflow-auto font-serif">
                    <div ref={letterRef} className="bg-white p-8">
                        <div className="whitespace-pre-wrap leading-relaxed text-sm max-w-2xl mx-auto italic opacity-50 mb-8">[COMPANY LOGO]</div>
                        <div className="whitespace-pre-wrap leading-relaxed text-sm max-w-2xl mx-auto">
                            {getLetterContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CollectionLetterGenerator;
