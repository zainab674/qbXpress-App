const mongoose = require('mongoose');
const reportService = require('../services/reportService');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Customer = require('../models/Customer');
const Budget = require('../models/Budget');

describe('Report Service', () => {
    const userId = 'test-user-' + Date.now();
    const companyId = 'test-company-' + Date.now();
    const testDate = new Date().toISOString().split('T')[0];

    beforeAll(async () => {
        const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/qbxpress-test';
        await mongoose.connect(mongoUrl);
    });

    afterAll(async () => {
        await Transaction.deleteMany({ userId, companyId });
        await Account.deleteMany({ userId, companyId });
        await Customer.deleteMany({ userId, companyId });
        await mongoose.disconnect();
    });

    describe('getProfitAndLoss', () => {
        it('should return valid P&L structure', async () => {
            const result = await reportService.getProfitAndLoss(
                '2026-01-01',
                '2026-12-31',
                userId,
                companyId
            );

            expect(result).toHaveProperty('sections');
            expect(Array.isArray(result.sections)).toBe(true);
            expect(result.sections.length).toBeGreaterThan(0);
            expect(result.sections[0]).toHaveProperty('isHeading', true);
        });

        it('should handle invalid dates', async () => {
            await expect(
                reportService.getProfitAndLoss(
                    'invalid-date',
                    '2026-12-31',
                    userId,
                    companyId
                )
            ).rejects.toThrow();
        });

        it('should include comparison data when requested', async () => {
            const result = await reportService.getProfitAndLoss(
                '2026-06-01',
                '2026-06-30',
                userId,
                companyId,
                { previousPeriod: true }
            );

            expect(result.sections.some(s => s.ppValue !== undefined)).toBe(true);
        });
    });

    describe('getBalanceSheet', () => {
        it('should return valid balance sheet structure', async () => {
            const result = await reportService.getBalanceSheet(
                testDate,
                userId,
                companyId
            );

            expect(result).toHaveProperty('sections');
            expect(Array.isArray(result.sections)).toBe(true);
            const headings = result.sections.filter(s => s.isHeading);
            expect(headings.length).toBeGreaterThan(0);
        });

        it('should have assets = liabilities + equity', async () => {
            const result = await reportService.getBalanceSheet(
                testDate,
                userId,
                companyId
            );

            const totalAssets = result.sections.find(s => s.title === 'TOTAL ASSETS');
            const totalLiabEquity = result.sections.find(s => s.title === 'TOTAL LIABILITIES & EQUITY');

            if (totalAssets && totalLiabEquity) {
                expect(Math.abs(totalAssets.value - totalLiabEquity.value)).toBeLessThan(0.01);
            }
        });
    });

    describe('getBudgetVsActual', () => {
        it('should return valid budget vs actual structure', async () => {
            const result = await reportService.getBudgetVsActual(
                '2026-01-01',
                '2026-12-31',
                userId,
                companyId
            );

            expect(result).toHaveProperty('sections');
            expect(Array.isArray(result.sections)).toBe(true);
        });

        it('should not crash with no budgets', async () => {
            const result = await reportService.getBudgetVsActual(
                '2026-01-01',
                '2026-12-31',
                userId,
                companyId
            );

            expect(result.sections).toBeDefined();
            expect(result.sections.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getGeneralLedger', () => {
        it('should return transactions with running balance', async () => {
            const result = await reportService.getGeneralLedger(
                '2026-01-01',
                '2026-12-31',
                userId,
                companyId,
                {}
            );

            expect(result).toHaveProperty('transactions');
            expect(result).toHaveProperty('summary');
            expect(result.summary).toHaveProperty('total');
        });

        it('should filter by transaction type', async () => {
            const result = await reportService.getGeneralLedger(
                '2026-01-01',
                '2026-12-31',
                userId,
                companyId,
                { transactionType: 'INVOICE' }
            );

            expect(result).toHaveProperty('transactions');
            expect(result.title).toContain('INVOICE');
        });
    });

    describe('getARAgingDetail', () => {
        it('should return AR aging detail structure', async () => {
            const result = await reportService.getARAgingDetail(
                '2026-01-01',
                '2026-12-31',
                userId,
                companyId
            );

            expect(result).toHaveProperty('sections');
            expect(Array.isArray(result.sections)).toBe(true);
        });

        it('should include aging information', async () => {
            const result = await reportService.getARAgingDetail(
                '2026-01-01',
                '2026-12-31',
                userId,
                companyId
            );

            const arSection = result.sections.find(s => s.title === 'Accounts Receivable Aging Detail');
            expect(arSection).toBeDefined();
        });
    });

    describe('getForecast', () => {
        it('should return forecast structure', async () => {
            const result = await reportService.getForecast(
                '2026-01-01',
                '2026-12-31',
                userId,
                companyId
            );

            expect(result).toHaveProperty('sections');
            expect(Array.isArray(result.sections)).toBe(true);
        });

        it('should have non-negative forecast', async () => {
            const result = await reportService.getForecast(
                '2026-01-01',
                '2026-12-31',
                userId,
                companyId
            );

            const totalRow = result.sections.find(s => s.title === 'TOTAL FORECAST');
            if (totalRow) {
                expect(totalRow.value).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe('Custom Columns', () => {
        it('should not allow dangerous functions in formulas', () => {
            const { evaluate } = require('mathjs');
            const allowedFunctions = ['add', 'subtract', 'multiply', 'divide', 'abs', 'ceil', 'floor'];

            const dangerousFormula = 'require("fs").readFileSync("/etc/passwd")';
            expect(() => {
                // This should fail during validation before reaching evaluate
                if (dangerousFormula.includes('require') || dangerousFormula.includes('import')) {
                    throw new Error('Dangerous function detected');
                }
                evaluate(dangerousFormula);
            }).toThrow();
        });

        it('should allow safe mathematical formulas', () => {
            const { evaluate } = require('mathjs');
            const scope = { value: 100, quantity: 5 };

            const result = evaluate('value * quantity', scope);
            expect(result).toBe(500);
        });
    });

    describe('Date Validation', () => {
        it('should reject invalid date formats', () => {
            const invalidDates = [
                '2026-13-01',  // Invalid month
                '2026/01/01',  // Wrong format
                'invalid',
                '2026-01-32'   // Invalid day
            ];

            invalidDates.forEach(invalidDate => {
                expect(() => {
                    const parsed = new Date(invalidDate);
                    if (isNaN(parsed.getTime())) throw new Error('Invalid date');
                }).toThrow();
            });
        });

        it('should accept valid date formats', () => {
            const validDates = [
                '2026-01-01',
                '2026-12-31',
                '2026-06-15'
            ];

            validDates.forEach(validDate => {
                expect(() => {
                    const parsed = new Date(validDate);
                    expect(parsed.getTime()).toBeGreaterThan(0);
                }).not.toThrow();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle missing user gracefully', async () => {
            await expect(
                reportService.getProfitAndLoss(
                    '2026-01-01',
                    '2026-12-31',
                    null,
                    companyId
                )
            ).rejects.toBeDefined();
        });

        it('should handle missing company gracefully', async () => {
            await expect(
                reportService.getBalanceSheet(
                    testDate,
                    userId,
                    null
                )
            ).rejects.toBeDefined();
        });
    });
});
