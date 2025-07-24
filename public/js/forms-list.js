class FormsListManager {
    constructor() {
        this.currentPage = 1;
        this.currentSearch = '';
        this.currentStatus = '';
        this.formsPerPage = 10;
        
        // Response management properties
        this.currentResponsePage = 1;
        this.currentFormTypeId = '';
        this.currentResponseStatus = 'all';
        this.responsesPerPage = 10;
        
        this.init();
    }

    async viewForm(formId) {
        try {
            const response = await fetch(`/api/forms/${formId}`);
            
            if (response.ok) {
                const form = await response.json();
                this.renderFormPreview(form);
            } else {
                this.showError('Failed to load form details');
            }
        } catch (error) {
            console.error('Error viewing form:', error);
            this.showError('Error loading form details');
        }
    }

    renderFormPreview(form) {
        const container = document.getElementById('forms-container');
        
        const previewHtml = `
            <div class="form-preview">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4>Form Preview</h4>
                    <div>
                        <button class="btn btn-info btn-sm me-2 embed-code-btn" data-form-id="${form._id}">
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
                if (this.currentFormTypeId) {
                    this.loadFormsByType();
                } else {
                    this.loadForms();
                }
            });
        }

        // Add event listener for embed code button
        const embedButton = container.querySelector('.embed-code-btn');
        if (embedButton) {
            embedButton.addEventListener('click', () => {
                this.showEmbedCode(form._id);
            });
        }

        // Add event listener for copy embed button
        const copyButton = container.querySelector('.copy-embed-btn');
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                const textarea = container.querySelector('.embed-code-textarea');
                textarea.select();
                document.execCommand('copy');
                copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
                }, 2000);
            });
        }
    }

    showEmbedCode(formId) {
        const embedSection = document.querySelector('.embed-code-section');
        const textarea = document.querySelector('.embed-code-textarea');
        
        if (embedSection && textarea) {
            const embedCode = `<script src="${window.location.origin}/popup/embed.js" data-form-id="${formId}" data-delay="3000"></script>`;
            textarea.value = embedCode;
            embedSection.style.display = embedSection.style.display === 'none' ? 'block' : 'none';
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

    init() {
        this.setupEventListeners();
        this.loadFormTypes();
        // Don't load forms initially - wait for user to select an application
        this.showSelectApplicationMessage();
    }

    setupEventListeners() {
        // App selector buttons will be handled by attachAppButtonListeners after dynamic loading

        // Search input
        const searchInput = document.getElementById('search-input');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentSearch = e.target.value;
                this.currentPage = 1;
                this.loadForms();
            }, 500);
        });

        // Status filter
        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.currentStatus = e.target.value;
            this.currentPage = 1;
            this.loadForms();
        });

        // Tab switching
        document.getElementById('responses-tab').addEventListener('click', () => {
            this.loadResponsesSummary();
        });

        // Response filters
        document.getElementById('form-type-filter').addEventListener('change', (e) => {
            this.currentFormTypeId = e.target.value;
            this.currentResponsePage = 1;
            this.loadResponses();
        });

        document.getElementById('response-status-filter').addEventListener('change', (e) => {
            this.currentResponseStatus = e.target.value;
            this.currentResponsePage = 1;
            this.loadResponses();
        });

        // Event delegation for view details buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-details-btn')) {
                const button = e.target.closest('.view-details-btn');
                const responseId = button.dataset.responseId;
                this.viewResponseDetails(responseId);
            }
            
            // Event delegation for view responses buttons
            if (e.target.closest('.view-responses-btn')) {
                const button = e.target.closest('.view-responses-btn');
                const formTypeId = button.dataset.formTypeId;
                const formTypeName = button.dataset.formTypeName;
                this.viewFormTypeResponses(formTypeId, formTypeName);
            }
        });
    }

    selectApp(formTypeId, formTypeName) {
        // Update active button
        document.querySelectorAll('.app-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-form-type-id="${formTypeId}"]`).classList.add('active');

        // Update current form type and title
        this.currentFormTypeId = formTypeId;
        this.currentPage = 1;
        document.getElementById('forms-title').textContent = formTypeId ? `${formTypeName} Forms` : 'Select Application';
        
        // Load forms for selected form type
        if (formTypeId) {
            this.loadFormsByType();
        } else {
            this.showSelectApplicationMessage();
        }
    }



    async loadFormsByType() {
        try {
            this.showLoading();
            
            // Build query parameters
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.formsPerPage
            });

            if (this.currentSearch) {
                params.append('search', this.currentSearch);
            }
            if (this.currentStatus) {
                params.append('status', this.currentStatus);
            }

            const response = await fetch(`/api/form-types/${this.currentFormTypeId}/forms?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                this.renderForms(data.forms);
                this.renderPagination(data.pagination);
            } else {
                throw new Error('Failed to load forms for this type');
            }
        } catch (error) {
            console.error('Error loading forms by type:', error);
            this.showError('Failed to load forms for this type. Please try again.');
        }
    }

    showSelectApplicationMessage() {
        document.getElementById('forms-container').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-arrow-up"></i>
                </div>
                <h4>Select an Application</h4>
                <p>Choose an application above to view its forms</p>
            </div>
        `;
    }

    showLoading() {
        document.getElementById('forms-container').innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading forms...</p>
            </div>
        `;
    }

    showError(message) {
        document.getElementById('forms-container').innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle"></i> ${message}
            </div>
        `;
    }

    renderForms(forms) {
        const container = document.getElementById('forms-container');
        
        if (!forms || forms.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <h4>No forms found</h4>
                    <p>No forms match your current filters. Try adjusting your search criteria or create a new form.</p>
                    <a href="form-builder.html" class="btn-action btn-primary-action">
                        <i class="fas fa-plus"></i> Create New Form
                    </a>
                </div>
            `;
            return;
        }

        const formsHtml = forms.map(form => this.renderFormCard(form)).join('');
        container.innerHTML = formsHtml;

        // Add event listeners for view form buttons
        container.querySelectorAll('.view-form-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const formId = e.target.closest('.view-form-btn').dataset.formId;
                this.viewForm(formId);
            });
        });

        // Add event listeners for edit form buttons
        container.querySelectorAll('.edit-form-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const formId = e.target.closest('.edit-form-btn').dataset.formId;
                window.open(`form-builder.html?id=${formId}`, '_blank');
            });
        });
    }

    renderFormCard(form) {
        const createdDate = new Date(form.createdAt).toLocaleDateString();
        const statusClass = `status-${form.status || 'draft'}`;
        
        return `
            <div class="form-card">
                <div class="form-title">${this.escapeHtml(form.title || 'Untitled Form')}</div>
                <div class="form-description">${this.escapeHtml(form.description || 'No description')}</div>
                <div class="form-meta">
                    <div>
                        <span class="status-badge ${statusClass}">${form.status || 'draft'}</span>
                        <span class="ms-2">
                            <i class="fas fa-calendar"></i> ${createdDate}
                        </span>
                        <span class="ms-2">
                            <i class="fas fa-question-circle"></i> ${form.questions?.length || 0} questions
                        </span>
                        <span class="ms-2">
                            <i class="fas fa-chart-bar"></i> ${form.totalSubmissions || 0} responses
                        </span>
                    </div>
                </div>
                <div class="form-actions">
                    <a href="#" class="btn-action btn-primary-action view-form-btn" data-form-id="${form._id}">
                        <i class="fas fa-eye"></i> View Form
                    </a>
                    <a href="form-builder.html?id=${form._id}" class="btn-action btn-secondary-action edit-form-btn" data-form-id="${form._id}">
                        <i class="fas fa-edit"></i> Edit Form
                    </a>
                </div>
            </div>
        `;
    }

    renderPagination(pagination) {
        const container = document.getElementById('pagination-container');
        
        if (!pagination || pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const { currentPage, totalPages } = pagination;
        let paginationHtml = '<ul class="pagination justify-content-center">';

        // Previous button
        paginationHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // Next button
        paginationHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        paginationHtml += '</ul>';
        container.innerHTML = paginationHtml;

        // Add click listeners to pagination links
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadForms();
                }
            });
        });
    }

    async loadFormTypes() {
        try {
            const response = await fetch('/api/form-types');
            if (response.ok) {
                const formTypes = await response.json();
                this.renderFormTypeFilter(formTypes);
                this.renderAppButtons(formTypes);
            }
        } catch (error) {
            console.error('Error loading form types:', error);
        }
    }

    renderFormTypeFilter(formTypes) {
        const filter = document.getElementById('form-type-filter');
        const options = formTypes.map(type => 
            `<option value="${type._id}">${this.escapeHtml(type.name)}</option>`
        ).join('');
        filter.innerHTML = '<option value="">All Form Types</option>' + options;
    }

    renderAppButtons(formTypes) {
        const container = document.getElementById('app-buttons-container');
        const formTypeButtons = formTypes.map(type => 
            `<button class="btn app-button" data-form-type-id="${type._id}" data-form-type-name="${type.name}">${this.escapeHtml(type.name)}</button>`
        ).join('');
        
        container.innerHTML = formTypeButtons;
        
        // Re-attach event listeners for new buttons
        this.attachAppButtonListeners();
    }

    attachAppButtonListeners() {
        document.querySelectorAll('.app-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.selectApp(e.target.dataset.formTypeId, e.target.dataset.formTypeName || e.target.textContent);
            });
        });
    }

    async loadResponsesSummary() {
        try {
            const response = await fetch('/api/form-types/responses/summary');
            if (response.ok) {
                const data = await response.json();
                this.renderResponsesSummary(data.data);
            } else {
                throw new Error('Failed to load responses summary');
            }
        } catch (error) {
            console.error('Error loading responses summary:', error);
            this.showResponsesError('Failed to load responses summary. Please try again.');
        }
    }

    renderResponsesSummary(summary) {
        const container = document.getElementById('responses-container');
        
        if (!summary || summary.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <h4>No responses found</h4>
                    <p>No form responses have been submitted yet.</p>
                </div>
            `;
            return;
        }

        const summaryHtml = summary.map(item => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <h5 class="card-title mb-1">${this.escapeHtml(item.formTypeName || 'Unknown Form Type')}</h5>
                            <p class="text-muted mb-0">${item.forms.length} form(s) in this type</p>
                        </div>
                        <div class="col-md-3 text-center">
                            <div class="h4 mb-0 text-primary">${item.totalResponses}</div>
                            <small class="text-muted">Total Responses</small>
                        </div>
                        <div class="col-md-3 text-end">
                            <button class="btn btn-outline-primary btn-sm view-responses-btn" data-form-type-id="${item._id}" data-form-type-name="${this.escapeHtml(item.formTypeName || 'Unknown')}">
                                <i class="fas fa-eye"></i> View Responses
                            </button>
                        </div>
                    </div>
                    ${item.latestResponse ? `<small class="text-muted">Latest response: ${new Date(item.latestResponse).toLocaleDateString()}</small>` : ''}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = summaryHtml;
    }

    viewFormTypeResponses(formTypeId, formTypeName) {
        this.currentFormTypeId = formTypeId;
        document.getElementById('form-type-filter').value = formTypeId;
        this.loadResponses();
    }

    async loadResponses() {
        if (!this.currentFormTypeId) {
            this.loadResponsesSummary();
            return;
        }

        try {
            this.showResponsesLoading();
            
            const params = new URLSearchParams({
                page: this.currentResponsePage,
                limit: this.responsesPerPage,
                status: this.currentResponseStatus
            });

            const response = await fetch(`/api/form-types/${this.currentFormTypeId}/responses?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                this.renderResponses(data.data.responses, data.data.formTypeName);
                this.renderResponsesPagination(data.data.pagination);
            } else {
                throw new Error('Failed to load responses');
            }
        } catch (error) {
            console.error('Error loading responses:', error);
            this.showResponsesError('Failed to load responses. Please try again.');
        }
    }

    showResponsesLoading() {
        document.getElementById('responses-container').innerHTML = `
            <div class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }

    showResponsesError(message) {
        document.getElementById('responses-container').innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle"></i> ${message}
            </div>
        `;
    }

    renderResponses(responses, formTypeName) {
        const container = document.getElementById('responses-container');
        
        if (!responses || responses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <h4>No responses found</h4>
                    <p>No responses found for ${formTypeName} forms with the current filters.</p>
                    <button class="btn btn-secondary" onclick="formsListManager.loadResponsesSummary()">
                        <i class="fas fa-arrow-left"></i> Back to Summary
                    </button>
                </div>
            `;
            return;
        }

        const backButton = `
            <div class="mb-3">
                <button class="btn btn-secondary btn-sm" onclick="formsListManager.loadResponsesSummary()">
                    <i class="fas fa-arrow-left"></i> Back to Summary
                </button>
                <span class="ms-3 text-muted">Showing responses for: <strong>${this.escapeHtml(formTypeName)}</strong></span>
            </div>
        `;

        const responsesHtml = responses.map(response => this.renderResponseCard(response)).join('');
        container.innerHTML = backButton + responsesHtml;
    }

    renderResponseCard(response) {
        const submittedDate = new Date(response.timing.submittedAt).toLocaleString();
        const statusClass = `status-${response.status || 'submitted'}`;
        
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="card-title mb-1">${this.escapeHtml(response.formTitle)}</h6>
                            <p class="text-muted mb-1">
                                <i class="fas fa-user"></i> ${this.escapeHtml(response.respondentName || 'Anonymous')}
                                ${response.respondentEmail ? `<span class="ms-2"><i class="fas fa-envelope"></i> ${this.escapeHtml(response.respondentEmail)}</span>` : ''}
                            </p>
                            <small class="text-muted">
                                <i class="fas fa-clock"></i> ${submittedDate}
                                <span class="ms-3"><i class="fas fa-question-circle"></i> ${response.answers.length} answers</span>
                            </small>
                        </div>
                        <div class="col-md-4 text-end">
                            <span class="status-badge ${statusClass} mb-2">${response.status || 'submitted'}</span><br>
                            <button class="btn btn-outline-primary btn-sm view-details-btn" data-response-id="${response._id}">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async viewResponseDetails(responseId) {
        try {
            const response = await fetch(`/api/form-types/responses/${responseId}`);
            if (response.ok) {
                const data = await response.json();
                this.showResponseModal(data.data);
            } else {
                throw new Error('Failed to load response details');
            }
        } catch (error) {
            console.error('Error loading response details:', error);
            alert('Failed to load response details. Please try again.');
        }
    }

    showResponseModal(response) {
        const answersHtml = response.answers.map(answer => `
            <div class="mb-3">
                <strong>${this.escapeHtml(answer.questionTitle)}</strong>
                <div class="mt-1">
                    ${answer.value ? this.escapeHtml(String(answer.value)) : '<em>No answer</em>'}
                </div>
            </div>
        `).join('');

        const modalHtml = `
            <div class="modal fade" id="responseModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Response Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Form:</strong> ${this.escapeHtml(response.formTitle)}
                                </div>
                                <div class="col-md-6">
                                    <strong>Submitted:</strong> ${new Date(response.timing.submittedAt).toLocaleString()}
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Respondent:</strong> ${this.escapeHtml(response.respondentName || 'Anonymous')}
                                </div>
                                <div class="col-md-6">
                                    <strong>Email:</strong> ${this.escapeHtml(response.respondentEmail || 'Not provided')}
                                </div>
                            </div>
                            <hr>
                            <h6>Answers:</h6>
                            ${answersHtml}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('responseModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body and show
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('responseModal'));
        modal.show();
    }

    renderResponsesPagination(pagination) {
        const container = document.getElementById('responses-pagination-container');
        
        if (!pagination || pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        const { current, pages } = pagination;
        let paginationHtml = '<ul class="pagination justify-content-center">';

        // Previous button
        paginationHtml += `
            <li class="page-item ${current === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${current - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, current - 2);
        const endPage = Math.min(pages, current + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === current ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // Next button
        paginationHtml += `
            <li class="page-item ${current === pages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${current + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        paginationHtml += '</ul>';
        container.innerHTML = paginationHtml;

        // Add click listeners to pagination links
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentResponsePage) {
                    this.currentResponsePage = page;
                    this.loadResponses();
                }
            });
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global variable for onclick handlers
let formsListManager;

// Initialize the forms list manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    formsListManager = new FormsListManager();
});