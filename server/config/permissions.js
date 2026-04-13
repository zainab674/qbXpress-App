// Feature-action permission map for all 4 roles.
// Each role lists the actions it may perform per resource.
const PERMISSIONS = {
    Admin: {
        transactions: ['read', 'write', 'delete', 'void'],
        reports:      ['read', 'export', 'schedule'],
        items:        ['read', 'write', 'delete'],
        customers:    ['read', 'write', 'delete'],
        vendors:      ['read', 'write', 'delete'],
        employees:    ['read', 'write', 'delete'],
        inventory:    ['read', 'write', 'adjust'],
        users:        ['read', 'write', 'delete'],
        settings:     ['read', 'write'],
    },
    Manager: {
        transactions: ['read', 'write', 'void'],
        reports:      ['read', 'export', 'schedule'],
        items:        ['read', 'write'],
        customers:    ['read', 'write'],
        vendors:      ['read', 'write'],
        employees:    ['read', 'write'],
        inventory:    ['read', 'write', 'adjust'],
        users:        ['read'],
        settings:     ['read'],
    },
    Standard: {
        transactions: ['read', 'write'],
        reports:      ['read'],
        items:        ['read', 'write'],
        customers:    ['read', 'write'],
        vendors:      ['read', 'write'],
        employees:    ['read'],
        inventory:    ['read', 'write'],
        users:        [],
        settings:     [],
    },
    'View-Only': {
        transactions: ['read'],
        reports:      ['read'],
        items:        ['read'],
        customers:    ['read'],
        vendors:      ['read'],
        employees:    ['read'],
        inventory:    ['read'],
        users:        [],
        settings:     [],
    },
};

module.exports = PERMISSIONS;
