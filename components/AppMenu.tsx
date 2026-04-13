
import React from 'react';
import { ViewState } from '../types';
import { usePermission } from '../hooks/usePermission';

interface MenuProps {
    handlers: {
        onOpenWindow: (type: ViewState, title: string) => void;
        onBackup: () => void;
        onVerify: () => void;
        onRebuild: () => void;
        onCondense: () => void;
        onImport: () => void;
        onLogOut: () => void;
        setShowPrefs: (v: boolean) => void;
        onNewCompany: () => void;
        onOpenCompany: () => void;
        onOpenPrevious: () => void;
        onCreateCopy: () => void;
        onExport: () => void;
        onPrintForms: () => void;
        onPrinterSetup: () => void;
        onExit: () => void;
    };
    companies?: any[];
    activeCompanyId?: string | null;
    onSwitchCompany?: (id: string) => void;
}

const MenuButton = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="relative group cursor-pointer hover:bg-blue-600 hover:text-white px-3 py-1 rounded-sm transition-colors h-full flex items-center">
        {label}
        <div className="hidden group-hover:block absolute top-full left-0 bg-white border border-gray-300 shadow-2xl min-w-[220px] py-1 font-normal text-gray-800 z-[1000] rounded-sm">
            {children}
        </div>
    </div>
);

const DropItem = ({ label, onClick, shortcut, border }: any) => (
    <button onClick={onClick} className={`w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-[12px] flex justify-between items-center text-gray-800 ${border ? 'border-t border-gray-200 mt-1 pt-2' : ''}`}>
        <span>{label}</span>
        {shortcut && <span className="opacity-50 text-[10px]">{shortcut}</span>}
    </button>
);

const DropHeader = ({ label, border }: { label: string; border?: boolean }) => (
    <div className={`px-4 pt-2 pb-0.5 text-[9px] font-black text-gray-400 uppercase tracking-widest select-none cursor-default ${border ? 'border-t border-gray-200 mt-1' : ''}`}>
        {label}
    </div>
);

