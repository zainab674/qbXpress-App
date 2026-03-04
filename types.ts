
export type ViewState =
  | 'LANDING'
  | 'LOGIN'
  | 'SIGNUP'
  | 'SETUP_DIALOG'
  | 'EASYSTEP_WIZARD'
  | 'UNIT_OF_MEASURE_LIST'
  | 'CURRENCY_LIST'
  | 'FORECAST'
  | 'AUDIT_TRAIL_DETAIL'
  | 'CHANGE_ORDER_LOG'
  | 'FIXED_ASSET_MANAGER'
  | 'COLLECTION_LETTERS'
  | 'BANK_FEED_MATCHING'
  | 'REPORT_BUILDER'
  | 'LAYOUT_DESIGNER'
  | 'HOME'
  | 'INSIGHTS'
  | 'INVOICE'
  | 'ESTIMATE'
  | 'BILL'
  | 'PAY_BILLS'
  | 'VENDOR_CREDIT'
  | 'AP_REGISTER'
  | 'TERMS_LIST'
  | 'CHART_OF_ACCOUNTS'
  | 'CUSTOMER_CENTER'
  | 'VENDOR_CENTER'
  | 'LEAD_CENTER'
  | 'ITEM_LIST'
  | 'BANKING'
  | 'DEPOSIT'
  | 'REPORTS_CENTER'
  | 'PROFIT_AND_LOSS'
  | 'BALANCE_SHEET'
  | 'GENERAL_LEDGER'
  | 'JOB_PROFITABILITY'
  | 'EMPLOYEE_CENTER'
  | 'PAYROLL_CENTER'
  | 'STATEMENTS'
  | 'PAY_EMPLOYEES'
  | 'PAY_LIABILITIES'
  | 'SALES_TAX_CENTER'
  | 'PAY_SALES_TAX'
  | 'BILL_TRACKER'
  | 'MY_COMPANY'
  | 'PRICE_LEVEL_LIST'
  | 'SALES_TAX_CODE_LIST'
  | 'REMINDERS'
  | 'ACCOUNT_REGISTER'
  | 'SALES_RECEIPT'
  | 'RECEIVE_PAYMENT'
  | 'CREDIT_MEMO'
  | 'PAYMENT_METHOD_LIST'
  | 'CUSTOMER_MESSAGE_LIST'
  | 'PURCHASE_ORDER'
  | 'RECEIVE_INVENTORY'
  | 'INVENTORY_ADJUSTMENT'
  | 'RECONCILE'
  | 'TRANSFER_FUNDS'
  | 'CREDIT_CARD_CHARGE'
  | 'BANK_FEEDS'
  | 'COMPANY_SNAPSHOT'
  | 'SET_UP_BUDGET'
  | 'CASH_FLOW_PROJECTOR'
  | 'WEEKLY_TIMESHEET'
  | 'SINGLE_TIME_ENTRY'
  | 'AGING'
  | 'AP_AGING'
  | 'SALES_ITEM'
  | 'INV_VAL'
  | 'PHYSICAL_INVENTORY'
  | 'TAX_LIABILITY'
  | 'TRIAL_BALANCE'
  | 'CASH_FLOW'
  | 'PAYROLL_SUMMARY'
  | 'PAYROLL_LIABILITY'
  | 'AUDIT_TRAIL'
  | 'BUDGET_VS_ACTUAL'
  | 'JOB_ESTIMATES_VS_ACTUALS'
  | 'BUILD_ASSEMBLY'
  | 'JOURNAL_ENTRY'
  | 'TRACK_MILEAGE'
  | 'MILEAGE_DETAIL'
  | 'PL_BY_CLASS'
  | 'SALES_CUSTOMER'
  | 'CLASS_LIST'
  | 'SALES_REP_LIST'
  | 'SHIP_VIA_LIST'
  | 'INVENTORY_CENTER'
  | 'VEHICLE_LIST'
  | 'ENTITY_FORM'
  | 'ITEM_FORM'
  | 'SALES_ORDER'
  | 'SALES_ORDER_DISPLAY'
  | 'SALES_ORDER_CENTER'
  | 'PREFERENCES'
  | 'REORDER_ITEMS'
  | 'PRINTER_SETUP'
  | 'COMPANY_FILE'
  | 'SHORTCUT_MODAL'
  | 'SETUP_WIZARD'
  | 'VENDOR_DETAIL'
  | 'CUSTOMER_DETAIL'
  | 'EMPLOYEE_DETAIL'
  | 'INVOICE_CENTER'
  | 'INVOICE_DISPLAY'
  | 'BILL_CENTER'
  | 'BILL_DISPLAY'
  | 'PURCHASE_ORDER_CENTER'
  | 'PURCHASE_ORDER_DISPLAY'
  | 'ITEM_RECEIPT_DISPLAY'
  | 'BILL_PAYMENT_DISPLAY'
  | 'BILL_PAYMENT'
  | 'PAYMENT_DISPLAY'
  | 'CHECK'
  | 'CALENDAR'
  | 'VENDOR_CREDIT_CATEGORY_LIST'
  | 'ESTIMATE_DISPLAY'
  | 'INVOICES_RECEIVED'
  | 'AGING_DETAIL'
  | 'OPEN_INVOICES'
  | 'COLLECTIONS'
  | 'STATEMENT_LIST'
  | 'CUSTOMER_BALANCE'
  | 'CUSTOMER_BALANCE_DETAIL'
  | 'INVOICE_LIST'
  | 'UNBILLED_CHARGES'
  | 'UNBILLED_TIME'
  | 'INV_VAL_DETAIL'
  | 'ADJUSTED_TRIAL_BALANCE'
  | 'DETAILED_TIME'
  | 'VENDOR_BALANCE'
  | 'EQUITY_STATEMENT'
  | 'STOCK_TAKE'
  | 'OPEN_PO_LIST'
  | 'OPEN_PO_DETAIL'
  | 'IMPORT_CENTER'
  | 'TERMS_LIST_REPORT';

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  bankAccountId: string;
  status: 'MATCHED' | 'UNMATCHED' | 'ADDED';
  potentialMatchId?: string;
}

