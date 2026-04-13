const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const CustomerService = require('../services/CustomerService');
const VendorService = require('../services/VendorService');
const EmployeeService = require('../services/EmployeeService');
const ItemService = require('../services/ItemService');
const AccountService = require('../services/AccountService');
const transactionService = require('../services/transactionService');
const crypto = require('crypto');

const HEADER_KEYWORDS = ['NAME', 'CUSTOMER', 'VENDOR', 'EMPLOYEE', 'TYPE', 'DATE', 'EMAIL', 'PHONE', 'FULL NAME', 'BILLING ADDRESS'];

async function parseFile(req) {
    if (!req.file) {
        throw new Error('No file uploaded');
    }

    const buffer = req.file.buffer;
    const originalName = req.file.originalname;
    let data = [];

    if (originalName.endsWith('.csv')) {
        const content = buffer.toString();
        const rawLines = content.split(/\r?\n/).filter(line => line.trim());

        let headerRowIndex = 0;
        let maxKeywordMatches = 0;

        for (let i = 0; i < Math.min(rawLines.length, 20); i++) {
            const cells = rawLines[i].toUpperCase().split(',');
            const matchCount = cells.filter(cell =>
                HEADER_KEYWORDS.some(kw => cell.includes(kw))
            ).length;

            if (matchCount > maxKeywordMatches) {
                maxKeywordMatches = matchCount;
                headerRowIndex = i;
            }
        }

        const csvContent = rawLines.slice(headerRowIndex).join('\n');
        data = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
    } else if (originalName.endsWith('.xlsx') || originalName.endsWith('.xls')) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        let headerRowIndex = 0;
        let maxKeywordMatches = 0;

        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
            const row = rawData[i];
            if (!Array.isArray(row)) continue;

            const matchCount = row.filter(cell =>
                typeof cell === 'string' &&
                HEADER_KEYWORDS.some(kw => cell.toUpperCase().includes(kw))
            ).length;

            if (matchCount > maxKeywordMatches) {
                maxKeywordMatches = matchCount;
                headerRowIndex = i;
            }
        }

        data = XLSX.utils.sheet_to_json(worksheet, {
            range: headerRowIndex,
            defval: ""
        });
    } else {
        throw new Error('Unsupported file format. Please upload CSV or Excel.');
    }

    // Filter out rows that are completely empty or look like "Total" rows
    data = data.filter(row => {
        const values = Object.values(row).map(v => String(v).toLowerCase());
        const hasValues = values.some(v => v.trim() !== "");
        const isTotalRow = values.some(v => v.includes('total') && (v === 'total' || v.includes('balance')));
        return hasValues && !isTotalRow;
    });

    if (data.length === 0) {
        throw new Error('No valid data rows found in the uploaded file.');
    }

    return data;
}

