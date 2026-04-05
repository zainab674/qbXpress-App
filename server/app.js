const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const AppStore = require('./models/AppStore');
const settingsRouter = require('./routes/settings');
const auth = require('./middleware/auth');
const companyAuth = require('./middleware/companyAuth');

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
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('Could not connect to MongoDB', err);
        process.exit(1);
    });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', auth, require('./routes/companies'));
app.use('/api/backup', auth, require('./routes/backup'));

const companyRoutes = [
    'accounts', 'customers', 'vendors', 'transactions', 'items', 'employees', 'leads',
    'classes', 'sales-reps', 'terms', 'time-entries', 'reports', 'mileage-entries',
    'price-levels', 'sales-tax-codes', 'budgets', 'memorized-reports', 'liabilities',
    'custom-fields', 'currencies', 'audit-logs', 'fixed-assets', 'settings', 'utilities', 'bank-feeds', 'inventory', 'recurring-templates'
];

companyRoutes.forEach(route => {
    app.use(`/api/${route}`, auth, companyAuth, require(`./routes/${route}`));
});
app.use('/api/email', auth, require('./routes/email'));
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

