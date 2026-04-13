const mongoose = require('mongoose');

const NamedAddressSchema = new mongoose.Schema({
    id: { type: String, required: true },
    label: { type: String, default: 'Other' }, // e.g. Billing, Shipping, Home, Work, Other
    isDefault: { type: Boolean, default: false },
    Line1: String, Line2: String, Line3: String, Line4: String,
    City: String, CountrySubDivisionCode: String, PostalCode: String, Country: String
}, { _id: false });

const VendorSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    name: { type: String, required: true },
    companyName: String,
    phone: String,
    email: String,
    balance: { type: Number, default: 0 },
    address: String,
    isActive: { type: Boolean, default: true },
    currencyId: String,
    contacts: [Object],
    preFillAccounts: [String],
    customFieldValues: Object,
    notes: [Object],
    eligibleFor1099: Boolean,
    vendorType: String,
    vendorAccountNo: String,
    // Financial settings
    TaxIdentifier: String,
    CreditLimit: { type: Number, default: 0 },
    TermsRef: { value: String, name: String },
    PreferredPaymentMethodRef: { value: String, name: String },
    CurrencyRef: { value: String, name: String },
    openingBalance: { type: Number, default: 0 },
    openingBalanceDate: String,
    billingRate: { type: Number, default: 0 },
    // Address
    BillAddr: {
        Line1: String, Line2: String,
        City: String, CountrySubDivisionCode: String,
        PostalCode: String, Country: String
    },
    ShipAddr: {
        Line1: String, Line2: String,
        City: String, CountrySubDivisionCode: String,
        PostalCode: String, Country: String
    },

    // Multiple addresses support
    addresses: [NamedAddressSchema],
    // Name fields
    GivenName: String,
    MiddleName: String,
    FamilyName: String,
    PrintOnCheckName: String,
    // Contact
    PrimaryPhone: { FreeFormNumber: String },
    Mobile: { FreeFormNumber: String },
    Fax: { FreeFormNumber: String },
    WebAddr: { URI: String },
    PrimaryEmailAddr: { Address: String, Cc: String, Bcc: String },
    // QB compat
    Vendor1099: Boolean,
}, { timestamps: true, strict: false });

// ── Indexes ──────────────────────────────────────────────────────────────────
VendorSchema.index({ companyId: 1, userId: 1, isActive: 1 });
VendorSchema.index({ companyId: 1, userId: 1, name: 1 });

module.exports = mongoose.model('Vendor', VendorSchema);

