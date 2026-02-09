import React, { useState } from 'react';
import { Employee, Transaction } from '../../types';

interface Props {
    employees: Employee[];
    transactions: Transaction[];
    selectedEmployeeId: string;
    onSelectEmployee: (id: string) => void;
    onOpenDetail: (employee: Employee) => void;
}

const EmployeeTable: React.FC<Props> = ({
    employees,
    transactions,
    selectedEmployeeId,
    onSelectEmployee,
    onOpenDetail
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee Name</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Hired Date</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="p-4 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {employees.map(employee => (
                        <React.Fragment key={employee.id}>
                            <tr
                                onClick={() => onSelectEmployee(employee.id)}
                                className={`group cursor-pointer transition-colors ${selectedEmployeeId === employee.id ? 'bg-teal-50/50' : 'hover:bg-gray-50/50'
                                    }`}
                            >
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">
                                            {employee.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div
                                                onClick={(e) => { e.stopPropagation(); onOpenDetail(employee); }}
                                                className="text-sm font-bold text-gray-900 group-hover:text-teal-600 transition-colors"
                                            >
                                                {employee.name}
                                            </div>
                                            <div className="text-xs text-gray-500">{employee.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-gray-600">{employee.hiredDate}</td>
                                <td className="p-4 text-sm font-semibold text-gray-900">
                                    ${employee.hourlyRate?.toLocaleString()}/hr
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${employee.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {employee.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={(e) => toggleExpand(e, employee.id)}
                                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 group-hover:text-gray-600 transition-all"
                                    >
                                        {expandedId === employee.id ? '▲' : '▼'}
                                    </button>
                                </td>
                            </tr>
                            {expandedId === employee.id && (
                                <tr className="bg-gray-50/30">
                                    <td colSpan={5} className="p-6">
                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Recent Transactions</h4>
                                            <div className="space-y-3">
                                                {transactions.filter(t => t.entityId === employee.id).slice(0, 3).map(t => (
                                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-50 hover:border-teal-100 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <span className="w-8 h-8 rounded bg-teal-50 text-teal-600 flex items-center justify-center text-[10px] font-bold uppercase">
                                                                {t.type.slice(0, 2)}
                                                            </span>
                                                            <div>
                                                                <div className="text-sm font-bold text-gray-900">{t.type} #{t.refNo}</div>
                                                                <div className="text-xs text-gray-500">{t.date}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-sm font-bold text-gray-900">
                                                            ${t.total.toLocaleString()}
                                                        </div>
                                                    </div>
                                                ))}
                                                {transactions.filter(t => t.entityId === employee.id).length === 0 && (
                                                    <div className="text-sm text-gray-400 italic text-center py-4">
                                                        No recent transactions found
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default EmployeeTable;
