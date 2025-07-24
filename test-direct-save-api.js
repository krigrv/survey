const http = require('http');

// Test data to save
const testData = {
  title: 'Test Project Title',
  description: 'Test Project Description',
  category: 'test-category',
  projectType: 'survey',
  projectTypeName: 'Survey Form'
};

function testDirectSaveAPI() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Testing Direct Save API...');
    console.log('📤 Sending test data:', testData);
    
    const postData = JSON.stringify(testData);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/form-types/direct-save',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      console.log('✅ API Response Status:', res.statusCode);
      
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(responseBody);
          console.log('📥 API Response Data:', responseData);
          
          if (res.statusCode === 201) {
            console.log('🎉 Direct save API test PASSED!');
            console.log('💾 Data saved to survey.formtypes collection successfully');
            resolve(responseData);
          } else {
            console.log('❌ Unexpected response status:', res.statusCode);
            reject(new Error(`Unexpected status: ${res.statusCode}`));
          }
        } catch (error) {
          console.error('❌ Failed to parse response:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ API Test FAILED:');
      console.error('Error:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// Run the test
testDirectSaveAPI()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });