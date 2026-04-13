
import React from 'react';
import { ViewState, AppWindow, Account, Customer, Vendor, Employee, Item, Transaction, BankTransaction, QBClass, SalesRep, PriceLevel, Budget, MemorizedReport, PayrollLiability, Lead, MileageEntry, Currency, ExchangeRate, AuditLogEntry, FixedAsset, Vehicle, CompanyConfig, HomePagePreferences, UIPreferences, AccountingPreferences, BillsPreferences, CheckingPreferences, CustomFieldDefinition, Term, SalesTaxCode, VendorCreditCategory, CustomerCreditCategory, ItemCategory, UOMSet } from '../types';
import EntityForm from './EntityForm';
import ItemForm from './ItemForm';
import PreferencesDialog from './PreferencesDialog';
import ReorderItemsDialog from './ReorderItemsDialog';
import ShortcutModal from './ShortcutModal';
import PrinterSetupDialog from './PrinterSetupDialog';
import CompanyFileDialog from './CompanyFileDialog';
import SetupWizard from './SetupWizard';
import InvoiceForm from './InvoiceForm';
import SalesOrderForm from './SalesOrderForm';
import CustomerCenter from './CustomerCenter';
import InvoiceCenter from './InvoiceCenter';
import InvoiceDisplay from './InvoiceDisplay';
import RecurringInvoiceDialog from './RecurringInvoiceDialog';
import SalesOrderDisplay from './SalesOrderDisplay';
import EstimateDisplay from './EstimateDisplay';
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
import SalesOrderCenter from './SalesOrderCenter';
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
import WorkOrderForm from './WorkOrderForm';
import WorkOrderCenter from './WorkOrderCenter';
import ReceiveInventoryForm from './ReceiveInventoryForm';
import LandedCostForm from './LandedCostForm';
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
import RefundReceiptForm from './RefundReceiptForm';
import ReceivePaymentForm from './ReceivePaymentForm';
import DelayedTransactionForm from './DelayedTransactionForm';
import HomePage from './HomePage';
import Reminders from './Reminders';
import ClassList from './ClassList';
import ReportBuilder from './ReportBuilder';
import SalesRepList from './SalesRepList';
import ShipViaList from './ShipViaList';
import InventoryCenter from './InventoryCenter';
import UOMList from './UOMList';
import VehicleList from './VehicleList';
import VendorCreditCategoryList from './VendorCreditCategoryList';
import CustomerCreditCategoryList from './CustomerCreditCategoryList';
import ItemCategoryList from './ItemCategoryList';
import ImportCenter from './ImportCenter';
import WarehouseCenter from './WarehouseCenter';
import PickPackShipForm from './PickPackShipForm';
import LotTraceabilityView from './LotTraceabilityView';
import LotQCWorkflow from './LotQCWorkflow';
import SerialHistoryView from './SerialHistoryView';
import UserManagement from './UserManagement';

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
        vendorCreditCategories: VendorCreditCategory[];
        customerCreditCategories: CustomerCreditCategory[];
        itemCategories: ItemCategory[];
        uomSets: UOMSet[];
        bankFeeds: BankTransaction[];
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
        onSaveUOMSet: (s: UOMSet) => Promise<void>;
        onDeleteUOMSet: (id: string) => Promise<void>;
        onUpdateVehicle: (v: Vehicle) => void;
        onDeleteVehicle: (id: string) => void;
        onUpdateMileage: (e: any) => void;
        onDeleteReport: (id: string) => Promise<void>;
        onUpdateVendorCreditCategories: (c: VendorCreditCategory[]) => void;
        onUpdateCustomerCreditCategories: (c: CustomerCreditCategory[]) => void;
        onUpdateItemCategories: (c: ItemCategory[]) => void;
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
        handleCreateNewCompany: (config: any) => Promise<void>;
        companies: any[];
        refreshData: () => Promise<void>;
        setShortcuts: (s: any) => void;
        setShortcutGroups: (g: any) => void;
        existingGroups: any[];
    };
}

