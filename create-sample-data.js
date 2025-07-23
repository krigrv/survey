const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3001';

async function createSampleData() {
    try {
        console.log('1. Getting authentication token...');
        
        // Get authentication token
        const authResponse = await makeRequest('POST', '/api/auth/bypass-login');
        const token = authResponse.token;
        console.log('✅ Authentication successful');
        console.log('Token:', token.substring(0, 20) + '...');
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        console.log('\n2. Creating sample forms...');
        
        // Sample form 1: Customer Feedback Survey
        const feedbackForm = {
            title: 'Customer Feedback Survey',
            description: 'Help us improve our services by sharing your feedback',
            formType: 'Feedback',
            fields: [
                {
                    id: 'name',
                    type: 'text',
                    label: 'Your Name',
                    required: true,
                    placeholder: 'Enter your full name'
                },
                {
                    id: 'email',
                    type: 'email',
                    label: 'Email Address',
                    required: true,
                    placeholder: 'your.email@example.com'
                },
                {
                    id: 'rating',
                    type: 'select',
                    label: 'Overall Satisfaction',
                    required: true,
                    options: [
                        { value: '5', label: 'Excellent' },
                        { value: '4', label: 'Good' },
                        { value: '3', label: 'Average' },
                        { value: '2', label: 'Poor' },
                        { value: '1', label: 'Very Poor' }
                    ]
                },
                {
                    id: 'comments',
                    type: 'textarea',
                    label: 'Additional Comments',
                    required: false,
                    placeholder: 'Please share any additional feedback...'
                }
            ],
            settings: {
                allowMultipleSubmissions: false,
                requireLogin: false,
                showProgressBar: true
            }
        };
        
        // Sample form 2: Event Registration
        const registrationForm = {
            title: 'Tech Conference 2024 Registration',
            description: 'Register for our annual technology conference',
            formType: 'Registration',
            fields: [
                {
                    id: 'firstName',
                    type: 'text',
                    label: 'First Name',
                    required: true,
                    placeholder: 'John'
                },
                {
                    id: 'lastName',
                    type: 'text',
                    label: 'Last Name',
                    required: true,
                    placeholder: 'Doe'
                },
                {
                    id: 'email',
                    type: 'email',
                    label: 'Email Address',
                    required: true,
                    placeholder: 'john.doe@company.com'
                },
                {
                    id: 'company',
                    type: 'text',
                    label: 'Company/Organization',
                    required: false,
                    placeholder: 'Your company name'
                },
                {
                    id: 'jobTitle',
                    type: 'text',
                    label: 'Job Title',
                    required: false,
                    placeholder: 'Software Engineer'
                },
                {
                    id: 'experience',
                    type: 'select',
                    label: 'Years of Experience',
                    required: true,
                    options: [
                        { value: '0-1', label: '0-1 years' },
                        { value: '2-5', label: '2-5 years' },
                        { value: '6-10', label: '6-10 years' },
                        { value: '10+', label: '10+ years' }
                    ]
                },
                {
                    id: 'interests',
                    type: 'checkbox',
                    label: 'Topics of Interest',
                    required: true,
                    options: [
                        { value: 'ai', label: 'Artificial Intelligence' },
                        { value: 'cloud', label: 'Cloud Computing' },
                        { value: 'security', label: 'Cybersecurity' },
                        { value: 'mobile', label: 'Mobile Development' },
                        { value: 'web', label: 'Web Development' }
                    ]
                }
            ],
            settings: {
                allowMultipleSubmissions: false,
                requireLogin: false,
                showProgressBar: true
            }
        };
        
        // Sample form 3: Contact Us
        const contactForm = {
            title: 'Contact Us',
            description: 'Get in touch with our team',
            formType: 'Contact',
            fields: [
                {
                    id: 'name',
                    type: 'text',
                    label: 'Full Name',
                    required: true,
                    placeholder: 'Enter your name'
                },
                {
                    id: 'email',
                    type: 'email',
                    label: 'Email Address',
                    required: true,
                    placeholder: 'your.email@example.com'
                },
                {
                    id: 'subject',
                    type: 'select',
                    label: 'Subject',
                    required: true,
                    options: [
                        { value: 'general', label: 'General Inquiry' },
                        { value: 'support', label: 'Technical Support' },
                        { value: 'sales', label: 'Sales Question' },
                        { value: 'partnership', label: 'Partnership Opportunity' }
                    ]
                },
                {
                    id: 'message',
                    type: 'textarea',
                    label: 'Message',
                    required: true,
                    placeholder: 'Please describe your inquiry...'
                }
            ],
            settings: {
                allowMultipleSubmissions: true,
                requireLogin: false,
                showProgressBar: false
            }
        };
        
        // Create the forms
        const forms = [feedbackForm, registrationForm, contactForm];
        const createdForms = [];
        
        for (let i = 0; i < forms.length; i++) {
            const form = forms[i];
            console.log(`Creating form: ${form.title}`);
            
            const response = await makeRequest('POST', '/api/forms', form, token);
            createdForms.push(response);
            console.log(`✅ Created form: ${form.title} (ID: ${response._id})`);
        }
        
        console.log('\n3. Testing form retrieval...');
        
        // Test getting all forms
        const allFormsResponse = await makeRequest('GET', '/api/forms', null, token);
        console.log(`✅ Retrieved ${allFormsResponse.length} forms`);
        
        // Test getting form types
        const formTypesResponse = await makeRequest('GET', '/api/form-types', null, token);
        console.log(`✅ Retrieved ${formTypesResponse.length} form types`);
        
        console.log('\n4. Sample data creation completed successfully!');
        console.log('\nCreated Forms:');
        createdForms.forEach((form, index) => {
            console.log(`${index + 1}. ${form.title} (${form.formType}) - ID: ${form._id}`);
        });
        
        console.log('\nForm Types:');
        formTypesResponse.forEach((type, index) => {
            console.log(`${index + 1}. ${type.name}`);
        });
        
    } catch (error) {
        console.error('❌ Error creating sample data:', error.message);
        process.exit(1);
    }
}

function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(jsonData);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${jsonData.message || body}`));
                    }
                } catch (e) {
                    reject(new Error(`Invalid JSON response: ${body}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

createSampleData();