
const nodemailer = require('nodemailer');

const emailService = {
    createTransporter: (smtpSettings) => {
        if (!smtpSettings || !smtpSettings.host || !smtpSettings.user || !smtpSettings.pass) {
            // Fallback to env if available, or throw error
            if (process.env.SMTP_HOST) {
                return nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    secure: process.env.SMTP_PORT == 465,
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });
            }
            throw new Error('SMTP settings missing. Please configure email settings in your profile.');
        }

        return nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port || 587,
            secure: smtpSettings.port == 465,
            auth: {
                user: smtpSettings.user,
                pass: smtpSettings.pass,
            },
        });
    },

    sendEmail: async (smtpSettings, to, subject, text, html, attachments = []) => {
        try {
            const transporter = emailService.createTransporter(smtpSettings);
            const from = (smtpSettings && smtpSettings.from) || process.env.SMTP_FROM || smtpSettings.user;

            const info = await transporter.sendMail({
                from,
                to,
                subject,
                text,
                html,
                attachments,
            });
            console.log('Email sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    },

    sendInvoice: async (smtpSettings, to, invoiceData, pdfBuffer) => {
        const subject = `Invoice ${invoiceData.refNo} from ${invoiceData.companyName || 'Your Company'}`;
        const text = `Hello, please find attached the invoice ${invoiceData.refNo} for the amount of $${invoiceData.total.toLocaleString()}.`;
        const html = `<p>Hello,</p><p>Please find attached the invoice <b>${invoiceData.refNo}</b> for the amount of <b>$${invoiceData.total.toLocaleString()}</b>.</p>`;

        return emailService.sendEmail(smtpSettings, to, subject, text, html, [
            {
                filename: `Invoice_${invoiceData.refNo}.pdf`,
                content: pdfBuffer,
            }
        ]);
    },

    sendReport: async (smtpSettings, to, reportTitle, pdfBuffer) => {
        const subject = `Financial Report: ${reportTitle}`;
        const text = `Hello, please find attached the ${reportTitle} report.`;
        const html = `<p>Hello,</p><p>Please find attached the <b>${reportTitle}</b> report.</p>`;

        return emailService.sendEmail(smtpSettings, to, subject, text, html, [
            {
                filename: `${reportTitle.replace(/\s+/g, '_')}.pdf`,
                content: pdfBuffer,
            }
        ]);
    }
};

module.exports = emailService;
