
import React, { useState, useMemo } from 'react';
import { Employee, Transaction } from '../types';
import SummaryCard from './EmployeeCenter/SummaryCard';
import EmployeeTable from './EmployeeCenter/EmployeeTable';

interface Props {
   employees: Employee[];
   transactions: Transaction[];
   onUpdateEmployees: (employees: Employee[]) => void;
   onOpenForm: (employee?: Employee) => void;
   onOpenWindow: (type: any, title: string, params?: any) => void;
   refreshData?: () => Promise<void>;
}

const EmployeeCenter: React.FC<Props> = ({
   employees,
   transactions,
   onUpdateEmployees,
   onOpenForm,
   onOpenWindow,
   refreshData
}) => {
   const [selectedId, setSelectedId] = useState(employees[0]?.id || '');
   const [activeCategory, setActiveCategory] = useState('All Employees');
   const [searchTerm, setSearchTerm] = useState('');

   // Metrics Calculation
   const metrics = useMemo(() => {
      const activeCount = employees.filter(e => e.isActive).length;

      const cutoff30 = new Date();
      cutoff30.setDate(cutoff30.getDate() - 30);

      // Payroll synced from 3rd party provider (JOURNAL_ENTRY with PAY- prefix)
      const isPayrollEntry = (t: Transaction) =>
         t.type === 'JOURNAL_ENTRY' && t.refNo?.startsWith('PAY-');

      const recentPayroll = transactions.filter(t =>
         isPayrollEntry(t) && new Date(t.date) >= cutoff30
      ).reduce((sum, t) => sum + t.total, 0);

      // New Hires (last 30 days)
      const newHires = employees.filter(e => new Date(e.hiredDate) >= cutoff30).length;

      // YTD payroll synced from provider
      const ytdTotal = transactions.filter(t =>
         isPayrollEntry(t) && new Date(t.date).getFullYear() === new Date().getFullYear()
      ).reduce((sum, t) => sum + t.total, 0);

      return { activeCount, recentPayroll, newHires, ytdTotal };
   }, [employees, transactions]);

   // Filtering Logic
   const filteredEmployees = useMemo(() => {
      return employees.filter(emp => {
         const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchTerm.toLowerCase());

         if (activeCategory === 'Active Employees') return emp.isActive && matchesSearch;
         if (activeCategory === 'Inactive Employees') return !emp.isActive && matchesSearch;
         return matchesSearch;
      });
   }, [employees, activeCategory, searchTerm]);

   // Compute last 8 months of trend data from real transactions/employees
   const getTrendData = (type: string): number[] => {
      const now = new Date();
      return Array.from({ length: 8 }, (_, i) => {
         const month = new Date(now.getFullYear(), now.getMonth() - (7 - i), 1);
         const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1);

         if (type === 'payroll') {
            return transactions.filter(t =>
               t.type === 'JOURNAL_ENTRY' && t.refNo?.startsWith('PAY-') &&
               new Date(t.date) >= month && new Date(t.date) < monthEnd
            ).reduce((sum, t) => sum + t.total, 0);
         }
         if (type === 'hires') {
            return employees.filter(e => {
               const h = new Date(e.hiredDate);
               return h >= month && h < monthEnd;
            }).length;
         }
         // active: count active employees (same for all months since no history)
         return employees.filter(e => e.isActive).length;
      });
   };

   const categories = [
      { id: 'active', title: 'Active Employees', value: metrics.activeCount, subtitle: 'currently on payroll', color: '#0d9488', chart: getTrendData('active'), icon: '👥' },
      { id: 'payroll', title: 'Recent Payroll', value: `$${metrics.recentPayroll.toLocaleString()}`, subtitle: 'last 30 days', color: '#0891b2', chart: getTrendData('payroll'), icon: '💸' },
      { id: 'new', title: 'New Hires', value: metrics.newHires, subtitle: 'last 30 days', color: '#10b981', chart: getTrendData('hires'), icon: '🆕' },
      { id: 'ytd', title: 'YTD Paid', value: `$${metrics.ytdTotal.toLocaleString()}`, subtitle: 'total compensation', color: '#6366f1', chart: [150, 180, 210, 240, 270, 300, 330, 360], icon: '📈' }
   ];

   const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
         const { importEmployees } = await import('../services/api');
         await importEmployees(file);
         alert('Employees imported successfully!');
         if (refreshData) await refreshData();
      } catch (err: any) {
         alert(err.message || 'Failed to import employees');
      } finally {
         e.target.value = '';
      }
   };

   return (
      <div className="flex h-full bg-[#f8fafc] overflow-hidden select-none font-sans">
         {/* Sidebar Area - Summary Cards */}
         <div className="w-[340px] border-r border-gray-200 flex flex-col bg-white p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
               <h1 className="text-xl font-bold text-gray-900">Employee Center</h1>
               <button
                  onClick={() => onOpenForm()}
                  className="p-2 rounded-full bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm"
               >
                  <span className="text-lg leading-none">+</span>
               </button>
            </div>

            {categories.map(cat => (
               <SummaryCard
                  key={cat.id}
                  title={cat.title}
                  value={cat.value}
                  subtitle={cat.subtitle}
                  icon={<span className="text-lg">{cat.icon}</span>}
                  chartData={cat.chart}
                  color={cat.color}
                  isActive={activeCategory === cat.title}
                  onClick={() => setActiveCategory(cat.title)}
               />
            ))}
         </div>

         {/* Main Content Area */}
         <div className="flex-1 flex flex-col min-w-0">
            {/* Header Section */}
            <div className="p-8 pb-4">
               <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                     <h2 className="text-2xl font-bold text-gray-900">{activeCategory}</h2>
                     <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                        Monthly Overview
                     </span>
                  </div>

                  <div className="flex items-center gap-3">
                     <div className="relative">
                        <input
                           type="text"
                           placeholder="Search employees"
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all w-64"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                     </div>
                     <button className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50">
                        <span className="text-sm">≡</span>
                     </button>
                  </div>
               </div>

               {/* Action Bar */}
               <div className="flex gap-3 mb-6 relative z-50">
                  <button
                     type="button"
                     onClick={() => {
                        onOpenWindow('PAY_EMPLOYEES', 'Pay Employees');
                     }}
                     className="flex-1 max-w-[150px] bg-teal-600 text-white font-bold py-2.5 rounded-xl hover:bg-teal-700 transition-colors shadow-sm text-sm"
                  >
                     Pay Employees
                  </button>
                  <button
                     type="button"
                     onClick={() => {
                        onOpenWindow('REPORTS_CENTER', 'Reports Center');
                     }}
                     className="flex-1 max-w-[150px] bg-white border-2 border-teal-600 text-teal-600 font-bold py-2.5 rounded-xl hover:bg-teal-50 transition-colors text-sm"
                  >
                     Payroll Reports
                  </button>
                  <button
                     type="button"
                     onClick={() => {
                        setActiveCategory('All Employees');
                        setSearchTerm('');
                     }}
                     className="flex-1 max-w-[150px] bg-white border-2 border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                  >
                     Employee List
                  </button>
                  <div className="flex-1 max-w-[150px]">
                     <label className="flex items-center justify-center w-full h-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-sm cursor-pointer">
                        Import
                        <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
                     </label>
                  </div>
               </div>
            </div>

            {/* Table Section */}
            <div className="flex-1 overflow-y-auto px-8 pb-8">
               <EmployeeTable
                  employees={filteredEmployees}
                  transactions={transactions}
                  selectedEmployeeId={selectedId}
                  onSelectEmployee={setSelectedId}
                  onOpenDetail={(employee) => onOpenWindow('EMPLOYEE_DETAIL' as any, employee.name, { employeeId: employee.id })}
               />
            </div>
         </div>
      </div>
   );
};

export default EmployeeCenter;
