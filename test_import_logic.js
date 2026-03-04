
const crypto = require('crypto');

// Mock Services
const CustomerService = {
    getAll: async () => [
        { id: 'cust-1', name: 'John Doe', email: 'john@example.com' },
        { id: 'cust-2', name: 'ACME Corp', companyName: 'ACME Corp' }
    ]
};

const VendorService = {
    getAll: async () => [
        { id: 'vend-1', name: 'Supplier A', vendorAccountNo: 'ACC123' },
        { id: 'vend-2', name: 'Global Utility', email: 'bill@global.com' }
    ]
};

const EmployeeService = {
    getAll: async () => [
        { id: 'emp-1', name: 'Alice Smith', ssn: '111-222-3333' },
        { id: 'emp-2', name: 'Bob Jones', firstName: 'Bob', lastName: 'Jones' }
    ]
};

// Simplified matching logic from controller for testing
async function testMatching(row) {
    const customers = await CustomerService.getAll();
    const vendors = await VendorService.getAll();
    const employees = await EmployeeService.getAll();

    let type = (row.type || row.Type || '').toUpperCase().replace(' ', '_');
    if (type === 'PAYMENT') type = 'PAYMENT';
    if (type === 'RECEIPT') type = 'SALES_RECEIPT';
    if (type === 'PO') type = 'PURCHASE_ORDER';
    if (type === 'SO') type = 'SALES_ORDER';

    const entityName = row.entity || row.Entity || row['Customer/Vendor'] || row['Customer'] || row['Vendor'] || row['Employee'] || row['Name'];
    const entityEmail = row.email || row.Email;
    const entityUid = row.id || row.ID || row['Entity ID'];
    const accountNo = row.accountNo || row['Account #'] || row['Vendor Account #'];
    const ssn = row.ssn || row.SSN;

    let entityId = null;
    let customerId = null;
    let vendorId = null;
    let employeeId = null;

    if (['INVOICE', 'SALES_ORDER', 'SALES_RECEIPT', 'CREDIT_MEMO', 'ESTIMATE', 'PAYMENT'].includes(type)) {
        const match = customers.find(c =>
            (entityUid && c.id === entityUid) ||
            (entityName && (c.name?.toLowerCase() === entityName.toLowerCase() || (c.companyName && c.companyName.toLowerCase() === entityName.toLowerCase()))) ||
            (entityEmail && c.email?.toLowerCase() === entityEmail.toLowerCase())
        );
        if (match) {
            entityId = match.id;
            customerId = match.id;
        }
    } else if (['BILL', 'PURCHASE_ORDER', 'VENDOR_CREDIT', 'CHECK'].includes(type)) {
        const match = vendors.find(v =>
            (entityUid && v.id === entityUid) ||
            (accountNo && v.vendorAccountNo === accountNo) ||
            (entityName && (v.name?.toLowerCase() === entityName.toLowerCase() || (v.companyName && v.companyName.toLowerCase() === entityName.toLowerCase()))) ||
            (entityEmail && v.email?.toLowerCase() === entityEmail.toLowerCase())
        );
        if (match) {
            entityId = match.id;
            vendorId = match.id;
        }
    } else if (['PAYCHECK'].includes(type)) {
        const match = employees.find(e =>
            (entityUid && e.id === entityUid) ||
            (ssn && e.ssn === ssn) ||
            (entityName && (e.name?.toLowerCase() === entityName.toLowerCase() || e.firstName?.toLowerCase() === entityName.toLowerCase() || e.lastName?.toLowerCase() === entityName.toLowerCase())) ||
            (entityEmail && e.email?.toLowerCase() === entityEmail.toLowerCase())
        );
        if (match) {
            entityId = match.id;
            employeeId = match.id;
        }
    }

    return { type, entityId, customerId, vendorId, employeeId };
}

async function runTests() {
    const testCases = [
        {
            name: "Match Customer by Name (Invoice)",
            row: { type: 'Invoice', entity: 'John Doe', total: 100 },
            expected: { type: 'INVOICE', entityId: 'cust-1', customerId: 'cust-1' }
        },
        {
            name: "Match Vendor by Account # (Bill)",
            row: { type: 'Bill', 'Account #': 'ACC123', total: 50 },
            expected: { type: 'BILL', entityId: 'vend-1', vendorId: 'vend-1' }
        },
        {
            name: "Match Employee by SSN (Paycheck)",
            row: { type: 'Paycheck', SSN: '111-222-3333', total: 2000 },
            expected: { type: 'PAYCHECK', entityId: 'emp-1', employeeId: 'emp-1' }
        },
        {
            name: "Match Customer by Internal ID",
            row: { type: 'Sales Receipt', ID: 'cust-2', total: 75 },
            expected: { type: 'SALES_RECEIPT', entityId: 'cust-2', customerId: 'cust-2' }
        },
        {
            name: "Alias mapping (PO)",
            row: { type: 'PO', entity: 'Supplier A' },
            expected: { type: 'PURCHASE_ORDER', entityId: 'vend-1', vendorId: 'vend-1' }
        }
    ];

    let passed = 0;
    for (const tc of testCases) {
        const result = await testMatching(tc.row);
        const isMatch = result.type === tc.expected.type &&
            result.entityId === tc.expected.entityId &&
            result.customerId === tc.expected.customerId &&
            result.vendorId === tc.expected.vendorId &&
            result.employeeId === tc.expected.employeeId;

        if (isMatch) {
            console.log(`✅ [PASS] ${tc.name}`);
            passed++;
        } else {
            console.log(`❌ [FAIL] ${tc.name}`);
            console.log(`   Expected:`, tc.expected);
            console.log(`   Got:     `, result);
        }
    }

    console.log(`\nTests finished: ${passed}/${testCases.length} passed.`);
    process.exit(passed === testCases.length ? 0 : 1);
}

runTests();
