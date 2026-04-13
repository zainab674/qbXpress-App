import React, { useState, useCallback } from 'react';
import { Transaction, Vendor, Item, Budget, MemorizedReport, UIPreferences } from '../types';
import { useData } from '../contexts/DataContext';
import ReportTypeSelector from './ReportTypeSelector';
import { fetchReport, fetchReportSchedules, deleteReportSchedule } from '../services/api';
import {
   Search,
   Star,
   MoreVertical,
   ChevronDown,
   ChevronRight,
   Layout,
   FileText,
   Settings,
   LineChart,
   TrendingUp,
   Users,
   Package,
   PieChart,
   Clock,
   Plus,
   Trash2,
   Shield,
   MapPin,
   Database,
   BarChart2,
   Briefcase,
   DollarSign,
   RefreshCw,
   AlertCircle,
   Play,
   Download,
   Calendar,
   HardHat,
} from 'lucide-react';

// ─── Advanced Query Builder (Enterprise ODBC-equivalent) ─────────────────────

const ENTITY_OPTIONS = [
   { value: 'TRANSACTIONS', label: 'Transactions', fields: ['date','type','refNumber','name','memo','total','status'] },
   { value: 'CUSTOMERS',    label: 'Customers',    fields: ['name','email','phone','balance','creditLimit','terms','isActive'] },
   { value: 'ITEMS',        label: 'Items',        fields: ['name','sku','type','salesPrice','cost','onHand','reorderPoint','isActive'] },
   { value: 'VENDORS',      label: 'Vendors',      fields: ['name','email','phone','balance','terms','isActive'] },
   { value: 'INVENTORY',    label: 'Inventory Lots', fields: ['lotNumber','itemName','receivedDate','expiryDate','quantityReceived','quantityRemaining','unitCost','status'] },
];

