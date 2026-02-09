const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
    key: { type: String, required: true },
    value: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

// Ensure unique key per company
SettingSchema.index({ companyId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Setting', SettingSchema);
