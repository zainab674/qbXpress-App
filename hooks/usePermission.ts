import { useData } from '../contexts/DataContext';

type Role = 'Admin' | 'Manager' | 'Standard' | 'View-Only';
type Resource = 'transactions' | 'reports' | 'items' | 'customers' | 'vendors' | 'employees' | 'inventory' | 'users' | 'settings';
type Action = 'read' | 'write' | 'delete' | 'void' | 'export' | 'schedule' | 'adjust';

const PERMISSIONS: Record<Role, Partial<Record<Resource, Action[]>>> = {
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

export const usePermission = (resource: Resource, action: Action): boolean => {
    const { userRole } = useData();
    const role = (userRole || 'Standard') as Role;
    return (PERMISSIONS[role]?.[resource] || []).includes(action);
};
