import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Transaction, Account, Customer, Vendor, Item } from '../types';
import ColumnSettingsDialog from './ColumnSettingsDialog';
import ModifyReportDialog from './ModifyReportDialog';
import { fetchReport, sendEmail, addCustomColumn, updateCustomColumn, fetchCustomColumns } from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import AddCustomColumnModal from './AddCustomColumnModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
    reportType: string;
    customTitle?: string;
    customCompanyName?: string;
    transactions: Transaction[];
    accounts: Account[];
    customers: Customer[];
    vendors: Vendor[];
    items: Item[];
    companyName: string;
    onClose: () => void;
    onSave: (report: any) => void;
    initialSettings?: any;
}

const availableColumnsBase = ['Date', 'Num', 'Customer', 'Due date', 'Amount', 'Open balance', 'Shipping date', '% of Income', 'Quantity'];

const ReportBuilder: React.FC<Props> = ({ reportType, customTitle, customCompanyName, transactions, accounts, customers, vendors, items, companyName, onClose, onSave, initialSettings }) => {
    const defaultSettings = {
        reportPeriod: 'Last month',
        accountingMethod: 'Cash',
        bandedRows: true,
        groupBy: 'None',
        comparison: {
            previousPeriod: false,
            previousYear: false,
            dollarChange: false,
            percentChange: false
        },
        filters: {
            accountIds: [],
            customerIds: [],
            vendorIds: [],
            classIds: [],
            transactionTypes: [],
            minAmount: '',
            maxAmount: '',
            clearedStatus: 'All',
            memoContains: '',
        },
        fontsNumbers: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            negativeFormat: 'minus',
            negativeColor: 'black',
            showCents: true,
        },
        orderedColumns: availableColumnsBase,
        selectedColumns: availableColumnsBase
    };

    const s = initialSettings?.settings || initialSettings || defaultSettings;

    const [activeView, setActiveView] = useState<'TABLE' | 'CHART'>('TABLE');
    const [reportTitle, setReportTitle] = useState(customTitle || `${reportType.charAt(0) + reportType.slice(1).toLowerCase()} Report`);
    const [showSaveAs, setShowSaveAs] = useState(false);
    const [saveAsName, setSaveAsName] = useState(reportTitle);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editableCompanyName, setEditableCompanyName] = useState(customCompanyName || companyName);
    const [isEditingCompany, setIsEditingCompany] = useState(false);
    const [reportPeriod, setReportPeriod] = useState(s.reportPeriod || defaultSettings.reportPeriod);
    const [accountingMethod, setAccountingMethod] = useState<'Accrual' | 'Cash'>(s.accountingMethod || defaultSettings.accountingMethod);
    const [bandedRows, setBandedRows] = useState(s.bandedRows !== undefined ? s.bandedRows : defaultSettings.bandedRows);
    const [showCustomize, setShowCustomize] = useState(false);
    const [customizeTab, setCustomizeTab] = useState<'DISPLAY' | 'FILTERS' | 'HEADER_FOOTER' | 'FONTS'>('DISPLAY');
    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const [showAddCustom, setShowAddCustom] = useState(false);
    const [customColumns, setCustomColumns] = useState<string[]>([]);
    const [customColumnDefinitions, setCustomColumnDefinitions] = useState<any[]>([]);
    const [editingColumn, setEditingColumn] = useState<any>(null);
    const [groupBy, setGroupBy] = useState(s.groupBy || defaultSettings.groupBy);
    const [comparison, setComparison] = useState(s.comparison || defaultSettings.comparison);

    const reportRef = React.useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [filters, setFilters] = useState<any>(s.filters || defaultSettings.filters);

    const [fontsNumbers, setFontsNumbers] = useState(s.fontsNumbers || defaultSettings.fontsNumbers);

    const [liveData, setLiveData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const toDateStr = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const calculateDateRange = (range: string) => {
        const now = new Date();
        const today = toDateStr(now);
        let start = new Date();
        let end = new Date();

        switch (range) {
            case 'Today':
                return { from: today, to: today };
            case 'This Week':
                const day = now.getDay();
                start.setDate(now.getDate() - day);
                return { from: toDateStr(start), to: today };
            case 'This Month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                return { from: toDateStr(start), to: today };
            case 'Last month':
            case 'Last Month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                return { from: toDateStr(start), to: toDateStr(end) };
            case 'This Quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                start = new Date(now.getFullYear(), quarter * 3, 1);
                return { from: toDateStr(start), to: today };
            case 'This year to date':
            case 'This fiscal year':
            case 'This Fiscal Year-to-date':
                start = new Date(now.getFullYear(), 0, 1);
                return { from: toDateStr(start), to: today };
            case 'This year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                return { from: toDateStr(start), to: toDateStr(end) };
            default:
                return { from: '2024-01-01', to: today }; // Default fallback
        }
    };

    React.useEffect(() => {
        const fetchPreviewData = async () => {
            setLoading(true);
            try {
                const range = calculateDateRange(reportPeriod);
                let endpoint = 'general-ledger';
                const lowerType = reportType.toLowerCase();

                if (lowerType.includes('profit')) endpoint = 'profit-and-loss';
                else if (lowerType.includes('balance')) endpoint = 'balance-sheet';
                else if (lowerType.includes('aging')) endpoint = lowerType.includes('ar') ? 'ar-aging' : 'ap-aging';

                const data = await fetchReport(endpoint, {
                    fromDate: range.from,
                    toDate: range.to,
                    transactionType: reportType,
                    previousPeriod: comparison.previousPeriod,
                    previousYear: comparison.previousYear
                });

                if (data.customColumns) {
                    setCustomColumns(data.customColumns);
                    // Fetch full definitions for editing
                    const fullCols = await fetchCustomColumns(reportType);
                    setCustomColumnDefinitions(fullCols);
                }

                if (data.transactions) setLiveData(data.transactions);
                else if (data.sections) {
                    // Map sections to a table-friendly format for preview if needed
                    setLiveData(data.sections.filter((s: any) => !s.isHeading).map((s: any) => ({
                        Date: range.from,
                        Customer: s.title,
                        Amount: s.value,
                        'Open balance': s.value,
                        ...s
                    })));
                } else {
                    setLiveData([]);
                }
            } catch (err) {
                console.error("Failed to fetch preview data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPreviewData();
    }, [comparison.previousPeriod, comparison.previousYear, reportPeriod, reportType]);

    const availableColumnsExtended = [...availableColumnsBase, ...customColumns];
    const [orderedColumns, setOrderedColumns] = useState<string[]>(s.orderedColumns || defaultSettings.orderedColumns);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(s.selectedColumns || defaultSettings.selectedColumns);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const formatValue = (val: any) => {
        if (typeof val !== 'number') return val ?? '-';

        const absVal = Math.abs(val);
        let formatted = absVal.toLocaleString(undefined, {
            minimumFractionDigits: fontsNumbers.showCents ? 2 : 0,
            maximumFractionDigits: fontsNumbers.showCents ? 2 : 0,
        });

        if (val < 0) {
            if (fontsNumbers.negativeFormat === 'parentheses') {
                formatted = `(${formatted})`;
            } else {
                formatted = `-${formatted}`;
            }
        }

        return (
            <span style={{ color: (val < 0 && fontsNumbers.negativeColor === 'red') ? '#e11d48' : 'inherit' }}>
                {formatted}
            </span>
        );
    };

    const handleExportCSV = () => {
        setIsExporting(true);
        try {
            const baseCols = orderedColumns.filter(col => selectedColumns.includes(col));
            let csv = baseCols.join(',') + '\n';
            liveData.forEach(row => {
                csv += baseCols.map(col => {
                    const val = row[col] ?? '-';
                    return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
                }).join(',') + '\n';
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportTitle.replace(/\s+/g, '_')}.csv`;
            a.click();
        } catch (err) {
            console.error("Export failed", err);
        } finally {
            setIsExporting(false);
        }
    };

    const handlePrintPDF = async () => {
        if (!reportRef.current) return;
        setIsPrinting(true);
        try {
            const canvas = await html2canvas(reportRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${reportTitle.replace(/\s+/g, '_')}.pdf`);
        } catch (err) {
            console.error("Print failed", err);
        } finally {
            setIsPrinting(false);
        }
    };

    const handleAddCustomColumn = async (name: string, formula: string) => {
        try {
            if (editingColumn) {
                await updateCustomColumn({ reportType: reportType, columnName: name, formula });
            } else {
                await addCustomColumn({ reportType: reportType, columnName: name, formula });
            }
            // Refresh preview data
            const range = calculateDateRange(reportPeriod);
            let endpoint = 'general-ledger';
            if (reportType.toLowerCase().includes('profit')) endpoint = 'profit-and-loss';
            else if (reportType.toLowerCase().includes('balance')) endpoint = 'balance-sheet';
            else if (reportType.toLowerCase().includes('aging')) endpoint = reportType.toLowerCase().includes('ar') ? 'ar-aging' : 'ap-aging';

            const data = await fetchReport(endpoint, {
                fromDate: range.from,
                toDate: range.to,
                transactionType: reportType,
                previousPeriod: comparison.previousPeriod,
                previousYear: comparison.previousYear
            });

            if (data.customColumns) setCustomColumns(data.customColumns);
            // Re-fetch definitions
            const fullCols = await fetchCustomColumns(reportType);
            setCustomColumnDefinitions(fullCols);

            if (data.transactions) setLiveData(data.transactions);
            else if (data.sections) {
                setLiveData(data.sections.filter((s: any) => !s.isHeading).map((s: any) => ({
                    Date: range.from,
                    Customer: s.title,
                    Amount: s.value,
                    'Open balance': s.value,
                    ...s
                })));
            }

            // Also add to selected columns if it's new
            if (!selectedColumns.includes(name)) {
                setSelectedColumns(prev => [...prev, name]);
                setOrderedColumns(prev => [...prev, name]);
            }
            setEditingColumn(null);
        } catch (err: any) {
            alert(`Failed to save custom column: ${err.message}`);
        }
    };

    const handleSaveAs = () => {
        onSave({
            title: saveAsName,
            type: reportType,
            customCompanyName: editableCompanyName,
            settings: {
                fontsNumbers,
                selectedColumns,
                orderedColumns,
                bandedRows,
                groupBy,
                comparison,
                accountingMethod,
                filters
            }
        });
        setShowSaveAs(false);
    };

    return (
        <div className="flex flex-col h-full bg-[#f4f5f8] text-gray-800 font-sans select-none">
            {/* Save As Modal */}
            {showSaveAs && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-[#f4f5f8] px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 text-sm">Memorize Report</h3>
                            <button onClick={() => setShowSaveAs(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
                        </div>
                        <div className="p-6">
                            <div className="mb-6">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Enter a name for this report</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={saveAsName}
                                    onChange={(e) => setSaveAsName(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-100 focus:border-[#2ca01c] outline-none transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveAs()}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-2">
                                <button onClick={() => setShowSaveAs(false)} className="px-4 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded transition-colors">Cancel</button>
                                <button onClick={handleSaveAs} className="px-6 py-1.5 text-xs font-bold bg-[#2ca01c] text-white rounded hover:bg-[#218315] shadow-sm transition-all active:scale-95">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Top Header */}
            <div className="bg-[#f4f5f8] border-b border-gray-200 px-6 py-3 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        Back to reports
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-white border border-gray-300 rounded p-0.5 shadow-sm">
                        <button
                            onClick={() => setActiveView('TABLE')}
                            className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${activeView === 'TABLE' ? 'bg-[#53565a] text-white shadow-inner' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Table View
                        </button>
                        <button
                            onClick={() => setActiveView('CHART')}
                            className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${activeView === 'CHART' ? 'bg-[#53565a] text-white shadow-inner' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Chart View
                        </button>
                    </div>
                    <div className="flex gap-2 ml-4">
                        <button className="bg-white border border-gray-300 px-4 py-1.5 text-xs font-bold rounded hover:bg-gray-50 flex items-center gap-2 transition-colors">
                            More actions <span className="text-[10px] opacity-60">▼</span>
                        </button>
                        <div className="relative group">
                            <button className="bg-white border border-gray-300 px-4 py-1.5 text-xs font-bold rounded hover:bg-gray-50 flex items-center gap-2 transition-colors">
                                {isExporting || isPrinting ? 'Processing...' : 'Export/Print'} <span className="text-[10px] opacity-60">▼</span>
                            </button>
                            <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-20 overflow-hidden">
                                <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-xs hover:bg-blue-50 transition-colors">Export to CSV</button>
                                <button onClick={handlePrintPDF} className="w-full text-left px-4 py-2 text-xs hover:bg-blue-50 transition-colors">Print as PDF</button>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setCustomizeTab('DISPLAY');
                                setShowCustomize(true);
                            }}
                            className="bg-white border border-gray-300 px-4 py-1.5 text-xs font-bold rounded hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                            Customize
                        </button>
                        <button
                            onClick={() => {
                                setSaveAsName(reportTitle);
                                setShowSaveAs(true);
                            }}
                            className="bg-[#2ca01c] text-white px-6 py-1.5 text-xs font-bold rounded hover:bg-[#218315] shadow-sm transition-all active:scale-95 border-none"
                        >
                            Save As
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-4 shrink-0 shadow-sm z-10">
                <div className="flex justify-between items-end">
                    <div className="flex gap-8">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Report period</label>
                            <select
                                value={reportPeriod}
                                onChange={(e) => setReportPeriod(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-1.5 text-xs bg-white w-48 outline-none hover:border-gray-400 focus:ring-2 focus:ring-green-100 transition-all font-medium"
                            >
                                <option>Last month</option>
                                <option>This year to date</option>
                                <option>This fiscal year</option>
                                <option>Custom</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-4 items-center">
                        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded transition-colors group">
                            <svg className="text-gray-400 group-hover:text-blue-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            Pivot
                        </button>
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded transition-colors group">
                                <svg className="text-gray-400 group-hover:text-blue-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 19l4-4-4-4m-4 8l4-4-4-4"></path></svg>
                                Group by: {groupBy}
                            </button>
                            <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-20 overflow-hidden">
                                {['None', 'Customer', 'Account', 'Class', 'Month', 'Quarter'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setGroupBy(opt)}
                                        className={`w-full text-left px-4 py-2 text-xs hover:bg-blue-50 transition-colors ${groupBy === opt ? 'bg-blue-50 text-blue-700 font-bold' : ''}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setCustomizeTab('FILTERS');
                                setShowCustomize(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded transition-colors group"
                        >
                            <svg className="text-gray-400 group-hover:text-blue-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                            Filter
                        </button>
                        <button
                            onClick={() => setShowAddCustom(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-gray-100 rounded transition-colors group"
                        >
                            <span className="text-lg font-black group-hover:scale-110 transition-transform">+</span>
                            Formula
                        </button>
                        <div className="relative group">
                            <button className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded transition-colors ${comparison.previousPeriod || comparison.previousYear ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                                <svg className="text-gray-400 group-hover:text-blue-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                Compare
                            </button>
                            <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-20 p-4 space-y-3">
                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Comparison Options</h5>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                                        <input type="checkbox" checked={comparison.previousPeriod} onChange={e => setComparison({ ...comparison, previousPeriod: e.target.checked })} />
                                        Previous Period (PP)
                                    </label>
                                    <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                                        <input type="checkbox" checked={comparison.previousYear} onChange={e => setComparison({ ...comparison, previousYear: e.target.checked })} />
                                        Previous Year (PY)
                                    </label>
                                    <div className="border-t pt-2 mt-2">
                                        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                                            <input type="checkbox" checked={comparison.dollarChange} onChange={e => setComparison({ ...comparison, dollarChange: e.target.checked })} />
                                            $ Change
                                        </label>
                                        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                                            <input type="checkbox" checked={comparison.percentChange} onChange={e => setComparison({ ...comparison, percentChange: e.target.checked })} />
                                            % Change
                                        </label>
                                    </div>
                                    <div className="border-t pt-2 mt-2">
                                        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                                            <input type="checkbox" checked={bandedRows} onChange={e => setBandedRows(e.target.checked)} />
                                            Banded rows
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowColumnSettings(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded transition-colors group"
                        >
                            <svg className="text-gray-400 group-hover:text-blue-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                            Columns
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-12 bg-[#f4f5f8] custom-scrollbar flex flex-col items-center">
                <style>{`
                    .report-canvas, .report-canvas * {
                        font-family: ${fontsNumbers.fontFamily} !important;
                    }
                    .report-canvas {
                        font-size: ${fontsNumbers.fontSize} !important;
                    }
                    .report-canvas th, .report-canvas td {
                        font-size: ${fontsNumbers.fontSize} !important;
                    }
                    .report-canvas td.font-mono {
                        font-variant-numeric: tabular-nums !important;
                        font-family: inherit !important;
                    }
                `}</style>
                <div
                    ref={reportRef}
                    className="report-canvas bg-white p-12 w-full max-w-5xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] min-h-[800px] flex flex-col items-center border border-gray-100 rounded-sm relative"
                >
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center rounded-sm">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
                                    <div className="absolute inset-0 blur-lg bg-green-400/20 animate-pulse rounded-full"></div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-sm font-bold text-gray-800 tracking-wider">Fetching Preview</span>
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">Updating report data...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Internal Header */}
                    <div className="w-full flex justify-between items-start mb-12">
                        <div className="flex flex-col">
                            {isEditingTitle ? (
                                <input
                                    autoFocus
                                    type="text"
                                    value={reportTitle}
                                    onChange={(e) => setReportTitle(e.target.value)}
                                    onBlur={() => setIsEditingTitle(false)}
                                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                                    className="text-xl font-bold text-gray-800 tracking-tight border-b-2 border-blue-500 outline-none pb-1 bg-transparent"
                                />
                            ) : (
                                <div
                                    className="flex items-center gap-2 group cursor-pointer"
                                    onClick={() => setIsEditingTitle(true)}
                                >
                                    <h3 className="text-xl font-bold text-gray-800 tracking-tight group-hover:text-blue-600 transition-colors">{reportTitle}</h3>
                                    <svg className="text-gray-300 group-hover:text-blue-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                </div>
                            )}
                            {isEditingCompany ? (
                                <input
                                    autoFocus
                                    type="text"
                                    value={editableCompanyName}
                                    onChange={(e) => setEditableCompanyName(e.target.value)}
                                    onBlur={() => setIsEditingCompany(false)}
                                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingCompany(false)}
                                    className="text-[14px] text-gray-700 mt-1 font-medium border-b border-blue-400 outline-none bg-transparent"
                                />
                            ) : (
                                <span
                                    className="text-[14px] text-gray-400 mt-1 font-medium cursor-pointer hover:text-blue-500 transition-colors"
                                    onClick={() => setIsEditingCompany(true)}
                                >
                                    {editableCompanyName}
                                </span>
                            )}
                            <span className="text-[12px] text-gray-400 font-medium">{reportPeriod === 'Custom' ? `${calculateDateRange(reportPeriod).from} to ${calculateDateRange(reportPeriod).to}` : reportPeriod}</span>
                        </div>

                    </div>

                    {activeView === 'CHART' ? (
                        <div className="w-full h-[500px] mt-8 bg-gray-50/30 rounded-lg p-6 border border-gray-100 flex flex-col items-center">
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart
                                    data={(() => {
                                        const chartGroups: Record<string, number> = {};
                                        liveData.forEach(r => {
                                            const key = groupBy !== 'None' ? (r[groupBy as keyof typeof r] || 'Other') : (r.Date || r.date || 'Other');
                                            const val = Number(r.total || r.Amount || 0);
                                            chartGroups[String(key)] = (chartGroups[String(key)] || 0) + val;
                                        });
                                        return Object.entries(chartGroups)
                                            .map(([name, value]) => ({ name, value }))
                                            .sort((a, b) => b.value - a.value); // Sort descending
                                    })()}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        tickFormatter={(val) => `$${val.toLocaleString()}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(val: number) => [`$${val.toLocaleString()}`, 'Total Amount']}
                                    />
                                    <Bar dataKey="value" fill="#2ca01c" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="mt-6 flex justify-center gap-8 border-t pt-4 w-full">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#2ca01c]"></div>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Volume ({groupBy === 'None' ? 'by Date' : `by ${groupBy}`})</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full">
                            {/* Table Container */}
                            <div className="w-full overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-300 bg-gray-50/50">
                                            {(() => {
                                                const baseCols = orderedColumns.filter(col => selectedColumns.includes(col));
                                                const extraCols: string[] = [];
                                                if (comparison.previousPeriod) {
                                                    extraCols.push('PP Amount');
                                                    if (comparison.dollarChange) extraCols.push('$ Change (PP)');
                                                    if (comparison.percentChange) extraCols.push('% Change (PP)');
                                                }
                                                if (comparison.previousYear) {
                                                    extraCols.push('PY Amount');
                                                    if (comparison.dollarChange) extraCols.push('$ Change (PY)');
                                                    if (comparison.percentChange) extraCols.push('% Change (PY)');
                                                }

                                                return [...baseCols, ...extraCols].map(col => (
                                                    <th
                                                        key={col}
                                                        onClick={() => {
                                                            const dir = sortConfig?.key === col && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                                                            setSortConfig({ key: col, direction: dir });
                                                        }}
                                                        className={`py-2 px-3 font-bold text-gray-600 border-r border-gray-100 group cursor-pointer hover:bg-gray-100 transition-colors ${col.includes('Amount') || col.includes('balance') || col.includes('Change') || col.includes('%') ? 'text-right' : 'text-left'}`}
                                                    >
                                                        <div className="flex items-center gap-1 justify-between">
                                                            <div className="flex items-center gap-1">
                                                                {col}
                                                                {sortConfig?.key === col && (
                                                                    <span className="text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                                )}
                                                                {customColumns.includes(col) && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const def = customColumnDefinitions.find(d => d.columnName === col);
                                                                            setEditingColumn({ name: col, formula: def?.formula || '' });
                                                                            setShowAddCustom(true);
                                                                        }}
                                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 rounded text-blue-600 transition-all ml-1"
                                                                        title="Edit Formula"
                                                                    >
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 font-normal block tracking-tight">({reportType})</span>
                                                    </th>
                                                ));
                                            })()}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(() => {
                                            if (loading) return <tr><td colSpan={10} className="py-8 text-center text-gray-400">Loading live preview...</td></tr>;
                                            if (liveData.length === 0) return <tr><td colSpan={10} className="py-8 text-center text-gray-400">No transactions found for this period.</td></tr>;

                                            let items = [...liveData];

                                            // Apply Advanced Filters
                                            if (filters) {
                                                if (filters.transactionTypes?.length > 0 && !filters.transactionTypes.includes('All')) {
                                                    items = items.filter(t => filters.transactionTypes.includes(t.type));
                                                }

                                                if (filters.minAmount) {
                                                    items = items.filter(t => Math.abs(t.total || t.Amount || 0) >= parseFloat(filters.minAmount));
                                                }

                                                if (filters.maxAmount && filters.maxAmount !== 'Any' && filters.maxAmount !== '') {
                                                    items = items.filter(t => Math.abs(t.total || t.Amount || 0) <= parseFloat(filters.maxAmount));
                                                }

                                                if (filters.clearedStatus !== 'All') {
                                                    items = items.filter(t => filters.clearedStatus === 'Cleared' ? t.cleared : !t.cleared);
                                                }

                                                if (filters.memoContains) {
                                                    items = items.filter(t => (t.memo || '').toLowerCase().includes(filters.memoContains.toLowerCase()));
                                                }
                                            }

                                            // Apply Sorting
                                            if (sortConfig) {
                                                items.sort((a, b) => {
                                                    const aVal = a[sortConfig.key as keyof typeof a] ?? '';
                                                    const bVal = b[sortConfig.key as keyof typeof b] ?? '';
                                                    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                                                    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                                                    return 0;
                                                });
                                            }

                                            const renderRow = (row: any, idx: number, isGrouped = false) => {
                                                const baseCols = orderedColumns.filter(col => selectedColumns.includes(col));
                                                const extraCols: string[] = [];
                                                if (comparison.previousPeriod) {
                                                    extraCols.push('PP Amount');
                                                    if (comparison.dollarChange) extraCols.push('$ Change (PP)');
                                                    if (comparison.percentChange) extraCols.push('% Change (PP)');
                                                }
                                                if (comparison.previousYear) {
                                                    extraCols.push('PY Amount');
                                                    if (comparison.dollarChange) extraCols.push('$ Change (PY)');
                                                    if (comparison.percentChange) extraCols.push('% Change (PY)');
                                                }

                                                return (
                                                    <tr key={row.id} className={`group cursor-default transition-colors ${bandedRows && idx % 2 !== 0 ? 'bg-gray-50/60' : 'bg-white'} hover:bg-blue-50/50`}>
                                                        {[...baseCols, ...extraCols].map(col => {
                                                            let val = row[col as keyof typeof row];

                                                            // Dynamic calculations for real comparison data if provided by backend
                                                            const amount = row.total || row.Amount || 0;
                                                            const ppVal = row.ppAmount || 0;
                                                            const pyVal = row.pyAmount || 0;

                                                            if (col === 'PP Amount') val = ppVal;
                                                            else if (col === 'PY Amount') val = pyVal;
                                                            else if (col === '$ Change (PP)') val = amount - ppVal;
                                                            else if (col === '% Change (PP)') val = ppVal ? ((amount - ppVal) / ppVal * 100) : 0;
                                                            else if (col === '$ Change (PY)') val = amount - pyVal;
                                                            else if (col === '% Change (PY)') val = pyVal ? ((amount - pyVal) / pyVal * 100) : 0;
                                                            else if (col === '% of Income') val = amount; // Will be formatted by logic below, use totalIncome if available
                                                            else if (col === 'Quantity') val = row.quantity || 1;
                                                            else if (col === 'Amount') val = amount;
                                                            else if (col === 'Open balance') val = row.open_balance || 0;
                                                            else if (customColumns.includes(col)) {
                                                                val = row.customValues?.[col] ?? '-';
                                                            }

                                                            return (
                                                                <td key={col} className={`py-2.5 px-3 text-gray-700 ${col.includes('Amount') || col.includes('balance') || col.includes('Change') || col.includes('%') ? 'font-mono text-right' : ''} ${col === 'Customer' ? 'font-semibold' : ''} ${isGrouped && col === baseCols[0] ? 'pl-8' : ''}`}>
                                                                    {formatValue(val)}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            };

                                            if (groupBy !== 'None') {
                                                const groups: Record<string, any[]> = {};
                                                items.forEach(r => {
                                                    const key = r[groupBy as keyof typeof r] || 'Other';
                                                    if (!groups[key]) groups[key] = [];
                                                    groups[key].push(r);
                                                });

                                                return Object.entries(groups).map(([groupName, rows]) => (
                                                    <React.Fragment key={groupName}>
                                                        <tr className="bg-gray-100/30">
                                                            <td colSpan={10} className="py-2 px-3 font-black text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-200">
                                                                {groupBy}: {groupName}
                                                            </td>
                                                        </tr>
                                                        {rows.map((r, i) => renderRow(r, i, true))}
                                                        <tr className="bg-white font-bold border-b border-gray-300">
                                                            <td colSpan={orderedColumns.filter(c => selectedColumns.includes(c)).indexOf('Amount')} className="py-2 px-3 text-right text-gray-400 font-medium">Total {groupName}:</td>
                                                            <td className="py-2 px-3 text-right font-mono">{formatValue(rows.reduce((acc, r) => acc + (r.total || r.Amount || 0), 0))}</td>
                                                            <td colSpan={5}></td>
                                                        </tr>
                                                    </React.Fragment>
                                                ));
                                            }

                                            return items.map((row, rowIdx) => renderRow(row, rowIdx));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Branding */}
                <div className="mt-12 flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="bg-[#2ca01c] rounded p-1">
                        <span className="text-white text-[10px] font-black">qb</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#2ca01c] tracking-tight uppercase">QuickBooks</span>
                </div>
            </div>

            <ModifyReportDialog
                isOpen={showCustomize}
                onClose={() => setShowCustomize(false)}
                initialTab={customizeTab}
                onApply={(s) => {
                    if (s.header?.reportTitle) setReportTitle(s.header.reportTitle);
                    if (s.basis) setAccountingMethod(s.basis);
                    if (s.columns) setSelectedColumns(s.columns);
                    if (s.bandedRows !== undefined) setBandedRows(s.bandedRows);
                    if (s.groupBy) setGroupBy(s.groupBy);
                    if (s.comparison) setComparison(s.comparison);
                    if (s.fontsNumbers) setFontsNumbers(s.fontsNumbers);
                    if (s.filters) setFilters(s.filters);
                }}
                reportType={reportType}
                reportTitle={reportTitle}
                availableColumns={availableColumnsExtended}
                accounts={accounts}
                customers={customers}
                vendors={vendors}
                classes={[]} // Builder doesn't have classes prop currently
                initialSettings={{
                    basis: accountingMethod,
                    columns: selectedColumns,
                    bandedRows,
                    groupBy,
                    comparison,
                    fontsNumbers,
                    filters
                }}
            />

            <ColumnSettingsDialog
                isOpen={showColumnSettings}
                onClose={() => setShowColumnSettings(false)}
                availableColumns={availableColumnsExtended}
                selectedColumns={selectedColumns}
                onApply={(newOrder, allSelected) => {
                    setOrderedColumns(newOrder);
                    setSelectedColumns(allSelected);
                }}
            />

            <AddCustomColumnModal
                isOpen={showAddCustom}
                onClose={() => {
                    setShowAddCustom(false);
                    setEditingColumn(null);
                }}
                onSave={handleAddCustomColumn}
                initialData={editingColumn}
                availableFields={['Amount', 'Value', 'Quantity', 'open_balance', 'ppValue', 'pyValue']}
            />
        </div>
    );
};

export default ReportBuilder;
