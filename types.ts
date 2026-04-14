
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
  | 'SHIPPING_MODULE'
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
  | 'DELAYED_CHARGE'
  | 'DELAYED_CREDIT'
  | 'REFUND_RECEIPT'
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
  | 'ITEM_CATEGORY_LIST'
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
  | 'TERMS_LIST_REPORT'
  | 'LANDED_COST'
  | 'WAREHOUSE_CENTER'
  | 'PICK_PACK_SHIP'
  | 'LOT_TRACEABILITY'
  | 'LOT_QC_WORKFLOW'
  | 'WORK_ORDER'
  | 'WORK_ORDER_CENTER'
  | 'SERIAL_HISTORY'
  | 'ASSEMBLY_SHORTAGE'
  | 'INVENTORY_REORDER'
  | 'MRP_RECEPTION_REPORT'
  | 'ALLOCATION_STATUS'
  | 'PRODUCT_ALLOCATION'
  | 'USER_MANAGEMENT';

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  originalDescription?: string;
  amount: number;
  bankAccountId: string;
  category?: string;
  type?: 'DEBIT' | 'CREDIT';
  status: 'FOR_REVIEW' | 'CATEGORIZED' | 'EXCLUDED' | 'MATCHED' | 'UNMATCHED' | 'ADDED';
  potentialMatchId?: string;
}

export interface BankRule {
  id: string;
  descriptionContains: string;
  suggestedCategoryId: string;
  isActive: boolean;
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

export interface NamedAddress extends Address {
  id: string;
  label: string; // e.g. 'Billing', 'Shipping', 'Home', 'Work', 'Other'
  isDefault?: boolean;
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

export interface FontSizePreferences {
  heading: number;    // h1/h2/section titles (px)
  subheading: number; // h3/h4/group labels (px)
  body: number;       // paragraphs, general text (px)
  label: number;      // form labels, table headers (px)
  data: number;       // numbers, amounts, table cells (px)
  small: number;      // captions, footnotes (px)
}

export interface UIPreferences {
  showIconBar: boolean;
  showOpenWindowList: boolean;
  openWindowListPosition: 'TOP' | 'SIDEBAR';
  favoriteReports: string[];
  fontSizes: FontSizePreferences;
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
  | 'Sales Tax Group'
  | 'Fixed Asset';

export interface ItemVendor {
  vendorId: string;
  vendorSKU?: string;
  price?: number;          // vendor's purchase price for this item
  leadTimeDays?: number;
  minimumOrderQty?: number;
  isPreferred?: boolean;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  isActive: boolean;
  description?: string;
  purchaseDescription?: string;
  salesPrice?: number;
  cost?: number;
  // Average cost — maintained automatically on each receipt (QB default)
  averageCost?: number;
  // Total inventory asset value = averageCost * onHand
  totalValue?: number;
  // Valuation method: Average (QB default), FIFO, Standard
  valuationMethod?: 'Average' | 'FIFO' | 'Standard';
  standardCost?: number;

  incomeAccountId?: string;
  cogsAccountId?: string;
  assetAccountId?: string;
  expenseAccountId?: string;

  onHand?: number;
  onPurchaseOrder?: number;
  onSalesOrder?: number;
  reorderPoint?: number;
  reorderQty?: number;   // preferred reorder quantity
  maxStock?: number;     // maximum stock level

  // QB Enterprise: default warehouse for this item's sales-order picking / receiving
  preferredWarehouseId?: string;

  // QB Enterprise: per-warehouse on-hand (denormalized from lot records)
  warehouseQuantities?: { warehouseId: string; onHand: number; value: number }[];
  // QB Enterprise: per-site reorder thresholds (override global reorderPoint)
  warehouseReorderPoints?: {
    warehouseId: string;
    reorderPoint: number;
    reorderQty: number;
    maxStock: number;
  }[];

  // Lot / Serial tracking
  trackLots?: boolean;
  trackSerialNumbers?: boolean;

