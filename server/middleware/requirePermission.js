const PERMISSIONS = require('../config/permissions');

/**
 * Express middleware factory.
 * Usage: router.post('/', requirePermission('transactions', 'write'), handler)
 */
const requirePermission = (resource, action) => (req, res, next) => {
    const rawRole = req.user?.role;
    // Normalise: if the role from the JWT isn't in PERMISSIONS, fall back to View-Only
    const role = PERMISSIONS[rawRole] ? rawRole : 'View-Only';
    if (rawRole && !PERMISSIONS[rawRole]) {
        console.warn(`[requirePermission] Unrecognised role "${rawRole}" — treating as View-Only. userId=${req.user?.id}`);
    }
    const allowed = PERMISSIONS[role]?.[resource] || [];
    if (!allowed.includes(action)) {
        return res.status(403).json({
            message: `Forbidden: your role (${role}) cannot perform "${action}" on "${resource}".`,
            type: 'PERMISSION_DENIED',
        });
    }
    next();
};

module.exports = requirePermission;
