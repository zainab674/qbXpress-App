
import { AppStore } from './types';

// Production Initial Data: Bare essentials to start a new company.
export const INITIAL_DATA: AppStore = {
  accounts: [
    { id: '1', name: 'Checking', number: '1000', type: 'Bank', balance: 0, isActive: true },
    { id: '2', name: 'Accounts Receivable', number: '11000', type: 'Accounts Receivable', balance: 0, isActive: true },
    { id: '3', name: 'Accounts Payable', number: '20000', type: 'Accounts Payable', balance: 0, isActive: true },
    { id: '4', name: 'Retained Earnings', number: '3900', type: 'Equity', balance: 0, isActive: true },
  ],
  items: [],
  customers: [],
  vendors: [],
  employees: [],
  timeEntries: [],
  transactions: [],
  leads: [],
  customFields: [],
  priceLevels: [],
  salesTaxCodes: [
    { id: '1', code: 'TAX', description: 'Taxable Sales', isTaxable: true, isActive: true },
    { id: '2', code: 'NON', description: 'Non-Taxable Sales', isTaxable: false, isActive: true }
  ],
  paymentMethods: ['Cash', 'Check', 'Visa', 'MasterCard', 'American Express', 'Discover'],
  customerMessages: [
    'Thank you for your business!',
    'It’s been a pleasure working with you!'
  ],
  terms: [
    { id: '1', name: 'Net 30', stdDueDays: 30, isActive: true },
    { id: '2', name: 'Due on receipt', stdDueDays: 0, isActive: true }
  ],
  budgets: [],
  memorizedReports: [],
  liabilities: [],
  classes: [],
  salesReps: [],
  customerTypes: ['Referral', 'Retail', 'Wholesale', 'Commercial'],
  vendorTypes: ['Consultant', 'Subcontractor', 'Supplier', 'Tax Agency', 'Utilities'],
  shipVia: ['FedEx', 'UPS', 'USPS', 'Delivery', 'Customer Pickup'],
  mileageEntries: [],
  currencies: [
    { id: 'curr1', name: 'US Dollar', code: 'USD', symbol: '$', isHome: true }
  ],
  exchangeRates: [],
  auditLogs: [],
  fixedAssets: [],
  companyConfig: {
    businessName: 'My New Company',
    industry: 'Other/General Business',
    businessType: 'Sole Proprietorship',
    fiscalYearStart: 'January',
    taxYearStart: 'January',
    whatDoYouSell: 'Both'
  },
  uoms: [],
  vehicles: []
};
