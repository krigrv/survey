/**
 * Dynamic Survey Widget Implementation
 * This script fetches form data from the database and displays it as a popup widget
 * Supports any form structure saved in the database
 */
(function() {
  // Get the form ID and base URL
  const formId = window.SURVEY_FORM_ID;
  const baseUrl = window.SURVEY_WIDGET_BASE_URL || '';
  
  if (!formId) {
    console.error('Survey Widget: No form ID specified');
    return;
  }
  
  // CSS styles for the popup
  const styles = `
    .survey-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 20px;
      max-width: 400px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      transition: all 0.3s ease;
      transform: translateY(100px);
      opacity: 0;
      max-height: 80vh;
      overflow-y: auto;
    }
    
    .survey-widget-container.visible {
      transform: translateY(0);
      opacity: 1;
    }
    
    .survey-widget-close {
      position: absolute;
      top: 10px;
      right: 10px;
      cursor: pointer;
      font-size: 18px;
      color: #999;
    }
    
    .survey-widget-close:hover {
      color: #333;
    }
    
    .survey-widget-message {
      margin-bottom: 15px;
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
    
    .survey-widget-button {
      display: inline-block;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      color: white;
      text-decoration: none;
    }
    
    /* DHL Survey Specific Styles */
    .rating-scale {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
    }
    
    .rating-option {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }
    
    .rating-number {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 1px solid #ccc;
      margin-bottom: 5px;
      font-size: 12px;
    }
    
    .rating-option input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
    }
    
    .rating-option input:checked + .rating-number {
      background-color: #D40511;
      color: white;
      border-color: #D40511;
    }
    
    .rating-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    
    .rating-section {
      margin-bottom: 15px;
    }
    
    .rating-label {
      font-weight: bold;
      margin-bottom: 5px;
      font-size: 14px;
    }
    
    .form-group {
      margin-bottom: 15px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      font-size: 14px;
    }
    
    .form-group textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      resize: vertical;
    }
    
    .form-group input[type="text"],
    .form-group input[type="tel"],
    .form-group input[type="email"] {
      width: 100%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    .char-count {
      text-align: right;
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }
    
    .radio-group {
      margin-bottom: 15px;
    }
    
    .radio-option {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .radio-option input[type="radio"] {
      margin-right: 8px;
    }
    
    .form-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    
    .btn-close {
      background-color: #ccc;
      color: #333;
    }
    
    .btn-submit {
      background-color: #D40511;
    }
    
    .btn-close, .btn-submit {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      color: white;
    }
    
    .privacy-link {
      color: #0066cc;
      text-decoration: underline;
      cursor: pointer;
    }
    
    .screenshot-btn {
      display: flex;
      align-items: center;
      background-color: #0066cc;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-size: 12px;
      margin-bottom: 15px;
    }
    
    .screenshot-btn img {
      width: 16px;
      height: 16px;
      margin-right: 6px;
    }
    
    .required-field {
      color: #D40511;
    }
    
    .note {
      font-size: 11px;
      color: #666;
      font-style: italic;
      margin-top: 5px;
    }
    
    .success-message {
      text-align: center;
      padding: 20px;
      color: #28a745;
      font-size: 16px;
      font-weight: 500;
    }
    
    .no-questions {
      text-align: center;
      padding: 20px;
      color: #666;
      font-style: italic;
    }
    
    .survey-description {
      margin-bottom: 20px;
      color: #666;
      font-size: 14px;
      line-height: 1.4;
    }
  `;
  
  // Function to inject CSS
  function injectStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
  
  // Function to inject CSS
  function injectStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
  
  // Function to render question based on type
  function renderQuestion(question, index) {
    const questionId = `question_${question.id || index}`;
    const isRequired = question.required ? '<span class="required-field">*</span>' : '';
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'form-group';
    questionDiv.setAttribute('data-question-id', question.id || index);
    
    const label = document.createElement('label');
    label.innerHTML = `${question.title} ${isRequired}`;
    questionDiv.appendChild(label);
    
    let inputElement;
    
    switch (question.type) {
      case 'radio':
      case 'multiple-choice':
        const radioGroup = document.createElement('div');
        radioGroup.className = 'radio-group';
        
        if (question.options) {
          question.options.forEach((option, optIndex) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'radio-option';
            
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = questionId;
            input.value = typeof option === 'object' ? (option.value || option.label) : option;
            input.id = `${questionId}_${optIndex}`;
            if (question.required) input.required = true;
            
            const optionLabel = document.createElement('label');
            optionLabel.htmlFor = `${questionId}_${optIndex}`;
            optionLabel.textContent = typeof option === 'object' ? (option.label || option.text || option.value) : option;
            
            optionDiv.appendChild(input);
            optionDiv.appendChild(optionLabel);
            radioGroup.appendChild(optionDiv);
          });
        }
        
        questionDiv.appendChild(radioGroup);
        break;
        
      case 'checkbox':
      case 'checkboxes':
        const checkboxGroup = document.createElement('div');
        checkboxGroup.className = 'checkbox-group';
        
        if (question.options) {
          question.options.forEach((option, optIndex) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'checkbox-option';
            
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.name = `${questionId}[]`;
            input.value = typeof option === 'object' ? (option.value || option.label) : option;
            input.id = `${questionId}_${optIndex}`;
            
            const optionLabel = document.createElement('label');
            optionLabel.htmlFor = `${questionId}_${optIndex}`;
            optionLabel.textContent = typeof option === 'object' ? (option.label || option.text || option.value) : option;
            
            optionDiv.appendChild(input);
            optionDiv.appendChild(optionLabel);
            checkboxGroup.appendChild(optionDiv);
          });
        }
        
        questionDiv.appendChild(checkboxGroup);
        break;
        
      case 'dropdown':
      case 'select':
        inputElement = document.createElement('select');
        inputElement.name = questionId;
        inputElement.className = 'form-control';
        if (question.required) inputElement.required = true;
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Choose...';
        inputElement.appendChild(defaultOption);
        
        if (question.options) {
          question.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = typeof option === 'object' ? (option.value || option.label) : option;
            optionElement.textContent = typeof option === 'object' ? (option.label || option.text || option.value) : option;
            inputElement.appendChild(optionElement);
          });
        }
        
        questionDiv.appendChild(inputElement);
        break;
        
      case 'short-answer':
      case 'text':
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.name = questionId;
        inputElement.className = 'form-control';
        inputElement.placeholder = 'Your answer';
        if (question.required) inputElement.required = true;
        
        questionDiv.appendChild(inputElement);
        break;
        
      case 'paragraph':
      case 'textarea':
        inputElement = document.createElement('textarea');
        inputElement.name = questionId;
        inputElement.className = 'form-control';
        inputElement.rows = 4;
        inputElement.placeholder = 'Your answer';
        if (question.required) inputElement.required = true;
        
        questionDiv.appendChild(inputElement);
        break;
        
      case 'linear-scale':
      case 'rating':
        const scaleGroup = document.createElement('div');
        scaleGroup.className = 'rating-scale';
        
        const scaleLength = question.scaleLength || question.maxValue || 5;
        const minValue = question.minValue || 1;
        
        for (let i = minValue; i <= scaleLength; i++) {
          const ratingOption = document.createElement('div');
          ratingOption.className = 'rating-option';
          
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = questionId;
          input.value = i;
          input.id = `${questionId}_${i}`;
          if (question.required) input.required = true;
          
          const ratingNumber = document.createElement('div');
          ratingNumber.className = 'rating-number';
          ratingNumber.textContent = i;
          
          const ratingLabel = document.createElement('label');
          ratingLabel.htmlFor = `${questionId}_${i}`;
          ratingLabel.appendChild(input);
          ratingLabel.appendChild(ratingNumber);
          
          ratingOption.appendChild(ratingLabel);
          scaleGroup.appendChild(ratingOption);
        }
        
        // Add scale labels if provided
        if (question.minLabel || question.maxLabel) {
          const labelsDiv = document.createElement('div');
          labelsDiv.className = 'rating-labels';
          
          const minLabelSpan = document.createElement('span');
          minLabelSpan.textContent = question.minLabel || '';
          
          const maxLabelSpan = document.createElement('span');
          maxLabelSpan.textContent = question.maxLabel || '';
          
          labelsDiv.appendChild(minLabelSpan);
          labelsDiv.appendChild(maxLabelSpan);
          scaleGroup.appendChild(labelsDiv);
        }
        
        questionDiv.appendChild(scaleGroup);
        break;
        
      default:
        // Fallback to text input
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.name = questionId;
        inputElement.className = 'form-control';
        inputElement.placeholder = 'Your answer';
        if (question.required) inputElement.required = true;
        
        questionDiv.appendChild(inputElement);
        break;
    }
    
    // Add description if provided
    if (question.description) {
      const description = document.createElement('div');
      description.className = 'question-description';
      description.textContent = question.description;
      questionDiv.appendChild(description);
    }
    
    return questionDiv;
  }
  
  // Function to create radio group
  function createRadioGroup(label, name, options) {
    const group = document.createElement('div');
    group.className = 'radio-group';
    
    const groupLabel = document.createElement('div');
    groupLabel.innerHTML = label;
    groupLabel.style.fontWeight = 'bold';
    groupLabel.style.marginBottom = '10px';
    group.appendChild(groupLabel);
    
    options.forEach(option => {
      const radioOption = document.createElement('div');
      radioOption.className = 'radio-option';
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = option;
      input.id = `${name}-${option.replace(/\s+/g, '-').toLowerCase()}`;
      
      const label = document.createElement('label');
      label.htmlFor = input.id;
      label.textContent = option;
      
      radioOption.appendChild(input);
      radioOption.appendChild(label);
      group.appendChild(radioOption);
    });
    
    return group;
  }
  
  // Function to create input field with character counter
  function createInputField(label, type, name, required, maxLength) {
    const group = document.createElement('div');
    group.className = 'form-group';
    
    const fieldLabel = document.createElement('label');
    fieldLabel.innerHTML = label + (required ? ' <span class="required-field">*</span>' : '');
    group.appendChild(fieldLabel);
    
    const input = document.createElement('input');
    input.type = type;
    input.name = name;
    input.required = required;
    
    if (maxLength) {
      input.maxLength = maxLength;
      
      const charCount = document.createElement('div');
      charCount.className = 'char-count';
      charCount.textContent = `0/${maxLength}`;
      
      input.addEventListener('input', () => {
        charCount.textContent = `${input.value.length}/${maxLength}`;
      });
      
      group.appendChild(input);
      group.appendChild(charCount);
    } else {
      group.appendChild(input);
    }
    
    return group;
  }
  
  // Function to create dynamic popup from form data
  function createPopup(formData) {
    // Create container
    const container = document.createElement('div');
    container.className = 'survey-widget-container';
    
    // Create close button
    const closeButton = document.createElement('div');
    closeButton.className = 'survey-widget-close';
    closeButton.innerHTML = '✖';
    closeButton.addEventListener('click', () => {
      container.classList.remove('visible');
      setTimeout(() => {
        document.body.removeChild(container);
      }, 300);
    });
    
    container.appendChild(closeButton);
    
    // Create form
    const form = document.createElement('form');
    form.className = 'survey-form';
    
    // Add form title
    if (formData.title) {
      const title = document.createElement('h3');
      title.textContent = formData.title;
      form.appendChild(title);
    }
    
    // Add form description
    if (formData.description) {
      const description = document.createElement('div');
      description.className = 'survey-description';
      description.textContent = formData.description;
      form.appendChild(description);
    }
    
    // Render questions dynamically
    if (formData.questions && formData.questions.length > 0) {
      // Sort questions by order if available
      const sortedQuestions = formData.questions.sort((a, b) => {
        return (a.order || 0) - (b.order || 0);
      });
      
      sortedQuestions.forEach((question, index) => {
        const questionElement = renderQuestion(question, index);
        form.appendChild(questionElement);
      });
    } else {
      // Fallback message if no questions
      const noQuestions = document.createElement('div');
      noQuestions.className = 'no-questions';
      noQuestions.textContent = 'No questions available for this form.';
      form.appendChild(noQuestions);
    }
    
    // Form actions
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    
    const closeBtnAction = document.createElement('button');
    closeBtnAction.className = 'btn-close';
    closeBtnAction.textContent = 'Close';
    closeBtnAction.type = 'button';
    closeBtnAction.addEventListener('click', () => {
      container.classList.remove('visible');
      setTimeout(() => {
        document.body.removeChild(container);
      }, 300);
    });
    
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn-submit';
    submitBtn.textContent = 'Submit';
    submitBtn.type = 'submit';
    
    actions.appendChild(closeBtnAction);
    actions.appendChild(submitBtn);
    form.appendChild(actions);
    
    // Form submission handler
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Collect form data
      const formDataObj = new FormData(form);
      const responses = {};
      
      // Process form data
      for (const [key, value] of formDataObj.entries()) {
        if (key.endsWith('[]')) {
          // Handle checkbox arrays
          const cleanKey = key.slice(0, -2);
          if (!responses[cleanKey]) {
            responses[cleanKey] = [];
          }
          responses[cleanKey].push(value);
        } else {
          responses[key] = value;
        }
      }
      
      // Submit to widget API
      const submitData = {
        responses: responses,
        submittedAt: new Date().toISOString()
      };
      
      console.log('🚀 Survey Widget: Submitting form data:', submitData);
      
      fetch(`${baseUrl}/api/widget/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Show success message
          const successMsg = document.createElement('div');
          successMsg.className = 'success-message';
          successMsg.textContent = 'Thank you for your feedback!';
          
          // Replace form content with success message
          form.innerHTML = '';
          form.appendChild(successMsg);
          
          // Close after delay
          setTimeout(() => {
            container.classList.remove('visible');
            setTimeout(() => {
              document.body.removeChild(container);
            }, 300);
          }, 2000);
        } else {
          console.error('Error submitting feedback:', data.error);
          alert('Error submitting feedback. Please try again.');
        }
      })
      .catch(error => {
        console.error('Error submitting feedback:', error);
        alert('Error submitting feedback. Please try again.');
      });
    });
    
    container.appendChild(form);
    
    // Add to document
    document.body.appendChild(container);
    
    // Trigger animation after a small delay
    setTimeout(() => {
      container.classList.add('visible');
    }, 50);
  }
  
  // Function to fetch form data and initialize popup
  function initSurveyWidget() {
    if (!formId) {
      console.error('Survey Widget: No form ID provided');
      return;
    }
    
    fetch(`${baseUrl}/api/widget/forms/${formId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
         console.log('Form data loaded:', data);
         
         // Handle both new format (with success wrapper) and old format (direct data)
         let formData;
         if (data.success && data.widgetData) {
           formData = data.widgetData;
         } else if (data.id || data._id) {
           // Direct data format (backward compatibility)
           formData = data;
         } else {
           console.error('Survey Widget: Invalid form data received');
           return;
         }
         
         // Show popup after the configured delay
         const delay = (formData.settings && formData.settings.showAfterSeconds) || 3;
         setTimeout(() => {
           createPopup(formData);
         }, delay * 1000);
      })
      .catch(error => {
        console.error('Error loading form data:', error);
        
        // Show fallback message
        const container = document.createElement('div');
        container.className = 'survey-widget-container';
        container.innerHTML = `
          <div class="survey-widget-message">
            <p>Survey temporarily unavailable. Please try again later.</p>
            <button onclick="this.parentElement.parentElement.remove()" class="btn-close">Close</button>
          </div>
        `;
        document.body.appendChild(container);
        
        setTimeout(() => {
          container.classList.add('visible');
        }, 50);
      });
  }
  
  // Initialize
  injectStyles();
  initSurveyWidget();
  
  console.log('Survey widget initialized');
})();