export const WindowRenderer: React.FC<WindowRendererProps> = ({ win, data, handlers }) => {
    const { type, id: winId, params } = win;
    const { onOpenWindow, onCloseWindow, onSaveTransaction, onDeleteTransaction, onSaveInventoryAdjustment, onReconcileFinish, onSaveBudget, onUpdateCustomers, onUpdateVendors, onUpdateEmployees, onUpdateItems, onUpdateAccounts, onUpdateLeads, onUpdateClasses, onUpdatePriceLevels, onUpdateTerms, onUpdateSalesTaxCodes, onUpdatePaymentMethods, onUpdateCustomerMessages, onUpdateReps, onUpdateShipVia, onUpdateUOMs, onSaveUOMSet, onDeleteUOMSet, onUpdateVehicle, onDeleteVehicle, onUpdateMileage, onDeleteReport, onUpdateVendorCreditCategories, onUpdateCustomerCreditCategories, onUpdateItemCategories, onUpdateRates, onUpdateFixedAssets, onReportDrillDown, onOpenForm, onOpenItemForm, onShowReorderDialog, handleSaveCustomer, handleSaveVendor, handleSaveEmployee, handleSaveItem, onSaveSalesTaxAdjustment, onConvertToCustomer, setCompanyConfig, handleCreateNewCompany, setUiPrefs, setAccPrefs, setHomePrefs, setBillPrefs, setCheckingPrefs, setUserRole, setClosingDate, setTimeEntries, setMemorizedReports, showAlert, refreshData } = handlers;

    const businessName = data.companyConfig?.businessName || 'My Company';

    const handleReportMemorized = (r: any, baseType: string) => {
        handlers.setMemorizedReports([...data.memorizedReports, {
            id: crypto.randomUUID(),
            name: r.title || r.name,
            baseType: baseType,
            dateCreated: new Date().toLocaleDateString(),
            params: r
        }]);
    };

    switch (type) {
        case 'HOME': return <HomePage transactions={data.transactions} accounts={data.accounts} onOpenWindow={onOpenWindow} prefs={data.homePrefs} />;
        case 'INVOICE': return <InvoiceForm customers={data.customers} items={data.items} classes={data.classes} salesReps={data.salesReps} shipVia={data.shipVia} terms={data.terms} transactions={data.transactions} timeEntries={data.timeEntries} mileageEntries={data.mileageEntries} priceLevels={data.priceLevels} onSave={onSaveTransaction} onDelete={onDeleteTransaction} onClose={() => onCloseWindow(winId)} initialData={params?.initialData} />;
        case 'SALES_ORDER': return <SalesOrderForm customers={data.customers} items={data.items} classes={data.classes} salesReps={data.salesReps} shipVia={data.shipVia} terms={data.terms} transactions={data.transactions} priceLevels={data.priceLevels} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} initialData={params?.initialData} />;
        case 'BILL': return <BillForm vendors={data.vendors} accounts={data.accounts} items={data.items} customers={data.customers} terms={data.terms} transactions={data.transactions} classes={data.classes} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} initialData={params?.initialData} />;
        case 'PURCHASE_ORDER': return <PurchaseOrderForm vendors={data.vendors} items={data.items} customers={data.customers} classes={data.classes} accounts={data.accounts} transactions={data.transactions} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} initialData={params?.initialData} />;
        case 'RECEIVE_INVENTORY': return <ReceiveInventoryForm vendors={data.vendors} transactions={data.transactions} items={data.items} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} initialVendorId={params?.initialVendorId} initialPoId={params?.initialPoId} />;
        case 'INVENTORY_ADJUSTMENT': return <InventoryAdjustmentForm items={data.items} accounts={data.accounts} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'BUILD_ASSEMBLY': return <BuildAssemblyForm
            items={data.items}
            onSave={onSaveTransaction}
            onClose={() => onCloseWindow(winId)}
            linkedWorkOrderId={params?.linkedWorkOrderId}
            linkedWorkOrderRefNo={params?.linkedWorkOrderRefNo}
            workOrderPlannedQty={params?.workOrderPlannedQty}
            workOrderRemainingQty={params?.workOrderRemainingQty}
            preselectedAssemblyId={params?.preselectedAssemblyId}
        />;
        case 'WORK_ORDER': return <WorkOrderForm
            items={data.items}
            transactions={data.transactions}
            onSave={onSaveTransaction}
            onClose={() => onCloseWindow(winId)}
            initialData={params?.initialData}
            onOpenBuild={(buildParams) => onOpenWindow('BUILD_ASSEMBLY', 'Build Assembly', buildParams)}
        />;
        case 'WORK_ORDER_CENTER': return <WorkOrderCenter
            transactions={data.transactions}
            items={data.items}
            onOpenWorkOrder={(wo) => onOpenWindow('WORK_ORDER', `Work Order ${wo.refNo}`, { initialData: wo })}
            onNewWorkOrder={() => onOpenWindow('WORK_ORDER', 'New Work Order')}
            onClose={() => onCloseWindow(winId)}
        />;
        case 'LANDED_COST': return <LandedCostForm transactions={data.transactions} items={data.items} vendors={data.vendors} onClose={() => onCloseWindow(winId)} params={params} />;
        case 'JOB_PROFITABILITY': return <JobProfitabilityReport transactions={data.transactions} customers={data.customers} companyName={businessName} selectedJobId={params?.jobId} />;
        case 'PROFIT_AND_LOSS': return <ReportView type="P&L" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'PL')} params={params} />;
        case 'GENERAL_LEDGER': return <ReportView type="GL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} params={params} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'GL')} />;
        case 'AGING': return <ReportView type="AGING" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'AGING')} params={params} />;
        case 'AP_AGING': return <ReportView type="AP_AGING" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'AP_AGING')} params={params} />;
        case 'SALES_ITEM': return <ReportView type="SALES_ITEM" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'SALES_BY_ITEM')} params={params} />;
        case 'INV_VAL': return <ReportView type="INV_VAL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'INV_VAL')} params={params} />;
        case 'TRIAL_BALANCE': return <ReportView type="TRIAL_BALANCE" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'TRIAL_BALANCE')} params={params} />;
        case 'CASH_FLOW': return <ReportView type="CASH_FLOW" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'CASH_FLOW')} params={params} />;
        case 'TAX_LIABILITY': return <ReportView type="TAX_LIABILITY" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'TAX_LIABILITY')} params={params} />;
        case 'PHYSICAL_INVENTORY': return <ReportView type="PHYSICAL_INVENTORY" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'PHYSICAL_INVENTORY')} params={params} />;
        case 'PHYSICAL_INVENTORY_WORKSHEET': return <ReportView type="PHYSICAL_INVENTORY_WORKSHEET" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'PHYSICAL_INVENTORY_WORKSHEET')} params={params} />;
        case 'BALANCE_SHEET': return <ReportView type="BS" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'BS')} params={params} />;
        // ── QB Enterprise Financial Reports ─────────────────────────────────────
        case 'PL_DETAIL':    return <ReportView type="PL_DETAIL"    transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'PL_DETAIL')}    params={params} />;
        case 'PL_BY_MONTH':  return <ReportView type="PL_BY_MONTH"  transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'PL_BY_MONTH')}  params={params} />;
        case 'PL_YTD':       return <ReportView type="PL_YTD"       transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'PL_YTD')}       params={params} />;
        case 'PL_PREV_YEAR': return <ReportView type="PL_PREV_YEAR" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'PL_PREV_YEAR')} params={params} />;
        case 'BS_DETAIL':    return <ReportView type="BS_DETAIL"    transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'BS_DETAIL')}    params={params} />;
        case 'BS_SUMMARY':   return <ReportView type="BS_SUMMARY"   transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'BS_SUMMARY')}   params={params} />;
        case 'BS_PREV_YEAR': return <ReportView type="BS_PREV_YEAR" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'BS_PREV_YEAR')} params={params} />;
        case 'INCOME_TAX':   return <ReportView type="INCOME_TAX"   transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'INCOME_TAX')}   params={params} />;
        case 'MISSING_CHECKS': return <ReportView type="MISSING_CHECKS" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'MISSING_CHECKS')} params={params} />;
        // QB Enterprise Vendors / Purchases Reports
        case 'AP_AGING_DETAIL':            return <ReportView type="AP_AGING_DETAIL"            transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'AP_AGING_DETAIL')}            params={params} />;
        case 'VENDOR_BALANCE_DETAIL':      return <ReportView type="VENDOR_BALANCE_DETAIL"      transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'VENDOR_BALANCE_DETAIL')}      params={params} />;
        case 'UNPAID_BILLS_DETAIL':        return <ReportView type="UNPAID_BILLS_DETAIL"        transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'UNPAID_BILLS_DETAIL')}        params={params} />;
        case 'BILLS_AND_PAYMENTS':         return <ReportView type="BILLS_AND_PAYMENTS"         transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'BILLS_AND_PAYMENTS')}         params={params} />;
        case 'PURCHASES_BY_VENDOR_DETAIL': return <ReportView type="PURCHASES_BY_VENDOR_DETAIL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'PURCHASES_BY_VENDOR_DETAIL')} params={params} />;
        case 'PURCHASES_BY_ITEM_DETAIL':   return <ReportView type="PURCHASES_BY_ITEM_DETAIL"   transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'PURCHASES_BY_ITEM_DETAIL')}   params={params} />;
        case 'VENDOR_CONTACT_LIST':        return <ReportView type="VENDOR_CONTACT_LIST"        transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, 'VENDOR_CONTACT_LIST')}        params={params} />;
        case '1099_SUMMARY':               return <ReportView type="REPORT_1099_SUMMARY"          transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, '1099_SUMMARY')}          params={params} />;
        case '1099_DETAIL':                return <ReportView type="REPORT_1099_DETAIL"           transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} onMemorize={(r) => handleReportMemorized(r, '1099_DETAIL')}           params={params} />;
        case 'CUSTOMER_CENTER': return <CustomerCenter customers={data.customers} transactions={data.transactions} onUpdateCustomers={onUpdateCustomers} onOpenWindow={onOpenWindow} onOpenForm={(type, entity) => onOpenForm('CUSTOMER', entity)} onOpenInvoice={() => onOpenWindow('INVOICE', 'Invoice')} onOpenPayment={() => onOpenWindow('RECEIVE_PAYMENT', 'Receive Payment')} onOpenReceipt={() => onOpenWindow('SALES_RECEIPT', 'Sales Receipt')} onOpenEstimate={() => onOpenWindow('ESTIMATE', 'Estimate')} onOpenSalesOrder={() => onOpenWindow('SALES_ORDER', 'Sales Order')} onOpenCredit={() => onOpenWindow('CREDIT_MEMO', 'Credit Memo')} onOpenDelayedCharge={() => onOpenWindow('DELAYED_CHARGE', 'Delayed Charge')} onOpenDelayedCredit={() => onOpenWindow('DELAYED_CREDIT', 'Delayed Credit')} refreshData={handlers.refreshData} />;
        case 'INVOICE_CENTER': return <InvoiceCenter transactions={data.transactions} customers={data.customers} terms={data.terms} onOpenInvoice={(inv) => onOpenWindow('INVOICE_DISPLAY', `Invoice #${inv.refNo}`, { transactionId: inv.id })} onOpenNewInvoice={() => onOpenWindow('INVOICE', 'Invoice')} onOpenWindow={onOpenWindow} onDeleteTransaction={onDeleteTransaction} />;
        case 'INVOICE_DISPLAY': {
            const invoice = data.transactions.find(t => t.id === params?.transactionId);
            const customer = data.customers.find(c => c.id === invoice?.entityId);
            if (!invoice) return <div className="p-10 font-bold uppercase italic text-slate-400">Invoice not found</div>;
            return <InvoiceDisplay invoice={invoice} customer={customer} items={data.items} classes={data.classes} onClose={() => onCloseWindow(winId)} />;
        }
        case 'ESTIMATE_DISPLAY': {
            const estimate = data.transactions.find(t => t.id === params?.transactionId);
            const customer = data.customers.find(c => c.id === estimate?.entityId);
            if (!estimate) return <div className="p-10 font-bold uppercase italic text-slate-400">Estimate not found</div>;
            return (
                <EstimateDisplay
                    estimate={estimate}
                    customer={customer}
                    items={data.items}
                    classes={data.classes}
                    onClose={() => onCloseWindow(winId)}
                    onConvertToInvoice={(est) => {
                        const { _id, __v, ...cleanEst } = est as any;
                        const updatedEst = { ...cleanEst, status: 'Converted' };
                        onSaveTransaction(updatedEst);

                        // Create invoice data: same content but NEW logical ID; carry estimate link
                        const { id: estId, ...invoiceData } = updatedEst;
                        onOpenWindow('INVOICE', 'Invoice', { initialData: { ...invoiceData, linkedDocumentIds: [estId] } as any });
                    }}
                    onSave={(est) => onSaveTransaction(est)}
                    onConvertToSalesOrder={(est) => {
                        const { _id, __v, ...cleanEst } = est as any;
                        // Mark estimate Accepted (not fully Converted — SO is not a final billing step)
                        const updatedEst = { ...cleanEst, status: 'Accepted' };
                        onSaveTransaction(updatedEst);

                        // Open Sales Order pre-filled with estimate line items
                        const { id: estId, refNo: _refNo, ...soData } = updatedEst;
                        onOpenWindow('SALES_ORDER', 'Sales Order', {
                            initialData: {
                                ...soData,
                                type: 'SALES_ORDER',
                                status: 'OPEN',
                                linkedDocumentIds: [estId],
                            } as any
                        });
                    }}
                />
            );
        }
        case 'SALES_ORDER_DISPLAY': {
            const so = data.transactions.find(t => t.id === params?.transactionId);
            const customer = data.customers.find(c => c.id === so?.entityId);
            if (!so) return <div className="p-10 font-bold uppercase italic text-slate-400">Sales Order not found</div>;
            const navigateSO = (id: string, type: string) => {
                const viewType =
                    type === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER_DISPLAY' :
                    type === 'SALES_ORDER' ? 'SALES_ORDER_DISPLAY' :
                    type === 'BILL' ? 'BILL_DISPLAY' :
                    type === 'RECEIVE_ITEM' ? 'ITEM_RECEIPT_DISPLAY' :
                    type === 'INVOICE' ? 'INVOICE_DISPLAY' :
                    type === 'ESTIMATE' ? 'ESTIMATE_DISPLAY' :
                    type === 'BILL_PAYMENT' ? 'BILL_PAYMENT_DISPLAY' :
                    type === 'PAYMENT' ? 'PAYMENT_DISPLAY' : type as any;
                const tx = data.transactions.find(t => t.id === id);
                onOpenWindow(viewType, `${type.replace(/_/g, ' ')} #${tx?.refNo || id.slice(0, 8)}`, { transactionId: id });
            };
            return (
                <SalesOrderDisplay
                    salesOrder={so}
                    customer={customer}
                    items={data.items}
                    classes={data.classes}
                    transactions={data.transactions}
                    onClose={() => onCloseWindow(winId)}
                    onNavigateToTransaction={navigateSO}
                    onSave={(s) => onSaveTransaction(s as any)}
                    onPickPackShip={(s) => onOpenWindow('PICK_PACK_SHIP', `Pick/Pack/Ship – SO #${s.refNo}`, { salesOrder: s })}
                    onConvertToInvoice={(s) => {
                        const { _id, __v, ...cleanSO } = s as any;
                        const updatedSO = { ...cleanSO, status: 'Converted' };
                        onSaveTransaction(updatedSO);

                        // Pass SO id as linked document so DataContext can confirm Converted status
                        const { id: soId, refNo: _refNo, ...invoiceData } = updatedSO;
                        onOpenWindow('INVOICE', 'Invoice', { initialData: { ...invoiceData, linkedDocumentIds: [soId] } as any });
                    }}
                    onCreatePO={(s) => {
                        const { _id, __v, ...cleanSO } = s as any;
                        // Map SO items to PO items — use item.cost as the purchase rate
                        const poItems = (cleanSO.items || []).map((lineItem: any) => {
                            const catalogItem = data.items.find(i => i.id === lineItem.itemId);
                            const purchaseRate = catalogItem?.cost ?? lineItem.rate;
                            return {
                                ...lineItem,
                                id: crypto.randomUUID(),
                                rate: purchaseRate,
                                amount: purchaseRate * (lineItem.quantity || 0),
                            };
                        });
                        onOpenWindow('PURCHASE_ORDER', 'Purchase Order', {
                            initialData: {
                                ...cleanSO,
                                type: 'PURCHASE_ORDER',
                                entityId: '',        // vendor must be chosen in PO form
                                items: poItems,
                                status: 'OPEN',
                                linkedDocumentIds: [cleanSO.id],
                                refNo: undefined,    // PO form will auto-generate
                                memo: cleanSO.memo || `From SO #${cleanSO.refNo}`,
                            } as any
                        });
                    }}
                />
            );
        }
        case 'BILL_CENTER': return <BillCenter transactions={data.transactions} vendors={data.vendors} onOpenWindow={onOpenWindow} onPayBill={(id) => onOpenWindow('PAY_BILLS', 'Pay Bills', { billId: id })} onDeleteTransaction={onDeleteTransaction} />;
        case 'PURCHASE_ORDER_CENTER': return <POCenter transactions={data.transactions} vendors={data.vendors} onOpenWindow={onOpenWindow} onSaveTransaction={onSaveTransaction} onDeleteTransaction={onDeleteTransaction} />;
        case 'SALES_ORDER_CENTER': return <SalesOrderCenter transactions={data.transactions} customers={data.customers} onOpenWindow={onOpenWindow} onSaveTransaction={onSaveTransaction} />;
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
            const poReceipts = data.transactions.filter(t => (t.type === 'BILL' || t.type === 'RECEIVE_ITEM') && t.purchaseOrderId === po.id);
            const navigateTx = (id: string, type: string) => {
                const viewType =
                    type === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER_DISPLAY' :
                    type === 'SALES_ORDER' ? 'SALES_ORDER_DISPLAY' :
                    type === 'BILL' ? 'BILL_DISPLAY' :
                    type === 'RECEIVE_ITEM' ? 'ITEM_RECEIPT_DISPLAY' :
                    type === 'INVOICE' ? 'INVOICE_DISPLAY' :
                    type === 'ESTIMATE' ? 'ESTIMATE_DISPLAY' :
                    type === 'BILL_PAYMENT' ? 'BILL_PAYMENT_DISPLAY' :
                    type === 'PAYMENT' ? 'PAYMENT_DISPLAY' : type as any;
                const tx = data.transactions.find(t => t.id === id);
                onOpenWindow(viewType, `${type.replace(/_/g, ' ')} #${tx?.refNo || id.slice(0, 8)}`, { transactionId: id });
            };
            return <PODisplay po={po} vendor={vendor} items={data.items} accounts={data.accounts} classes={data.classes} transactions={data.transactions} onClose={() => onCloseWindow(winId)} onConvertToBill={(p) => onOpenWindow('BILL', 'Enter Bills', { initialData: p })} onReceiveMore={(p) => onOpenWindow('RECEIVE_INVENTORY', 'Receive Inventory', { initialVendorId: p.entityId, initialPoId: p.id })} onNavigateToTransaction={navigateTx} receipts={poReceipts} onSave={(p) => onSaveTransaction(p as any)} />;
        }
        case 'LEAD_CENTER': return <LeadCenter leads={data.leads} onUpdateLeads={onUpdateLeads} onConvertToCustomer={onConvertToCustomer} />;
        case 'REPORTS_CENTER': return <ReportsCenter transactions={data.transactions} vendors={data.vendors} items={data.items} budgets={data.budgets} memorized={data.memorizedReports} onMemorize={(r) => setMemorizedReports([...data.memorizedReports, r])} onOpenReport={(t, title, params) => onOpenWindow(t as any, title, params)} onDeleteReport={onDeleteReport} />;
        case 'ITEM_LIST': return <ItemList items={data.items} accounts={data.accounts} onUpdateItems={onUpdateItems} onOpenForm={(item) => onOpenItemForm(item)} onOpenReport={onOpenWindow} onOrderLowStock={onShowReorderDialog} showAlert={showAlert} />;
        case 'CHART_OF_ACCOUNTS': return <ChartOfAccounts accounts={data.accounts} prefs={data.accPrefs} onUpdateAccounts={onUpdateAccounts} onOpenRegister={(id) => onOpenWindow('ACCOUNT_REGISTER', 'Register', { accountId: id })} isSingleUser={true} />;
        case 'VENDOR_CENTER': return <VendorCenter vendors={data.vendors} transactions={data.transactions} onUpdateVendors={onUpdateVendors} onOpenForm={(v) => onOpenForm('VENDOR', v)} onOpenWindow={onOpenWindow} onOpenBill={() => onOpenWindow('BILL', 'Enter Bills')} onOpenPay={() => onOpenWindow('PAY_BILLS', 'Pay Bills')} onOpenPO={() => onOpenWindow('PURCHASE_ORDER', 'Purchase Orders')} onOpenReceive={() => onOpenWindow('RECEIVE_INVENTORY', 'Receive Items')} refreshData={handlers.refreshData} />;
        case 'PAY_BILLS': return <PayBillsForm transactions={data.transactions} vendors={data.vendors} accounts={data.accounts} vendorCreditCategories={data.vendorCreditCategories} onSavePayment={onSaveTransaction} onClose={() => onCloseWindow(winId)} initialBillId={params?.billId} />;
        case 'EMPLOYEE_CENTER': return <EmployeeCenter employees={data.employees} transactions={data.transactions} onUpdateEmployees={onUpdateEmployees} onOpenWindow={onOpenWindow} onOpenForm={(e) => onOpenForm('EMPLOYEE', e)} refreshData={handlers.refreshData} />;
        case 'PAYROLL_CENTER': return <PayrollCenter transactions={data.transactions} onOpenReport={onOpenWindow} onOpenTransaction={onOpenWindow} />;
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
        case 'INVOICES_RECEIVED': return <ReportView type="INVOICES_RECEIVED" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'AGING_DETAIL': return <ReportView type="AGING_DETAIL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'OPEN_INVOICES': return <ReportView type="OPEN_INVOICES" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'COLLECTIONS': return <ReportView type="COLLECTIONS" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'STATEMENT_LIST': return <ReportView type="STATEMENT_LIST" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'CUSTOMER_BALANCE_DETAIL': return <ReportView type="CUSTOMER_BALANCE_DETAIL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'INVOICE_LIST': return <ReportView type="INVOICE_LIST" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'UNBILLED_CHARGES': return <ReportView type="UNBILLED_CHARGES" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'UNBILLED_TIME': return <ReportView type="UNBILLED_TIME" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'INV_VAL_DETAIL': return <ReportView type="INV_VAL_DETAIL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'ADJUSTED_TRIAL_BALANCE': return <ReportView type="ADJUSTED_TRIAL_BALANCE" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'DETAILED_TIME': return <ReportView type="DETAILED_TIME" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'STOCK_TAKE': return <ReportView type="STOCK_TAKE" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'OPEN_PO_LIST': return <ReportView type="OPEN_PO_LIST" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'OPEN_PO_DETAIL': return <ReportView type="OPEN_PO_DETAIL" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'TERMS_LIST_REPORT': return <ReportView type="TERMS_LIST_REPORT" transactions={data.transactions} accounts={data.accounts} customers={data.customers} vendors={data.vendors} items={data.items} budgets={data.budgets} classes={data.classes} companyName={businessName} onDrillDown={onReportDrillDown} params={params} />;
        case 'CURRENCY_LIST': return <CurrencyList currencies={data.currencies} exchangeRates={data.exchangeRates} onUpdateRates={onUpdateRates} onUpdateCurrencies={handlers.handleSaveCurrency} onClose={() => onCloseWindow(winId)} />;
        case 'FIXED_ASSET_MANAGER': return <FixedAssetManager fixedAssets={data.fixedAssets} accounts={data.accounts} vendors={data.vendors} onSave={onUpdateFixedAssets} onClose={() => onCloseWindow(winId)} />;
        case 'COLLECTION_LETTERS': return <CollectionLetterGenerator customers={data.customers} transactions={data.transactions} onClose={() => onCloseWindow(winId)} />;
        case 'BANK_FEED_MATCHING': return <BankFeedMatching bankFeeds={data.bankFeeds} transactions={data.transactions} accounts={data.accounts} handlers={{ onSaveTransaction, refreshData }} onClose={() => onCloseWindow(winId)} />;
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
        case 'ESTIMATE': return <EstimateForm customers={data.customers} items={data.items} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} onConvertToInvoice={(est) => { const { _id, __v, ...cleanEst } = est as any; onSaveTransaction(cleanEst); const { id: estId, refNo: _r, ...invData } = cleanEst; onOpenWindow('INVOICE', 'Invoice', { initialData: { ...invData, linkedDocumentIds: [estId] } }); }} onConvertToSalesOrder={(est) => { const { _id, __v, ...cleanEst } = est as any; onSaveTransaction(cleanEst); const { id: estId, refNo: _r, ...soData } = cleanEst; onOpenWindow('SALES_ORDER', 'Sales Order', { initialData: { ...soData, type: 'SALES_ORDER', status: 'OPEN', linkedDocumentIds: [estId] } }); }} initialData={params?.initialData} />;
        case 'SALES_RECEIPT': return <SalesReceiptForm customers={data.customers} items={data.items} accounts={data.accounts} paymentMethods={data.paymentMethods} onSave={onSaveTransaction} onDelete={onDeleteTransaction} onClose={() => onCloseWindow(winId)} initialData={params?.initialData || data.transactions.find(t => t.id === params?.transactionId)} onMakeRecurring={(data) => onOpenWindow('RECURRING_DIALOG', 'Memorize Transaction', { baseTransaction: data })} />;
        case 'RECEIVE_PAYMENT': return <ReceivePaymentForm customers={data.customers} transactions={data.transactions} accounts={data.accounts} paymentMethods={data.paymentMethods} customerCreditCategories={data.customerCreditCategories} initialData={params} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'CREDIT_MEMO': return <CreditMemoForm customers={data.customers} items={data.items} customerCreditCategories={data.customerCreditCategories} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} initialData={params?.initialData} onRefund={(data) => onOpenWindow('REFUND_RECEIPT', 'Refund Receipt', { initialData: data })} onMakeRecurring={(data) => onOpenWindow('RECURRING_DIALOG', 'Memorize Transaction', { baseTransaction: data })} />;
        case 'RECURRING_DIALOG': return <RecurringInvoiceDialog entities={data.customers.map(c => ({ id: c.id, name: c.name }))} entityType="Customer" baseTransaction={params.baseTransaction} onSave={(template) => { handlers.onSaveRecurringTemplate?.(template); onCloseWindow(winId); }} onClose={() => onCloseWindow(winId)} initialTemplate={params.initialTemplate} />;
        case 'REFUND_RECEIPT': return <RefundReceiptForm customers={data.customers} accounts={data.accounts} items={data.items} paymentMethods={data.paymentMethods} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} initialData={params?.initialData} />;
        case 'DELAYED_CHARGE': return <DelayedTransactionForm type="DELAYED_CHARGE" customers={data.customers} items={data.items} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} initialData={params?.initialData} />;
        case 'DELAYED_CREDIT': return <DelayedTransactionForm type="DELAYED_CREDIT" customers={data.customers} items={data.items} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} initialData={params?.initialData} />;
        case 'VENDOR_CREDIT': return <VendorCreditForm vendors={data.vendors} items={data.items} accounts={data.accounts} vendorCreditCategories={data.vendorCreditCategories} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'VENDOR_CREDIT_CATEGORY_LIST': return <VendorCreditCategoryList categories={data.vendorCreditCategories} onUpdateCategories={onUpdateVendorCreditCategories} />;
        case 'CUSTOMER_CREDIT_CATEGORY_LIST': return <CustomerCreditCategoryList categories={data.customerCreditCategories} onUpdateCategories={onUpdateCustomerCreditCategories} onClose={() => onCloseWindow(winId)} />;
        case 'ITEM_CATEGORY_LIST': return <ItemCategoryList categories={data.itemCategories} onUpdateCategories={onUpdateItemCategories} />;
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
                            (tx?.type === 'SALES_ORDER' ? 'SALES_ORDER_DISPLAY' :
                                (tx?.type === 'PAYMENT' ? 'PAYMENT_DISPLAY' : tx?.type as any)))));
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
        case 'IMPORT_CENTER': return <ImportCenter refreshData={handlers.refreshData} />;
        case 'MODERN_DASHBOARD': return <HomePage transactions={data.transactions} accounts={data.accounts} onOpenWindow={onOpenWindow} prefs={data.homePrefs} />;
        case 'CALENDAR': return <FinancialCalendar transactions={data.transactions} companyName={businessName} />;
        case 'STATEMENTS': return <StatementForm customers={data.customers} transactions={data.transactions} onClose={() => onCloseWindow(winId)} />;
        case 'TRACK_MILEAGE': return <MileageTrackerForm customers={data.customers} items={data.items} onSave={onUpdateMileage} onClose={() => onCloseWindow(winId)} />;
        case 'JOURNAL':
        case 'JOURNAL_ENTRY': return <JournalEntryForm accounts={data.accounts} classes={data.classes} customers={data.customers} vendors={data.vendors} employees={data.employees} onSave={onSaveTransaction} onClose={() => onCloseWindow(winId)} />;
        case 'CLASS_LIST': return <ClassList classes={data.classes} onUpdateClasses={onUpdateClasses} />;
        case 'SALES_REP_LIST': return <SalesRepList salesReps={data.salesReps} employees={data.employees} vendors={data.vendors} onUpdateReps={onUpdateReps} />;
        case 'SHIP_VIA_LIST': return <ShipViaList shipVia={data.shipVia} onUpdateShipVia={onUpdateShipVia} />;
        case 'INVENTORY_CENTER': return <InventoryCenter items={data.items} transactions={data.transactions} onUpdateItems={onUpdateItems} onOpenForm={(item) => onOpenItemForm(item)} onOpenAdjustment={() => onOpenWindow('INVENTORY_ADJUSTMENT', 'Adjust Quantity/Value on Hand')} onOpenBuild={() => onOpenWindow('BUILD_ASSEMBLY', 'Build Assemblies')} onOpenPO={() => onOpenWindow('PURCHASE_ORDER', 'Purchase Orders')} onOpenReceive={() => onOpenWindow('RECEIVE_INVENTORY', 'Receive Items')} onOpenWindow={onOpenWindow} />;
        case 'WAREHOUSE_CENTER': return <WarehouseCenter items={data.items} showAlert={showAlert} />;
        case 'LOT_TRACEABILITY': return <LotTraceabilityView onClose={() => onCloseWindow(winId)} initialLotNumber={params?.lotNumber} />;
        case 'SERIAL_HISTORY': return <SerialHistoryView onClose={() => onCloseWindow(winId)} initialSerialNumber={params?.serialNumber} />;
        case 'LOT_QC_WORKFLOW': return <LotQCWorkflow items={data.items} onClose={() => onCloseWindow(winId)} />;
        case 'USER_MANAGEMENT': return <UserManagement />;
        case 'PICK_PACK_SHIP': {
            const pickSO = params?.salesOrder as any;
            if (!pickSO) return <div className="p-10 font-bold uppercase italic text-slate-400">Sales Order not found</div>;
            return (
                <PickPackShipForm
                    salesOrder={pickSO}
                    items={data.items}
                    onClose={() => onCloseWindow(winId)}
                    onShip={async (shipment) => {
                        const shipmentTx: any = {
                            id: crypto.randomUUID(),
                            type: 'SHIPMENT',
                            refNo: `SHIP-${Date.now().toString().slice(-5)}`,
                            date: shipment.shippedDate,
                            entityId: pickSO.entityId,
                            total: shipment.freightCost || 0,
                            status: 'SHIPPED',
                            fulfillmentWarehouseId: shipment.warehouseId,
                            fulfillmentBinId: shipment.binId || undefined,
                            carrier: shipment.carrier,
                            trackingNo: shipment.trackingNo || undefined,
                            memo: shipment.notes || undefined,
                            freightCost: shipment.freightCost || undefined,
                            shippedLines: shipment.lines,
                            packages: shipment.packages,       // weight, dimensions, line assignments
                            linkedDocumentIds: [pickSO.id],
                            items: shipment.lines.map((l: any) => ({
                                id: crypto.randomUUID(),
                                itemId: l.itemId,
                                description: l.itemName,
                                quantity: l.packedQty,
                                rate: 0,
                                amount: 0,
                                tax: false,
                                warehouseId: l.warehouseId || shipment.warehouseId,
                                binId: l.binId || shipment.binId || undefined,
                                lotNumber: l.lotNumber || undefined,
                                serialNumber: l.serialNumber || undefined,
                                pickedQty: l.pickedQty,
                                packedQty: l.packedQty,
                            })),
                        };
                        try {
                            await onSaveTransaction(shipmentTx);
                            showAlert(`Shipment confirmed for SO #${shipment.soRefNo} via ${shipment.carrier}${shipment.trackingNo ? ` — Tracking: ${shipment.trackingNo}` : ''}`);
                            onCloseWindow(winId);
                        } catch (err: any) {
                            showAlert(`Failed to save shipment: ${err.message || 'Unknown error'}`);
                        }
                    }}
                />
            );
        }
        case 'UNIT_OF_MEASURE_LIST': return <UOMList uomSets={data.uomSets} onSaveUOMSet={onSaveUOMSet} onDeleteUOMSet={onDeleteUOMSet} uoms={(data as any).uoms} onUpdateUOMs={onUpdateUOMs} />;
        case 'VEHICLE_LIST': return <VehicleList vehicles={data.vehicles} onUpdate={onUpdateVehicle} onDelete={onDeleteVehicle} />;
        case 'ENTITY_FORM': return <EntityForm isOpen={true} type={params.type} initialData={params.initialData} accounts={data.accounts} customFields={data.customFields} customers={data.customers} customerTypes={data.customerTypes} vendorTypes={data.vendorTypes} items={data.items} priceLevels={data.priceLevels} terms={data.terms} paymentMethods={data.paymentMethods} onSave={params.type === 'VENDOR' ? handleSaveVendor : (params.type === 'CUSTOMER' ? handleSaveCustomer : handleSaveEmployee)} onClose={() => onCloseWindow(winId)} />;
        case 'ITEM_FORM': return <ItemForm isOpen={true} accounts={data.accounts} items={data.items} vendors={data.vendors} customFields={data.customFields} itemCategories={data.itemCategories} onUpdateItemCategories={onUpdateItemCategories} uomSets={data.uomSets} priceLevels={data.priceLevels} initialData={params.initialData} onSave={handleSaveItem} onClose={() => onCloseWindow(winId)} />;
        case 'PREFERENCES': return <PreferencesDialog isOpen={true} accounts={data.accounts} uiPrefs={data.uiPrefs} setUiPrefs={setUiPrefs} accPrefs={data.accPrefs} setAccPrefs={setAccPrefs} homePrefs={data.homePrefs} setHomePrefs={setHomePrefs} billPrefs={data.billPrefs} setBillPrefs={setBillPrefs} checkingPrefs={data.checkingPrefs} setCheckingPrefs={setCheckingPrefs} userRole={data.userRole} setUserRole={setUserRole} closingDate={data.closingDate} setClosingDate={setClosingDate} onClose={() => onCloseWindow(winId)} />;
        case 'REORDER_ITEMS': return <ReorderItemsDialog isOpen={true} items={data.items} vendors={data.vendors} onOrder={(pos) => { pos.forEach(onSaveTransaction); onCloseWindow(winId); }} onClose={() => onCloseWindow(winId)} />;
        case 'PRINTER_SETUP': return <PrinterSetupDialog isOpen={true} onClose={() => onCloseWindow(winId)} />;
        case 'COMPANY_FILE': return <CompanyFileDialog isOpen={true} mode={params.mode} companies={handlers.companies} onSelect={async (id) => { await handlers.switchCompany(id); onCloseWindow(winId); }} onClose={() => onCloseWindow(winId)} />;
        case 'SHORTCUT_MODAL': return <ShortcutModal isOpen={true} existingGroups={handlers.existingGroups} onSave={(s, g) => { if (g) handlers.setShortcutGroups((prev: any) => [...prev, { id: crypto.randomUUID(), name: g, isExpanded: true }]); handlers.setShortcuts((prev: any) => [...prev, s]); onCloseWindow(winId); }} onClose={() => onCloseWindow(winId)} />;
        case 'SETUP_WIZARD': return <SetupWizard isAdvanced={false} onComplete={async (config) => { await handleCreateNewCompany(config); onCloseWindow(winId); }} onCancel={() => onCloseWindow(winId)} />;
        case 'VENDOR_DETAIL': return <VendorDetailView vendorId={params.vendorId} vendors={data.vendors} transactions={data.transactions} accounts={data.accounts} onOpenTransaction={(id, type) => {
            const viewType = type === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER_DISPLAY' :
                (type === 'BILL' ? 'BILL_DISPLAY' :
                    (type === 'INVOICE' ? 'INVOICE_DISPLAY' :
                        (type === 'ESTIMATE' ? 'ESTIMATE_DISPLAY' :
                            (type === 'BILL_PAYMENT' ? 'BILL_PAYMENT_DISPLAY' :
                                (type === 'PAYMENT' ? 'PAYMENT_DISPLAY' : type as any)))));
            onOpenWindow(viewType, `${(type === 'BILL_PAYMENT' ? 'Check' : type.replace('_', ' '))} #${id}`, { transactionId: id });
        }} onEditVendor={(vendor) => onOpenWindow('ENTITY_FORM', `Edit Vendor: ${vendor.name}`, { type: 'VENDOR', initialData: vendor })} onMergeVendor={async (sourceId, targetId) => { try { const { mergeVendors } = await import('../services/api'); await mergeVendors(sourceId, targetId); handlers.refreshData?.(); onCloseWindow(winId); } catch (err: any) { alert(err.message || 'Merge failed'); } }} />;
        case 'CUSTOMER_DETAIL': return <CustomerDetailView customerId={params.customerId} customers={data.customers} transactions={data.transactions} accounts={data.accounts} onOpenTransaction={(id, type) => {
            const viewType = type === 'INVOICE' ? 'INVOICE_DISPLAY' :
                (type === 'ESTIMATE' ? 'ESTIMATE_DISPLAY' :
                    (type === 'SALES_ORDER' ? 'SALES_ORDER_DISPLAY' :
                        (type === 'BILL' ? 'BILL_DISPLAY' :
                            (type === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER_DISPLAY' :
                                (type === 'BILL_PAYMENT' ? 'BILL_PAYMENT_DISPLAY' :
                                    (type === 'PAYMENT' ? 'PAYMENT_DISPLAY' : type as any))))));
            onOpenWindow(viewType, `${(type === 'BILL_PAYMENT' ? 'Check' : type.replace('_', ' '))} #${id}`, { transactionId: id });
        }} onEditCustomer={(customer: Customer) => onOpenWindow('ENTITY_FORM', `Edit Customer: ${customer.name}`, { type: 'CUSTOMER', initialData: customer })} onSaveCustomer={async (customer: Customer) => { const { saveCustomer } = await import('../services/api'); await saveCustomer(customer); handlers.refreshData?.(); }} refreshData={handlers.refreshData} />;
        case 'EMPLOYEE_DETAIL': return <EmployeeDetailView employeeId={params.employeeId} employees={data.employees} transactions={data.transactions} accounts={data.accounts} onOpenTransaction={(id, type) => {
            const viewType = type === 'BILL' ? 'BILL_DISPLAY' :
                (type === 'INVOICE' ? 'INVOICE_DISPLAY' :
                    (type === 'ESTIMATE' ? 'ESTIMATE_DISPLAY' :
                        (type === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER_DISPLAY' :
                            (type === 'BILL_PAYMENT' ? 'BILL_PAYMENT_DISPLAY' :
                                (type === 'PAYMENT' ? 'PAYMENT_DISPLAY' : type as any)))));
            onOpenWindow(viewType, `${(type === 'BILL_PAYMENT' ? 'Check' : type.replace('_', ' '))} #${id}`, { transactionId: id });
        }} />;
        case 'REPORT_BUILDER': return (
            <ReportBuilder
                reportType={params?.reportType || 'Blank'}
                customTitle={params?.title}
                customCompanyName={params?.customCompanyName}
                transactions={data.transactions}
                accounts={data.accounts}
                customers={data.customers}
                vendors={data.vendors}
                items={data.items}
                companyName={businessName}
                onClose={() => onCloseWindow(winId)}
                initialSettings={params}
                onSave={(r) => {
                    handleReportMemorized(r, r.type || params?.reportType || 'Blank');
                    onCloseWindow(winId);
                }}
            />
        );
        default: return <div className="flex items-center justify-center h-full text-gray-500 font-bold italic uppercase tracking-widest">View Pending Implementation</div>;
    }
};
