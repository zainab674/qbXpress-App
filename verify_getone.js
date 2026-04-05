const mongoose = require('mongoose');
const transactionService = require('./server/services/transactionService');
require('dotenv').config({ path: './server/.env' });

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Try to get a transaction
        // We'll just look for any transaction first to get an ID
        const Transaction = require('./server/models/Transaction');
        const anyTx = await Transaction.findOne();

        if (anyTx) {
            console.log('Found a transaction to test with:', anyTx.id);
            const fetched = await transactionService.getOne(anyTx.id, anyTx.userId, anyTx.companyId);
            if (fetched && fetched.id === anyTx.id) {
                console.log('Success: getOne works correctly');
            } else {
                console.log('Failure: getOne did not return the expected transaction');
            }
        } else {
            console.log('No transactions found in DB to test with.');
            // Test with a dummy call anyway to ensure method exists
            try {
                await transactionService.getOne('dummy', 'dummy', 'dummy');
                console.log('Success: getOne method exists and is callable');
            } catch (e) {
                console.log('Failure: getOne method failed even when called with dummy data', e);
            }
        }
    } catch (err) {
        console.error('Error during verification:', err);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
