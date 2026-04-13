/**
 * carrierController.js
 * REST controller for carrier API: rates, tracking, config status.
 */

const carrierService = require('../services/carrierService');

const SUPPORTED_CARRIERS = ['UPS', 'FedEx', 'USPS', 'DHL', 'Freight', 'Courier', 'Other'];
const API_CARRIERS = ['UPS', 'FedEx', 'USPS'];

/**
 * POST /api/carrier/rates
 * Body: {
 *   carriers: string[],        // e.g. ['UPS','FedEx','USPS'] — omit for all configured
 *   originZip: string,
 *   destZip: string,
 *   destCountry?: string,      // default 'US'
 *   packages: [{
 *     weight: number,
 *     weightUnit: 'lb'|'kg',
 *     length: number,
 *     width: number,
 *     height: number,
 *     dimUnit: 'in'|'cm',
 *   }]
 * }
 */
const getRates = async (req, res) => {
    try {
        const { carriers, originZip, destZip, destCountry = 'US', packages } = req.body;

        // Validate required fields
        if (!originZip || !destZip) {
            return res.status(400).json({
                error: 'originZip and destZip are required',
                type: 'VALIDATION_ERROR',
            });
        }

        if (!packages || !Array.isArray(packages) || packages.length === 0) {
            return res.status(400).json({
                error: 'packages array is required and must not be empty',
                type: 'VALIDATION_ERROR',
            });
        }

        // ZIP validation (US 5-digit; allow 5+4 format)
        const zipPattern = /^\d{5}(-\d{4})?$/;
        if (!zipPattern.test(originZip.trim())) {
            return res.status(400).json({ error: 'Invalid originZip format', type: 'VALIDATION_ERROR' });
        }
        if (destCountry === 'US' && !zipPattern.test(destZip.trim())) {
            return res.status(400).json({ error: 'Invalid destZip format', type: 'VALIDATION_ERROR' });
        }

        // Validate each package
        for (const [i, pkg] of packages.entries()) {
            if (!pkg.weight || pkg.weight <= 0) {
                return res.status(400).json({
                    error: `Package ${i + 1}: weight must be > 0`,
                    type: 'VALIDATION_ERROR',
                });
            }
        }

        // Determine which carriers to query
        const configuredCarriers = carrierService.getConfiguredCarriers();
        const requestedCarriers = carriers
            ? carriers.filter(c => API_CARRIERS.includes(c))
            : configuredCarriers;

        if (requestedCarriers.length === 0) {
            return res.status(200).json({
                results: {},
                errors: {},
                configuredCarriers,
                message: 'No carrier API credentials configured. Add UPS_CLIENT_ID/UPS_CLIENT_SECRET, FEDEX_CLIENT_ID/FEDEX_CLIENT_SECRET, or USPS_CLIENT_ID/USPS_CLIENT_SECRET to your environment.',
            });
        }

        const payload = {
            originZip: originZip.trim(),
            destZip: destZip.trim(),
            destCountry,
            packages,
        };

        const { results, errors } = await carrierService.getRates(requestedCarriers, payload);

        // Flatten all results into a single sorted list
        const allRates = Object.values(results).flat().sort((a, b) => a.totalCharges - b.totalCharges);

        return res.json({
            results,
            allRates,
            errors,
            configuredCarriers,
        });
    } catch (err) {
        console.error('[carrierController.getRates]', err.message);
        return res.status(500).json({ error: err.message, type: 'SERVER_ERROR' });
    }
};

/**
 * GET /api/carrier/track/:carrier/:trackingNumber
 * Params: carrier (UPS|FedEx|USPS), trackingNumber
 */
const trackShipment = async (req, res) => {
    try {
        const { carrier, trackingNumber } = req.params;

        if (!API_CARRIERS.includes(carrier)) {
            return res.status(400).json({
                error: `Tracking is only supported for: ${API_CARRIERS.join(', ')}`,
                type: 'VALIDATION_ERROR',
            });
        }

        if (!trackingNumber || trackingNumber.length < 5) {
            return res.status(400).json({ error: 'Invalid tracking number', type: 'VALIDATION_ERROR' });
        }

        // Validate format before calling API
        const formatCheck = carrierService.validateTrackingFormat(carrier, trackingNumber);
        if (!formatCheck.valid) {
            return res.status(400).json({ error: formatCheck.error, type: 'VALIDATION_ERROR' });
        }

        const trackingData = await carrierService.trackShipment(carrier, trackingNumber);
        return res.json(trackingData);
    } catch (err) {
        console.error('[carrierController.trackShipment]', err.message);
        return res.status(500).json({ error: err.message, type: 'SERVER_ERROR' });
    }
};

/**
 * GET /api/carrier/validate/:carrier/:trackingNumber
 * Validates tracking number format without calling external API.
 */
const validateTracking = (req, res) => {
    const { carrier, trackingNumber } = req.params;
    const result = carrierService.validateTrackingFormat(carrier, trackingNumber);
    return res.json(result);
};

/**
 * GET /api/carrier/status
 * Returns which carriers are configured (have API credentials set).
 */
const getStatus = (req, res) => {
    const configuredCarriers = carrierService.getConfiguredCarriers();
    const status = SUPPORTED_CARRIERS.map(c => ({
        carrier: c,
        apiEnabled: API_CARRIERS.includes(c) && configuredCarriers.includes(c),
        apiSupported: API_CARRIERS.includes(c),
    }));
    return res.json({ status, sandbox: process.env.CARRIER_SANDBOX === 'true' });
};

module.exports = { getRates, trackShipment, validateTracking, getStatus };