  taxCode?: 'Tax' | 'Non';
  isTaxable?: boolean;
  asOfDate?: string;

  customFieldValues?: Record<string, any>;
  isSubItem?: boolean;
  parentId?: string;
  taxRate?: number;
  unitOfMeasure?: string;
  // UOM Set (QB Enterprise)
  uomSetId?: string;            // references UOMSet.id
  defaultPurchaseUOM?: string;  // unit name from the set for purchasing
  defaultSalesUOM?: string;     // unit name from the set for sales
  // Legacy simple UOM fields
  purchaseUOM?: string;
  salesUOM?: string;
  uomConversionFactor?: number;
  taxGroupItems?: any[];
  printItemsInGroup?: boolean;
  groupItems?: any[];

  // Discount item fields (QB: Discount type)
  discountType?: 'Percent' | 'Fixed';
  discountRate?: number;     // percent off (when discountType === 'Percent')
  discountAmount?: number;   // fixed dollar off (when discountType === 'Fixed')

  taxAgency?: string;
  taxRateValue?: number;
  preferredVendorId?: string;
  vendorId?: string;
  vendorSKU?: string;
  vendorLeadTimeDays?: number;
  minimumOrderQty?: number;

  // QB Enterprise: multiple vendor entries per item
  vendors?: ItemVendor[];

  sku?: string;
  barcode?: string;
  category?: string;
  subcategory?: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  imageUrl?: string;

  isSalesItem?: boolean;
  isPurchaseItem?: boolean;
  isDropShip?: boolean;

  weight?: number;
  weightUnit?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };

  // Price level overrides
  priceLevelPrices?: { priceLevelId: string; price: number }[];

  // Substitute / alternate items (QB Enterprise)
  substituteItems?: { itemId: string; reason?: string }[];

  // Assemblies
  assemblyItems?: {
    itemId: string;
    quantity: number;
    description?: string;
    unitCost?: number;
    /** Extra material expected to be scrapped during manufacturing (0-100%) */
    scrapPercent?: number;
    /** % of input that becomes usable output (1-100%, default 100) */
    yieldPercent?: number;
  }[];
  buildPoint?: number;

  // Standard cost variance tracking
  /** Cumulative variance from assembly builds: actual cost - standard cost */
  standardCostVariance?: number;
  /** Last computed actual cost per unit from most recent build */
  lastActualCost?: number;

  // Substitute / alternate items (shown when this item is out of stock)
  substituteItemIds?: string[]; // legacy flat list
  substituteItems?: { itemId: string; reason?: string }[];

  notes?: string;