export const AppMenu: React.FC<MenuProps> = ({ handlers, companies = [], activeCompanyId, onSwitchCompany }) => {
    const {
        onOpenWindow, onBackup, onVerify, onRebuild, onCondense, onImport, onLogOut, setShowPrefs,
        onNewCompany, onOpenCompany, onOpenPrevious, onCreateCopy, onExport, onPrintForms, onPrinterSetup, onExit
    } = handlers;

    const activeCompany = companies.find(c => c._id === activeCompanyId);
    const activeCompanyName = activeCompany?.name || 'My Company';

    const canWriteTransactions  = usePermission('transactions', 'write');
    const canDeleteTransactions  = usePermission('transactions', 'delete');
    const canWriteCustomers      = usePermission('customers', 'write');
    const canWriteVendors        = usePermission('vendors', 'write');
    const canWriteEmployees      = usePermission('employees', 'write');
    const canWriteInventory      = usePermission('inventory', 'write');
    const canAdjustInventory     = usePermission('inventory', 'adjust');
    const canReadUsers           = usePermission('users', 'read');
    const canWriteUsers          = usePermission('users', 'write');
    const canWriteSettings       = usePermission('settings', 'write');

    return (
        <nav className="h-7 bg-white border-b border-gray-300 flex items-center px-1 text-[11px] font-medium text-gray-700 select-none z-[1001] flex-shrink-0">
            <MenuButton label="File">
                <DropItem label="New Company..." onClick={onNewCompany} />
                <DropItem label="Open or Restore Company..." onClick={onOpenCompany} />
                <DropItem label="Open Previous Company" onClick={onOpenPrevious} />
                <DropItem label="Back Up Company" border onClick={onBackup} />
                <DropItem label="Close Company/Log Off" border onClick={onLogOut} />
                <DropHeader label="Utilities" border />
                <div className="pl-4">
                    <DropItem label="Import" onClick={onImport} />
                    <DropItem label="Export" onClick={onExport} />
                    <DropItem label="Condense Data..." onClick={onCondense} />
                    <DropItem label="Verify Data" onClick={onVerify} />
                    <DropItem label="Rebuild Data" onClick={onRebuild} />
                </div>
                <DropItem label="Printer Setup..." border onClick={onPrinterSetup} />
                <DropItem label="Exit" border onClick={onExit} />
            </MenuButton>

            <MenuButton label="Edit">

                <DropItem label="Preferences..." border onClick={() => setShowPrefs(true)} />
            </MenuButton>



            <MenuButton label="Lists">
                <DropItem label="Chart of Accounts" onClick={() => onOpenWindow('CHART_OF_ACCOUNTS', 'Chart of Accounts')} shortcut="Ctrl+A" />
                <DropItem label="Fixed Asset Item List" onClick={() => onOpenWindow('FIXED_ASSET_MANAGER', 'Fixed Assets')} />
                <DropItem label="Price Level List" onClick={() => onOpenWindow('PRICE_LEVEL_LIST', 'Price Levels')} />
                <DropItem label="Sales Tax Code List" onClick={() => onOpenWindow('SALES_TAX_CODE_LIST', 'Sales Tax Codes')} />
                <DropItem label="Class List" border onClick={() => onOpenWindow('CLASS_LIST', 'Class List')} />
                <DropHeader label="Customer & Vendor Profile Lists" />
                <div className="pl-4">
                    <DropItem label="Sales Tax Item List" onClick={() => onOpenWindow('ITEM_LIST', 'Sales Tax Items')} />
                    <DropItem label="Sales Rep List" onClick={() => onOpenWindow('SALES_REP_LIST', 'Sales Reps')} />
                    <DropItem label="Ship Via List" onClick={() => onOpenWindow('SHIP_VIA_LIST', 'Shipping Methods')} />
                    <DropItem label="Customer Message List" onClick={() => onOpenWindow('CUSTOMER_MESSAGE_LIST', 'Customer Messages')} />
                    <DropItem label="Payment Method List" onClick={() => onOpenWindow('PAYMENT_METHOD_LIST', 'Payment Methods')} />
                    <DropItem label="Terms List" onClick={() => onOpenWindow('TERMS_LIST', 'Terms')} />
                    <DropItem label="Vehicle List" onClick={() => onOpenWindow('VEHICLE_LIST', 'Vehicles')} />
                    <DropItem label="Unit of Measure List" onClick={() => onOpenWindow('UNIT_OF_MEASURE_LIST', 'Unit of Measure List')} />
                    <DropItem label="Vendor Credit Category List" onClick={() => onOpenWindow('VENDOR_CREDIT_CATEGORY_LIST', 'Vendor Credit Categories')} />
                    <DropItem label="Customer Credit Category List" onClick={() => onOpenWindow('CUSTOMER_CREDIT_CATEGORY_LIST', 'Customer Credit Categories')} />
                    <DropItem label="Item Category List" onClick={() => onOpenWindow('ITEM_CATEGORY_LIST', 'Item Categories')} />
                </div>
            </MenuButton>

            <MenuButton label="Company">
                <DropItem label="My Company" onClick={() => onOpenWindow('MY_COMPANY', 'My Company')} />
                <DropItem label="Company Snapshot" onClick={() => onOpenWindow('COMPANY_SNAPSHOT', 'Company Snapshot')} />
                <DropItem label="Calendar" onClick={() => onOpenWindow('CALENDAR', 'Financial Calendar')} />
                <DropHeader label="Manage Currency" border />
                <div className="pl-4">
                    <DropItem label="Currency List" onClick={() => onOpenWindow('CURRENCY_LIST', 'Currencies')} />
                </div>
                <DropHeader label="Planning & Budgeting" border />
                <div className="pl-4">
                    <DropItem label="Set Up Budgets" onClick={() => onOpenWindow('SET_UP_BUDGET', 'Budgets')} />
                </div>
                <DropItem label="Chart of Accounts" border shortcut="Ctrl+A" onClick={() => onOpenWindow('CHART_OF_ACCOUNTS', 'Chart of Accounts')} />
                <DropItem label="Make Journal Entries..." onClick={() => onOpenWindow('JOURNAL_ENTRY', 'General Journal')} />
                {canReadUsers && (
                    <DropItem label="User Management" border onClick={() => onOpenWindow('USER_MANAGEMENT', 'User Management')} />
                )}
            </MenuButton>

            <MenuButton label="Customers">
                <DropItem label="Customer Center" onClick={() => onOpenWindow('CUSTOMER_CENTER', 'Customer Center')} />
                <DropItem label="Invoice Center" onClick={() => onOpenWindow('INVOICE_CENTER', 'Invoice Center')} />
                <DropItem label="Sales Order Center" onClick={() => onOpenWindow('SALES_ORDER_CENTER', 'Sales Order Center')} />
                {canWriteTransactions && <DropItem label="Create Estimates" onClick={() => onOpenWindow('ESTIMATE', 'Create Estimates')} />}
                {canWriteTransactions && <DropItem label="Create Sales Orders" onClick={() => onOpenWindow('SALES_ORDER', 'Create Sales Orders')} />}
                {canWriteTransactions && <DropItem label="Create Invoices" border shortcut="Ctrl+I" onClick={() => onOpenWindow('INVOICE', 'Create Invoices')} />}
                {canWriteTransactions && <DropItem label="Create Sales Receipts" onClick={() => onOpenWindow('SALES_RECEIPT', 'Enter Sales Receipts')} />}
                {canWriteTransactions && <DropItem label="Receive Payments" border onClick={() => onOpenWindow('RECEIVE_PAYMENT', 'Receive Payments')} />}
                {canWriteTransactions && <DropItem label="Create Credit Memos/Refunds" onClick={() => onOpenWindow('CREDIT_MEMO', 'Credit Memo')} />}
                <DropItem label="Customer Credit Category List" onClick={() => onOpenWindow('CUSTOMER_CREDIT_CATEGORY_LIST', 'Customer Credit Categories')} />
                {canWriteTransactions && <DropItem label="Create Statements..." border onClick={() => onOpenWindow('STATEMENTS', 'Statements')} />}
                <DropItem label="Collection Letters" border onClick={() => onOpenWindow('COLLECTION_LETTERS', 'Collection Letters')} />
            </MenuButton>

            <MenuButton label="Vendors">
                <DropItem label="Vendor Center" onClick={() => onOpenWindow('VENDOR_CENTER', 'Vendor Center')} />
                <DropItem label="Purchase Order Center" onClick={() => onOpenWindow('PURCHASE_ORDER_CENTER', 'Purchase Order Center')} />
                <DropItem label="Bill Center" onClick={() => onOpenWindow('BILL_CENTER', 'Bill Center')} />
                {canWriteTransactions && <DropItem label="Enter Bills" onClick={() => onOpenWindow('BILL', 'Enter Bills')} />}
                {canWriteTransactions && <DropItem label="Enter Vendor Credits" onClick={() => onOpenWindow('VENDOR_CREDIT', 'Vendor Credit')} />}
                {canWriteTransactions && <DropItem label="Pay Bills" onClick={() => onOpenWindow('PAY_BILLS', 'Pay Bills')} />}
                <DropItem label="Inventory Center" border onClick={() => onOpenWindow('INVENTORY_CENTER', 'Inventory Center')} />
                <div className="pl-4">
                    {canWriteTransactions && <DropItem label="Create Purchase Orders" onClick={() => onOpenWindow('PURCHASE_ORDER', 'Purchase Orders')} />}
                    {canWriteInventory && <DropItem label="Receive Items" onClick={() => onOpenWindow('RECEIVE_INVENTORY', 'Receive Items')} />}
                    {canAdjustInventory && <DropItem label="Adjust Quantity/Value on Hand" onClick={() => onOpenWindow('INVENTORY_ADJUSTMENT', 'Inventory Adjustment')} />}
                </div>
                <DropHeader label="Manufacturing" border />
                <div className="pl-4">
                    <DropItem label="Work Orders" onClick={() => onOpenWindow('WORK_ORDER_CENTER', 'Work Orders')} />
                    {canWriteInventory && <DropItem label="Create Work Order" onClick={() => onOpenWindow('WORK_ORDER', 'New Work Order')} />}
                    {canWriteInventory && <DropItem label="Build Assemblies" onClick={() => onOpenWindow('BUILD_ASSEMBLY', 'Build Assemblies')} />}
                </div>
                <DropHeader label="Lot & Serial Tracking" border />
                <div className="pl-4">
                    <DropItem label="Lot Traceability" onClick={() => onOpenWindow('LOT_TRACEABILITY', 'Lot Traceability')} />
                    <DropItem label="Lot QC Workflow" onClick={() => onOpenWindow('LOT_QC_WORKFLOW', 'Lot QC Workflow')} />
                    <DropItem label="Serial Number History" onClick={() => onOpenWindow('SERIAL_HISTORY', 'Serial Number History')} />
                </div>
                {canWriteInventory && <DropItem label="Landed Cost" border onClick={() => onOpenWindow('LANDED_COST', 'Landed Cost')} />}
                <DropHeader label="Sales Tax" border />
                <div className="pl-4">
                    <DropItem label="Sales Tax Center" onClick={() => onOpenWindow('SALES_TAX_CENTER', 'Sales Tax Center')} />
                    {canWriteTransactions && <DropItem label="Pay Sales Tax" onClick={() => onOpenWindow('PAY_SALES_TAX', 'Pay Sales Tax')} />}
                </div>
                <DropItem label="Vendor Credit Category List" border onClick={() => onOpenWindow('VENDOR_CREDIT_CATEGORY_LIST', 'Vendor Credit Categories')} />
            </MenuButton>

            <MenuButton label="Employees">
                <DropItem label="Employee Center" onClick={() => onOpenWindow('EMPLOYEE_CENTER', 'Employee Center')} />
                {canWriteEmployees && <DropItem label="Payroll Center" border onClick={() => onOpenWindow('PAYROLL_CENTER', 'Payroll Center')} />}
                {canWriteEmployees && <DropHeader label="Enter Time" border />}
                {canWriteEmployees && (
                    <div className="pl-4">
                        <DropItem label="Use Weekly Timesheet" onClick={() => onOpenWindow('WEEKLY_TIMESHEET', 'Timesheet')} />
                        <DropItem label="Time/Enter Single Activity" onClick={() => onOpenWindow('SINGLE_TIME_ENTRY', 'Time Entry')} />
                    </div>
                )}
            </MenuButton>

            <MenuButton label="Banking">
                <DropItem label="Write Checks" shortcut="Ctrl+W" onClick={() => onOpenWindow('BANKING', 'Write Checks')} />
                <DropItem label="Make Deposits" onClick={() => onOpenWindow('DEPOSIT', 'Make Deposits')} />
                <DropItem label="Transfer Funds" border onClick={() => onOpenWindow('TRANSFER_FUNDS', 'Transfer Funds')} />
                <DropItem label="Enter Credit Card Charges" onClick={() => onOpenWindow('CREDIT_CARD_CHARGE', 'Credit Card Charges')} />
                <DropItem label="Reconcile..." border onClick={() => onOpenWindow('RECONCILE', 'Reconcile')} />
                <DropHeader label="Bank Feeds" border />
                <div className="pl-4">
                    <DropItem label="Bank Feed Center" onClick={() => onOpenWindow('BANK_FEEDS', 'Bank Feeds')} />
                </div>
            </MenuButton>

            <MenuButton label="Reports">
                <DropItem label="Report Center" onClick={() => onOpenWindow('REPORTS_CENTER', 'Report Center')} />
                <DropHeader label="Company & Financial" border />
                <div className="pl-4">
                    <DropItem label="Profit & Loss Standard" onClick={() => onOpenWindow('PROFIT_AND_LOSS', 'Profit & Loss')} />
                    <DropItem label="Balance Sheet Standard" onClick={() => onOpenWindow('BALANCE_SHEET', 'Balance Sheet')} />
                    <DropItem label="Cash Flow Forecast" onClick={() => onOpenWindow('FORECAST', 'Cash Flow Forecast')} />
                </div>
                <DropHeader label="Customers & Receivables" />
                <div className="pl-4">
                    <DropItem label="A/R Aging Summary" onClick={() => onOpenWindow('AGING', 'A/R Aging')} />
                    <DropItem label="Customer Balance Summary" onClick={() => onOpenWindow('SALES_CUSTOMER', 'Sales by Customer')} />
                </div>
                <DropHeader label="Vendors & Payables" />
                <div className="pl-4">
                    <DropItem label="A/P Aging Summary" onClick={() => onOpenWindow('AP_AGING', 'A/P Aging')} />
                    <DropItem label="A/P Aging Detail" onClick={() => onOpenWindow('AP_AGING_DETAIL', 'A/P Aging Detail')} />
                    <DropItem label="Vendor Balance Summary" onClick={() => onOpenWindow('VENDOR_BALANCE', 'Vendor Balance Summary')} />
                    <DropItem label="Vendor Balance Detail" onClick={() => onOpenWindow('VENDOR_BALANCE_DETAIL', 'Vendor Balance Detail')} />
                    <DropItem label="Unpaid Bills Detail" onClick={() => onOpenWindow('UNPAID_BILLS_DETAIL', 'Unpaid Bills Detail')} />
                    <DropItem label="Bills and Applied Payments" onClick={() => onOpenWindow('BILLS_AND_PAYMENTS', 'Bills and Applied Payments')} />
                    <DropItem label="Purchases by Vendor Detail" onClick={() => onOpenWindow('PURCHASES_BY_VENDOR_DETAIL', 'Purchases by Vendor')} />
                    <DropItem label="Purchases by Item Detail" onClick={() => onOpenWindow('PURCHASES_BY_ITEM_DETAIL', 'Purchases by Item')} />
                    <DropItem label="Vendor Contact List" onClick={() => onOpenWindow('VENDOR_CONTACT_LIST', 'Vendor Contact List')} />
                    <DropItem label="1099 Summary" onClick={() => onOpenWindow('1099_SUMMARY', '1099 Summary')} />
                    <DropItem label="1099 Detail" onClick={() => onOpenWindow('1099_DETAIL', '1099 Detail')} />
                </div>
                <DropHeader label="Accountant & Taxes" border />
                <div className="pl-4">
                    <DropItem label="Trial Balance" onClick={() => onOpenWindow('TRIAL_BALANCE', 'Trial Balance')} />
                    <DropItem label="General Ledger" onClick={() => onOpenWindow('GENERAL_LEDGER', 'General Ledger')} />
                    <DropItem label="Audit Trail" onClick={() => onOpenWindow('AUDIT_TRAIL', 'Audit Trail')} />
                </div>
            </MenuButton>

            {/* Company selector — right-aligned, dropdown only when multiple companies */}
            <div className="ml-auto flex items-center h-full">
                {companies.length >= 1 ? (
                    <div className="relative group cursor-pointer h-full flex items-center">
                        <div className="flex items-center gap-1 px-3 py-1 hover:bg-blue-600 hover:text-white rounded-sm transition-colors h-full">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            <span className="max-w-[140px] truncate">{activeCompanyName}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                        <div className="hidden group-hover:block absolute top-full right-0 bg-white border border-gray-300 shadow-2xl min-w-[200px] py-1 font-normal text-gray-800 z-[1000] rounded-sm">
                            <div className="px-4 pt-2 pb-0.5 text-[9px] font-black text-gray-400 uppercase tracking-widest select-none cursor-default">Switch Company</div>
                            {companies.map(c => (
                                <button
                                    key={c._id}
                                    onClick={() => onSwitchCompany?.(c._id)}
                                    className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-[12px] flex items-center gap-2"
                                >
                                    {c._id === activeCompanyId && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    )}
                                    <span className={`${c._id === activeCompanyId ? '' : 'pl-[14px]'} truncate`}>{c.name}</span>
                                </button>
                            ))}
                            <div className="border-t border-gray-200 mt-1 pt-1">
                                <button onClick={onNewCompany} className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-[12px]">
                                    + New Company...
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 px-3 text-gray-500 text-[11px]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        <span className="max-w-[160px] truncate">{activeCompanyName}</span>
                    </div>
                )}
            </div>
        </nav>
    );
};
