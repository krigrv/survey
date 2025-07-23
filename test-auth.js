const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testAuthentication() {
  try {
    console.log('🔐 Testing bypass login...');
    
    // Test bypass login
    const bypassOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/bypass-login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const bypassResponse = await makeRequest(bypassOptions);
    console.log(`Bypass Login Status: ${bypassResponse.status}`);
    
    if (bypassResponse.status === 200) {
      console.log('✅ Bypass login successful!');
      console.log(`Token: ${bypassResponse.data.token.substring(0, 20)}...`);
      console.log(`User: ${bypassResponse.data.user.firstName} ${bypassResponse.data.user.lastName} (${bypassResponse.data.user.role})`);
      
      // Test /api/apps with the token
      console.log('\n📱 Testing /api/apps with authentication...');
      
      const appsOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/apps',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${bypassResponse.data.token}`,
          'Content-Type': 'application/json'
        }
      };
      
      const appsResponse = await makeRequest(appsOptions);
      console.log(`Apps API Status: ${appsResponse.status}`);
      
      if (appsResponse.status === 200) {
        console.log('✅ Apps API accessible!');
        console.log('Response data:');
        console.log(JSON.stringify(appsResponse.data, null, 2));
        
        if (Array.isArray(appsResponse.data)) {
          console.log(`Found ${appsResponse.data.length} apps:`);
          appsResponse.data.forEach((app, index) => {
            console.log(`${index + 1}. ${app.displayName} (${app.code})`);
          });
        } else {
          console.log('Apps data is not an array');
        }
      } else {
        console.log('❌ Apps API failed:');
        console.log(JSON.stringify(appsResponse.data, null, 2));
      }
      
    } else {
      console.log('❌ Bypass login failed:');
      console.log(JSON.stringify(bypassResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

console.log('🧪 Starting authentication test...');
testAuthentication();