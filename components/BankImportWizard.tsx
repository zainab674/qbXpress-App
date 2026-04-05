import React, { useState } from 'react';
import * as api from '../services/api';
import { useData } from '../contexts/DataContext';

interface Props {
    onClose: () => void;
    onComplete: () => void;
}

const BankImportWizard: React.FC<Props> = ({ onClose, onComplete }) => {
    const { accounts } = useData();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any>(null);

    // Config State (Step 1)
    const [hasHeader, setHasHeader] = useState<boolean>(true);
    const [amountColumns, setAmountColumns] = useState<'one' | 'two'>('one');
    const [dateFormat, setDateFormat] = useState<string>('DD/MM/YYYY');
    const [selectedAccountId, setSelectedAccountId] = useState('');

    // Mapping State (Step 2)
    const [mapping, setMapping] = useState<any>({
        date: '',
        description: '',
        amount: '',
        debit: '',
        credit: '',
        chequeNumber: ''
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const bankAccounts = accounts.filter(a => a.type === 'Bank');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setError('');

        try {
            const result = await api.uploadBankFile(selectedFile);
            setPreview(result);

            // Auto-suggest mapping based on headers if they exist
            if (result.headers) {
                const suggestedMapping: any = {};
                result.headers.forEach((h: string, i: number) => {
                    const lowerH = h.toLowerCase();
                    if (lowerH.includes('date')) suggestedMapping.date = i;
                    if (lowerH.includes('desc') || lowerH.includes('memo') || lowerH.includes('detail')) suggestedMapping.description = i;
                    if (lowerH.includes('amount') || lowerH.includes('total')) suggestedMapping.amount = i;
                    if (lowerH.includes('debit') || lowerH.includes('withdrawal')) suggestedMapping.debit = i;
                    if (lowerH.includes('credit') || lowerH.includes('deposit')) suggestedMapping.credit = i;
                    if (lowerH.includes('cheque') || lowerH.includes('check')) suggestedMapping.chequeNumber = i;
                });
                setMapping(suggestedMapping);
            }
            setStep(1); // Go to config after file selection (originally it was step 1, but we can make file selection step 0 if we want, or stay in 1)
            // Actually let's make Step 1: File, Step 2: Config, Step 3: Mapping
        } catch (err: any) {
            setError(err.message || 'Failed to parse file');
        }
    };

    const handleProcessImport = async () => {
        if (!selectedAccountId) {
            setError('Please select a bank account to import into');
            return;
        }

        setIsProcessing(true);
        setError('');

        try {
            const payload = {
                mapping,
                bankAccountId: selectedAccountId,
                rows: preview.allRows || [],
                hasHeader,
                amountColumns,
                dateFormat
            };

            await api.processBankImport(payload);
            setStep(4);
        } catch (err: any) {
            setError(err.message || 'Failed to process import');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-[850px] min-h-[650px] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/20 select-none">
                {/* Header */}
                <div className="bg-white p-8 border-b">
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Let's set up your file in QuickBooks</h2>
                </div>

                {/* Content */}
                <div className="flex-1 p-10 overflow-auto">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <p className="font-bold text-sm">{error}</p>
                        </div>
                    )}

                    {step === 1 && !file && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-8">
                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-5xl shadow-inner">📤</div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-800">Select your bank statement</h3>
                                <p className="text-slate-500 mt-2">Upload your bank transactions in CSV or Excel format.</p>
                            </div>
                            <label className="bg-green-600 hover:bg-green-700 text-white px-10 py-3 rounded-full font-bold shadow-lg transition-all cursor-pointer">
                                Choose File
                                <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                            </label>
                        </div>
                    )}

                    {step === 1 && file && (
                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                            <div>
                                <h4 className="text-base font-bold text-slate-800 mb-6">Step 1: Tell us about the format of your data</h4>
                                <div className="grid grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-slate-600">Is the first row in your file a header?</p>
                                            <select
                                                value={hasHeader ? 'Yes' : 'No'}
                                                onChange={(e) => setHasHeader(e.target.value === 'Yes')}
                                                className="w-full p-2.5 border rounded-lg bg-slate-50 font-medium"
                                            >
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-slate-600">How many columns show amounts?</p>
                                            <select
                                                value={amountColumns === 'one' ? 'One column' : 'Two columns'}
                                                onChange={(e) => setAmountColumns(e.target.value === 'One column' ? 'one' : 'two')}
                                                className="w-full p-2.5 border rounded-lg bg-slate-50 font-medium"
                                            >
                                                <option value="One column">One column</option>
                                                <option value="Two columns">Two columns</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-slate-600">What's the date format used in your file?</p>
                                            <select
                                                value={dateFormat}
                                                onChange={(e) => setDateFormat(e.target.value)}
                                                className="w-full p-2.5 border rounded-lg bg-slate-50 font-medium"
                                            >
                                                <option value="">Select a date format</option>
                                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                                <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-sm font-medium text-slate-600">Target Account</p>
                                        <select
                                            value={selectedAccountId}
                                            onChange={(e) => setSelectedAccountId(e.target.value)}
                                            className="w-full p-2.5 border rounded-lg bg-slate-50 font-medium"
                                        >
                                            <option value="">Select Account...</option>
                                            {bankAccounts.map(a => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <h4 className="text-base font-bold text-slate-800">Step 2: Select the fields that correspond to your file</h4>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="border rounded-xl overflow-hidden bg-white shadow-sm h-fit">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider text-left">
                                                <th className="p-4 border-b">QuickBooks fields</th>
                                                <th className="p-4 border-b">Columns from your file</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y text-sm">
                                            {[
                                                { label: 'Date', field: 'date', required: true },
                                                { label: 'Description', field: 'description', required: true },
                                                ...(amountColumns === 'one'
                                                    ? [{ label: 'Amount', field: 'amount', required: true }]
                                                    : [
                                                        { label: 'Debit', field: 'debit', required: true },
                                                        { label: 'Credit', field: 'credit', required: true }
                                                    ]
                                                ),
                                                { label: 'Cheque number (optional)', field: 'chequeNumber', required: false }
                                            ].map(f => (
                                                <tr key={f.field}>
                                                    <td className="p-4 font-medium text-slate-600">{f.label} {f.required && <span className="text-red-500">*</span>}</td>
                                                    <td className="p-4">
                                                        <select
                                                            value={mapping[f.field] === undefined ? '' : mapping[f.field]}
                                                            onChange={(e) => setMapping({ ...mapping, [f.field]: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                                                            className="w-full p-2 border rounded bg-slate-50 text-xs font-bold text-slate-700"
                                                        >
                                                            <option value="">Select a statement field</option>
                                                            {preview.headers.map((h: string, i: number) => (
                                                                <option key={i} value={i}>Column {i + 1}: {h || `(Empty ${i + 1})`}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">File Preview (First 10 rows)</h5>
                                    <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner max-h-[400px] flex flex-col">
                                        <div className="overflow-auto flex-1">
                                            <table className="w-full text-[10px] border-collapse">
                                                <thead className="sticky top-0 bg-slate-100 z-10">
                                                    <tr>
                                                        {preview.headers.map((h: string, i: number) => {
                                                            const isMapped = Object.values(mapping).includes(i);
                                                            return (
                                                                <th key={i} className={`p-2 border-r border-b whitespace-nowrap ${isMapped ? 'bg-blue-600 text-white font-black' : 'text-slate-500'}`}>
                                                                    {h || `Col ${i + 1}`}
                                                                </th>
                                                            );
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {preview.previewRows.map((row: any[], ri: number) => (
                                                        <tr key={ri} className="border-b hover:bg-slate-50">
                                                            {row.map((cell: any, ci: number) => {
                                                                const isMapped = Object.values(mapping).includes(ci);
                                                                return (
                                                                    <td key={ci} className={`p-2 border-r whitespace-nowrap ${isMapped ? 'bg-blue-50 font-bold text-blue-900 border-x-blue-200' : 'text-slate-600'}`}>
                                                                        {String(cell)}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic">Blue highlights show currently mapped columns.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-xl">✓</div>
                            <h3 className="text-2xl font-bold text-slate-800">Success!</h3>
                            <p className="text-slate-500 mt-2">Your bank transactions were imported. Let's go review them.</p>
                            <button onClick={onComplete} className="mt-8 bg-slate-900 text-white px-12 py-3 rounded-full font-bold shadow-lg hover:bg-black transition-all">Go back to Bank Center</button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step < 4 && (
                    <div className="p-8 border-t flex justify-between items-center bg-slate-50">
                        <button
                            onClick={step === 1 ? onClose : () => setStep(prev => prev - 1)}
                            className="px-8 py-2.5 border rounded-lg font-bold text-slate-700 hover:bg-white transition-all shadow-sm"
                        >
                            Back
                        </button>

                        {step === 1 ? (
                            <button
                                onClick={() => {
                                    if (!selectedAccountId) setError('Please select a target account');
                                    else if (!dateFormat) setError('Please select a date format');
                                    else setStep(2);
                                }}
                                disabled={!file}
                                className="bg-slate-900 text-white px-12 py-3 rounded-lg font-bold shadow-xl hover:bg-black transition-all disabled:opacity-50"
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                onClick={handleProcessImport}
                                disabled={isProcessing}
                                className="bg-green-600 text-white px-12 py-3 rounded-lg font-bold shadow-xl hover:bg-green-700 transition-all flex items-center gap-2"
                            >
                                {isProcessing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</> : 'Import Transactions'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BankImportWizard;
