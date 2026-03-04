import React, { useState, useMemo, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchReport, sendEmail } from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ModifyReportDialog from './ModifyReportDialog';
import ColumnSettingsDialog from './ColumnSettingsDialog';
import AddCustomColumnModal from './AddCustomColumnModal';
import { addCustomColumn } from '../services/api';
import { Transaction, Account, Customer, Vendor, Item } from '../types';
import SaveAsReportDialog from './SaveAsReportDialog';

interface Props {
  type: 'P&L' | 'BS' | 'GL' | 'AGING' | 'AP_AGING' | 'SALES_ITEM' | 'INV_VAL' | 'PHYSICAL_INVENTORY' | 'TAX_LIABILITY' | 'TRIAL_BALANCE' | 'CASH_FLOW' | 'PAYROLL_SUMMARY' | 'AUDIT_TRAIL' | 'BUDGET_VS_ACTUAL' | 'JOB_ESTIMATES_VS_ACTUALS' | 'MILEAGE_DETAIL' | 'PL_BY_CLASS' | 'SALES_CUSTOMER' | 'AUDIT_TRAIL_DETAIL' | 'CHANGE_ORDER_LOG' | 'FORECAST' | 'EQUITY_STATEMENT' | 'UNBILLED_CHARGES' | 'UNBILLED_TIME' | 'COLLECTIONS' | 'INV_VAL_DETAIL' | 'ADJUSTED_TRIAL_BALANCE' | 'STATEMENT_LIST' | 'DETAILED_TIME' | 'AGING_DETAIL' | 'CUSTOMER_BALANCE_DETAIL' | 'CUSTOMER_BALANCE' | 'INVOICE_LIST' | 'OPEN_INVOICES' | 'INVOICES_RECEIVED' | 'TERMS_LIST_REPORT' | 'VENDOR_BALANCE' | 'PAYROLL_LIABILITY' | 'STOCK_TAKE' | 'OPEN_PO_LIST' | 'OPEN_PO_DETAIL';
  transactions: Transaction[];
  accounts: Account[];
  customers: Customer[];
  vendors: Vendor[];
  items: Item[];
  budgets: any[];
  classes: any[];
  mileageEntries?: any[];
  auditLogs?: any[];
  companyName: string;
  onDrillDown: (id: string, type: string, params?: any) => void;
  onMemorize?: (report: any) => void;
  params?: any;
}

