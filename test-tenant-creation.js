// Test script to verify tenant creation API

async function testTenantCreation() {
  try {
    console.log('Testing tenant creation API...');
    
    const response = await fetch('http://localhost:5000/api/form-types/direct-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Tenant',
        description: 'This is a test tenant',
        category: 'test.com'
      })
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Success! Tenant created:', result);
    } else {
      const error = await response.text();
      console.log('Error response:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Test loading tenants
async function testLoadTenants() {
  try {
    console.log('\nTesting load tenants API...');
    
    const response = await fetch('http://localhost:5000/api/form-types');
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Success! Tenants loaded:', result);
    } else {
      const error = await response.text();
      console.log('Error response:', error);
    }
    
  } catch (error) {
    console.error('Load test failed:', error);
  }
}

// Run tests
testTenantCreation().then(() => {
  return testLoadTenants();
});