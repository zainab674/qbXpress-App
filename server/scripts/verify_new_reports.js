const mongoose = require('mongoose');
const dotenv = require('dotenv');
const reportService = require('../services/reportService');

dotenv.config({ path: '../.env' });

async function verifyReports() {
    try {
        console.log('--- Verifying New Reports Logic ---');

        // Mock user and company IDs
        const userId = new mongoose.Types.ObjectId().toString();
        const companyId = new mongoose.Types.ObjectId().toString();
        const fromDate = '2023-01-01';
        const toDate = '2023-12-31';

        // Connect to DB (needed because reportService queries real models)
        if (process.env.MONGODB_URI) {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('Connected to MongoDB');
        } else {
            console.warn('MONGODB_URI not found, skipping DB-dependent checks');
            return;
        }

        const reportsToTest = [
            { name: 'Statement of Changes in Equity', fn: reportService.getStatementOfChangesInEquity, args: [fromDate, toDate, userId, companyId] },
            { name: 'Unbilled Charges', fn: reportService.getUnbilledCharges, args: [userId, companyId] },
            { name: 'Unbilled Time', fn: reportService.getUnbilledTime, args: [userId, companyId] },
            { name: 'Collections Report', fn: reportService.getCollectionsReport, args: [userId, companyId] },
            { name: 'Inventory Valuation Detail', fn: reportService.getInventoryValuationDetail, args: [userId, companyId] },
            { name: 'Adjusted Trial Balance', fn: reportService.getAdjustedTrialBalance, args: [userId, companyId] },
            { name: 'Statement List', fn: reportService.getStatementList, args: [userId, companyId] },
            { name: 'Detailed Time Activities', fn: reportService.getDetailedTimeActivities, args: [userId, companyId] }
        ];

        for (const report of reportsToTest) {
            process.stdout.write(`Testing ${report.name}... `);
            try {
                const data = await report.fn(...report.args);
                if (data && Array.isArray(data.sections)) {
                    console.log('✅ Passed (Structure valid)');
                } else {
                    console.log('❌ Failed (Invalid structure)');
                }
            } catch (err) {
                console.log(`❌ Failed (Error: ${err.message})`);
            }
        }

        console.log('--- Verification Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Verification Error:', err);
        process.exit(1);
    }
}

verifyReports();