function AdvancedQueryBuilder({ onOpenReport }: { onOpenReport: (type: any, title: string, params?: any) => void }) {
   const [entity, setEntity] = useState('TRANSACTIONS');
   const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setFullYear(d.getFullYear()-1); return d.toISOString().split('T')[0]; });
   const [toDate, setToDate]   = useState(() => new Date().toISOString().split('T')[0]);
   const [txType, setTxType]   = useState('All');
   const [status, setStatus]   = useState('All');
   const [minAmount, setMinAmount] = useState('');
   const [maxAmount, setMaxAmount] = useState('');
   const [isActive, setIsActive]   = useState('All');
   const [sortBy,   setSortBy]     = useState('');
   const [sortDir,  setSortDir]    = useState('desc');
   const [groupBy,  setGroupBy]    = useState('');
   const [rowLimit, setRowLimit]   = useState('500');
   const [results, setResults]     = useState<any>(null);
   const [loading, setLoading]     = useState(false);
   const [error,   setError]       = useState<string | null>(null);

   const entityDef = ENTITY_OPTIONS.find(e => e.value === entity)!;

   const runQuery = useCallback(async () => {
      setLoading(true); setError(null);
      try {
         const params: Record<string,string> = { entity, fromDate, toDate, limit: rowLimit };
         if (entity === 'TRANSACTIONS') {
            if (txType !== 'All') params.type = txType;
            if (status !== 'All') params.status = status;
            if (minAmount) params.minAmount = minAmount;
            if (maxAmount) params.maxAmount = maxAmount;
         } else if (['CUSTOMERS','ITEMS','VENDORS'].includes(entity) && isActive !== 'All') {
            params.isActive = isActive === 'Active' ? 'true' : 'false';
         }
         if (groupBy) params.groupBy = groupBy;
         if (sortBy)  { params.sortBy = sortBy; params.sortDir = sortDir; }
         const qs = new URLSearchParams(params).toString();
         const data = await fetchReport(`advanced-query?${qs}`, {});
         setResults(data);
      } catch (err: any) {
         setError(err.message || 'Query failed');
      } finally { setLoading(false); }
   }, [entity,fromDate,toDate,txType,status,minAmount,maxAmount,isActive,groupBy,sortBy,sortDir,rowLimit]);

   const exportCSV = () => {
      if (!results?.rows?.length) return;
      const cols: string[] = results.columns || Object.keys(results.rows[0]);
      const csv = [cols.join(','), ...results.rows.map((r: any) => cols.map((c: string) => `"${r[c]??''}"`).join(','))].join('\n');
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})), download: `query_${entity}.csv` });
      a.click();
   };

   return (
      <div className="space-y-4">
         <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
               <Database size={18} className="text-blue-600" />
               Advanced Query Builder
               <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Enterprise</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
               <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Data Source</label>
                  <select value={entity} onChange={e=>{setEntity(e.target.value);setSortBy('');setGroupBy('');}}
                     className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                     {ENTITY_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">From Date</label>
                  <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}
                     className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
               </div>
               <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">To Date</label>
                  <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}
                     className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
               </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
               {entity === 'TRANSACTIONS' && <>
                  <div>
                     <label className="block text-xs font-semibold text-gray-500 mb-1">Transaction Type</label>
                     <select value={txType} onChange={e=>setTxType(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {['All','INVOICE','PAYMENT','BILL','BILL_PAYMENT','PURCHASE_ORDER','SALES_ORDER','CREDIT_MEMO','JOURNAL_ENTRY'].map(t=><option key={t}>{t}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                     <select value={status} onChange={e=>setStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {['All','OPEN','PAID','DRAFT','CLOSED','VOID'].map(s=><option key={s}>{s}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-semibold text-gray-500 mb-1">Min ($)</label>
                     <input type="number" value={minAmount} onChange={e=>setMinAmount(e.target.value)} placeholder="0"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                     <label className="block text-xs font-semibold text-gray-500 mb-1">Max ($)</label>
                     <input type="number" value={maxAmount} onChange={e=>setMaxAmount(e.target.value)} placeholder="Any"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
               </>}
               {['CUSTOMERS','ITEMS','VENDORS'].includes(entity) && (
                  <div>
                     <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                     <select value={isActive} onChange={e=>setIsActive(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {['All','Active','Inactive'].map(s=><option key={s}>{s}</option>)}
                     </select>
                  </div>
               )}
               <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Group By</label>
                  <select value={groupBy} onChange={e=>setGroupBy(e.target.value)}
                     className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                     <option value="">None</option>
                     {entityDef.fields.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Sort By</label>
                  <div className="flex gap-1">
                     <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="">Default</option>
                        {entityDef.fields.map(f=><option key={f} value={f}>{f}</option>)}
                     </select>
                     <select value={sortDir} onChange={e=>setSortDir(e.target.value)}
                        className="w-16 border border-gray-300 rounded px-1 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="asc">Asc</option><option value="desc">Desc</option>
                     </select>
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Max Rows</label>
                  <select value={rowLimit} onChange={e=>setRowLimit(e.target.value)}
                     className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                     {['100','250','500','1000','2000'].map(n=><option key={n}>{n}</option>)}
                  </select>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={runQuery} disabled={loading}
                  className="bg-[#2ca01c] hover:bg-[#218315] disabled:bg-gray-300 text-white px-5 py-2 rounded text-sm font-semibold flex items-center gap-2 transition-colors">
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                  {loading ? 'Running…' : 'Run Query'}
               </button>
               {results?.rows?.length > 0 && (
                  <button onClick={exportCSV}
                     className="border border-gray-300 hover:border-gray-400 text-gray-700 px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors">
                     <Download size={16} /> Export CSV
                  </button>
               )}
               {results && <span className="text-xs text-gray-500 ml-2">{results.totalRows ?? 0} rows returned</span>}
            </div>
         </div>
         {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
               <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
               <p className="text-sm text-red-700">{error}</p>
            </div>
         )}
         {results?.rows?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
               <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm font-bold text-gray-700">
                  {entityDef.label} — {results.totalRows} record(s)
               </div>
               <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                     <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>{(results.columns||Object.keys(results.rows[0])).map((col:string)=>(
                           <th key={col} className="px-3 py-2 font-bold text-gray-600 whitespace-nowrap capitalize">{col}</th>
                        ))}</tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {results.rows.map((row:any,i:number)=>(
                           <tr key={i} className="hover:bg-blue-50 transition-colors">
                              {(results.columns||Object.keys(row)).map((col:string)=>(
                                 <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                    {typeof row[col]==='number' ? row[col].toLocaleString(undefined,{maximumFractionDigits:2}) : String(row[col]??'')}
                                 </td>
                              ))}
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         )}
         {results?.sections?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-1 text-sm max-h-[520px] overflow-y-auto">
               {results.sections.map((s:any,i:number)=>(
                  <div key={i} className={`flex justify-between py-1 ${s.isHeading?'font-bold text-gray-900 border-b pb-2 mb-2':''} ${s.isSubheading?'font-semibold text-gray-700 mt-3':''} ${s.isTotal?'font-bold border-t':''}`}
                     style={{paddingLeft:`${(s.indent||0)*12}px`}}>
                     <span>{s.title}</span>
                     {s.value!==undefined && <span>{typeof s.value==='number'?s.value.toLocaleString():s.value}</span>}
                  </div>
               ))}
            </div>
         )}
         {results && !results.rows?.length && !results.sections?.length && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-500 text-sm">No records returned.</div>
         )}
      </div>
   );
}

// ─── Management Report Packages ───────────────────────────────────────────────

const PACKAGES = [
   { id:'EXECUTIVE_SUMMARY',  title:'Executive Summary',  desc:'P&L highlights, cash position, AR aging, and key financial ratios for leadership review.', color:'bg-blue-50 border-blue-200',   iconColor:'text-blue-600' },
   { id:'COMPANY_OVERVIEW',   title:'Company Overview',   desc:'Balance sheet summary, equity statement, and financial health ratios.',                   color:'bg-purple-50 border-purple-200', iconColor:'text-purple-600' },
   { id:'SALES_PERFORMANCE',  title:'Sales Performance',  desc:'Sales by customer, by rep, and by item — full period revenue breakdown.',                  color:'bg-green-50 border-green-200',   iconColor:'text-green-600' },
];

function ManagementReportTab({ onOpenReport }: { onOpenReport:(type:any,title:string,params?:any)=>void }) {
   const [selected, setSelected] = useState<string|null>(null);
   const [fromDate, setFromDate] = useState(()=>{ const d=new Date(new Date().getFullYear(),0,1); return d.toISOString().split('T')[0]; });
   const [toDate,   setToDate]   = useState(()=>new Date().toISOString().split('T')[0]);
   const [data,    setData]      = useState<any>(null);
   const [loading, setLoading]   = useState(false);
   const [error,   setError]     = useState<string|null>(null);

   const loadPackage = async (pkgId: string) => {
      setSelected(pkgId); setData(null); setError(null); setLoading(true);
      try {
         const result = await fetchReport(
            `management-report-package?packageType=${pkgId}&fromDate=${fromDate}&toDate=${toDate}`, {}
         );
         setData(result);
      } catch (err:any) { setError(err.message||'Failed to load package'); }
      finally { setLoading(false); }
   };

   const pkg = PACKAGES.find(p=>p.id===selected);

   const fmtVal = (s: any) => {
      if (typeof s.value !== 'number') return s.value;
      if (s.isPercent) return `${s.value.toFixed(1)}%`;
      return `$${s.value.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
   };

   return (
      <div className="space-y-4">
         <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center gap-4 flex-wrap">
            <span className="text-sm font-semibold text-gray-600">Report Period:</span>
            <div className="flex items-center gap-2">
               <label className="text-xs text-gray-500">From</label>
               <input type="date" value={fromDate} onChange={e=>{setFromDate(e.target.value);setData(null);}}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2">
               <label className="text-xs text-gray-500">To</label>
               <input type="date" value={toDate} onChange={e=>{setToDate(e.target.value);setData(null);}}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            {selected && (
               <button onClick={()=>{setSelected(null);setData(null);}}
                  className="ml-auto text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <ChevronRight size={14} className="rotate-180" /> All Packages
               </button>
            )}
         </div>

         {!selected && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {PACKAGES.map(p=>(
                  <button key={p.id} onClick={()=>loadPackage(p.id)}
                     className={`text-left p-6 rounded-lg border-2 ${p.color} hover:shadow-md transition-all group`}>
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-white shadow-sm`}>
                        {p.id==='EXECUTIVE_SUMMARY' && <Briefcase size={22} className={p.iconColor} />}
                        {p.id==='COMPANY_OVERVIEW'  && <BarChart2  size={22} className={p.iconColor} />}
                        {p.id==='SALES_PERFORMANCE' && <TrendingUp size={22} className={p.iconColor} />}
                     </div>
                     <h4 className="font-bold text-gray-800 mb-1 group-hover:text-blue-700 transition-colors">{p.title}</h4>
                     <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
                     <div className="mt-4 text-xs font-semibold text-blue-600 flex items-center gap-1">Open Package <ChevronRight size={14} /></div>
                  </button>
               ))}
            </div>
         )}

         {loading && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
               <RefreshCw size={32} className="mx-auto text-gray-400 animate-spin mb-4" />
               <p className="text-gray-500">Generating {pkg?.title}…</p>
            </div>
         )}
         {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
               <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
               <p className="text-sm text-red-700">{error}</p>
            </div>
         )}
         {data && pkg && !loading && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
               <div className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between ${pkg.color.split(' ')[0]}`}>
                  <div>
                     <h3 className="font-bold text-gray-900">{pkg.title}</h3>
                     <p className="text-xs text-gray-500">{fromDate} — {toDate}</p>
                  </div>
                  <button onClick={()=>onOpenReport('MANAGEMENT_PKG',pkg.title,{packageType:pkg.id,fromDate,toDate})}
                     className="text-xs bg-white border border-gray-300 hover:border-gray-400 text-gray-700 px-3 py-1.5 rounded flex items-center gap-1 transition-colors">
                     <FileText size={14} /> Full Report View
                  </button>
               </div>
               <div className="p-4 max-h-[520px] overflow-y-auto space-y-0.5">
                  {(data.sections||[]).map((s:any,i:number)=>{
                     if (s.isHeading) return <div key={i} className="text-base font-bold text-gray-900 border-b pb-2 mb-3 mt-1">{s.title}</div>;
                     if (s.isSubheading) return <div key={i} className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mt-5 mb-2">{s.title}</div>;
                     if (s.isGrandTotal) return (
                        <div key={i} className="flex justify-between py-2 px-3 bg-gray-900 text-white rounded font-bold text-sm mt-4">
                           <span>{s.title}</span><span>{fmtVal(s)}</span>
                        </div>
                     );
                     if (s.isTotal) return (
                        <div key={i} className="flex justify-between py-1.5 border-t border-b font-semibold text-sm text-gray-800 my-1" style={{paddingLeft:`${(s.indent||0)*12}px`}}>
                           <span>{s.title}</span><span>{fmtVal(s)}</span>
                        </div>
                     );
                     return (
                        <div key={i} className="flex justify-between py-1 text-sm text-gray-700 hover:bg-gray-50" style={{paddingLeft:`${(s.indent||0)*12}px`}}>
                           <span>{s.title}</span>
                           {s.value!==undefined && <span className="text-gray-600">{fmtVal(s)}</span>}
                        </div>
                     );
                  })}
               </div>
            </div>
         )}
      </div>
   );
}

// ─── Financial Planning Tab ───────────────────────────────────────────────────

function FinancialPlanningTab({ onOpenReport, budgets }: { onOpenReport:(type:any,title:string,params?:any)=>void; budgets:Budget[] }) {
   const [subTab, setSubTab] = useState<'overview'|'planner'|'budgets'>('overview');

   return (
      <div className="space-y-4">
         <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex overflow-hidden">
            {(['overview','planner','budgets'] as const).map(tab=>(
               <button key={tab} onClick={()=>setSubTab(tab)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-r last:border-r-0 border-gray-200 ${subTab===tab?'bg-[#2ca01c] text-white':'text-gray-600 hover:bg-gray-50'}`}>
                  {tab==='overview'?'Cash Flow Overview':tab==='planner'?'Cash Flow Planner':'Budgets'}
               </button>
            ))}
         </div>

         {subTab==='overview' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
               <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-6">
                  <LineChart size={20} className="text-blue-600" /> Cash Flow Overview
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                     { title:'Statement of Cash Flows', desc:'Operating, investing & financing breakdown.', type:'CASH_FLOW', color:'bg-blue-50 border-blue-100', ico:<DollarSign size={24} className="text-blue-600" /> },
                     { title:'Cash Flow Forecast',      desc:'AI-driven multi-month projection from trends.',type:'FORECAST', color:'bg-green-50 border-green-100', ico:<TrendingUp size={24} className="text-green-600" /> },
                     { title:'Budget vs. Actual',       desc:'Compare budgets against real transactions.',   type:'BUDGET_VS_ACTUAL', color:'bg-purple-50 border-purple-100', ico:<BarChart2 size={24} className="text-purple-600" /> },
                  ].map(item=>(
                     <div key={item.title} className={`p-5 ${item.color} border rounded-lg cursor-pointer hover:shadow-md transition-all group`}
                        onClick={()=>onOpenReport(item.type,item.title)}>
                        {item.ico}
                        <p className="text-xs font-semibold uppercase tracking-wide mt-3 mb-1 text-gray-600">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                        <p className="text-xs font-medium text-blue-600 mt-3 group-hover:underline">Open Report →</p>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {subTab==='planner' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
               <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <TrendingUp size={20} className="text-green-600" /> Cash Flow Planner
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium ml-2">Enterprise</span>
               </h3>
               <p className="text-sm text-gray-500 mb-6">Projects future cash flows using historical income and expense trends. Blend 60% linear trend + 40% weighted moving average — QB Enterprise methodology.</p>
               <div className="space-y-3">
                  {[
                     {title:'3-Month Forecast', desc:'Short-term cash outlook',  params:{forecastMonths:3}},
                     {title:'6-Month Forecast', desc:'Mid-term projection',       params:{forecastMonths:6}},
                     {title:'12-Month Forecast',desc:'Full-year cash flow plan',  params:{forecastMonths:12}},
                  ].map(item=>(
                     <div key={item.title} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all group"
                        onClick={()=>onOpenReport('FORECAST',item.title,item.params)}>
                        <div>
                           <p className="font-semibold text-gray-800 group-hover:text-blue-700">{item.title}</p>
                           <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-600" />
                     </div>
                  ))}
               </div>
               <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Methodology</p>
                  <p className="text-xs text-amber-600">Forecasts blend linear trend (60%) with weighted moving average (40%) of trailing 6 months of actuals — matching QB Enterprise Cash Flow Projector logic.</p>
               </div>
            </div>
         )}

         {subTab==='budgets' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                     <DollarSign size={20} className="text-purple-600" /> Budgets
                  </h3>
                  <button onClick={()=>onOpenReport('BUDGET_VS_ACTUAL','Budget vs. Actual')}
                     className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-medium flex items-center gap-1 transition-colors">
                     <BarChart2 size={14} /> Budget vs. Actual Report
                  </button>
               </div>
               {budgets.length>0 ? (
                  <>
                     {(()=>{
                        const byYear = budgets.reduce((acc:any,b:any)=>{
                           if(!acc[b.year]) acc[b.year]={total:0,accounts:0};
                           acc[b.year].total += (b.monthlyAmounts||[]).reduce((s:number,v:number)=>s+(v||0),0);
                           acc[b.year].accounts++;
                           return acc;
                        },{});
                        return (
                           <div className="grid grid-cols-3 gap-4 mb-6">
                              {Object.entries(byYear).sort(([a],[b])=>Number(b)-Number(a)).slice(0,3).map(([yr,s]:any)=>(
                                 <div key={yr} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">FY {yr}</p>
                                    <p className="text-lg font-bold text-gray-900">${s.total.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
                                    <p className="text-xs text-gray-500">{s.accounts} line{s.accounts!==1?'s':''}</p>
                                 </div>
                              ))}
                           </div>
                        );
                     })()}
                     <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                           <thead className="bg-gray-50 border-y border-gray-200">
                              <tr>
                                 <th className="px-3 py-2 font-bold text-gray-600">Account</th>
                                 <th className="px-3 py-2 font-bold text-gray-600">Year</th>
                                 {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m=>(
                                    <th key={m} className="px-2 py-2 font-bold text-gray-600 text-right">{m}</th>
                                 ))}
                                 <th className="px-3 py-2 font-bold text-gray-600 text-right">Annual</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                              {budgets.slice(0,50).map((b:any)=>{
                                 const annual=(b.monthlyAmounts||[]).reduce((s:number,v:number)=>s+(v||0),0);
                                 return (
                                    <tr key={b.id} className="hover:bg-blue-50 transition-colors">
                                       <td className="px-3 py-2 font-medium text-gray-800">{b.accountId}</td>
                                       <td className="px-3 py-2 text-gray-600">{b.year}</td>
                                       {(b.monthlyAmounts||Array(12).fill(0)).map((v:number,i:number)=>(
                                          <td key={i} className="px-2 py-2 text-right text-gray-600">
                                             {v?`$${v.toLocaleString(undefined,{maximumFractionDigits:0})}`:'—'}
                                          </td>
                                       ))}
                                       <td className="px-3 py-2 text-right font-semibold text-gray-800">${annual.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                  </>
               ) : (
                  <div className="py-12 text-center">
                     <DollarSign size={48} className="mx-auto text-gray-200 mb-4" />
                     <p className="text-gray-500 font-medium mb-1">No budgets configured</p>
                     <p className="text-sm text-gray-400 mb-4">Set up budgets in Chart of Accounts to enable budget vs. actual reporting.</p>
                     <button onClick={()=>onOpenReport('BUDGET_VS_ACTUAL','Budget vs. Actual')}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                        View Budget vs. Actual
                     </button>
                  </div>
               )}
            </div>
         )}
      </div>
   );
}

// ─── Scheduled Reports Management Tab ────────────────────────────────────────

function ScheduledReportsTab() {
   const [schedules, setSchedules] = React.useState<any[]>([]);
   const [loading, setLoading] = React.useState(true);
   const [error, setError] = React.useState<string | null>(null);
   const [deleting, setDeleting] = React.useState<string | null>(null);

   const load = React.useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const data = await fetchReportSchedules();
         setSchedules(data);
      } catch (e: any) {
         setError(e.message || 'Failed to load schedules');
      } finally {
         setLoading(false);
      }
   }, []);

   React.useEffect(() => { load(); }, [load]);

   const handleDelete = async (id: string, name: string) => {
      if (!confirm(`Delete scheduled report "${name}"?`)) return;
      setDeleting(id);
      try {
         await deleteReportSchedule(id);
         setSchedules(prev => prev.filter(s => s.id !== id));
      } catch (e: any) {
         alert(e.message || 'Failed to delete schedule');
      } finally {
         setDeleting(null);
      }
   };

   const FREQ_LABELS: Record<string, string> = {
      '0 8 * * *': 'Daily at 8 AM',
      '0 8 * * 1': 'Weekly – Mon 8 AM',
      '0 8 1 * *': 'Monthly – 1st at 8 AM',
   };

   return (
      <div className="space-y-4">
         <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Calendar size={20} className="text-blue-600" /> Scheduled Reports
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium ml-2">Auto-delivered</span>
               </h3>
               <button onClick={load} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <RefreshCw size={14} /> Refresh
               </button>
            </div>

            <p className="text-sm text-gray-500 mb-6">
               Open any report and click <strong>⏰ Schedule</strong> to set up automatic delivery by email.
               Reports can be sent as Excel or PDF on a daily, weekly, or monthly cadence.
            </p>

            {loading && (
               <div className="py-12 text-center text-gray-400 text-sm">Loading schedules…</div>
            )}

            {error && (
               <div className="py-4 text-center text-red-500 text-sm flex items-center justify-center gap-2">
                  <AlertCircle size={16} /> {error}
               </div>
            )}

            {!loading && !error && schedules.length === 0 && (
               <div className="py-12 text-center">
                  <Calendar size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-500 font-medium mb-1">No scheduled reports</p>
                  <p className="text-sm text-gray-400">Open a report and click ⏰ Schedule to add one.</p>
               </div>
            )}

            {!loading && schedules.length > 0 && (
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 border-y border-gray-200">
                        <tr>
                           <th className="px-4 py-2 font-bold text-gray-600">Name</th>
                           <th className="px-4 py-2 font-bold text-gray-600">Report Type</th>
                           <th className="px-4 py-2 font-bold text-gray-600">Frequency</th>
                           <th className="px-4 py-2 font-bold text-gray-600">Format</th>
                           <th className="px-4 py-2 font-bold text-gray-600">Recipients</th>
                           <th className="px-4 py-2 font-bold text-gray-600">Status</th>
                           <th className="px-4 py-2 font-bold text-gray-600">Last Run</th>
                           <th className="px-4 py-2"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {schedules.map(s => (
                           <tr key={s.id} className="hover:bg-blue-50 transition-colors">
                              <td className="px-4 py-3 font-semibold text-gray-800">{s.name}</td>
                              <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.reportType}</td>
                              <td className="px-4 py-3 text-gray-600">
                                 {FREQ_LABELS[s.cronExpression] || <span className="font-mono text-xs">{s.cronExpression}</span>}
                              </td>
                              <td className="px-4 py-3">
                                 <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.format === 'Excel' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {s.format}
                                 </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">
                                 {(s.recipientEmails || []).join(', ') || '—'}
                              </td>
                              <td className="px-4 py-3">
                                 <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {s.isActive ? 'Active' : 'Paused'}
                                 </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">
                                 {s.lastRunAt ? new Date(s.lastRunAt).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                 <button
                                    onClick={() => handleDelete(s.id, s.name)}
                                    disabled={deleting === s.id}
                                    className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-gray-400 transition-colors"
                                    title="Delete schedule"
                                 >
                                    <Trash2 size={15} />
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>

         {/* Export instructions */}
         <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
               <Download size={16} className="text-gray-500" /> On-demand Export
            </h4>
            <p className="text-sm text-gray-500">
               Any report can be exported immediately using the <strong>Export Excel</strong> button in the report toolbar.
               PDF export is available via the <strong>Print / PDF</strong> button.
            </p>
         </div>
      </div>
   );
}

interface Props {
   transactions: Transaction[];
   vendors: Vendor[];
   items: Item[];
   budgets: Budget[];
   memorized: MemorizedReport[];
   onMemorize: (report: MemorizedReport) => void;
   onOpenReport: (type: any, title: string, params?: any) => void;
   onDeleteReport: (id: string) => void;
}

const ReportsCenter: React.FC<Props> = ({ transactions, vendors, items, budgets, memorized, onMemorize, onOpenReport, onDeleteReport }) => {
   const { uiPrefs, setUiPrefs } = useData();
   const [activeTab, setActiveTab] = useState<'STANDARD' | 'CUSTOM' | 'MANAGEMENT' | 'FINANCIAL' | 'SCHEDULED'>('STANDARD');
   const [expandedSections, setExpandedSections] = useState<string[]>(['Who owes you', 'Inventory', 'Business overview', 'Favourites', 'Sales', 'Banking', 'Accountant', 'Administration', 'Jobs & Time', 'Consolidated']);
   const [searchTerm, setSearchTerm] = useState('');
   const [showTypeSelector, setShowTypeSelector] = useState(false);

   const toggleSection = (section: string) => {
      setExpandedSections(prev =>
         prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
      );
   };

   const toggleFavorite = (e: React.MouseEvent, reportId: string) => {
      e.stopPropagation();
      setUiPrefs(prev => {
         const favorites = prev.favoriteReports || [];
         const newFavorites = favorites.includes(reportId)
            ? favorites.filter(id => id !== reportId)
            : [...favorites, reportId];
         return { ...prev, favoriteReports: newFavorites };
      });
   };

   const allStandardReports = [
      { id: 'PROFIT_AND_LOSS', title: 'Profit & Loss Standard', category: 'Business overview' },
      { id: 'BALANCE_SHEET', title: 'Balance Sheet Standard', category: 'Business overview' },
      { id: 'CASH_FLOW', title: 'Statement of Cash Flows', category: 'Business overview' },
      { id: 'AGING', title: 'Accounts receivable ageing summary', category: 'Who owes you' },
      { id: 'INVOICES_RECEIVED', title: 'Invoices and Received Payments', category: 'Who owes you' },
      { id: 'AGING_DETAIL', title: 'Accounts receivable ageing detail', category: 'Who owes you' },
      { id: 'OPEN_INVOICES', title: 'Open Invoices', category: 'Who owes you' },
      { id: 'COLLECTIONS', title: 'Collections Report', category: 'Who owes you' },
      { id: 'STATEMENT_LIST', title: 'Statement List', category: 'Who owes you' },
      { id: 'CUSTOMER_BALANCE', title: 'Customer Balance Summary', category: 'Who owes you' },
      { id: 'TERMS_LIST_REPORT', title: 'Terms List', category: 'Who owes you' },
      { id: 'CUSTOMER_BALANCE_DETAIL', title: 'Customer Balance Detail', category: 'Who owes you' },
      { id: 'UNBILLED_CHARGES', title: 'Unbilled charges', category: 'Who owes you' },
      { id: 'INVOICE_LIST', title: 'Invoice List', category: 'Who owes you' },
      { id: 'UNBILLED_TIME', title: 'Unbilled time', category: 'Who owes you' },
      { id: 'INV_VAL_DETAIL', title: 'Inventory Valuation Detail', category: 'Inventory' },
      { id: 'OPEN_PO_LIST', title: 'Open Purchase Order List', category: 'Inventory' },
      { id: 'INV_VAL', title: 'Inventory Valuation Summary', category: 'Inventory' },
      { id: 'STOCK_TAKE', title: 'Stock Take Worksheet', category: 'Inventory' },
      { id: 'OPEN_PO_DETAIL', title: 'Open Purchase Order Detail', category: 'Inventory' },
      { id: 'COST_VARIANCE', title: 'Cost Variance Report', category: 'Inventory' },
      { id: 'BOM_REPORT', title: 'Bill of Materials (Printable)', category: 'Inventory' },
      { id: 'INV_BY_SITE', title: 'Inventory by Site', category: 'Inventory' },
      { id: 'INV_BY_LOCATION', title: 'Inventory by Location', category: 'Inventory' },
      { id: 'STOCK_STATUS_BY_SITE', title: 'Inventory Stock Status by Site', category: 'Inventory' },
      { id: 'LOT_NUMBER', title: 'Lot Number Report', category: 'Inventory' },
      { id: 'SERIAL_NUMBER', title: 'Serial Number Report', category: 'Inventory' },
      { id: 'PRICE_LEVEL', title: 'Price Level Listing', category: 'Inventory' },
      { id: 'ASSEMBLY_SHORTAGE', title: 'Assembly Shortage Report', category: 'Inventory' },
      { id: 'INVENTORY_REORDER', title: 'Inventory Reorder Report', category: 'Inventory' },
      // Allocation Reports
      { id: 'ALLOCATION_STATUS',  title: 'Allocation Status Report',    category: 'Inventory' },
      { id: 'PRODUCT_ALLOCATION', title: 'Product Allocation by Order', category: 'Inventory' },
      { id: 'MRP_RECEPTION_REPORT', title: 'MRP Reception Report',      category: 'Inventory' },
      { id: 'BIN_LOCATION', title: 'Bin Location Report', category: 'Inventory' },
      { id: 'INVENTORY_AGING', title: 'Inventory Ageing Summary', category: 'Inventory' },
      { id: 'FORECAST', title: 'Cash Flow Forecast', category: 'Financial planning' },
      // QB Enterprise Financial Reports
      { id: 'PL_DETAIL',    title: 'Profit & Loss Detail',                category: 'Business overview' },
      { id: 'PL_BY_MONTH',  title: 'Profit & Loss by Month',              category: 'Business overview' },
      { id: 'PL_YTD',       title: 'Profit & Loss YTD Comparison',        category: 'Business overview' },
      { id: 'PL_PREV_YEAR', title: 'Profit & Loss Prev Year Comparison',  category: 'Business overview' },
      { id: 'BS_DETAIL',    title: 'Balance Sheet Detail',                 category: 'Business overview' },
      { id: 'BS_SUMMARY',   title: 'Balance Sheet Summary',               category: 'Business overview' },
      { id: 'BS_PREV_YEAR', title: 'Balance Sheet Prev Year Comparison',  category: 'Business overview' },
      { id: 'INCOME_TAX',   title: 'Income Tax Summary',                  category: 'Business overview' },
      { id: 'MISSING_CHECKS', title: 'Missing Checks',                    category: 'Business overview' },
      // QB Enterprise Sales Reports
      { id: 'SALES_CUSTOMER_DETAIL', title: 'Sales by Customer Detail',           category: 'Sales' },
      { id: 'SALES_BY_REP_SUMMARY',  title: 'Sales by Rep Summary',               category: 'Sales' },
      { id: 'SALES_BY_REP_DETAIL',   title: 'Sales by Rep Detail',                category: 'Sales' },
      { id: 'SO_FULFILLMENT',        title: 'Sales Order Fulfillment Worksheet',   category: 'Sales' },
      { id: 'PENDING_SALES',         title: 'Pending Sales',                       category: 'Sales' },
      // QB Enterprise Vendors / Purchases Reports
      { id: 'AP_AGING_DETAIL',            title: 'A/P Aging Detail',              category: 'Vendors & Purchases' },
      { id: 'VENDOR_BALANCE_DETAIL',      title: 'Vendor Balance Detail',         category: 'Vendors & Purchases' },
      { id: 'UNPAID_BILLS_DETAIL',        title: 'Unpaid Bills Detail',           category: 'Vendors & Purchases' },
      { id: 'BILLS_AND_PAYMENTS',         title: 'Bills and Applied Payments',    category: 'Vendors & Purchases' },
      { id: 'PURCHASES_BY_VENDOR_DETAIL', title: 'Purchases by Vendor Detail',   category: 'Vendors & Purchases' },
      { id: 'PURCHASES_BY_ITEM_DETAIL',   title: 'Purchases by Item Detail',     category: 'Vendors & Purchases' },
      { id: 'VENDOR_CONTACT_LIST',        title: 'Vendor Contact List',          category: 'Vendors & Purchases' },
      { id: 'REPORT_1099_SUMMARY',        title: '1099 Summary',                 category: 'Vendors & Purchases' },
      { id: 'REPORT_1099_DETAIL',         title: '1099 Detail',                  category: 'Vendors & Purchases' },
      // Banking Reports
      { id: 'TRANSACTION_LIST_BY_DATE',      title: 'Transaction List by Date',        category: 'Banking' },
      { id: 'TRANSACTION_DETAIL_BY_ACCOUNT', title: 'Transaction Detail by Account',   category: 'Banking' },
      { id: 'CHECK_DETAIL',                  title: 'Check Detail',                    category: 'Banking' },
      { id: 'DEPOSIT_DETAIL',                title: 'Deposit Detail',                  category: 'Banking' },
      { id: 'RECONCILIATION_DISCREPANCY',    title: 'Reconciliation Discrepancy',      category: 'Banking' },
      { id: 'MISSING_CHECKS_BANKING',        title: 'Missing Checks',                  category: 'Banking' },
      { id: 'BANKING_SUMMARY',               title: 'Banking Summary',                 category: 'Banking' },
      // Accountant Reports
      { id: 'VOIDED_DELETED_TXN',    title: 'Voided / Deleted Transactions', category: 'Accountant' },
      { id: 'ACCOUNT_LISTING',       title: 'Account Listing',               category: 'Accountant' },
      { id: 'FIXED_ASSET_LISTING',   title: 'Fixed Asset Listing',           category: 'Accountant' },
      { id: 'JOURNAL_ENTRIES',       title: 'Journal Entries',               category: 'Accountant' },
      { id: 'INCOME_TAX_DETAIL',     title: 'Income Tax Detail',             category: 'Accountant' },
      { id: 'ADJUSTED_TRIAL_BALANCE',title: 'Adjusted Trial Balance',        category: 'Accountant' },
      { id: 'AUDIT_TRAIL_DETAIL',    title: 'Audit Trail (Detail)',          category: 'Accountant' },
      // QB Enterprise — Administration
      { id: 'ROLE_PERMISSION_AUDIT', title: 'Role & Permission Audit',       category: 'Administration' },
      // Jobs & Time (Contractor / Construction industry)
      { id: 'JOB_PROFIT_SUMMARY',  title: 'Job Profitability Summary',       category: 'Jobs & Time' },
      { id: 'JOB_PROFIT_DETAIL',   title: 'Job Profitability Detail',        category: 'Jobs & Time' },
      { id: 'JOB_ESTIMATES_VS_ACTUALS', title: 'Job Estimates vs. Actuals',  category: 'Jobs & Time' },
      { id: 'JOB_COSTS_BY_JOB',    title: 'Job Costs by Job',                category: 'Jobs & Time' },
      { id: 'JOB_COSTS_BY_VENDOR', title: 'Job Costs by Vendor',             category: 'Jobs & Time' },
      { id: 'JOB_COSTS_BY_TYPE',   title: 'Job Costs by Type',               category: 'Jobs & Time' },
      { id: 'CHANGE_ORDER_LOG',    title: 'Change Order Log',                 category: 'Jobs & Time' },
      { id: 'TIME_BY_JOB_SUMMARY', title: 'Time by Job Summary',             category: 'Jobs & Time' },
      { id: 'TIME_BY_JOB_DETAIL',  title: 'Time by Job Detail',              category: 'Jobs & Time' },
      { id: 'TIME_BY_NAME',        title: 'Time by Name',                    category: 'Jobs & Time' },
      { id: 'MILEAGE_BY_VEHICLE',  title: 'Mileage by Vehicle',              category: 'Jobs & Time' },
      { id: 'MILEAGE_BY_JOB',      title: 'Mileage by Job Detail',           category: 'Jobs & Time' },
      // Consolidated (multi-company)
      { id: 'CONSOLIDATED_PL', title: 'Consolidated Profit & Loss',  category: 'Consolidated' },
      { id: 'CONSOLIDATED_BS', title: 'Consolidated Balance Sheet',  category: 'Consolidated' },
      { id: 'CONSOLIDATED_TB', title: 'Consolidated Trial Balance',  category: 'Consolidated' },
   ];

   const favoriteIds = uiPrefs.favoriteReports || [];

   const reportCategories = [
      {
         name: 'Favourites',
         reports: [
            ...allStandardReports.filter(r => favoriteIds.includes(r.id)),
            ...memorized.filter(r => favoriteIds.includes(r.id)).map(r => ({ id: r.id, title: r.name, isCustom: true }))
         ]
      },
      {
         name: 'Business overview',
         reports: allStandardReports.filter(r => r.category === 'Business overview')
      },
      {
         name: 'Who owes you',
         reports: allStandardReports.filter(r => r.category === 'Who owes you')
      },
      {
         name: 'Inventory',
         reports: allStandardReports.filter(r => r.category === 'Inventory')
      },
      {
         name: 'Financial planning',
         reports: allStandardReports.filter(r => r.category === 'Financial planning')
      },
      {
         name: 'Sales',
         reports: allStandardReports.filter(r => r.category === 'Sales')
      },
      {
         name: 'Vendors & Purchases',
         reports: allStandardReports.filter(r => r.category === 'Vendors & Purchases')
      },
      {
         name: 'Banking',
         reports: allStandardReports.filter(r => r.category === 'Banking')
      },
      {
         name: 'Accountant',
         reports: allStandardReports.filter(r => r.category === 'Accountant')
      },
      {
         name: 'Administration',
         reports: allStandardReports.filter(r => r.category === 'Administration')
      },
      {
         name: 'Jobs & Time',
         reports: allStandardReports.filter(r => r.category === 'Jobs & Time')
      },
      {
         name: 'Consolidated',
         reports: allStandardReports.filter(r => r.category === 'Consolidated')
      },
   ];

   const sidebarItems = [
      { id: 'STANDARD',   label: 'Standard reports',    icon: <FileText   size={18} /> },
      { id: 'CUSTOM',     label: 'Custom reports',      icon: <Database   size={18} /> },
      { id: 'MANAGEMENT', label: 'Management reports',  icon: <Briefcase  size={18} /> },
      { id: 'FINANCIAL',  label: 'Financial planning',  icon: <TrendingUp size={18} /> },
      { id: 'SCHEDULED',  label: 'Scheduled reports',   icon: <Calendar   size={18} /> },
   ];

   const ENTERPRISE_REPORTS = new Set(['BIN_LOCATION','ROLE_PERMISSION_AUDIT']);

   const renderReportItem = (report: any) => {
      const isFavorite = favoriteIds.includes(report.id);
      const isEnterprise = ENTERPRISE_REPORTS.has(report.id);
      return (
         <div
            key={report.id}
            className="flex items-center justify-between py-2 px-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer group"
            onClick={() => {
               if (report.id === 'SERIAL_NUMBER') {
                  onOpenReport('SERIAL_HISTORY', 'Serial Number History / Where-Used');
               } else if (report.id === 'LOT_NUMBER') {
                  onOpenReport('LOT_TRACEABILITY', 'Lot Traceability');
               } else {
                  onOpenReport(report.id, report.title);
               }
            }}
         >
            <div className="flex items-center gap-2 min-w-0">
               {report.id === 'BIN_LOCATION'        && <MapPin  size={13} className="text-blue-500 flex-shrink-0" />}
               {report.id === 'ROLE_PERMISSION_AUDIT' && <Shield size={13} className="text-orange-500 flex-shrink-0" />}
               <span className="text-sm text-gray-700 font-medium group-hover:text-blue-600 transition-colors truncate">{report.title}</span>
               {isEnterprise && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Enterprise</span>}
            </div>
            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
               <button onClick={(e) => toggleFavorite(e, report.id)}>
                  <Star
                     size={16}
                     className={isFavorite ? "fill-green-500 text-green-500" : "text-gray-400 hover:text-green-500"}
                  />
               </button>
               <MoreVertical size={16} className="text-gray-400 hover:text-gray-600" />
            </div>
         </div>
      );
   };

   return (
      <div className="flex h-full bg-[#f4f5f8] font-sans">
         {/* Sidebar */}
         <div className="w-64 bg-white border-r border-gray-200 flex flex-col pt-4">
            <div className="px-6 mb-6">
               <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                  Reports & Analytics
                  <button className="text-gray-400 hover:text-gray-600">
                     <Settings size={14} />
                  </button>
               </h2>
            </div>
            <nav className="flex-1">
               {sidebarItems.map(item => (
                  <button
                     key={item.id}
                     onClick={() => setActiveTab(item.id as any)}
                     className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors ${activeTab === item.id
                        ? 'bg-gray-100 text-black border-l-4 border-black'
                        : 'text-gray-600 hover:bg-gray-50'
                        }`}
                  >
                     <span className="mr-3 text-gray-400">{item.icon}</span>
                     <span>{item.label}</span>
                  </button>
               ))}
            </nav>
         </div>

         {/* Main Content */}
         <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar with Search */}
            <div className="bg-white p-4 border-b border-gray-200 flex items-center gap-4">
               <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                     type="text"
                     placeholder="Type report name here"
                     className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                     value={searchTerm}
                     onChange={(e) => { setSearchTerm(e.target.value); if (e.target.value) setActiveTab('STANDARD'); }}
                  />
                  {searchTerm ? (
                     <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 font-bold">×</button>
                  ) : (
                     <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ChevronDown size={14} className="text-gray-400" />
                     </div>
                  )}
               </div>
               <button
                  onClick={() => setShowTypeSelector(true)}
                  className="bg-[#2ca01c] text-white px-4 py-2 text-sm font-semibold rounded hover:bg-[#218315] transition-all flex items-center gap-2"
               >
                  <Plus size={18} />
                  Create new report
               </button>
            </div>

            {/* Reports List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {activeTab === 'STANDARD' && (() => {
                  const searchFiltered = searchTerm
                     ? allStandardReports.filter(r => r.title.toLowerCase().includes(searchTerm.toLowerCase()))
                     : null;
                  const categoriesToShow = searchFiltered
                     ? [{ name: `Search Results (${searchFiltered.length})`, reports: searchFiltered }]
                     : reportCategories;
                  return categoriesToShow.map(category => (
                     <div key={category.name} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <button
                           onClick={() => toggleSection(category.name)}
                           className="w-full flex items-center px-4 py-3 bg-white hover:bg-gray-50 border-b border-gray-200 transition-colors"
                        >
                           {expandedSections.includes(category.name) || searchFiltered
                              ? <ChevronDown size={18} className="mr-2 text-gray-500" />
                              : <ChevronRight size={18} className="mr-2 text-gray-500" />}
                           <span className="text-base font-bold text-gray-800">{category.name}</span>
                           <span className="ml-2 text-xs text-gray-400">({category.reports.length})</span>
                           {category.name === 'Administration' && (
                              <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-medium">Enterprise</span>
                           )}
                           {category.name === 'Jobs & Time' && (
                              <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                 <HardHat size={11} /> Contractor
                              </span>
                           )}
                        </button>
                        {(expandedSections.includes(category.name) || searchFiltered) && (
                           <div className="p-2">
                              {category.reports.length > 0 ? (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                                    {category.reports.map(report => renderReportItem(report))}
                                 </div>
                              ) : (
                                 <div className="py-8 text-center text-gray-400 italic text-sm">
                                    No reports in this category yet.
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                  ));
               })()}

               {activeTab === 'CUSTOM' && (
                  <div className="space-y-4">
                     {/* Advanced Query Builder — Enterprise ODBC equivalent */}
                     <AdvancedQueryBuilder onOpenReport={onOpenReport} />

                     {/* Memorized reports */}
                     <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                        <div className="flex justify-between items-center mb-6">
                           <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                              <Clock size={18} className="text-gray-500" /> Memorized Reports
                           </h3>
                           <div className="text-sm text-gray-500">{memorized.length} saved</div>
                        </div>
                        {memorized.length > 0 ? (
                           <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                 <thead className="bg-gray-50 border-y border-gray-200">
                                    <tr>
                                       <th className="px-4 py-3 w-10"></th>
                                       <th className="px-4 py-3 font-bold text-gray-600">Report Name</th>
                                       <th className="px-4 py-3 font-bold text-gray-600">Base Type</th>
                                       <th className="px-4 py-3 font-bold text-gray-600">Date Created</th>
                                       <th className="px-4 py-3"></th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100">
                                    {memorized.map(r => {
                                       const isFavorite = favoriteIds.includes(r.id);
                                       return (
                                          <tr key={r.id} className="hover:bg-blue-50 cursor-pointer group transition-colors"
                                             onClick={() => {
                                                const isBuilderReport = ['INVOICE','BILLS','SALES','EXPENSES','JOURNAL','BANKING','TRANSACTIONS'].includes(r.baseType);
                                                if (isBuilderReport) {
                                                   onOpenReport('REPORT_BUILDER', r.name, { reportType: r.baseType, ...r.params });
                                                } else {
                                                   const typeMap: Record<string,string> = { 'PL':'PROFIT_AND_LOSS','BS':'BALANCE_SHEET','GL':'GENERAL_LEDGER' };
                                                   onOpenReport(typeMap[r.baseType] || r.baseType, r.name, r.params);
                                                }
                                             }}>
                                             <td className="px-4 py-3">
                                                <button onClick={(e) => toggleFavorite(e, r.id)}>
                                                   <Star size={16} className={isFavorite ? "fill-green-500 text-green-500" : "text-gray-400 hover:text-green-500"} />
                                                </button>
                                             </td>
                                             <td className="px-4 py-3 font-semibold text-blue-700">{r.name}</td>
                                             <td className="px-4 py-3 text-gray-600">{r.baseType}</td>
                                             <td className="px-4 py-3 text-gray-500">{r.dateCreated}</td>
                                             <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                   <button className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <MoreVertical size={16} className="text-gray-400" />
                                                   </button>
                                                   <button className="p-1 hover:bg-red-100 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400"
                                                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete this report?')) onDeleteReport(r.id); }}>
                                                      <Trash2 size={16} />
                                                   </button>
                                                </div>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                 </tbody>
                              </table>
                           </div>
                        ) : (
                           <div className="py-12 text-center">
                              <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                              <p className="text-gray-500">Your memorized and customized reports will appear here.</p>
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {activeTab === 'MANAGEMENT' && <ManagementReportTab onOpenReport={onOpenReport} />}

               {activeTab === 'FINANCIAL' && <FinancialPlanningTab onOpenReport={onOpenReport} budgets={budgets} />}

               {activeTab === 'SCHEDULED' && <ScheduledReportsTab />}
            </div>
         </div>

         <ReportTypeSelector
            isOpen={showTypeSelector}
            onClose={() => setShowTypeSelector(false)}
            onCreate={(reportType) => {
               setShowTypeSelector(false);
               onOpenReport('REPORT_BUILDER', `New ${reportType} Report`, { reportType });
            }}
         />
      </div>
   );
};

export default ReportsCenter;