const ReportView: React.FC<Props> = ({ type, transactions, accounts, customers, vendors, items, budgets, classes, mileageEntries, auditLogs, companyName, onDrillDown, onMemorize, params }) => {
  const calculateDateRange = (range: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    const toDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (range) {
      case 'Today':
        return { from: toDateStr(now), to: toDateStr(now) };
      case 'This Week':
        const day = now.getDay();
        start.setDate(now.getDate() - day);
        return { from: toDateStr(start), to: toDateStr(now) };
      case 'This Month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: toDateStr(start), to: toDateStr(now) };
      case 'Last Month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: toDateStr(start), to: toDateStr(end) };
      case 'This Quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        return { from: toDateStr(start), to: toDateStr(now) };
      case 'This Fiscal Year':
      case 'This Fiscal Year-to-date':
        start = new Date(now.getFullYear(), 0, 1);
        return { from: toDateStr(start), to: toDateStr(now) };
      case 'Last Fiscal Year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        return { from: toDateStr(start), to: toDateStr(end) };
      default:
        return null;
    }
  };

  const initialRange = calculateDateRange('This Fiscal Year-to-date')!;
  const [dateRange, setDateRange] = useState(params?.settings?.dateRange || params?.dateRange || 'This Fiscal Year-to-date');
  const [fromDate, setFromDate] = useState(params?.settings?.fromDate || params?.fromDate || initialRange.from);
  const [toDate, setToDate] = useState(params?.settings?.toDate || params?.toDate || initialRange.to);

  useEffect(() => {
    if (dateRange !== 'Custom') {
      const range = calculateDateRange(dateRange);
      if (range) {
        setFromDate(range.from);
        setToDate(range.to);
      }
    }
  }, [dateRange]);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>(params?.settings?.filters?.classId || params?.filters?.classId || 'All');
  const [compactView, setCompactView] = useState(false);
  const [expansionLevel, setExpansionLevel] = useState<'EXPANDED' | 'COLLAPSED'>('EXPANDED');
  const [reportSettings, setReportSettings] = useState<any>(params?.settings || {
    fontsNumbers: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      negativeFormat: 'minus',
      negativeColor: 'black',
      showCents: true,
    }
  });
  const [showCustomize, setShowCustomize] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      try {
        let endpoint = '';
        switch (type) {
          case 'P&L': endpoint = 'profit-and-loss'; break;
          case 'BS': endpoint = 'balance-sheet'; break;
          case 'AGING': endpoint = 'ar-aging'; break;
          case 'AP_AGING': endpoint = 'ap-aging'; break;
          case 'SALES_ITEM': endpoint = 'sales-by-item'; break;
          case 'INV_VAL': endpoint = 'inventory-valuation'; break;
          case 'GL': endpoint = 'general-ledger'; break;
          case 'TAX_LIABILITY': endpoint = 'tax-liability'; break;
          case 'TRIAL_BALANCE': endpoint = 'trial-balance'; break;
          case 'CASH_FLOW': endpoint = 'cash-flow'; break;
          case 'PAYROLL_SUMMARY': endpoint = 'payroll-summary'; break;
          case 'AUDIT_TRAIL': endpoint = 'audit-trail'; break;
          case 'BUDGET_VS_ACTUAL': endpoint = 'budget-vs-actual'; break;
          case 'JOB_ESTIMATES_VS_ACTUALS': endpoint = 'job-estimates-vs-actuals'; break;
          case 'FORECAST': endpoint = 'forecast'; break;
          case 'AUDIT_TRAIL_DETAIL': endpoint = 'audit-trail-detail'; break;
          case 'CHANGE_ORDER_LOG': endpoint = 'change-order-log'; break;
          case 'PHYSICAL_INVENTORY': endpoint = 'physical-inventory'; break;
          case 'MILEAGE_DETAIL': endpoint = 'mileage-detail'; break;
          case 'PL_BY_CLASS': endpoint = 'pl-by-class'; break;
          case 'SALES_CUSTOMER': endpoint = 'sales-by-customer'; break;
          case 'EQUITY_STATEMENT': endpoint = 'equity-statement'; break;
          case 'UNBILLED_CHARGES': endpoint = 'unbilled-charges'; break;
          case 'UNBILLED_TIME': endpoint = 'unbilled-time'; break;
          case 'COLLECTIONS': endpoint = 'collections'; break;
          case 'INV_VAL_DETAIL': endpoint = 'inventory-valuation-detail'; break;
          case 'ADJUSTED_TRIAL_BALANCE': endpoint = 'adjusted-trial-balance'; break;
          case 'STATEMENT_LIST': endpoint = 'statement-list'; break;
          case 'DETAILED_TIME': endpoint = 'detailed-time'; break;
          case 'AGING_DETAIL': endpoint = 'ar-aging-detail'; break;
          case 'CUSTOMER_BALANCE_DETAIL': endpoint = 'customer-balance-detail'; break;
          case 'CUSTOMER_BALANCE': endpoint = 'customer-balance'; break;
          case 'INVOICE_LIST': endpoint = 'invoice-list'; break;
          case 'OPEN_INVOICES': endpoint = 'open-invoices'; break;
          case 'INVOICES_RECEIVED': endpoint = 'invoices-and-payments'; break;
          case 'TERMS_LIST_REPORT': endpoint = 'terms-list'; break;
          case 'VENDOR_BALANCE': endpoint = 'vendor-balance'; break;
          case 'PAYROLL_LIABILITY': endpoint = 'payroll-liability'; break;
          case 'STOCK_TAKE': endpoint = 'physical-inventory'; break;
          case 'OPEN_PO_LIST': endpoint = 'general-ledger?transactionType=PURCHASE_ORDER'; break;
          case 'OPEN_PO_DETAIL': endpoint = 'general-ledger?transactionType=PURCHASE_ORDER'; break;
          default:
            setReportData({ sections: [] });
            setLoading(false);
            return;
        }
        const data = await fetchReport(endpoint, {
          fromDate,
          toDate,
          ...params,
          previousPeriod: reportSettings?.comparison?.previousPeriod || false,
          previousYear: reportSettings?.comparison?.previousYear || false
        });
        setReportData(data);
      } catch (err) {
        console.error('Failed to fetch report:', err);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [type, fromDate, toDate, params, selectedClassId, reportSettings?.filters, reportSettings?.comparison]);

  const data = reportData || { sections: [] };

  const handleExcelExport = () => {
    setIsExporting(true);
    try {
      let csv = '';
      if (type === 'GL' && data.transactions) {
        csv = 'Type,Date,Ref No,Account,Amount,Balance\n';
        data.transactions.forEach((t: any) => {
          csv += `${t.type},${t.date},${t.refNo},"${t.accountName || ''}",${t.total},${t.runningBalance}\n`;
        });
      } else if (data.sections) {
        csv = 'Level,Description,Value,Extra Value,Extra Value 2\n';
        data.sections.forEach((row: any) => {
          const indent = row.indent || 0;
          const level = row.isHeading ? 'Heading' : (row.isTotal ? 'Total' : (row.isGrandTotal ? 'Grand Total' : 'Line'));
          const title = (row.title || '').replace(/,/g, '');
          const val = row.value !== undefined ? row.value : '';
          const extra = row.extraValue !== undefined ? row.extraValue : '';
          const extra2 = row.extraValue2 !== undefined ? row.extraValue2 : '';
          csv += `${level},"${'  '.repeat(indent)}${title}",${val},${extra},${extra2}\n`;
        });
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${type}_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to export to Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const handleMemorize = () => {
    setShowSaveAs(true);
  };

  const handleConfirmSaveAs = (name: string) => {
    if (name && onMemorize) {
      onMemorize({
        title: name,
        type: type,
        settings: {
          ...reportSettings,
          dateRange,
          fromDate,
          toDate,
          filters: {
            ...reportSettings.filters,
            classId: selectedClassId
          }
        }
      });
      setShowSaveAs(false);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return null;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return pdf;
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const pdf = await generatePDF();
      if (pdf) pdf.save(`${type}_Report.pdf`);
    } catch (err) {
      alert("Failed to generate PDF");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleEmail = async () => {
    const email = prompt("Enter recipient email:");
    if (!email) return;

    setIsEmailing(true);
    try {
      const pdf = await generatePDF();
      if (!pdf) return;

      const pdfBlob = pdf.output('blob');
      const formData = new FormData();
      formData.append('to', email);
      formData.append('subject', `${type} Report - ${companyName}`);
      formData.append('body', `Please find attached the ${type} report for ${companyName}.`);
      formData.append('filename', `${type}_Report.pdf`);
      formData.append('pdf', pdfBlob);

      await sendEmail(formData);
      alert("Email sent successfully!");
    } catch (err) {
      alert("Failed to send email");
    } finally {
      setIsEmailing(false);
    }
  };

  const handleApplyCustomization = (settings: any) => {
    setReportSettings(settings);
    if (settings.fromDate) setFromDate(settings.fromDate);
    if (settings.toDate) setToDate(settings.toDate);
  };

  const formatValue = (val: any, isPercent = false) => {
    if (typeof val !== 'number') return val ?? '-';

    if (isPercent) return `${val.toFixed(1)}%`;

    const absVal = Math.abs(val);
    const fonts = reportSettings?.fontsNumbers || {
      negativeFormat: 'minus',
      negativeColor: 'black',
      showCents: true,
    };

    let formatted = absVal.toLocaleString(undefined, {
      minimumFractionDigits: fonts.showCents ? 2 : 0,
      maximumFractionDigits: fonts.showCents ? 2 : 0,
    });

    if (val < 0) {
      if (fonts.negativeFormat === 'parentheses') {
        formatted = `(${formatted})`;
      } else {
        formatted = `-${formatted}`;
      }
    }

    return (
      <span style={{ color: (val < 0 && fonts.negativeColor === 'red') ? '#e11d48' : 'inherit' }}>
        {formatted}
      </span>
    );
  };

  const processTransactions = useMemo(() => {
    if (!reportData?.transactions) return [];

    let filtered = [...reportData.transactions];

    // Apply Advanced Filters
    if (reportSettings?.filters) {
      const f = reportSettings.filters;

      if (f.transactionTypes?.length > 0 && !f.transactionTypes.includes('All')) {
        filtered = filtered.filter(t => f.transactionTypes.includes(t.type));
      }

      if (f.minAmount) {
        filtered = filtered.filter(t => Math.abs(t.total || t.Amount || 0) >= parseFloat(f.minAmount));
      }

      if (f.maxAmount && f.maxAmount !== 'Any' && f.maxAmount !== '') {
        filtered = filtered.filter(t => Math.abs(t.total || t.Amount || 0) <= parseFloat(f.maxAmount));
      }

      if (f.clearedStatus !== 'All') {
        filtered = filtered.filter(t => f.clearedStatus === 'Cleared' ? t.cleared : !t.cleared);
      }

      if (f.memoContains) {
        filtered = filtered.filter(t => t.memo?.toLowerCase().includes(f.memoContains.toLowerCase()));
      }
    }

    // Apply Grouping
    if (reportSettings?.groupBy && reportSettings.groupBy !== 'None') {
      const groupKey = reportSettings.groupBy; // 'Account', 'Customer', 'Vendor', etc.
      const groups: { [key: string]: any[] } = {};

      filtered.forEach(t => {
        let key = 'Other';
        if (groupKey === 'Account') key = t.accountName || 'No Account';
        else if (groupKey === 'Customer') key = t.customerName || 'No Customer';
        else if (groupKey === 'Vendor') key = t.vendorName || 'No Vendor';
        else if (groupKey === 'Class') key = t.className || 'No Class';

        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });

      // Convert back to flattened array with group headers/totals if needed, 
      // but for now we'll just handle it in the render logic or return grouped structure
      return groups;
    }

    return filtered;
  }, [reportData?.transactions, reportSettings]);

  const getAvailableColumns = () => {
    if (type === 'GL') {
      return ['Type', 'Date', 'Num', 'Name', 'Account', 'Amount', 'Balance', ...(data.customColumns || [])];
    }

    const base = ['Description', 'Value'];

    // Add specific columns for specific reports instead of generic "Extra Value"
    if (type === 'INV_VAL' || type === 'PHYSICAL_INVENTORY') {
      base.push('Quantity', 'Cost');
    } else if (type === 'BUDGET_VS_ACTUAL' || type === 'JOB_ESTIMATES_VS_ACTUALS') {
      base.push('Budgeted', 'Variance');
    } else if (type === 'FORECAST') {
      base.push('Actual');
    } else if (type === 'MILEAGE_DETAIL') {
      base.push('Notes');
    }

    const custom = data.customColumns || [];
    return [...base, ...custom];
  };

  const handleAddCustomColumn = async (name: string, formula: string) => {
    try {
      await addCustomColumn({ reportType: type, columnName: name, formula });
      // Refresh report
      window.location.reload();
    } catch (err: any) {
      alert(`Failed to add custom column: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0] select-none font-sans">
      <style>
        {`
          .report-canvas, .report-canvas * {
            font-family: ${reportSettings?.fontsNumbers?.fontFamily || 'inherit'} !important;
            font-size: ${reportSettings?.fontsNumbers?.fontSize || 'inherit'} !important;
          }
          .report-canvas h1 { font-size: 1.5em !important; }
          .report-canvas h2 { font-size: 2em !important; }
          .report-canvas p, .report-canvas .footer-info { font-size: 0.8em !important; }
          .report-canvas .group-header, .report-canvas .report-header { font-size: 0.85em !important; }
        `}
      </style>
      {/* Report Toolbar */}
      <div className="bg-white border-b border-gray-300 p-1 flex gap-1 items-center shadow-sm overflow-x-auto min-h-[40px]">
        <button onClick={() => setShowCustomize(true)} className="px-3 py-1 bg-gray-100 border border-gray-400 text-[11px] font-bold hover:bg-white rounded shadow-sm">Customize Report</button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          onClick={() => setCompactView(!compactView)}
          className={`px-3 py-1 border border-gray-400 text-[11px] font-bold rounded shadow-sm transition-colors ${compactView ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-gray-100 hover:bg-white'}`}
        >
          {compactView ? 'Normal View' : 'Compact View'}
        </button>
        <button
          onClick={() => setExpansionLevel(expansionLevel === 'EXPANDED' ? 'COLLAPSED' : 'EXPANDED')}
          className="px-3 py-1 bg-gray-100 border border-gray-400 text-[11px] font-bold hover:bg-white rounded shadow-sm"
        >
          {expansionLevel === 'EXPANDED' ? 'Collapse All' : 'Expand All'}
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button onClick={handleMemorize} className="px-3 py-1 bg-gray-100 border border-gray-400 text-[11px] font-bold hover:bg-white rounded shadow-sm">Save As</button>
        <button onClick={handlePrint} className="px-3 py-1 bg-gray-100 border border-gray-400 text-[11px] font-bold hover:bg-white rounded shadow-sm">{isPrinting ? '⏳ Printing...' : 'Print'}</button>
        {/* <button onClick={handleEmail} className="px-3 py-1 bg-gray-100 border border-gray-400 text-[11px] font-bold hover:bg-white rounded shadow-sm">{isEmailing ? '⏳ Emailing...' : 'Email'}</button> */}
        <button onClick={handleExcelExport} className="px-3 py-1 bg-green-50 border border-green-400 text-[11px] font-bold text-green-800 hover:bg-white rounded shadow-sm flex items-center gap-1">
          {isExporting ? '⏳ Exporting...' : 'Excel ▼'}
        </button>
        <button onClick={() => setShowAddCustom(true)} className="px-3 py-1 bg-purple-600 text-white border border-purple-700 text-[11px] font-bold hover:brightness-110 rounded shadow-sm flex items-center gap-1">
          <span className="text-sm font-bold">+</span> Custom Column
        </button>
        <button onClick={() => window.location.reload()} className="px-3 py-1 bg-blue-600 text-white border border-blue-700 text-[11px] font-bold hover:brightness-110 rounded shadow-sm">Refresh</button>
      </div>

      {/* Date Filters Bar */}
      <div className="bg-gray-100 border-b border-gray-300 p-3 flex gap-6 items-center text-[11px] font-bold text-gray-700">
        {!['TERMS_LIST', 'PHYSICAL_INV'].includes(type) ? (
          <>
            <div className="flex items-center gap-2">
              <span>Dates</span>
              <select
                className="border p-1 bg-white outline-none w-48 shadow-inner"
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
              >
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>This Quarter</option>
                <option>This Fiscal Year</option>
                <option>This Fiscal Year-to-date</option>
                <option>Last Fiscal Year</option>
                <option>Custom</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>From</span>
              <input className="border p-1 bg-white w-24 outline-none shadow-inner" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              <span>To</span>
              <input className="border p-1 bg-white w-24 outline-none shadow-inner" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 italic text-gray-400">
            <span>Date filtering not applicable for this report type</span>
          </div>
        )}
        <div className="flex items-center gap-2 border-l pl-6">
          <span>Filter by Class</span>
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="border p-1 bg-white outline-none w-32 shadow-inner">
            <option value="All">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white p-12 custom-scrollbar">
        <div
          className="max-w-5xl mx-auto report-canvas shadow-lg relative min-h-[400px]"
          ref={reportRef}
        >
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                  <div className="absolute inset-0 blur-lg bg-blue-400/20 animate-pulse rounded-full"></div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-gray-800 tracking-wider">Generating Report</span>
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">Please wait a moment...</span>
                </div>
              </div>
            </div>
          )}
          <div className="text-center mb-12">
            {reportSettings?.header?.showLogo && <div className="mb-4 text-gray-300 italic">[Company Logo]</div>}
            {reportSettings?.header?.companyName !== false && (
              <h1 className="font-bold uppercase tracking-[0.2em] text-slate-800" style={{ fontSize: '1.5em' }}>{companyName}</h1>
            )}
            <h2 className="font-serif italic text-blue-900 mt-2" style={{ fontSize: '2em' }}>
              {reportSettings?.header?.reportTitle || type.replace('_', ' ')}
            </h2>
            <p className="font-bold text-gray-400 uppercase mt-1 italic tracking-widest" style={{ fontSize: '0.8em' }}>
              {reportSettings?.header?.subtitle || `${fromDate} through ${toDate}`}
            </p>
          </div>

          {type === 'GL' ? (
            <table className="w-full">
              <thead className="border-y-2 border-gray-800 uppercase font-black bg-slate-50 report-header">
                <tr className="text-left h-10">
                  {(() => {
                    const baseCols = reportSettings?.columns || ['Type', 'Date', 'Num', 'Name', 'Amount', 'Balance'];
                    const extraCols: string[] = [];
                    if (reportSettings?.comparison?.previousPeriod) {
                      extraCols.push('PP Amount');
                      if (reportSettings.comparison.dollarChange) extraCols.push('$ Change (PP)');
                      if (reportSettings.comparison.percentChange) extraCols.push('% Change (PP)');
                    }
                    if (reportSettings?.comparison?.previousYear) {
                      extraCols.push('PY Amount');
                      if (reportSettings.comparison.dollarChange) extraCols.push('$ Change (PY)');
                      if (reportSettings.comparison.percentChange) extraCols.push('% Change (PY)');
                    }

                    return [...baseCols, ...extraCols, ...(data.customColumns || [])].map((col: string) => (
                      <th key={col} className={`px-2 ${col === 'Type' ? 'px-4' : ''} ${col === 'Balance' ? 'px-4' : ''} ${col.includes('Amount') || col.includes('Balance') || col.includes('Change') || (data.customColumns?.includes(col)) ? 'text-right' : ''}`}>
                        {col}
                      </th>
                    ));
                  })()}
                </tr>
              </thead>
              <tbody>
                {reportSettings?.groupBy && reportSettings.groupBy !== 'None' && !Array.isArray(processTransactions) ? (
                  Object.entries(processTransactions as Record<string, any[]>).map(([groupName, transactions]) => (
                    <React.Fragment key={groupName}>
                      <tr className="bg-gray-100/50 group-header">
                        <td colSpan={(reportSettings?.columns?.length || 6)} className="px-4 py-2 font-bold text-gray-600 uppercase">
                          {reportSettings.groupBy}: {groupName}
                        </td>
                      </tr>
                      {transactions.map((t: any, rowIdx: number) => (
                        <tr
                          key={t.id}
                          className={`${compactView ? 'h-7' : 'h-10'} border-b hover:bg-yellow-50 cursor-pointer ${reportSettings?.bandedRows && rowIdx % 2 !== 0 ? 'bg-gray-50' : ''}`}
                          onClick={() => onDrillDown(t.id, 'GL')}
                        >
                          {(() => {
                            const baseCols = reportSettings?.columns || ['Type', 'Date', 'Num', 'Name', 'Amount', 'Balance'];
                            const extraCols: string[] = [];
                            if (reportSettings?.comparison?.previousPeriod) {
                              extraCols.push('PP Amount');
                              if (reportSettings.comparison.dollarChange) extraCols.push('$ Change (PP)');
                              if (reportSettings.comparison.percentChange) extraCols.push('% Change (PP)');
                            }
                            if (reportSettings?.comparison?.previousYear) {
                              extraCols.push('PY Amount');
                              if (reportSettings.comparison.dollarChange) extraCols.push('$ Change (PY)');
                              if (reportSettings.comparison.percentChange) extraCols.push('% Change (PY)');
                            }

                            return [...baseCols, ...extraCols, ...(data.customColumns || [])].map((col: string) => {
                              let val = col === 'Type' ? t.type :
                                col === 'Date' ? t.date :
                                  col === 'Num' ? t.refNo :
                                    col === 'Name' ? (t.customerName || t.vendorName || 'Multiple...') :
                                      col === 'Account' ? t.accountName :
                                        col === 'Amount' ? t.total :
                                          col === 'Balance' ? t.runningBalance :
                                            col === 'PP Amount' ? t.ppAmount :
                                              col === 'PY Amount' ? t.pyAmount :
                                                col === '$ Change (PP)' ? (t.total - (t.ppAmount || 0)) :
                                                  col === '% Change (PP)' ? (t.ppAmount ? ((t.total - t.ppAmount) / t.ppAmount * 100) : 0) :
                                                    col === '$ Change (PY)' ? (t.total - (t.pyAmount || 0)) :
                                                      col === '% Change (PY)' ? (t.pyAmount ? ((t.total - t.pyAmount) / t.pyAmount * 100) : 0) : '';

                              if (data.customColumns?.includes(col)) {
                                val = t.customValues?.[col] ?? '-';
                              }

                              return (
                                <td key={col} className={`px-2 ${col === 'Type' ? 'px-4 font-bold text-blue-800 pl-8' : ''} ${col === 'Balance' ? 'px-4 font-bold' : ''} ${col.includes('Amount') || col.includes('Balance') || col.includes('Change') || (data.customColumns?.includes(col)) ? 'text-right' : ''}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {formatValue(val, col.includes('%'))}
                                </td>
                              );
                            });
                          })()}
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold border-b-2 border-gray-200">
                        <td colSpan={(reportSettings?.columns?.length || 6) - 2} className="px-4 py-2 text-right">Total {groupName}:</td>
                        <td className="px-2 text-right font-mono">${transactions.reduce((acc, t) => acc + t.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td></td>
                      </tr>
                    </React.Fragment>
                  ))
                ) : (
                  (Array.isArray(processTransactions) ? processTransactions : []).map((t: any, rowIdx: number) => (
                    <tr
                      key={t.id}
                      className={`${compactView ? 'h-7' : 'h-10'} border-b hover:bg-yellow-50 cursor-pointer ${reportSettings?.bandedRows && rowIdx % 2 !== 0 ? 'bg-gray-50' : ''}`}
                      onClick={() => onDrillDown(t.id, 'GL')}
                    >
                      {(() => {
                        const baseCols = reportSettings?.columns || ['Type', 'Date', 'Num', 'Name', 'Amount', 'Balance'];
                        const extraCols: string[] = [];
                        if (reportSettings?.comparison?.previousPeriod) {
                          extraCols.push('PP Amount');
                          if (reportSettings.comparison.dollarChange) extraCols.push('$ Change (PP)');
                          if (reportSettings.comparison.percentChange) extraCols.push('% Change (PP)');
                        }
                        if (reportSettings?.comparison?.previousYear) {
                          extraCols.push('PY Amount');
                          if (reportSettings.comparison.dollarChange) extraCols.push('$ Change (PY)');
                          if (reportSettings.comparison.percentChange) extraCols.push('% Change (PY)');
                        }

                        return [...baseCols, ...extraCols].map((col: string) => {
                          const val = col === 'Type' ? t.type :
                            col === 'Date' ? t.date :
                              col === 'Num' ? t.refNo :
                                col === 'Name' ? (t.customerName || t.vendorName || 'Multiple...') :
                                  col === 'Account' ? t.accountName :
                                    col === 'Amount' ? t.total :
                                      col === 'Balance' ? t.runningBalance :
                                        col === 'PP Amount' ? t.ppAmount :
                                          col === 'PY Amount' ? t.pyAmount :
                                            col === '$ Change (PP)' ? (t.total - (t.ppAmount || 0)) :
                                              col === '% Change (PP)' ? (t.ppAmount ? ((t.total - t.ppAmount) / t.ppAmount * 100) : 0) :
                                                col === '$ Change (PY)' ? (t.total - (t.pyAmount || 0)) :
                                                  col === '% Change (PY)' ? (t.pyAmount ? ((t.total - t.pyAmount) / t.pyAmount * 100) : 0) : '';

                          return (
                            <td key={col} className={`px-2 ${col === 'Type' ? 'px-4 font-bold text-blue-800' : ''} ${col === 'Balance' ? 'px-4 font-bold' : ''} ${col.includes('Amount') || col.includes('Balance') || col.includes('Change') ? 'text-right' : ''}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {formatValue(val, col.includes('%'))}
                            </td>
                          );
                        });
                      })()}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <div className={`space-y-1 ${compactView ? 'space-y-0' : ''}`}>
              {data.sections?.filter((row: any) => {
                if (expansionLevel === 'COLLAPSED' && row.indent > 0 && !row.isTotal) return false;
                return true;
              }).map((row: any, i: number) => (
                <div
                  key={i}
                  className={`flex justify-between items-center group min-h-[1.5em] py-1 ${row.isHeading ? 'font-black text-slate-900 border-b border-gray-100' : 'text-gray-700'} ${row.isTotal ? 'border-t border-gray-500 font-bold mt-2 pt-1' : ''} ${row.isGrandTotal ? 'border-t-2 border-b-8 border-gray-800 font-black mt-6 bg-slate-50 px-2' : ''} ${row.spacing ? 'mt-8' : ''} ${reportSettings?.bandedRows && i % 2 !== 0 && !row.isHeading && !row.isGrandTotal ? 'bg-gray-50' : ''}`}
                >
                  <span style={{ paddingLeft: `${(row.indent || 0) * 12}px` }}>{row.title}</span>
                  <div className="flex gap-4 items-center">
                    {/* Render specific mapped columns based on selection */}
                    {(reportSettings?.columns || ['Description', 'Value']).map((col: string) => {
                      if (col === 'Description' || col === 'Value') return null; // Already handled by row.title and the value span below

                      let val = null;
                      if (col === 'Quantity') val = row.extraValue;
                      else if (col === 'Cost') val = row.extraValue2;
                      else if (col === 'Budgeted') val = row.extraValue;
                      else if (col === 'Variance') val = row.extraValue2;
                      else if (col === 'Actual') val = row.extraValue;
                      else if (col === 'Notes') val = row.extraValue;

                      if (val === null || val === undefined) return null;

                      return (
                        <span key={col} className="text-gray-500 w-32 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {typeof val === 'number' ? val.toLocaleString(undefined, { minimumFractionDigits: 2 }) : val}
                        </span>
                      );
                    })}

                    {row.value !== undefined && (
                      <span
                        onClick={() => row.id && onDrillDown(row.id, type)}
                        className={`text-right transition-all px-2 rounded min-w-[100px] ${row.id ? 'cursor-pointer hover:bg-yellow-200 hover:text-blue-700 underline underline-offset-4 decoration-double decoration-blue-200' : ''}`}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatValue(row.value)}
                      </span>
                    )}

                    {/* Backend powered comparison columns for Section Reports (P&L, etc) */}
                    {reportSettings?.comparison?.previousPeriod && (
                      <>
                        <span className="text-gray-500 w-24 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {(row.ppValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {reportSettings.comparison.dollarChange && (
                          <span className="text-gray-400 w-24 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {((row.value || 0) - (row.ppValue || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        {reportSettings.comparison.percentChange && (
                          <span className="text-gray-400 w-16 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {row.ppValue ? ((((row.value || 0) - row.ppValue) / row.ppValue) * 100).toFixed(1) : '0.0'}%
                          </span>
                        )}
                      </>
                    )}

                    {reportSettings?.comparison?.previousYear && (
                      <>
                        <span className="text-gray-500 w-24 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {(row.pyValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {reportSettings.comparison.dollarChange && (
                          <span className="text-gray-400 w-24 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {((row.value || 0) - (row.pyValue || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        {reportSettings.comparison.percentChange && (
                          <span className="text-gray-400 w-16 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {row.pyValue ? ((((row.value || 0) - row.pyValue) / row.pyValue) * 100).toFixed(1) : '0.0'}%
                          </span>
                        )}
                      </>
                    )}

                    {/* % of Income Metric - Live from Backend */}
                    {reportSettings?.columns?.includes('% of Income') && (
                      <span className="text-blue-500/70 w-16 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {data.totalIncome ? (((row.value || 0) / data.totalIncome) * 100).toFixed(1) : '0.0'}%
                      </span>
                    )}

                    {/* Custom Formula Columns */}
                    {(data.customColumns || []).map((colName: string) => (
                      <span key={colName} className="text-right text-purple-600 w-24 px-2" style={{ fontSize: 'inherit', fontVariantNumeric: 'tabular-nums' }}>
                        {formatValue(row.customValues?.[colName] ?? '-')}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-20 text-center text-gray-300 font-bold uppercase tracking-[0.3em] border-t-2 pt-6 italic footer-info">
            Reporting Complete
            {reportSettings?.footer?.showPageNumbers && <div className="mt-2 text-gray-400 font-normal">Page 1 of 1</div>}
          </div>
        </div>
      </div>

      <ModifyReportDialog
        isOpen={showCustomize}
        onClose={() => setShowCustomize(false)}
        onApply={handleApplyCustomization}
        reportType={type}
        reportTitle={type.replace('_', ' ')}
        availableColumns={getAvailableColumns()}
        accounts={accounts}
        customers={customers}
        vendors={vendors}
        classes={classes}
        initialSettings={reportSettings}
      />

      <ColumnSettingsDialog
        isOpen={showColumnSettings}
        onClose={() => setShowColumnSettings(false)}
        availableColumns={getAvailableColumns()}
        selectedColumns={reportSettings?.columns || getAvailableColumns()}
        onApply={(newOrder, allSelected) => {
          setReportSettings({ ...reportSettings, columns: newOrder });
        }}
      />

      <AddCustomColumnModal
        isOpen={showAddCustom}
        onClose={() => setShowAddCustom(false)}
        onSave={handleAddCustomColumn}
        availableFields={['value', 'extraValue', 'extraValue2', 'ppValue', 'pyValue']}
      />

      <SaveAsReportDialog
        isOpen={showSaveAs}
        onClose={() => setShowSaveAs(false)}
        onSave={handleConfirmSaveAs}
        defaultName={reportSettings?.header?.reportTitle || type.replace(/_/g, ' ') + ' - copy'}
      />
    </div >
  );
};

export default ReportView;
