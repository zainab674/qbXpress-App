const User = require('../models/User');

const VALID_ROLES = ['Admin', 'Manager', 'Standard', 'View-Only'];

const usersController = {
    // GET /api/users — list all users (Admin only)
    list: async (req, res, next) => {
        try {
            const users = await User.find().select('-password').sort({ createdAt: 1 });
            res.json(users);
        } catch (err) {
            next(err);
        }
    },

    // POST /api/users — create user (Admin only)
    create: async (req, res, next) => {
        try {
            const { username, email, password, role, companyId } = req.body;
            if (!username || !email || !password) {
                return res.status(400).json({ message: 'username, email, and password are required.' });
            }
            if (role && !VALID_ROLES.includes(role)) {
                return res.status(400).json({ message: `role must be one of: ${VALID_ROLES.join(', ')}` });
            }

            const existing = await User.findOne({ $or: [{ email }, { username }] });
            if (existing) {
                const field = existing.email === email ? 'Email' : 'Username';
                return res.status(400).json({ message: `${field} already exists.` });
            }

            const user = new User({ username, email, password, role: role || 'Standard', companyId: companyId || null });
            await user.save();
            res.status(201).json({ id: user._id, username, email, role: user.role, companyId: user.companyId, createdAt: user.createdAt });
        } catch (err) {
            next(err);
        }
    },

    // PUT /api/users/:id — update role (and optionally username/email) (Admin only)
    update: async (req, res, next) => {
        try {
            const { role, username, email, companyId } = req.body;

            // Prevent Admin from changing their own role (safety)
            if (req.params.id === req.user.id && role && role !== 'Admin') {
                return res.status(400).json({ message: 'You cannot downgrade your own role.' });
            }

            if (role && !VALID_ROLES.includes(role)) {
                return res.status(400).json({ message: `role must be one of: ${VALID_ROLES.join(', ')}` });
            }

            const updates = {};
            if (role) updates.role = role;
            if (username) updates.username = username;
            if (email) updates.email = email;
            if (companyId !== undefined) updates.companyId = companyId || null;

            const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
            if (!user) return res.status(404).json({ message: 'User not found.' });

            res.json(user);
        } catch (err) {
            next(err);
        }
    },

    // PUT /api/users/:id/password — reset password (Admin only)
    resetPassword: async (req, res, next) => {
        try {
            const { password } = req.body;
            if (!password || password.length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters.' });
            }
            const user = await User.findById(req.params.id);
            if (!user) return res.status(404).json({ message: 'User not found.' });

            user.password = password; // pre-save hook will hash it
            await user.save();
            res.json({ message: 'Password updated.' });
        } catch (err) {
            next(err);
        }
    },

    // DELETE /api/users/:id — delete user (Admin only, cannot delete self)
    remove: async (req, res, next) => {
        try {
            if (req.params.id === req.user.id) {
                return res.status(400).json({ message: 'You cannot delete your own account.' });
            }
            const user = await User.findByIdAndDelete(req.params.id);
            if (!user) return res.status(404).json({ message: 'User not found.' });
            res.json({ message: 'User deleted.' });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = usersController;