  // Fixed Asset fields (QB Enterprise: Fixed Asset Manager parity)
  purchaseDate?: string;
  purchaseCost?: number;
  assetDescription?: string;
  assetTag?: string;
  serialNumber?: string;
  depreciationMethod?: 'Straight-Line' | 'MACRS' | 'Double-Declining' | 'Sum-of-Years-Digits' | 'Units-of-Production' | 'None';
  usefulLifeYears?: number;
  salvageValue?: number;
  accumulatedDepreciation?: number;
  disposalDate?: string;
  disposalAmount?: number;
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

export interface ItemCategory {
  id: string;
  name: string;
  subcategories: string[];
  isActive: boolean;
}

// QB Enterprise: Unit of Measure Sets
// A set defines one base unit and zero-or-more larger related units.
// Example "Count by Box and Each":
//   baseUnit: { name: 'Each', abbreviation: 'Ea' }
//   relatedUnits: [
//     { name: 'Six-pack', abbreviation: '6pk', conversionFactor: 6 },
//     { name: 'Box',      abbreviation: 'BX',  conversionFactor: 12 },
//     { name: 'Case',     abbreviation: 'CS',  conversionFactor: 24 },
//   ]
// conversionFactor = number of base units contained in 1 of this related unit.
export interface UOMUnit {
  name: string;
  abbreviation?: string;
  conversionFactor: number; // always 1 for the base unit
}

export interface UOMSet {
  id: string;
  name: string;                    // display name, e.g. "Count by Box and Each"
  baseUnit: { name: string; abbreviation?: string }; // the smallest unit
  relatedUnits: UOMUnit[];         // larger units with their factors
  defaultPurchaseUnit?: string;    // unit name selected by default when purchasing
  defaultSalesUnit?: string;       // unit name selected by default on sales docs
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
  priceLevelId?: string; // QB Enterprise: default price level for this customer
  substituteItemsAllowed?: boolean;

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
  addresses?: NamedAddress[];

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
  addresses?: NamedAddress[];

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
  // Personal / HR fields
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say' | string;
  department?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
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
  serialNumber?: string; // Serial Number Tracking
  isShippingLine?: boolean; // Shipping module: injected carrier charge line (excluded from line item table)
  isOneTime?: boolean;   // Recurring Template: Only includes in first generation
  receivedQuantity?: number; // PO Tracking
  isClosed?: boolean;        // PO Tracking
  warehouseId?: string;  // Per-line warehouse (multi-warehouse receiving / shipment)
  binId?: string;        // Per-line bin
  reasonCode?: string;   // Inventory adjustment reason (Damaged, Theft, Shrinkage, etc.)
  newCost?: number;      // Inventory adjustment: new unit cost (for Total Value adjustments)
  pickedQty?: number;    // Pick/Pack/Ship: picked quantity
  packedQty?: number;    // Pick/Pack/Ship: packed quantity
  estimatedQty?: number;     // Progress Invoicing: original estimate quantity
  estimatedAmount?: number;  // Progress Invoicing: original estimate line amount
  progressPercent?: number;  // Progress Invoicing: % of this line item invoiced
}

export interface Transaction {
  id: string;
  type: 'INVOICE' | 'ESTIMATE' | 'SALES_ORDER' | 'BILL' | 'CHECK' | 'DEPOSIT' | 'PURCHASE_ORDER' | 'SALES_RECEIPT' | 'CREDIT_MEMO' | 'PAYMENT' | 'VENDOR_CREDIT' | 'BILL_PAYMENT' | 'RECEIVE_ITEM' | 'INVENTORY_ADJ' | 'ASSEMBLY_BUILD' | 'WORK_ORDER' | 'TRANSFER' | 'CC_CHARGE' | 'PAYCHECK' | 'TAX_PAYMENT' | 'TAX_ADJUSTMENT' | 'JOURNAL_ENTRY';
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
  customerId?: string; // For PO Ship-To or Job Linking
  customerInvoiceNo?: string; // Link to customer's invoice
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
  warehouseId?: string;       // Destination warehouse when receiving inventory / finished good deposit for ASSEMBLY_BUILD
  binId?: string;             // Destination bin when receiving inventory
  sourceWarehouseId?: string; // ASSEMBLY_BUILD: pull components from this warehouse
  shipToWarehouseId?: string; // PO: which warehouse/site receives the shipment
  fulfillmentWarehouseId?: string;  // SO: which warehouse fulfills the order
  fulfillmentBinId?: string;        // SO: specific bin for fulfillment
  carrier?: string;                 // SHIPMENT: carrier name (UPS, FedEx, etc.)
  shippedLines?: any[];             // SHIPMENT: per-line pick/pack/ship detail
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
  acceptedBy?: string;
  acceptedDate?: string;
  customFieldValues?: Record<string, any>;
  BillAddr?: Address;
  ShipAddr?: Address;
  shippingDetails?: {
    shipmentCost?: number;
    innerPackDimensions?: { length: number; width: number; height: number; unit: string };
    outerBoxDimensions?: { length: number; width: number; height: number; unit: string };
    masterCartonDimensions?: { length: number; width: number; height: number; unit: string };
  };
  discountAmount?: number;
  discountPercentage?: number;
  isDiscountPercentage?: boolean;
  lateFee?: number;
  tip?: number;
  internalNotes?: string;
  location?: string;
  taxRate?: number;
  salesOrderId?: string;         // Linked Sales Order
  estimateId?: string;           // Progress Invoicing: source estimate
  progressType?: 'TOTAL' | 'PERCENT' | 'ITEMIZED'; // Progress Invoicing: billing method
  progressPercent?: number;      // Progress Invoicing: percentage (when PERCENT mode)
  // Bidirectional document links — all related transaction IDs
  linkedDocumentIds?: string[];
  // Backorder status for POs and SOs
  backorderStatus?: 'NONE' | 'PARTIAL' | 'FULL';
  // Standard cost variance GL posting (ASSEMBLY_BUILD with Standard valuation)
  varianceAmount?: number;       // actual - standard (positive = unfavorable, negative = favorable)
  varianceAccountId?: string;    // ID of the variance account that absorbed the difference
  // ── Work Order (QB Enterprise manufacturing) ─────────────────────────────
  workOrderStatus?: 'OPEN' | 'IN_PROGRESS' | 'PARTIAL_COMPLETE' | 'COMPLETE' | 'CANCELLED';
  quantityPlanned?: number;      // WO: total units planned to build
  quantityCompleted?: number;    // WO: cumulative units built against this WO
  // Output lot / serial assignment for ASSEMBLY_BUILD and WO
  outputLotNumber?: string;      // Lot number assigned to finished assembly
  outputLotExpirationDate?: string;
  outputLotManufacturingDate?: string;
  linkedWorkOrderId?: string;    // ASSEMBLY_BUILD: which WO this build fulfills
  // ── Shipping Module ───────────────────────────────────────────────────────
  shipViaId?: string;                 // ShipViaEntry.id (shipVia stores the name for display compat)
  shippingCost?: number;              // inbound: carrier charge paid; outbound: amount charged to customer
  shippingBillId?: string;            // ID of auto-generated carrier BILL (inbound PO/receipt/bill)
  shippingInvoiceLineId?: string;     // ID of injected shipping line item (invoice/SO)
  outboundCarrierCost?: number;       // outbound: what we pay the carrier to deliver to customer
  outboundShippingBillId?: string;    // ID of auto-generated carrier BILL for outbound shipment
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
  isAuthorized: boolean;
  authorizationDate?: string;
  lastProcessedDate?: string;
  nextScheduledDate?: string;
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

export interface ShipViaEntry {
  id: string;
  name: string;
  carrier: string;
  serviceType: string;
  accountNumber?: string;
  phone?: string;
  email?: string;
  trackingUrl?: string;
  estimatedDays?: number;
  notes?: string;
  isActive: boolean;
  isDefault?: boolean;   // Pre-selected carrier on new PO / Receipt / Bill forms
  // Shipping module: link to the carrier's Vendor record for auto-bill creation
  vendorId?: string;
  // Default GL expense account for inbound shipping costs (e.g. Freight Expense)
  defaultShippingAccountId?: string;
}

// Derived view-model used by ShippingModule — computed from Transaction records
export interface ShipmentRecord {
  id: string;                // source transaction id
  direction: 'INBOUND' | 'OUTBOUND';
  sourceType: Transaction['type'];
  sourceRefNo: string;
  date: string;
  entityId: string;
  entityName: string;
  shipViaName: string;
  carrierName?: string;
  shippingCost: number;
  trackingNo?: string;
  status: string;
  // Links
  linkedBillId?: string;     // auto-generated carrier bill (inbound)
  linkedInvoiceId?: string;  // invoice that carries the shipping line (outbound)
  linkedSOId?: string;       // source SO (outbound)
  linkedPOId?: string;       // source PO (inbound)
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
  uomSets: UOMSet[];
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
  shipVia: ShipViaEntry[];
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

export interface Warehouse {
  id: string;
  name: string;
  code?: string;
  address?: string;
  isDefault: boolean;
  companyId: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Bin {
  id: string;
  name: string;
  code?: string;
  warehouseId: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  position?: string;
  capacity?: number;
  isActive: boolean;
  notes?: string;
  companyId: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}
