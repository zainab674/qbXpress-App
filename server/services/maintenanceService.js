const Item = require('../models/Item');
const Account = require('../models/Account');
const crypto = require('crypto');

const maintenanceService = {
    /**
     * Synchronizes Inventory Asset account balances with the actual value of items on hand.
     * Also ensures a default 'Inventory Asset' account exists.
     */
    syncInventoryBalances: async (userId, companyId) => {
        // 1. Ensure a default Inventory Asset account exists
        let inventoryAccount = await Account.findOne({
            userId,
            companyId,
            $or: [{ name: 'Inventory Asset' }, { type: 'Inventory Asset' }]
        });

        if (!inventoryAccount) {
            console.log(`Creating missing Inventory Asset account for user: ${userId}`);
            inventoryAccount = new Account({
                id: crypto.randomUUID(),
                userId,
                companyId,
                name: 'Inventory Asset',
                type: 'Inventory Asset',
                balance: 0,
                isActive: true
            });
            await inventoryAccount.save();
        }

        // 2. Get all items of inventory type
        const items = await Item.find({
            userId,
            companyId,
            type: { $in: ['Inventory Part', 'Inventory Assembly'] }
        });

        // 3. Map of accountId -> totalValue
        const accountValues = {};

        // Items might have 'Inventory Asset' as a string in assetAccountId if imported via CSV
        const updatedItems = [];

        for (const item of items) {
            let targetId = item.assetAccountId;

            // If the ID looks like a placeholder or is missing, use the default account
            if (!targetId || targetId === 'Inventory Asset') {
                targetId = inventoryAccount.id;
                item.assetAccountId = targetId;
                updatedItems.push(item.save());
            }

            const value = (item.onHand || 0) * (item.cost || 0);
            if (!accountValues[targetId]) {
                accountValues[targetId] = 0;
            }
            accountValues[targetId] += value;
        }

        if (updatedItems.length > 0) {
            await Promise.all(updatedItems);
            console.log(`Updated ${updatedItems.length} items to link to account ID: ${inventoryAccount.id}`);
        }

        // 4. Update the balances
        const inventoryAccounts = await Account.find({
            userId,
            companyId,
            type: 'Inventory Asset'
        });

        const results = [];
        for (const account of inventoryAccounts) {
            const newValue = accountValues[account.id] || 0;
            const updatedAccount = await Account.findOneAndUpdate(
                { _id: account._id },
                { $set: { balance: newValue } },
                { new: true }
            );
            results.push({
                accountId: account.id,
                name: account.name,
                oldBalance: account.balance,
                newBalance: newValue
            });
        }

        return results;
    },

    /**
     * Synchronizes Accounts Receivable account balances with open Invoices.
     */
    syncARBalances: async (userId, companyId) => {
        // 1. Ensure a default Accounts Receivable account exists
        let arAccount = await Account.findOne({
            userId,
            companyId,
            $or: [{ name: 'Accounts Receivable' }, { type: 'Accounts Receivable' }]
        });

        if (!arAccount) {
            console.log(`Creating missing Accounts Receivable account for user: ${userId}`);
            arAccount = new Account({
                id: crypto.randomUUID(),
                userId,
                companyId,
                name: 'Accounts Receivable',
                type: 'Accounts Receivable',
                balance: 0,
                isActive: true
            });
            await arAccount.save();
        }

        // 2. Get all open invoices
        const Transaction = require('../models/Transaction');
        const openInvoices = await Transaction.find({
            userId,
            companyId,
            type: 'INVOICE',
            status: { $in: ['OPEN', 'PARTIAL'] }
        });

        const totalAR = openInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

        // 3. Update the balance
        const oldBalance = arAccount.balance;
        const updatedAccount = await Account.findOneAndUpdate(
            { _id: arAccount._id },
            { $set: { balance: totalAR } },
            { new: true }
        );

        return [{
            accountId: arAccount.id,
            name: arAccount.name,
            oldBalance: oldBalance,
            newBalance: totalAR
        }];
    },

    /**
     * Synchronizes Accounts Payable account balances with open Bills.
     */
    syncAPBalances: async (userId, companyId) => {
        // 1. Ensure a default Accounts Payable account exists
        let apAccount = await Account.findOne({
            userId,
            companyId,
            $or: [{ name: 'Accounts Payable' }, { type: 'Accounts Payable' }]
        });

        if (!apAccount) {
            console.log(`Creating missing Accounts Payable account for user: ${userId}`);
            apAccount = new Account({
                id: crypto.randomUUID(),
                userId,
                companyId,
                name: 'Accounts Payable',
                type: 'Accounts Payable',
                balance: 0,
                isActive: true
            });
            await apAccount.save();
        }

        // 2. Get all open bills
        const Transaction = require('../models/Transaction');
        const openBills = await Transaction.find({
            userId,
            companyId,
            type: 'BILL',
            status: { $in: ['OPEN', 'PARTIAL'] }
        });

        const totalAP = openBills.reduce((sum, bill) => sum + (bill.total || 0), 0);

        // 3. Update the balance
        const oldBalance = apAccount.balance;
        const updatedAccount = await Account.findOneAndUpdate(
            { _id: apAccount._id },
            { $set: { balance: totalAP } },
            { new: true }
        );

        return [{
            accountId: apAccount.id,
            name: apAccount.name,
            oldBalance: oldBalance,
            newBalance: totalAP
        }];
    }
};

module.exports = maintenanceService;
