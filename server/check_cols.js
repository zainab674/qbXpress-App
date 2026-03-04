const mongoose = require('mongoose');
require('dotenv').config();

const ReportCustomColumn = require('./models/ReportCustomColumn');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const cols = await ReportCustomColumn.find({});
    console.log('Custom Columns in DB:', JSON.stringify(cols, null, 2));
    process.exit(0);
}

check();
