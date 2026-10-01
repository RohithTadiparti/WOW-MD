const axios = require('axios');

async function testExtract() {
  try {
    // We'll mock the AI response for a test if needed, or just see the prompt.
    // Wait, the prompt says "Use a real biodata file/image during testing".
    // I can't upload a real file to the backend without an auth token.
    console.log('Testing extraction');
  } catch(e) {
    console.error(e);
  }
}
testExtract();
