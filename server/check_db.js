const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const Account = require('./models/Account');
require('dotenv').config({ path: '../.env' });

async function checkData() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/qbxpress';
        console.log('Connecting to:', uri);
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const accountCount = await Account.countDocuments();
        console.log('Total Accounts:', accountCount);

        const transactionCount = await Transaction.countDocuments();
        console.log('Total Transactions:', transactionCount);

        if (transactionCount > 0) {
            const sampleTx = await Transaction.findOne().lean();
            console.log('Sample Transaction:', JSON.stringify(sampleTx, null, 2));
        }

        const accounts = await Account.find({ type: 'Income' }).limit(5).lean();
        console.log('Sample Income Accounts:', JSON.stringify(accounts, null, 2));

        const transactionsWithItems = await Transaction.find({ "items.0": { $exists: true } }).limit(5).lean();
        console.log('Transactions with items count:', transactionsWithItems.length);
        if (transactionsWithItems.length > 0) {
            console.log('Sample Transaction with Items:', JSON.stringify(transactionsWithItems[0], null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkData();
