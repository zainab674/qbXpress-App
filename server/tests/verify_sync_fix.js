const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const Transaction = require('../models/Transaction');

async function verifyFix() {
    console.log("Verifying fix for Transaction model creation...");

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qbxpress');
        console.log("Connected to MongoDB.");

        const payRunId = '550e8400-e29b-41d4-a716-446655440000';
        const period = '2026-04-05';
        const totalGross = 5000.00;
        const req = {
            user: { id: 'user-123' },
            companyId: 'company-456'
        };
        const journalLines = [
            { description: 'Gross wages', amount: 5000, type: 'debit' }
        ];

        // Replicate logic from controller
        const newEntry = new Transaction({
            id: crypto.randomUUID(),
            userId: req.user.id,
            companyId: req.companyId,
            type: 'JOURNAL',
            date: new Date().toISOString(),
            refNo: `PAY-${payRunId.slice(0, 8)}`,
            total: totalGross,
            memo: `Payroll Sync: ${period}`,
            status: 'POSTED',
            items: journalLines.map(line => ({
                description: line.description,
                amount: line.amount,
                type: line.type.toUpperCase(),
                accountId: null
            }))
        });

        console.log("Saving new transaction...");
        await newEntry.save();
        console.log("Transaction saved successfully: " + newEntry.id);

        // Cleanup
        await Transaction.deleteOne({ id: newEntry.id });
        console.log("Test transaction cleaned up.");

        console.log("Verification SUCCESSFUL!");
        process.exit(0);
    } catch (err) {
        console.error("Verification FAILED: " + err.message);
        process.exit(1);
    }
}

verifyFix();
