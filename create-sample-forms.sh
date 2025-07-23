#!/bin/bash

echo "🚀 Creating sample data using curl commands..."
echo ""

# Get authentication token
echo "1. Getting authentication token..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/bypass-login)
TOKEN=$(echo $AUTH_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get authentication token"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo "✅ Authentication successful"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Create sample form 1: Customer Feedback Survey
echo "2. Creating Customer Feedback Survey..."
FEEDBACK_FORM='{
  "title": "Customer Feedback Survey",
  "description": "Help us improve our services by sharing your feedback",
  "formType": "Feedback",
  "fields": [
    {
      "id": "name",
      "type": "text",
      "label": "Your Name",
      "required": true,
      "placeholder": "Enter your full name"
    },
    {
      "id": "email",
      "type": "email",
      "label": "Email Address",
      "required": true,
      "placeholder": "your.email@example.com"
    },
    {
      "id": "rating",
      "type": "select",
      "label": "Overall Satisfaction",
      "required": true,
      "options": [
        { "value": "5", "label": "Excellent" },
        { "value": "4", "label": "Good" },
        { "value": "3", "label": "Average" },
        { "value": "2", "label": "Poor" },
        { "value": "1", "label": "Very Poor" }
      ]
    },
    {
      "id": "comments",
      "type": "textarea",
      "label": "Additional Comments",
      "required": false,
      "placeholder": "Please share any additional feedback..."
    }
  ],
  "settings": {
    "allowMultipleSubmissions": false,
    "requireLogin": false,
    "showProgressBar": true
  }
}'

FEEDBACK_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$FEEDBACK_FORM" \
  http://localhost:3001/api/forms)

FEEDBACK_ID=$(echo $FEEDBACK_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
if [ -n "$FEEDBACK_ID" ]; then
    echo "✅ Created Customer Feedback Survey (ID: $FEEDBACK_ID)"
else
    echo "❌ Failed to create Customer Feedback Survey"
    echo "Response: $FEEDBACK_RESPONSE"
fi
echo ""

# Create sample form 2: Event Registration
echo "3. Creating Event Registration Form..."
REGISTRATION_FORM='{
  "title": "Tech Conference 2024 Registration",
  "description": "Register for our annual technology conference",
  "formType": "Registration",
  "fields": [
    {
      "id": "firstName",
      "type": "text",
      "label": "First Name",
      "required": true,
      "placeholder": "John"
    },
    {
      "id": "lastName",
      "type": "text",
      "label": "Last Name",
      "required": true,
      "placeholder": "Doe"
    },
    {
      "id": "email",
      "type": "email",
      "label": "Email Address",
      "required": true,
      "placeholder": "john.doe@company.com"
    },
    {
      "id": "company",
      "type": "text",
      "label": "Company/Organization",
      "required": false,
      "placeholder": "Your company name"
    },
    {
      "id": "experience",
      "type": "select",
      "label": "Years of Experience",
      "required": true,
      "options": [
        { "value": "0-1", "label": "0-1 years" },
        { "value": "2-5", "label": "2-5 years" },
        { "value": "6-10", "label": "6-10 years" },
        { "value": "10+", "label": "10+ years" }
      ]
    }
  ],
  "settings": {
    "allowMultipleSubmissions": false,
    "requireLogin": false,
    "showProgressBar": true
  }
}'

REGISTRATION_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$REGISTRATION_FORM" \
  http://localhost:3001/api/forms)

REGISTRATION_ID=$(echo $REGISTRATION_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
if [ -n "$REGISTRATION_ID" ]; then
    echo "✅ Created Event Registration Form (ID: $REGISTRATION_ID)"
else
    echo "❌ Failed to create Event Registration Form"
    echo "Response: $REGISTRATION_RESPONSE"
fi
echo ""

# Create sample form 3: Contact Us
echo "4. Creating Contact Us Form..."
CONTACT_FORM='{
  "title": "Contact Us",
  "description": "Get in touch with our team",
  "formType": "Contact",
  "fields": [
    {
      "id": "name",
      "type": "text",
      "label": "Full Name",
      "required": true,
      "placeholder": "Enter your name"
    },
    {
      "id": "email",
      "type": "email",
      "label": "Email Address",
      "required": true,
      "placeholder": "your.email@example.com"
    },
    {
      "id": "subject",
      "type": "select",
      "label": "Subject",
      "required": true,
      "options": [
        { "value": "general", "label": "General Inquiry" },
        { "value": "support", "label": "Technical Support" },
        { "value": "sales", "label": "Sales Question" },
        { "value": "partnership", "label": "Partnership Opportunity" }
      ]
    },
    {
      "id": "message",
      "type": "textarea",
      "label": "Message",
      "required": true,
      "placeholder": "Please describe your inquiry..."
    }
  ],
  "settings": {
    "allowMultipleSubmissions": true,
    "requireLogin": false,
    "showProgressBar": false
  }
}'

CONTACT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CONTACT_FORM" \
  http://localhost:3001/api/forms)

CONTACT_ID=$(echo $CONTACT_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
if [ -n "$CONTACT_ID" ]; then
    echo "✅ Created Contact Us Form (ID: $CONTACT_ID)"
else
    echo "❌ Failed to create Contact Us Form"
    echo "Response: $CONTACT_RESPONSE"
fi
echo ""

# Test retrieving all forms
echo "5. Testing form retrieval..."
ALL_FORMS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/forms)
FORM_COUNT=$(echo $ALL_FORMS | grep -o '"_id"' | wc -l)
echo "✅ Retrieved $FORM_COUNT forms from database"

# Test retrieving form types
FORM_TYPES=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/form-types)
TYPE_COUNT=$(echo $FORM_TYPES | grep -o '"name"' | wc -l)
echo "✅ Retrieved $TYPE_COUNT form types from database"

echo ""
echo "🎉 Sample data creation completed successfully!"
echo ""
echo "Created Forms:"
echo "1. Customer Feedback Survey (ID: $FEEDBACK_ID)"
echo "2. Tech Conference 2024 Registration (ID: $REGISTRATION_ID)"
echo "3. Contact Us (ID: $CONTACT_ID)"
echo ""
echo "You can now test the API endpoints:"
echo "- GET /api/forms (retrieve all forms)"
echo "- GET /api/form-types (retrieve form types)"
echo "- GET /api/forms/:id (retrieve specific form)"
echo ""
echo "Remember to include the Authorization header:"
echo "Authorization: Bearer $TOKEN"