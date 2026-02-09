
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
const PORT = process.env.PORT || 5000;

if (!process.env.MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI is not defined');
    process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('Could not connect to MongoDB', err);
        process.exit(1);
    });

// Routes
// (app.use calls remain the same)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', auth, require('./routes/companies'));
app.use('/api/backup', auth, require('./routes/backup'));

const companyRoutes = [
    'accounts', 'customers', 'vendors', 'transactions', 'items', 'employees', 'leads',
    'classes', 'sales-reps', 'terms', 'time-entries', 'reports', 'mileage-entries',
    'price-levels', 'sales-tax-codes', 'budgets', 'memorized-reports', 'liabilities',
    'custom-fields', 'currencies', 'audit-logs', 'fixed-assets', 'settings', 'utilities', 'bank-feeds'
];

companyRoutes.forEach(route => {
    app.use(`/api/${route}`, auth, companyAuth, require(`./routes/${route}`));
});
app.use('/api/email', auth, require('./routes/email'));

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

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
