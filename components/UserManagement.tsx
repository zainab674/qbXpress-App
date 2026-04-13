import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { useData } from '../contexts/DataContext';

type Role = 'Admin' | 'Manager' | 'Standard' | 'View-Only';

interface AppUser {
    _id: string;
    username: string;
    email: string;
    role: Role;
    createdAt: string;
}

const ROLES: Role[] = ['Admin', 'Manager', 'Standard', 'View-Only'];

const ROLE_COLORS: Record<Role, string> = {
    Admin: 'bg-red-100 text-red-700 border border-red-200',
    Manager: 'bg-blue-100 text-blue-700 border border-blue-200',
    Standard: 'bg-green-100 text-green-700 border border-green-200',
    'View-Only': 'bg-gray-100 text-gray-600 border border-gray-200',
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800 text-base">{title}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-5">{children}</div>
        </div>
    </div>
);

const UserManagement: React.FC = () => {
    const { userRole } = useData();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // New user modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<Role>('Standard');

    // Edit role modal
    const [editUser, setEditUser] = useState<AppUser | null>(null);
    const [editRole, setEditRole] = useState<Role>('Standard');

    // Reset password modal
    const [resetUser, setResetUser] = useState<AppUser | null>(null);
    const [resetPassword, setResetPassword] = useState('');

    const [submitting, setSubmitting] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.fetchUsers();
            setUsers(data);
        } catch (e: any) {
            setError(e.message || 'Failed to load users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    const flash = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await api.createUser({ username: newUsername, email: newEmail, password: newPassword, role: newRole });
            setShowAddModal(false);
            setNewUsername(''); setNewEmail(''); setNewPassword(''); setNewRole('Standard');
            flash('User created successfully.');
            await loadUsers();
        } catch (err: any) {
            setError(err.message || 'Failed to create user.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editUser) return;
        setSubmitting(true);
        setError('');
        try {
            await api.updateUser(editUser._id, { role: editRole });
            setEditUser(null);
            flash('Role updated.');
            await loadUsers();
        } catch (err: any) {
            setError(err.message || 'Failed to update role.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetUser) return;
        setSubmitting(true);
        setError('');
        try {
            await api.resetUserPassword(resetUser._id, resetPassword);
            setResetUser(null);
            setResetPassword('');
            flash('Password reset.');
        } catch (err: any) {
            setError(err.message || 'Failed to reset password.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (user: AppUser) => {
        if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
        setError('');
        try {
            await api.deleteUser(user._id);
            flash('User deleted.');
            await loadUsers();
        } catch (err: any) {
            setError(err.message || 'Failed to delete user.');
        }
    };

    if (userRole !== 'Admin') {
        return (
            <div className="p-8 text-center text-gray-500">
                <p className="text-lg font-semibold mb-2">Access Denied</p>
                <p className="text-sm">Only Admins can manage users.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">User Management</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage user accounts and role-based permissions</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-[#0077c5] text-white text-sm font-semibold rounded hover:bg-[#005fa3] transition-colors"
                >
                    + Add User
                </button>
            </div>

            {/* Role legend */}
            <div className="flex gap-3 mb-5 flex-wrap">
                {ROLES.map(r => (
                    <span key={r} className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[r]}`}>{r}</span>
                ))}
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>
            )}
            {successMsg && (
                <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">{successMsg}</div>
            )}

            {loading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading users...</div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
                                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No users found.</td></tr>
                            ) : users.map(u => (
                                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-800">{u.username}</td>
                                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => { setEditUser(u); setEditRole(u.role); }}
                                                className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 font-medium"
                                            >
                                                Change Role
                                            </button>
                                            <button
                                                onClick={() => { setResetUser(u); setResetPassword(''); }}
                                                className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 font-medium"
                                            >
                                                Reset Password
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u)}
                                                className="text-xs px-3 py-1.5 border border-red-200 rounded hover:bg-red-50 text-red-600 font-medium"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add User Modal */}
            {showAddModal && (
                <Modal title="Add New User" onClose={() => setShowAddModal(false)}>
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Username</label>
                            <input
                                type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                                required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0077c5]"
                                placeholder="johndoe"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                            <input
                                type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0077c5]"
                                placeholder="john@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                            <input
                                type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                required minLength={6}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0077c5]"
                                placeholder="Min. 6 characters"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                            <select
                                value={newRole} onChange={e => setNewRole(e.target.value as Role)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0077c5]"
                            >
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        {error && <p className="text-red-600 text-xs">{error}</p>}
                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => setShowAddModal(false)}
                                className="flex-1 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting}
                                className="flex-1 py-2 bg-[#0077c5] text-white rounded text-sm font-semibold hover:bg-[#005fa3] disabled:opacity-50">
                                {submitting ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Edit Role Modal */}
            {editUser && (
                <Modal title={`Change Role — ${editUser.username}`} onClose={() => setEditUser(null)}>
                    <form onSubmit={handleEditRole} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">New Role</label>
                            <select
                                value={editRole} onChange={e => setEditRole(e.target.value as Role)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0077c5]"
                            >
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="bg-blue-50 rounded p-3 text-xs text-blue-700">
                            <strong>Permission summary:</strong>
                            <ul className="mt-1 space-y-0.5 list-disc list-inside">
                                {editRole === 'Admin' && <li>Full access to all resources and user management</li>}
                                {editRole === 'Manager' && <><li>Read/write transactions (can void, cannot delete)</li><li>Read/write all centers, read users and settings</li></>}
                                {editRole === 'Standard' && <><li>Read/write transactions, items, customers, vendors</li><li>Read-only employees and reports</li></>}
                                {editRole === 'View-Only' && <li>Read-only access to all resources</li>}
                            </ul>
                        </div>
                        {error && <p className="text-red-600 text-xs">{error}</p>}
                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => setEditUser(null)}
                                className="flex-1 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting}
                                className="flex-1 py-2 bg-[#0077c5] text-white rounded text-sm font-semibold hover:bg-[#005fa3] disabled:opacity-50">
                                {submitting ? 'Saving...' : 'Save Role'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Reset Password Modal */}
            {resetUser && (
                <Modal title={`Reset Password — ${resetUser.username}`} onClose={() => setResetUser(null)}>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
                            <input
                                type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                                required minLength={6}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0077c5]"
                                placeholder="Min. 6 characters"
                            />
                        </div>
                        {error && <p className="text-red-600 text-xs">{error}</p>}
                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => setResetUser(null)}
                                className="flex-1 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting}
                                className="flex-1 py-2 bg-[#0077c5] text-white rounded text-sm font-semibold hover:bg-[#005fa3] disabled:opacity-50">
                                {submitting ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default UserManagement;
