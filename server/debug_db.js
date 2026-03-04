const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Customer = require('./models/Customer');
const Vendor = require('./models/Vendor');
const Employee = require('./models/Employee');
const Company = require('./models/Company');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const companies = await Company.find({});
    console.log('Total Companies:', companies.length);
    if (companies.length > 0) {
        console.log('Sample Company ID:', companies[0]._id, 'Name:', companies[0].name, 'UserId:', companies[0].userId);
    }

    const customers = await Customer.find({});
    console.log('Total Customers:', customers.length);
    if (customers.length > 0) {
        console.log('Sample Customers:', customers.slice(0, 5).map(c => c.name));
    }

    const vendors = await Vendor.find({});
    console.log('Total Vendors:', vendors.length);
    if (vendors.length > 0) {
        console.log('Sample Vendors:', vendors.slice(0, 5).map(v => v.name));
    }

    const associates = await Vendor.findOne({ name: /Robertson/i });
    console.log('Search for "Robertson":', associates ? associates.name : 'NOT FOUND');
    if (associates) console.log('Associates UID:', associates.userId, 'CompanyID:', associates.companyId);

    const freeman = await Customer.findOne({ name: /Freeman/i });
    console.log('Search for "Freeman":', freeman ? freeman.name : 'NOT FOUND');

    await mongoose.disconnect();
}

check().catch(console.error);
