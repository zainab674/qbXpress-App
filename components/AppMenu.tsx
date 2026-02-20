
import React from 'react';
import { ViewState } from '../types';

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

export const AppMenu: React.FC<MenuProps> = ({ handlers }) => {
    const {
        onOpenWindow, onBackup, onVerify, onRebuild, onCondense, onImport, onLogOut, setShowPrefs,
        onNewCompany, onOpenCompany, onOpenPrevious, onCreateCopy, onExport, onPrintForms, onPrinterSetup, onExit
    } = handlers;

    return (
        <nav className="h-7 bg-white border-b border-gray-300 flex items-center px-1 text-[11px] font-medium text-gray-700 select-none z-[1001] flex-shrink-0">
            <MenuButton label="File">
                <DropItem label="New Company..." onClick={onNewCompany} />
                <DropItem label="Open or Restore Company..." onClick={onOpenCompany} />
                <DropItem label="Open Previous Company" onClick={onOpenPrevious} />
                <DropItem label="Back Up Company" border onClick={onBackup} />
                <DropItem label="Close Company/Log Off" border onClick={onLogOut} />
                <DropItem label="Utilities" border />
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
                <DropItem label="Item List" onClick={() => onOpenWindow('ITEM_LIST', 'Item List')} />
                <DropItem label="Fixed Asset Item List" onClick={() => onOpenWindow('FIXED_ASSET_MANAGER', 'Fixed Assets')} />
                <DropItem label="Price Level List" onClick={() => onOpenWindow('PRICE_LEVEL_LIST', 'Price Levels')} />
                <DropItem label="Sales Tax Code List" onClick={() => onOpenWindow('SALES_TAX_CODE_LIST', 'Sales Tax Codes')} />
                <DropItem label="Class List" border onClick={() => onOpenWindow('CLASS_LIST', 'Class List')} />
                <DropItem label="Customer & Vendor Profile Lists" />
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
                </div>
            </MenuButton>

            <MenuButton label="Company">
                <DropItem label="My Company" onClick={() => onOpenWindow('MY_COMPANY', 'My Company')} />
                <DropItem label="Company Snapshot" onClick={() => onOpenWindow('COMPANY_SNAPSHOT', 'Company Snapshot')} />
                <DropItem label="Calendar" onClick={() => onOpenWindow('CALENDAR', 'Financial Calendar')} />
                <DropItem label="Manage Currency" border />
                <div className="pl-4">
                    <DropItem label="Currency List" onClick={() => onOpenWindow('CURRENCY_LIST', 'Currencies')} />
                </div>
                <DropItem label="Planning & Budgeting" border />
                <div className="pl-4">
                    <DropItem label="Set Up Budgets" onClick={() => onOpenWindow('SET_UP_BUDGET', 'Budgets')} />
                </div>
                <DropItem label="Chart of Accounts" border shortcut="Ctrl+A" onClick={() => onOpenWindow('CHART_OF_ACCOUNTS', 'Chart of Accounts')} />
                <DropItem label="Make Journal Entries..." onClick={() => onOpenWindow('JOURNAL_ENTRY', 'General Journal')} />
            </MenuButton>

            <MenuButton label="Customers">
                <DropItem label="Customer Center" onClick={() => onOpenWindow('CUSTOMER_CENTER', 'Customer Center')} />
                <DropItem label="Invoice Center" onClick={() => onOpenWindow('INVOICE_CENTER', 'Invoice Center')} />
                <DropItem label="Sales Order Center" onClick={() => onOpenWindow('SALES_ORDER_CENTER', 'Sales Order Center')} />
                <DropItem label="Create Estimates" onClick={() => onOpenWindow('ESTIMATE', 'Create Estimates')} />
                <DropItem label="Create Sales Orders" onClick={() => onOpenWindow('SALES_ORDER', 'Create Sales Orders')} />
                <DropItem label="Create Invoices" border shortcut="Ctrl+I" onClick={() => onOpenWindow('INVOICE', 'Create Invoices')} />
                <DropItem label="Create Sales Receipts" onClick={() => onOpenWindow('SALES_RECEIPT', 'Enter Sales Receipts')} />
                <DropItem label="Receive Payments" border onClick={() => onOpenWindow('RECEIVE_PAYMENT', 'Receive Payments')} />
                <DropItem label="Create Credit Memos/Refunds" onClick={() => onOpenWindow('CREDIT_MEMO', 'Credit Memo')} />
                <DropItem label="Customer Credit Category List" onClick={() => onOpenWindow('CUSTOMER_CREDIT_CATEGORY_LIST', 'Customer Credit Categories')} />
                <DropItem label="Create Statements..." border onClick={() => onOpenWindow('STATEMENTS', 'Statements')} />
            </MenuButton>

            <MenuButton label="Vendors">
                <DropItem label="Vendor Center" onClick={() => onOpenWindow('VENDOR_CENTER', 'Vendor Center')} />
                <DropItem label="Purchase Order Center" onClick={() => onOpenWindow('PURCHASE_ORDER_CENTER', 'Purchase Order Center')} />
                <DropItem label="Bill Center" onClick={() => onOpenWindow('BILL_CENTER', 'Bill Center')} />
                <DropItem label="Enter Bills" onClick={() => onOpenWindow('BILL', 'Enter Bills')} />
                <DropItem label="Enter Vendor Credits" onClick={() => onOpenWindow('VENDOR_CREDIT', 'Vendor Credit')} />
                <DropItem label="Pay Bills" onClick={() => onOpenWindow('PAY_BILLS', 'Pay Bills')} />
                <DropItem label="Inventory Center" border onClick={() => onOpenWindow('INVENTORY_CENTER', 'Inventory Center')} />
                <div className="pl-4">
                    <DropItem label="Create Purchase Orders" onClick={() => onOpenWindow('PURCHASE_ORDER', 'Purchase Orders')} />
                    <DropItem label="Receive Items" onClick={() => onOpenWindow('RECEIVE_INVENTORY', 'Receive Items')} />
                    <DropItem label="Adjust Quantity/Value on Hand" onClick={() => onOpenWindow('INVENTORY_ADJUSTMENT', 'Inventory Adjustment')} />
                </div>
                <DropItem label="Sales Tax" border />
                <div className="pl-4">
                    <DropItem label="Sales Tax Center" onClick={() => onOpenWindow('SALES_TAX_CENTER', 'Sales Tax Center')} />
                    <DropItem label="Pay Sales Tax" onClick={() => onOpenWindow('PAY_SALES_TAX', 'Pay Sales Tax')} />
                </div>
                <DropItem label="Vendor Credit Category List" border onClick={() => onOpenWindow('VENDOR_CREDIT_CATEGORY_LIST', 'Vendor Credit Categories')} />
            </MenuButton>

            <MenuButton label="Employees">
                <DropItem label="Employee Center" onClick={() => onOpenWindow('EMPLOYEE_CENTER', 'Employee Center')} />
                <DropItem label="Payroll Center" border onClick={() => onOpenWindow('PAYROLL_CENTER', 'Payroll Center')} />
                <DropItem label="Enter Time" border />
                <div className="pl-4">
                    <DropItem label="Use Weekly Timesheet" onClick={() => onOpenWindow('WEEKLY_TIMESHEET', 'Timesheet')} />
                    <DropItem label="Time/Enter Single Activity" onClick={() => onOpenWindow('SINGLE_TIME_ENTRY', 'Time Entry')} />
                </div>
            </MenuButton>

            <MenuButton label="Banking">
                <DropItem label="Write Checks" shortcut="Ctrl+W" onClick={() => onOpenWindow('BANKING', 'Write Checks')} />
                <DropItem label="Make Deposits" onClick={() => onOpenWindow('DEPOSIT', 'Make Deposits')} />
                <DropItem label="Transfer Funds" border onClick={() => onOpenWindow('TRANSFER_FUNDS', 'Transfer Funds')} />
                <DropItem label="Enter Credit Card Charges" onClick={() => onOpenWindow('CREDIT_CARD_CHARGE', 'Credit Card Charges')} />
                <DropItem label="Reconcile..." border onClick={() => onOpenWindow('RECONCILE', 'Reconcile')} />
                <DropItem label="Bank Feeds" border />
                <div className="pl-4">
                    <DropItem label="Bank Feed Center" onClick={() => onOpenWindow('BANK_FEEDS', 'Bank Feeds')} />
                </div>
            </MenuButton>

            <MenuButton label="Reports">
                <DropItem label="Report Center" onClick={() => onOpenWindow('REPORTS_CENTER', 'Report Center')} />
                <DropItem label="Company & Financial" border />
                <div className="pl-4">
                    <DropItem label="Profit & Loss Standard" onClick={() => onOpenWindow('PROFIT_AND_LOSS', 'Profit & Loss')} />
                    <DropItem label="Balance Sheet Standard" onClick={() => onOpenWindow('BALANCE_SHEET', 'Balance Sheet')} />
                    <DropItem label="Cash Flow Forecast" onClick={() => onOpenWindow('FORECAST', 'Cash Flow Forecast')} />
                </div>
                <DropItem label="Customers & Receivables" />
                <div className="pl-4">
                    <DropItem label="A/R Aging Summary" onClick={() => onOpenWindow('AGING', 'A/R Aging')} />
                    <DropItem label="Customer Balance Summary" onClick={() => onOpenWindow('SALES_CUSTOMER', 'Sales by Customer')} />
                </div>
                <DropItem label="Vendors & Payables" />
                <div className="pl-4">
                    <DropItem label="A/P Aging Summary" onClick={() => onOpenWindow('AP_AGING', 'A/P Aging')} />
                </div>
                <DropItem label="Accountant & Taxes" border />
                <div className="pl-4">
                    <DropItem label="Trial Balance" onClick={() => onOpenWindow('TRIAL_BALANCE', 'Trial Balance')} />
                    <DropItem label="General Ledger" onClick={() => onOpenWindow('GENERAL_LEDGER', 'General Ledger')} />
                    <DropItem label="Audit Trail" onClick={() => onOpenWindow('AUDIT_TRAIL', 'Audit Trail')} />
                </div>
            </MenuButton>
        </nav>
    );
};
