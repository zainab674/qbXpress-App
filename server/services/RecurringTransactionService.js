/**
 * RecurringTransactionService.js
 * Processes recurring templates and generates transactions.
 */

const RecurringTemplate = require('../models/RecurringTemplate');
const transactionService = require('./transactionService');
const PaymentService = require('./PaymentService');
const crypto = require('crypto');

const RecurringTransactionService = {
    /**
     * Processes all pending templates.
     */
    processAll: async () => {
        console.log('[RecurringTransactionService] Starting processing...');

        const today = new Date().toISOString().split('T')[0];

        // Find all scheduled, authorized templates that are due today or earlier
        const templates = await RecurringTemplate.find({
            type: 'Scheduled',
            isAuthorized: true,
            $or: [
                { nextScheduledDate: { $lte: today } },
                { nextScheduledDate: { $exists: false } },
                { nextScheduledDate: null }
            ]
        });

        if (templates.length === 0) {
            console.log('[RecurringTransactionService] No templates due for processing.');
            return;
        }

        for (const template of templates) {
            await RecurringTransactionService.processSingleTemplate(template);
        }

        console.log('[RecurringTransactionService] Processing complete.');
    },

    /**
     * Processes a single template.
     */
    processSingleTemplate: async (template) => {
        const today = new Date().toISOString().split('T')[0];
        console.log(`[RecurringTransactionService] Processing template: ${template.templateName} (${template.id})`);

        try {
            // 1. Initialize nextScheduledDate if missing
            if (!template.nextScheduledDate) {
                template.nextScheduledDate = template.startDate;
            }

            // Double check if it's truly due (in case nextScheduledDate was just set)
            if (template.nextScheduledDate > today) return;

            await RecurringTransactionService.generateTransaction(template);

            // 2. Update lifecycle
            template.lastProcessedDate = today;
            template.nextScheduledDate = RecurringTransactionService.calculateNextDate(template);

            // 3. Check end logic
            if (template.endType === 'After') {
                template.endAfterOccurrences = (template.endAfterOccurrences || 1) - 1;
                if (template.endAfterOccurrences <= 0) {
                    template.type = 'Unscheduled';
                }
            } else if (template.endType === 'OnDate' && template.nextScheduledDate > template.endDate) {
                template.type = 'Unscheduled';
            }

            // 4. Remove One-Time Items
            if (template.transactionData && template.transactionData.items) {
                const originalCount = template.transactionData.items.length;
                template.transactionData.items = template.transactionData.items.filter(item => !item.isOneTime);
                if (template.transactionData.items.length !== originalCount) {
                    template.transactionData.total = template.transactionData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
                }
            }

            await template.save();
        } catch (error) {
            console.error(`[RecurringTransactionService] Error processing template ${template.id}:`, error);
        }
    },

    /**
     * Generates a single transaction from a template.
     */
    generateTransaction: async (template) => {
        const userId = template.userId;
        const companyId = template.companyId;

        // 1. Simulate Payment Charge
        const chargeResult = await PaymentService.charge({
            customerId: template.entityId,
            amount: template.transactionData.total,
            memo: `Recurring payment for ${template.templateName}`
        });

        if (!chargeResult.success) {
            throw new Error(`Payment failed: ${chargeResult.error}`);
        }

        // 2. Prepare Transaction Data
        const txData = {
            ...template.transactionData.toObject(),
            id: crypto.randomUUID(),
            userId,
            companyId,
            date: new Date().toISOString().split('T')[0],
            status: template.transactionData.type === 'INVOICE' ? 'OPEN' : 'PAID',
            memo: `${template.transactionData.memo || ''} [Recurring: ${template.templateName} - ${chargeResult.transactionId}]`.trim(),
            paymentMethod: template.transactionData.paymentMethod || 'Credit Card'
        };

        // 3. Save Transaction using transactionService
        await transactionService.saveTransaction(txData, 'System-Auto', userId, companyId);
        console.log(`[RecurringTransactionService] Generated transaction ${txData.id} for template ${template.id}`);
    },

    /**
     * Calculates the next date based on the interval.
     */
    calculateNextDate: (template) => {
        const current = new Date(template.nextScheduledDate || template.startDate);
        const interval = template.interval;
        const every = template.every || 1;

        if (interval === 'Daily') {
            current.setDate(current.getDate() + every);
        } else if (interval === 'Weekly') {
            current.setDate(current.getDate() + (7 * every));
        } else if (interval === 'Monthly') {
            current.setMonth(current.getMonth() + every);
            // Handle day of month persistence if possible, though JS Date does this mostly
        } else if (interval === 'Yearly') {
            current.setFullYear(current.getFullYear() + every);
        }

        return current.toISOString().split('T')[0];
    }
};

module.exports = RecurringTransactionService;
