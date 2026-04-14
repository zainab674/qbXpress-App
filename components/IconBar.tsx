import React from 'react';
import { ViewState } from '../types';

interface Props {
    onAction: (type: ViewState, title: string) => void;
    onLogOut?: () => void;
    onShortcuts?: () => void;
}

const IconBar: React.FC<Props> = ({ onAction, onLogOut, onShortcuts }) => {
    const icons = [
        { label: 'Home', type: 'HOME' as ViewState, icon: '🏠', color: 'bg-blue-600' },
        { label: 'Customers', type: 'CUSTOMER_CENTER' as ViewState, icon: '👥', color: 'bg-blue-500' },
        { label: 'Vendors', type: 'VENDOR_CENTER' as ViewState, icon: '🏪', color: 'bg-green-600' },
        { label: 'Employees', type: 'EMPLOYEE_CENTER' as ViewState, icon: '👷', color: 'bg-teal-600' },
        { label: 'Invoices', type: 'INVOICE_CENTER' as ViewState, icon: '📄', color: 'bg-blue-700' },
        { label: 'Bills', type: 'BILL_CENTER' as ViewState, icon: '💸', color: 'bg-green-700' },
        { label: 'POs', type: 'PURCHASE_ORDER_CENTER' as ViewState, icon: '📦', color: 'bg-orange-600' },
        { label: 'SOs', type: 'SALES_ORDER_CENTER' as ViewState, icon: '📋', color: 'bg-indigo-600' },
        { label: 'Inventory', type: 'INVENTORY_CENTER' as ViewState, icon: '📦', color: 'bg-orange-600' },
        { label: 'Shipping', type: 'SHIPPING_MODULE' as ViewState, icon: '🚚', color: 'bg-cyan-700' },
        { label: 'Checks', type: 'BANKING' as ViewState, icon: '🏦', color: 'bg-blue-800' },
        { label: 'Reports', type: 'REPORTS_CENTER' as ViewState, icon: '📊', color: 'bg-gray-600' },
        { label: 'Calendar', type: 'CALENDAR' as ViewState, icon: '📅', color: 'bg-red-600' },
        { label: 'Snapshot', type: 'COMPANY_SNAPSHOT' as ViewState, icon: '📸', color: 'bg-slate-700' },
    ];

    return (
        <div className="bg-[#f0f0f0] border-b border-gray-400 p-1 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-inner select-none flex-shrink-0">
            {icons.map((item) => (
                <button
                    key={item.label}
                    onClick={() => onAction(item.type, item.label)}
                    className="flex flex-col items-center justify-center min-w-[64px] h-[58px] hover:bg-white hover:shadow-md rounded transition-all active:scale-95 group border border-transparent hover:border-gray-300"
                >
                    <div className={`${item.color} w-8 h-8 rounded flex items-center justify-center text-white text-lg shadow-sm group-hover:brightness-110 mb-0.5`}>
                        {item.icon}
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 leading-tight">
                        {item.label}
                    </span>
                </button>
            ))}
            <div className="w-[1px] h-10 bg-gray-300 mx-2"></div>
            <button
                onClick={() => onAction('INSIGHTS', 'Insights')}
                className="flex flex-col items-center justify-center min-w-[64px] h-[58px] hover:bg-white hover:shadow-md rounded transition-all active:scale-95 group border border-transparent hover:border-gray-300"
            >
                <div className="bg-yellow-500 w-8 h-8 rounded flex items-center justify-center text-white text-lg shadow-sm group-hover:brightness-110 mb-0.5">
                    💡
                </div>
                <span className="text-[10px] font-bold text-gray-700 leading-tight">
                    Insights
                </span>
            </button>

            <button
                onClick={() => onAction('IMPORT_CENTER', 'Import Data')}
                className="flex flex-col items-center justify-center min-w-[64px] h-[58px] hover:bg-white hover:shadow-md rounded transition-all active:scale-95 group border border-transparent hover:border-gray-300"
            >
                <div className="bg-blue-600 w-8 h-8 rounded flex items-center justify-center text-white text-lg shadow-sm group-hover:brightness-110 mb-0.5">
                    📥
                </div>
                <span className="text-[10px] font-bold text-gray-700 leading-tight">
                    Import
                </span>
            </button>

            <div className="flex-1"></div>

            <div className="flex items-center gap-1 px-2">
                <button
                    onClick={onLogOut}
                    className="flex flex-col items-center justify-center min-w-[64px] h-[58px] hover:bg-white rounded transition-all active:scale-95 group text-red-600"
                >
                    <div className="bg-red-500 w-8 h-8 rounded flex items-center justify-center text-white text-lg shadow-sm group-hover:brightness-110 mb-0.5">
                        🚪
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 leading-tight">
                        Sign Out
                    </span>
                </button>
            </div>
        </div>
    );
};

export default IconBar;
