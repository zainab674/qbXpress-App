/**
 * carrierService.js
 * Production carrier API integration: UPS, FedEx, USPS
 *
 * Environment variables required:
 *   UPS_CLIENT_ID, UPS_CLIENT_SECRET, UPS_ACCOUNT_NUMBER
 *   FEDEX_CLIENT_ID, FEDEX_CLIENT_SECRET, FEDEX_ACCOUNT_NUMBER
 *   USPS_CLIENT_ID, USPS_CLIENT_SECRET
 *   CARRIER_SANDBOX=true  (set to 'true' for sandbox/test mode)
 *
 * All three carriers use OAuth 2.0 client_credentials grant.
 * Tokens are cached in-memory with a 5-minute safety buffer before expiry.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const SANDBOX = process.env.CARRIER_SANDBOX === 'true';

// ── Token Cache ────────────────────────────────────────────────────────────────
const tokenCache = {};

async function httpRequest(options, body) {
    return new Promise((resolve, reject) => {
        const protocol = options.protocol === 'http:' ? http : https;
        const req = protocol.request(options, (res) => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function fetchJson(urlStr, options = {}) {
    const u = new URL(urlStr);
    const isHttps = u.protocol === 'https:';
    const protocol = isHttps ? https : http;

    const reqOptions = {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: options.headers || {},
    };

    const body = options.body ? JSON.stringify(options.body) : null;
    if (body) {
        reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    return new Promise((resolve, reject) => {
        const req = protocol.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function fetchForm(urlStr, formData, headers = {}) {
    const u = new URL(urlStr);
    const isHttps = u.protocol === 'https:';
    const protocol = isHttps ? https : http;
    const body = new URLSearchParams(formData).toString();

    const reqOptions = {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
            ...headers,
        },
    };

    return new Promise((resolve, reject) => {
        const req = protocol.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── UPS ────────────────────────────────────────────────────────────────────────
const UPS_BASE = SANDBOX
    ? 'https://wwwcie.ups.com'
    : 'https://onlinetools.ups.com';

async function getUPSToken() {
    const cacheKey = 'ups';
    const cached = tokenCache[cacheKey];
    if (cached && cached.expiresAt > Date.now()) return cached.token;

    const clientId = process.env.UPS_CLIENT_ID;
    const clientSecret = process.env.UPS_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('UPS credentials not configured');

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetchForm(
        `${UPS_BASE}/security/v1/oauth/token`,
        { grant_type: 'client_credentials' },
        { Authorization: `Basic ${credentials}` }
    );

    if (res.status !== 200 || !res.body.access_token) {
        throw new Error(`UPS auth failed: ${JSON.stringify(res.body)}`);
    }

    const token = res.body.access_token;
    const expiresIn = (res.body.expires_in || 3600) - 300; // 5-min buffer
    tokenCache[cacheKey] = { token, expiresAt: Date.now() + expiresIn * 1000 };
    return token;
}

/**
 * Get UPS rates for multiple service levels ("Shop" mode).
 * @param {object} payload - { originZip, destZip, destCountry, packages, accountNumber }
 * @returns {Array} Normalized rate options
 */
