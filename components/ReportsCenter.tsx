import React, { useState } from 'react';
import { Transaction, Vendor, Item, Budget, MemorizedReport, UIPreferences } from '../types';
import { useData } from '../contexts/DataContext';
import ReportTypeSelector from './ReportTypeSelector';
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
   Trash2
} from 'lucide-react';

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
   const [activeTab, setActiveTab] = useState<'STANDARD' | 'CUSTOM' | 'MANAGEMENT' | 'FINANCIAL'>('STANDARD');
   const [expandedSections, setExpandedSections] = useState<string[]>(['Who owes you', 'Inventory', 'Business overview', 'Favourites']);
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
      }
   ];

   const sidebarItems = [
      { id: 'STANDARD', label: 'Standard reports', icon: <FileText size={18} /> },
      { id: 'CUSTOM', label: 'Custom reports', icon: <Layout size={18} /> },
      { id: 'MANAGEMENT', label: 'Management reports', icon: <PieChart size={18} /> },
      { id: 'FINANCIAL', label: 'Financial planning', icon: <TrendingUp size={18} />, subItems: ['Cash flow overview', 'Cash flow planner', 'Budgets'] },
   ];

   const renderReportItem = (report: any) => {
      const isFavorite = favoriteIds.includes(report.id);
      return (
         <div
            key={report.id}
            className="flex items-center justify-between py-2 px-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer group"
            onClick={() => onOpenReport(report.id, report.title)}
         >
            <span className="text-sm text-gray-700 font-medium group-hover:text-blue-600 transition-colors">{report.title}</span>
            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  <div key={item.id}>
                     <button
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors ${activeTab === item.id
                           ? 'bg-gray-100 text-black border-l-4 border-black'
                           : 'text-gray-600 hover:bg-gray-50'
                           }`}
                     >
                        <span className="mr-3">{item.label}</span>
                     </button>
                     {item.subItems && (
                        <div className="mt-1 mb-2">
                           {item.subItems.map(subItem => (
                              <button
                                 key={subItem}
                                 className="w-full flex items-center px-10 py-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                              >
                                 {subItem}
                              </button>
                           ))}
                        </div>
                     )}
                  </div>
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
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                     <ChevronDown size={14} className="text-gray-400" />
                  </div>
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
               {activeTab === 'STANDARD' && reportCategories.map(category => (
                  <div key={category.name} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                     <button
                        onClick={() => toggleSection(category.name)}
                        className="w-full flex items-center px-4 py-3 bg-white hover:bg-gray-50 border-b border-gray-200 transition-colors"
                     >
                        {expandedSections.includes(category.name) ? <ChevronDown size={18} className="mr-2 text-gray-500" /> : <ChevronRight size={18} className="mr-2 text-gray-500" />}
                        <span className="text-base font-bold text-gray-800">{category.name}</span>
                     </button>

                     {expandedSections.includes(category.name) && (
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
               ))}

               {activeTab === 'CUSTOM' && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800">Custom Reports</h3>
                        <div className="text-sm text-gray-500">{memorized.length} reports</div>
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
                                       <tr
                                          key={r.id}
                                          className="hover:bg-blue-50 cursor-pointer group transition-colors"
                                          onClick={() => {
                                             const isBuilderReport = ['INVOICE', 'BILLS', 'SALES', 'EXPENSES', 'JOURNAL', 'BANKING', 'TRANSACTIONS'].includes(r.baseType);
                                             if (isBuilderReport) {
                                                onOpenReport('REPORT_BUILDER', r.name, {
                                                   reportType: r.baseType,
                                                   ...r.params
                                                });
                                             } else {
                                                const typeMap: Record<string, string> = {
                                                   'PL': 'PROFIT_AND_LOSS',
                                                   'BS': 'BALANCE_SHEET',
                                                   'GL': 'GENERAL_LEDGER'
                                                };
                                                onOpenReport(typeMap[r.baseType] || r.baseType, r.name, r.params);
                                             }
                                          }}
                                       >
                                          <td className="px-4 py-3">
                                             <button onClick={(e) => toggleFavorite(e, r.id)}>
                                                <Star
                                                   size={16}
                                                   className={isFavorite ? "fill-green-500 text-green-500" : "text-gray-400 hover:text-green-500"}
                                                />
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
                                                <button
                                                   className="p-1 hover:bg-red-100 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400"
                                                   onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (confirm('Are you sure you want to delete this report?')) {
                                                         onDeleteReport(r.id);
                                                      }
                                                   }}
                                                >
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
               )}

               {activeTab === 'MANAGEMENT' && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                     <PieChart size={48} className="mx-auto text-gray-300 mb-4" />
                     <h3 className="text-lg font-bold text-gray-800 mb-2">Management Reports</h3>
                     <p className="text-gray-500 max-w-md mx-auto">
                        Professional report packages for sharing with shareholders and management.
                     </p>
                  </div>
               )}

               {activeTab === 'FINANCIAL' && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                     <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
                     <h3 className="text-lg font-bold text-gray-800 mb-2">Financial Planning</h3>
                     <p className="text-gray-500 max-w-md mx-auto">
                        Tools to help you plan your business finances and track performance against budgets.
                     </p>
                  </div>
               )}
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
