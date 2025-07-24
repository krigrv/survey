const mongoose = require('mongoose');
const Form = require('./models/Form');
const Response = require('./models/Response');
const FormType = require('./models/FormType');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/survey-forms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createSampleData() {
  try {
    console.log('Creating sample data for dashboard...');

    // Check for existing form types and create only if they don't exist
    let formTypes = [];
    const formTypeNames = ['Customer Feedback', 'Event Registration', 'Survey'];
    
    for (const typeName of formTypeNames) {
      let formType = await FormType.findOne({ name: typeName });
      if (!formType) {
        const typeData = {
          'Customer Feedback': {
            name: 'Customer Feedback',
            description: 'Collect customer feedback and satisfaction ratings',
            category: 'feedback',
            icon: 'fas fa-star',
            color: '#007bff',
            isActive: true
          },
          'Event Registration': {
            name: 'Event Registration',
            description: 'Registration form for events and workshops',
            category: 'registration',
            icon: 'fas fa-calendar',
            color: '#28a745',
            isActive: true
          },
          'Survey': {
            name: 'Survey',
            description: 'General purpose survey form',
            category: 'survey',
            icon: 'fas fa-poll',
            color: '#17a2b8',
            isActive: true
          }
        };
        formType = await FormType.create(typeData[typeName]);
        console.log(`Created form type: ${typeName}`);
      } else {
        console.log(`Form type already exists: ${typeName}`);
      }
      formTypes.push(formType);
    }

    console.log('Form types ready:', formTypes.length);

    // Check for existing forms and create only if they don't exist
    let forms = [];
    
    // Check if Customer Satisfaction Survey exists
    let form1 = await Form.findOne({ title: 'Customer Satisfaction Survey' });
    if (!form1) {
       form1 = await Form.create({
        title: 'Customer Satisfaction Survey',
        description: 'Help us improve our services by sharing your feedback',
        formType: formTypes[0]._id,
        status: 'published',
        category: 'feedback',
        questions: [
          {
            id: 'q1',
            type: 'radio',
            title: 'How satisfied are you with our service?',
            required: true,
            order: 1,
            options: [
              { value: '5', label: 'Very Satisfied' },
              { value: '4', label: 'Satisfied' },
              { value: '3', label: 'Neutral' },
              { value: '2', label: 'Dissatisfied' },
              { value: '1', label: 'Very Dissatisfied' }
            ]
          },
          {
            id: 'q2',
            type: 'textarea',
            title: 'What can we improve?',
            required: false,
            order: 2,
            settings: {
              placeholder: 'Please share your suggestions...'
            }
          }
        ],
        settings: {
          allowAnonymous: true,
          requireEmail: false,
          showProgressBar: true,
          allowMultipleSubmissions: false
        },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)  // 2 days ago
      });
      console.log('Created: Customer Satisfaction Survey');
    } else {
      console.log('Form already exists: Customer Satisfaction Survey');
    }
    forms.push(form1);
    
    // Check if Tech Conference Registration exists
    let form2 = await Form.findOne({ title: 'Tech Conference 2024 Registration' });
    if (!form2) {
      form2 = await Form.create({
        title: 'Tech Conference 2024 Registration',
        description: 'Register for our annual technology conference',
        formType: formTypes[1]._id,
        status: 'published',
        category: 'registration',
        questions: [
          {
            id: 'q1',
            type: 'text',
            title: 'Full Name',
            required: true,
            order: 1
          },
          {
            id: 'q2',
            type: 'email',
            title: 'Email Address',
            required: true,
            order: 2
          },
          {
            id: 'q3',
            type: 'select',
            title: 'Session Track',
            required: true,
            order: 3,
            options: [
              { value: 'ai', label: 'AI & Machine Learning' },
              { value: 'web', label: 'Web Development' },
              { value: 'mobile', label: 'Mobile Development' },
              { value: 'devops', label: 'DevOps & Cloud' }
            ]
          }
        ],
        settings: {
          allowAnonymous: false,
          requireEmail: true,
          showProgressBar: true,
          allowMultipleSubmissions: false
        },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)   // 1 day ago
      });
      console.log('Created: Tech Conference 2024 Registration');
    } else {
      console.log('Form already exists: Tech Conference 2024 Registration');
    }
    forms.push(form2);
    
    // Check if Product Feature Request exists
    let form3 = await Form.findOne({ title: 'Product Feature Request' });
    if (!form3) {
      form3 = await Form.create({
        title: 'Product Feature Request',
        description: 'Tell us what features you\'d like to see next',
        formType: formTypes[2]._id,
        status: 'draft',
        category: 'feedback',
        questions: [
          {
            id: 'q1',
            type: 'text',
            title: 'Feature Name',
            required: true,
            order: 1
          },
          {
            id: 'q2',
            type: 'textarea',
            title: 'Feature Description',
            required: true,
            order: 2
          },
          {
            id: 'q3',
            type: 'radio',
            title: 'Priority Level',
            required: true,
            order: 3,
            options: [
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' }
            ]
          }
        ],
        settings: {
          allowAnonymous: true,
          requireEmail: false,
          showProgressBar: false,
          allowMultipleSubmissions: true
        },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)  // 1 day ago
      });
      console.log('Created: Product Feature Request');
    } else {
      console.log('Form already exists: Product Feature Request');
    }
    forms.push(form3);
    
    // Check if Employee Wellness Survey exists
    let form4 = await Form.findOne({ title: 'Employee Wellness Survey' });
    if (!form4) {
      form4 = await Form.create({
        title: 'Employee Wellness Survey',
        description: 'Help us understand your wellness needs',
        formType: formTypes[2]._id,
        status: 'closed',
        category: 'survey',
        questions: [
          {
            id: 'q1',
            type: 'radio',
            title: 'How would you rate your work-life balance?',
            required: true,
            order: 1,
            options: [
              { value: 'excellent', label: 'Excellent' },
              { value: 'good', label: 'Good' },
              { value: 'fair', label: 'Fair' },
              { value: 'poor', label: 'Poor' }
            ]
          }
        ],
        settings: {
          allowAnonymous: true,
          requireEmail: false,
          showProgressBar: true,
          allowMultipleSubmissions: false
        },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)  // 10 days ago
      });
      console.log('Created: Employee Wellness Survey');
    } else {
      console.log('Form already exists: Employee Wellness Survey');
    }
    forms.push(form4);

    console.log('Created forms:', forms.length);

    // Create sample responses only if they don't exist
    const existingResponsesCount = await Response.countDocuments();
    console.log('Existing responses:', existingResponsesCount);
    
    if (existingResponsesCount > 0) {
      console.log('Responses already exist, skipping creation');
    } else {
      console.log('Creating sample responses...');
      const responses = [];
    
    // Responses for Customer Satisfaction Survey
    for (let i = 0; i < 15; i++) {
      responses.push({
        formId: forms[0]._id,
        formTitle: forms[0].title,
        formTypeId: forms[0].formType,
        formTypeName: 'Customer Feedback',
        respondentEmail: `user${i + 1}@example.com`,
        respondentName: `User ${i + 1}`,
        isAnonymous: false,
        answers: [
          {
            questionId: 'q1',
            questionType: 'radio',
            questionTitle: 'How satisfied are you with our service?',
            value: Math.floor(Math.random() * 5) + 1,
            textValue: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'][Math.floor(Math.random() * 5)]
          },
          {
            questionId: 'q2',
            questionType: 'textarea',
            questionTitle: 'What can we improve?',
            value: 'Great service overall, keep it up!',
            textValue: 'Great service overall, keep it up!'
          }
        ],
        status: 'submitted',
        timing: {
          startedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          submittedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          totalTime: Math.floor(Math.random() * 300) + 60 // 1-5 minutes
        },
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
    }

    // Responses for Tech Conference Registration
    for (let i = 0; i < 8; i++) {
      responses.push({
        formId: forms[1]._id,
        formTitle: forms[1].title,
        formTypeId: forms[1].formType,
        formTypeName: 'Event Registration',
        respondentEmail: `attendee${i + 1}@example.com`,
        respondentName: `Attendee ${i + 1}`,
        isAnonymous: false,
        answers: [
          {
            questionId: 'q1',
            questionType: 'text',
            questionTitle: 'Full Name',
            value: `Attendee ${i + 1}`,
            textValue: `Attendee ${i + 1}`
          },
          {
            questionId: 'q2',
            questionType: 'email',
            questionTitle: 'Email Address',
            value: `attendee${i + 1}@example.com`,
            textValue: `attendee${i + 1}@example.com`
          },
          {
            questionId: 'q3',
            questionType: 'select',
            questionTitle: 'Session Track',
            value: ['ai', 'web', 'mobile', 'devops'][Math.floor(Math.random() * 4)],
            textValue: ['AI & Machine Learning', 'Web Development', 'Mobile Development', 'DevOps & Cloud'][Math.floor(Math.random() * 4)]
          }
        ],
        status: 'submitted',
        timing: {
          startedAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
          submittedAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
          totalTime: Math.floor(Math.random() * 180) + 120 // 2-5 minutes
        },
        createdAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000)
      });
    }

    // Responses for Employee Wellness Survey
    for (let i = 0; i < 12; i++) {
      responses.push({
        formId: forms[3]._id,
        formTitle: forms[3].title,
        formTypeId: forms[3].formType,
        formTypeName: 'Survey',
        respondentEmail: `employee${i + 1}@company.com`,
        respondentName: `Employee ${i + 1}`,
        isAnonymous: true,
        answers: [
          {
            questionId: 'q1',
            questionType: 'radio',
            questionTitle: 'How would you rate your work-life balance?',
            value: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)],
            textValue: ['Excellent', 'Good', 'Fair', 'Poor'][Math.floor(Math.random() * 4)]
          }
        ],
        status: 'submitted',
        timing: {
          startedAt: new Date(Date.now() - Math.random() * 12 * 24 * 60 * 60 * 1000),
          submittedAt: new Date(Date.now() - Math.random() * 12 * 24 * 60 * 60 * 1000),
          totalTime: Math.floor(Math.random() * 120) + 30 // 30 seconds - 2 minutes
        },
        createdAt: new Date(Date.now() - Math.random() * 12 * 24 * 60 * 60 * 1000)
      });
    }

      await Response.insertMany(responses);
      console.log('Created responses:', responses.length);
    }

    const totalResponses = await Response.countDocuments();
    const totalForms = await Form.countDocuments();
    const totalFormTypes = await FormType.countDocuments();
    
    console.log('\n✅ Sample data created successfully!');
    console.log('📊 Dashboard should now show:');
    console.log(`   - ${totalForms} forms`);
    console.log(`   - ${totalResponses} responses`);
    console.log(`   - ${totalFormTypes} form types`);
    console.log(`   - Recent activity from the past week`);
    
  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    mongoose.connection.close();
  }
}

createSampleData();