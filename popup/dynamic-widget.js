/**
 * Dynamic Survey Widget Implementation
 * This script fetches form data from the database and displays it as a popup widget
 */
(function() {
  // Get the form ID and base URL
  const formId = window.SURVEY_FORM_ID;
  const baseUrl = window.SURVEY_WIDGET_BASE_URL || '';
  
  if (!formId) {
    console.error('Survey Widget: No form ID specified');
    return;
  }
  
  // CSS styles for the dynamic popup
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
      background: none;
      border: none;
    }
    
    .survey-widget-close:hover {
      color: #333;
    }
    
    .survey-widget-header {
      margin-bottom: 15px;
    }
    
    .survey-widget-title {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    
    .survey-widget-description {
      font-size: 14px;
      color: #666;
      margin-bottom: 15px;
    }
    
    .survey-question {
      margin-bottom: 20px;
    }
    
    .question-title {
      font-weight: bold;
      margin-bottom: 10px;
      font-size: 14px;
      color: #333;
    }
    
    .question-required {
      color: #e74c3c;
    }
    
    /* Radio buttons */
    .form-check-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .form-check {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .form-check-input {
      margin: 0;
    }
    
    .form-check-label {
      font-size: 14px;
      color: #333;
      cursor: pointer;
    }
    
    /* Text inputs */
    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    }
    
    .form-control:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
    
    /* Select dropdown */
    .form-select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      background-color: white;
      box-sizing: border-box;
    }
    
    /* Linear scale */
    .scale-preview {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    
    .scale-preview span {
      font-size: 14px;
      color: #666;
    }
    
    .scale-preview input[type="radio"] {
      margin: 0 5px;
    }
    
    /* Form actions */
    .survey-widget-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      gap: 10px;
    }
    
    .survey-widget-button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      text-decoration: none;
      display: inline-block;
      text-align: center;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-secondary:hover {
      background-color: #5a6268;
    }
    
    .btn-primary:hover {
      background-color: #0056b3;
    }
    
    .survey-widget-loading {
      text-align: center;
      padding: 20px;
      color: #666;
    }
    
    .survey-widget-error {
      text-align: center;
      padding: 20px;
      color: #e74c3c;
    }
  `;
  
  // Function to inject CSS
  function injectStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
  
  // Function to render question based on type
  function renderQuestion(question, index) {
    const questionId = `question_${question.id || index}`;
    const isRequired = question.required ? '<span class="question-required">*</span>' : '';
    
    let questionHtml = `
      <div class="survey-question" data-question-id="${question.id || index}">
        <div class="question-title">
          ${question.title} ${isRequired}
        </div>
    `;
    
    switch (question.type) {
      case 'radio':
      case 'multiple-choice':
        questionHtml += `
          <div class="form-check-group">
            ${question.options ? question.options.map((option, optIndex) => `
              <div class="form-check">
                <input class="form-check-input" type="radio" 
                       name="${questionId}" 
                       value="${typeof option === 'object' ? (option.value || option.label) : option}"
                       id="${questionId}_${optIndex}">
                <label class="form-check-label" for="${questionId}_${optIndex}">
                  ${typeof option === 'object' ? (option.label || option.text || option.value) : option}
                </label>
              </div>
            `).join('') : ''}
          </div>
        `;
        break;
        
      case 'checkbox':
      case 'checkboxes':
        questionHtml += `
          <div class="form-check-group">
            ${question.options ? question.options.map((option, optIndex) => `
              <div class="form-check">
                <input class="form-check-input" type="checkbox" 
                       name="${questionId}" 
                       value="${typeof option === 'object' ? (option.value || option.label) : option}"
                       id="${questionId}_${optIndex}">
                <label class="form-check-label" for="${questionId}_${optIndex}">
                  ${typeof option === 'object' ? (option.label || option.text || option.value) : option}
                </label>
              </div>
            `).join('') : ''}
          </div>
        `;
        break;
        
      case 'dropdown':
      case 'select':
        questionHtml += `
          <select class="form-select" name="${questionId}">
            <option value="">Choose...</option>
            ${question.options ? question.options.map(option => `
              <option value="${typeof option === 'object' ? (option.value || option.label) : option}">
                ${typeof option === 'object' ? (option.label || option.text || option.value) : option}
              </option>
            `).join('') : ''}
          </select>
        `;
        break;
        
      case 'short-answer':
        questionHtml += `
          <input type="text" class="form-control" name="${questionId}" placeholder="Your answer">
        `;
        break;
        
      case 'paragraph':
        questionHtml += `
          <textarea class="form-control" name="${questionId}" rows="3" placeholder="Your answer"></textarea>
        `;
        break;
        
      case 'linear-scale':
        const scaleLength = question.scaleLength || 5;
        questionHtml += `
          <div class="scale-preview">
            <span>1</span>
            ${Array.from({length: scaleLength}, (_, i) => `
              <input type="radio" name="${questionId}" value="${i + 1}">
            `).join('')}
            <span>${scaleLength}</span>
          </div>
        `;
        break;
        
      case 'date':
        questionHtml += `
          <input type="date" class="form-control" name="${questionId}">
        `;
        break;
        
      case 'time':
        questionHtml += `
          <input type="time" class="form-control" name="${questionId}">
        `;
        break;
        
      default:
        questionHtml += `<p>Unsupported question type: ${question.type}</p>`;
    }
    
    questionHtml += '</div>';
    return questionHtml;
  }
  
  // Function to collect form data
  function collectFormData(container) {
    const formData = {};
    const questions = container.querySelectorAll('.survey-question');
    
    questions.forEach(questionEl => {
      const questionId = questionEl.getAttribute('data-question-id');
      const inputs = questionEl.querySelectorAll('input, select, textarea');
      
      if (inputs.length === 1) {
        // Single input (text, select, etc.)
        formData[questionId] = inputs[0].value;
      } else {
        // Multiple inputs (radio, checkbox)
        const checkedInputs = questionEl.querySelectorAll('input:checked');
        if (checkedInputs.length > 0) {
          if (checkedInputs.length === 1) {
            formData[questionId] = checkedInputs[0].value;
          } else {
            formData[questionId] = Array.from(checkedInputs).map(input => input.value);
          }
        }
      }
    });
    
    return formData;
  }
  
  // Function to submit form data
  async function submitForm(formData) {
    try {
      // Transform formData into the expected answers format
      const answers = [];
      const questions = document.querySelectorAll('.survey-question');
      
      questions.forEach(questionEl => {
        const questionId = questionEl.getAttribute('data-question-id');
        const questionTitle = questionEl.querySelector('.question-title').textContent.trim();
        const questionType = getQuestionType(questionEl);
        
        // Only include questions that have answers
        if (formData[questionId] !== undefined) {
          answers.push({
            questionId: questionId,
            questionType: questionType,
            questionTitle: questionTitle,
            value: formData[questionId],
            timeSpent: 0, // Default value
            attempts: 1,  // Default value
            skipped: false // Default value
          });
        }
      });
      
      // Create respondent info object (can be expanded later)
      const respondentInfo = {
        name: null,
        email: null
      };
      
      const response = await fetch(`${baseUrl}/api/widget/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answers: answers,
          respondentInfo: respondentInfo
        })
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        throw new Error('Failed to submit form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Helper function to determine question type
  function getQuestionType(questionEl) {
    if (questionEl.querySelector('input[type="radio"]')) {
      return 'radio';
    } else if (questionEl.querySelector('input[type="checkbox"]')) {
      return 'checkbox';
    } else if (questionEl.querySelector('select')) {
      return 'dropdown';
    } else if (questionEl.querySelector('textarea')) {
      return 'paragraph';
    } else if (questionEl.querySelector('input[type="date"]')) {
      return 'date';
    } else if (questionEl.querySelector('input[type="time"]')) {
      return 'time';
    } else if (questionEl.querySelector('input[type="text"]')) {
      return 'short-answer';
    } else {
      return 'unknown';
    }
  }
  
  // Function to fetch form data
  async function fetchFormData() {
    try {
      const response = await fetch(`${baseUrl}/api/widget/forms/${formId}`);
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to fetch form data');
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
      throw error;
    }
  }
  
  // Function to create and show the widget
  async function createWidget() {
    // Inject styles
    injectStyles();
    
    // Create container
    const container = document.createElement('div');
    container.className = 'survey-widget-container';
    container.innerHTML = '<div class="survey-widget-loading">Loading survey...</div>';
    
    document.body.appendChild(container);
    
    try {
      // Fetch form data
      const formData = await fetchFormData();
      
      // Build the widget HTML
      const widgetHtml = `
        <button class="survey-widget-close">&times;</button>
        <div class="survey-widget-header">
          <div class="survey-widget-title">${formData.title || 'Survey'}</div>
          ${formData.description ? `<div class="survey-widget-description">${formData.description}</div>` : ''}
        </div>
        <form class="survey-widget-form">
          ${formData.questions ? formData.questions.map((question, index) => renderQuestion(question, index)).join('') : ''}
          <div class="survey-widget-actions">
            <button type="button" class="survey-widget-button btn-secondary close-btn">Close</button>
            <button type="submit" class="survey-widget-button btn-primary">Submit</button>
          </div>
        </form>
      `;
      
      container.innerHTML = widgetHtml;
      
      // Add event listeners
      const closeBtn = container.querySelector('.survey-widget-close');
      const closeBtnSecondary = container.querySelector('.close-btn');
      const form = container.querySelector('.survey-widget-form');
      
      function closeWidget() {
        container.classList.remove('visible');
        setTimeout(() => {
          document.body.removeChild(container);
        }, 300);
      }
      
      closeBtn.addEventListener('click', closeWidget);
      closeBtnSecondary.addEventListener('click', closeWidget);
      
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        const responses = collectFormData(container);
        const result = await submitForm(responses);
        
        if (result.success) {
          container.innerHTML = `
            <button class="survey-widget-close">&times;</button>
            <div style="text-align: center; padding: 20px;">
              <h3 style="color: #28a745; margin-bottom: 10px;">Thank you!</h3>
              <p>Your response has been submitted successfully.</p>
              <button type="button" class="survey-widget-button btn-primary close-btn">Close</button>
            </div>
          `;
          
          // Re-add close event listeners
          container.querySelector('.survey-widget-close').addEventListener('click', closeWidget);
          container.querySelector('.close-btn').addEventListener('click', closeWidget);
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit';
          alert('Failed to submit form. Please try again.');
        }
      });
      
      // Show the widget with animation
      setTimeout(() => {
        container.classList.add('visible');
      }, 100);
      
    } catch (error) {
      container.innerHTML = `
        <button class="survey-widget-close">&times;</button>
        <div class="survey-widget-error">
          <h3>Error</h3>
          <p>Failed to load survey. Please try again later.</p>
          <button type="button" class="survey-widget-button btn-secondary close-btn">Close</button>
        </div>
      `;
      
      // Add close event listeners for error state
      const closeBtn = container.querySelector('.survey-widget-close');
      const closeBtnSecondary = container.querySelector('.close-btn');
      
      function closeWidget() {
        container.classList.remove('visible');
        setTimeout(() => {
          document.body.removeChild(container);
        }, 300);
      }
      
      closeBtn.addEventListener('click', closeWidget);
      closeBtnSecondary.addEventListener('click', closeWidget);
      
      setTimeout(() => {
        container.classList.add('visible');
      }, 100);
    }
  }
  
  // Initialize the widget after a delay
  function initWidget() {
    // Load config for delay
    fetch(`${baseUrl}/config.json`)
      .then(response => response.json())
      .then(config => {
        const delay = (config.showAfterSeconds || 3) * 1000;
        setTimeout(createWidget, delay);
      })
      .catch(() => {
        // Default delay if config fails to load
        setTimeout(createWidget, 3000);
      });
  }
  
  // Start the widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();