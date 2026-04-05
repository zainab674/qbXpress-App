/**
 * PaymentService.js
 * Simulated payment gateway for qbXpress.
 */

const PaymentService = {
    /**
     * Charges a customer's payment method.
     * @param {Object} params 
     * @param {string} params.customerId
     * @param {number} params.amount
     * @param {string} params.currency
     * @param {string} params.memo
     * @returns {Promise<{success: boolean, transactionId: string, error?: string}>}
     */
    charge: async ({ customerId, amount, currency = 'USD', memo = '' }) => {
        console.log(`[PaymentService] Charging customer ${customerId}: ${amount} ${currency} (${memo})`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 95% success rate for simulation
        const isSuccess = Math.random() > 0.05;

        if (isSuccess) {
            return {
                success: true,
                transactionId: `SIM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
            };
        } else {
            return {
                success: false,
                transactionId: null,
                error: 'Insufficient funds or payment method declined.'
            };
        }
    },

    /**
     * Verifies if a recurring payment is authorized by the customer.
     * In a real app, this would check tokens or signed mandates.
     */
    verifyAuthorization: async (customerId, templateId) => {
        // Simplified check
        return true;
    }
};

module.exports = PaymentService;
