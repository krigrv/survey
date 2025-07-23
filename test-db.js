const mongoose = require('mongoose');
const FormType = require('./models/FormType');
const Form = require('./models/Form');

// Load environment variables
require('dotenv').config();

async function testDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected successfully');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    // Test FormType collection
    console.log('\n--- Testing FormType Collection ---');
    const formTypes = await FormType.find({});
    console.log(`Found ${formTypes.length} form types:`);
    formTypes.forEach((type, index) => {
      console.log(`${index + 1}. ${type.name} - ${type.description || 'No description'} (Active: ${type.isActive})`);
    });
    
    // Test Forms collection
    console.log('\n--- Testing Forms Collection ---');
    const forms = await Form.find({}).populate('formType', 'name');
    console.log(`Found ${forms.length} forms:`);
    forms.forEach((form, index) => {
      console.log(`${index + 1}. ${form.title} - Type: ${form.formType?.name || 'Unknown'} (Status: ${form.status})`);
    });
    
    // Create a sample form type if none exist
    if (formTypes.length === 0) {
      console.log('\n--- Creating Sample Form Types ---');
      const sampleTypes = [
        { name: 'Survey', description: 'General survey forms', isActive: true },
        { name: 'Feedback', description: 'Customer feedback forms', isActive: true },
        { name: 'Registration', description: 'Event registration forms', isActive: true },
        { name: 'Contact', description: 'Contact inquiry forms', isActive: true }
      ];
      
      for (const typeData of sampleTypes) {
        const formType = new FormType({
          ...typeData,
          createdBy: new mongoose.Types.ObjectId() // Dummy user ID
        });
        await formType.save();
        console.log(`✅ Created form type: ${formType.name}`);
      }
    }
    
    console.log('\n✅ Database test completed successfully');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

testDatabase();