export interface Note {
  id: string;
  text: string;
  date: string;
  author: string;
  isPinned: boolean;
}

// Added EntityContact interface for Customer/Vendor management
export interface EntityContact {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  type: 'Primary' | 'Secondary' | 'Additional';
}

export interface Address {
  Id?: string;
  Line1?: string;
  Line2?: string;
  Line3?: string;
  Line4?: string;
  City?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
  Country?: string;
}

export interface PhoneInfo {
  FreeFormNumber?: string;
}

export interface EmailInfo {
  Address?: string;
  Cc?: string;
  Bcc?: string;
}

export interface WebInfo {
  URI?: string;
}

export interface Reference {
  value: string;
  name: string;
}

export interface CustomField {
  DefinitionId: string;
  Name: string;
  Type: 'String' | 'Number' | 'Date' | 'List' | string;
  StringValue?: string;
  NumberValue?: number;
  DateValue?: string;
}

// Added CustomFieldDefinition interface for preference management
export interface CustomFieldDefinition {
  id: string;
  label: string;
  useForCust: boolean;
  useForVend: boolean;
  useForEmpl: boolean;
  useForItem: boolean;
}

// Added Lead interface for the Lead Center
export interface Lead {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  status: 'Hot' | 'Warm' | 'Cold' | string;
  notes: string;
}

export interface Budget {
  id: string;
  year: number;
  accountId: string;
  monthlyAmounts: number[]; // 12 values
}

export interface MemorizedReport {
  id: string;
  name: string;
  baseType: string;
  dateCreated: string;
  params?: any;
}

export interface CompanyConfig {
  businessName: string;
  legalName?: string;
  industry: string;
  businessType: string;
  ein?: string;
  ssn?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  adminPassword?: string;
  fiscalYearStart?: string;
  taxYearStart?: string;
  whatDoYouSell?: 'Services' | 'Products' | 'Both' | string;
  chargeSalesTax?: boolean;
  createEstimates?: boolean;
  useStatements?: boolean;
  useProgressInvoicing?: boolean;
  manageBills?: boolean;
  trackInventory?: boolean;
  trackTime?: boolean;
  haveEmployees?: boolean;
  startDateOption?: string;
  customStartDate?: string;
}

