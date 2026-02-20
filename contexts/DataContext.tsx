
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import * as api from '../services/api';
import { Account, Customer, Vendor, Employee, Item, Transaction, TimeEntry, PayrollLiability, MemorizedReport, Lead, Budget, SalesTaxCode, PriceLevel, Term, Shortcut, ShortcutGroup, QBClass, SalesRep, MileageEntry, Currency, ExchangeRate, AuditLogEntry, FixedAsset, Vehicle, UIPreferences, HomePagePreferences, AccountingPreferences, CompanyConfig, CustomFieldDefinition, FormLayout, BillsPreferences, CheckingPreferences, BankTransaction, VendorCreditCategory, CustomerCreditCategory } from '../types';
import { INITIAL_DATA } from '../store';

interface DataContextType {
    accounts: Account[];
    customers: Customer[];
    vendors: Vendor[];
    vendorCreditCategories: VendorCreditCategory[];
    customerCreditCategories: CustomerCreditCategory[];
    employees: Employee[];
    items: Item[];
    transactions: Transaction[];
    timeEntries: TimeEntry[];
    liabilities: PayrollLiability[];
    memorizedReports: MemorizedReport[];
    leads: Lead[];
    budgets: Budget[];
    paymentMethods: string[];
    salesTaxCodes: SalesTaxCode[];
    priceLevels: PriceLevel[];
    terms: Term[];
    customerMessages: string[];
    shortcuts: Shortcut[];
    shortcutGroups: ShortcutGroup[];
    classes: QBClass[];
    salesReps: SalesRep[];
    shipVia: string[];
    mileageEntries: MileageEntry[];
    currencies: Currency[];
    exchangeRates: ExchangeRate[];
    auditLogs: AuditLogEntry[];
    fixedAssets: FixedAsset[];
    vehicles: Vehicle[];
    customFields: CustomFieldDefinition[];
    customerTypes: string[];
    vendorTypes: string[];
    companyConfig: CompanyConfig;
    uiPrefs: UIPreferences;
    homePrefs: HomePagePreferences;
    accPrefs: AccountingPreferences;
    billPrefs: BillsPreferences;
    checkingPrefs: CheckingPreferences;
    formLayouts: FormLayout[];
    recurringTemplates: RecurringTemplate[];
    userRole: 'Admin' | 'Standard';
    closingDate: string;
    isLoaded: boolean;
    activeCompanyId: string | null;
    companies: any[];
    switchCompany: (id: string) => Promise<void>;
    bankFeeds: BankTransaction[];
    handleSaveBankFeed: (feed: BankTransaction) => Promise<void>;

