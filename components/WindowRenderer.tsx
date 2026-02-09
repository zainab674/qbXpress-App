
import React from 'react';
import { ViewState, AppWindow, Account, Customer, Vendor, Employee, Item, Transaction, QBClass, SalesRep, PriceLevel, Budget, MemorizedReport, PayrollLiability, Lead, MileageEntry, Currency, ExchangeRate, AuditLogEntry, FixedAsset, Vehicle, CompanyConfig, HomePagePreferences, UIPreferences, AccountingPreferences, BillsPreferences, CheckingPreferences, CustomFieldDefinition, Term, SalesTaxCode } from '../types';
import EntityForm from './EntityForm';
import ItemForm from './ItemForm';
import PreferencesDialog from './PreferencesDialog';
import ReorderItemsDialog from './ReorderItemsDialog';
import ShortcutModal from './ShortcutModal';
import PrinterSetupDialog from './PrinterSetupDialog';
import CompanyFileDialog from './CompanyFileDialog';
import SetupWizard from './SetupWizard';
import InvoiceForm from './InvoiceForm';
import CustomerCenter from './CustomerCenter';
import InvoiceCenter from './InvoiceCenter';
import InvoiceDisplay from './InvoiceDisplay';
import BillCenter from './BillCenter';
import BillDisplay from './BillDisplay';
import BillPaymentDisplay from './BillPaymentDisplay';
import PaymentDisplay from './PaymentDisplay';
import ChequeDisplay from './ChequeDisplay';
import PODisplay from './PODisplay';
import VendorCenter from './VendorCenter';
import VendorDetailView from './VendorCenter/VendorDetailView';
import CustomerDetailView from './CustomerCenter/CustomerDetailView';
import EmployeeDetailView from './EmployeeCenter/EmployeeDetailView';
import ChartOfAccounts from './ChartOfAccounts';
import ItemList from './ItemList';
import AccountRegister from './AccountRegister';
import BillForm from './BillForm';
import PayBillsForm from './PayBillsForm';
import BillTracker from './BillTracker';
import ReportsCenter from './ReportsCenter';
import POCenter from './POCenter';
import ReportView from './ReportView';
import ReconcileForm from './ReconcileForm';
import TransferFundsForm from './TransferFundsForm';
import DepositForm from './DepositForm';
import CompanySnapshot from './CompanySnapshot';
import BudgetForm from './BudgetForm';
import StatementForm from './StatementForm';
import CashFlowProjector from './CashFlowProjector';
import EstimateForm from './EstimateForm';
import LeadCenter from './LeadCenter';
import EmployeeCenter from './EmployeeCenter';
import WeeklyTimesheet from './WeeklyTimesheet';
import SingleTimeEntry from './SingleTimeEntry';
import PayrollCenter from './PayrollCenter';
import PayEmployeesForm from './PayEmployeesForm';
import PayLiabilitiesForm from './PayLiabilitiesForm';
import SalesTaxCenter from './SalesTaxCenter';
import PaySalesTaxForm from './PaySalesTaxForm';
import JobProfitabilityReport from './JobProfitabilityReport';
import InventoryAdjustmentForm from './InventoryAdjustmentForm';
import PurchaseOrderForm from './PurchaseOrderForm';
import BuildAssemblyForm from './BuildAssemblyForm';
import ReceiveInventoryForm from './ReceiveInventoryForm';
import SalesTaxCodeList from './SalesTaxCodeList';
import TermsList from './TermsList';
import PaymentMethodList from './PaymentMethodList';
import PriceLevelList from './PriceLevelList';
import CustomerMessageList from './CustomerMessageList';
import VendorCreditForm from './VendorCreditForm';
import CreditMemoForm from './CreditMemoForm';
import FinancialCalendar from './FinancialCalendar';
import JournalEntryForm from './JournalEntryForm';
import MileageTrackerForm from './MileageTrackerForm';
import CurrencyList from './CurrencyList';
import FixedAssetManager from './FixedAssetManager';
import CollectionLetterGenerator from './CollectionLetterGenerator';
import BankFeedMatching from './BankFeedMatching';
import LayoutDesigner from './LayoutDesigner';
import BankFeedCenter from './BankFeedCenter';
import WriteChecksForm from './WriteChecksForm';
import CreditCardChargeForm from './CreditCardChargeForm';
import MyCompany from './MyCompany';
import InsightsTab from './InsightsTab';
import SalesReceiptForm from './SalesReceiptForm';
import ReceivePaymentForm from './ReceivePaymentForm';
import HomePage from './HomePage';
import Reminders from './Reminders';
import ClassList from './ClassList';
import SalesRepList from './SalesRepList';
import ShipViaList from './ShipViaList';
import InventoryCenter from './InventoryCenter';
import UOMList from './UOMList';
import VehicleList from './VehicleList';

