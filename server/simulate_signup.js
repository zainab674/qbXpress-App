const axios = require('axios');

async function testSignup() {
    try {
        const response = await axios.post('http://localhost:5000/api/auth/signup', {
            username: "andria",
            email: "andria@gmail.com",
            password: "11221122"
        });
        console.log('Success:', response.data);
    } catch (err) {
        console.error('Error Status:', err.response?.status);
        console.error('Error Data:', JSON.stringify(err.response?.data, null, 2));
    }
}

testSignup();
