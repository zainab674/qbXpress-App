/**
 * Scheduled Report Runner
 * Initializes cron jobs for all active ScheduledReport documents.
 * Call initScheduler() once after DB connects.
 */
const cron = require('node-cron');
const ScheduledReport = require('../models/ScheduledReport');
const reportService = require('../services/reportService');
const { exportToExcel, exportToText } = require('../services/reportExportService');
const emailService = require('../services/emailService');
const User = require('../models/User');

// Map of scheduleId → cron task (so we can cancel/restart on updates)
const activeTasks = {};

async function runScheduledReport(schedule) {
    try {
        console.log(`[ScheduledReport] Running: ${schedule.name} (${schedule.reportType})`);

        const { fromDate, toDate, ...otherParams } = schedule.params || {};

        // Generate the report
        const methodMap = buildMethodMap();
        const reportMethod = methodMap[schedule.reportType];
        if (!reportMethod) {
            console.warn(`[ScheduledReport] Unknown reportType: ${schedule.reportType}`);
            return;
        }

        const reportData = await reportService[reportMethod](
            fromDate, toDate, schedule.userId, schedule.companyId, otherParams
        );

        // Export to the requested format
        let fileBuffer, fileName, mimeType;
        if (schedule.format === 'Excel') {
            fileBuffer = exportToExcel(reportData, schedule.reportType);
            fileName = `${schedule.name.replace(/\s+/g, '_')}_${dateStr()}.xlsx`;
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else {
            fileBuffer = exportToText(reportData, schedule.reportType);
            fileName = `${schedule.name.replace(/\s+/g, '_')}_${dateStr()}.txt`;
            mimeType = 'text/plain';
        }

        // Get user SMTP settings for email
        const user = await User.findById(schedule.userId).lean().catch(() => null);
        const smtpSettings = user?.smtpSettings;

        const recipients = (schedule.recipientEmails || []).filter(Boolean);
        if (recipients.length > 0 && smtpSettings) {
            await emailService.sendEmail(
                smtpSettings,
                recipients.join(','),
                `Scheduled Report: ${schedule.name}`,
                `Please find attached the scheduled report "${schedule.name}" generated on ${new Date().toLocaleDateString()}.`,
                null,
                [{ filename: fileName, content: fileBuffer, contentType: mimeType }]
            );
            console.log(`[ScheduledReport] Emailed "${schedule.name}" to ${recipients.join(', ')}`);
        }

        // Update lastRunAt
        await ScheduledReport.findByIdAndUpdate(schedule._id, { lastRunAt: new Date() });
    } catch (err) {
        console.error(`[ScheduledReport] Error running "${schedule.name}":`, err.message);
    }
}

function registerSchedule(schedule) {
    // Cancel existing task if any
    if (activeTasks[schedule.id]) {
        activeTasks[schedule.id].destroy();
        delete activeTasks[schedule.id];
    }
    if (!schedule.isActive) return;

    if (!cron.validate(schedule.cronExpression)) {
        console.warn(`[ScheduledReport] Invalid cron expression for "${schedule.name}": ${schedule.cronExpression}`);
        return;
    }

    activeTasks[schedule.id] = cron.schedule(schedule.cronExpression, () => runScheduledReport(schedule), {
        scheduled: true,
        timezone: 'America/New_York',
    });
    console.log(`[ScheduledReport] Registered: "${schedule.name}" (${schedule.cronExpression})`);
}

async function initScheduler() {
    try {
        const schedules = await ScheduledReport.find({ isActive: true }).lean();
        schedules.forEach(registerSchedule);
        console.log(`[ScheduledReport] Initialized ${schedules.length} scheduled report(s).`);
    } catch (err) {
        console.error('[ScheduledReport] Failed to initialize scheduler:', err.message);
    }
}

function cancelSchedule(scheduleId) {
    if (activeTasks[scheduleId]) {
        activeTasks[scheduleId].destroy();
        delete activeTasks[scheduleId];
    }
}

function dateStr() {
    return new Date().toISOString().split('T')[0];
}

// Maps reportType strings to reportService method names
function buildMethodMap() {
    return {
        'P&L': 'getProfitAndLoss',
        'BS': 'getBalanceSheet',
        'GL': 'getGeneralLedger',
        'AGING': 'getARAgingReport',
        'AP_AGING': 'getAPAgingReport',
        'SALES_ITEM': 'getSalesByItem',
        'INV_VAL': 'getInventoryValuation',
        'TRIAL_BALANCE': 'getTrialBalance',
        'CASH_FLOW': 'getCashFlow',
        'BUDGET_VS_ACTUAL': 'getBudgetVsActual',
        'FORECAST': 'getForecast',
        'PAYROLL_SUMMARY': 'getPayrollSummary',
        'AUDIT_TRAIL': 'getAuditTrail',
    };
}

module.exports = { initScheduler, registerSchedule, cancelSchedule };
