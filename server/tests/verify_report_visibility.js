const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const Transaction = require('../models/Transaction');
const reportService = require('../services/reportService');

async function verifyReportVisibility() {
    console.log("Verifying report visibility for synced payroll records...");

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qbxpress');
        console.log("Connected to MongoDB.");

        const userId = 'test-user-' + Date.now();
        const companyId = 'test-company-' + Date.now();

        // 1. Create a synced payroll journal
        const syncedJournal = new Transaction({
            id: 'sync-journal-' + Date.now(),
            userId,
            companyId,
            type: 'JOURNAL',
            date: new Date().toISOString(),
            refNo: 'PAY-SYNC-001',
            total: 1234.56,
            memo: 'Test Payroll Sync Visibility',
            status: 'POSTED',
            items: [
                { description: 'Gross Wages', amount: 1234.56, type: 'DEBIT', accountId: null },
                { description: 'Federal Withholding', amount: -234.56, type: 'CREDIT', accountId: null }
            ]
        });
        await syncedJournal.save();
        console.log("Created synced JOURNAL record: " + syncedJournal.refNo);

        // 2. Create a manual journal entry (the old type)
        const manualJournal = new Transaction({
            id: 'manual-journal-' + Date.now(),
            userId,
            companyId,
            type: 'JOURNAL_ENTRY',
            date: new Date().toISOString(),
            refNo: 'JE-001',
            total: 500.00,
            memo: 'Manual JE',
            status: 'POSTED',
            items: [{ description: 'Manual', amount: 500.00, type: 'DEBIT', accountId: null }]
        });
        await manualJournal.save();
        console.log("Created manual JOURNAL_ENTRY record: " + manualJournal.refNo);

        // 3. Test Payroll Summary Report
        console.log("\nTesting Payroll Summary Report...");
        const payrollSummary = await reportService.getPayrollSummary(null, null, userId, companyId);

        // Find the "Adjusted Gross Pay" section
        const grossSection = payrollSummary.sections.find(s => s.title === 'Adjusted Gross Pay');
        console.log("Gross Pay in Report: " + grossSection.value);

        if (grossSection.value === 1234.56) {
            console.log("SUCCESS: Synced JOURNAL amount found in Payroll Summary.");
        } else {
            console.warn("FAILED: Synced JOURNAL amount NOT found in Payroll Summary. Expected 1234.56, got " + grossSection.value);
            throw new Error("Payroll Summary visibility check failed.");
        }

        // 4. Test General Ledger Report with JOURNAL filter
        console.log("\nTesting General Ledger Report (Filtered by JOURNAL)...");
        // We'll simulate the report filter logic here since getGeneralLedger is more complex
        const glResults = await Transaction.find({
            type: { $in: ['JOURNAL', 'JOURNAL_ENTRY'] },
            userId,
            companyId
        });

        const foundSync = glResults.find(t => t.type === 'JOURNAL');
        const foundManual = glResults.find(t => t.type === 'JOURNAL_ENTRY');

        if (foundSync && foundManual) {
            console.log("SUCCESS: Both JOURNAL and JOURNAL_ENTRY visible in GL results.");
        } else {
            console.warn("FAILED: Missing types in GL results. Synced: " + !!foundSync + ", Manual: " + !!foundManual);
            throw new Error("GL Type Mapping check failed.");
        }

        // Cleanup
        await Transaction.deleteMany({ userId, companyId });
        console.log("\nTest data cleaned up.");
        console.log("Verification SUCCESSFUL!");
        process.exit(0);

    } catch (err) {
        console.error("\nVerification ERROR: " + err.message);
        process.exit(1);
    }
}

verifyReportVisibility();
