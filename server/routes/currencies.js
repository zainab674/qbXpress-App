const express = require('express');
const router = express.Router();
const { randomUUID: uuidv4 } = require('crypto');
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const CurrencyService = require('../services/CurrencyService');
const ExchangeRate = require('../models/ExchangeRate');

// ── Currency CRUD ─────────────────────────────────────────────────────────────
router.get('/',     requirePermission('settings', 'read'),  async (req, res, next) => {
    try { res.json(await CurrencyService.getAll(req.user.id, req.companyId)); }
    catch (err) { next(err); }
});

router.get('/:id',  requirePermission('settings', 'read'),  async (req, res, next) => {
    try {
        const c = await CurrencyService.getOne(req.params.id, req.user.id, req.companyId);
        if (!c) return res.status(404).json({ message: 'Currency not found' });
        res.json(c);
    } catch (err) { next(err); }
});

router.post('/',    requirePermission('settings', 'write'), async (req, res, next) => {
    try { res.json(await CurrencyService.save(req.body, req.user.id, req.companyId)); }
    catch (err) { next(err); }
});

router.delete('/:id', requirePermission('settings', 'write'), async (req, res, next) => {
    try { res.json(await CurrencyService.delete(req.params.id, req.user.id, req.companyId)); }
    catch (err) { next(err); }
});

// ── Exchange Rate CRUD ────────────────────────────────────────────────────────
// GET /currencies/exchange-rates           – all rates for this company
// GET /currencies/exchange-rates/:id       – single rate record
// POST /currencies/exchange-rates          – create / update rate
// DELETE /currencies/exchange-rates/:id   – remove rate

router.get('/exchange-rates', requirePermission('settings', 'read'), async (req, res, next) => {
    try {
        const { currencyId, asOfDate } = req.query;
        const query = { userId: req.user.id, companyId: req.companyId };
        if (currencyId) query.currencyId = currencyId;
        if (asOfDate) query.asOfDate = asOfDate;
        const rates = await ExchangeRate.find(query).sort({ asOfDate: -1, currencyId: 1 }).lean();
        res.json(rates);
    } catch (err) { next(err); }
});

router.get('/exchange-rates/latest', requirePermission('settings', 'read'), async (req, res, next) => {
    try {
        // Return the most recent rate for every currency in this company
        const rates = await ExchangeRate.aggregate([
            { $match: { userId: req.user.id, companyId: req.companyId } },
            { $sort: { asOfDate: -1 } },
            { $group: { _id: '$currencyId', doc: { $first: '$$ROOT' } } },
            { $replaceRoot: { newRoot: '$doc' } },
            { $sort: { currencyId: 1 } },
        ]);
        res.json(rates);
    } catch (err) { next(err); }
});

router.get('/exchange-rates/:id', requirePermission('settings', 'read'), async (req, res, next) => {
    try {
        const rate = await ExchangeRate.findOne({ id: req.params.id, userId: req.user.id, companyId: req.companyId }).lean();
        if (!rate) return res.status(404).json({ message: 'Exchange rate not found' });
        res.json(rate);
    } catch (err) { next(err); }
});

router.post('/exchange-rates', requirePermission('settings', 'write'), async (req, res, next) => {
    try {
        const { currencyId, rate, asOfDate } = req.body;
        if (!currencyId) return res.status(400).json({ message: 'currencyId is required' });
        if (rate == null || isNaN(Number(rate)) || Number(rate) <= 0) {
            return res.status(400).json({ message: 'rate must be a positive number' });
        }
        if (!asOfDate || !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
            return res.status(400).json({ message: 'asOfDate must be YYYY-MM-DD' });
        }

        const id = req.body.id || uuidv4();
        const record = await ExchangeRate.findOneAndUpdate(
            { id, userId: req.user.id, companyId: req.companyId },
            { id, currencyId, rate: Number(rate), asOfDate, userId: req.user.id, companyId: req.companyId },
            { upsert: true, new: true }
        );
        res.json(record);
    } catch (err) { next(err); }
});

router.delete('/exchange-rates/:id', requirePermission('settings', 'write'), async (req, res, next) => {
    try {
        const deleted = await ExchangeRate.findOneAndDelete({ id: req.params.id, userId: req.user.id, companyId: req.companyId });
        if (!deleted) return res.status(404).json({ message: 'Exchange rate not found' });
        res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
});

// ── Conversion helper ─────────────────────────────────────────────────────────
// POST /currencies/convert  { fromCurrencyId, toCurrencyId, amount, asOfDate? }
// Returns { result, rate, asOfDate } using the most recent rate on or before asOfDate.
router.post('/convert', requirePermission('settings', 'read'), async (req, res, next) => {
    try {
        const { fromCurrencyId, toCurrencyId, amount, asOfDate } = req.body;
        if (!fromCurrencyId || !toCurrencyId || amount == null) {
            return res.status(400).json({ message: 'fromCurrencyId, toCurrencyId, amount are required' });
        }
        if (fromCurrencyId === toCurrencyId) {
            return res.json({ result: Number(amount), rate: 1, asOfDate: asOfDate || null });
        }

        const dateFilter = asOfDate ? { $lte: asOfDate } : {};

        // Find home currency (isHome flag on Currency)
        const Currency = require('../models/Currency');
        const homeCurrency = await Currency.findOne({ isHome: true, userId: req.user.id, companyId: req.companyId }).lean();

        const getRateForCurrency = async (currencyId) => {
            const q = { currencyId, userId: req.user.id, companyId: req.companyId };
            if (asOfDate) q.asOfDate = { $lte: asOfDate };
            const r = await ExchangeRate.findOne(q).sort({ asOfDate: -1 }).lean();
            return r ? r.rate : null;
        };

        // If one side is home currency, one lookup suffices
        if (homeCurrency && fromCurrencyId === homeCurrency.id) {
            const toRate = await getRateForCurrency(toCurrencyId);
            if (!toRate) return res.status(404).json({ message: `No exchange rate found for currency ${toCurrencyId}` });
            return res.json({ result: Number(amount) / toRate, rate: 1 / toRate, asOfDate: asOfDate || null });
        }
        if (homeCurrency && toCurrencyId === homeCurrency.id) {
            const fromRate = await getRateForCurrency(fromCurrencyId);
            if (!fromRate) return res.status(404).json({ message: `No exchange rate found for currency ${fromCurrencyId}` });
            return res.json({ result: Number(amount) * fromRate, rate: fromRate, asOfDate: asOfDate || null });
        }

        // Cross-rate: from → home → to
        const [fromRate, toRate] = await Promise.all([
            getRateForCurrency(fromCurrencyId),
            getRateForCurrency(toCurrencyId),
        ]);
        if (!fromRate) return res.status(404).json({ message: `No exchange rate found for currency ${fromCurrencyId}` });
        if (!toRate)   return res.status(404).json({ message: `No exchange rate found for currency ${toCurrencyId}` });

        const crossRate = fromRate / toRate;
        res.json({ result: Number(amount) * crossRate, rate: crossRate, asOfDate: asOfDate || null });
    } catch (err) { next(err); }
});

module.exports = router;
