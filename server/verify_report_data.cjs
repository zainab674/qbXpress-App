require('dotenv').config();
const mongoose = require('mongoose');
const reportService = require('../server/services/reportService');
const Transaction = require('../server/models/Transaction');
const Account = require('../server/models/Account');

async function verify() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI not found in environment');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const userId = 'test-user-123';
        const companyId = 'test-company-456';

        // Clear existing test data
        await Transaction.deleteMany({ userId, companyId });
        await Account.deleteMany({ userId, companyId });

        // Setup test account
        const account = new Account({
            id: 'acc-1',
            userId,
            companyId,
            name: 'Accounts Receivable',
            type: 'Accounts Receivable',
            balance: 1000
        });
        await account.save();

        // Setup test transactions
        const transactions = [
            {
                id: 'tx-1',
                userId,
                companyId,
                type: 'INVOICE',
                date: '2026-02-27',
                total: 500,
                status: 'OPEN',
                entityId: 'cust-1',
                items: []
            },
            {
                id: 'tx-2',
                userId,
                companyId,
                type: 'BILL',
                date: '2026-02-27',
                total: 300,
                status: 'OPEN',
                entityId: 'vend-1',
                items: []
            }
        ];

        for (const tx of transactions) {
            await new Transaction(tx).save();
        }

        console.log('Test data inserted');

        // Test General Ledger - Invoice filter
        const invoiceReport = await reportService.getGeneralLedger(
            '2026-02-01',
            '2026-02-28',
            userId,
            companyId,
            { transactionType: 'Invoice' }
        );

        console.log(`Invoice Report Count: ${invoiceReport.transactions.length}`);
        if (invoiceReport.transactions.length === 1 && invoiceReport.transactions[0].type === 'INVOICE') {
            console.log('✅ Invoice filtering works correctly (case-insensitive)');
        } else {
            console.log('❌ Invoice filtering failed');
            console.log(JSON.stringify(invoiceReport.transactions, null, 2));
        }

        // Test General Ledger - All types (Blank)
        const allReport = await reportService.getGeneralLedger(
            '2026-02-01',
            '2026-02-28',
            userId,
            companyId,
            { transactionType: 'Blank' }
        );

        console.log(`All Report Count: ${allReport.transactions.length}`);
        if (allReport.transactions.length === 2) {
            console.log('✅ General Ledger (Blank) shows all transactions');
        } else {
            console.log('❌ General Ledger (Blank) failed');
        }

        // Test Security - Different User
        const otherUserReport = await reportService.getGeneralLedger(
            '2026-02-01',
            '2026-02-28',
            'other-user',
            companyId,
            { transactionType: 'Blank' }
        );

        if (otherUserReport.transactions.length === 0) {
            console.log('✅ Security filter (userId) works');
        } else {
            console.log('❌ Security filter (userId) failed');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
