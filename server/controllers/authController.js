const User = require('../models/User');
const jwt = require('jsonwebtoken');

const VALID_ROLES = ['Admin', 'Manager', 'Standard', 'View-Only'];
// Normalise legacy/invalid roles so a stale DB value doesn't silently lock users out
const normaliseRole = (role) => VALID_ROLES.includes(role) ? role : 'View-Only';

const authController = {
    signup: async (req, res) => {
        try {
            const { username, email, password } = req.body;
            let user = await User.findOne({ $or: [{ email }, { username }] });
            if (user) {
                const field = user.email === email ? 'Email' : 'Username';
                return res.status(400).json({ message: `${field} already exists` });
            }

            user = new User({ username, email, password });
            await user.save();

            const role = normaliseRole(user.role);
            const token = jwt.sign({ id: user._id, role, companyId: user.companyId || null }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1d' });
            res.json({ token, user: { id: user._id, username, email, role, companyId: user.companyId || null } });
        } catch (err) {
            console.error('Signup Error:', err);
            res.status(500).json({ message: 'Internal Server Error', error: err.message });
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email });
            if (!user) return res.status(400).json({ message: 'Invalid credentials' });

            const isMatch = await user.comparePassword(password);
            if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

            const role = normaliseRole(user.role);
            const token = jwt.sign({ id: user._id, role, companyId: user.companyId || null }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1d' });
            res.json({ token, user: { id: user._id, username: user.username, email, role, companyId: user.companyId || null } });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    me: async (req, res) => {
        try {
            const user = await User.findById(req.user.id).select('-password');
            res.json(user);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = authController;
