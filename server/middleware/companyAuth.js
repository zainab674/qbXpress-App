
const Company = require('../models/Company');

const companyAuth = async (req, res, next) => {
    try {
        const companyId = req.headers['x-company-id'];
        if (!companyId) {
            return res.status(400).json({ message: 'X-Company-ID header is required' });
        }

        // Owner check: company belongs to this user
        let company = await Company.findOne({ _id: companyId, userId: req.user.id });

        // Member check: sub-user whose token carries a companyId assignment
        if (!company && req.user.companyId && req.user.companyId === companyId) {
            company = await Company.findById(companyId);
        }

        if (!company) {
            console.warn(`[companyAuth] Access denied — companyId=${companyId}, userId=${req.user?.id}, jwtCompanyId=${req.user?.companyId}`);
            return res.status(403).json({ message: 'Invalid Company ID or access denied' });
        }

        req.companyId = companyId;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = companyAuth;