async function getUPSRates(payload) {
    const { originZip, destZip, destCountry = 'US', packages } = payload;
    const accountNumber = process.env.UPS_ACCOUNT_NUMBER || '';

    const token = await getUPSToken();

    const rateRequest = {
        RateRequest: {
            Request: { RequestOption: 'Shop' },
            Shipment: {
                Shipper: {
                    ShipperNumber: accountNumber,
                    Address: { PostalCode: originZip, CountryCode: 'US' },
                },
                ShipTo: {
                    Address: { PostalCode: destZip, CountryCode: destCountry, ResidentialAddressIndicator: '' },
                },
                ShipFrom: {
                    Address: { PostalCode: originZip, CountryCode: 'US' },
                },
                Package: packages.map(pkg => ({
                    PackagingType: { Code: '02' }, // Customer-supplied package
                    Dimensions: {
                        UnitOfMeasurement: { Code: pkg.dimUnit === 'cm' ? 'CM' : 'IN' },
                        Length: String(pkg.length || 1),
                        Width: String(pkg.width || 1),
                        Height: String(pkg.height || 1),
                    },
                    PackageWeight: {
                        UnitOfMeasurement: { Code: pkg.weightUnit === 'kg' ? 'KGS' : 'LBS' },
                        Weight: String(pkg.weight || 0.1),
                    },
                })),
            },
        },
    };

    const res = await fetchJson(`${UPS_BASE}/api/rating/v2205/Shop`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            transId: `qbx-${Date.now()}`,
            transactionSrc: 'qbXpress',
        },
        body: rateRequest,
    });

    if (res.status !== 200) {
        const errMsg = res.body?.response?.errors?.[0]?.message || JSON.stringify(res.body);
        throw new Error(`UPS Rating API error: ${errMsg}`);
    }

    const services = res.body?.RateResponse?.RatedShipment || [];
    const UPS_SERVICE_NAMES = {
        '01': 'UPS Next Day Air',
        '02': 'UPS 2nd Day Air',
        '03': 'UPS Ground',
        '07': 'UPS Worldwide Express',
        '08': 'UPS Worldwide Expedited',
        '11': 'UPS Standard',
        '12': 'UPS 3 Day Select',
        '13': 'UPS Next Day Air Saver',
        '14': 'UPS Next Day Air Early',
        '54': 'UPS Worldwide Express Plus',
        '59': 'UPS 2nd Day Air A.M.',
        '65': 'UPS Worldwide Saver',
    };

    return services.map(svc => ({
        carrier: 'UPS',
        serviceCode: svc.Service?.Code || '',
        serviceName: UPS_SERVICE_NAMES[svc.Service?.Code] || `UPS Service ${svc.Service?.Code}`,
        totalCharges: parseFloat(svc.TotalCharges?.MonetaryValue || '0'),
        currency: svc.TotalCharges?.CurrencyCode || 'USD',
        deliveryDays: svc.GuaranteedDelivery?.BusinessDaysInTransit
            ? parseInt(svc.GuaranteedDelivery.BusinessDaysInTransit)
            : svc.TimeInTransit?.PickupDayCount
                ? parseInt(svc.TimeInTransit.PickupDayCount)
                : null,
        deliveryDate: svc.GuaranteedDelivery?.DeliveryByTime || null,
    })).sort((a, b) => a.totalCharges - b.totalCharges);
}

// ── FedEx ──────────────────────────────────────────────────────────────────────
const FEDEX_BASE = SANDBOX
    ? 'https://apis-sandbox.fedex.com'
    : 'https://apis.fedex.com';

