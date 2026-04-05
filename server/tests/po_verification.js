const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Transaction = require('../models/Transaction');
const Vendor = require('../models/Vendor');
const Item = require('../models/Item');
const transactionService = require('../services/transactionService');
const crypto = require('crypto');

dotenv.config();

async function runVerification() {
    console.log('--- STARTING PO VERIFICATION ---');

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Setup Data
        const vendor = await Vendor.findOne({});
        const item = await Item.findOne({ type: 'Inventory Part' });

        if (!vendor || !item) {
            console.error('Missing Vendor or Inventory Item. Please ensure data exists.');
            process.exit(1);
        }

        const userId = vendor.userId;
        const companyId = vendor.companyId;
        const poId = 'PO-TEST-' + crypto.randomUUID().slice(0, 8);

        console.log(`Testing with Vendor: ${vendor.name}, Item: ${item.name}`);

        // 2. Create Purchase Order
        const po = new Transaction({
            id: poId,
            type: 'PURCHASE_ORDER',
            refNo: poId,
            date: new Date().toISOString().split('T')[0],
            entityId: vendor.id,
            userId,
            companyId,
            status: 'OPEN',
            total: item.cost * 10,
            items: [{
                id: crypto.randomUUID(),
                itemId: item.id,
                description: item.name,
                quantity: 10,
                rate: item.cost,
                amount: item.cost * 10,
                receivedQuantity: 0,
                isClosed: false
            }]
        });

        await po.save();
        console.log('✅ Purchase Order created (Qty: 10)');

        // 3. Simulate Partial Receipt (6 items)
        const receipt1 = {
            id: 'RC-1-' + crypto.randomUUID().slice(0, 4),
            type: 'RECEIVE_ITEM',
            purchaseOrderId: poId,
            userId,
            companyId,
            items: [{
                itemId: item.id,
                quantity: 6
            }]
        };

        console.log('--- Receiving 6 items ---');
        await transactionService.receiveInventoryItems(receipt1, null, 1);

        const updatedPo1 = await Transaction.findOne({ id: poId });
        console.log(`PO Status: ${updatedPo1.status}`);
        console.log(`Line Item Received Qty: ${updatedPo1.items[0].receivedQuantity}`);

        if (updatedPo1.status === 'PARTIALLY_RECEIVED' && updatedPo1.items[0].receivedQuantity === 6) {
            console.log('✅ PARTIAL RECEIPT VERIFIED');
        } else {
            throw new Error(`Partial receipt verification failed. Status: ${updatedPo1.status}, Qty: ${updatedPo1.items[0].receivedQuantity}`);
        }

        // 4. Simulate Final Receipt (4 items)
        const receipt2 = {
            id: 'RC-2-' + crypto.randomUUID().slice(0, 4),
            type: 'RECEIVE_ITEM',
            purchaseOrderId: poId,
            userId,
            companyId,
            items: [{
                itemId: item.id,
                quantity: 4
            }]
        };

        console.log('--- Receiving remaining 4 items ---');
        await transactionService.receiveInventoryItems(receipt2, null, 1);

        const updatedPo2 = await Transaction.findOne({ id: poId });
        console.log(`PO Status: ${updatedPo2.status}`);
        console.log(`Line Item Received Qty: ${updatedPo2.items[0].receivedQuantity}`);
        console.log(`Line Item Is Closed: ${updatedPo2.items[0].isClosed}`);

        if (updatedPo2.status === 'CLOSED' && updatedPo2.items[0].receivedQuantity === 10 && updatedPo2.items[0].isClosed === true) {
            console.log('✅ FINAL RECEIPT VERIFIED (Status: CLOSED)');
        } else {
            throw new Error(`Final receipt verification failed. Status: ${updatedPo2.status}, Qty: ${updatedPo2.items[0].receivedQuantity}`);
        }

        // 5. Cleanup
        await Transaction.deleteOne({ id: poId });
        console.log('Cleaned up test data.');

    } catch (err) {
        console.error('❌ Verification Error:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
        console.log('--- VERIFICATION COMPLETE ---');
    }
}

runVerification();
