
const Company = require('../models/Company');

const companyAuth = async (req, res, next) => {
    try {
        const companyId = req.headers['x-company-id'];
        if (!companyId) {
            return res.status(400).json({ message: 'X-Company-ID header is required' });
        }

        const company = await Company.findOne({ _id: companyId, userId: req.user.id });
        if (!company) {
            return res.status(403).json({ message: 'Invalid Company ID or access denied' });
        }

        req.companyId = companyId;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = companyAuth;
