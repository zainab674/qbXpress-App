
const Lead = require('../models/Lead');

const LeadService = {
    getAll: async () => {
        return await Lead.find().sort({ name: 1 });
    },
    getOne: async (id) => {
        return await Lead.findOne({ id });
    },
    save: async (data) => {
        return await Lead.findOneAndUpdate({ id: data.id }, data, { upsert: true, new: true });
    },
    delete: async (id) => {
        return await Lead.findOneAndDelete({ id });
    },
    bulkUpdate: async (items) => {
        const operations = items.map(item => ({
            updateOne: {
                filter: { id: item.id },
                update: item,
                upsert: true
            }
        }));
        return await Lead.bulkWrite(operations);
    }
};

module.exports = LeadService;

