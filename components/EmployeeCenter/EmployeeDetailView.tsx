import React, { useState } from 'react';
import { Employee, Transaction, Account } from '../../types';

interface Props {
    employeeId: string;
    employees: Employee[];
    transactions: Transaction[];
    accounts: Account[];
    onOpenTransaction?: (id: string, type: string) => void;
}

const EmployeeDetailView: React.FC<Props> = ({
    employeeId,
    employees,
    transactions,
    accounts,
    onOpenTransaction
}) => {
    const [activeTab, setActiveTab] = useState<'TRANS' | 'DETAILS' | 'PAYROLL'>('TRANS');
    const employee = employees.find(e => e.id === employeeId);
    const employeeTransactions = transactions.filter(t => t.entityId === employeeId);

    if (!employee) return <div>Employee not found</div>;

    const stats = [
        { label: 'Annual Salary', value: `$${(employee.hourlyRate * 2080).toLocaleString()}`, icon: '💰' },
        { label: 'Pay Frequency', value: 'Bi-Weekly', icon: '📅' },
        { label: 'Hired Date', value: employee.hiredDate, icon: '📆' },
        { label: 'Total Paid (YTD)', value: `$${employeeTransactions.reduce((sum, t) => sum + t.total, 0).toLocaleString()}`, icon: '📈' }
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-y-auto font-sans custom-scrollbar">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm sticky top-0 z-20">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-teal-200">
                            {employee.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{employee.name}</h1>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="text-gray-500 font-medium">{employee.firstName} {employee.lastName}</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span className={`text-sm font-bold uppercase tracking-wider ${employee.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                    {employee.isActive ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="px-5 py-2.5 bg-white border-2 border-teal-600 text-teal-600 font-bold rounded-xl hover:bg-teal-50 transition-all shadow-sm">
                            Print Paycheck
                        </button>
                        <button className="px-5 py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-100">
                            Edit Employee
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 px-8 py-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl">{stat.icon}</span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <div className="text-xl font-extrabold text-gray-900">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Tabs & Content */}
            <div className="px-8 pb-8 flex flex-col">
                <div className="flex gap-6 border-b border-gray-200 mb-6 bg-slate-50 sticky top-[120px] z-10 pt-4">
                    {[
                        { id: 'TRANS', label: 'Transactions', icon: '📋' },
                        { id: 'DETAILS', label: 'Personal Details', icon: '👤' },
                        { id: 'PAYROLL', label: 'Payroll Info', icon: '💸' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === tab.id
                                    ? 'text-teal-600'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600 rounded-t-full"></div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    {activeTab === 'TRANS' ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Type</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Ref No</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Amount</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {employeeTransactions.map(t => (
                                    <tr
                                        key={t.id}
                                        className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                                        onClick={() => onOpenTransaction?.(t.id, t.type)}
                                    >
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${t.type === 'PAYCHECK' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">{t.date}</td>
                                        <td className="p-4 text-sm font-medium text-gray-900">{t.refNo}</td>
                                        <td className="p-4 text-sm font-bold text-gray-900 text-right">${t.total.toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${t.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {t.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : activeTab === 'DETAILS' ? (
                        <div className="p-8 grid grid-cols-2 gap-x-12 gap-y-8">
                            <section>
                                <h3 className="text-xs font-extrabold text-teal-600 uppercase tracking-[0.2em] mb-6">Contact Information</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Phone</label>
                                        <div className="text-gray-900 font-medium">{employee.phone || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email</label>
                                        <div className="text-gray-900 font-medium italic">{employee.email || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Address</label>
                                        <div className="text-gray-900 font-medium leading-relaxed">{employee.address || 'N/A'}</div>
                                    </div>
                                </div>
                            </section>
                            <section>
                                <h3 className="text-xs font-extrabold text-teal-600 uppercase tracking-[0.2em] mb-6">Employment Details</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">First Name</label>
                                        <div className="text-gray-900 font-medium">{employee.firstName}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Last Name</label>
                                        <div className="text-gray-900 font-medium">{employee.lastName}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Social Security Number</label>
                                        <div className="text-gray-900 font-medium">{employee.ssn || 'XXX-XX-XXXX'}</div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    ) : (
                        <div className="p-8">
                            <h3 className="text-xs font-extrabold text-teal-600 uppercase tracking-[0.2em] mb-6">Payroll Configuration</h3>
                            <div className="grid grid-cols-3 gap-8">
                                <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Hourly Rate</label>
                                    <div className="text-2xl font-black text-gray-900">${employee.hourlyRate}/hr</div>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Vacation (Accrued)</label>
                                    <div className="text-2xl font-black text-gray-900">{employee.vacation?.accrued || 0} hrs</div>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Sick Leave (Accrued)</label>
                                    <div className="text-2xl font-black text-gray-900">{employee.sickLeave?.accrued || 0} hrs</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetailView;