export interface AppWindow {
  id: string;
  type: ViewState;
  title: string;
  zIndex: number;
  isMaximized: boolean;
  x: number;
  y: number;
  width: string;
  height: string;
  params?: any;
}

export interface HomePagePreferences {
  showOverallHealth: boolean;
  showCashIn: boolean;
  showCashOut: boolean;
  showNetChange: boolean;
  showTotalIncome: boolean;
  showTotalExpenses: boolean;
  showProfitMargin: boolean;
  showCashAlerts: boolean;
  showFlowOverview: boolean;
  showUpcomingObligations: boolean;
}

export interface AccountingPreferences {
  useAccountNumbers: boolean;
  showLowestSubaccountOnly: boolean;
}

export interface UIPreferences {
  showIconBar: boolean;
  showOpenWindowList: boolean;
  openWindowListPosition: 'TOP' | 'SIDEBAR';
}

export interface FormLayoutField {
  id: string;
  label: string;
  showOnScreen: boolean;
  showOnPrint: boolean;
}

export interface FormLayout {
  formType: 'INVOICE' | 'BILL' | 'ESTIMATE';
  fields: FormLayoutField[];
}

export interface BillsPreferences {
  defaultDueDays: number;
  warnOnDuplicateBillNo: boolean;
}

export interface CheckingPreferences {
  defaultBankAccountId: string;
  defaultPayrollAccountId: string;
}


export interface Account {
  id: string;
  name: string;
  number: string;
  type: string;
  balance: number;
  description?: string;
  parentId?: string;
  isActive: boolean;
  currencyId?: string; // Multi-currency
  // Added optional fields for detailed account setup
  currency?: string;
  bankAccountNumber?: string;
  routingNumber?: string;
  taxLineMapping?: string;
  openingBalance?: number;
  openingBalanceDate?: string;
}

export type ItemType =
  | 'Service'
  | 'Inventory Part'
  | 'Inventory Assembly'
  | 'Non-inventory Part'
  | 'Other Charge'
  | 'Subtotal'
  | 'Group'
  | 'Discount'
  | 'Payment'
  | 'Sales Tax Item'
  | 'Sales Tax Group';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  isActive: boolean;
  description?: string;
  purchaseDescription?: string;
  salesPrice?: number;
  cost?: number;
  incomeAccountId?: string;
  cogsAccountId?: string;
  assetAccountId?: string;
  onHand?: number;
  reorderPoint?: number;
  taxCode?: 'Tax' | 'Non';
  asOfDate?: string;
  // Added optional fields for custom fields and inventory management
  customFieldValues?: Record<string, any>;
  parentId?: string;
  taxRate?: number;
  unitOfMeasure?: string;
  taxGroupItems?: any[];
  printItemsInGroup?: boolean;
  // Procurement Fields
  discountRate?: number; // For Discount Items
  taxAgency?: string;   // For Sales Tax Items
  taxRateValue?: number; // For Sales Tax Items
  preferredVendorId?: string; // For Inventory
  vendorId?: string;           // For Sales Tax Items
  sku?: string;
  category?: string;
  imageUrl?: string;
  isSalesItem?: boolean;
  isPurchaseItem?: boolean;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  // Assemblies
  assemblyItems?: { itemId: string, quantity: number }[];
  buildPoint?: number;
}

export interface PriceLevel {
  id: string;
  name: string;
  type: 'Fixed %' | 'Per Item' | 'Formula';
  percentage?: number;
  formulaConfig?: {
    baseOn: 'Cost' | 'Current Price';
    adjustmentType: 'Increase' | 'Decrease';
    adjustmentAmount: number;
    rounding?: string;
  };
  isActive: boolean;
  perItemPrices?: Record<string, number>;
}

export interface SalesTaxCode {
  id: string;
  code: string;
  description: string;
  isTaxable: boolean;
  isActive: boolean;
}

