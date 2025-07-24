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
    
    // Initially disable publish button until form is saved
    const publishBtn = document.getElementById('publishForm');
    if (publishBtn) {
      publishBtn.disabled = true;
    }
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

    // Form type dropdown
    const formTypeSelect = document.getElementById('formType');
    if (formTypeSelect) {
      formTypeSelect.addEventListener('change', (e) => {
        this.currentForm.formTypeId = e.target.value;
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

    // Project management
    document.getElementById('saveProjectBtn')?.addEventListener('click', () => this.saveProject());

    // Floating toolbar buttons
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const title = e.currentTarget.getAttribute('title');
        if (title === 'Add question') {
          this.addQuestion();
        }
      });
    });

    // User assignment functionality
    const addUserBtn = document.getElementById('addUserBtn');
    const userEmailInput = document.getElementById('userEmailInput');
    
    if (addUserBtn) {
      addUserBtn.addEventListener('click', () => {
        this.addUserToProject();
      });
    }
    
    if (userEmailInput) {
      userEmailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addUserToProject();
        }
      });
    }

    // Response form type dropdown
    const responseFormTypeSelect = document.getElementById('responseFormTypeSelect');
    if (responseFormTypeSelect) {
      responseFormTypeSelect.addEventListener('change', (e) => {
        this.loadFormsByType(e.target.value);
      });
    }

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
        const questionCard = e.target.closest('.question-card');
        if (questionCard) {
          this.selectQuestion(questionCard);
        }
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
        const questionCard = e.target.closest('.question-card');
        if (questionCard) {
          this.addOption(questionCard);
        }
      });
    });

    // Delete option buttons
    document.querySelectorAll('.option-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const optionItem = e.target.closest('.option-item');
        if (optionItem) {
          this.deleteOption(optionItem);
        }
      });
    });

    // Question action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        const questionCard = e.target.closest('.question-card');
        
        if (!button || !questionCard) {
          return;
        }
        
        const action = button.getAttribute('title');
        
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
        const questionCard = e.target.closest('.question-card');
        if (questionCard) {
          this.toggleRequired(questionCard, e.target.checked);
        }
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
    } else {
      // For other question types, use the updateQuestionOptions method
      this.updateQuestionOptions(questionCard);
    }
    
    // Re-setup listeners for new elements
    this.setupQuestionListeners();
  }

  renderFormPreview(form) {
    const container = document.getElementById('responsesContainer');
    if (!container) return;
    
    const previewHtml = `
      <div class="form-preview">
        <div class="form-header">
          <h2>${form.title}</h2>
          <p>${form.description}</p>
          <button class="btn btn-secondary back-to-list-btn">← Back to List</button>
        </div>
        <div class="form-questions">
          ${form.questions ? form.questions.map(question => `
            <div class="question-preview">
              <h4>${question.title}</h4>
              ${this.renderQuestionPreview(question)}
            </div>
          `).join('') : ''}
        </div>
      </div>
    `;
    
    container.innerHTML = previewHtml;
    
    // Add event listener for back button
    const backButton = container.querySelector('.back-to-list-btn');
    if (backButton) {
      backButton.addEventListener('click', () => {
        const formTypeSelect = document.getElementById('responseFormTypeSelect');
        if (formTypeSelect && formTypeSelect.value) {
          this.loadFormsByType(formTypeSelect.value);
        }
      });
    }

    // Add event listener for embed code button
    const embedButton = container.querySelector('.embed-code-btn');
    const embedSection = container.querySelector('.embed-code-section');
    const embedTextarea = container.querySelector('.embed-code-textarea');
    const copyButton = container.querySelector('.copy-embed-btn');

    if (embedButton && embedSection && embedTextarea) {
      embedButton.addEventListener('click', () => {
        const formId = embedButton.getAttribute('data-form-id');
        const baseUrl = window.location.origin;
        const embedCode = `<script type="text/javascript" src="${baseUrl}/popup/embed.js" data-form-id="${formId}"></script>`;
        
        embedTextarea.value = embedCode;
        embedSection.style.display = embedSection.style.display === 'none' ? 'block' : 'none';
      });
    }

    if (copyButton && embedTextarea) {
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(embedTextarea.value);
          const originalText = copyButton.innerHTML;
          copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
          copyButton.classList.remove('btn-outline-secondary');
          copyButton.classList.add('btn-success');
          
          setTimeout(() => {
            copyButton.innerHTML = originalText;
            copyButton.classList.remove('btn-success');
            copyButton.classList.add('btn-outline-secondary');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy embed code:', err);
          // Fallback for older browsers
          embedTextarea.select();
          document.execCommand('copy');
        }
      });
    }
  }

  renderQuestionPreview(question) {
    switch (question.type) {
      case 'multiple-choice':
      case 'radio':
        return `
          <div class="form-check-group">
            ${question.options ? question.options.map(option => `
              <div class="form-check">
                <input class="form-check-input" type="radio" disabled>
                <label class="form-check-label">${typeof option === 'object' ? (option.label || option.text || option.value) : option}</label>
              </div>
            `).join('') : ''}
          </div>
        `;
      case 'checkboxes':
      case 'checkbox':
        return `
          <div class="form-check-group">
            ${question.options ? question.options.map(option => `
              <div class="form-check">
                <input class="form-check-input" type="checkbox" disabled>
                <label class="form-check-label">${typeof option === 'object' ? (option.label || option.text || option.value) : option}</label>
              </div>
            `).join('') : ''}
          </div>
        `;
      case 'dropdown':
      case 'select':
        return `
          <select class="form-select" disabled>
            <option>Choose...</option>
            ${question.options ? question.options.map(option => `
              <option>${typeof option === 'object' ? (option.label || option.text || option.value) : option}</option>
            `).join('') : ''}
          </select>
        `;
      case 'short-answer':
        return `
          <div class="text-input-preview">
            <input type="text" placeholder="Short answer text" disabled>
          </div>
        `;
      case 'paragraph':
        return `
          <div class="text-input-preview">
            <textarea placeholder="Long answer text" disabled rows="3"></textarea>
          </div>
        `;
      case 'linear-scale':
        return `
          <div class="scale-preview">
            <span>1</span>
            ${Array.from({length: 5}, (_, i) => `<input type="radio" disabled>`).join('')}
            <span>5</span>
          </div>
        `;
      case 'date':
        return `
          <div class="date-input-preview">
            <input type="date" disabled>
          </div>
        `;
      case 'time':
        return `
          <div class="time-input-preview">
            <input type="time" disabled>
          </div>
        `;
      default:
        return '<div>Unsupported question type</div>';
    }
  }

  updateQuestionOptions(questionCard) {
    const optionsContainer = questionCard.querySelector('.question-options');
    const questionType = questionCard.querySelector('.question-type-dropdown').value;
    
    if (questionType === 'short-answer') {
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
    if (!optionItem || !optionItem.parentElement) {
      return;
    }
    
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
    // Ensure form types are loaded when settings tab is shown
    this.loadFormTypes();
  }

  clearForm() {
    // Clear form title and description
    const formTitle = document.getElementById('formTitle');
    const formDescription = document.getElementById('formDescription');
    if (formTitle) formTitle.value = '';
    if (formDescription) formDescription.value = '';
    
    // Clear all questions
    const questionsContainer = document.getElementById('formQuestions');
    if (questionsContainer) {
      questionsContainer.innerHTML = '';
      this.initializeFirstQuestion();
    }
    
    // Reset current form
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
  }

  async loadFormsByType(formTypeId) {
    const container = document.getElementById('responseFormsContainer');
    
    if (!formTypeId) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
          <h5 class="text-muted">No forms found</h5>
          <p class="text-muted">Select a form type above to view saved forms.</p>
        </div>
      `;
      return;
    }
    
    try {
      const data = await api.get(`/form-types/${formTypeId}/forms`);
      this.displayForms(data.forms || data);
    } catch (error) {
      console.error('Error loading forms by type:', error);
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
          <h5 class="text-muted">Error loading forms</h5>
          <p class="text-muted">Failed to load forms for this type.</p>
        </div>
      `;
    }
  }

  displayForms(forms) {
    const container = document.getElementById('responseFormsContainer');
    
    if (!forms || forms.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
          <h5 class="text-muted">No forms found</h5>
          <p class="text-muted">No forms have been saved for this form type yet.</p>
        </div>
      `;
      return;
    }
    
    const formsHtml = forms.map(form => `
      <div class="card mb-3">
        <div class="card-body">
          <h5 class="card-title">${form.title || 'Untitled Form'}</h5>
          <p class="card-text">${form.description || 'No description'}</p>
          <p class="text-muted small">Created: ${new Date(form.createdAt).toLocaleDateString()}</p>
          <button class="btn btn-primary btn-sm view-form-btn" data-form-id="${form._id}">
            <i class="fas fa-eye"></i> View Form
          </button>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = formsHtml;
    
    // Add event listeners for view form buttons
    container.querySelectorAll('.view-form-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const formId = e.target.closest('.view-form-btn').dataset.formId;
        this.viewForm(formId);
      });
    });
  }

  async viewForm(formId) {
    try {
      const form = await api.getForm(formId);
      this.renderFormPreview(form);
    } catch (error) {
      console.error('Error viewing form:', error);
      this.showErrorMessage('Error loading form details');
    }
  }

  renderFormPreview(form) {
    const container = document.getElementById('responseFormsContainer');
    
    const previewHtml = `
      <div class="form-preview">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h4>Form Preview</h4>
          <div>
            <button class="btn btn-info btn-sm me-2 embed-code-btn" data-form-id="${form.id || form._id}">
              <i class="fas fa-code"></i> Get Embed Code
            </button>
            <button class="btn btn-secondary back-to-list-btn">
              <i class="fas fa-arrow-left"></i> Back to List
            </button>
          </div>
        </div>
        <div class="embed-code-section" style="display: none;">
          <div class="card mb-3">
            <div class="card-header">
              <h6 class="mb-0"><i class="fas fa-code"></i> Embed Code</h6>
            </div>
            <div class="card-body">
              <p class="text-muted small mb-2">Copy and paste this code into your website where you want the survey widget to appear:</p>
              <div class="input-group">
                <textarea class="form-control embed-code-textarea" rows="2" readonly></textarea>
                <button class="btn btn-outline-secondary copy-embed-btn" type="button">
                  <i class="fas fa-copy"></i> Copy
                </button>
              </div>
              <small class="text-muted">The survey will appear as a popup widget after a few seconds when visitors load your page.</small>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <h5>${form.title || 'Untitled Form'}</h5>
            <p class="mb-0">${form.description || 'No description'}</p>
          </div>
          <div class="card-body">
            ${form.questions && form.questions.length > 0 ? 
              form.questions.map((question, index) => `
                <div class="question-preview mb-4">
                  <h6>${index + 1}. ${question.title}</h6>
                  ${this.renderQuestionPreview(question)}
                </div>
              `).join('') : 
              '<p class="text-muted">No questions in this form.</p>'
            }
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = previewHtml;
    
    // Add event listener for back button
    const backButton = container.querySelector('.back-to-list-btn');
    if (backButton) {
      backButton.addEventListener('click', () => {
        const formTypeSelect = document.getElementById('responseFormTypeSelect');
        if (formTypeSelect && formTypeSelect.value) {
          this.loadFormsByType(formTypeSelect.value);
        }
      });
    }
  }

  renderQuestionPreview(question) {
    switch (question.type) {
      case 'multiple-choice':
      case 'radio':
        return `
          <div class="form-check-group">
            ${question.options ? question.options.map(option => `
              <div class="form-check">
                <input class="form-check-input" type="radio" disabled>
                <label class="form-check-label">${typeof option === 'object' ? (option.label || option.text || option.value) : option}</label>
              </div>
            `).join('') : ''}
          </div>
        `;
      case 'checkboxes':
      case 'checkbox':
        return `
          <div class="form-check-group">
            ${question.options ? question.options.map(option => `
              <div class="form-check">
                <input class="form-check-input" type="checkbox" disabled>
                <label class="form-check-label">${typeof option === 'object' ? (option.label || option.text || option.value) : option}</label>
              </div>
            `).join('') : ''}
          </div>
        `;
      case 'dropdown':
      case 'select':
        return `
          <select class="form-select" disabled>
            <option>Choose...</option>
            ${question.options ? question.options.map(option => `
              <option>${typeof option === 'object' ? (option.label || option.text || option.value) : option}</option>
            `).join('') : ''}
          </select>
        `;
      case 'short-answer':
        return '<input type="text" class="form-control" placeholder="Short answer text" disabled>';
      case 'paragraph':
        return '<textarea class="form-control" rows="3" placeholder="Long answer text" disabled></textarea>';
      case 'linear-scale':
        return `
          <div class="scale-preview">
            <span>1</span>
            ${Array.from({length: 5}, (_, i) => `<input type="radio" disabled>`).join('')}
            <span>5</span>
          </div>
        `;
      case 'date':
        return '<input type="date" class="form-control" disabled>';
      case 'time':
        return '<input type="time" class="form-control" disabled>';
      default:
        return '<p class="text-muted">Unknown question type</p>';
    }
  }

  async saveForm() {
    try {
      // Get selected form type
      const formTypeSelect = document.getElementById('formType');
      if (!formTypeSelect || !formTypeSelect.value) {
        this.showErrorMessage('Please select a form type before saving the form.');
        return;
      }
      
      // Disable save button to prevent multiple saves
      const saveBtn = document.getElementById('saveForm');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      }
      
      const formData = this.getFormData();
      formData.formTypeId = formTypeSelect.value;
      
      // Save to a new endpoint for form type based forms
      const response = await fetch('/api/form-types/save-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Save API response:', result);
        
        // Update current form with the saved form ID
        if (result.form && result.form._id) {
          this.currentForm.id = result.form._id;
          console.log('Form ID set to:', this.currentForm.id);
        } else if (result.data && result.data.id) {
          // Handle case where form ID is in data.id
          this.currentForm.id = result.data.id;
          console.log('Form ID set to (data.id):', this.currentForm.id);
        } else if (result._id) {
          // Handle case where form ID is directly in result
          this.currentForm.id = result._id;
          console.log('Form ID set to (direct):', this.currentForm.id);
        } else {
          console.log('No form ID found in response:', result);
        }
        this.showSuccessMessage('Form saved successfully!');
        
        // Disable save button after successful save and enable publish button
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
        }
        
        // Enable publish button after successful save
        const publishBtn = document.getElementById('publishForm');
        if (publishBtn) {
          publishBtn.disabled = false;
        }
        
        // Don't clear the form after successful save to allow publishing
        // this.clearForm();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save form');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      
      // Re-enable save button on error
      const saveBtn = document.getElementById('saveForm');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
      }
      
      this.showErrorMessage(`Failed to save form: ${error.message}`);
    }
  }

  // App management removed - authentication no longer required

  previewForm() {
    const formData = this.getFormData();
    const previewUrl = `/form-viewer.html?preview=true&data=${encodeURIComponent(JSON.stringify(formData))}`;
    window.open(previewUrl, '_blank');
  }

  publishForm() {
    console.log('Publish button clicked');
    console.log('Current form ID:', this.currentForm.id);
    
    // Only allow publish if form is already saved
    if (this.currentForm.id) {
      console.log('Showing embed dialog for form ID:', this.currentForm.id);
      this.showEmbedCodeDialog(this.currentForm.id);
    } else {
      console.log('No form ID found, showing error message');
      this.showErrorMessage('Please save the form first before publishing.');
    }
  }



  showEmbedCodeDialog(formId) {
    console.log('showEmbedCodeDialog called with formId:', formId);
    const baseUrl = window.location.origin;
    const embedCode = `<script type="text/javascript" src="${baseUrl}/popup/embed.js" data-form-id="${formId}"></script>`;
    console.log('Generated embed code:', embedCode);
    
    // Create modal dialog
    const modal = document.createElement('div');
    console.log('Modal element created');
    modal.className = 'modal fade show';
    modal.style.display = 'block';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">📋 Embed Code</h5>
            <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted mb-3">Copy and paste this code into your website to embed the survey widget:</p>
            <div class="form-group">
              <label class="form-label fw-bold">Embed Script:</label>
              <div class="input-group">
                <textarea class="form-control" id="embedCodeText" rows="3" readonly>${embedCode}</textarea>
                <button class="btn btn-primary" type="button" onclick="this.copyEmbedCode()">
                  <i class="fas fa-copy"></i> Copy
                </button>
              </div>
            </div>
            <div class="alert alert-info mt-3">
              <i class="fas fa-info-circle"></i>
              <strong>How to use:</strong>
              <ul class="mb-0 mt-2">
                <li>Paste this script tag anywhere in your HTML page</li>
                <li>The widget will automatically appear as a popup</li>
                <li>Users can interact with your form directly on their website</li>
              </ul>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            <button type="button" class="btn btn-primary" onclick="this.copyEmbedCode()">
              <i class="fas fa-copy"></i> Copy Embed Code
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add copy functionality
    modal.copyEmbedCode = function() {
      const textarea = modal.querySelector('#embedCodeText');
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      navigator.clipboard.writeText(embedCode).then(() => {
        // Show success feedback
        const copyBtn = modal.querySelector('.modal-footer .btn-primary');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyBtn.classList.remove('btn-primary');
        copyBtn.classList.add('btn-success');
        
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.classList.remove('btn-success');
          copyBtn.classList.add('btn-primary');
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard. Please copy manually.');
      });
    };
    
    // Ensure modal is properly styled and visible
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.zIndex = '9999';
    
    document.body.appendChild(modal);
    
    // Auto-focus and select the textarea
    setTimeout(() => {
      const textarea = modal.querySelector('#embedCodeText');
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }, 100);
  }

  openFormSettings() {
        // Switch to settings tab instead of opening modal
        this.switchTab('settings');
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
      assignedUsers: this.assignedUsers || [],
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
          'Content-Type': 'application/json'
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
    
    // Load assigned users if they exist
    if (this.currentForm.assignedUsers) {
      this.assignedUsers = this.currentForm.assignedUsers;
    } else {
      this.assignedUsers = [];
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
    
    // Render assigned users in settings tab
    this.renderAssignedUsers();
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

  showInfoMessage(message) {
    // Show info toast or notification
    console.log('Info:', message);
  }

  // Form Type Management Methods
  async loadFormTypes() {
    try {
      const response = await fetch('/api/form-types', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const formTypes = await response.json();
        this.populateFormTypeDropdown(formTypes);
      } else {
        console.error('Failed to load form types:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading form types:', error);
    }
  }

  populateFormTypeDropdown(formTypes) {
    const formTypeSelect = document.getElementById('formType');
    const responseFormTypeSelect = document.getElementById('responseFormTypeSelect');
    
    if (formTypeSelect) {
      // Clear existing options except the first one
      formTypeSelect.innerHTML = '<option value="">Select form type...</option>';
      
      formTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type._id;
        option.textContent = type.name || type.title;
        formTypeSelect.appendChild(option);
      });
    }
    
    if (responseFormTypeSelect) {
      // Clear existing options except the first one
      responseFormTypeSelect.innerHTML = '<option value="">Select a form type...</option>';
      
      formTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type._id;
        option.textContent = type.name || type.title;
        responseFormTypeSelect.appendChild(option);
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

  // User Assignment Methods
  async addUserToProject() {
    const userEmailInput = document.getElementById('userEmailInput');
    const email = userEmailInput.value.trim();
    
    if (!email) {
      this.showErrorMessage('Please enter a user email');
      return;
    }
    
    if (!this.isValidEmail(email)) {
      this.showErrorMessage('Please enter a valid email address');
      return;
    }
    
    try {
      // Check if user exists
      const userResponse = await fetch(`/api/users/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      if (!userResponse.ok) {
        this.showErrorMessage('User not found. Please ensure the user is registered in the system.');
        return;
      }
      
      const userData = await userResponse.json();
      
      // Check if user is already assigned
      if (this.isUserAlreadyAssigned(email)) {
        this.showErrorMessage('User is already assigned to this project');
        return;
      }
      
      // Add user to the current form's assigned users
      if (!this.currentForm.assignedUsers) {
        this.currentForm.assignedUsers = [];
      }
      
      this.currentForm.assignedUsers.push({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        assignedAt: new Date().toISOString()
      });
      
      // Update the UI
      this.renderAssignedUsers();
      userEmailInput.value = '';
      
      this.showSuccessMessage(`User ${email} added successfully`);
      
    } catch (error) {
      console.error('Error adding user:', error);
      this.showErrorMessage('Failed to add user. Please try again.');
    }
  }
  
  removeUserFromProject(email) {
    if (!this.currentForm.assignedUsers) return;
    
    this.currentForm.assignedUsers = this.currentForm.assignedUsers.filter(user => user.email !== email);
    this.renderAssignedUsers();
    this.showSuccessMessage(`User ${email} removed successfully`);
  }
  
  isUserAlreadyAssigned(email) {
    if (!this.currentForm.assignedUsers) return false;
    return this.currentForm.assignedUsers.some(user => user.email === email);
  }
  
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  renderAssignedUsers() {
    const assignedUsersList = document.getElementById('assignedUsersList');
    if (!assignedUsersList) return;
    
    if (!this.currentForm.assignedUsers || this.currentForm.assignedUsers.length === 0) {
      assignedUsersList.innerHTML = `
        <div class="empty-users-message">
          <i class="fas fa-users"></i>
          <p>No users assigned yet. Add users to give them access to this project.</p>
        </div>
      `;
      return;
    }
    
    assignedUsersList.innerHTML = this.currentForm.assignedUsers.map(user => {
      const initials = (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
      return `
        <div class="assigned-user-item">
          <div class="user-info">
            <div class="user-avatar">${initials}</div>
            <div>
              <div class="user-email">${user.email}</div>
              <span class="user-role">${user.role}</span>
            </div>
          </div>
          <button type="button" class="remove-user-btn" data-user-email="${user.email}" title="Remove user">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
    }).join('');
    
    // Add event listeners for remove buttons
    assignedUsersList.querySelectorAll('.remove-user-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const userEmail = e.target.closest('.remove-user-btn').dataset.userEmail;
        this.removeUserFromProject(userEmail);
      });
    });
  }
  
  async saveFormWithUsers() {
    try {
      const formData = this.getFormData();
      
      // Include assigned users in the form data
      if (this.currentForm.assignedUsers) {
        formData.assignedUsers = this.currentForm.assignedUsers;
      }
      
      const response = await fetch('/api/forms', {
        method: this.currentForm.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const savedForm = await response.json();
        this.currentForm.id = savedForm._id;
        this.showSuccessMessage('Form and user assignments saved successfully!');
        return savedForm;
      } else {
        throw new Error('Failed to save form');
      }
    } catch (error) {
      console.error('Error saving form with users:', error);
      this.showErrorMessage('Failed to save form and user assignments');
      throw error;
    }
  }

  async saveProject() {
    try {
      const projectTitle = document.getElementById('projectTitle')?.value?.trim();
      const projectDescription = document.getElementById('projectDescription')?.value?.trim();
      const projectCategory = document.getElementById('projectCategory')?.value?.trim();

      // Validation
      if (!projectTitle) {
        this.showErrorMessage('Project title is required');
        return;
      }

      // No authentication required for direct save
      console.log('Saving project data directly to MongoDB...');

      const projectData = {
        title: projectTitle,
        description: projectDescription || '',
        category: projectCategory || 'general'
      };

      const response = await fetch('/api/form-types/direct-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });

      if (response.ok) {
        const result = await response.json();
        this.showSuccessMessage('Data saved successfully to survey.formtypes collection!');
        
        // Clear form fields
        document.getElementById('projectTitle').value = '';
        document.getElementById('projectDescription').value = '';
        document.getElementById('projectCategory').value = '';
        
        console.log('Data saved to MongoDB:', result);
      } else {
        console.error('Save project failed:', response.status, response.statusText);
        
        if (response.status === 401) {
          this.showErrorMessage('Authentication failed. Please log in again.');
          // Optionally redirect to login
          // window.location.href = '/login.html';
        } else {
          try {
            const error = await response.json();
            this.showErrorMessage(error.message || `Failed to save project (${response.status})`);
          } catch (e) {
            this.showErrorMessage(`Failed to save project (${response.status}: ${response.statusText})`);
          }
        }
      }
    } catch (error) {
      console.error('Error saving project:', error);
      this.showErrorMessage('Error saving project');
    }
  }
}

// Initialize the form builder when the page loads
let formBuilder;
document.addEventListener('DOMContentLoaded', () => {
  formBuilder = new GoogleFormsBuilder();
  formBuilder.init();
  
  // Initialize user assignment UI when settings tab is shown
  const settingsTab = document.querySelector('[data-tab="settings"]');
  if (settingsTab) {
    settingsTab.addEventListener('click', () => {
      setTimeout(() => {
        formBuilder.renderAssignedUsers();
      }, 100);
    });
  }
});