
class BaseService {
    constructor(model) {
        this.model = model;
    }

    async getAll(userId, companyId, sort = null) {
        const defaultSort = sort || { name: 1 };
        return await this.model.find({ userId, companyId }).sort(defaultSort);
    }

    async getPaginated(userId, companyId, page = 1, limit = 50, sort = null) {
        const skip = (page - 1) * limit;
        const defaultSort = sort || { date: -1, createdAt: -1 };

        const items = await this.model.find({ userId, companyId })
            .sort(defaultSort)
            .skip(skip)
            .limit(limit);

        const total = await this.model.countDocuments({ userId, companyId });

        return {
            items,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }

    async getOne(id, userId, companyId) {
        return await this.model.findOne({ id, userId, companyId });
    }

    async save(data, userId, companyId) {
        data.userId = userId;
        data.companyId = companyId;
        return await this.model.findOneAndUpdate({ id: data.id, userId, companyId }, data, { upsert: true, new: true });
    }

    async delete(id, userId, companyId) {
        return await this.model.findOneAndDelete({ id, userId, companyId });
    }

    async bulkUpdate(items, userId, companyId) {
        const operations = items.map(item => {
            item.userId = userId;
            item.companyId = companyId;
            return {
                updateOne: {
                    filter: { id: item.id, userId, companyId },
                    update: item,
                    upsert: true
                }
            };
        });
        return await this.model.bulkWrite(operations);
    }
}

module.exports = BaseService;