export interface QBClass {
  id: string;
  name: string;
  isActive: boolean;
  parentId?: string;
}

export interface VendorCreditCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CustomerCreditCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface SalesRep {
  id: string;
  initials: string;
  entityId: string; // References Employee or Vendor
  isActive: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  url?: string;
}

export interface Customer {
  id: string;
  name: string; // Used as display name if DisplayName is missing
  companyName: string;
  email: string; // Keeping for compatibility
  phone: string; // Keeping for compatibility
  balance: number;
  address: string; // Keeping for compatibility
  isActive: boolean;
  currencyId?: string; // Multi-currency
  jobs: Job[];
  notes: Note[];
  contacts: EntityContact[];
  customFieldValues?: Record<string, any>;
  customerType?: string;
  taxItemId?: string; // Sales Tax Item

  // Detailed fields matching QB 2016 / QBO
  Title?: string;
  GivenName?: string;
  MiddleName?: string;
  FamilyName?: string;
  Suffix?: string;
  DisplayName?: string;

  PrimaryPhone?: PhoneInfo;
  AlternatePhone?: PhoneInfo;
  Mobile?: PhoneInfo;
  Fax?: PhoneInfo;
  OtherPhone?: PhoneInfo;

  PrimaryEmailAddr?: EmailInfo;
  WebAddr?: WebInfo;

  BillAddr?: Address;
  ShipAddr?: Address;

  parentId?: string;

  TermsRef?: Reference;
  PreferredPaymentMethodRef?: Reference;
  DeliveryMethod?: 'Print' | 'Email' | 'None';
  Language?: string;

  TaxRegistrationNumber?: string;

  OpenBalance?: number;
  OpenBalanceDate?: string;

  MarketingOptIn?: boolean;
  MarketingConsentEmail?: string;

  attachments?: Attachment[];
}

export interface Vendor {
  id: string;
  SyncToken?: string;
  Domain?: 'QBO' | string;
  Active?: boolean; // Maps to isActive
  name: string; // Used as display name if DisplayName is missing
  companyName: string;
  phone: string; // Keeping for compatibility
  email: string; // Keeping for compatibility
  balance: number;
  address: string; // Keeping for compatibility
  isActive: boolean;
  currencyId?: string; // Multi-currency

  // QBO Fields
  GivenName?: string;
  MiddleName?: string;
  FamilyName?: string;
  Suffix?: string;
  Title?: string;
  DisplayName?: string;
  PrintOnCheckName?: string;
  vendorAccountNo?: string; // Account number assigned by vendor to company

  PrimaryPhone?: PhoneInfo;
  AlternatePhone?: PhoneInfo;
  Mobile?: PhoneInfo;
  Fax?: PhoneInfo;
  OtherPhone?: PhoneInfo;

  PrimaryEmailAddr?: EmailInfo;
  WebAddr?: WebInfo;

  BillAddr?: Address;
  ShipAddr?: Address;

  TaxIdentifier?: string;
  Vendor1099?: boolean; // Maps to eligibleFor1099
  eligibleFor1099?: boolean; // Kept for compatibility

  TermsRef?: Reference;
  CreditLimit?: number;
  PreferredPaymentMethodRef?: Reference;
  BillingRateRef?: Reference;
  CurrencyRef?: Reference;
  vendorType?: string;

  OpenBalance?: number;
  OpenBalanceDate?: string;

  BillWithholdingTax?: boolean;

  MetaData?: {
    CreateTime?: string;
    LastUpdatedTime?: string;
  };

  CustomField?: CustomField[];

  billingRateLevel?: string;

  // Existing local fields
  contacts: EntityContact[];
  preFillAccounts?: string[];
  customFieldValues?: Record<string, any>;
  notes: Note[];
  attachments?: Attachment[];
}

