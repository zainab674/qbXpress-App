const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Vendor = require('../models/Vendor');
const reportService = require('../services/reportService');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const userId = 'verify-user-789';
const companyId = 'verify-company-789';

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clean up
        await Item.deleteMany({ userId, companyId });
        await Transaction.deleteMany({ userId, companyId });
        await Account.deleteMany({ userId, companyId });
        await Vendor.deleteMany({ userId, companyId });

        // 1. Create Inventory Item
        const item1 = new Item({
            id: 'item-inv-1',
            userId,
            companyId,
            name: 'Widget A',
            type: 'Inventory Part',
            onHand: 10,
            cost: 50
        });
        await item1.save();

        const vendor1 = new Vendor({
            id: 'vend-po-1',
            userId,
            companyId,
            name: 'Supplies Co'
        });
        await vendor1.save();

        // 2. Create transactions for Valuation Detail
        const txs = [
            {
                id: 'tx-inv-1',
                userId,
                companyId,
                type: 'BILL',
                date: '2026-03-01',
                total: 500,
                items: [{ itemId: 'item-inv-1', quantity: 10, rate: 50, amount: 500 }]
            },
            {
                id: 'tx-inv-2',
                userId,
                companyId,
                type: 'INVOICE',
                date: '2026-03-02',
                total: 200,
                items: [{ itemId: 'item-inv-1', quantity: 2, rate: 100, amount: 200 }]
            },
            {
                id: 'tx-po-1',
                userId,
                companyId,
                type: 'PURCHASE_ORDER',
                status: 'OPEN',
                date: '2026-03-03',
                total: 1000,
                entityId: 'vend-po-1',
                items: [{ itemId: 'item-inv-1', quantity: 20, rate: 50, amount: 1000 }]
            }
        ];

        for (const tx of txs) {
            await new Transaction(tx).save();
        }
        console.log('Test data seeded.');

        // 3. Test Inventory Valuation Detail
        console.log('\n--- Testing Inventory Valuation Detail ---');
        const invDetail = await reportService.getInventoryValuationDetail('2026-03-01', '2026-03-31', userId, companyId);
        const widgetSection = invDetail.sections.find(s => s.title === 'Widget A');
        if (widgetSection) {
            console.log('✅ Found Widget A section');
            const flow = invDetail.sections.filter(s => s.indent === 2 && s.id && (s.id === 'tx-inv-1' || s.id === 'tx-inv-2'));
            console.log(`✅ Found ${flow.length} transaction rows in detail`);
        } else {
            console.log('❌ Widget A section missing');
        }

        // 4. Test Open PO List
        console.log('\n--- Testing Open PO List ---');
        const poList = await reportService.getOpenPurchaseOrders('2026-03-01', '2026-03-31', userId, companyId, false);
        if (poList.sections.some(s => s.title.includes('PO #tx-po-1'))) {
            console.log('✅ PO found in list');
        } else {
            console.log('❌ PO missing from list');
        }

        // 5. Test Open PO Detail
        console.log('\n--- Testing Open PO Detail ---');
        const poDetail = await reportService.getOpenPurchaseOrders('2026-03-01', '2026-03-31', userId, companyId, true);
        if (poDetail.sections.some(s => s.title.includes('Widget A') && s.indent === 4)) {
            console.log('✅ Widget A found in PO detail lines');
        } else {
            console.log('❌ Widget A missing from PO detail');
        }

        console.log('\nVerification complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verify();