interface WindowRendererProps {
    win: AppWindow;
    data: {
        accounts: Account[];
        customers: Customer[];
        vendors: Vendor[];
        employees: Employee[];
        items: Item[];
        transactions: Transaction[];
        timeEntries: any[];
        liabilities: PayrollLiability[];
        memorizedReports: MemorizedReport[];
        leads: Lead[];
        budgets: Budget[];
        paymentMethods: string[];
        salesTaxCodes: any[];
        priceLevels: PriceLevel[];
        terms: any[];
        customerMessages: string[];
        classes: QBClass[];
        salesReps: SalesRep[];
        mileageEntries: MileageEntry[];
        currencies: Currency[];
        exchangeRates: ExchangeRate[];
        auditLogs: AuditLogEntry[];
        fixedAssets: FixedAsset[];
        companyConfig: CompanyConfig;
        homePrefs: HomePagePreferences;
        uiPrefs: UIPreferences;
        accPrefs: AccountingPreferences;
        billPrefs: BillsPreferences;
        checkingPrefs: CheckingPreferences;
        userRole: 'Admin' | 'Standard';
        closingDate: string;
        shipVia: string[];
        vehicles: Vehicle[];
        customFields: CustomFieldDefinition[];
        customerTypes: string[];
        vendorTypes: string[];
    };
    handlers: {
        onOpenWindow: (type: ViewState, title: string, params?: any) => void;
        onCloseWindow: (id: string) => void;
        onSaveTransaction: (tx: any) => Promise<void>;
        onDeleteTransaction: (id: string) => Promise<void>;
        onSaveInventoryAdjustment: (adj: any, items: any[]) => void;
        onReconcileFinish: (accId: string, txIds: Set<string>) => void;
        onSaveBudget: (budgets: Budget[]) => void;
        onUpdateCustomers: (c: Customer[]) => void;
        onUpdateVendors: (v: Vendor[]) => void;
        onUpdateEmployees: (e: Employee[]) => void;
        onUpdateItems: (i: Item[]) => void;
        onUpdateAccounts: (a: Account[]) => void;
        onUpdateLeads: (l: Lead[]) => void;
        onUpdateClasses: (c: QBClass[]) => void;
        onUpdateFixedAssets: (a: FixedAsset[]) => void;
        onUpdatePriceLevels: (l: PriceLevel[]) => void;
        onUpdateTerms: (t: Term[]) => void;
        onUpdateSalesTaxCodes: (c: SalesTaxCode[]) => void;
        onUpdatePaymentMethods: (m: string[]) => void;
        onUpdateCustomerMessages: (m: string[]) => void;
        onUpdateReps: (reps: SalesRep[]) => void;
        onUpdateShipVia: (sv: string[]) => void;
        onUpdateUOMs: (u: any[]) => void;
        onUpdateVehicle: (v: Vehicle) => void;
        onDeleteVehicle: (id: string) => void;
        onUpdateMileage: (e: any) => void;
        onUpdateRates: (r: ExchangeRate[]) => void;
        onReportDrillDown: (id: string, context: string, params?: any) => void;
        setEntityModal: (m: any) => void;
        setItemModal: (m: any) => void;
        setShowReorderDialog: (s: boolean) => void;
        onSaveSalesTaxAdjustment: (adj: any) => void;
        onConvertToCustomer: (l: Lead) => void;
        setCompanyConfig: (c: CompanyConfig) => void;
        setUiPrefs: React.Dispatch<React.SetStateAction<UIPreferences>>;
        setAccPrefs: React.Dispatch<React.SetStateAction<AccountingPreferences>>;
        setHomePrefs: React.Dispatch<React.SetStateAction<HomePagePreferences>>;
        setBillPrefs: React.Dispatch<React.SetStateAction<BillsPreferences>>;
        setCheckingPrefs: React.Dispatch<React.SetStateAction<CheckingPreferences>>;
        setUserRole: React.Dispatch<React.SetStateAction<'Admin' | 'Standard'>>;
        setClosingDate: React.Dispatch<React.SetStateAction<string>>;
        setTimeEntries: (e: any[]) => void;
        setMemorizedReports: (r: any[]) => void;
        showAlert: (msg: string, title?: string) => void;
        onOpenForm: (type: 'CUSTOMER' | 'VENDOR' | 'EMPLOYEE', initialData?: any) => void;
        onOpenItemForm: (initialData?: Item) => void;
        onShowReorderDialog: () => void;
        handleSaveCustomer: (c: Customer) => Promise<void>;
        handleSaveVendor: (v: Vendor) => Promise<void>;
        handleSaveEmployee: (e: Employee) => Promise<void>;
        handleSaveItem: (i: Item) => Promise<void>;
        switchCompany: (id: string) => Promise<void>;
        companies: any[];
        refreshData: () => Promise<void>;
        setShortcuts: (s: any) => void;
        setShortcutGroups: (g: any) => void;
        existingGroups: any[];
    };
}

