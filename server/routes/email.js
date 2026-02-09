
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');
const User = require('../models/User');
const multer = require('multer');
const upload = multer();

// Save SMTP Settings
router.post('/settings', auth, async (req, res, next) => {
    try {
        const { host, port, user, pass, from } = req.body;
        const dbUser = await User.findById(req.user.id);

        dbUser.smtpSettings = { host, port, user, pass, from };
        await dbUser.save();

        res.json({ message: 'SMTP settings saved successfully' });
    } catch (error) {
        next(error);
    }
});

// Get SMTP Settings (masked)
router.get('/settings', auth, async (req, res, next) => {
    try {
        const dbUser = await User.findById(req.user.id);
        const settings = dbUser.smtpSettings || {};

        res.json({
            host: settings.host,
            port: settings.port,
            user: settings.user,
            from: settings.from,
            hasPassword: !!settings.pass
        });
    } catch (error) {
        next(error);
    }
});

// Send PDF as email
router.post('/send-pdf', auth, upload.single('pdf'), async (req, res, next) => {
    try {
        const { to, subject, body, filename } = req.body;
        const pdfBuffer = req.file.buffer;

        const dbUser = await User.findById(req.user.id);
        if (!dbUser) return res.status(404).json({ message: 'User not found' });

        await emailService.sendEmail(dbUser.smtpSettings, to, subject, body, `<p>${body}</p>`, [
            {
                filename: filename || 'document.pdf',
                content: pdfBuffer,
            }
        ]);

        res.json({ message: 'Email sent successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
