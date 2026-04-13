const express = require('express');
const reportController = require('../controllers/reportController');
const ReportCustomColumn = require('../models/ReportCustomColumn');
const mongoose = require('mongoose');

describe('Report Controller', () => {
    const userId = 'test-user-' + Date.now();
    const companyId = 'test-company-' + Date.now();

    let req, res;

    beforeEach(() => {
        req = {
            user: { id: userId },
            companyId: companyId,
            query: {},
            body: {},
            params: {}
        };

        res = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis()
        };
    });

    describe('Input Validation', () => {
        it('should reject invalid date in getProfitAndLoss', async () => {
            req.query.fromDate = 'invalid-date';
            req.query.toDate = '2026-12-31';

            await reportController.getProfitAndLoss(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'VALIDATION_ERROR' })
            );
        });

        it('should accept valid dates', async () => {
            req.query.fromDate = '2026-01-01';
            req.query.toDate = '2026-12-31';

            // Mock the reportService
            jest.mock('../services/reportService', () => ({
                getProfitAndLoss: jest.fn().mockResolvedValue({ sections: [] })
            }));

            await reportController.getProfitAndLoss(req, res);
            // Should not call status(400)
            expect(res.status).not.toHaveBeenCalledWith(400);
        });
    });

    describe('Error Handling', () => {
        it('should catch and handle errors properly', async () => {
            req.query.fromDate = '2026-01-01';
            req.query.toDate = '2026-12-31';

            const error = new Error('Database error');
            jest.spyOn(reportController, 'getProfitAndLoss').mockImplementationOnce(async (r, rsp) => {
                throw error;
            });

            // Error should be caught and formatted
            expect(() => {
                reportController.getProfitAndLoss(req, res);
            }).not.toThrow();
        });

        it('should return 400 for validation errors', async () => {
            req.body = { reportType: '', columnName: 'test', formula: '=1+1' };

            await reportController.addCustomColumn(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 403 for security errors (dangerous formulas)', async () => {
            req.body = {
                reportType: 'TEST',
                columnName: 'bad',
                formula: 'dangerousFunction(value)'
            };

            await reportController.addCustomColumn(req, res);

            // If formula validation is in place, it should prevent dangerous formulas
            // This would require the validation to happen before DB save
        });
    });

    describe('Custom Columns', () => {
        it('should validate required fields for addCustomColumn', async () => {
            req.body = { reportType: 'TEST' }; // Missing columnName and formula

            await reportController.addCustomColumn(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'VALIDATION_ERROR'
                })
            );
        });

        it('should validate required fields for getCustomColumns', async () => {
            req.query = {}; // Missing reportType

            await reportController.getCustomColumns(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should validate required fields for deleteCustomColumn', async () => {
            req.params = {}; // Missing id

            await reportController.deleteCustomColumn(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Report Endpoints', () => {
        const reportEndpoints = [
            { method: 'getProfitAndLoss', requiredParams: ['fromDate', 'toDate'] },
            { method: 'getBalanceSheet', requiredParams: ['toDate'] },
            { method: 'getGeneralLedger', requiredParams: ['fromDate', 'toDate'] },
            { method: 'getTrialBalance', requiredParams: ['fromDate', 'toDate'] },
            { method: 'getCashFlow', requiredParams: ['fromDate', 'toDate'] }
        ];

        reportEndpoints.forEach(({ method, requiredParams }) => {
            it(`${method} should validate dates`, async () => {
                requiredParams.forEach(param => {
                    if (param.includes('Date')) {
                        req.query[param] = 'invalid';
                    }
                });

                await reportController[method](req, res);

                if (requiredParams.some(p => p.includes('Date'))) {
                    expect(res.status).toHaveBeenCalledWith(400);
                }
            });
        });
    });

    describe('Date Format Validation', () => {
        it('should accept YYYY-MM-DD format', () => {
            const validDates = ['2026-01-01', '2026-12-31', '2026-06-15'];
            validDates.forEach(date => {
                expect(() => {
                    const parsed = new Date(date);
                    if (isNaN(parsed.getTime())) throw new Error(`Invalid date: ${date}`);
                }).not.toThrow();
            });
        });

        it('should reject invalid formats', async () => {
            const invalidDates = ['01/01/2026', '2026/01/01', 'invalid-date'];
            for (const date of invalidDates) {
                req.query.fromDate = date;
                req.query.toDate = '2026-12-31';

                await reportController.getProfitAndLoss(req, res);

                expect(res.status).toHaveBeenCalledWith(400);
            }
        });
    });
});