const importController = {
    importItems: async (req, res, next) => {
        try {
            const data = await parseFile(req);
            const itemsToSave = data.map(row => {
                let rawType = (row.type || row.Type || '').trim();
                let type = 'Service'; // Default

                if (rawType.toLowerCase().includes('inventory') && !rawType.toLowerCase().includes('non')) {
                    type = 'Inventory Part';
                } else if (rawType.toLowerCase().includes('non-inventory') || rawType.toLowerCase().includes('non inventory')) {
                    type = 'Non-inventory Part';
                } else if (rawType.toLowerCase().includes('service')) {
                    type = 'Service';
                } else if (rawType.toLowerCase().includes('assembly')) {
                    type = 'Inventory Assembly';
                } else if (rawType.toLowerCase().includes('discount')) {
                    type = 'Discount';
                }

                const item = {
                    id: crypto.randomUUID(),
                    userId: req.user.id,
                    companyId: req.companyId,
                    name: row.name || row.Name || row['Product/Service Name'] || row['Product/Service'] || row['Item Name'] || '',
                    sku: row.sku || row.SKU || '',
                    type: type,
                    description: row.description || row.Description || row['Sales Description'] || row['Sales Descr'] || '',
                    purchaseDescription: row.purchaseDescription || row['Purchase Description'] || row['Purchase Descr'] || '',
                    salesPrice: parseFloat(row.salesPrice || row.SalesPrice || row['Sales Price'] || row['Sales Price / Rate'] || row.Price || 0) || 0,
                    cost: parseFloat(row.cost || row.Cost || row.purchaseCost || row.PurchaseCost || row['Purchase Cost'] || 0) || 0,
                    taxable: (() => {
                        const val = row.taxable || row.Taxable || row['Taxable?'] || '';
                        if (typeof val === 'string') {
                            const s = val.toLowerCase().trim();
                            return s === 'yes' || s === 'true' || s === 'y' || s === '1';
                        }
                        return !!val;
                    })(),
                    incomeAccountId: row.incomeAccount || row['Income Account'] || row['Income account'] || '',
                    cogsAccountId: row.expenseAccount || row['Expense Account'] || row['Expense account'] || '',
                    onHand: parseFloat(row.quantity || row.Quantity || row['Quantity On Hand'] || row['Qty'] || 0) || 0,
                    reorderPoint: parseFloat(row.reorderPoint || row.ReorderPoint || row['Reorder Point'] || 0) || 0,
                    assetAccountId: row.inventoryAssetAccount || row['Inventory Asset Account'] || row['Inventory Asset'] || '',
                    isActive: true,
                    isSalesItem: true,
                    isPurchaseItem: type.includes('Inventory') || type.includes('Part') || type.includes('Service')
                };
                return item;
            }).filter(i => i.name);

            if (itemsToSave.length === 0) {
                return res.status(400).json({ message: 'No valid item records found in the file. Ensure you have a "Product/Service" or "Name" column.' });
            }

            await ItemService.bulkUpdate(itemsToSave, req.user.id, req.companyId, req.user.role);

            // Update Account Balances for the imported inventory
            const accounts = await AccountService.getAll(req.user.id, req.companyId);
            const inventoryAssetAccount = accounts.find(a => a.type === 'Inventory Asset');

            for (const item of itemsToSave) {
                if (item.type === 'Inventory Part' || item.type === 'Inventory Assembly') {
                    const totalValue = (item.onHand || 0) * (item.cost || 0);
                    if (totalValue !== 0) {
                        const targetAccountId = item.assetAccountId || (inventoryAssetAccount ? inventoryAssetAccount.id : null);
                        if (targetAccountId) {
                            await Account.findOneAndUpdate(
                                { id: targetAccountId, userId: req.user.id, companyId: req.companyId },
                                { $inc: { balance: totalValue } }
                            );
                        }
                    }
                }
            }

            res.json({
                message: `Successfully imported ${itemsToSave.length} items.`,
                count: itemsToSave.length
            });

        } catch (err) {
            console.error('Item Import error:', err);
            res.status(400).json({ message: err.message });
        }
    },

    importCustomers: async (req, res, next) => {
        try {
            const data = await parseFile(req);

            const seenNames = new Set();
            const customersToSave = data.map(row => {
                // Normalize Name - Handle "Full Name" and Job hierarchy (:)
                let rawName = row.name || row.Name || row['Full Name'] || row['Customer Name'] || row['Customer'] || '';
                if (rawName.includes(':')) {
                    rawName = rawName.split(':')[0].trim();
                }

                const customer = {
                    id: crypto.randomUUID(),
                    userId: req.user.id,
                    companyId: req.companyId,
                    name: rawName,
                    companyName: row.companyName || row['Company Name'] || row['Company name'] || row.Company || '',
                    email: row.email || row.Email || row['Email Address'] || '',
                    phone: (row['Phone Numbers'] || row.phone || row.Phone || '')
                        .split(/\n|Fax:|Mobile:/i)[0]
                        .replace(/^Phone:\s*/i, '')
                        .trim(),
                    address: [
                        row.address || row.Address || row['Street Address'] || row['Billing Address'],
                        row['Billing Address 2'],
                        row.city || row.City,
                        row.state || row.State,
                        row.zip || row.Zip || row['Zip Code'] || row.PostalCode,
                        row.country || row.Country
                    ].filter(Boolean).join(', ').trim(),
                    customerType: row['Customer type'] || row.customerType || '',
                    balance: (() => {
                        const val = row.balance || row.Balance || row['Open Balance'] || row['Open balance'] || row.openBalance || row.openbalance || 0;
                        if (typeof val === 'number') return val;
                        const cleaned = String(val).replace(/[$,]/g, '');
                        return parseFloat(cleaned) || 0;
                    })(),
                    OpenBalance: (() => {
                        const val = row['Open Balance'] || row['Open balance'] || row.openBalance || row.openbalance || 0;
                        if (typeof val === 'number') return val;
                        const cleaned = String(val).replace(/[$,]/g, '');
                        return parseFloat(cleaned) || 0;
                    })(),
                    isActive: true
                };

                return customer;
            }).filter(c => {
                if (!c.name || seenNames.has(c.name.toLowerCase())) return false;
                seenNames.add(c.name.toLowerCase());
                return true;
            });

            if (customersToSave.length === 0) {
                return res.status(400).json({ message: 'No valid customer records found in the file.' });
            }

            await CustomerService.bulkUpdate(customersToSave, req.user.id, req.companyId, req.user.role);

            res.json({
                message: `Successfully imported ${customersToSave.length} customers.`,
                count: customersToSave.length
            });

        } catch (err) {
            console.error('Customer Import error:', err);
            res.status(400).json({ message: err.message });
        }
    },

    importVendors: async (req, res, next) => {
        try {
            const data = await parseFile(req);
            const Vendor = require('../models/Vendor');

            // Fetch existing vendor names in DB for duplicate detection
            const existingVendors = await Vendor.find(
                { userId: req.user.id, companyId: req.companyId },
                { name: 1 }
            ).lean();
            const existingNames = new Set(existingVendors.map(v => v.name.toLowerCase()));

            const parseMoney = (val) => {
                if (!val && val !== 0) return 0;
                if (typeof val === 'number') return val;
                return parseFloat(String(val).replace(/[$,]/g, '')) || 0;
            };

            const parseBool = (val) => {
                if (typeof val === 'boolean') return val;
                if (typeof val === 'number') return val > 0;
                if (typeof val === 'string') {
                    const s = val.toLowerCase().trim();
                    return s === 'true' || s === '1' || s === 'yes' || s === 'y';
                }
                return false;
            };

            const seenNames = new Set();
            const skipped = [];
            const vendorsToSave = data.map(row => {
                let rawName = row.Vendor || row.vendor || row.name || row.Name || row['Vendor Name'] || '';
                if (rawName.includes(':')) rawName = rawName.split(':')[0].trim();
                return { rawName, row };
            }).filter(({ rawName, row }) => {
                if (!rawName) return false;
                const key = rawName.toLowerCase();
                if (seenNames.has(key)) return false; // duplicate in file
                seenNames.add(key);
                if (existingNames.has(key)) {
                    skipped.push(rawName);
                    return false; // already in DB — skip to avoid duplicates
                }
                return true;
            }).map(({ rawName, row }) => {
                const termsRaw = row['Payment Terms'] || row['Terms'] || row.terms || row['Net Terms'] || '';
                const paymentMethodRaw = row['Payment Method'] || row['Preferred Payment Method'] || row.paymentMethod || '';
                const creditLimitRaw = row['Credit Limit'] || row['Credit limit'] || row.creditLimit || 0;

                return {
                    id: crypto.randomUUID(),
                    userId: req.user.id,
                    companyId: req.companyId,
                    name: rawName,
                    companyName: row.companyName || row['Company Name'] || row['Company name'] || row['Company'] || '',
                    email: row.email || row.Email || row['Email Address'] || '',
                    phone: (row['Phone Numbers'] || row.phone || row.Phone || '')
                        .split(/\n|Fax:|Mobile:/i)[0]
                        .replace(/^Phone:\s*/i, '')
                        .trim(),
                    address: [
                        row.address || row.Address || row['Street Address'] || row['Billing Address'],
                        row['Billing Address 2'],
                        row.city || row.City,
                        row.state || row.State,
                        row.zip || row.Zip || row['Zip Code'] || row.PostalCode,
                        row.country || row.Country
                    ].filter(Boolean).join(', ').trim(),
                    vendorType: row['Vendor type'] || row.vendorType || '',
                    balance: parseMoney(row.balance || row.Balance || row['Open Balance'] || row['Open balance'] || row.openBalance || 0),
                    OpenBalance: parseMoney(row['Open Balance'] || row['Open balance'] || row.openBalance || 0),
                    openingBalance: parseMoney(row['Opening Balance'] || row['Open Balance'] || row.openBalance || 0),
                    openingBalanceDate: row['As of Date'] || row['Opening Balance Date'] || row['Open Balance Date'] || '',
                    eligibleFor1099: parseBool(row['1099 Tracking'] || row['1099 tracking'] || row.eligibleFor1099),
                    Vendor1099: parseBool(row['1099 Tracking'] || row['1099 tracking'] || row.eligibleFor1099),
                    TaxIdentifier: row['Tax ID'] || row['Tax Identifier'] || row.taxId || row.TaxIdentifier || '',
                    CreditLimit: parseMoney(creditLimitRaw),
                    TermsRef: termsRaw ? { value: termsRaw, name: termsRaw } : undefined,
                    PreferredPaymentMethodRef: paymentMethodRaw ? { value: paymentMethodRaw, name: paymentMethodRaw } : undefined,
                    vendorAccountNo: row['Account No'] || row['Account Number'] || row['Vendor Account No'] || row.vendorAccountNo || '',
                    isActive: true
                };
            });

            if (vendorsToSave.length === 0 && skipped.length === 0) {
                return res.status(400).json({ message: 'No valid vendor records found in the file. Ensure you have a "Name" column.' });
            }

            if (vendorsToSave.length > 0) {
                await VendorService.bulkUpdate(vendorsToSave, req.user.id, req.companyId, req.user.role);
            }

            res.json({
                message: `Successfully imported ${vendorsToSave.length} vendor${vendorsToSave.length !== 1 ? 's' : ''}.${skipped.length > 0 ? ` Skipped ${skipped.length} duplicate${skipped.length !== 1 ? 's' : ''}: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '...' : ''}.` : ''}`,
                count: vendorsToSave.length,
                skipped: skipped.length,
                skippedNames: skipped
            });

        } catch (err) {
            console.error('Vendor Import error:', err);
            res.status(400).json({ message: err.message });
        }
    },

    importEmployees: async (req, res, next) => {
        try {
            const data = await parseFile(req);

            const seenNames = new Set();
            const employeesToSave = data.map(row => {
                let rawName = row.name || row.Name || row['Employee Name'] || row['Employee'] || row['Full Name'] || '';
                if (rawName.includes(':')) {
                    rawName = rawName.split(':')[0].trim();
                }

                const employee = {
                    id: crypto.randomUUID(),
                    userId: req.user.id,
                    companyId: req.companyId,
                    name: rawName,
                    firstName: row.firstName || row['First Name'] || '',
                    lastName: row.lastName || row['Last Name'] || '',
                    email: row.email || row.Email || '',
                    phone: (row['Phone Numbers'] || row.phone || row.Phone || '')
                        .split(/\n|Fax:|Mobile:/i)[0]
                        .replace(/^Phone:\s*/i, '')
                        .trim(),
                    address: [row.address || row.Address || row['Street Address'] || row['Billing Address'], row['Billing Address 2']]
                        .filter(Boolean).join(', ').trim(),
                    hiredDate: row.hiredDate || row['Hired Date'] || new Date().toISOString().split('T')[0],
                    hourlyRate: parseFloat(row.hourlyRate || row['Hourly Rate'] || 0) || 0,
                    isActive: true
                };

                if (!employee.name && (employee.firstName || employee.lastName)) {
                    employee.name = `${employee.firstName} ${employee.lastName}`.trim();
                }

                return employee;
            }).filter(e => {
                if (!e.name || seenNames.has(e.name.toLowerCase())) return false;
                seenNames.add(e.name.toLowerCase());
                return true;
            });

            if (employeesToSave.length === 0) {
                return res.status(400).json({ message: 'No valid employee records found in the file.' });
            }

            await EmployeeService.bulkUpdate(employeesToSave, req.user.id, req.companyId, req.user.role);

            res.json({
                message: `Successfully imported ${employeesToSave.length} employees.`,
                count: employeesToSave.length
            });

        } catch (err) {
            console.error('Employee Import error:', err);
            res.status(400).json({ message: err.message });
        }
    },

    importTransactions: async (req, res, next) => {
        try {
            const data = await parseFile(req);
            const userId = req.user.id;
            const companyId = req.companyId;
            const userRole = req.user?.role || 'Admin';

            const [customers, vendors, employees, items, accounts] = await Promise.all([
                CustomerService.getAll(userId, companyId),
                VendorService.getAll(userId, companyId),
                EmployeeService.getAll(userId, companyId),
                ItemService.getAll(userId, companyId),
                AccountService.getAll(userId, companyId)
            ]);

            const transactionsToSave = [];
            const errors = [];

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                let rawType = (row.type || row.Type || row['Transaction type'] || row['Transaction Type'] || '').trim();
                let type = rawType.toUpperCase().replace(/\s+/g, '_');

                // Mapping common aliases and handling complex names
                if (type.includes('BILL_PAYMENT')) type = 'BILL_PAYMENT';
                else if (type.includes('PAYMENT') && !type.includes('TAX')) type = 'PAYMENT';
                else if (type.includes('RECEIPT')) type = 'SALES_RECEIPT';
                else if (type.includes('PURCHASE_ORDER') || type === 'PO') type = 'PURCHASE_ORDER';
                else if (type.includes('SALES_ORDER') || type === 'SO') type = 'SALES_ORDER';
                else if (type.includes('INVOICE')) type = 'INVOICE';
                else if (type.includes('BILL')) type = 'BILL';
                else if (type.includes('CHECK') || type === 'CHARGE' || type === 'REFUND') type = 'CHECK';
                else if (type.includes('EXPENSE')) type = 'CHECK';
                else if (type.includes('DEPOSIT')) type = 'DEPOSIT';
                else if (type.includes('CREDIT_MEMO')) type = 'CREDIT_MEMO';
                else if (type.includes('VENDOR_CREDIT') || type === 'CREDIT_CARD_CREDIT') type = 'VENDOR_CREDIT';
                else if (type.includes('PAYCHECK')) type = 'PAYCHECK';
                else if (type.includes('ESTIMATE')) type = 'ESTIMATE';
                else if (type.includes('TAX_PAYMENT')) type = 'TAX_PAYMENT';
                else if (type.includes('JOURNAL_ENTRY')) type = 'JOURNAL_ENTRY';
                else if (type.includes('INVENTORY_QTY_ADJUST')) type = 'INVENTORY_ADJ';
                else if (type.includes('TIME_CHARGE')) type = 'TIME_CHARGE';

                const validTypes = ['INVOICE', 'BILL', 'PURCHASE_ORDER', 'SALES_ORDER', 'SALES_RECEIPT', 'CHECK', 'DEPOSIT', 'CREDIT_MEMO', 'VENDOR_CREDIT', 'PAYCHECK', 'PAYMENT', 'ESTIMATE', 'BILL_PAYMENT', 'TAX_PAYMENT', 'JOURNAL_ENTRY', 'INVENTORY_ADJ', 'TIME_CHARGE'];
                if (!validTypes.includes(type)) {
                    errors.push(`Row ${i + 2}: Invalid or missing transaction type: "${rawType}"`);
                    continue;
                }

                let entityName = row.name || row.Name || row.entity || row.Entity || row['Customer/Vendor'] || row['Customer'] || row['Vendor'] || row['Employee'];
                const entityEmail = row.email || row.Email;
                const entityUid = row.id || row.ID || row['Entity ID'];
                const accountNo = row.accountNo || row['Account #'] || row['Vendor Account #'];
                const ssn = row.ssn || row.SSN;

                let entityId = null;
                let customerId = null;
                let vendorId = null;
                let employeeId = null;

                const normalize = (s) => String(s || '').toLowerCase().trim();

                const normalizeDate = (d) => {
                    if (!d) return new Date().toISOString().split('T')[0];
                    const date = new Date(d);
                    if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
                    return date.toISOString().split('T')[0];
                };

                // If entityName contains a colon, we try to match the base part too
                let baseEntityName = entityName;
                if (typeof entityName === 'string' && entityName.includes(':')) {
                    baseEntityName = entityName.split(':')[0].trim();
                }

                if (i < 5) {
                    console.log(`[Import Debug] Row ${i + 2}: Type=${type}, EntityName="${entityName}", Base="${baseEntityName}"`);
                    if (['INVOICE', 'SALES_ORDER', 'SALES_RECEIPT', 'CREDIT_MEMO', 'ESTIMATE', 'PAYMENT', 'TIME_CHARGE'].includes(type)) {
                        console.log(`[Import Debug] Checking Customers (${customers.length} total). First 3:`, customers.slice(0, 3).map(c => c.name));
                    } else if (['BILL', 'PURCHASE_ORDER', 'VENDOR_CREDIT', 'CHECK', 'BILL_PAYMENT', 'TAX_PAYMENT'].includes(type)) {
                        console.log(`[Import Debug] Checking Vendors (${vendors.length} total). First 3:`, vendors.slice(0, 3).map(v => v.name));
                    }
                }

                if (['INVOICE', 'SALES_ORDER', 'SALES_RECEIPT', 'CREDIT_MEMO', 'ESTIMATE', 'PAYMENT', 'TIME_CHARGE'].includes(type) && !entityId) {
                    const match = customers.find(c =>
                        (entityUid && c.id === entityUid) ||
                        (entityName && (
                            normalize(c.name) === normalize(entityName) ||
                            normalize(c.name) === normalize(baseEntityName) ||
                            (c.companyName && normalize(c.companyName) === normalize(entityName)) ||
                            (c.companyName && normalize(c.companyName) === normalize(baseEntityName))
                        )) ||
                        (entityEmail && normalize(c.email) === normalize(entityEmail))
                    );
                    if (match) {
                        entityId = match.id;
                        customerId = match.id;
                        if (i < 5) console.log(`[Import Debug] Matched Customer: ${match.name}`);
                    }
                }

                if (['BILL', 'PURCHASE_ORDER', 'VENDOR_CREDIT', 'CHECK', 'BILL_PAYMENT', 'TAX_PAYMENT'].includes(type) && !entityId) {
                    const match = vendors.find(v =>
                        (entityUid && v.id === entityUid) ||
                        (accountNo && v.vendorAccountNo === accountNo) ||
                        (entityName && (
                            normalize(v.name) === normalize(entityName) ||
                            normalize(v.name) === normalize(baseEntityName) ||
                            (v.companyName && normalize(v.companyName) === normalize(entityName)) ||
                            (v.companyName && normalize(v.companyName) === normalize(baseEntityName))
                        )) ||
                        (entityEmail && normalize(v.email) === normalize(entityEmail))
                    );
                    if (match) {
                        entityId = match.id;
                        vendorId = match.id;
                        if (i < 5) console.log(`[Import Debug] Matched Vendor: ${match.name}`);
                    }
                }

                if (['PAYCHECK', 'TIME_CHARGE'].includes(type) && !entityId) {
                    const match = employees.find(e =>
                        (entityUid && e.id === entityUid) ||
                        (ssn && e.ssn === ssn) ||
                        (entityName && (
                            normalize(e.name) === normalize(entityName) ||
                            normalize(e.name) === normalize(baseEntityName) ||
                            normalize(e.firstName) === normalize(entityName) ||
                            normalize(e.lastName) === normalize(entityName)
                        )) ||
                        (entityEmail && normalize(e.email) === normalize(entityEmail))
                    );
                    if (match) {
                        entityId = match.id;
                        employeeId = match.id;
                    }
                }

                if (!entityId && entityName && type !== 'JOURNAL_ENTRY' && type !== 'INVENTORY_ADJ' && type !== 'DEPOSIT') {
                    errors.push(`Row ${i + 2}: Entity "${entityName}" not found. skipping.`);
                    continue;
                }

                const tx = {
                    id: crypto.randomUUID(),
                    userId,
                    companyId,
                    type,
                    refNo: String(row.num || row.Num || row.refNo || row.RefNo || row['Ref #'] || row['Number'] || '').trim(),
                    date: normalizeDate(row.date || row.Date),
                    dueDate: normalizeDate(row.dueDate || row.DueDate || row['Due date'] || row['Due Date']),
                    entityId,
                    customerId,
                    vendorId,
                    employeeId,
                    total: (() => {
                        const val = row.amount || row.Amount || row.total || row.Total || 0;
                        if (typeof val === 'number') return val;
                        // Handle cases like (100.00) for negative numbers
                        let cleaned = String(val).replace(/[$,]/g, '').trim();
                        if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
                            cleaned = '-' + cleaned.slice(1, -1);
                        }
                        return parseFloat(cleaned) || 0;
                    })(),
                    status: (row.status || row.Status || 'OPEN').toUpperCase(),
                    memo: row.memo || row.Memo || row['Memo/Description'] || '',
                    items: []
                };

                if (tx.total !== 0) {
                    const description = row.description || row.Description || row['Memo/Description'] || row['Product/Service'] || 'Imported Transaction';

                    // Try to find a matching account or item
                    let itemAccountId = null;
                    const rowAccountName = row.account || row.Account || row.category || row.Category || row['Income Account'];

                    if (rowAccountName) {
                        const accMatch = accounts.find(a => normalize(a.name) === normalize(rowAccountName));
                        if (accMatch) itemAccountId = accMatch.id;
                    }

                    if (!itemAccountId) {
                        // Try matching by description/product service against Items
                        const itemMatch = items.find(itm => normalize(itm.name) === normalize(description));
                        if (itemMatch) {
                            itemAccountId = ['INVOICE', 'SALES_RECEIPT'].includes(type) ? itemMatch.incomeAccountId : itemMatch.cogsAccountId;
                        }
                    }

                    if (!itemAccountId) {
                        // Fallback: use default accounts based on type
                        if (['INVOICE', 'SALES_RECEIPT'].includes(type)) {
                            itemAccountId = accounts.find(a => a.type === 'Income')?.id;
                        } else if (['BILL', 'CHECK'].includes(type)) {
                            itemAccountId = accounts.find(a => a.type === 'Expense')?.id;
                        }
                    }

                    tx.items.push({
                        id: crypto.randomUUID(),
                        description,
                        quantity: 1,
                        rate: Math.abs(tx.total),
                        amount: tx.total,
                        accountId: itemAccountId
                    });
                }

                transactionsToSave.push(tx);
            }

            if (transactionsToSave.length === 0) {
                return res.status(400).json({
                    message: 'No valid transactions found to import.',
                    errors
                });
            }

            console.log(`[Import] Processing ${transactionsToSave.length} transactions in batches...`);
            // Process in smaller batches to avoid MongoDB transaction timeouts/size limits
            const BATCH_SIZE = 20;
            let successCount = 0;
            for (let i = 0; i < transactionsToSave.length; i += BATCH_SIZE) {
                const batch = transactionsToSave.slice(i, i + BATCH_SIZE);
                try {
                    await transactionService.saveTransaction(batch, userRole, userId, companyId);
                    successCount += batch.length;
                    console.log(`[Import] Batch ${Math.floor(i / BATCH_SIZE) + 1} successful (${successCount}/${transactionsToSave.length})`);
                } catch (batchErr) {
                    console.error(`[Import] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, batchErr.message);
                    errors.push(`Batch starting Row ${i + 2} failed: ${batchErr.message}`);
                    // If one batch fails, we could continue or stop. Choosing to continue for now.
                }
            }

            res.json({
                message: `Successfully imported ${successCount} transactions.`,
                count: successCount,
                errors: errors.length > 0 ? errors : undefined
            });

        } catch (err) {
            console.error('Transaction Import error:', err);
            res.status(400).json({ message: err.message });
        }
    }
};

module.exports = importController;
