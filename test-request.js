const axios = require('axios');

async function test() {
  try {
    const res = await axios.post(
      'http://localhost:3000/api/generate-prompt',
      {
        goal: 'Write a product landing page',
        audience: 'SaaS founders',
        framework: 'R.C.C.O',
        aiModel: 'GPT-4',
      },
      { timeout: 5000 }
    );

    console.log('Response:', res.data);
  } catch (err) {
    console.error('Request failed:', err.message);
    if (err.response) console.error('Status:', err.response.status, 'Data:', err.response.data);
  }
}

test();