    refreshData: () => Promise<void>;
    handleSaveTransaction: (tx: Transaction | Transaction[]) => Promise<void>;
    handleSaveCustomer: (c: Customer) => Promise<void>;
    handleSaveVendor: (v: Vendor) => Promise<void>;
    handleSaveEmployee: (e: Employee) => Promise<void>;
    handleSaveAccount: (a: Account) => Promise<void>;
    handleSaveItem: (i: Item) => Promise<void>;
    handleSaveLead: (l: Lead) => Promise<void>;
    handleSaveClass: (c: QBClass) => Promise<void>;
    handleSavePriceLevel: (level: PriceLevel) => Promise<void>;
    handleSaveTerm: (term: Term) => Promise<void>;
    handleDeleteTerm: (id: string) => Promise<void>;
    handleSaveRecurringTemplate: (template: RecurringTemplate) => Promise<void>;
    handleDeleteRecurringTemplate: (id: string) => Promise<void>;
    handleSaveVehicle: (v: Vehicle) => Promise<void>;
    handleDeleteVehicle: (id: string) => Promise<void>;
    handleSaveSalesTaxCode: (code: SalesTaxCode) => Promise<void>;
    handleSaveMileageEntry: (entry: MileageEntry) => Promise<void>;
    handleUpdateReps: (reps: SalesRep[]) => Promise<void>;
    handleUpdateShipVia: (shipVia: string[]) => Promise<void>;
    handleUpdateUOMs: (uoms: any[]) => Promise<void>;
    handleSaveBudget: (b: Budget[]) => Promise<void>;
    handleSaveFixedAsset: (a: FixedAsset) => Promise<void>;
    handleSaveTimeEntries: (e: TimeEntry[]) => Promise<void>;
    handleSaveMemorizedReports: (r: MemorizedReport[]) => Promise<void>;
    handleSaveExchangeRates: (r: ExchangeRate[]) => Promise<void>;
    handleSaveCurrency: (c: Currency) => Promise<void>;
    handleSaveSettings: (settings: any) => Promise<void>;
    setCompanyConfig: (c: CompanyConfig) => void;
    setUiPrefs: React.Dispatch<React.SetStateAction<UIPreferences>>;
    setAccPrefs: React.Dispatch<React.SetStateAction<AccountingPreferences>>;
    setHomePrefs: React.Dispatch<React.SetStateAction<HomePagePreferences>>;
    setBillPrefs: React.Dispatch<React.SetStateAction<BillsPreferences>>;
    setCheckingPrefs: React.Dispatch<React.SetStateAction<CheckingPreferences>>;
    setFormLayouts: React.Dispatch<React.SetStateAction<FormLayout[]>>;
    setUserRole: React.Dispatch<React.SetStateAction<'Admin' | 'Standard'>>;
    setClosingDate: React.Dispatch<React.SetStateAction<string>>;
    setCustomerMessages: React.Dispatch<React.SetStateAction<string[]>>;
    setPaymentMethods: React.Dispatch<React.SetStateAction<string[]>>;
    setShortcutGroups: React.Dispatch<React.SetStateAction<ShortcutGroup[]>>;
    setShortcuts: React.Dispatch<React.SetStateAction<Shortcut[]>>;
    onUpdateVendorCreditCategories: (categories: VendorCreditCategory[]) => void;
    onUpdateCustomerCreditCategories: (categories: CustomerCreditCategory[]) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [accounts, setAccounts] = useState<Account[]>(INITIAL_DATA.accounts);
    const [customers, setCustomers] = useState<Customer[]>(INITIAL_DATA.customers);
    const [vendors, setVendors] = useState<Vendor[]>(INITIAL_DATA.vendors);
    const [employees, setEmployees] = useState<Employee[]>(INITIAL_DATA.employees);
    const [items, setItems] = useState<Item[]>(INITIAL_DATA.items);
    const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_DATA.transactions);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(INITIAL_DATA.timeEntries);
    const [liabilities, setLiabilities] = useState<PayrollLiability[]>(INITIAL_DATA.liabilities || []);
    const [memorizedReports, setMemorizedReports] = useState<MemorizedReport[]>([]);
    const [leads, setLeads] = useState<Lead[]>(INITIAL_DATA.leads);
    const [budgets, setBudgets] = useState<Budget[]>(INITIAL_DATA.budgets || []);
    const [paymentMethods, setPaymentMethods] = useState<string[]>(INITIAL_DATA.paymentMethods || []);
    const [salesTaxCodes, setSalesTaxCodes] = useState<SalesTaxCode[]>(INITIAL_DATA.salesTaxCodes || []);
    const [priceLevels, setPriceLevels] = useState<PriceLevel[]>(INITIAL_DATA.priceLevels || []);
    const [terms, setTerms] = useState<Term[]>(INITIAL_DATA.terms || []);
    const [customerMessages, setCustomerMessages] = useState<string[]>(INITIAL_DATA.customerMessages || []);
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([
        { id: 'def-invoice', name: 'New Invoice', url: 'INVOICE' },
        { id: 'def-bill', name: 'Enter Bills', url: 'BILL' },
        { id: 'def-cust', name: 'Customers', url: 'CUSTOMER_CENTER' },
        { id: 'def-vend', name: 'Vendors', url: 'VENDOR_CENTER' }
    ]);
    const [shortcutGroups, setShortcutGroups] = useState<ShortcutGroup[]>([]);
    const [classes, setClasses] = useState<QBClass[]>(INITIAL_DATA.classes || []);
    const [uoms, setUOMs] = useState<any[]>(INITIAL_DATA.uoms || []);
    const [salesReps, setSalesReps] = useState<SalesRep[]>(INITIAL_DATA.salesReps || []);
    const [shipVia, setShipVia] = useState<string[]>(INITIAL_DATA.shipVia || []);
    const [mileageEntries, setMileageEntries] = useState<MileageEntry[]>(INITIAL_DATA.mileageEntries || []);
    const [currencies, setCurrencies] = useState<Currency[]>(INITIAL_DATA.currencies || []);
    const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>(INITIAL_DATA.exchangeRates || []);
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_DATA.auditLogs || []);
    const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(INITIAL_DATA.fixedAssets || []);
    const [vehicles, setVehicles] = useState<Vehicle[]>((INITIAL_DATA as any).vehicles || []);
    const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(INITIAL_DATA.customFields || []);
    const [customerTypes, setCustomerTypes] = useState<string[]>(INITIAL_DATA.customerTypes || []);
    const [vendorTypes, setVendorTypes] = useState<string[]>(INITIAL_DATA.vendorTypes || []);
    const [vendorCreditCategories, setVendorCreditCategories] = useState<VendorCreditCategory[]>(INITIAL_DATA.vendorCreditCategories || []);
    const [customerCreditCategories, setCustomerCreditCategories] = useState<CustomerCreditCategory[]>(INITIAL_DATA.customerCreditCategories || []);
    const [bankFeeds, setBankFeeds] = useState<BankTransaction[]>([]);
    const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>(INITIAL_DATA.recurringTemplates || []);

    const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(INITIAL_DATA.companyConfig as any);
    const [uiPrefs, setUiPrefs] = useState<UIPreferences>({ showIconBar: true, showOpenWindowList: true, openWindowListPosition: 'SIDEBAR' });
    const [homePrefs, setHomePrefs] = useState<HomePagePreferences>({
        showOverallHealth: true,
        showCashIn: true,
        showCashOut: true,
        showNetChange: true,
        showTotalIncome: false,
        showTotalExpenses: false,
        showProfitMargin: false,
        showCashAlerts: true,
        showFlowOverview: true,
        showUpcomingObligations: true
    });
    const [accPrefs, setAccPrefs] = useState<AccountingPreferences>({ useAccountNumbers: true, showLowestSubaccountOnly: false });
    const [billPrefs, setBillPrefs] = useState<BillsPreferences>({ defaultDueDays: 30, warnOnDuplicateBillNo: true });
    const [checkingPrefs, setCheckingPrefs] = useState<CheckingPreferences>({ defaultBankAccountId: '', defaultPayrollAccountId: '' });
    const [formLayouts, setFormLayouts] = useState<FormLayout[]>([
        {
            formType: 'INVOICE',
            fields: [
                { id: 'date', label: 'Date', showOnScreen: true, showOnPrint: true },
                { id: 'refNo', label: 'Invoice #', showOnScreen: true, showOnPrint: true },
                { id: 'quantity', label: 'Qty', showOnScreen: true, showOnPrint: true },
                { id: 'item', label: 'Item', showOnScreen: true, showOnPrint: true },
                { id: 'description', label: 'Description', showOnScreen: true, showOnPrint: true },
                { id: 'rate', label: 'Rate', showOnScreen: true, showOnPrint: true },
                { id: 'amount', label: 'Amount', showOnScreen: true, showOnPrint: true }
            ]
        }
    ]);
    const [userRole, setUserRole] = useState<'Admin' | 'Standard'>('Admin');
    const [closingDate, setClosingDate] = useState('12/31/2023');
    const [companies, setCompanies] = useState<any[]>([]);
    const [activeCompanyId, setActiveCompanyId] = useState<string | null>(localStorage.getItem('activeCompanyId'));
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshData = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Fetch companies first if not already loaded
        const companyList = await api.fetchCompanies().catch(() => []);
        setCompanies(companyList);

        let currentCompanyId = activeCompanyId;
        const activeExists = companyList.some(c => c._id === currentCompanyId);

        if (companyList.length === 1) {
            currentCompanyId = companyList[0]._id;
        } else if (!currentCompanyId || !activeExists) {
            if (companyList.length > 0) {
                currentCompanyId = companyList[0]._id;
            } else {
                currentCompanyId = null;
            }
        }

        if (currentCompanyId !== activeCompanyId) {
            setActiveCompanyId(currentCompanyId);
            if (currentCompanyId) localStorage.setItem('activeCompanyId', currentCompanyId);
            else localStorage.removeItem('activeCompanyId');
        }

        if (!currentCompanyId) {
            setIsLoaded(true);
            return;
        }

        const data = await api.fetchFullStore();
        const bFeeds = await api.fetchBankFeeds().catch(() => []);
        setBankFeeds(bFeeds);

        if (data) {
            if (data.accounts) setAccounts(data.accounts);
            if (data.customers) setCustomers(data.customers);
            if (data.vendors) setVendors(data.vendors);
            if (data.employees) setEmployees(data.employees);
            if (data.items) setItems(data.items);
            if (data.transactions) setTransactions(data.transactions);
            if (data.timeEntries) setTimeEntries(data.timeEntries);
            if (data.liabilities) setLiabilities(data.liabilities);
            if (data.memorizedReports) setMemorizedReports(data.memorizedReports);
            if (data.leads) setLeads(data.leads);
            if (data.budgets) setBudgets(data.budgets);
            if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
            if (data.salesTaxCodes) setSalesTaxCodes(data.salesTaxCodes);
            if (data.priceLevels) setPriceLevels(data.priceLevels);
            if (data.terms) setTerms(data.terms);
            if (data.customerMessages) setCustomerMessages(data.customerMessages);
            if (data.shortcuts) setShortcuts(data.shortcuts);
            if (data.shortcutGroups) setShortcutGroups(data.shortcutGroups);
            if (data.classes) setClasses(data.classes);
            if (data.salesReps) setSalesReps(data.salesReps);
            if (data.shipVia) setShipVia(data.shipVia);
            if ((data as any).uoms) setUOMs((data as any).uoms);
            const activeCompany = companyList.find(c => c._id === currentCompanyId);
            const config = { ...INITIAL_DATA.companyConfig, ...(data.companyConfig || {}) } as any;

            if (activeCompany) {
                // If the config name is default or missing, use company name
                if (config.businessName === 'My New Company' || !config.businessName) {
                    config.businessName = activeCompany.name;
                }
                // Sync other basic info if missing in config but present in activeCompany
                if (!config.legalName) config.legalName = activeCompany.legalName;
                if (!config.address) config.address = activeCompany.address;
                if (!config.city) config.city = activeCompany.city;
                if (!config.state) config.state = activeCompany.state;
                if (!config.zip) config.zip = activeCompany.zip;
                if (!config.phone) config.phone = activeCompany.phone;
                if (!config.email) config.email = activeCompany.email;
                if (!config.website) config.website = activeCompany.website;
                if (!config.ein) config.ein = activeCompany.taxId;
                if (config.industry === 'Other/General Business' || !config.industry) config.industry = activeCompany.industry || config.industry;
            }
            setCompanyConfig(config);
            if (data.mileageEntries) setMileageEntries(data.mileageEntries);
            if (data.currencies) setCurrencies(data.currencies);
            if (data.exchangeRates) setExchangeRates(data.exchangeRates);
            if (data.auditLogs) setAuditLogs(data.auditLogs);
            if (data.fixedAssets) setFixedAssets(data.fixedAssets);
            if ((data as any).vehicles) setVehicles((data as any).vehicles);
            if (data.customFields) setCustomFields(data.customFields);
            if ((data as any).customerTypes) setCustomerTypes((data as any).customerTypes);
            if ((data as any).vendorTypes) setVendorTypes((data as any).vendorTypes);
            if ((data as any).vendorCreditCategories && (data as any).vendorCreditCategories.length > 0) {
                setVendorCreditCategories((data as any).vendorCreditCategories);
            } else if (INITIAL_DATA.vendorCreditCategories && INITIAL_DATA.vendorCreditCategories.length > 0) {
                setVendorCreditCategories(INITIAL_DATA.vendorCreditCategories);
            }
            if ((data as any).customerCreditCategories && (data as any).customerCreditCategories.length > 0) {
                setCustomerCreditCategories((data as any).customerCreditCategories);
            } else if (INITIAL_DATA.customerCreditCategories && INITIAL_DATA.customerCreditCategories.length > 0) {
                setCustomerCreditCategories(INITIAL_DATA.customerCreditCategories);
            }
            if ((data as any).accPrefs) setAccPrefs((data as any).accPrefs);
            if ((data as any).homePrefs) setHomePrefs((data as any).homePrefs);
            if ((data as any).billPrefs) setBillPrefs((data as any).billPrefs);
            if ((data as any).checkingPrefs) setCheckingPrefs((data as any).checkingPrefs);
            if ((data as any).formLayouts) setFormLayouts((data as any).formLayouts);
            if ((data as any).uiPrefs) setUiPrefs((data as any).uiPrefs);
            if ((data as any).userRole) setUserRole((data as any).userRole);
            if ((data as any).closingDate) setClosingDate((data as any).closingDate);
            if (data.recurringTemplates) setRecurringTemplates(data.recurringTemplates);
        }
        setIsLoaded(true);
    }, [activeCompanyId]);

    const switchCompany = useCallback(async (id: string) => {
        setActiveCompanyId(id);
        localStorage.setItem('activeCompanyId', id);
        setIsLoaded(false); // Trigger reload
    }, []);

    // Ensure state stays in sync with localStorage if changed externally
    useEffect(() => {
        const storedId = localStorage.getItem('activeCompanyId');
        if (storedId !== activeCompanyId) {
            setActiveCompanyId(storedId);
        }
    }, []);

    const handleSaveTransaction = async (tx: Transaction | Transaction[]) => {
        try {
            await api.saveTransaction(tx, userRole);
            await refreshData();
        } catch (error) {
            console.error("Error saving transaction:", error);
            throw error;
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        try {
            await api.deleteTransaction(id);
            await refreshData();
        } catch (error) {
            console.error("Error deleting transaction:", error);
            throw error;
        }
    };

    const handleSaveCustomer = async (c: Customer) => {
        if (!activeCompanyId) throw new Error("No active company");

        // Check if it's a new customer
        const isNew = !customers.find(existing => existing.id === c.id);

        await api.saveCustomer(c);

        // If it's a new customer with an opening balance, create an invoice
        if (isNew && c.OpenBalance && c.OpenBalance > 0) {
            const openingInvoice: Transaction = {
                id: crypto.randomUUID(),
                type: 'INVOICE',
                refNo: 'Opening Balance',
                date: c.OpenBalanceDate || new Date().toISOString().split('T')[0],
                entityId: c.id,
                total: c.OpenBalance,
                status: 'OPEN',
                items: [
                    {
                        id: crypto.randomUUID(),
                        description: 'Opening Balance',
                        quantity: 1,
                        rate: c.OpenBalance,
                        amount: c.OpenBalance,
                        tax: false,
                        accountId: '4' // Retained Earnings / Opening Balance Equity fallback
                    }
                ],
                memo: 'Opening Balance'
            };
            await api.saveTransaction(openingInvoice, userRole);
        }

        await refreshData();
    };
    const handleSaveVendor = async (v: Vendor) => {
        if (!activeCompanyId) throw new Error("No active company");

        // Check if it's a new vendor
        const isNew = !vendors.find(existing => existing.id === v.id);

        await api.saveVendor(v);

        // If it's a new vendor with an opening balance, create a bill
        if (isNew && v.OpenBalance && v.OpenBalance > 0) {
            const openingBill: Transaction = {
                id: crypto.randomUUID(),
                type: 'BILL',
                refNo: 'Opening Balance',
                date: v.OpenBalanceDate || new Date().toISOString().split('T')[0],
                entityId: v.id,
                total: v.OpenBalance,
                status: 'OPEN',
                items: [
                    {
                        id: crypto.randomUUID(),
                        description: 'Opening Balance',
                        quantity: 1,
                        rate: v.OpenBalance,
                        amount: v.OpenBalance,
                        tax: false,
                        accountId: '4' // Retained Earnings / Opening Balance Equity fallback
                    }
                ],
                memo: 'Opening Balance'
            };
            await api.saveTransaction(openingBill, userRole);
        }

        await refreshData();
    };
    const handleSaveEmployee = async (e: Employee) => { if (!activeCompanyId) throw new Error("No active company"); await api.saveEmployee(e); await refreshData(); };
    const handleSaveAccount = async (a: Account) => { if (!activeCompanyId) throw new Error("No active company"); await api.saveAccount(a); await refreshData(); };
    const handleSaveItem = async (i: Item) => { if (!activeCompanyId) throw new Error("No active company"); await api.saveItem(i); await refreshData(); };
    const handleSaveLead = async (l: Lead) => { if (!activeCompanyId) throw new Error("No active company"); await api.saveLead(l); await refreshData(); };
    const handleSaveClass = async (c: QBClass) => { if (!activeCompanyId) throw new Error("No active company"); await api.saveClass(c); await refreshData(); };
    const handleSavePriceLevel = async (l: PriceLevel) => { if (!activeCompanyId) throw new Error("No active company"); await api.savePriceLevel(l); await refreshData(); };
    const handleSaveTerm = async (t: Term) => { if (!activeCompanyId) throw new Error("No active company"); await api.saveTerm(t); await refreshData(); };
    const handleDeleteTerm = async (id: string) => { if (!activeCompanyId) throw new Error("No active company"); await api.deleteTerm(id); await refreshData(); };
    const handleSaveRecurringTemplate = async (template: RecurringTemplate) => { if (!activeCompanyId) throw new Error("No active company"); await api.saveRecurringTemplate(template); await refreshData(); };
    const handleDeleteRecurringTemplate = async (id: string) => { if (!activeCompanyId) throw new Error("No active company"); await api.deleteRecurringTemplate(id); await refreshData(); };
    const handleSaveVehicle = async (v: Vehicle) => { if (!activeCompanyId) throw new Error("No active company"); await api.saveSettings({ vehicles: [...vehicles.filter(x => x.id !== v.id), v] }); await refreshData(); };
    const handleDeleteVehicle = async (id: string) => { if (!activeCompanyId) throw new Error("No active company"); await api.saveSettings({ vehicles: vehicles.filter(v => v.id !== id) }); await refreshData(); };
    const handleSaveSalesTaxCode = async (c: SalesTaxCode) => { if (!activeCompanyId) throw new Error("No active company"); await api.saveSalesTaxCode(c); await refreshData(); };
    const handleSaveMileageEntry = async (e: MileageEntry) => { if (!activeCompanyId) throw new Error("No active company"); await api.saveMileageEntry(e); await refreshData(); };
    const handleUpdateReps = async (reps: SalesRep[]) => {
        if (!activeCompanyId) throw new Error("No active company");
        // We can use bulk sync or save individual. For now, bulk sync is easier for these lists.
        await api.syncEntity('sales-reps', reps);
        await refreshData();
    };
    const handleUpdateShipVia = async (sv: string[]) => {
        if (!activeCompanyId) throw new Error("No active company");
        await api.saveSettings({ shipVia: sv });
        await refreshData();
    };
    const handleUpdateUOMs = async (u: any[]) => {
        if (!activeCompanyId) throw new Error("No active company");
        await api.saveSettings({ uoms: u });
        await refreshData();
    };

    const handleSaveFixedAsset = async (a: FixedAsset) => {
        if (!activeCompanyId) throw new Error("No active company");
        await api.saveFixedAsset(a);
        await refreshData();
    };
    const handleSaveBudget = async (b: Budget[]) => {
        const changed = b.find(curr => !budgets.find(old => JSON.stringify(old) === JSON.stringify(curr)));
        if (changed) await api.saveBudget(changed);
        await refreshData();
    };
    const handleSaveTimeEntries = async (e: TimeEntry[]) => {
        const changed = e.find(curr => !timeEntries.find(old => JSON.stringify(old) === JSON.stringify(curr)));
        if (changed) await api.saveTimeEntry(changed);
        await refreshData();
    };
    const handleSaveMemorizedReports = async (r: MemorizedReport[]) => {
        const changed = r.find(curr => !memorizedReports.find(old => JSON.stringify(old) === JSON.stringify(curr)));
        if (changed) await api.saveMemorizedReport(changed);
        await refreshData();
    };
    const handleSaveExchangeRates = async (r: ExchangeRate[]) => {
        setExchangeRates(r);
        await api.saveSettings({ exchangeRates: r });
        await refreshData();
    };
    const handleSaveCurrency = async (c: Currency) => {
        if (!activeCompanyId) throw new Error("No active company");
        await api.saveCurrency(c);
        await refreshData();
    };
    const handleSaveSettings = async (settings: any) => {
        await api.saveSettings(settings);
    };

    const handleSaveBankFeed = async (feed: BankTransaction) => {
        if (!activeCompanyId) throw new Error("No active company");
        await api.saveBankFeed(feed);
        await refreshData();
    };

    const handleUpdateVendorCreditCategories = (categories: VendorCreditCategory[]) => {
        setVendorCreditCategories(categories);
    };

    const handleUpdateCustomerCreditCategories = (categories: CustomerCreditCategory[]) => {
        setCustomerCreditCategories(categories);
    };

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) refreshData();
    }, [refreshData]);

    // Auto-save settings when they change
    useEffect(() => {
        if (isLoaded) {
            handleSaveSettings({
                companyConfig, shortcuts, shortcutGroups, paymentMethods, customerMessages,
                exchangeRates, uiPrefs, accPrefs, homePrefs, billPrefs, checkingPrefs, formLayouts, userRole, closingDate, vehicles, recurringTemplates,
                customerTypes: INITIAL_DATA.customerTypes, vendorTypes: INITIAL_DATA.vendorTypes, shipVia, uoms, vendorCreditCategories, customerCreditCategories
            });
        }
    }, [isLoaded, companyConfig, shortcuts, shortcutGroups, paymentMethods, customerMessages, exchangeRates, uiPrefs, accPrefs, homePrefs, billPrefs, checkingPrefs, formLayouts, userRole, closingDate, shipVia, vehicles, uoms, vendorCreditCategories, customerCreditCategories]);

    // Sync company name in collection if businessName changes
    useEffect(() => {
        if (isLoaded && activeCompanyId && companyConfig.businessName && companyConfig.businessName !== 'My New Company') {
            const activeCompany = companies.find(c => c._id === activeCompanyId);
            if (activeCompany && activeCompany.name !== companyConfig.businessName) {
                api.updateCompany(activeCompanyId, { name: companyConfig.businessName })
                    .then(() => {
                        api.fetchCompanies().then(setCompanies);
                    })
                    .catch(e => console.error("Failed to sync company name:", e));
            }
        }
    }, [activeCompanyId, companyConfig.businessName, isLoaded, companies]);

    const value = {
        accounts, customers, vendors, employees, items, transactions, timeEntries, liabilities, memorizedReports, leads, budgets,
        paymentMethods, salesTaxCodes, priceLevels, terms, customerMessages, shortcuts, shortcutGroups, classes, salesReps, shipVia,
        mileageEntries, currencies, exchangeRates, auditLogs, fixedAssets, vehicles, uoms, customFields, customerTypes, vendorTypes, vendorCreditCategories, customerCreditCategories, companyConfig, uiPrefs, homePrefs, accPrefs, billPrefs, checkingPrefs, formLayouts, userRole, closingDate, recurringTemplates,
        isLoaded, activeCompanyId, companies, bankFeeds, switchCompany, refreshData, handleSaveTransaction, handleDeleteTransaction, handleSaveCustomer, handleSaveVendor, handleSaveEmployee, handleSaveAccount, handleSaveItem,
        handleSaveLead, handleSaveClass, handleSavePriceLevel, handleSaveTerm, handleDeleteTerm, handleSaveRecurringTemplate, handleDeleteRecurringTemplate, handleSaveVehicle, handleDeleteVehicle, handleSaveSalesTaxCode, handleSaveMileageEntry, handleUpdateReps, handleUpdateShipVia, handleUpdateUOMs, handleSaveBudget, handleSaveFixedAsset, handleSaveTimeEntries, handleSaveMemorizedReports, handleSaveExchangeRates, handleSaveCurrency, handleSaveSettings, handleSaveBankFeed,
        setCompanyConfig, setUiPrefs, setAccPrefs, setHomePrefs, setBillPrefs, setCheckingPrefs, setFormLayouts, setUserRole, setClosingDate, setShortcutGroups, setShortcuts, setCustomerMessages, setPaymentMethods,
        onUpdateVendorCreditCategories: handleUpdateVendorCreditCategories,
        onUpdateCustomerCreditCategories: handleUpdateCustomerCreditCategories
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
};
