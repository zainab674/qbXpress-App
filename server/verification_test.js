/**
 * verification_test.js
 * Run this to verify RecurringTransactionService logic.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const RecurringTemplate = require('./models/RecurringTemplate');
const Transaction = require('./models/Transaction');
const Customer = require('./models/Customer');
const RecurringTransactionService = require('./services/RecurringTransactionService');
const crypto = require('crypto');

dotenv.config();

async function runVerification() {
    console.log('--- STARTING VERIFICATION ---');

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find a customer to test with
        const customer = await Customer.findOne({});
        if (!customer) {
            console.error('No customer found to test with.');
            process.exit(1);
        }

        console.log(`Testing with Customer: ${customer.name} (${customer.id})`);
        const userId = customer.userId;
        const companyId = customer.companyId;

        // 2. Create a mock template scheduled for "yesterday"
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const testTemplateId = 'TEST-' + crypto.randomUUID();
        const testTemplate = new RecurringTemplate({
            id: testTemplateId,
            userId,
            companyId,
            templateName: 'Test Automation Template',
            type: 'Scheduled',
            entityId: customer.id,
            interval: 'Monthly',
            every: 1,
            startDate: yesterdayStr,
            nextScheduledDate: yesterdayStr,
            endType: 'Never',
            isAuthorized: true,
            transactionData: {
                type: 'SALES_RECEIPT',
                total: 155.00,
                memo: 'Test Automated Charge',
                items: [
                    { description: 'Monthly Service', quantity: 1, rate: 100, amount: 100, accountId: 'Sales' },
                    { description: 'Setup Fee (One-Time)', quantity: 1, rate: 55, amount: 55, accountId: 'Sales', isOneTime: true }
                ]
            }
        });

        await testTemplate.save();
        console.log('Added test template.');

        // 3. Trigger processing
        const txCountBefore = await Transaction.countDocuments({ userId, companyId });
        await RecurringTransactionService.processAll();

        // 4. Verify results
        const txCountAfter = await Transaction.countDocuments({ userId, companyId });
        const processedTemplate = await RecurringTemplate.findOne({ id: testTemplateId });

        console.log('\n--- RESULTS ---');
        console.log(`Transactions before: ${txCountBefore}`);
        console.log(`Transactions after: ${txCountAfter}`);

        if (txCountAfter > txCountBefore) {
            console.log('✅ SUCCESS: New transaction generated.');
            const lastTx = await Transaction.findOne({ userId, companyId }).sort({ createdAt: -1 });
            console.log(`Generated TX Memo: ${lastTx.memo}`);
        } else {
            console.error('❌ FAILURE: No transaction generated.');
        }

        if (processedTemplate.lastProcessedDate) {
            console.log(`✅ SUCCESS: lastProcessedDate updated to ${processedTemplate.lastProcessedDate}`);
        } else {
            console.error('❌ FAILURE: lastProcessedDate NOT updated.');
        }

        if (processedTemplate.transactionData.items.length === 1) {
            console.log('✅ SUCCESS: One-time item removed from template.');
            console.log(`New total: $${processedTemplate.transactionData.total}`);
        } else {
            console.error('❌ FAILURE: One-time item NOT removed.');
        }

        // Cleanup
        await RecurringTemplate.deleteOne({ id: testTemplateId });
        console.log('Cleaned up test template.');

    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
        console.log('--- VERIFICATION COMPLETE ---');
    }
}

runVerification();