export interface Employee {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  ssn: string;
  phone: string;
  email: string;
  address: string;
  hiredDate: string;
  isActive: boolean;
  hourlyRate: number;
  // Added fields for employee center and payroll
  type: 'Regular' | 'Officer' | 'Statutory' | 'Owner' | string;
  notes: Note[];
  // Payroll Setup
  payPeriod?: 'Weekly' | 'Bi-Weekly' | 'Semi-Monthly' | 'Monthly';
  salary?: number; // Annual salary if salaried
  federalTax?: {
    filingStatus: 'Single' | 'Married' | 'Head of Household';
    allowances: number;
    extraWithholding?: number;
  };
  stateTax?: {
    state: string;
    allowances: number;
  };
  sickLeave?: {
    accrued: number;
    used: number;
  };
  vacation?: {
    accrued: number;
    used: number;
  };
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  customerId: string;
  itemId: string;
  date: string;
  hours: number;
  isBillable: boolean;
  status: 'PENDING' | 'INVOICED' | 'PAID';
  // Added optional description for time tracking
  description?: string;
}

export interface PayrollLiability {
  id: string;
  type: 'Federal' | 'Social Security' | 'Medicare' | 'State';
  amount: number;
  dueDate: string;
  vendorId: string;
}

export interface MileageEntry {
  id: string;
  date: string;
  vehicle: string;
  odometerStart: number;
  odometerEnd: number;
  totalMiles: number;
  customerId?: string;
  itemId?: string;
  isBillable: boolean;
  notes: string;
  status: 'PENDING' | 'INVOICED' | 'PAID';
}

export interface Job {
  id: string;
  name: string;
  description?: string;
  status: 'Pending' | 'Awarded' | 'In progress' | 'Closed' | 'Not awarded';
  isActive: boolean;
  // Added optional start date for job tracking
  startDate?: string;
  projectedEndDate?: string;
  actualEndDate?: string;
  jobType?: string;
}

export interface Shortcut {
  id: string;
  name: string;
  url: string;
  groupId?: string;
}

export interface ShortcutGroup {
  id: string;
  name: string;
  isExpanded?: boolean;
}

export interface TransactionItem {
  id: string;
  itemId?: string; // Reference to the Item
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  tax: boolean;
  customerId?: string; // Job Costing
  isBillable?: boolean; // Job Costing
  classId?: string;     // Class Tracking
  exchangeRate?: number; // Multi-currency
  accountId?: string;    // Expense Account
  creditCategoryId?: string; // Vendor Credit Category
  lotNumber?: string;    // Lot Number Tracking
}

export interface Transaction {
  id: string;
  type: 'INVOICE' | 'ESTIMATE' | 'SALES_ORDER' | 'BILL' | 'CHECK' | 'DEPOSIT' | 'PURCHASE_ORDER' | 'SALES_RECEIPT' | 'CREDIT_MEMO' | 'PAYMENT' | 'VENDOR_CREDIT' | 'BILL_PAYMENT' | 'RECEIVE_ITEM' | 'INVENTORY_ADJ' | 'ASSEMBLY_BUILD' | 'TRANSFER' | 'CC_CHARGE' | 'PAYCHECK' | 'TAX_PAYMENT' | 'TAX_ADJUSTMENT' | 'JOURNAL_ENTRY';
  refNo: string;
  date: string;
  dueDate?: string;
  terms?: string;
  entityId: string;
  items: TransactionItem[];
  total: number;
  status: 'OPEN' | 'PAID' | 'CLEARED' | 'OVERDUE' | 'UNBILLED' | 'RECEIVED' | 'CLOSED' | 'Pending' | 'Accepted' | 'Converted' | 'Declined';
  bankAccountId?: string;
  depositToId?: string;
  transferFromId?: string;
  transferToId?: string;
  // Added optional fields for payments and inventory receipts
  paymentMethod?: string;
  appliedCreditIds?: string[];
  purchaseOrderId?: string;
  expectedDate?: string;
  vendorMessage?: string;
  itemReceiptId?: string;
  classId?: string;     // Transaction-level Class
  salesRepId?: string;  // Sales Rep
  shipVia?: string;     // Ship Via
  trackingNo?: string;  // Tracking Number
  shipDate?: string;    // Shipping Date
  fob?: string;         // FOB
  memo?: string;
  lotNumber?: string;   // Lot Number Tracking
  exchangeRate?: number; // Multi-currency
  homeAmount?: number;
  isChangeOrder?: boolean;
  subtotal?: number;
  taxAmount?: number;
  taxItemId?: string;
  email?: string;
  cc?: string;
  bcc?: string;
  paymentOptions?: string[];
  memoOnStatement?: string;
  attachments?: Attachment[];
  deposit?: number;
  BillAddr?: Address;
  ShipAddr?: Address;
  shippingDetails?: {
    shipmentCost?: number;
    innerPackDimensions?: { length: number; width: number; height: number; unit: string };
    outerBoxDimensions?: { length: number; width: number; height: number; unit: string };
    masterCartonDimensions?: { length: number; width: number; height: number; unit: string };
  };
}

