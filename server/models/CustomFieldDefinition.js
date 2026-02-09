const mongoose = require('mongoose');

const CustomFieldDefinitionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    useForCust: { type: Boolean, default: false },
    useForVend: { type: Boolean, default: false },
    useForEmpl: { type: Boolean, default: false },
    useForItem: { type: Boolean, default: false },
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('CustomFieldDefinition', CustomFieldDefinitionSchema);
