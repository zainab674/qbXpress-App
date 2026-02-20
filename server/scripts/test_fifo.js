const mongoose = require('mongoose');
const dotenv = require('dotenv');
const InventoryLot = require('../models/InventoryLot');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const transactionService = require('../services/transactionService');

dotenv.config();

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const userId = 'test_user_' + Date.now();
        const companyId = 'test_company_' + Date.now();

        // 1. Create a test item
        const item = new Item({
            id: 'test_item_' + Date.now(),
            name: 'Test FIFO Item',
            type: 'Inventory Part',
            userId,
            companyId,
            onHand: 0,
            cost: 10,
            salesPrice: 20
        });
        await item.save();
        console.log('Created test item');

        // 2. Simulate Receiving Lot A (older)
        const poA = {
            id: 'PO-A-' + Date.now(),
            type: 'BILL',
            refNo: 'RECV-001',
            date: '2023-01-01',
            entityId: 'vendor1',
            userId,
            companyId,
            lotNumber: 'LOT-A',
            items: [{ id: item.id, description: item.name, quantity: 10, rate: 10, amount: 100 }],
            total: 100,
            status: 'OPEN'
        };
        await transactionService.saveTransaction(poA, 'Admin', userId, companyId);
        console.log('Received LOT-A (10 units)');

        // 3. Simulate Receiving Lot B (newer)
        const poB = {
            id: 'PO-B-' + Date.now(),
            type: 'BILL',
            refNo: 'RECV-002',
            date: '2023-02-01',
            entityId: 'vendor1',
            userId,
            companyId,
            lotNumber: 'LOT-B',
            items: [{ id: item.id, description: item.name, quantity: 10, rate: 10, amount: 100 }],
            total: 100,
            status: 'OPEN'
        };
        await transactionService.saveTransaction(poB, 'Admin', userId, companyId);
        console.log('Received LOT-B (10 units)');

        // 4. Create Invoice for 15 units (should take 10 from LOT-A and 5 from LOT-B)
        const invoice = {
            id: 'INV-1-' + Date.now(),
            type: 'INVOICE',
            refNo: 'INV-001',
            date: '2023-03-01',
            entityId: 'cust1',
            userId,
            companyId,
            items: [{ id: 'line1', itemId: item.id, description: item.name, quantity: 15, rate: 20, amount: 300 }],
            total: 300,
            status: 'OPEN'
        };
        await transactionService.saveTransaction(invoice, 'Admin', userId, companyId);
        console.log('Created Invoice for 15 units');

        // 5. Verify LOT-A is empty and LOT-B has 5 left
        const lotA = await InventoryLot.findOne({ itemId: item.id, lotNumber: 'LOT-A', companyId });
        const lotB = await InventoryLot.findOne({ itemId: item.id, lotNumber: 'LOT-B', companyId });

        console.log('LOT-A Remaining:', lotA.quantityRemaining);
        console.log('LOT-B Remaining:', lotB.quantityRemaining);

        if (lotA.quantityRemaining === 0 && lotB.quantityRemaining === 5) {
            console.log('SUCCESS: FIFO logic verified!');
        } else {
            console.error('FAILURE: FIFO logic incorrect');
        }

        // Cleanup
        await Item.deleteMany({ userId });
        await InventoryLot.deleteMany({ userId });
        await Transaction.deleteMany({ userId });

        process.exit(0);
    } catch (err) {
        console.error('Test Error:', err);
        process.exit(1);
    }
}

runTest();
