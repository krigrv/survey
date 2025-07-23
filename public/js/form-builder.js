// Google Forms Style Form Builder JavaScript

class GoogleFormsBuilder {
  constructor() {
    this.currentForm = {
      id: null,
      title: 'Untitled form',
      description: '',
      questions: [],
      settings: {
        allowAnonymous: true,
        requireLogin: false,
        multipleSubmissions: false,
        showProgressBar: true,
        customTheme: 'default'
      }
    };
    this.selectedQuestion = null;
    this.questionCounter = 1;
    this.activeTab = 'questions';
  }

  init() {
    this.setupEventListeners();
    this.loadFormTypes();
    this.loadFormFromURL();
    this.initializeFirstQuestion();
  }

  setupEventListeners() {
    // Form title and description
    const formTitle = document.getElementById('formTitle');
    const formDescription = document.getElementById('formDescription');
    
    if (formTitle) {
      formTitle.addEventListener('input', (e) => {
        this.currentForm.title = e.target.value;
        this.saveFormState();
      });
    }

    if (formDescription) {
      formDescription.addEventListener('input', (e) => {
        this.currentForm.description = e.target.value;
        this.saveFormState();
      });
    }

    // Tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Form type management
    const addFormTypeBtn = document.getElementById('addFormTypeBtn');
    const saveFormTypeBtn = document.getElementById('saveFormTypeBtn');
    const cancelFormTypeBtn = document.getElementById('cancelFormTypeBtn');
    const newFormTypeContainer = document.getElementById('newFormTypeContainer');
    const newFormTypeName = document.getElementById('newFormTypeName');

    if (addFormTypeBtn) {
      addFormTypeBtn.addEventListener('click', () => {
        newFormTypeContainer.style.display = 'block';
        newFormTypeName.focus();
      });
    }

    if (cancelFormTypeBtn) {
      cancelFormTypeBtn.addEventListener('click', () => {
        newFormTypeContainer.style.display = 'none';
        newFormTypeName.value = '';
      });
    }

    if (saveFormTypeBtn) {
      saveFormTypeBtn.addEventListener('click', () => {
        this.saveNewFormType();
      });
    }

    if (newFormTypeName) {
      newFormTypeName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.saveNewFormType();
        }
      });
    }

    // Toolbar buttons
    document.getElementById('saveForm')?.addEventListener('click', () => this.saveForm());
    document.getElementById('previewForm')?.addEventListener('click', () => this.previewForm());
    document.getElementById('publishForm')?.addEventListener('click', () => this.publishForm());
    document.getElementById('formSettings')?.addEventListener('click', () => this.openFormSettings());

    // Add question button
    document.getElementById('addQuestionBtn')?.addEventListener('click', () => this.addQuestion());

    // Floating toolbar buttons
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const title = e.currentTarget.getAttribute('title');
        if (title === 'Add question') {
          this.addQuestion();
        }
      });
    });

    // Setup question event listeners
    this.setupQuestionListeners();
  }

  switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    this.activeTab = tabName;
    
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });
    
    // Show selected tab content
    const tabContent = document.getElementById(`${tabName}Tab`);
    if (tabContent) {
      tabContent.style.display = 'block';
    }
    
    // Handle tab content switching if needed
    if (tabName === 'responses') {
      this.showResponses();
    } else if (tabName === 'settings') {
      this.showSettings();
    } else {
      this.showQuestions();
    }
  }

  initializeFirstQuestion() {
    // The first question is already in the HTML, just set up its listeners
    this.setupQuestionListeners();
  }

  setupQuestionListeners() {
    // Question title inputs
    document.querySelectorAll('.question-title').forEach(input => {
      input.addEventListener('input', (e) => {
        this.updateQuestionTitle(e.target);
      });
      input.addEventListener('focus', (e) => {
        this.selectQuestion(e.target.closest('.question-card'));
      });
    });

    // Question type dropdowns
    document.querySelectorAll('.question-type-dropdown').forEach(select => {
      select.addEventListener('change', (e) => {
        this.updateQuestionType(e.target);
      });
    });

    // Option inputs
    document.querySelectorAll('.option-input').forEach(input => {
      input.addEventListener('input', (e) => {
        this.updateOptionText(e.target);
      });
    });

    // Add option functionality
    document.querySelectorAll('.add-option').forEach(element => {
      element.addEventListener('click', (e) => {
        this.addOption(e.target.closest('.question-card'));
      });
    });

    // Delete option buttons
    document.querySelectorAll('.option-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.deleteOption(e.target.closest('.option-item'));
      });
    });

    // Question action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.closest('button').getAttribute('title');
        const questionCard = e.target.closest('.question-card');
        
        if (action === 'Duplicate') {
          this.duplicateQuestion(questionCard);
        } else if (action === 'Delete') {
          this.deleteQuestion(questionCard);
        }
      });
    });

    // Required toggle
    document.querySelectorAll('.required-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.toggleRequired(e.target.closest('.question-card'), e.target.checked);
      });
    });
  }

  selectQuestion(questionCard) {
    // Remove active class from all questions
    document.querySelectorAll('.question-card').forEach(card => {
      card.classList.remove('active');
    });
    
    // Add active class to selected question
    questionCard.classList.add('active');
    this.selectedQuestion = questionCard;
  }

  updateQuestionTitle(input) {
    const questionCard = input.closest('.question-card');
    const questionId = questionCard.dataset.questionId;
    
    // Update in data structure if needed
    this.saveFormState();
  }

  updateQuestionType(select) {
    const questionCard = select.closest('.question-card');
    const questionType = select.value;
    const optionsContainer = questionCard.querySelector('.question-options');
    
    // Update options based on question type
    this.renderQuestionOptions(questionCard, questionType);
    this.saveFormState();
  }

  renderQuestionOptions(questionCard, questionType) {
    const optionsContainer = questionCard.querySelector('.question-options');
    
    if (['multiple-choice', 'checkboxes', 'dropdown'].includes(questionType)) {
      // Show options for choice-based questions
      optionsContainer.innerHTML = `
        <div class="option-item">
          <div class="option-radio">
            <input type="${questionType === 'multiple-choice' ? 'radio' : 'checkbox'}" disabled>
          </div>
          <input type="text" class="option-input" placeholder="Option 1" value="Option 1">
          <button class="option-delete" title="Delete option">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="option-item add-option">
          <div class="option-radio">
            <input type="${questionType === 'multiple-choice' ? 'radio' : 'checkbox'}" disabled>
          </div>
          <span class="add-option-text">Add option or <span class="add-other-link">add "Other"</span></span>
        </div>
      `;
    } else if (questionType === 'short-answer') {
      optionsContainer.innerHTML = `
        <div class="text-input-preview">
          <input type="text" placeholder="Short answer text" disabled>
        </div>
      `;
    } else if (questionType === 'paragraph') {
      optionsContainer.innerHTML = `
        <div class="text-input-preview">
          <textarea placeholder="Long answer text" disabled rows="3"></textarea>
        </div>
      `;
    } else if (questionType === 'linear-scale') {
      optionsContainer.innerHTML = `
        <div class="scale-preview">
          <span>1</span>
          ${Array.from({length: 5}, (_, i) => `<input type="radio" disabled>`).join('')}
          <span>5</span>
        </div>
      `;
    } else if (questionType === 'date') {
      optionsContainer.innerHTML = `
        <div class="date-input-preview">
          <input type="date" disabled>
        </div>
      `;
    } else if (questionType === 'time') {
      optionsContainer.innerHTML = `
        <div class="time-input-preview">
          <input type="time" disabled>
        </div>
      `;
    }
    
    // Re-setup listeners for new elements
    this.setupQuestionListeners();
  }

  addOption(questionCard) {
    const optionsContainer = questionCard.querySelector('.question-options');
    const addOptionElement = optionsContainer.querySelector('.add-option');
    const questionType = questionCard.querySelector('.question-type-dropdown').value;
    
    const optionCount = optionsContainer.querySelectorAll('.option-item:not(.add-option)').length + 1;
    
    const newOption = document.createElement('div');
    newOption.className = 'option-item';
    newOption.innerHTML = `
      <div class="option-radio">
        <input type="${questionType === 'multiple-choice' ? 'radio' : 'checkbox'}" disabled>
      </div>
      <input type="text" class="option-input" placeholder="Option ${optionCount}" value="Option ${optionCount}">
      <button class="option-delete" title="Delete option">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    optionsContainer.insertBefore(newOption, addOptionElement);
    this.setupQuestionListeners();
    
    // Focus on the new option input
    newOption.querySelector('.option-input').focus();
  }

  deleteOption(optionItem) {
    const optionsContainer = optionItem.parentElement;
    const remainingOptions = optionsContainer.querySelectorAll('.option-item:not(.add-option)');
    
    // Don't delete if it's the last option
    if (remainingOptions.length > 1) {
      optionItem.remove();
      this.saveFormState();
    }
  }

  updateOptionText(input) {
    // Auto-save option text changes
    this.saveFormState();
  }

  addQuestion() {
    this.questionCounter++;
    const questionsContainer = document.getElementById('formQuestions');
    
    const newQuestion = document.createElement('div');
    newQuestion.className = 'question-card new';
    newQuestion.dataset.questionId = this.questionCounter;
    
    newQuestion.innerHTML = `
      <div class="question-content">
        <div class="question-header">
          <input type="text" class="question-title" placeholder="Untitled Question" value="Untitled Question">
          <div class="question-type-selector">
            <select class="question-type-dropdown">
              <option value="multiple-choice" selected>Multiple choice</option>
              <option value="short-answer">Short answer</option>
              <option value="paragraph">Paragraph</option>
              <option value="checkboxes">Checkboxes</option>
              <option value="dropdown">Dropdown</option>
              <option value="linear-scale">Linear scale</option>
              <option value="date">Date</option>
              <option value="time">Time</option>
            </select>
          </div>
        </div>
        
        <div class="question-options">
          <div class="option-item">
            <div class="option-radio">
              <input type="radio" disabled>
            </div>
            <input type="text" class="option-input" placeholder="Option 1" value="Option 1">
            <button class="option-delete" title="Delete option">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="option-item add-option">
            <div class="option-radio">
              <input type="radio" disabled>
            </div>
            <span class="add-option-text">Add option or <span class="add-other-link">add "Other"</span></span>
          </div>
        </div>
      </div>
      
      <div class="question-footer">
        <div class="question-actions">
          <button class="action-btn" title="Duplicate">
            <i class="fas fa-copy"></i>
          </button>
          <button class="action-btn" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
          <div class="required-toggle">
            <label class="toggle-label">
              Required
              <input type="checkbox" class="required-checkbox">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    `;
    
    questionsContainer.appendChild(newQuestion);
    this.setupQuestionListeners();
    
    // Focus on the new question title
    newQuestion.querySelector('.question-title').focus();
    
    // Remove 'new' class after animation
    setTimeout(() => {
      newQuestion.classList.remove('new');
    }, 300);
    
    this.saveFormState();
  }

  duplicateQuestion(questionCard) {
    const clone = questionCard.cloneNode(true);
    this.questionCounter++;
    clone.dataset.questionId = this.questionCounter;
    clone.classList.add('new');
    
    // Insert after the original question
    questionCard.parentNode.insertBefore(clone, questionCard.nextSibling);
    this.setupQuestionListeners();
    
    // Remove 'new' class after animation
    setTimeout(() => {
      clone.classList.remove('new');
    }, 300);
    
    this.saveFormState();
  }

  deleteQuestion(questionCard) {
    const questionsContainer = document.getElementById('formQuestions');
    const remainingQuestions = questionsContainer.querySelectorAll('.question-card');
    
    // Don't delete if it's the last question
    if (remainingQuestions.length > 1) {
      questionCard.remove();
      this.saveFormState();
    } else {
      alert('You must have at least one question in your form.');
    }
  }

  toggleRequired(questionCard, isRequired) {
    if (isRequired) {
      questionCard.classList.add('required');
    } else {
      questionCard.classList.remove('required');
    }
    this.saveFormState();
  }

  showQuestions() {
    // Show questions tab content
    console.log('Showing questions tab');
  }

  showResponses() {
    // Show responses tab content
    console.log('Showing responses tab');
  }

  showSettings() {
    // Show settings tab content
    console.log('Showing settings tab');
  }

  async saveForm() {
    try {
      // Ensure we have an app to save the form to
      const appId = await this.ensureAppExists();
      
      const formData = this.getFormData();
      formData.appId = appId;
      
      const url = this.currentForm.id ? `/api/forms/${this.currentForm.id}` : '/api/forms';
      const response = await fetch(url, {
        method: this.currentForm.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        this.currentForm.id = result.id;
        this.showSuccessMessage('Form saved successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save form');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      this.showErrorMessage(`Failed to save form: ${error.message}`);
    }
  }

  async ensureAppExists() {
    try {
      // First, try to get existing apps
      const appsResponse = await fetch('/api/apps');
      
      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        if (appsData.apps && appsData.apps.length > 0) {
          return appsData.apps[0]._id; // Use the first available app
        }
      }
      
      // If no apps exist, create a default one
      const createAppResponse = await fetch('/api/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'default',
          displayName: 'Default App',
          description: 'Default application for form builder',
          code: 'DEFAULT',
          icon: '📝',
          color: '#007bff'
        })
      });
      
      if (createAppResponse.ok) {
        const newApp = await createAppResponse.json();
        return newApp._id;
      } else {
        throw new Error('Failed to create default app');
      }
    } catch (error) {
      console.error('Error ensuring app exists:', error);
      throw new Error('Unable to create or access application');
    }
  }

  previewForm() {
    const formData = this.getFormData();
    const previewUrl = `/form-viewer.html?preview=true&data=${encodeURIComponent(JSON.stringify(formData))}`;
    window.open(previewUrl, '_blank');
  }

  publishForm() {
    if (this.currentForm.id) {
      const publishUrl = `/form-viewer.html?id=${this.currentForm.id}`;
      navigator.clipboard.writeText(window.location.origin + publishUrl);
      this.showSuccessMessage('Form URL copied to clipboard!');
    } else {
      this.showErrorMessage('Please save the form first.');
    }
  }

  openFormSettings() {
        // Switch to settings tab instead of opening modal
        this.showTab('settings');
    }

  getFormData() {
    const questions = [];
    document.querySelectorAll('.question-card').forEach((card, index) => {
      const questionType = card.querySelector('.question-type-dropdown').value;
      const questionData = {
        id: card.dataset.questionId || `question_${Date.now()}_${index}`,
        type: questionType,
        title: card.querySelector('.question-title').value || 'Untitled Question',
        description: card.querySelector('.question-description')?.value || '',
        required: card.querySelector('.required-checkbox').checked,
        options: [],
        validation: {},
        settings: {},
        order: index,
        conditional: {}
      };
      
      // Get options for choice-based questions
      const optionInputs = card.querySelectorAll('.option-input');
      optionInputs.forEach((input, optionIndex) => {
        if (input.value.trim()) {
          questionData.options.push({
            id: `option_${questionData.id}_${optionIndex}`,
            text: input.value.trim(),
            value: input.value.trim().toLowerCase().replace(/\s+/g, '_')
          });
        }
      });
      
      // Add validation rules based on question type
      switch (questionType) {
        case 'email':
          questionData.validation.pattern = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
          questionData.validation.message = 'Please enter a valid email address';
          break;
        case 'number':
          questionData.validation.type = 'number';
          break;
        case 'url':
          questionData.validation.pattern = '^https?:\\/\\/.+';
          questionData.validation.message = 'Please enter a valid URL';
          break;
        case 'phone':
          questionData.validation.pattern = '^[\\+]?[1-9]?[0-9]{7,15}$';
          questionData.validation.message = 'Please enter a valid phone number';
          break;
      }
      
      // Add settings based on question type
      if (['multiple_choice', 'checkbox'].includes(questionType)) {
        questionData.settings.allowOther = false;
        questionData.settings.randomizeOptions = false;
      }
      
      if (questionType === 'text' || questionType === 'textarea') {
        questionData.settings.maxLength = 1000;
        questionData.settings.placeholder = '';
      }
      
      questions.push(questionData);
    });
    
    return {
      ...this.currentForm,
      title: document.getElementById('formTitle').value || 'Untitled Form',
      description: document.getElementById('formDescription').value || '',
      formType: document.getElementById('formType')?.value || null,
      questions: questions,
      settings: {
        allowAnonymous: true,
        requireLogin: false,
        allowMultipleSubmissions: false,
        showProgressBar: true,
        customTheme: {
          primaryColor: '#1976d2',
          backgroundColor: '#ffffff',
          fontFamily: 'Inter, sans-serif'
        }
      },
      category: 'general',
      tags: []
    };
  }

  loadFormFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('id');
    
    if (formId) {
      this.loadForm(formId);
    }
  }

  async loadForm(formId) {
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const formData = await response.json();
        this.currentForm = formData;
        this.renderForm();
      }
    } catch (error) {
      console.error('Error loading form:', error);
    }
  }

  renderForm() {
    // Update form title and description
    document.getElementById('formTitle').value = this.currentForm.title || '';
    document.getElementById('formDescription').value = this.currentForm.description || '';
    
    // Update form type if it exists
    const formTypeSelect = document.getElementById('formType');
    if (formTypeSelect && this.currentForm.formType) {
      formTypeSelect.value = this.currentForm.formType;
    }
    
    // Clear existing questions and render new ones
    const questionsContainer = document.getElementById('formQuestions');
    questionsContainer.innerHTML = '';
    
    if (this.currentForm.questions && this.currentForm.questions.length > 0) {
      this.currentForm.questions.forEach(question => {
        this.renderQuestion(question);
      });
    } else {
      // Add default question if none exist
      this.addQuestion();
    }
  }

  renderQuestion(questionData) {
    const questionsContainer = document.getElementById('formQuestions');
    const questionCard = document.createElement('div');
    questionCard.className = 'question-card';
    questionCard.dataset.questionId = questionData.id;
    
    // Set required class if needed
    if (questionData.required) {
      questionCard.classList.add('required');
    }
    
    questionCard.innerHTML = `
      <div class="question-header">
        <div class="question-controls">
          <button class="btn-icon duplicate-question" title="Duplicate question">
            <i class="fas fa-copy"></i>
          </button>
          <button class="btn-icon delete-question" title="Delete question">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="question-content">
        <div class="question-input-group">
          <input type="text" class="question-title" placeholder="Question title" value="${questionData.title || ''}">
          <select class="question-type-dropdown">
            <option value="text" ${questionData.type === 'text' ? 'selected' : ''}>Short Answer</option>
            <option value="textarea" ${questionData.type === 'textarea' ? 'selected' : ''}>Paragraph</option>
            <option value="multiple_choice" ${questionData.type === 'multiple_choice' ? 'selected' : ''}>Multiple Choice</option>
            <option value="checkbox" ${questionData.type === 'checkbox' ? 'selected' : ''}>Checkboxes</option>
            <option value="dropdown" ${questionData.type === 'dropdown' ? 'selected' : ''}>Dropdown</option>
            <option value="email" ${questionData.type === 'email' ? 'selected' : ''}>Email</option>
            <option value="number" ${questionData.type === 'number' ? 'selected' : ''}>Number</option>
            <option value="date" ${questionData.type === 'date' ? 'selected' : ''}>Date</option>
            <option value="time" ${questionData.type === 'time' ? 'selected' : ''}>Time</option>
            <option value="url" ${questionData.type === 'url' ? 'selected' : ''}>URL</option>
            <option value="phone" ${questionData.type === 'phone' ? 'selected' : ''}>Phone</option>
            <option value="file" ${questionData.type === 'file' ? 'selected' : ''}>File Upload</option>
            <option value="rating" ${questionData.type === 'rating' ? 'selected' : ''}>Rating Scale</option>
            <option value="matrix" ${questionData.type === 'matrix' ? 'selected' : ''}>Multiple Choice Grid</option>
          </select>
        </div>
        <div class="question-options-container">
          <!-- Options will be rendered here based on question type -->
        </div>
        <div class="question-footer">
          <label class="required-toggle">
            <input type="checkbox" class="required-checkbox" ${questionData.required ? 'checked' : ''}>
            <span>Required</span>
          </label>
        </div>
      </div>
    `;
    
    questionsContainer.appendChild(questionCard);
    
    // Render options based on question type
    this.renderQuestionOptions(questionCard, questionData.type);
    
    // Populate existing options if they exist
    if (questionData.options && questionData.options.length > 0) {
      const optionsContainer = questionCard.querySelector('.options-container');
      if (optionsContainer) {
        // Clear default options first
        optionsContainer.innerHTML = '';
        
        questionData.options.forEach((option, index) => {
          const optionText = typeof option === 'string' ? option : option.text;
          const optionItem = document.createElement('div');
          optionItem.className = 'option-item';
          optionItem.innerHTML = `
            <span class="option-number">${index + 1}.</span>
            <input type="text" class="option-input" value="${optionText}" placeholder="Option ${index + 1}">
            <button class="btn-icon delete-option" title="Delete option">
              <i class="fas fa-times"></i>
            </button>
          `;
          optionsContainer.appendChild(optionItem);
        });
        
        // Add "Add option" button
        const addOptionBtn = document.createElement('button');
        addOptionBtn.className = 'add-option-btn';
        addOptionBtn.innerHTML = '<i class="fas fa-plus"></i> Add option';
        optionsContainer.appendChild(addOptionBtn);
      }
    }
    
    this.setupQuestionListeners();
  }

  saveFormState() {
    const formData = this.getFormData();
    localStorage.setItem('formBuilder_currentForm', JSON.stringify(formData));
  }

  loadFormState() {
    const savedForm = localStorage.getItem('formBuilder_currentForm');
    if (savedForm) {
      this.currentForm = JSON.parse(savedForm);
      this.renderForm();
    }
  }

  showSuccessMessage(message) {
    // Show success toast or notification
    console.log('Success:', message);
  }

  showErrorMessage(message) {
    // Show error toast or notification
    console.error('Error:', message);
  }

  // Form Type Management Methods
  async loadFormTypes() {
    try {
      const response = await fetch('/api/form-types');
      if (response.ok) {
        const formTypes = await response.json();
        this.populateFormTypeDropdown(formTypes);
      }
    } catch (error) {
      console.error('Error loading form types:', error);
    }
  }

  populateFormTypeDropdown(formTypes) {
    const formTypeSelect = document.getElementById('formType');
    if (formTypeSelect) {
      // Clear existing options except the first one
      formTypeSelect.innerHTML = '<option value="">Select form type...</option>';
      
      formTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type._id;
        option.textContent = type.name;
        formTypeSelect.appendChild(option);
      });
    }
  }

  async saveNewFormType() {
    const newFormTypeName = document.getElementById('newFormTypeName');
    const newFormTypeContainer = document.getElementById('newFormTypeContainer');
    
    if (!newFormTypeName.value.trim()) {
      this.showErrorMessage('Please enter a form type name');
      return;
    }

    try {
      const response = await fetch('/api/form-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newFormTypeName.value.trim(),
          description: `Custom form type: ${newFormTypeName.value.trim()}`
        })
      });

      if (response.ok) {
        const newFormType = await response.json();
        
        // Add to dropdown
        const formTypeSelect = document.getElementById('formType');
        const option = document.createElement('option');
        option.value = newFormType._id;
        option.textContent = newFormType.name;
        option.selected = true;
        formTypeSelect.appendChild(option);
        
        // Hide the new form type container
        newFormTypeContainer.style.display = 'none';
        newFormTypeName.value = '';
        
        this.showSuccessMessage('Form type created successfully!');
      } else {
        const error = await response.json();
        this.showErrorMessage(error.message || 'Error creating form type');
      }
    } catch (error) {
      console.error('Error saving form type:', error);
      this.showErrorMessage('Error creating form type');
    }
  }
}

// Initialize the form builder when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const formBuilder = new GoogleFormsBuilder();
  formBuilder.init();
});