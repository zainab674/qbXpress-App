const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
    Line1: String, Line2: String, Line3: String, Line4: String,
    City: String, CountrySubDivisionCode: String, PostalCode: String, Country: String
}, { _id: false });

const NamedAddressSchema = new mongoose.Schema({
    id: { type: String, required: true },
    label: { type: String, default: 'Other' }, // e.g. Billing, Shipping, Home, Work, Other
    isDefault: { type: Boolean, default: false },
    Line1: String, Line2: String, Line3: String, Line4: String,
    City: String, CountrySubDivisionCode: String, PostalCode: String, Country: String
}, { _id: false });

const PhoneSchema  = new mongoose.Schema({ FreeFormNumber: String }, { _id: false });
const EmailSchema  = new mongoose.Schema({ Address: String, Cc: String, Bcc: String }, { _id: false });
const WebSchema    = new mongoose.Schema({ URI: String }, { _id: false });

const CustomerSchema = new mongoose.Schema({
    id:          { type: String, required: true, unique: true },
    userId:      { type: String, required: true },
    companyId:   { type: String, required: true },

    // ── Display / Name ────────────────────────────────────────────────────────
    name:        { type: String, required: true }, // display / full name
    DisplayName: String,
    Title:       String,
    GivenName:   String,
    MiddleName:  String,
    FamilyName:  String,
    Suffix:      String,
    companyName: String,

    // ── Legacy flat fields (kept for backwards-compat) ───────────────────────
    email:   String,
    phone:   String,
    address: String,

    // ── Structured contact fields (QB Enterprise / QBO) ──────────────────────
    PrimaryPhone:    PhoneSchema,
    AlternatePhone:  PhoneSchema,
    Mobile:          PhoneSchema,
    Fax:             PhoneSchema,
    OtherPhone:      PhoneSchema,

    PrimaryEmailAddr: EmailSchema,
    WebAddr:          WebSchema,

    BillAddr: AddressSchema,
    ShipAddr: AddressSchema,

    // Multiple addresses support
    addresses: [NamedAddressSchema],

    // ── Financial ─────────────────────────────────────────────────────────────
    balance:         { type: Number, default: 0 },
    OpenBalance:     { type: Number, default: 0 },
    OpenBalanceDate: String,
    creditLimit:     { type: Number, default: 0 },

    // ── Payment Settings ──────────────────────────────────────────────────────
    termsId:                 String,   // Reference to Term doc
    TermsRef:                Object,   // { value, name }
    preferredPaymentMethod:  String,   // Check / Cash / Credit Card / Bank Transfer
    PreferredPaymentMethodRef: Object, // { value, name }
    deliveryMethod:          { type: String, enum: ['None', 'Email', 'Print', ''], default: 'None' },
    language:                String,   // invoicing language

    // ── Tax ───────────────────────────────────────────────────────────────────
    taxItemId:              String,
    TaxRegistrationNumber:  String,

    // ── Sales / Pricing ───────────────────────────────────────────────────────
    priceLevelId:          String,
    substituteItemsAllowed: { type: Boolean, default: true },
    salesRepId:             String,
    customerType:           String,
    currencyId:             String,

    // ── Sub-customer / Job ────────────────────────────────────────────────────
    parentId:       String,
    jobs:           [Object],

    // ── Relations ─────────────────────────────────────────────────────────────
    contacts:           [Object],
    notes:              [Object],
    customFieldValues:  Object,
    attachments:        [Object],

    // ── Marketing consent ─────────────────────────────────────────────────────
    MarketingOptIn:       { type: Boolean, default: false },
    MarketingConsentEmail: String,

    // ── Status ────────────────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
}, { timestamps: true, strict: false });

// ── Indexes ───────────────────────────────────────────────────────────────────
CustomerSchema.index({ companyId: 1, userId: 1, isActive: 1 });
CustomerSchema.index({ companyId: 1, userId: 1, name: 1 });
CustomerSchema.index({ companyId: 1, userId: 1, priceLevelId: 1 }, { sparse: true });
CustomerSchema.index({ companyId: 1, userId: 1, parentId: 1 }, { sparse: true });
CustomerSchema.index({ companyId: 1, userId: 1, salesRepId: 1 }, { sparse: true });

module.exports = mongoose.model('Customer', CustomerSchema);