export const WindowRenderer: React.FC<WindowRendererProps> = ({ win, data, handlers }) => {
    const { type, id: winId, params } = win;
    const { onOpenWindow, onCloseWindow, onSaveTransaction, onDeleteTransaction, onSaveInventoryAdjustment, onReconcileFinish, onSaveBudget, onUpdateCustomers, onUpdateVendors, onUpdateEmployees, onUpdateItems, onUpdateAccounts, onUpdateLeads, onUpdateClasses, onUpdatePriceLevels, onUpdateTerms, onUpdateSalesTaxCodes, onUpdatePaymentMethods, onUpdateCustomerMessages, onUpdateReps, onUpdateShipVia, onUpdateUOMs, onUpdateVehicle, onDeleteVehicle, onUpdateMileage, onUpdateRates, onUpdateFixedAssets, onReportDrillDown, onOpenForm, onOpenItemForm, onShowReorderDialog, handleSaveCustomer, handleSaveVendor, handleSaveEmployee, handleSaveItem, onSaveSalesTaxAdjustment, onConvertToCustomer, setCompanyConfig, setUiPrefs, setAccPrefs, setHomePrefs, setBillPrefs, setCheckingPrefs, setUserRole, setClosingDate, setTimeEntries, setMemorizedReports, showAlert } = handlers;

    const businessName = data.companyConfig?.businessName || 'My Company';

    switch (type) {
        case 'HOME': return <HomePage transactions={data.transactions} accounts={data.accounts} onOpenWindow={onOpenWindow} />;
        case 'INVOICE': return <InvoiceForm customers={data.customers} items={data.items} classes={data.classes} salesReps={data.salesReps} shipVia={data.shipVia} terms={data.terms} transactions={data.transactions} timeEntries={data.timeEntries} mileageEntries={data.mileageEntries} priceLevels={data.priceLevels} onSave={onSaveTransaction} onDelete={onDeleteTransaction} onClose={() => onCloseWindow(winId)} initialData={params} />;
        case 'BILL': return <BillForm vendors={data.vendors} accounts={data.accounts} items={data.items} customers={data.customers} terms={data.terms} transactions={data.transactions} classes={data.classes} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} initialData={params?.initialData} />;
        case 'PURCHASE_ORDER': return <PurchaseOrderForm vendors={data.vendors} items={data.items} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'RECEIVE_INVENTORY': return <ReceiveInventoryForm vendors={data.vendors} transactions={data.transactions} items={data.items} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'INVENTORY_ADJUSTMENT': return <InventoryAdjustmentForm items={data.items} accounts={data.accounts} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'BUILD_ASSEMBLY': return <BuildAssemblyForm items={data.items} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'JOB_PROFITABILITY': return <JobProfitabilityReport transactions={data.transactions} customers={data.customers} companyName={businessName} selectedJobId={params?.jobId} />;
        case 'PROFIT_AND_LOSS': return <ReportView type="P&L" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'PL', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'GENERAL_LEDGER': return <ReportView type="GL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} params={params} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'GL', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'AGING': return <ReportView type="AGING" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'AGING', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'AP_AGING': return <ReportView type="AP_AGING" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'AP_AGING', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'SALES_ITEM': return <ReportView type="SALES_ITEM" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'SALES_BY_ITEM', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'INV_VAL': return <ReportView type="INV_VAL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'INV_VAL', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'TRIAL_BALANCE': return <ReportView type="TRIAL_BALANCE" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'TRIAL_BALANCE', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'CASH_FLOW': return <ReportView type="CASH_FLOW" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'CASH_FLOW', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'TAX_LIABILITY': return <ReportView type="TAX_LIABILITY" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'TAX_LIABILITY', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'PHYSICAL_INVENTORY': return <ReportView type="PHYSICAL_INVENTORY" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} />;
        case 'BALANCE_SHEET': return <ReportView type="BS" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'BS', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'CUSTOMER_CENTER': return <CustomerCenter customers={data.customers} transactions={data.transactions} onUpdateCustomers={onUpdateCustomers} onOpenWindow={onOpenWindow} onOpenForm={(type, entity) => onOpenForm('CUSTOMER', entity)} onOpenInvoice={() => onOpenWindow('INVOICE', 'Invoice')} onOpenPayment={() => onOpenWindow('RECEIVE_PAYMENT', 'Receive Payment')} onOpenReceipt={() => onOpenWindow('SALES_RECEIPT', 'Sales Receipt')} onOpenEstimate={() => onOpenWindow('ESTIMATE', 'Estimate')} onOpenCredit={() => onOpenWindow('CREDIT_MEMO', 'Credit Memo')} />;
        case 'INVOICE_CENTER': return <InvoiceCenter transactions={data.transactions} customers={data.customers} terms={data.terms} onOpenInvoice={(inv) => onOpenWindow('INVOICE_DISPLAY', `Invoice #${inv.refNo}`, { transactionId: inv.id })} onOpenNewInvoice={() => onOpenWindow('INVOICE', 'Invoice')} onOpenWindow={onOpenWindow} />;
        case 'INVOICE_DISPLAY': {
            const invoice = data.transactions.find(t => t.id === params?.transactionId);
            const customer = data.customers.find(c => c.id === invoice?.entityId);
            if (!invoice) return <div className="p-10 font-bold uppercase italic text-slate-400">Invoice not found</div>;
            return <InvoiceDisplay invoice={invoice} customer={customer} items={data.items} classes={data.classes} onClose={() => onCloseWindow(winId)} />;
        }
        case 'BILL_CENTER': return <BillCenter transactions={data.transactions} vendors={data.vendors} onOpenWindow={onOpenWindow} onPayBill={(id) => onOpenWindow('PAY_BILLS', 'Pay Bills', { billId: id })} />;
        case 'PURCHASE_ORDER_CENTER': return <POCenter transactions={data.transactions} vendors={data.vendors} onOpenWindow={onOpenWindow} />;
        case 'BILL_DISPLAY': {
            const bill = data.transactions.find(t => t.id === params?.transactionId);
            const vendor = data.vendors.find(v => v.id === bill?.entityId);
            if (!bill) return <div className="p-10 font-bold uppercase italic text-slate-400">Bill not found</div>;
            return <BillDisplay bill={bill} vendor={vendor} accounts={data.accounts} classes={data.classes} onClose={() => onCloseWindow(winId)} />;
        }
        case 'ITEM_RECEIPT_DISPLAY': {
            const receipt = data.transactions.find(t => t.id === params?.transactionId);
            const vendor = data.vendors.find(v => v.id === receipt?.entityId);
            if (!receipt) return <div className="p-10 font-bold uppercase italic text-slate-400">Receipt not found</div>;
            return <BillDisplay bill={receipt} vendor={vendor} accounts={data.accounts} classes={data.classes} onClose={() => onCloseWindow(winId)} />;
        }
        case 'BILL_PAYMENT_DISPLAY':
        case 'BILL_PAYMENT': {
            const payment = data.transactions.find(t => t.id === params?.transactionId);
            const vendor = data.vendors.find(v => v.id === payment?.entityId);
            if (!payment) return <div className="p-10 font-bold uppercase italic text-slate-400">Payment not found</div>;
            return <BillPaymentDisplay payment={payment} vendor={vendor} accounts={data.accounts} transactions={data.transactions} onClose={() => onCloseWindow(winId)} />;
        }
        case 'PAYMENT_DISPLAY':
        case 'PAYMENT': {
            const payment = data.transactions.find(t => t.id === params?.transactionId);
            const customer = data.customers.find(c => c.id === payment?.entityId);
            if (!payment) return <div className="p-10 font-bold uppercase italic text-slate-400">Payment not found</div>;
            return <PaymentDisplay payment={payment} customer={customer} transactions={data.transactions} onClose={() => onCloseWindow(winId)} />;
        }
        case 'CHECK': {
            const cheque = data.transactions.find(t => t.id === params?.transactionId);
            const vendor = data.vendors.find(v => v.id === cheque?.entityId);
            if (!cheque) return <div className="p-10 font-bold uppercase italic text-slate-400">Check not found</div>;
            return <ChequeDisplay cheque={cheque} vendor={vendor} accounts={data.accounts} classes={data.classes} onClose={() => onCloseWindow(winId)} />;
        }
        case 'PURCHASE_ORDER_DISPLAY': {
            const po = data.transactions.find(t => t.id === params?.transactionId);
            const vendor = data.vendors.find(v => v.id === po?.entityId);
            if (!po) return <div className="p-10 font-bold uppercase italic text-slate-400">Purchase Order not found</div>;
            return <PODisplay po={po} vendor={vendor} items={data.items} accounts={data.accounts} classes={data.classes} onClose={() => onCloseWindow(winId)} onConvertToBill={(p) => onOpenWindow('BILL', 'Enter Bills', { initialData: p })} />;
        }
        case 'LEAD_CENTER': return <LeadCenter leads={data.leads} onUpdateLeads={onUpdateLeads} onConvertToCustomer={onConvertToCustomer} />;
        case 'REPORTS_CENTER': return <ReportsCenter transactions={data.transactions} vendors={data.vendors} items={data.items} budgets={data.budgets} memorized={data.memorizedReports} onMemorize={(r) => setMemorizedReports([...data.memorizedReports, r])} onOpenReport={(t, title) => onOpenWindow(t as any, title)} />;
        case 'ITEM_LIST': return <ItemList items={data.items} accounts={data.accounts} onUpdateItems={onUpdateItems} onOpenForm={(item) => onOpenItemForm(item)} onOpenReport={onOpenWindow} onOrderLowStock={onShowReorderDialog} showAlert={showAlert} />;
        case 'CHART_OF_ACCOUNTS': return <ChartOfAccounts accounts={data.accounts} prefs={data.accPrefs} onUpdateAccounts={onUpdateAccounts} onOpenRegister={(id) => onOpenWindow('ACCOUNT_REGISTER', 'Register', { accountId: id })} isSingleUser={true} />;
        case 'VENDOR_CENTER': return <VendorCenter vendors={data.vendors} transactions={data.transactions} onUpdateVendors={onUpdateVendors} onOpenForm={(v) => onOpenForm('VENDOR', v)} onOpenWindow={onOpenWindow} onOpenBill={() => onOpenWindow('BILL', 'Enter Bills')} onOpenPay={() => onOpenWindow('PAY_BILLS', 'Pay Bills')} onOpenPO={() => onOpenWindow('PURCHASE_ORDER', 'Purchase Orders')} onOpenReceive={() => onOpenWindow('RECEIVE_INVENTORY', 'Receive Items')} />;
        case 'PAY_BILLS': return <PayBillsForm transactions={data.transactions} vendors={data.vendors} accounts={data.accounts} onSavePayment={onSaveTransaction} onClose={() => onCloseWindow(winId)} initialBillId={params?.billId} />;
        case 'EMPLOYEE_CENTER': return <EmployeeCenter employees={data.employees} transactions={data.transactions} onUpdateEmployees={onUpdateEmployees} onOpenWindow={onOpenWindow} onOpenForm={(e) => onOpenForm('EMPLOYEE', e)} />;
        case 'PAYROLL_CENTER': return <PayrollCenter employees={data.employees} liabilities={data.liabilities} onOpenPayEmployees={() => onOpenWindow('PAY_EMPLOYEES', 'Pay Employees')} onOpenPayLiabilities={() => onOpenWindow('PAY_LIABILITIES', 'Pay Liabilities')} onOpenReport={onOpenWindow} />;
        case 'PAY_EMPLOYEES': return <PayEmployeesForm employees={data.employees} timeEntries={data.timeEntries} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'PAY_LIABILITIES': return <PayLiabilitiesForm liabilities={data.liabilities} accounts={data.accounts} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'PAYROLL_SUMMARY': return <ReportView type="PAYROLL_SUMMARY" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'PAYROLL_SUMMARY', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'AUDIT_TRAIL': return <ReportView type="AUDIT_TRAIL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'AUDIT_TRAIL', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'BUDGET_VS_ACTUAL': return <ReportView type="BUDGET_VS_ACTUAL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'BUDGET_VS_ACTUAL', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'JOB_ESTIMATES_VS_ACTUALS': return <ReportView type="JOB_ESTIMATES_VS_ACTUALS" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(name) => setMemorizedReports([...data.memorizedReports, { id: Math.random().toString(), name, baseType: 'JOB_EST_VS_ACT', dateCreated: new Date().toLocaleDateString() }])} />;
        case 'MILEAGE_DETAIL': return <ReportView type="MILEAGE_DETAIL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} mileageEntries={data.mileageEntries} companyName={businessName} onDrillDown={onReportDrillDown} />;
        case 'PL_BY_CLASS': return <ReportView type="PL_BY_CLASS" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} />;
        case 'SALES_CUSTOMER': return <ReportView type="SALES_CUSTOMER" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} />;
        case 'AUDIT_TRAIL_DETAIL': return <ReportView type="AUDIT_TRAIL_DETAIL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} auditLogs={data.auditLogs} companyName={businessName} onDrillDown={onReportDrillDown} />;
        case 'CHANGE_ORDER_LOG': return <ReportView type="CHANGE_ORDER_LOG" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} />;
        case 'FORECAST': return <ReportView type="FORECAST" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} />;
        case 'CUSTOMER_BALANCE': return <ReportView type="CUSTOMER_BALANCE" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} />;
        case 'VENDOR_BALANCE': return <ReportView type="VENDOR_BALANCE" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} />;
        case 'PAYROLL_LIABILITY': return <ReportView type="PAYROLL_LIABILITY" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} />;
        case 'CURRENCY_LIST': return <CurrencyList currencies={data.currencies} exchangeRates={data.exchangeRates} onUpdateRates={onUpdateRates} onUpdateCurrencies={handlers.handleSaveCurrency} onClose={() => onCloseWindow(winId)} />;
        case 'FIXED_ASSET_MANAGER': return <FixedAssetManager fixedAssets={data.fixedAssets} accounts={data.accounts} vendors={data.vendors} onSave={onUpdateFixedAssets} onClose={() => onCloseWindow(winId)} />;
        case 'COLLECTION_LETTERS': return <CollectionLetterGenerator customers={data.customers} transactions={data.transactions} onClose={() => onCloseWindow(winId)} />;
        case 'BANK_FEED_MATCHING': return <BankFeedMatching transactions={data.transactions} accounts={data.accounts} handlers={{ onSaveTransaction }} onClose={() => onCloseWindow(winId)} />;
        case 'LAYOUT_DESIGNER': return <LayoutDesigner onClose={() => onCloseWindow(winId)} />;
        case 'WEEKLY_TIMESHEET': return <WeeklyTimesheet employees={data.employees} customers={data.customers} items={data.items} onSave={(entries) => setTimeEntries([...data.timeEntries, ...entries])} onClose={() => onCloseWindow(winId)} />;
        case 'SINGLE_TIME_ENTRY': return <SingleTimeEntry employees={data.employees} customers={data.customers} items={data.items} onSave={(entry) => setTimeEntries([...data.timeEntries, entry])} onClose={() => onCloseWindow(winId)} />;
        case 'SALES_TAX_CENTER': return <SalesTaxCenter transactions={data.transactions} items={data.items} onOpenPaySalesTax={() => onOpenWindow('PAY_SALES_TAX', 'Pay Sales Tax')} onOpenLiabilityReport={() => onOpenWindow('TAX_LIABILITY', 'Sales Tax Liability Report')} onAdjustTax={onSaveSalesTaxAdjustment} />;
        case 'BANKING': return <WriteChecksForm accounts={data.accounts} vendors={data.vendors} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'RECONCILE': return <ReconcileForm accounts={data.accounts} transactions={data.transactions} onFinish={onReconcileFinish} onClose={() => onCloseWindow(winId)} />;
        case 'TRANSFER_FUNDS': return <TransferFundsForm accounts={data.accounts} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'DEPOSIT': return <DepositForm accounts={data.accounts} vendors={data.vendors} customers={data.customers} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'CREDIT_CARD_CHARGE': return <CreditCardChargeForm accounts={data.accounts} vendors={data.vendors} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'MY_COMPANY': return <MyCompany config={data.companyConfig} onUpdate={setCompanyConfig} />;
        case 'ESTIMATE': return <EstimateForm customers={data.customers} items={data.items} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} onConvertToInvoice={(est) => { onSaveTransaction(est); onOpenWindow('INVOICE', 'Invoice', { initialData: est }); }} />;
        case 'SALES_RECEIPT': return <SalesReceiptForm customers={data.customers} items={data.items} accounts={data.accounts} paymentMethods={data.paymentMethods} onSave={onSaveTransaction} onDelete={onDeleteTransaction} onClose={() => onCloseWindow(winId)} initialData={params?.initialData || data.transactions.find(t => t.id === params?.transactionId)} />;
        case 'RECEIVE_PAYMENT': return <ReceivePaymentForm customers={data.customers} transactions={data.transactions} paymentMethods={data.paymentMethods} initialData={params} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'CREDIT_MEMO': return <CreditMemoForm customers={data.customers} items={data.items} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'VENDOR_CREDIT': return <VendorCreditForm vendors={data.vendors} items={data.items} accounts={data.accounts} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'PAY_SALES_TAX': return <PaySalesTaxForm accounts={data.accounts} transactions={data.transactions} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'SALES_TAX_CODE_LIST': return <SalesTaxCodeList codes={data.salesTaxCodes} onUpdate={onUpdateSalesTaxCodes} />;
        case 'TERMS_LIST': return <TermsList terms={data.terms} onUpdate={onUpdateTerms} />;
        case 'PAYMENT_METHOD_LIST': return <PaymentMethodList methods={data.paymentMethods} onUpdate={onUpdatePaymentMethods} />;
        case 'PRICE_LEVEL_LIST': return <PriceLevelList levels={data.priceLevels} onUpdate={onUpdatePriceLevels} />;
        case 'CUSTOMER_MESSAGE_LIST': return <CustomerMessageList messages={data.customerMessages} onUpdate={onUpdateCustomerMessages} />;
        case 'COMPANY_SNAPSHOT': return <CompanySnapshot transactions={data.transactions} accounts={data.accounts} items={data.items} companyName={businessName} />;
        case 'SET_UP_BUDGET': return <BudgetForm accounts={data.accounts} budgets={data.budgets} onSave={onSaveBudget} onClose={() => onCloseWindow(winId)} />;
        case 'CASH_FLOW_PROJECTOR': return <CashFlowProjector transactions={data.transactions} accounts={data.accounts} />;
        case 'REMINDERS': return <Reminders transactions={data.transactions} items={data.items} onOrderLowStock={onShowReorderDialog} />;
        case 'AP_REGISTER': {
            const acc = data.accounts.find(a => a.type === 'Accounts Payable') || data.accounts[0];
            return <AccountRegister account={acc} transactions={data.transactions} accounts={data.accounts} vendors={data.vendors} customers={data.customers} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        }
        case 'BILL_TRACKER': return <BillTracker transactions={data.transactions} vendors={data.vendors} onPayBill={(id) => onOpenWindow('PAY_BILLS', 'Pay Bills', { billId: id })} onOpenBill={(id) => {
            const tx = data.transactions.find(t => t.id === id);
            const viewType = tx?.type === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER_DISPLAY' :
                (tx?.type === 'BILL' ? 'BILL_DISPLAY' :
                    (tx?.type === 'RECEIVE_ITEM' ? 'ITEM_RECEIPT_DISPLAY' :
                        (tx?.type === 'BILL_PAYMENT' ? 'BILL_PAYMENT_DISPLAY' :
                            (tx?.type === 'PAYMENT' ? 'PAYMENT_DISPLAY' : tx?.type as any))));
            onOpenWindow(viewType, `${(tx?.type === 'RECEIVE_ITEM' ? 'Item Receipt' : (tx?.type === 'BILL_PAYMENT' ? 'Check' : tx?.type.replace('_', ' ')))} #${tx?.refNo || id}`, { transactionId: id });
        }} onConvertToBill={(id) => {
            const po = data.transactions.find(t => t.id === id);
            if (po) onOpenWindow('BILL', 'Enter Bills', { initialData: po });
        }} />;
        case 'BANK_FEEDS': return <BankFeedCenter onOpenWindow={onOpenWindow} onClose={() => onCloseWindow(winId)} />;
        case 'ACCOUNT_REGISTER': {
            const acc = data.accounts.find(a => a.id === params?.accountId) || data.accounts[0];
            return <AccountRegister account={acc} transactions={data.transactions} accounts={data.accounts} vendors={data.vendors} customers={data.customers} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        }
        case 'INSIGHTS': return <InsightsTab isAdmin={true} transactions={data.transactions} accounts={data.accounts} />;
        case 'MODERN_DASHBOARD': return <HomePage transactions={data.transactions} accounts={data.accounts} onOpenWindow={onOpenWindow} />;
        case 'CALENDAR': return <FinancialCalendar transactions={data.transactions} companyName={businessName} />;
        case 'STATEMENTS': return <StatementForm customers={data.customers} transactions={data.transactions} onClose={() => onCloseWindow(winId)} />;
        case 'TRACK_MILEAGE': return <MileageTrackerForm customers={data.customers} items={data.items} onSave={onUpdateMileage} onClose={() => onCloseWindow(winId)} />;
        case 'JOURNAL_ENTRY': return <JournalEntryForm accounts={data.accounts} classes={data.classes} customers={data.customers} vendors={data.vendors} employees={data.employees} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'CLASS_LIST': return <ClassList classes={data.classes} onUpdateClasses={onUpdateClasses} />;
        case 'SALES_REP_LIST': return <SalesRepList salesReps={data.salesReps} employees={data.employees} vendors={data.vendors} onUpdateReps={onUpdateReps} />;
        case 'SHIP_VIA_LIST': return <ShipViaList shipVia={data.shipVia} onUpdateShipVia={onUpdateShipVia} />;
        case 'INVENTORY_CENTER': return <InventoryCenter items={data.items} transactions={data.transactions} onUpdateItems={onUpdateItems} onOpenForm={(item) => onOpenItemForm(item)} onOpenAdjustment={() => onOpenWindow('INVENTORY_ADJUSTMENT', 'Adjust Quantity/Value on Hand')} onOpenBuild={() => onOpenWindow('BUILD_ASSEMBLY', 'Build Assemblies')} onOpenPO={() => onOpenWindow('PURCHASE_ORDER', 'Purchase Orders')} onOpenReceive={() => onOpenWindow('RECEIVE_INVENTORY', 'Receive Items')} />;
        case 'UNIT_OF_MEASURE_LIST': return <UOMList uoms={data.uoms} onUpdateUOMs={onUpdateUOMs} />;
        case 'VEHICLE_LIST': return <VehicleList vehicles={data.vehicles} onUpdate={onUpdateVehicle} onDelete={onDeleteVehicle} />;
        case 'ENTITY_FORM': return <EntityForm isOpen={true} type={params.type} initialData={params.initialData} accounts={data.accounts} customFields={data.customFields} customers={data.customers} customerTypes={data.customerTypes} vendorTypes={data.vendorTypes} items={data.items} onSave={params.type === 'VENDOR' ? handleSaveVendor : (params.type === 'CUSTOMER' ? handleSaveCustomer : handleSaveEmployee)} onClose={() => onCloseWindow(winId)} />;
        case 'ITEM_FORM': return <ItemForm isOpen={true} accounts={data.accounts} items={data.items} vendors={data.vendors} customFields={data.customFields} initialData={params.initialData} onSave={handleSaveItem} onClose={() => onCloseWindow(winId)} />;
        case 'PREFERENCES': return <PreferencesDialog isOpen={true} accounts={data.accounts} uiPrefs={data.uiPrefs} setUiPrefs={setUiPrefs} accPrefs={data.accPrefs} setAccPrefs={setAccPrefs} homePrefs={data.homePrefs} setHomePrefs={setHomePrefs} billPrefs={data.billPrefs} setBillPrefs={setBillPrefs} checkingPrefs={data.checkingPrefs} setCheckingPrefs={setCheckingPrefs} userRole={data.userRole} setUserRole={setUserRole} closingDate={data.closingDate} setClosingDate={setClosingDate} onClose={() => onCloseWindow(winId)} />;
        case 'REORDER_ITEMS': return <ReorderItemsDialog isOpen={true} items={data.items} vendors={data.vendors} onOrder={(pos) => { pos.forEach(onSaveTransaction); onCloseWindow(winId); }} onClose={() => onCloseWindow(winId)} />;
        case 'PRINTER_SETUP': return <PrinterSetupDialog isOpen={true} onClose={() => onCloseWindow(winId)} />;
        case 'COMPANY_FILE': return <CompanyFileDialog isOpen={true} mode={params.mode} companies={handlers.companies} onSelect={async (id) => { await handlers.switchCompany(id); onCloseWindow(winId); }} onClose={() => onCloseWindow(winId)} />;
        case 'SHORTCUT_MODAL': return <ShortcutModal isOpen={true} existingGroups={handlers.existingGroups} onSave={(s, g) => { if (g) handlers.setShortcutGroups((prev: any) => [...prev, { id: crypto.randomUUID(), name: g, isExpanded: true }]); handlers.setShortcuts((prev: any) => [...prev, s]); onCloseWindow(winId); }} onClose={() => onCloseWindow(winId)} />;
        case 'SETUP_WIZARD': return <SetupWizard isAdvanced={false} onComplete={async (config) => { await handlers.setCompanyConfig(config); await handlers.refreshData(); onCloseWindow(winId); }} onCancel={() => onCloseWindow(winId)} />;
        case 'VENDOR_DETAIL': return <VendorDetailView vendorId={params.vendorId} vendors={data.vendors} transactions={data.transactions} accounts={data.accounts} onOpenTransaction={(id, type) => {
            const viewType = type === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER_DISPLAY' :
                (type === 'BILL' ? 'BILL_DISPLAY' :
                    (type === 'INVOICE' ? 'INVOICE_DISPLAY' :
                        (type === 'BILL_PAYMENT' ? 'BILL_PAYMENT_DISPLAY' :
                            (type === 'PAYMENT' ? 'PAYMENT_DISPLAY' : type as any))));
            onOpenWindow(viewType, `${(type === 'BILL_PAYMENT' ? 'Check' : type.replace('_', ' '))} #${id}`, { transactionId: id });
        }} />;
        case 'CUSTOMER_DETAIL': return <CustomerDetailView customerId={params.customerId} customers={data.customers} transactions={data.transactions} accounts={data.accounts} onOpenTransaction={(id, type) => {
            const viewType = type === 'INVOICE' ? 'INVOICE_DISPLAY' :
                (type === 'BILL' ? 'BILL_DISPLAY' :
                    (type === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER_DISPLAY' :
                        (type === 'BILL_PAYMENT' ? 'BILL_PAYMENT_DISPLAY' :
                            (type === 'PAYMENT' ? 'PAYMENT_DISPLAY' : type as any))));
            onOpenWindow(viewType, `${(type === 'BILL_PAYMENT' ? 'Check' : type.replace('_', ' '))} #${id}`, { transactionId: id });
        }} />;
        case 'EMPLOYEE_DETAIL': return <EmployeeDetailView employeeId={params.employeeId} employees={data.employees} transactions={data.transactions} accounts={data.accounts} onOpenTransaction={(id, type) => {
            const viewType = type === 'BILL' ? 'BILL_DISPLAY' :
                (type === 'INVOICE' ? 'INVOICE_DISPLAY' :
                    (type === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER_DISPLAY' :
                        (type === 'BILL_PAYMENT' ? 'BILL_PAYMENT_DISPLAY' :
                            (type === 'PAYMENT' ? 'PAYMENT_DISPLAY' : type as any))));
            onOpenWindow(viewType, `${(type === 'BILL_PAYMENT' ? 'Check' : type.replace('_', ' '))} #${id}`, { transactionId: id });
        }} />;
        default: return <div className="flex items-center justify-center h-full text-gray-500 font-bold italic uppercase tracking-widest">View Pending Implementation</div>;
    }
};
