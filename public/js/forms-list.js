class FormsListManager {
    constructor() {
        this.currentAppCode = '';
        this.currentPage = 1;
        this.currentSearch = '';
        this.currentStatus = '';
        this.formsPerPage = 10;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadForms();
    }

    setupEventListeners() {
        // App selector buttons
        document.querySelectorAll('.app-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.selectApp(e.target.dataset.appCode, e.target.textContent);
            });
        });

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
    }

    selectApp(appCode, appName) {
        // Update active button
        document.querySelectorAll('.app-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-app-code="${appCode}"]`).classList.add('active');

        // Update current app and title
        this.currentAppCode = appCode;
        this.currentPage = 1;
        document.getElementById('forms-title').textContent = appCode ? `${appName} Forms` : 'All Forms';
        
        // Load forms for selected app
        this.loadForms();
    }

    async loadForms() {
        try {
            this.showLoading();
            
            // Build query parameters
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.formsPerPage
            });

            if (this.currentAppCode) {
                params.append('appCode', this.currentAppCode);
            }
            if (this.currentSearch) {
                params.append('search', this.currentSearch);
            }
            if (this.currentStatus) {
                params.append('status', this.currentStatus);
            }

            const response = await fetch(`/api/forms?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                this.renderForms(data.forms);
                this.renderPagination(data.pagination);
            } else {
                throw new Error('Failed to load forms');
            }
        } catch (error) {
            console.error('Error loading forms:', error);
            this.showError('Failed to load forms. Please try again.');
        }
    }

    showLoading() {
        document.getElementById('forms-container').innerHTML = `
            <div class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
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
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <h4>No forms found</h4>
                    <p>No forms match your current filters. Try adjusting your search criteria or create a new form.</p>
                    <a href="form-builder.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Create New Form
                    </a>
                </div>
            `;
            return;
        }

        const formsHtml = forms.map(form => this.renderFormCard(form)).join('');
        container.innerHTML = formsHtml;

        // Add click listeners to form cards
        container.querySelectorAll('.form-card').forEach(card => {
            card.addEventListener('click', () => {
                const formId = card.dataset.formId;
                window.open(`form-builder.html?id=${formId}`, '_blank');
            });
        });
    }

    renderFormCard(form) {
        const createdDate = new Date(form.createdAt).toLocaleDateString();
        const statusClass = `status-${form.status || 'draft'}`;
        
        return `
            <div class="form-card" data-form-id="${form._id}">
                <div class="form-title">${this.escapeHtml(form.title)}</div>
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
                    </div>
                    <div>
                        <span class="text-muted">
                            <i class="fas fa-chart-bar"></i> ${form.totalSubmissions || 0} responses
                        </span>
                    </div>
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the forms list manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FormsListManager();
});