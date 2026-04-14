
import { AppStore } from './types';

// Production Initial Data: Bare essentials to start a new company.
export const INITIAL_DATA: AppStore = {
  accounts: [
    { id: '1', name: 'Checking', number: '1000', type: 'Bank', balance: 0, isActive: true },
    { id: '2', name: 'Accounts Receivable', number: '11000', type: 'Accounts Receivable', balance: 0, isActive: true },
    { id: '3', name: 'Accounts Payable', number: '20000', type: 'Accounts Payable', balance: 0, isActive: true },
    { id: '4', name: 'Retained Earnings', number: '3900', type: 'Equity', balance: 0, isActive: true },
  ],
  items: [
    { id: 'tax-1', name: 'Out of State', type: 'Sales Tax Item', isActive: true, taxRate: 0, description: 'Sales tax for out of state customers' },
    { id: 'tax-2', name: 'Sales Tax', type: 'Sales Tax Item', isActive: true, taxRate: 8.25, description: 'Standard sales tax' }
  ],
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
  shipVia: [
    { id: 'sv1', name: 'FedEx Ground', carrier: 'FedEx', serviceType: 'Ground', trackingUrl: 'https://www.fedex.com/fedextrack/', estimatedDays: 5, isActive: true },
    { id: 'sv2', name: 'UPS Ground', carrier: 'UPS', serviceType: 'Ground', trackingUrl: 'https://www.ups.com/track', estimatedDays: 5, isActive: true },
    { id: 'sv3', name: 'USPS Priority Mail', carrier: 'USPS', serviceType: 'Priority Mail', trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction', estimatedDays: 3, isActive: true },
    { id: 'sv4', name: 'Local Delivery', carrier: 'In-House', serviceType: 'Delivery', estimatedDays: 1, isActive: true },
    { id: 'sv5', name: 'Customer Pickup', carrier: 'N/A', serviceType: 'Pickup', estimatedDays: 0, isActive: true },
  ],
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
  uomSets: [],
  vehicles: [],
  vendorCreditCategories: [
    { id: 'cat-1', name: 'Defective Item', isActive: true },
    { id: 'cat-2', name: 'Shortage', isActive: true },
    { id: 'cat-3', name: 'Advertisement', isActive: true },
    { id: 'cat-4', name: 'Wrong Item Sent', isActive: true }
  ],
  customerCreditCategories: [
    { id: 'cust-cat-1', name: 'Defective Item', isActive: true },
    { id: 'cust-cat-2', name: 'Customer Mind Change', isActive: true },
    { id: 'cust-cat-3', name: 'Shortage', isActive: true },
    { id: 'cust-cat-4', name: 'Overcharged', isActive: true }
  ],
  recurringTemplates: []
};
