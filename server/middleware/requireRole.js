/**
 * Middleware: restrict endpoint to users with one of the specified roles.
 * Usage: router.get('/', requireRole('Admin'), handler)
 *        router.get('/', requireRole('Admin', 'Manager'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
    const userRole = req.user?.role;
    if (!roles.includes(userRole)) {
        return res.status(403).json({
            message: `Forbidden: requires one of [${roles.join(', ')}], your role is "${userRole}".`,
            type: 'ROLE_DENIED',
        });
    }
    next();
};

module.exports = requireRole;
