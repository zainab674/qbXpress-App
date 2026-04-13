import React, { useState, useMemo, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchReport, sendEmail, fetchWarehouses, exportReportToExcel } from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ModifyReportDialog from './ModifyReportDialog';
import ColumnSettingsDialog from './ColumnSettingsDialog';
import AddCustomColumnModal from './AddCustomColumnModal';
import ManageCustomColumnsModal from './ManageCustomColumnsModal';
import { addCustomColumn } from '../services/api';
import { Transaction, Account, Customer, Vendor, Item } from '../types';
import SaveAsReportDialog from './SaveAsReportDialog';
import ScheduleReportDialog from './ScheduleReportDialog';

interface Props {
  type: 'P&L' | 'BS' | 'GL' | 'AGING' | 'AP_AGING' | 'SALES_ITEM' | 'INV_VAL' | 'PHYSICAL_INVENTORY' | 'PHYSICAL_INVENTORY_WORKSHEET' | 'TAX_LIABILITY' | 'TRIAL_BALANCE' | 'CASH_FLOW' | 'PAYROLL_SUMMARY' | 'AUDIT_TRAIL' | 'BUDGET_VS_ACTUAL' | 'JOB_ESTIMATES_VS_ACTUALS' | 'MILEAGE_DETAIL' | 'PL_BY_CLASS' | 'SALES_CUSTOMER' | 'AUDIT_TRAIL_DETAIL' | 'CHANGE_ORDER_LOG' | 'FORECAST' | 'EQUITY_STATEMENT' | 'UNBILLED_CHARGES' | 'UNBILLED_TIME' | 'COLLECTIONS' | 'INV_VAL_DETAIL' | 'ADJUSTED_TRIAL_BALANCE' | 'STATEMENT_LIST' | 'DETAILED_TIME' | 'AGING_DETAIL' | 'CUSTOMER_BALANCE_DETAIL' | 'CUSTOMER_BALANCE' | 'INVOICE_LIST' | 'OPEN_INVOICES' | 'INVOICES_RECEIVED' | 'TERMS_LIST_REPORT' | 'VENDOR_BALANCE' | 'PAYROLL_LIABILITY' | 'STOCK_TAKE' | 'OPEN_PO_LIST' | 'OPEN_PO_DETAIL' | 'COST_VARIANCE' | 'BOM_REPORT' | 'INV_BY_SITE' | 'INV_BY_LOCATION' | 'LOT_NUMBER' | 'SERIAL_NUMBER' | 'PRICE_LEVEL' | 'STOCK_STATUS_BY_SITE' | 'ASSEMBLY_SHORTAGE' | 'INVENTORY_REORDER'
  // QB Enterprise Financial Reports
  | 'PL_DETAIL' | 'PL_BY_MONTH' | 'PL_YTD' | 'PL_PREV_YEAR' | 'BS_DETAIL' | 'BS_SUMMARY' | 'BS_PREV_YEAR' | 'INCOME_TAX' | 'MISSING_CHECKS'
  // QB Enterprise Sales Reports
  | 'SALES_CUSTOMER_DETAIL' | 'SALES_BY_REP_SUMMARY' | 'SALES_BY_REP_DETAIL' | 'SO_FULFILLMENT' | 'PENDING_SALES'
  // QB Enterprise Vendors / Purchases Reports
  | 'AP_AGING_DETAIL' | 'VENDOR_BALANCE_DETAIL' | 'UNPAID_BILLS_DETAIL' | 'BILLS_AND_PAYMENTS'
  | 'PURCHASES_BY_VENDOR_DETAIL' | 'PURCHASES_BY_ITEM_DETAIL' | 'VENDOR_CONTACT_LIST'
  // Banking Reports
  | 'TRANSACTION_LIST_BY_DATE' | 'TRANSACTION_DETAIL_BY_ACCOUNT' | 'CHECK_DETAIL' | 'DEPOSIT_DETAIL'
  | 'RECONCILIATION_DISCREPANCY' | 'MISSING_CHECKS_BANKING' | 'BANKING_SUMMARY'
  // Accountant Reports
  | 'VOIDED_DELETED_TXN' | 'ACCOUNT_LISTING' | 'FIXED_ASSET_LISTING' | 'JOURNAL_ENTRIES'
  | 'INCOME_TAX_DETAIL'
  // QB Enterprise Exclusive
  | 'ROLE_PERMISSION_AUDIT' | 'BIN_LOCATION' | 'MANAGEMENT_PKG'
  // Allocation Reports
  | 'MRP_RECEPTION_REPORT' | 'ALLOCATION_STATUS' | 'PRODUCT_ALLOCATION'
  // Industry / Jobs & Time Reports
  | 'JOB_PROFIT_SUMMARY' | 'JOB_PROFIT_DETAIL' | 'JOB_COSTS_BY_JOB' | 'JOB_COSTS_BY_VENDOR' | 'JOB_COSTS_BY_TYPE'
  | 'TIME_BY_JOB_SUMMARY' | 'TIME_BY_JOB_DETAIL' | 'TIME_BY_NAME' | 'MILEAGE_BY_VEHICLE' | 'MILEAGE_BY_JOB'
  | 'LOT_TRACEABILITY' | 'SERIAL_HISTORY'
  // 1099 Reports
  | 'REPORT_1099_SUMMARY' | 'REPORT_1099_DETAIL';
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
  const [showSchedule, setShowSchedule] = useState(false);
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
    },
    // YTD and PrevYear comparison reports always show the prior-year column
    comparison: ['PL_YTD', 'PL_PREV_YEAR'].includes(type)
      ? { previousYear: true, dollarChange: true, percentChange: true }
      : undefined,
  });
  const [showCustomize, setShowCustomize] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [showManageCustom, setShowManageCustom] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  // Warehouse filter — used for physical inventory worksheet
  const [warehouseFilterId, setWarehouseFilterId] = useState('');
  const [availableWarehouses, setAvailableWarehouses] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (type === 'PHYSICAL_INVENTORY_WORKSHEET' || type === 'PHYSICAL_INVENTORY') {
      fetchWarehouses().then((whs: any[]) => setAvailableWarehouses(whs)).catch(() => { });
    }
  }, [type]);
  const [loading, setLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      setReportError(null);
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
          case 'PHYSICAL_INVENTORY_WORKSHEET': endpoint = 'physical-inventory-worksheet'; break;
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
          case 'OPEN_PO_LIST': endpoint = 'open-purchase-order-list'; break;
          case 'OPEN_PO_DETAIL': endpoint = 'open-purchase-order-detail?isDetail=true'; break;
          case 'COST_VARIANCE': endpoint = 'cost-variance'; break;
          case 'BOM_REPORT': endpoint = params?.itemId ? `bom-report?itemId=${encodeURIComponent(params.itemId)}` : 'bom-report'; break;
          case 'INV_BY_SITE': endpoint = 'inventory-by-site'; break;
          case 'INV_BY_LOCATION': endpoint = 'inventory-by-location'; break;
          case 'STOCK_STATUS_BY_SITE': endpoint = 'inventory-stock-status-by-site'; break;
          case 'LOT_NUMBER': endpoint = 'lot-number-report'; break;
          case 'SERIAL_NUMBER': endpoint = 'serial-number-report'; break;
          case 'PRICE_LEVEL': endpoint = 'price-level-report'; break;
          case 'ASSEMBLY_SHORTAGE': endpoint = 'assembly-shortage'; break;
          case 'INVENTORY_REORDER': endpoint = 'inventory-reorder'; break;
          // QB Enterprise Financial Reports
          case 'PL_DETAIL': endpoint = 'pl-detail'; break;
          case 'PL_BY_MONTH': endpoint = 'pl-by-month'; break;
          case 'PL_YTD': endpoint = 'pl-ytd-comparison'; break;
          case 'PL_PREV_YEAR': endpoint = 'pl-prev-year'; break;
          case 'BS_DETAIL': endpoint = 'bs-detail'; break;
          case 'BS_SUMMARY': endpoint = 'bs-summary'; break;
          case 'BS_PREV_YEAR': endpoint = 'bs-prev-year'; break;
          case 'INCOME_TAX': endpoint = 'income-tax-summary'; break;
          case 'MISSING_CHECKS': endpoint = 'missing-checks'; break;
          // QB Enterprise Sales Reports
          case 'SALES_CUSTOMER_DETAIL': endpoint = 'sales-by-customer-detail'; break;
          case 'SALES_BY_REP_SUMMARY': endpoint = 'sales-by-rep-summary'; break;
          case 'SALES_BY_REP_DETAIL': endpoint = 'sales-by-rep-detail'; break;
          case 'SO_FULFILLMENT': endpoint = 'sales-order-fulfillment-worksheet'; break;
          case 'PENDING_SALES': endpoint = 'pending-sales'; break;
          // QB Enterprise Vendors / Purchases Reports
          case 'AP_AGING_DETAIL': endpoint = 'ap-aging-detail'; break;
          case 'VENDOR_BALANCE_DETAIL': endpoint = 'vendor-balance-detail'; break;
          case 'UNPAID_BILLS_DETAIL': endpoint = 'unpaid-bills-detail'; break;
          case 'BILLS_AND_PAYMENTS': endpoint = 'bills-and-payments'; break;
          case 'PURCHASES_BY_VENDOR_DETAIL': endpoint = 'purchases-by-vendor-detail'; break;
          case 'PURCHASES_BY_ITEM_DETAIL': endpoint = 'purchases-by-item-detail'; break;
          case 'VENDOR_CONTACT_LIST': endpoint = 'vendor-contact-list'; break;
          case 'REPORT_1099_SUMMARY': endpoint = '1099-summary'; break;
          case 'REPORT_1099_DETAIL': endpoint = '1099-detail'; break;
          // Banking Reports
          case 'TRANSACTION_LIST_BY_DATE': endpoint = 'transaction-list-by-date'; break;
          case 'TRANSACTION_DETAIL_BY_ACCOUNT': endpoint = 'transaction-detail-by-account'; break;
          case 'CHECK_DETAIL': endpoint = 'check-detail'; break;
          case 'DEPOSIT_DETAIL': endpoint = 'deposit-detail'; break;
          case 'RECONCILIATION_DISCREPANCY': endpoint = 'reconciliation-discrepancy'; break;
          case 'MISSING_CHECKS_BANKING': endpoint = 'missing-checks'; break;
          case 'BANKING_SUMMARY': endpoint = 'banking-summary'; break;
          // Accountant Reports
          case 'VOIDED_DELETED_TXN': endpoint = 'voided-deleted-transactions'; break;
          case 'ACCOUNT_LISTING': endpoint = 'account-listing'; break;
          case 'FIXED_ASSET_LISTING': endpoint = 'fixed-asset-listing'; break;
          case 'JOURNAL_ENTRIES': endpoint = 'journal-entries'; break;
          case 'INCOME_TAX_DETAIL': endpoint = 'income-tax-detail'; break;
          // QB Enterprise Exclusive
          case 'ROLE_PERMISSION_AUDIT': endpoint = 'role-permission-audit'; break;
          case 'BIN_LOCATION': endpoint = 'bin-location-report'; break;
          // Inventory Aging
          case 'INVENTORY_AGING': endpoint = 'inventory-aging'; break;
          // Consolidated (multi-company)
          case 'CONSOLIDATED_PL': endpoint = 'consolidated-pl'; break;
          case 'CONSOLIDATED_BS': endpoint = 'consolidated-bs'; break;
          case 'CONSOLIDATED_TB': endpoint = 'consolidated-tb'; break;
          // Allocation Reports
          case 'MRP_RECEPTION_REPORT':
            endpoint = params?.moId ? `mrp-reception-report?moId=${encodeURIComponent(params.moId)}` : 'mrp-reception-report';
            break;
          case 'ALLOCATION_STATUS': endpoint = 'allocation-status'; break;
          case 'PRODUCT_ALLOCATION': endpoint = 'product-allocation'; break;
          // Industry / Jobs & Time Reports
          case 'JOB_PROFIT_SUMMARY': endpoint = 'job-profitability-summary'; break;
          case 'JOB_PROFIT_DETAIL': endpoint = 'job-profitability-detail'; break;
          case 'JOB_COSTS_BY_JOB': endpoint = 'job-costs-by-job'; break;
          case 'JOB_COSTS_BY_VENDOR': endpoint = 'job-costs-by-vendor'; break;
          case 'JOB_COSTS_BY_TYPE': endpoint = 'job-costs-by-type'; break;
          case 'TIME_BY_JOB_SUMMARY': endpoint = 'time-by-job-summary'; break;
          case 'TIME_BY_JOB_DETAIL': endpoint = 'time-by-job-detail'; break;
          case 'TIME_BY_NAME': endpoint = 'time-by-name'; break;
          case 'MILEAGE_BY_VEHICLE': endpoint = 'mileage-by-vehicle'; break;
          case 'MILEAGE_BY_JOB': endpoint = 'mileage-by-job-detail'; break;
          case 'LOT_TRACEABILITY': endpoint = 'lot-number-report'; break;
          case 'SERIAL_HISTORY': endpoint = 'serial-number-report'; break;
          case 'MANAGEMENT_PKG': {
            const pkgType = params?.packageType || 'EXECUTIVE_SUMMARY';
            endpoint = `management-report-package?packageType=${pkgType}`;
            break;
          }
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
          previousYear: reportSettings?.comparison?.previousYear || false,
          ...(warehouseFilterId ? { warehouseId: warehouseFilterId } : {}),
        });
        setReportData(data);
      } catch (err: any) {
        console.error('Failed to fetch report:', err);
        setReportError(err?.response?.data?.error || err?.message || 'Failed to load report. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [type, fromDate, toDate, params, selectedClassId, reportSettings?.filters, reportSettings?.comparison, retryCount, warehouseFilterId]);

  const data = reportData || { sections: [] };

  const handleExcelExport = () => {
    setIsExporting(true);
    try {
      let csv = '';
      if (type === 'PL_BY_MONTH' && data.columns && data.rows) {
        // Columnar P&L: header row = Account + each month + Total
        csv = ['Account', ...(data.columns as string[]), 'Total'].join(',') + '\n';
        (data.rows as any[]).forEach((row: any) => {
          if (row.isHeading) {
            csv += `"${row.title}"${','.repeat((data.columns as string[]).length + 1)}\n`;
          } else {
            const monthCols = (row.monthValues || []).map((v: number) => v.toFixed(2)).join(',');
            const total = (row.total || 0).toFixed(2);
            csv += `"${'  '.repeat(row.indent || 0)}${(row.title || '').replace(/"/g, '')}",${monthCols},${total}\n`;
          }
        });
      } else if (type === 'GL' && data.transactions) {
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

  const handleServerExcelExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportReportToExcel(type, { fromDate, toDate, ...params });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to client-side CSV export on error
      handleExcelExport();
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
    const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    // Scale canvas to fit the PDF page width
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    // Paginate: offset the image up by one page height per page
    const totalPages = Math.ceil(imgHeight / pdfHeight);
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -(page * pdfHeight), imgWidth, imgHeight);
    }
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
    if (type === 'INV_VAL' || type === 'PHYSICAL_INVENTORY' || type === 'PHYSICAL_INVENTORY_WORKSHEET') {
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
      setRetryCount(c => c + 1);
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
        <button onClick={handleServerExcelExport} className="px-3 py-1 bg-green-50 border border-green-400 text-[11px] font-bold text-green-800 hover:bg-white rounded shadow-sm flex items-center gap-1">
          {isExporting ? '⏳ Exporting...' : 'Export Excel'}
        </button>
        <button onClick={() => setShowSchedule(true)} className="px-3 py-1 bg-blue-50 border border-blue-400 text-[11px] font-bold text-blue-800 hover:bg-white rounded shadow-sm flex items-center gap-1">
          ⏰ Schedule
        </button>
        {!['TERMS_LIST_REPORT', 'PHYSICAL_INVENTORY', 'PHYSICAL_INVENTORY_WORKSHEET', 'MANAGEMENT_PKG'].includes(type) && (
          <>
            <button onClick={() => setShowAddCustom(true)} className="px-3 py-1 bg-purple-600 text-white border border-purple-700 text-[11px] font-bold hover:brightness-110 rounded shadow-sm flex items-center gap-1">
              <span className="text-sm font-bold">+</span> Custom Column
            </button>
            <button onClick={() => setShowManageCustom(true)} className="px-3 py-1 bg-purple-100 border border-purple-400 text-[11px] font-bold text-purple-800 hover:bg-purple-200 rounded shadow-sm flex items-center gap-1">
              ⚙ Manage Columns
            </button>
          </>
        )}
        <button onClick={() => window.location.reload()} className="px-3 py-1 bg-blue-600 text-white border border-blue-700 text-[11px] font-bold hover:brightness-110 rounded shadow-sm">Refresh</button>
      </div>

      {/* Date Filters Bar */}
      <div className="bg-gray-100 border-b border-gray-300 p-3 flex gap-6 items-center text-[11px] font-bold text-gray-700">
        {!['TERMS_LIST', 'PHYSICAL_INV', 'BOM_REPORT', 'INV_BY_SITE', 'INV_BY_LOCATION', 'STOCK_STATUS_BY_SITE', 'PRICE_LEVEL'].includes(type) ? (
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
        {(type === 'PHYSICAL_INVENTORY_WORKSHEET' || type === 'PHYSICAL_INVENTORY') && availableWarehouses.length > 0 && (
          <div className="flex items-center gap-2 border-l pl-6">
            <span>Site / Warehouse</span>
            <select
              value={warehouseFilterId}
              onChange={e => setWarehouseFilterId(e.target.value)}
              className="border p-1 bg-white outline-none w-44 shadow-inner"
            >
              <option value="">All Sites</option>
              {availableWarehouses.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        )}
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
          {!loading && reportError && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-lg px-6 py-4 max-w-lg text-center">
                <p className="text-red-700 font-semibold text-sm mb-1">Failed to load report</p>
                <p className="text-red-500 text-xs">{reportError}</p>
              </div>
              <button
                onClick={() => setRetryCount(c => c + 1)}
                className="text-xs text-blue-600 underline hover:text-blue-800"
              >
                Retry
              </button>
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
              {reportSettings?.header?.subtitle || (type === 'BOM_REPORT' ? 'All Active Inventory Assemblies' : `${fromDate} through ${toDate}`)}
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
          ) : type === 'BOM_REPORT' ? (
            /* ── Bill of Materials custom table renderer ──────────────────── */
            <div className="space-y-8">
              {data.sections?.filter((r: any) => r.assemblyHeader).map((asmRow: any, asmIdx: number) => {
                const startIdx = data.sections.indexOf(asmRow);
                // Collect rows until the next assemblyHeader or end
                const compRows: any[] = [];
                for (let k = startIdx + 1; k < data.sections.length; k++) {
                  if (data.sections[k].assemblyHeader) break;
                  compRows.push(data.sections[k]);
                }
                const totalRow = compRows.find((r: any) => r.isTotal);
                const componentRows = compRows.filter((r: any) => !r.isTotal && !r.isSubheading && !r.isHeading);
                return (
                  <div key={asmIdx} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm print:break-inside-avoid">
                    {/* Assembly header */}
                    <div className="bg-orange-50 border-b-2 border-orange-200 px-4 py-3 flex justify-between items-center">
                      <div>
                        <span className="font-black text-orange-900 text-sm uppercase tracking-widest">{asmRow.title}</span>
                        {asmRow.sku && <span className="ml-2 text-xs text-gray-400">SKU: {asmRow.sku}</span>}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-500 font-bold uppercase">Std / Avg Cost</div>
                        <div className="font-black text-orange-800 font-mono">
                          ${(asmRow.extraValue3 || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    {/* Component table */}
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          <th className="text-left px-4 py-2">Component</th>
                          <th className="text-left px-2 py-2 w-28">Type</th>
                          <th className="text-left px-2 py-2 w-20">SKU</th>
                          <th className="text-right px-2 py-2 w-20">Base Qty</th>
                          <th className="text-right px-2 py-2 w-20">Eff Qty</th>
                          <th className="text-right px-2 py-2 w-24">Unit Cost</th>
                          <th className="text-right px-4 py-2 w-28">Ext Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {componentRows.length === 0 ? (
                          <tr><td colSpan={7} className="text-center text-gray-400 italic py-4 px-4">No components defined</td></tr>
                        ) : componentRows.map((comp: any, ci: number) => {
                          const isSubAsm = comp.compType === 'Inventory Assembly';
                          return (
                            <tr key={ci} className={`border-b border-gray-100 last:border-0 ${isSubAsm ? 'bg-blue-50/40 font-semibold' : ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                              <td className="px-4 py-1.5" style={{ paddingLeft: `${((comp.indent || 3) - 2) * 16 + 16}px` }}>
                                <span className={isSubAsm ? 'text-blue-700' : 'text-gray-800'}>
                                  {isSubAsm ? '⤷ ' : ''}{comp.title}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-gray-500">{comp.compType || '—'}</td>
                              <td className="px-2 py-1.5 text-gray-400 font-mono">{comp.sku || '—'}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-gray-700">{(comp.extraValue || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-gray-600">{(comp.extraValue2 || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-gray-600">${(comp.extraValue3 || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-1.5 text-right font-mono font-bold text-gray-800">${(comp.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {totalRow && (
                        <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                          <tr>
                            <td colSpan={6} className="px-4 py-2 font-black text-gray-700 text-right uppercase text-[10px] tracking-widest">Total BOM Cost</td>
                            <td className="px-4 py-2 text-right font-black font-mono text-orange-800">${(totalRow.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                );
              })}
              {(!data.sections || data.sections.filter((r: any) => r.assemblyHeader).length === 0) && (
                <p className="text-center text-gray-400 italic py-12">No active Inventory Assembly items found.</p>
              )}
            </div>

          ) : (type === 'INV_BY_SITE' || type === 'INV_BY_LOCATION') ? (
            /* ── Inventory by Site / by Location ─────────────────────────── */
            <div className="space-y-6">
              {(() => {
                const warehouseGroups: any[] = [];
                let currentWh: any = null;
                for (const row of (data.sections || [])) {
                  if (row.isHeading) continue;
                  if (row.isWarehouseHeader) { currentWh = { name: row.title, bins: [], rows: [], totals: [] }; warehouseGroups.push(currentWh); continue; }
                  if (currentWh) { if (row.isGrandTotal) { /* skip per-wh */ } else { currentWh.rows.push(row); } }
                }
                const grandRow = (data.sections || []).find((r: any) => r.isGrandTotal);
                return (
                  <>
                    {warehouseGroups.map((wh: any, wi: number) => {
                      // For INV_BY_LOCATION, identify bin headers inside wh.rows
                      let binGroups: { name: string; rows: any[] }[] = [];
                      if (type === 'INV_BY_LOCATION') {
                        let curBin: { name: string; rows: any[] } | null = null;
                        for (const r of wh.rows) {
                          if (r.isBinHeader) { curBin = { name: r.title, rows: [] }; binGroups.push(curBin); }
                          else if (curBin) curBin.rows.push(r);
                        }
                      }
                      return (
                        <div key={wi} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          <div className="bg-blue-50 border-b-2 border-blue-200 px-4 py-2">
                            <span className="font-black text-blue-900 text-sm uppercase tracking-widest">{wh.name}</span>
                          </div>
                          {type === 'INV_BY_SITE' ? (
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                  <th className="text-left px-4 py-2">Item</th>
                                  <th className="text-left px-2 py-2 w-28">SKU</th>
                                  <th className="text-right px-2 py-2 w-24">Qty on Hand</th>
                                  <th className="text-right px-2 py-2 w-24">Avg Cost</th>
                                  <th className="text-right px-4 py-2 w-28">Total Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {wh.rows.filter((r: any) => !r.isTotal).map((r: any, ri: number) => (
                                  <tr key={ri} className={`border-b border-gray-100 last:border-0 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                    <td className="px-4 py-1.5 text-gray-800">{r.title}</td>
                                    <td className="px-2 py-1.5 text-gray-400 font-mono">{r.sku || '—'}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">{(r.extraValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-gray-600">${(r.extraValue2 || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-1.5 text-right font-mono font-bold text-gray-800">${(r.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                ))}
                              </tbody>
                              {wh.rows.find((r: any) => r.isTotal) && (
                                <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                                  <tr>
                                    <td colSpan={2} className="px-4 py-2 font-black text-gray-700 text-[10px] uppercase tracking-widest">{wh.rows.find((r: any) => r.isTotal)?.title}</td>
                                    <td className="px-2 py-2 text-right font-black font-mono text-blue-800">{(wh.rows.find((r: any) => r.isTotal)?.extraValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td className="px-2 py-2"></td>
                                    <td className="px-4 py-2 text-right font-black font-mono text-blue-800">${(wh.rows.find((r: any) => r.isTotal)?.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          ) : (
                            /* INV_BY_LOCATION — bin sub-groups */
                            <div>
                              {binGroups.map((bg: any, bi: number) => (
                                <div key={bi} className="border-b border-gray-100 last:border-0">
                                  <div className="bg-gray-50 px-6 py-1.5 text-[11px] font-bold text-gray-600 uppercase tracking-widest border-b border-gray-200">{bg.name}</div>
                                  <table className="w-full text-xs">
                                    <thead className="bg-white border-b border-gray-100">
                                      <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        <th className="text-left px-6 py-1.5">Item</th>
                                        <th className="text-left px-2 py-1.5 w-28">SKU</th>
                                        <th className="text-right px-2 py-1.5 w-24">Qty on Hand</th>
                                        <th className="text-right px-2 py-1.5 w-24">Avg Cost</th>
                                        <th className="text-right px-4 py-1.5 w-28">Total Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {bg.rows.filter((r: any) => !r.isTotal).map((r: any, ri: number) => (
                                        <tr key={ri} className={`border-b border-gray-100 last:border-0 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                          <td className="px-6 py-1.5 text-gray-800">{r.title}</td>
                                          <td className="px-2 py-1.5 text-gray-400 font-mono">{r.sku || '—'}</td>
                                          <td className="px-2 py-1.5 text-right font-mono text-gray-700">{(r.extraValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                          <td className="px-2 py-1.5 text-right font-mono text-gray-600">${(r.extraValue2 || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                          <td className="px-4 py-1.5 text-right font-mono font-bold text-gray-800">${(r.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    {bg.rows.find((r: any) => r.isTotal) && (
                                      <tfoot className="border-t border-gray-200 bg-gray-50">
                                        <tr>
                                          <td colSpan={2} className="px-6 py-1.5 font-black text-gray-600 text-[10px] uppercase tracking-widest">{bg.rows.find((r: any) => r.isTotal)?.title}</td>
                                          <td className="px-2 py-1.5 text-right font-black font-mono text-blue-700">{(bg.rows.find((r: any) => r.isTotal)?.extraValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                          <td className="px-2 py-1.5"></td>
                                          <td className="px-4 py-1.5 text-right font-black font-mono text-blue-700">${(bg.rows.find((r: any) => r.isTotal)?.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                      </tfoot>
                                    )}
                                  </table>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {grandRow && (
                      <div className="flex justify-between items-center border-t-2 border-gray-800 pt-2 px-1 font-black text-sm">
                        <span>Grand Total</span>
                        <div className="flex gap-8">
                          <span className="font-mono">{(grandRow.extraValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} units</span>
                          <span className="font-mono">${(grandRow.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                    {warehouseGroups.length === 0 && <p className="text-center text-gray-400 italic py-12">No inventory on hand.</p>}
                  </>
                );
              })()}
            </div>

          ) : type === 'STOCK_STATUS_BY_SITE' ? (
            /* ── Inventory Stock Status by Site ─────────────────────────── */
            <div className="space-y-6">
              {(() => {
                const warehouseGroups: { name: string; rows: any[] }[] = [];
                let curWh: { name: string; rows: any[] } | null = null;
                for (const row of (data.sections || [])) {
                  if (row.isHeading) continue;
                  if (row.isWarehouseHeader) { curWh = { name: row.title, rows: [] }; warehouseGroups.push(curWh); continue; }
                  if (curWh && !row.isGrandTotal) curWh.rows.push(row);
                }
                const grandRow = (data.sections || []).find((r: any) => r.isGrandTotal);
                const statusBadge = (s: string) => {
                  if (s === 'OUT') return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">Out of Stock</span>;
                  if (s === 'LOW') return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">Below Reorder Pt</span>;
                  return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wide">OK</span>;
                };
                return (
                  <>
                    {warehouseGroups.map((wh: any, wi: number) => {
                      const itemRows = wh.rows.filter((r: any) => !r.isTotal);
                      const totalRow = wh.rows.find((r: any) => r.isTotal);
                      const needsReorder = itemRows.filter((r: any) => r.stockStatus && r.stockStatus !== 'OK').length;
                      return (
                        <div key={wi} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          <div className="bg-blue-50 border-b-2 border-blue-200 px-4 py-2 flex justify-between items-center">
                            <span className="font-black text-blue-900 text-sm uppercase tracking-widest">{wh.name}</span>
                            {needsReorder > 0 && (
                              <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded px-2 py-0.5">
                                {needsReorder} item{needsReorder !== 1 ? 's' : ''} need reordering
                              </span>
                            )}
                          </div>
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <th className="text-left px-4 py-2">Item</th>
                                <th className="text-left px-2 py-2 w-28">SKU</th>
                                <th className="text-right px-2 py-2 w-24">On Hand</th>
                                <th className="text-right px-2 py-2 w-24">Reorder Pt</th>
                                <th className="text-right px-2 py-2 w-24">Reorder Qty</th>
                                <th className="text-right px-2 py-2 w-24">Max Stock</th>
                                <th className="text-right px-2 py-2 w-24">Avg Cost</th>
                                <th className="text-right px-4 py-2 w-28">Total Value</th>
                                <th className="text-center px-3 py-2 w-32">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {itemRows.length === 0 && (
                                <tr><td colSpan={9} className="px-4 py-4 text-center text-gray-400 italic">No inventory items in this warehouse.</td></tr>
                              )}
                              {itemRows.map((r: any, ri: number) => (
                                <tr key={ri} className={`border-b border-gray-100 last:border-0 ${r.stockStatus === 'OUT' ? 'bg-red-50' : r.stockStatus === 'LOW' ? 'bg-amber-50' : ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                  <td className="px-4 py-1.5 font-semibold text-gray-800">{r.title}</td>
                                  <td className="px-2 py-1.5 text-gray-400 font-mono">{r.sku || '—'}</td>
                                  <td className={`px-2 py-1.5 text-right font-mono font-bold ${r.stockStatus === 'OUT' ? 'text-red-700' : r.stockStatus === 'LOW' ? 'text-amber-700' : 'text-gray-800'}`}>
                                    {(r.extraValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-2 py-1.5 text-right font-mono text-gray-600">
                                    {r.extraValue2 > 0 ? r.extraValue2.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                                  </td>
                                  <td className="px-2 py-1.5 text-right font-mono text-gray-600">
                                    {r.reorderQty > 0 ? r.reorderQty.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                                  </td>
                                  <td className="px-2 py-1.5 text-right font-mono text-gray-600">
                                    {r.maxStock > 0 ? r.maxStock.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                                  </td>
                                  <td className="px-2 py-1.5 text-right font-mono text-gray-600">
                                    ${(r.avgCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-4 py-1.5 text-right font-mono font-bold text-gray-800">
                                    ${(r.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-1.5 text-center">{statusBadge(r.stockStatus || 'OK')}</td>
                                </tr>
                              ))}
                            </tbody>
                            {totalRow && (
                              <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                                <tr>
                                  <td colSpan={8} className="px-4 py-2 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                    {totalRow.extraValue} item{totalRow.extraValue !== 1 ? 's' : ''} need reordering
                                  </td>
                                  <td />
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      );
                    })}
                    {grandRow && (
                      <div className="flex justify-between items-center border-t-2 border-gray-800 pt-2 px-1 font-black text-sm">
                        <span>{grandRow.title}</span>
                      </div>
                    )}
                    {warehouseGroups.length === 0 && <p className="text-center text-gray-400 italic py-12">No inventory items found.</p>}
                  </>
                );
              })()}
            </div>

          ) : type === 'LOT_NUMBER' ? (
            /* ── Lot Number Report ───────────────────────────────────────── */
            <div className="space-y-6">
              {(() => {
                const itemGroups: { name: string; sku: string; rows: any[] }[] = [];
                let curItem: { name: string; sku: string; rows: any[] } | null = null;
                for (const row of (data.sections || [])) {
                  if (row.isHeading || row.isGrandTotal) continue;
                  if (row.isSubheading) { curItem = { name: row.title, sku: row.sku || '', rows: [] }; itemGroups.push(curItem); }
                  else if (curItem) curItem.rows.push(row);
                }
                const statusColor = (s: string) => {
                  if (s === 'available') return 'bg-green-100 text-green-800';
                  if (s === 'on-hold') return 'bg-yellow-100 text-yellow-800';
                  if (s === 'expired') return 'bg-red-100 text-red-800';
                  if (s === 'quarantine') return 'bg-orange-100 text-orange-800';
                  if (s === 'consumed') return 'bg-gray-100 text-gray-500';
                  return 'bg-gray-100 text-gray-600';
                };
                return itemGroups.length === 0
                  ? <p className="text-center text-gray-400 italic py-12">No lot records found.</p>
                  : itemGroups.map((ig: any, ii: number) => (
                    <div key={ii} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-emerald-50 border-b-2 border-emerald-200 px-4 py-2 flex items-center gap-3">
                        <span className="font-black text-emerald-900 text-sm uppercase tracking-widest">{ig.name}</span>
                        {ig.sku && <span className="text-xs text-gray-400">SKU: {ig.sku}</span>}
                      </div>
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            <th className="text-left px-4 py-2">Lot #</th>
                            <th className="text-center px-2 py-2 w-24">Status</th>
                            <th className="text-right px-2 py-2 w-20">Qty Rcvd</th>
                            <th className="text-right px-2 py-2 w-20">Qty Rem.</th>
                            <th className="text-right px-2 py-2 w-22">Unit Cost</th>
                            <th className="text-right px-2 py-2 w-22">Value</th>
                            <th className="text-left px-2 py-2 w-24">Rcvd Date</th>
                            <th className="text-left px-2 py-2 w-24">Expiry</th>
                            <th className="text-left px-2 py-2 w-28">Warehouse</th>
                            <th className="text-left px-4 py-2 w-24">Bin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ig.rows.map((r: any, ri: number) => (
                            <tr key={ri} className={`border-b border-gray-100 last:border-0 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                              <td className="px-4 py-1.5 font-mono text-gray-800 font-semibold">{r.title}</td>
                              <td className="px-2 py-1.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusColor(r.lotStatus)}`}>{r.lotStatus || '—'}</span>
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono text-gray-600">{(r.extraValue2 || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                              <td className="px-2 py-1.5 text-right font-mono font-bold text-gray-800">{(r.extraValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-gray-600">${(r.extraValue3 || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-2 py-1.5 text-right font-mono font-bold text-gray-800">${(r.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-2 py-1.5 text-gray-500">{r.dateReceived || '—'}</td>
                              <td className={`px-2 py-1.5 ${r.expirationDate && new Date(r.expirationDate) < new Date() ? 'text-red-600 font-bold' : 'text-gray-500'}`}>{r.expirationDate || '—'}</td>
                              <td className="px-2 py-1.5 text-gray-500">{r.warehouseName || '—'}</td>
                              <td className="px-4 py-1.5 text-gray-400 font-mono">{r.binLocation || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ));
              })()}
            </div>

          ) : type === 'SERIAL_NUMBER' ? (
            /* ── Serial Number Report ────────────────────────────────────── */
            <div className="space-y-6">
              {(() => {
                const itemGroups: { name: string; sku: string; rows: any[] }[] = [];
                let curItem: { name: string; sku: string; rows: any[] } | null = null;
                for (const row of (data.sections || [])) {
                  if (row.isHeading || row.isGrandTotal) continue;
                  if (row.isSubheading) { curItem = { name: row.title, sku: row.sku || '', rows: [] }; itemGroups.push(curItem); }
                  else if (curItem) curItem.rows.push(row);
                }
                const statusColor = (s: string) => {
                  if (s === 'in-stock') return 'bg-green-100 text-green-800';
                  if (s === 'sold') return 'bg-blue-100 text-blue-800';
                  if (s === 'returned') return 'bg-yellow-100 text-yellow-800';
                  if (s === 'scrapped') return 'bg-red-100 text-red-800';
                  if (s === 'on-hold') return 'bg-orange-100 text-orange-800';
                  if (s === 'transferred') return 'bg-purple-100 text-purple-800';
                  return 'bg-gray-100 text-gray-600';
                };
                return itemGroups.length === 0
                  ? <p className="text-center text-gray-400 italic py-12">No serial number records found.</p>
                  : itemGroups.map((ig: any, ii: number) => (
                    <div key={ii} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-violet-50 border-b-2 border-violet-200 px-4 py-2 flex items-center gap-3">
                        <span className="font-black text-violet-900 text-sm uppercase tracking-widest">{ig.name}</span>
                        {ig.sku && <span className="text-xs text-gray-400">SKU: {ig.sku}</span>}
                      </div>
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            <th className="text-left px-4 py-2">Serial #</th>
                            <th className="text-center px-2 py-2 w-24">Status</th>
                            <th className="text-right px-2 py-2 w-22">Unit Cost</th>
                            <th className="text-left px-2 py-2 w-24">Rcvd Date</th>
                            <th className="text-left px-2 py-2 w-24">Date Sold</th>
                            <th className="text-left px-2 py-2 w-24">Warranty Exp.</th>
                            <th className="text-left px-2 py-2 w-28">Warehouse</th>
                            <th className="text-left px-2 py-2 w-28">Lot #</th>
                            <th className="text-left px-4 py-2">Customer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ig.rows.map((r: any, ri: number) => (
                            <tr key={ri} className={`border-b border-gray-100 last:border-0 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                              <td className="px-4 py-1.5 font-mono text-gray-800 font-semibold">{r.title}</td>
                              <td className="px-2 py-1.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusColor(r.snStatus)}`}>{r.snStatus || '—'}</span>
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono text-gray-600">${(r.extraValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-2 py-1.5 text-gray-500">{r.dateReceived || '—'}</td>
                              <td className="px-2 py-1.5 text-gray-500">{r.dateSold || '—'}</td>
                              <td className={`px-2 py-1.5 ${r.warrantyExpiry && new Date(r.warrantyExpiry) < new Date() ? 'text-red-600 font-bold' : 'text-gray-500'}`}>{r.warrantyExpiry || '—'}</td>
                              <td className="px-2 py-1.5 text-gray-500">{r.warehouseName || '—'}</td>
                              <td className="px-2 py-1.5 text-gray-400 font-mono">{r.lotNumber || '—'}</td>
                              <td className="px-4 py-1.5 text-gray-600">{r.customerName || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ));
              })()}
            </div>

          ) : type === 'PRICE_LEVEL' ? (
            /* ── Price Level Listing ─────────────────────────────────────── */
            <div className="space-y-6">
              {(() => {
                const groups: { name: string; typeDesc: string; priceLevelType: string; description: string; rows: any[] }[] = [];
                let cur: any = null;
                for (const row of (data.sections || [])) {
                  if (row.isHeading) continue;
                  if (row.isSubheading) { cur = { name: row.title, typeDesc: row.typeDesc || '', priceLevelType: row.priceLevelType || '', description: row.description || '', rows: [] }; groups.push(cur); }
                  else if (cur) cur.rows.push(row);
                }
                const typeColor = (t: string) => {
                  if (t === 'Fixed %') return 'bg-blue-100 text-blue-800';
                  if (t === 'Per Item') return 'bg-green-100 text-green-800';
                  if (t === 'Formula') return 'bg-purple-100 text-purple-800';
                  return 'bg-gray-100 text-gray-600';
                };
                return groups.length === 0
                  ? <p className="text-center text-gray-400 italic py-12">No active price levels found.</p>
                  : groups.map((g: any, gi: number) => (
                    <div key={gi} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-amber-50 border-b-2 border-amber-200 px-4 py-3 flex items-center justify-between">
                        <div>
                          <span className="font-black text-amber-900 text-sm uppercase tracking-widest">{g.name}</span>
                          {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${typeColor(g.priceLevelType)}`}>{g.priceLevelType}</span>
                      </div>
                      {g.priceLevelType === 'Per Item' && g.rows.filter((r: any) => r.isPriceLevelItem).length > 0 ? (
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                              <th className="text-left px-4 py-2">Item</th>
                              <th className="text-left px-2 py-2 w-28">SKU</th>
                              <th className="text-right px-2 py-2 w-28">Base Price</th>
                              <th className="text-right px-4 py-2 w-28">Custom Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.rows.filter((r: any) => r.isPriceLevelItem).map((r: any, ri: number) => (
                              <tr key={ri} className={`border-b border-gray-100 last:border-0 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                <td className="px-4 py-1.5 text-gray-800">{r.title}</td>
                                <td className="px-2 py-1.5 text-gray-400 font-mono">{r.sku || '—'}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-gray-500">${(r.extraValue2 || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-1.5 text-right font-mono font-bold text-amber-800">${(r.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-600">{g.typeDesc}</div>
                      )}
                    </div>
                  ));
              })()}
            </div>

          ) : type === 'ASSEMBLY_SHORTAGE' ? (
            /* ── Assembly Shortage Report ──────────────────────────────────── */
            <div className="space-y-6">
              {(() => {
                const sections = data.sections || [];
                // Group rows by subheading (each assembly is a subheading block)
                const groups: { header: any; colHeader: any; rows: any[]; }[] = [];
                let currentGroup: { header: any; colHeader: any; rows: any[] } | null = null;
                for (const row of sections) {
                  if (row.isHeading) continue;
                  if (row.isGrandTotal) continue;
                  if (row.isSubheading) {
                    currentGroup = { header: row, colHeader: null, rows: [] };
                    groups.push(currentGroup);
                  } else if (row.isColumnHeader) {
                    if (currentGroup) currentGroup.colHeader = row;
                  } else {
                    if (currentGroup) currentGroup.rows.push(row);
                    else groups.push({ header: null, colHeader: null, rows: [row] });
                  }
                }
                const grandRow = sections.find((r: any) => r.isGrandTotal);
                if (sections.length <= 1) return <p className="text-sm text-gray-500 italic py-8 text-center">{sections[1]?.title || 'No assembly shortages found.'}</p>;
                return (
                  <>
                    {groups.map((g, gi) => (
                      <div key={gi} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        {g.header && (
                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-gray-800">{g.header.title}</span>
                              <span className="text-xs text-gray-500">
                                On hand: <strong>{g.header.extraValue ?? 0}</strong> &nbsp;|&nbsp; Need to build: <strong>{g.header.extraValue2 ?? 0}</strong>
                              </span>
                            </div>
                          </div>
                        )}
                        <table className="w-full text-xs">
                          <thead className="bg-red-50 text-red-700 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="text-left px-4 py-1.5">Component</th>
                              <th className="text-right px-3 py-1.5 w-24">SKU</th>
                              <th className="text-right px-3 py-1.5 w-20">Needed</th>
                              <th className="text-right px-3 py-1.5 w-20">On Hand</th>
                              <th className="text-right px-3 py-1.5 w-20">Shortage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.rows.map((row, ri) => (
                              <tr key={ri} className={`border-t border-gray-100 ${row.isShortage ? 'bg-red-50/60' : ''}`}>
                                <td className="px-4 py-1.5 text-gray-800">{row.title}</td>
                                <td className="px-3 py-1.5 text-right text-gray-500 font-mono">{row.col2 || '—'}</td>
                                <td className="px-3 py-1.5 text-right font-mono">{row.col3 ?? 0}</td>
                                <td className="px-3 py-1.5 text-right font-mono">{row.col4 ?? 0}</td>
                                <td className={`px-3 py-1.5 text-right font-mono font-bold ${row.isShortage ? 'text-red-600' : 'text-gray-400'}`}>
                                  {row.col5 ?? 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                    {grandRow && (
                      <div className="flex justify-between items-center border-t-2 border-gray-800 pt-2 font-black text-sm px-2">
                        <span>TOTAL SHORTAGE QTY</span>
                        <span className="text-red-700">{grandRow.value ?? 0}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

          ) : type === 'INVENTORY_REORDER' ? (
            /* ── Inventory Reorder Report ──────────────────────────────────── */
            <div>
              {(() => {
                const sections = data.sections || [];
                const rows = sections.filter((r: any) => !r.isHeading && !r.isGrandTotal && !r.isColumnHeader);
                const grandRow = sections.find((r: any) => r.isGrandTotal);
                if (rows.length === 0) return <p className="text-sm text-gray-500 italic py-8 text-center">{sections.find((r: any) => r.indent === 1)?.title || 'No items at or below reorder point.'}</p>;
                return (
                  <>
                    <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-orange-50 text-orange-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="text-left px-4 py-2">Item</th>
                          <th className="text-left px-3 py-2 w-28">SKU</th>
                          <th className="text-right px-3 py-2 w-20">On Hand</th>
                          <th className="text-right px-3 py-2 w-24">Reorder Pt</th>
                          <th className="text-right px-3 py-2 w-24">Reorder Qty</th>
                          <th className="text-left px-3 py-2 w-40">Preferred Vendor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row: any, ri: number) => (
                          <tr key={ri} className={`border-t border-gray-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                            <td className="px-4 py-1.5 font-medium text-gray-800">{row.title}</td>
                            <td className="px-3 py-1.5 text-gray-500 font-mono">{row.sku || '—'}</td>
                            <td className={`px-3 py-1.5 text-right font-mono font-bold ${(row.value ?? 0) <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                              {row.value ?? 0}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-gray-600">{row.extraValue ?? '—'}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-gray-600">{row.extraValue2 ?? '—'}</td>
                            <td className="px-3 py-1.5 text-gray-500">{row.extraValue3 || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {grandRow && (
                      <div className="flex justify-between items-center border-t-2 border-gray-800 pt-2 font-black text-sm px-2 mt-4">
                        <span>{grandRow.title}</span>
                        <span className="text-orange-700">{grandRow.value ?? 0}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

          ) : type === 'PL_BY_MONTH' ? (
            /* ── P&L by Month (columnar) ─────────────────────────────────────── */
            <div className="overflow-x-auto">
              {data.columns && data.rows ? (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-800 bg-slate-50">
                      <th className="text-left px-3 py-2 font-black text-gray-700 uppercase tracking-wider w-48 sticky left-0 bg-slate-50">Account</th>
                      {(data.columns as string[]).map((col: string, ci: number) => (
                        <th key={ci} className="text-right px-3 py-2 font-black text-gray-700 uppercase tracking-wider w-28">{col}</th>
                      ))}
                      <th className="text-right px-3 py-2 font-black text-gray-700 uppercase tracking-wider w-28 border-l-2 border-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.rows as any[]).map((row: any, ri: number) => {
                      const isHead = row.isHeading;
                      const isTotal = row.isTotal;
                      const isGrand = row.isGrandTotal;
                      const colCount = (data.columns as string[]).length;
                      if (isHead) {
                        return (
                          <tr key={ri} className={`${row.spacing ? 'border-t-4 border-transparent' : ''}`}>
                            <td colSpan={colCount + 2} className="px-3 py-1.5 font-black text-slate-800 bg-gray-50 border-y border-gray-200 uppercase text-[10px] tracking-widest"
                              style={{ paddingLeft: `${12 + (row.indent || 0) * 10}px` }}>
                              {row.title}
                            </td>
                          </tr>
                        );
                      }
                      const rowCls = isGrand
                        ? 'bg-slate-50 font-black border-t-2 border-b-4 border-gray-800'
                        : isTotal ? 'font-bold border-t border-gray-400' : 'border-b border-gray-100';
                      return (
                        <tr key={ri} className={`${rowCls} ${row.spacing ? 'mt-4' : ''} hover:bg-yellow-50`}>
                          <td className="px-3 py-1.5 sticky left-0 bg-white" style={{ paddingLeft: `${12 + (row.indent || 0) * 10}px` }}>
                            {row.title}
                          </td>
                          {(row.monthValues as number[] || []).map((v: number, ci: number) => (
                            <td key={ci} className={`px-3 py-1.5 text-right font-mono ${v < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                              {v !== 0 ? v.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                            </td>
                          ))}
                          <td className={`px-3 py-1.5 text-right font-mono border-l-2 border-gray-300 font-bold ${(row.total || 0) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {(row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-400 italic py-12">No data for the selected period.</p>
              )}
            </div>

          ) : (type === 'BS_PREV_YEAR') ? (
            /* ── Balance Sheet Previous Year Comparison ─────────────────────── */
            <div className="space-y-1">
              <div className="flex justify-between items-center border-b-2 border-gray-800 pb-1 mb-2 font-black text-[10px] uppercase tracking-widest text-gray-500">
                <span className="w-64">Account</span>
                <div className="flex gap-4 text-right">
                  <span className="w-28">{data.meta?.asOf || 'Current'}</span>
                  <span className="w-28">{data.meta?.pyDate || 'Prior Year'}</span>
                  <span className="w-24">$ Change</span>
                  <span className="w-20">% Change</span>
                </div>
              </div>
              {(data.sections || []).map((row: any, i: number) => {
                if (row.isHeading) {
                  return (
                    <div key={i} className={`font-black text-slate-900 border-b border-gray-100 py-1 uppercase text-[11px] tracking-widest ${row.spacing ? 'mt-6' : ''}`}
                      style={{ paddingLeft: `${(row.indent || 0) * 12}px` }}>
                      {row.title}
                    </div>
                  );
                }
                const rowCls = row.isGrandTotal
                  ? 'bg-slate-50 border-t-2 border-b-4 border-gray-800 font-black py-2 mt-4'
                  : row.isTotal ? 'border-t border-gray-400 font-bold py-1' : 'py-0.5 text-gray-700';
                const pct = row.percentChange;
                const pctStr = pct !== null && pct !== undefined ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—';
                const chgCls = (row.dollarChange || 0) < 0 ? 'text-red-600' : (row.dollarChange || 0) > 0 ? 'text-green-700' : 'text-gray-400';
                return (
                  <div key={i} className={`flex justify-between items-center ${rowCls} ${row.spacing ? 'mt-6' : ''}`}
                    style={{ paddingLeft: `${(row.indent || 0) * 12}px` }}>
                    <span>{row.title}</span>
                    <div className="flex gap-4 text-right font-mono">
                      <span className="w-28">{row.value !== undefined ? row.value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}</span>
                      <span className="w-28 text-gray-500">{row.pyValue !== undefined ? row.pyValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}</span>
                      <span className={`w-24 ${chgCls}`}>{row.dollarChange !== undefined ? row.dollarChange.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}</span>
                      <span className={`w-20 ${chgCls}`}>{pctStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>

          ) : type === 'MISSING_CHECKS' ? (
            /* ── Missing Checks ─────────────────────────────────────────────── */
            <div className="space-y-4">
              {(() => {
                const sections = data.sections || [];
                const grandRow = sections.find((r: any) => r.isGrandTotal);
                const accountGroups: { name: string; msgs: any[]; missingRows: any[]; totalRow: any | null }[] = [];
                let cur: any = null;
                sections.forEach((r: any) => {
                  if (r.isHeading) return;
                  if (r.isGrandTotal) return;
                  if (r.isSubheading) { cur = { name: r.title, msgs: [], missingRows: [], totalRow: null }; accountGroups.push(cur); return; }
                  if (!cur) return;
                  if (r.isTotal) { cur.totalRow = r; return; }
                  if (r.isMissing) cur.missingRows.push(r);
                  else cur.msgs.push(r);
                });
                if (accountGroups.length === 0) {
                  return <p className="text-center text-gray-400 italic py-12">No check transactions found for the selected period.</p>;
                }
                return (
                  <>
                    {accountGroups.map((grp, gi) => (
                      <div key={gi} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
                          <span className="font-black text-amber-900 text-sm">{grp.name}</span>
                        </div>
                        {grp.msgs.length > 0 ? (
                          <div className="px-4 py-3 text-sm text-green-700 italic">{grp.msgs[0]?.title}</div>
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <th className="text-left px-4 py-2">Missing Check Number</th>
                                <th className="text-left px-4 py-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {grp.missingRows.map((r, ri) => (
                                <tr key={ri} className={`border-b border-gray-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-red-50'}`}>
                                  <td className="px-4 py-1.5 font-mono font-semibold text-red-700">{r.title}</td>
                                  <td className="px-4 py-1.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">Missing</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {grp.totalRow && (
                          <div className="border-t border-gray-200 px-4 py-2 font-bold text-sm text-amber-800 bg-amber-50/50">
                            {grp.totalRow.title}
                          </div>
                        )}
                      </div>
                    ))}
                    {grandRow && (
                      <div className="flex justify-between items-center border-t-2 border-gray-800 pt-3 font-black text-sm px-1">
                        <span>{grandRow.title}</span>
                        <span className="text-red-700 font-mono">{grandRow.value ?? 0}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

          ) : (type === 'TRANSACTION_LIST_BY_DATE' || type === 'CHECK_DETAIL' || type === 'DEPOSIT_DETAIL' || type === 'MISSING_CHECKS_BANKING') ? (
            /* ── Banking flat-table reports ────────────────────────────────── */
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b-2 border-gray-200">
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Ref #</th>
                    <th className="text-left px-3 py-2">Payee / Name</th>
                    <th className="text-left px-3 py-2">Account</th>
                    <th className="text-left px-3 py-2">Memo</th>
                    <th className="text-right px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.rows || []).map((r: any, i: number) => (
                    <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                      <td className="px-3 py-1.5 text-gray-600">{r.date}</td>
                      <td className="px-3 py-1.5">{r.type}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-500">{r.refNo || '—'}</td>
                      <td className="px-3 py-1.5 font-medium">{r.payee || r.payer || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.account || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-400 italic">{r.memo || ''}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-semibold">{(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {!(data.rows || []).length && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400 italic">No transactions found for the selected period.</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-800">
                  <tr>
                    <td colSpan={6} className="px-3 py-2 font-black text-sm text-right">TOTAL</td>
                    <td className="px-3 py-2 font-black text-sm text-right font-mono">
                      {((data.grandTotal ?? (data.rows || []).reduce((s: number, r: any) => s + (r.amount || 0), 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

          ) : (type === 'TRANSACTION_DETAIL_BY_ACCOUNT' || type === 'BANKING_SUMMARY' || type === 'RECONCILIATION_DISCREPANCY') ? (
            /* ── Banking sectioned reports ─────────────────────────────────── */
            <div className="space-y-4">
              {(data.sections || []).map((row: any, i: number) => {
                if (row.isHeading) return (
                  <div key={i} className={`font-black text-slate-900 border-b-2 border-gray-300 pb-1 text-sm ${row.spacing ? 'mt-6' : ''}`}
                    style={{ paddingLeft: `${(row.indent || 0) * 12}px` }}>
                    {row.title}
                  </div>
                );
                if (row.isGrandTotal) return (
                  <div key={i} className="flex justify-between font-black border-t-2 border-b-4 border-gray-800 py-2 mt-4 bg-slate-50 px-2 text-sm">
                    <span>{row.title}</span>
                    <span className="font-mono">{row.value !== null && row.value !== undefined ? row.value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}</span>
                  </div>
                );
                if (row.isTotal) return (
                  <div key={i} className="flex justify-between font-bold border-t border-gray-400 py-1 text-sm"
                    style={{ paddingLeft: `${(row.indent || 0) * 12}px` }}>
                    <span>{row.title}</span>
                    <span className="font-mono">{row.value !== null && row.value !== undefined ? row.value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}</span>
                  </div>
                );
                const balanceStr = row.extraValue !== undefined && typeof row.extraValue === 'number'
                  ? row.extraValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) : (row.extraValue || '');
                return (
                  <div key={i} className={`flex justify-between items-center py-0.5 text-xs text-gray-700 ${row.spacing ? 'mt-4' : ''} ${row.meta?.status === 'DISCREPANCY' ? 'text-red-600 font-semibold' : ''}`}
                    style={{ paddingLeft: `${(row.indent || 0) * 12}px` }}>
                    <span>{row.title}</span>
                    <div className="flex gap-4 font-mono">
                      {balanceStr && <span className="text-gray-400 w-28 text-right">{balanceStr}</span>}
                      <span className="w-28 text-right">{row.value !== null && row.value !== undefined ? row.value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

          ) : (type === 'VOIDED_DELETED_TXN') ? (
            /* ── Voided / Deleted Transactions ─────────────────────────────── */
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-red-50 sticky top-0">
                  <tr className="text-[10px] font-black text-red-600 uppercase tracking-widest border-b-2 border-red-200">
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Ref #</th>
                    <th className="text-left px-3 py-2">Payee</th>
                    <th className="text-left px-3 py-2">Account</th>
                    <th className="text-right px-3 py-2">Original Amount</th>
                    <th className="text-center px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.sections || []).filter((r: any) => r.meta?.txId).map((r: any, i: number) => (
                    <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-red-50/30'} hover:bg-red-50`}>
                      <td className="px-3 py-1.5 text-gray-600">{r.meta.date}</td>
                      <td className="px-3 py-1.5">{r.meta.type}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-500">{r.meta.refNo || '—'}</td>
                      <td className="px-3 py-1.5 font-medium">{r.meta.payee}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.meta.account}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{(r.meta.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.meta.status === 'Voided' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {r.meta.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!(data.sections || []).some((r: any) => r.meta?.txId) && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400 italic">No voided or deleted transactions found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

          ) : (type === 'JOURNAL_ENTRIES') ? (
            /* ── Journal Entries ────────────────────────────────────────────── */
            <div className="space-y-6">
              {(() => {
                const sections: any[] = data.sections || [];
                // Split into entry groups (each starting with isHeading + indent:1)
                const groups: { header: any; lines: any[] }[] = [];
                let cur: any = null;
                sections.forEach((r: any) => {
                  if (r.isHeading && !r.isGrandTotal && r.indent === 1) { cur = { header: r, lines: [] }; groups.push(cur); return; }
                  if (r.isGrandTotal || r.isTotal) return;
                  if (cur && !r.isHeading) cur.lines.push(r);
                });
                const totalRow = sections.find((r: any) => r.isGrandTotal);
                const debitRow = sections.find((r: any) => r.isTotal && r.title?.includes('DEBIT'));
                const creditRow = sections.find((r: any) => r.isTotal && r.title?.includes('CREDIT'));

                if (!groups.length) return (
                  <p className="text-center text-gray-400 italic py-12">No journal entries found for the selected period.</p>
                );
                return (
                  <>
                    {groups.map((grp, gi) => (
                      <div key={gi} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2">
                          <span className="font-black text-indigo-900 text-sm">{grp.header.title}</span>
                        </div>
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                              <th className="text-left px-4 py-2">Account</th>
                              <th className="text-right px-4 py-2">Debit</th>
                              <th className="text-right px-4 py-2">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grp.lines.map((l: any, li: number) => (
                              <tr key={li} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-1.5">{l.title}</td>
                                <td className="px-4 py-1.5 text-right font-mono text-green-700">
                                  {l.meta?.debit > 0 ? l.meta.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                                </td>
                                <td className="px-4 py-1.5 text-right font-mono text-red-600">
                                  {l.meta?.credit > 0 ? l.meta.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                    <div className="flex justify-end gap-8 border-t-2 border-gray-800 pt-3 font-black text-sm">
                      <span>Debits: <span className="font-mono text-green-700">{debitRow?.value?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</span></span>
                      <span>Credits: <span className="font-mono text-red-600">{creditRow?.value?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</span></span>
                      {totalRow && <span className={totalRow.value === 0 ? 'text-green-700' : 'text-red-700'}>{totalRow.title}</span>}
                    </div>
                  </>
                );
              })()}
            </div>

          ) : (type === 'FIXED_ASSET_LISTING') ? (
            /* ── Fixed Asset Listing ────────────────────────────────────────── */
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-teal-50 sticky top-0">
                  <tr className="text-[10px] font-black text-teal-700 uppercase tracking-widest border-b-2 border-teal-200">
                    <th className="text-left px-3 py-2">Asset Name</th>
                    <th className="text-left px-3 py-2">Tag</th>
                    <th className="text-left px-3 py-2">Serial #</th>
                    <th className="text-left px-3 py-2">Location</th>
                    <th className="text-left px-3 py-2">Purchase Date</th>
                    <th className="text-left px-3 py-2">Method</th>
                    <th className="text-right px-3 py-2">Life (yrs)</th>
                    <th className="text-right px-3 py-2">Cost</th>
                    <th className="text-right px-3 py-2">Accum. Deprec.</th>
                    <th className="text-right px-3 py-2">Book Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.sections || []).filter((r: any) => r.meta?.itemId).map((r: any, i: number) => (
                    <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-teal-50/20'} hover:bg-teal-50`}>
                      <td className="px-3 py-1.5 font-medium">{r.meta.name}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-500">{r.meta.assetTag || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.meta.serialNumber || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.meta.location || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-600">{r.meta.purchaseDate || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.meta.depreciationMethod || '—'}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{r.meta.usefulLifeYears ?? '—'}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{(r.meta.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-red-600">{(r.meta.depreciation || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-semibold text-teal-700">{(r.meta.bookValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {!(data.sections || []).some((r: any) => r.meta?.itemId) && (
                    <tr><td colSpan={10} className="px-3 py-8 text-center text-gray-400 italic">No fixed assets found. Set item type to "Fixed Asset" to include items here.</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-800">
                  {(() => {
                    const costRow = (data.sections || []).find((r: any) => r.isTotal && r.title?.includes('Cost') && !r.title?.includes('Deprec') && !r.title?.includes('Book'));
                    const depRow = (data.sections || []).find((r: any) => r.isTotal && r.title?.includes('Deprec'));
                    const totRow = (data.sections || []).find((r: any) => r.isGrandTotal);
                    return (
                      <tr className="font-black text-sm">
                        <td colSpan={7} className="px-3 py-2 text-right">Totals</td>
                        <td className="px-3 py-2 text-right font-mono">{(costRow?.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right font-mono text-red-600">{(depRow?.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right font-mono text-teal-700">{(totRow?.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>

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
        availableFields={['value', 'extraValue', 'extraValue2', 'ppValue', 'pyValue', 'Amount', 'quantity', 'open_balance']}
      />

      <ManageCustomColumnsModal
        isOpen={showManageCustom}
        onClose={() => setShowManageCustom(false)}
        reportType={type}
        onChanged={() => setRetryCount(c => c + 1)}
      />

      <SaveAsReportDialog
        isOpen={showSaveAs}
        onClose={() => setShowSaveAs(false)}
        onSave={handleConfirmSaveAs}
        defaultName={reportSettings?.header?.reportTitle || type.replace(/_/g, ' ') + ' - copy'}
      />

      {showSchedule && (
        <ScheduleReportDialog
          reportType={type}
          params={{ fromDate, toDate, ...params }}
          onClose={() => setShowSchedule(false)}
          onSaved={() => setShowSchedule(false)}
        />
      )}
    </div >
  );
};

export default ReportView;
