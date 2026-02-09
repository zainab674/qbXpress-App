const bcrypt = require('bcryptjs');

async function test() {
    try {
        const hash = await bcrypt.hash('123456', 10);
        console.log('Hash:', hash);
        const match = await bcrypt.compare('123456', hash);
        console.log('Match:', match);
    } catch (err) {
        console.error('Bcrypt error:', err);
    }
}

test();
