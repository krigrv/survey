/**
 * Survey Widget Implementation
 * This script fetches survey configuration and displays a popup after the configured delay
 */
(function() {
  // Get the base URL from the loader script
  const baseUrl = window.SURVEY_WIDGET_BASE_URL || '';
  
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
  `;
  
  // Function to inject CSS
  function injectStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
  
  // Function to create rating scale
  function createRatingScale(label, name) {
    const section = document.createElement('div');
    section.className = 'rating-section';
    
    const ratingLabel = document.createElement('div');
    ratingLabel.className = 'rating-label';
    ratingLabel.innerHTML = label;
    section.appendChild(ratingLabel);
    
    const scale = document.createElement('div');
    scale.className = 'rating-scale';
    
    for (let i = 0; i <= 10; i++) {
      const option = document.createElement('label');
      option.className = 'rating-option';
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = i;
      input.required = true;
      
      const number = document.createElement('span');
      number.className = 'rating-number';
      number.textContent = i;
      
      option.appendChild(input);
      option.appendChild(number);
      scale.appendChild(option);
    }
    
    section.appendChild(scale);
    
    const labels = document.createElement('div');
    labels.className = 'rating-labels';
    
    const leftLabel = document.createElement('span');
    leftLabel.textContent = name === 'recommendationRating' ? 'Not At All Likely' : 'Not At All Satisfied';
    
    const rightLabel = document.createElement('span');
    rightLabel.textContent = name === 'recommendationRating' ? 'Extremely Likely' : 'Extremely Satisfied';
    
    labels.appendChild(leftLabel);
    labels.appendChild(rightLabel);
    section.appendChild(labels);
    
    return section;
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
  
  // Function to create and show the popup
  function createPopup(config) {
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
    
    if (config.useDHLSurvey) {
      // Create form element
      const form = document.createElement('form');
      form.id = 'dhl-survey-form';
      
      // Create DHL survey form
      const recommendationSection = createRatingScale(
        'How likely are you to recommend DHL Express to a friend or colleague? <span class="required-field">*</span>',
        'recommendationRating'
      );
      form.appendChild(recommendationSection);
      
      const satisfactionSection = createRatingScale(
        'Overall, how satisfied are you with the website? <span class="required-field">*</span>',
        'satisfactionRating'
      );
      form.appendChild(satisfactionSection);
      
      // Experience text area
      const experienceGroup = document.createElement('div');
      experienceGroup.className = 'form-group';
      
      const experienceLabel = document.createElement('label');
      experienceLabel.textContent = 'Please tell us more about your experience:';
      experienceGroup.appendChild(experienceLabel);
      
      const experienceTextarea = document.createElement('textarea');
      experienceTextarea.name = 'experience';
      experienceTextarea.placeholder = 'Share your experience...';
      experienceTextarea.rows = 4;
      experienceGroup.appendChild(experienceTextarea);
      
      form.appendChild(experienceGroup);
      
      // Contact permission section
      const contactGroup = createRadioGroup(
        'We are sorry to hear that you would not recommend us. Can we contact you to understand your reasons better? <span class="required-field">*</span>',
        'contactPermission',
        [
          'No, I don\'t want to be contacted by DHL.',
          'Yes, DHL can contact me if clarification is needed.',
          'Yes, I request to be contacted regarding my feedback.'
        ]
      );
      form.appendChild(contactGroup);
      
      // Further information section
      const furtherInfoGroup = createRadioGroup(
        'In the event that we require further information to work with your feedback, would it be ok to contact you?',
        'furtherInfoPermission',
        [
          'No, I don\'t want to be contacted by DHL.',
          'Yes, DHL can contact me if clarification is needed.'
        ]
      );
      form.appendChild(furtherInfoGroup);
      
      // Add note about business hours
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = '*during standard business hours';
      form.appendChild(note);
      
      // Personal information fields
      form.appendChild(createInputField('Full Name <span class="required-field">*</span>', 'text', 'fullName', true, 50));
      form.appendChild(createInputField('Phone <span class="required-field">*</span>', 'tel', 'phone', true, 50));
      form.appendChild(createInputField('Email <span class="required-field">*</span>', 'email', 'email', true));
      
      // Privacy policy
      const privacyGroup = document.createElement('div');
      privacyGroup.className = 'form-group';
      privacyGroup.innerHTML = 'Your responses will be used in accordance with our <a href="#" class="privacy-link">privacy policy</a>.';
      form.appendChild(privacyGroup);
      
      // Screenshot option
      const screenshotGroup = document.createElement('div');
      screenshotGroup.className = 'form-group';
      
      const screenshotLabel = document.createElement('div');
      screenshotLabel.textContent = 'Capture a screen or highlight specific area';
      screenshotGroup.appendChild(screenshotLabel);
      
      const screenshotBtn = document.createElement('button');
      screenshotBtn.className = 'screenshot-btn';
      screenshotBtn.type = 'button';
      screenshotBtn.innerHTML = '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiIHdpZHRoPSIxOHB4IiBoZWlnaHQ9IjE4cHgiPjxwYXRoIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNOSAzTDcuMTcgNUg0YTIgMiAwIDAgMC0yIDJ2MTJhMiAyIDAgMCAwIDIgMmgxNmEyIDIgMCAwIDAgMi0yVjdhMiAyIDAgMCAwLTItMmgtMy4xN0wxNSAzSDl6bTMgMTVhNSA1IDAgMSAxIDAtMTAgNSA1IDAgMCAxIDAgMTB6Ii8+PC9zdmc+" alt="Camera"> Take a screen capture';
      screenshotGroup.appendChild(screenshotBtn);
      
      form.appendChild(screenshotGroup);
      
      // Form actions
      const actions = document.createElement('div');
      actions.className = 'form-actions';
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn-close';
      closeBtn.textContent = 'Close';
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => {
        container.classList.remove('visible');
        setTimeout(() => {
          document.body.removeChild(container);
        }, 300);
      });
      
      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn-submit';
      submitBtn.textContent = 'Submit';
      submitBtn.type = 'submit';
      
      actions.appendChild(closeBtn);
      actions.appendChild(submitBtn);
      form.appendChild(actions);
      
      // Form submission handler
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Collect form data
        const formData = new FormData(form);
        const feedbackData = {};
        
        for (const [key, value] of formData.entries()) {
          feedbackData[key] = value;
        }
        
        // Submit the data directly to dashboard API
        console.log('🚀 Survey Widget: Posting to dashboard API (deployed version)');
        fetch('https://dashboard-survey12323.vercel.app/api/surveys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(feedbackData)
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Close the form without alert
            container.classList.remove('visible');
            setTimeout(() => {
              document.body.removeChild(container);
            }, 300);
          } else {
            console.error('Error submitting feedback:', data.message);
          }
        })
        .catch(error => {
          console.error('Error submitting feedback:', error);
        });
      });
      
      container.appendChild(form);
    } else {
      // Create standard message and button
      const message = document.createElement('div');
      message.className = 'survey-widget-message';
      message.textContent = config.message;
      container.appendChild(message);
      
      const button = document.createElement('a');
      button.className = 'survey-widget-button';
      button.textContent = config.buttonText || 'Give Feedback';
      button.style.backgroundColor = config.buttonColor;
      button.href = '#';
      button.addEventListener('click', (e) => {
        e.preventDefault();
        window.open(`${baseUrl}/feedback-form.html`, '_blank');
      });
      container.appendChild(button);
    }
    
    // Add to document
    document.body.appendChild(container);
    
    // Trigger animation after a small delay
    setTimeout(() => {
      container.classList.add('visible');
    }, 50);
  }
  
  // Function to fetch configuration and initialize popup
  function initSurveyWidget() {
    fetch(`${baseUrl}/survey-config`)
      .then(response => response.json())
      .then(config => {
        console.log('Survey config loaded:', config);
        
        // Show popup after the configured delay
        setTimeout(() => {
          createPopup(config);
        }, (config.showAfterSeconds || 3) * 1000);
      })
      .catch(error => {
        console.error('Error loading survey config:', error);
      });
  }
  
  // Initialize
  injectStyles();
  initSurveyWidget();
  
  console.log('Survey widget initialized');
})();