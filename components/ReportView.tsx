import React, { useState, useMemo, useEffect } from 'react';
import { fetchReport, sendEmail } from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Transaction, Account, Customer, Vendor, Item } from '../types';

interface Props {
  type: 'P&L' | 'BS' | 'GL' | 'AGING' | 'AP_AGING' | 'SALES_ITEM' | 'INV_VAL' | 'PHYSICAL_INVENTORY' | 'TAX_LIABILITY' | 'TRIAL_BALANCE' | 'CASH_FLOW' | 'PAYROLL_SUMMARY' | 'AUDIT_TRAIL' | 'BUDGET_VS_ACTUAL' | 'JOB_ESTIMATES_VS_ACTUALS' | 'MILEAGE_DETAIL' | 'PL_BY_CLASS' | 'SALES_CUSTOMER' | 'AUDIT_TRAIL_DETAIL' | 'CHANGE_ORDER_LOG' | 'FORECAST';
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
  onMemorize?: (name: string) => void;
  params?: any;
}

const ReportView: React.FC<Props> = ({ type, transactions, accounts, customers, vendors, items, budgets, classes, mileageEntries, auditLogs, companyName, onDrillDown, onMemorize, params }) => {
  const [dateRange, setDateRange] = useState('This Fiscal Year-to-date');
  const [fromDate, setFromDate] = useState('01/01/2024');
  const [toDate, setToDate] = useState(new Date().toLocaleDateString());
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('All');
  const [showCustomize, setShowCustomize] = useState(false);

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
          case 'CUSTOMER_BALANCE': endpoint = 'customer-balance'; break;
          case 'VENDOR_BALANCE': endpoint = 'vendor-balance'; break;
          case 'PAYROLL_LIABILITY': endpoint = 'payroll-liability'; break;
          default:
            // Fallback for unhandled types
            setReportData({ sections: [] });
            setLoading(false);
            return;
        }
        const data = await fetchReport(endpoint, { fromDate, toDate, ...params });
        setReportData(data);
      } catch (err) {
        console.error('Failed to fetch report:', err);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [type, fromDate, toDate, params, selectedClassId]);

  const getReportData = () => {
    // Keep this as fallback for local calculation if needed
    // ... logic remains but we use reportData if available
    return null;
  };

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
        csv = 'Description,Value,Extra Value\n';
        data.sections.forEach((row: any) => {
          const title = (row.title || '').replace(/,/g, '');
          const val = row.value !== undefined ? row.value : '';
          const extra = row.extraValue !== undefined ? row.extraValue : '';
          csv += `"${title}",${val},${extra}\n`;
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
    const name = prompt("Enter a name for this memorized report:", type);
    if (name && onMemorize) onMemorize(name);
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

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0] select-none font-sans">
      {/* Report Toolbar */}
      <div className="bg-white border-b border-gray-300 p-1 flex gap-1 items-center shadow-sm overflow-x-auto min-h-[40px]">
        <button onClick={() => setShowCustomize(true)} className="px-3 py-1 bg-gray-100 border border-gray-400 text-[11px] font-bold hover:bg-white rounded shadow-sm">Customize Report</button>
        <button className="px-3 py-1 bg-gray-100 border border-gray-400 text-[11px] font-bold hover:bg-white rounded shadow-sm">Comment on Report</button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button onClick={handleMemorize} className="px-3 py-1 bg-gray-100 border border-gray-400 text-[11px] font-bold hover:bg-white rounded shadow-sm">Memorize</button>
        <button onClick={handlePrint} className="px-3 py-1 bg-gray-100 border border-gray-400 text-[11px] font-bold hover:bg-white rounded shadow-sm">{isPrinting ? '⏳ Printing...' : 'Print'}</button>
        <button onClick={handleEmail} className="px-3 py-1 bg-gray-100 border border-gray-400 text-[11px] font-bold hover:bg-white rounded shadow-sm">{isEmailing ? '⏳ Emailing...' : 'Email'}</button>
        <button onClick={handleExcelExport} className="px-3 py-1 bg-green-50 border border-green-400 text-[11px] font-bold text-green-800 hover:bg-white rounded shadow-sm flex items-center gap-1">
          {isExporting ? '⏳ Exporting...' : 'Excel ▼'}
        </button>
        <button className="px-3 py-1 bg-gray-100 border border-gray-400 text-[11px] font-bold hover:bg-white rounded shadow-sm">Hide Header</button>
        <button onClick={() => window.location.reload()} className="px-3 py-1 bg-blue-600 text-white border border-blue-700 text-[11px] font-bold hover:brightness-110 rounded shadow-sm">Refresh</button>
      </div>

      {/* Date Filters Bar */}
      <div className="bg-gray-100 border-b border-gray-300 p-3 flex gap-6 items-center text-[11px] font-bold text-gray-700">
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
        <div className="flex items-center gap-2 border-l pl-6">
          <span>Filter by Class</span>
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="border p-1 bg-white outline-none w-32 shadow-inner">
            <option value="All">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white p-12 custom-scrollbar">
        <div className="max-w-5xl mx-auto" ref={reportRef}>
          <div className="text-center mb-12">
            <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-slate-800">{companyName}</h1>
            <h2 className="text-3xl font-serif italic text-blue-900 mt-2">{type.replace('_', ' ')}</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 italic tracking-widest">{fromDate} through {toDate}</p>
          </div>

          {type === 'GL' ? (
            <table className="w-full text-sm">
              <thead className="border-y-2 border-gray-800 uppercase font-black text-[11px] bg-slate-50">
                <tr className="text-left h-10">
                  <th className="px-4">Type</th>
                  <th className="px-2">Date</th>
                  <th className="px-2">Num</th>
                  <th className="px-2">Name</th>
                  <th className="px-2 text-right">Amount</th>
                  <th className="px-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions?.map((t: any) => (
                  <tr key={t.id} className="border-b h-10 hover:bg-yellow-50 cursor-pointer" onClick={() => onDrillDown(t.id, 'GL')}>
                    <td className="px-4 font-bold text-blue-800">{t.type}</td>
                    <td className="px-2">{t.date}</td>
                    <td className="px-2">{t.refNo}</td>
                    <td className="px-2 italic text-gray-500">Multiple...</td>
                    <td className="px-2 text-right font-mono">${t.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 text-right font-mono font-bold">${t.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-1">
              {data.sections?.map((row: any, i: number) => (
                <div key={i} className={`flex justify-between items-center group h-7 text-[13px] ${row.isHeading ? 'font-black text-slate-900 border-b border-gray-100' : 'text-gray-700'} ${row.isTotal ? 'border-t border-gray-500 font-bold mt-2 pt-1' : ''} ${row.isGrandTotal ? 'border-t-2 border-b-8 border-gray-800 font-black text-xl h-14 mt-6 bg-slate-50 px-2' : ''} ${row.spacing ? 'mt-8' : ''}`}>
                  <span style={{ paddingLeft: `${(row.indent || 0) * 12}px` }}>{row.title}</span>
                  <div className="flex gap-4 items-center">
                    {row.extraValue !== undefined && (
                      <span className="font-mono text-gray-500 w-32 text-right">
                        {typeof row.extraValue === 'number' ? row.extraValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) : row.extraValue}
                      </span>
                    )}
                    {row.value !== undefined && (
                      <span
                        onClick={() => row.id && onDrillDown(row.id, type)}
                        className={`font-mono text-right transition-all px-2 rounded min-w-[100px] ${row.id ? 'cursor-pointer hover:bg-yellow-200 hover:text-blue-700 underline underline-offset-4 decoration-double decoration-blue-200' : ''}`}
                      >
                        {row.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-20 text-center text-[9px] text-gray-300 font-bold uppercase tracking-[0.3em] border-t-2 pt-6 italic">
            Reporting Complete
          </div>
        </div>
      </div>

      {showCustomize && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-[#f0f0f0] w-[600px] shadow-2xl border border-gray-400 flex flex-col">
            <div className="bg-[#003366] text-white p-2 flex justify-between items-center">
              <span className="font-bold text-sm text-[12px]">Modify Report: {type.replace('_', ' ')}</span>
              <button onClick={() => setShowCustomize(false)}>✕</button>
            </div>
            <div className="flex-1 p-6 flex gap-4">
              <div className="w-1/3 border-r pr-4 space-y-2">
                <button className="w-full text-left bg-blue-100 p-2 text-[12px] font-bold border border-blue-400">Display</button>
                <button className="w-full text-left p-2 text-[12px] hover:bg-white text-gray-600">Filters</button>
                <button className="w-full text-left p-2 text-[12px] hover:bg-white text-gray-600">Header/Footer</button>
                <button className="w-full text-left p-2 text-[12px] hover:bg-white text-gray-600">Fonts & Numbers</button>
              </div>
              <div className="flex-1 space-y-4">
                <div className="bg-white p-4 border shadow-inner">
                  <h4 className="text-[11px] font-bold text-blue-900 border-b mb-3 pb-1">REPORT PERIOD</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">From</label>
                      <input className="border p-1 w-full text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">To</label>
                      <input className="border p-1 w-full text-sm" value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 border shadow-inner">
                  <h4 className="text-[11px] font-bold text-blue-900 border-b mb-3 pb-1">REPORT BASIS</h4>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="radio" name="basis" defaultChecked /> Accrual
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="radio" name="basis" /> Cash
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-200 border-t flex justify-end gap-2">
              <button onClick={() => setShowCustomize(false)} className="px-6 py-1 bg-white border border-gray-400 shadow-sm text-xs font-bold hover:bg-gray-50">Cancel</button>
              <button onClick={() => setShowCustomize(false)} className="px-6 py-1 bg-blue-600 text-white shadow-md text-xs font-bold hover:brightness-110">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportView;