export interface Term {
  id: string;
  name: string;
  stdDueDays: number;
  isActive: boolean;
  // Added optional discount fields
  stdDiscountDays?: number;
  discountPercentage?: number;
}

export interface RecurringTemplate {
  id: string;
  templateName: string;
  type: 'Scheduled' | 'Reminder' | 'Unscheduled';
  entityId: string;
  createDaysInAdvance: number;
  autoSendEmail: boolean;
  includeUnbilledCharges: boolean;
  markAsPrintLater: boolean;
  interval: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  every: number;
  repeatsOn?: number | string;
  startDate: string;
  endType: 'Never' | 'After' | 'OnDate';
  endAfterOccurrences?: number;
  endDate?: string;
  transactionData: Partial<Transaction>;
}

export interface Vehicle {
  id: string;
  name: string;
  description?: string;
  make?: string;
  model?: string;
  year?: string;
  vin?: string;
  isActive: boolean;
}

export interface AppStore {
  accounts: Account[];
  customers: Customer[];
  vendors: Vendor[];
  employees: Employee[];
  transactions: Transaction[];
  timeEntries: TimeEntry[];
  items: Item[];
  priceLevels: PriceLevel[];
  uoms: any[];
  salesTaxCodes: SalesTaxCode[];
  paymentMethods: string[];
  customerMessages: string[];
  terms: Term[];
  budgets: Budget[];
  memorizedReports: MemorizedReport[];
  liabilities: PayrollLiability[];
  // Added missing leads and custom field definitions
  leads: Lead[];
  customFields: CustomFieldDefinition[];
  companyConfig?: CompanyConfig;
  shortcuts?: Shortcut[];
  shortcutGroups?: ShortcutGroup[];
  classes: QBClass[];
  salesReps: SalesRep[];
  customerTypes: string[];
  vendorTypes: string[];
  shipVia: string[];
  mileageEntries: MileageEntry[];
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
  auditLogs: AuditLogEntry[];
  fixedAssets: FixedAsset[];
  vehicles: Vehicle[];
  vendorCreditCategories: VendorCreditCategory[];
  customerCreditCategories: CustomerCreditCategory[];
  recurringTemplates: RecurringTemplate[];
}

export interface FixedAsset {
  id: string;
  name: string;
  assetNumber?: string;
  purchaseDate: string;
  purchaseCost: number;
  vendorId?: string;
  description?: string;
  assetAccountId: string;
  accumulatedDepreciationAccountId?: string;
  depreciationExpenseAccountId?: string;
  depreciationMethod: 'Straight Line' | 'Double Declining' | 'Sum of Years Digits';
  usefulLifeYears: number;
  salvageValue: number;
  isActive: boolean;
}

export interface Currency {
  id: string;
  name: string;
  code: string; // e.g. "USD", "EUR"
  symbol: string;
  isHome: boolean;
}

export interface ExchangeRate {
  currencyId: string;
  rate: number; // 1 Foreign = X Home
  asOfDate: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: 'CREATE' | 'MODIFY' | 'DELETE' | 'VOID';
  transactionType: ViewState;
  transactionId: string;
  refNo: string;
  amount: number;
  priorContent?: string; // JSON string of old data
  newContent?: string;   // JSON string of new data
}

export interface ChangeOrder {
  id: string;
  estimateId: string;
  date: string;
  description: string;
  amountChange: number;
}
