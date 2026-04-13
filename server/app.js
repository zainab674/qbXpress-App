const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const AppStore = require('./models/AppStore');
const settingsRouter = require('./routes/settings');
const auth = require('./middleware/auth');
const companyAuth = require('./middleware/companyAuth');
const { ensureAllIndexes } = require('./db/indexes');

dotenv.config();

const app = express();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

if (!process.env.MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI is not defined');
    process.exit(1);
}

const corsOptions = {
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-ID', 'X-User-Role'],
};

app.use(cors(corsOptions));
// Ensure preflight OPTIONS always gets CORS headers (some proxies strip them)
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', CLIENT_ORIGIN);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Company-ID, X-User-Role');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        return res.status(204).end();
    }
    next();
});
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
// maxPoolSize=60 sustains 40 simultaneous app users plus headroom for background jobs.
// minPoolSize=5 keeps warm connections ready so the first queries after idle don't pay
// the TCP handshake cost.
mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 60,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 60000,
    heartbeatFrequencyMS: 10000,
    connectTimeoutMS: 10000,
    // Write concern: majority ensures data durability across replica set members
    w: 'majority',
    wtimeoutMS: 10000,
})
    .then(async () => {
        console.log('[DB] Connected to MongoDB');
        // Ensure all schema-defined indexes exist (non-blocking background task)
        ensureAllIndexes().catch(err => console.error('[DB] Index initialization error:', err));
        // Initialize scheduled report cron jobs after DB is ready
        require('./jobs/scheduledReportRunner').initScheduler();
    })
    .catch(err => {
        console.error('Could not connect to MongoDB', err);
        process.exit(1);
    });

// Monitor connection pool health for 40-user concurrency target
mongoose.connection.on('poolCreated', () => console.log('[DB] Connection pool created'));
mongoose.connection.on('connectionPoolReady', () => console.log('[DB] Connection pool ready'));
mongoose.connection.on('connectionCheckedOut', () => {
    const { poolSize, checkedOut } = mongoose.connection.db?.serverConfig?.s?.pool ?? {};
    if (checkedOut > 45) {
        console.warn(`[DB] High pool utilization: ${checkedOut} connections in use`);
    }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/companies', auth, require('./routes/companies'));
app.use('/api/backup', auth, require('./routes/backup'));

const companyRoutes = [
    'accounts', 'customers', 'vendors', 'transactions', 'items', 'employees', 'leads',
    'classes', 'sales-reps', 'terms', 'time-entries', 'reports', 'mileage-entries',
    'price-levels', 'sales-tax-codes', 'budgets', 'memorized-reports', 'liabilities',
    'custom-fields', 'currencies', 'audit-logs', 'fixed-assets', 'settings', 'utilities', 'bank-feeds', 'inventory', 'recurring-templates', 'warehouses', 'bins', 'landed-costs', 'uom-sets', 'jobs'
];

companyRoutes.forEach(route => {
    app.use(`/api/${route}`, auth, companyAuth, require(`./routes/${route}`));
});
app.use('/api/email', auth, require('./routes/email'));
app.use('/api/report-exports', auth, companyAuth, require('./routes/report-exports'));
app.use('/api/carrier', auth, companyAuth, require('./routes/carrier'));
app.use('/api/payroll-connect', require('./routes/payroll-connect'));

app.get('/api/store', auth, companyAuth, async (req, res, next) => {
    try {
        const store = await AppStore.findOne({ userId: req.user.id, companyId: req.companyId }).sort({ updatedAt: -1 });
        if (!store) return res.status(404).json({ message: 'No store data found' });
        res.json(store);
    } catch (err) {
        next(err);
    }
});

const errorHandler = require('./middleware/errorHandler');

// Recurring Transaction Processing
const RecurringTransactionService = require('./services/RecurringTransactionService');
// Initial run after a short delay to allow DB connection to stabilize
setTimeout(() => {
    RecurringTransactionService.processAll().catch(err => console.error('[App] Initial Recurring Processing Failed:', err));
}, 5000);
// Run every 6 hours
setInterval(() => {
    RecurringTransactionService.processAll().catch(err => console.error('[App] Scheduled Recurring Processing Failed:', err));
}, 6 * 60 * 60 * 1000);

app.use(errorHandler);

module.exports = app;