async function getFedExToken() {
    const cacheKey = 'fedex';
    const cached = tokenCache[cacheKey];
    if (cached && cached.expiresAt > Date.now()) return cached.token;

    const clientId = process.env.FEDEX_CLIENT_ID;
    const clientSecret = process.env.FEDEX_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('FedEx credentials not configured');

    const res = await fetchForm(`${FEDEX_BASE}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
    });

    if (res.status !== 200 || !res.body.access_token) {
        throw new Error(`FedEx auth failed: ${JSON.stringify(res.body)}`);
    }

    const token = res.body.access_token;
    const expiresIn = (res.body.expires_in || 3600) - 300;
    tokenCache[cacheKey] = { token, expiresAt: Date.now() + expiresIn * 1000 };
    return token;
}

/**
 * Get FedEx rates for all available services.
 * @param {object} payload - { originZip, destZip, destCountry, packages }
 * @returns {Array} Normalized rate options
 */
async function getFedExRates(payload) {
    const { originZip, destZip, destCountry = 'US', packages } = payload;
    const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER || '';

    const token = await getFedExToken();

    const rateRequest = {
        accountNumber: { value: accountNumber },
        requestedShipment: {
            shipper: { address: { postalCode: originZip, countryCode: 'US' } },
            recipient: { address: { postalCode: destZip, countryCode: destCountry, residential: false } },
            pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
            rateRequestType: ['ACCOUNT', 'LIST'],
            requestedPackageLineItems: packages.map((pkg, idx) => ({
                sequenceNumber: idx + 1,
                weight: {
                    units: pkg.weightUnit === 'kg' ? 'KG' : 'LB',
                    value: pkg.weight || 0.1,
                },
                dimensions: pkg.length && pkg.width && pkg.height ? {
                    length: pkg.length,
                    width: pkg.width,
                    height: pkg.height,
                    units: pkg.dimUnit === 'cm' ? 'CM' : 'IN',
                } : undefined,
            })),
        },
    };

    const res = await fetchJson(`${FEDEX_BASE}/rate/v1/rates/quotes`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-locale': 'en_US',
        },
        body: rateRequest,
    });

    if (res.status !== 200) {
        const errMsg = res.body?.errors?.[0]?.message || JSON.stringify(res.body);
        throw new Error(`FedEx Rating API error: ${errMsg}`);
    }

    const details = res.body?.output?.rateReplyDetails || [];

    return details.map(svc => {
        const rated = svc.ratedShipmentDetails?.[0];
        const totalCharge = rated?.totalNetCharge ?? rated?.totalNetFedExCharge ?? 0;
        const currency = rated?.currency || 'USD';
        const commit = svc.commit;

        return {
            carrier: 'FedEx',
            serviceCode: svc.serviceType || '',
            serviceName: svc.serviceName || svc.serviceType || 'FedEx Service',
            totalCharges: parseFloat(String(totalCharge)),
            currency,
            deliveryDays: commit?.transitDays ? parseInt(commit.transitDays) : null,
            deliveryDate: commit?.dateDetail?.dayFormat || null,
        };
    }).sort((a, b) => a.totalCharges - b.totalCharges);
}

// ── USPS ───────────────────────────────────────────────────────────────────────
const USPS_BASE = SANDBOX
    ? 'https://api.usps.com' // USPS does not have a separate sandbox host; use test credentials
    : 'https://api.usps.com';

async function getUSPSToken() {
    const cacheKey = 'usps';
    const cached = tokenCache[cacheKey];
    if (cached && cached.expiresAt > Date.now()) return cached.token;

    const clientId = process.env.USPS_CLIENT_ID;
    const clientSecret = process.env.USPS_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('USPS credentials not configured');

    const res = await fetchForm(`${USPS_BASE}/oauth2/v3/token`, {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'prices',
    });

    if (res.status !== 200 || !res.body.access_token) {
        throw new Error(`USPS auth failed: ${JSON.stringify(res.body)}`);
    }

    const token = res.body.access_token;
    const expiresIn = (res.body.expires_in || 3600) - 300;
    tokenCache[cacheKey] = { token, expiresAt: Date.now() + expiresIn * 1000 };
    return token;
}

/**
 * Get USPS rates using the Prices v3 API.
 * @param {object} payload - { originZip, destZip, packages }
 * @returns {Array} Normalized rate options
 */
async function getUSPSRates(payload) {
    const { originZip, destZip, packages } = payload;
    const token = await getUSPSToken();

    // USPS rates are per-package; aggregate across all packages
    const allRates = {};

    for (const pkg of packages) {
        const weightOz = pkg.weightUnit === 'kg'
            ? Math.round(pkg.weight * 35.274)
            : Math.round((pkg.weight || 0.1) * 16);

        const requestBody = {
            originZIPCode: originZip,
            destinationZIPCode: destZip,
            weight: weightOz,
            length: pkg.dimUnit === 'cm' ? Math.round(pkg.length / 2.54) : (pkg.length || 1),
            width: pkg.dimUnit === 'cm' ? Math.round(pkg.width / 2.54) : (pkg.width || 1),
            height: pkg.dimUnit === 'cm' ? Math.round(pkg.height / 2.54) : (pkg.height || 1),
            mailClass: 'ALL',
            processingCategory: 'NON_MACHINABLE',
            destinationEntryFacilityType: 'NONE',
            rateIndicator: 'DR',
            priceType: 'RETAIL',
        };

        const res = await fetchJson(`${USPS_BASE}/prices/v3/base-rates/search`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: requestBody,
        });

        if (res.status !== 200) continue;

        const rates = res.body?.rates || [];
        rates.forEach(r => {
            const key = r.mailClass;
            allRates[key] = {
                carrier: 'USPS',
                serviceCode: r.mailClass || '',
                serviceName: r.description || r.mailClass || 'USPS Service',
                totalCharges: (allRates[key]?.totalCharges || 0) + parseFloat(String(r.price || 0)),
                currency: 'USD',
                deliveryDays: r.committedDeliveryDays || null,
                deliveryDate: null,
            };
        });
    }

    return Object.values(allRates).sort((a, b) => a.totalCharges - b.totalCharges);
}

// ── Tracking ───────────────────────────────────────────────────────────────────
/**
 * UPS Tracking API (v1)
 * Returns normalized tracking events.
 */
async function trackUPS(trackingNumber) {
    const token = await getUPSToken();
    const res = await fetchJson(
        `${UPS_BASE}/api/track/v1/details/${encodeURIComponent(trackingNumber)}?locale=en_US&returnMilestones=false&returnPOD=false`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                transId: `qbx-track-${Date.now()}`,
                transactionSrc: 'qbXpress',
            },
        }
    );

    if (res.status !== 200) {
        throw new Error(`UPS tracking error: ${res.body?.response?.errors?.[0]?.message || res.status}`);
    }

    const pkg = res.body?.trackResponse?.shipment?.[0]?.package?.[0];
    if (!pkg) return { status: 'Unknown', events: [] };

    return {
        status: pkg.status?.description || 'Unknown',
        statusCode: pkg.status?.code || '',
        estimatedDelivery: pkg.deliveryDate?.[0]?.date || null,
        events: (pkg.activity || []).map(a => ({
            timestamp: `${a.date} ${a.time}`,
            description: a.status?.description || '',
            location: [a.location?.address?.city, a.location?.address?.stateProvince, a.location?.address?.countryCode]
                .filter(Boolean).join(', '),
        })),
    };
}

/**
 * FedEx Track API v1
 */
async function trackFedEx(trackingNumber) {
    const token = await getFedExToken();
    const res = await fetchJson(`${FEDEX_BASE}/track/v1/trackingnumbers`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-locale': 'en_US',
        },
        body: {
            trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
            includeDetailedScans: true,
        },
    });

    if (res.status !== 200) {
        throw new Error(`FedEx tracking error: ${res.body?.errors?.[0]?.message || res.status}`);
    }

    const detail = res.body?.output?.completeTrackResults?.[0]?.trackResults?.[0];
    if (!detail) return { status: 'Unknown', events: [] };

    return {
        status: detail.latestStatusDetail?.description || 'Unknown',
        statusCode: detail.latestStatusDetail?.code || '',
        estimatedDelivery: detail.estimatedDeliveryTimeWindow?.window?.ends || null,
        events: (detail.scanEvents || []).map(e => ({
            timestamp: e.date,
            description: e.eventDescription || '',
            location: [e.scanLocation?.city, e.scanLocation?.stateOrProvinceCode, e.scanLocation?.countryCode]
                .filter(Boolean).join(', '),
        })),
    };
}

/**
 * USPS Tracking API v3
 */
async function trackUSPS(trackingNumber) {
    const token = await getUSPSToken();
    const res = await fetchJson(
        `${USPS_BASE}/tracking/v3/tracking/${encodeURIComponent(trackingNumber)}?expand=DETAIL`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (res.status !== 200) {
        throw new Error(`USPS tracking error: ${res.body?.error?.message || res.status}`);
    }

    const data = res.body;
    return {
        status: data.statusCategory || data.status || 'Unknown',
        statusCode: data.statusCategoryCode || '',
        estimatedDelivery: data.expectedDeliveryDate || null,
        events: (data.trackSummary?.eventSummaries || []).map(e => ({
            timestamp: `${e.eventDate} ${e.eventTime}`,
            description: e.event || '',
            location: [e.eventCity, e.eventState, e.eventZIPCode].filter(Boolean).join(', '),
        })),
    };
}

// ── Validate Tracking Number Format ───────────────────────────────────────────
function validateTrackingFormat(carrier, trackingNumber) {
    if (!trackingNumber) return { valid: false, error: 'Tracking number is required' };

    const tn = trackingNumber.replace(/\s/g, '');

    const patterns = {
        UPS: /^1Z[0-9A-Z]{16}$|^[0-9]{18}$|^[0-9]{12}$/,
        FedEx: /^[0-9]{12}$|^[0-9]{15}$|^[0-9]{20}$|^[0-9]{22}$/,
        USPS: /^[0-9]{20,22}$|^[0-9]{13}$|^[A-Z]{2}[0-9]{9}US$/,
        DHL: /^[0-9]{10,11}$|^JD[0-9]{18}$/,
    };

    const pattern = patterns[carrier];
    if (!pattern) return { valid: true }; // No validation for unknown carriers

    return pattern.test(tn)
        ? { valid: true }
        : { valid: false, error: `Invalid ${carrier} tracking number format` };
}

// ── Public API ─────────────────────────────────────────────────────────────────
/**
 * Get shipping rates from one or more carriers.
 * @param {string[]} carriers - e.g. ['UPS', 'FedEx', 'USPS']
 * @param {object} payload - { originZip, destZip, destCountry, packages }
 * @returns {object} { results: { carrier: rates[] }, errors: { carrier: message } }
 */
async function getRates(carriers, payload) {
    const results = {};
    const errors = {};

    const tasks = carriers.map(async (carrier) => {
        try {
            if (carrier === 'UPS') results.UPS = await getUPSRates(payload);
            else if (carrier === 'FedEx') results.FedEx = await getFedExRates(payload);
            else if (carrier === 'USPS') results.USPS = await getUSPSRates(payload);
        } catch (err) {
            errors[carrier] = err.message;
        }
    });

    await Promise.all(tasks);
    return { results, errors };
}

/**
 * Track a shipment.
 * @param {string} carrier - 'UPS' | 'FedEx' | 'USPS'
 * @param {string} trackingNumber
 * @returns {object} Normalized tracking result
 */
async function trackShipment(carrier, trackingNumber) {
    if (carrier === 'UPS') return trackUPS(trackingNumber);
    if (carrier === 'FedEx') return trackFedEx(trackingNumber);
    if (carrier === 'USPS') return trackUSPS(trackingNumber);
    throw new Error(`Tracking not supported for carrier: ${carrier}`);
}

/**
 * Check which carriers are configured (have credentials).
 */
function getConfiguredCarriers() {
    const configured = [];
    if (process.env.UPS_CLIENT_ID && process.env.UPS_CLIENT_SECRET) configured.push('UPS');
    if (process.env.FEDEX_CLIENT_ID && process.env.FEDEX_CLIENT_SECRET) configured.push('FedEx');
    if (process.env.USPS_CLIENT_ID && process.env.USPS_CLIENT_SECRET) configured.push('USPS');
    return configured;
}

module.exports = {
    getRates,
    trackShipment,
    validateTrackingFormat,
    getConfiguredCarriers,
};
