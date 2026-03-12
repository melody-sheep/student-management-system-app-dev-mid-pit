// Students Page Specific JavaScript
document.addEventListener('DOMContentLoaded', () => {
    console.log('📚 Students page initialized');
    initializeStudentsPage();
});

// Students page state
let yearFilter = 'all';
let sortOrder = 'name-asc';
let currentView = 'table';
let selectedStudents = new Set();
let pageInitialized = false;

function initializeStudentsPage() {
    // Set up event listeners first
    setupStudentModal();
    setupToolbar();
    setupFilters();
    setupViewToggle();
    setupBulkSelection();
    setupDetailModal();
    setupImportModal();
    
    // Listen for students loaded event from app.js
    window.addEventListener('studentsLoaded', (event) => {
        console.log('📊 Students loaded event received:', event.detail.students.length);
        updateCourseStats();
        if (!pageInitialized) {
            // Apply filters with current settings
            if (window.applyFilters) window.applyFilters();
            pageInitialized = true;
        }
    });
    
    // Check if students are already loaded
    if (window.allStudents && window.allStudents.length > 0) {
        console.log('📊 Students already loaded:', window.allStudents.length);
        setTimeout(() => {
            safeUpdateCourseStats();
            if (typeof window.applyFilters === 'function') window.applyFilters();
            pageInitialized = true;
        }, 100);
    } else {
        console.log('⏳ Waiting for students to load from app.js...');
        showLoadingState(true);
        // No fallback fetch - app.js handles it
    }
}

function showLoadingState(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const table = document.getElementById('studentTable');
    
    if (loadingSpinner) {
        loadingSpinner.style.display = show ? 'flex' : 'none';
    }
    if (table) {
        table.style.opacity = show ? '0.5' : '1';
    }
}

function showEmptyState(show) {
    const emptyState = document.getElementById('emptyState');
    const emptyStateGrid = document.getElementById('emptyStateGrid');
    
    if (emptyState) emptyState.style.display = show ? 'flex' : 'none';
    if (emptyStateGrid) emptyStateGrid.style.display = show ? 'flex' : 'none';
}

// Modal Management
function setupStudentModal() {
    const modal = document.getElementById('studentModal');
    const addBtn = document.getElementById('addStudentBtn');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelFormBtn');
    const form = document.getElementById('studentForm');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openModal(null);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleStudentSubmit(e);
        });
    }
}

function openModal(editData = null) {
    const modal = document.getElementById('studentModal');
    if (!modal) return;
    
    const modalTitle = document.getElementById('modalTitleText');
    const modalIcon = document.getElementById('modalIcon');
    const submitText = document.getElementById('submitBtnText');
    const submitIcon = document.getElementById('submitIcon');
    const form = document.getElementById('studentForm');
    const editBanner = document.getElementById('editModeBanner');
    const previewAvatar = document.getElementById('previewAvatar');
    const previewName = document.getElementById('previewName');
    const previewId = document.getElementById('previewId');

    // Clear previous validation messages
    document.querySelectorAll('.validation-message').forEach(el => {
        el.style.display = 'none';
        el.className = 'validation-message';
    });

    if (editData) {
        // Edit Mode
        if (modalTitle) modalTitle.textContent = 'Edit Student Record';
        if (modalIcon) modalIcon.className = 'fas fa-pencil';
        if (submitText) submitText.textContent = 'Update Student';
        if (submitIcon) submitIcon.className = 'fas fa-save';
        
        // Show edit banner
        if (editBanner) editBanner.style.display = 'flex';
        
        // Set student preview
        if (previewAvatar && editData) {
            const initials = `${editData.first_name[0]}${editData.last_name[0]}`;
            previewAvatar.textContent = initials;
        }
        if (previewName && editData) {
            previewName.textContent = `${editData.first_name} ${editData.last_name}`;
        }
        if (previewId && editData) {
            previewId.textContent = `ID: ${editData.student_number}`;
        }
        
        // Populate form
        const studentNumberInput = form?.student_number;
        const firstNameInput = form?.first_name;
        const lastNameInput = form?.last_name;
        const courseSelect = form?.course;
        const yearSelect = form?.year_level;
        
        if (studentNumberInput) {
            studentNumberInput.value = editData.student_number;
            studentNumberInput.readOnly = true;
            studentNumberInput.style.opacity = '0.6';
            studentNumberInput.style.cursor = 'not-allowed';
        }
        if (firstNameInput) firstNameInput.value = editData.first_name;
        if (lastNameInput) lastNameInput.value = editData.last_name;
        if (courseSelect) courseSelect.value = editData.course;
        if (yearSelect) yearSelect.value = editData.year_level;
        
        window.isEditMode = true;
        window.currentEditId = editData.id;
    } else {
        // Add Mode
        if (modalTitle) modalTitle.textContent = 'Add New Student';
        if (modalIcon) modalIcon.className = 'fas fa-user-plus';
        if (submitText) submitText.textContent = 'Save Student';
        if (submitIcon) submitIcon.className = 'fas fa-floppy-disk';
        
        // Hide edit banner
        if (editBanner) editBanner.style.display = 'none';
        
        if (form) {
            form.reset();
            const studentNumberInput = form.student_number;
            if (studentNumberInput) {
                studentNumberInput.readOnly = false;
                studentNumberInput.style.opacity = '1';
                studentNumberInput.style.cursor = 'text';
            }
        }
        
        window.isEditMode = false;
        window.currentEditId = null;
    }

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        // Focus first input
        if (!editData && form?.student_number) {
            form.student_number.focus();
        } else if (editData && form?.first_name) {
            form.first_name.focus();
        }
    }, 10);
    
    // Setup real-time validation
    setupFormValidation();
}

function closeModal() {
    const modal = document.getElementById('studentModal');
    const form = document.getElementById('studentForm');
    
    if (!modal) return;
    
    modal.classList.remove('show');
    
    setTimeout(() => {
        modal.style.display = 'none';
        if (form) form.reset();
        
        // Clear validation messages
        document.querySelectorAll('.validation-message').forEach(el => {
            el.style.display = 'none';
            el.className = 'validation-message';
        });
        
        // Reset student number field
        if (form?.student_number) {
            form.student_number.readOnly = false;
            form.student_number.style.opacity = '1';
            form.student_number.style.cursor = 'text';
        }
        
        // Reset submit button
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }, 300);
}

async function handleStudentSubmit(e) {
    const form = e.target;
    const submitBtn = document.getElementById('submitBtn');
    
    if (!form) return;
    
    const data = {
        student_number: form.student_number?.value.trim() || '',
        first_name: form.first_name?.value.trim() || '',
        last_name: form.last_name?.value.trim() || '',
        course: form.course?.value || '',
        year_level: parseInt(form.year_level?.value || '0')
    };
    
    // Validate data
    if (!validateFormData(data)) {
        return;
    }

    // Show loading state
    if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
    }

    try {
        let response;
        if (window.isEditMode && window.currentEditId) {
            response = await fetch(`/api/students/${window.currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (response.ok) {
            if (window.showToast) {
                const message = window.isEditMode ? 
                    `✓ ${data.first_name} ${data.last_name}'s record updated successfully!` : 
                    `✓ ${data.first_name} ${data.last_name} added successfully!`;
                window.showToast(message, 'success');
            }
            closeModal();
            if (window.fetchAllStudents) await window.fetchAllStudents();
            updateCourseStats();
        } else {
            const error = await response.json();
            showValidationError('studentNumber', error.error || 'Operation failed');
            if (window.showToast) window.showToast(error.error || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        if (window.showToast) window.showToast('Failed to save student. Please try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }
}

function validateFormData(data) {
    let isValid = true;
    
    // Clear previous messages
    document.querySelectorAll('.validation-message').forEach(el => {
        el.style.display = 'none';
    });
    
    // Validate student number
    if (!data.student_number || data.student_number.length < 5) {
        showValidationError('studentNumber', 'Student number must be at least 5 characters');
        isValid = false;
    }
    
    // Validate names
    if (!data.first_name || data.first_name.length < 2) {
        showValidationError('firstName', 'First name must be at least 2 characters');
        isValid = false;
    }
    
    if (!data.last_name || data.last_name.length < 2) {
        showValidationError('lastName', 'Last name must be at least 2 characters');
        isValid = false;
    }
    
    // Validate course
    if (!data.course) {
        showValidationError('course', 'Please select a course');
        isValid = false;
    }
    
    // Validate year level
    if (!data.year_level || data.year_level < 1 || data.year_level > 4) {
        showValidationError('year', 'Please select a valid year level');
        isValid = false;
    }
    
    return isValid;
}

function showValidationError(fieldId, message) {
    const validationEl = document.getElementById(`${fieldId}Validation`);
    if (validationEl) {
        validationEl.textContent = message;
        validationEl.className = 'validation-message error';
        validationEl.style.display = 'block';
    }
}

function showValidationSuccess(fieldId, message) {
    const validationEl = document.getElementById(`${fieldId}Validation`);
    if (validationEl) {
        validationEl.textContent = message;
        validationEl.className = 'validation-message success';
        validationEl.style.display = 'block';
    }
}

function setupFormValidation() {
    const form = document.getElementById('studentForm');
    if (!form) return;
    
    // Real-time validation for student number
    const studentNumberInput = form.student_number;
    if (studentNumberInput) {
        studentNumberInput.addEventListener('blur', () => {
            const value = studentNumberInput.value.trim();
            if (value && value.length >= 5) {
                showValidationSuccess('studentNumber', '✓ Valid format');
            } else if (value) {
                showValidationError('studentNumber', 'Must be at least 5 characters');
            }
        });
        
        studentNumberInput.addEventListener('input', () => {
            if (studentNumberInput.value.length >= 5) {
                const validationEl = document.getElementById('studentNumberValidation');
                if (validationEl) validationEl.style.display = 'none';
            }
        });
    }
    
    // Real-time validation for first name
    const firstNameInput = form.first_name;
    if (firstNameInput) {
        firstNameInput.addEventListener('blur', () => {
            const value = firstNameInput.value.trim();
            if (value && value.length >= 2) {
                showValidationSuccess('firstName', '✓ Looks good');
            } else if (value) {
                showValidationError('firstName', 'Must be at least 2 characters');
            }
        });
        
        firstNameInput.addEventListener('input', () => {
            if (firstNameInput.value.length >= 2) {
                const validationEl = document.getElementById('firstNameValidation');
                if (validationEl) validationEl.style.display = 'none';
            }
        });
    }
    
    // Real-time validation for last name
    const lastNameInput = form.last_name;
    if (lastNameInput) {
        lastNameInput.addEventListener('blur', () => {
            const value = lastNameInput.value.trim();
            if (value && value.length >= 2) {
                showValidationSuccess('lastName', '✓ Looks good');
            } else if (value) {
                showValidationError('lastName', 'Must be at least 2 characters');
            }
        });
        
        lastNameInput.addEventListener('input', () => {
            if (lastNameInput.value.length >= 2) {
                const validationEl = document.getElementById('lastNameValidation');
                if (validationEl) validationEl.style.display = 'none';
            }
        });
    }
}

// Toolbar Functions
function setupToolbar() {
    const exportBtn = document.getElementById('exportBtn');
    const printBtn = document.getElementById('printBtn');
    const importBtn = document.getElementById('importBtn');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const bulkPromoteBtn = document.getElementById('bulkPromoteBtn');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (importBtn) {
        importBtn.addEventListener('click', openImportModal);
    }

    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', handleBulkDelete);
    }

    if (bulkPromoteBtn) {
        bulkPromoteBtn.addEventListener('click', handleBulkPromote);
    }
}

function exportToCSV() {
    if (!window.allStudents || window.allStudents.length === 0) {
        if (window.showToast) window.showToast('No data to export', 'info');
        return;
    }

    const headers = ['ID', 'Student Number', 'First Name', 'Last Name', 'Course', 'Year Level'];
    const rows = window.allStudents.map(s => [
        s.id,
        s.student_number,
        s.first_name,
        s.last_name,
        s.course,
        s.year_level
    ]);

    let csvContent = headers.join(',') + '\n';
    csvContent += rows.map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    if (window.showToast) window.showToast('Export successful!', 'success');
}

// Filters
function setupFilters() {
    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortOrder = e.target.value;
            if (window.applyFilters) window.applyFilters();
        });
    }

    // Year filter chips
    const yearChips = document.querySelectorAll('.year-chip');
    yearChips.forEach(chip => {
        chip.addEventListener('click', function() {
            yearChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            yearFilter = this.dataset.year;
            if (window.applyFilters) window.applyFilters();
        });
    });
}

// Update Course Statistics
function safeUpdateCourseStats() {
    if (!window || !window.allStudents || !Array.isArray(window.allStudents)) return;
    
    const courses = {
        'Computer Science': 0,
        'Information Technology': 0,
        'Data Science': 0,
        'Software Engineering': 0
    };

    window.allStudents.forEach(student => {
        if (courses.hasOwnProperty(student.course)) {
            courses[student.course]++;
        }
    });

    const csCount = document.getElementById('csCount');
    const itCount = document.getElementById('itCount');
    const dsCount = document.getElementById('dsCount');
    const seCount = document.getElementById('seCount');
    
    if (csCount) csCount.textContent = courses['Computer Science'];
    if (itCount) itCount.textContent = courses['Information Technology'];
    if (dsCount) dsCount.textContent = courses['Data Science'];
    if (seCount) seCount.textContent = courses['Software Engineering'];
}

function updateCourseStats() {
    safeUpdateCourseStats();
}

// View Toggle
function setupViewToggle() {
    const viewBtns = document.querySelectorAll('.view-btn');

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewType = btn.dataset.view;
            
            // Update active state
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Toggle views
            const tableView = document.getElementById('tableView');
            const gridView = document.getElementById('gridView');
            
            if (viewType === 'table') {
                currentView = 'table';
                if (tableView) tableView.style.display = 'block';
                if (gridView) gridView.style.display = 'none';
            } else if (viewType === 'grid') {
                currentView = 'grid';
                if (tableView) tableView.style.display = 'none';
                if (gridView) gridView.style.display = 'block';
                // Re-apply filters to populate grid
                if (window.applyFilters && window.allStudents) {
                    window.applyFilters();
                }
            }
        });
    });
}

// Grid Display
function displayStudentsGrid(students) {
    const gridContainer = document.getElementById('studentGrid');
    const emptyStateGrid = document.getElementById('emptyStateGrid');
    
    if (!gridContainer) return;

    if (!students || students.length === 0) {
        if (emptyStateGrid) emptyStateGrid.style.display = 'flex';
        gridContainer.innerHTML = '';
        return;
    }

    if (emptyStateGrid) emptyStateGrid.style.display = 'none';
    
    const courseColors = {
        'Computer Science': 'var(--course-cs)',
        'Information Technology': 'var(--course-it)',
        'Data Science': 'var(--course-ds)',
        'Software Engineering': 'var(--course-se)'
    };

    gridContainer.innerHTML = students.map(student => {
        const initials = `${student.first_name[0]}${student.last_name[0]}`;
        const color = courseColors[student.course] || 'var(--accent-blue)';
        
        return `
            <div class="student-card" data-course="${student.course}" onclick="viewStudentDetail(${student.id})">
                <input type="checkbox" 
                       class="student-card-checkbox student-checkbox" 
                       data-id="${student.id}" 
                       onclick="event.stopPropagation()"
                       ${selectedStudents.has(student.id) ? 'checked' : ''}>
                <div class="student-card-header">
                    <div class="student-card-avatar" style="background: ${color}">
                        ${initials}
                    </div>
                    <div class="student-card-info">
                        <h4>${window.escapeHtml ? window.escapeHtml(student.first_name) : student.first_name} ${window.escapeHtml ? window.escapeHtml(student.last_name) : student.last_name}</h4>
                        <p>${window.escapeHtml ? window.escapeHtml(student.student_number) : student.student_number}</p>
                    </div>
                </div>
                <div class="student-card-details">
                    <div class="student-card-detail">
                        <i class="fas fa-graduation-cap"></i>
                        <span>${window.escapeHtml ? window.escapeHtml(student.course) : student.course}</span>
                    </div>
                    <div class="student-card-detail">
                        <i class="fas fa-calendar"></i>
                        <span>Year ${student.year_level}</span>
                    </div>
                </div>
                <div class="student-card-actions">
                    <button onclick="event.stopPropagation(); editStudent(${student.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="event.stopPropagation(); deleteStudent(${student.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Reattach checkbox listeners
    document.querySelectorAll('.student-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
    });
}

// Override display functions
if (!window.displayStudents) {
    window.displayStudents = function(students) {
        const tbody = document.getElementById('studentTableBody');
        const emptyState = document.getElementById('emptyState');
        
        if (!tbody) return;
        
        if (!students || students.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            const recordCount = document.getElementById('recordCount');
            if (recordCount) recordCount.textContent = 'Showing 0 of 0 records';
            
            const selectAll = document.getElementById('selectAll');
            if (selectAll) selectAll.checked = false;
            
            // Update grid if visible
            if (currentView === 'grid') {
                displayStudentsGrid(students);
            }
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        let html = '';
        students.forEach((student, index) => {
            const courseClass = window.getCourseClass ? window.getCourseClass(student.course) : 'cs';
            const checked = selectedStudents.has(student.id) ? 'checked' : '';
            const escapeFn = window.escapeHtml || ((str) => str || '');
            const yearSuffixFn = window.getYearSuffix || ((y) => 'th');
            
            const courseDisplay = {
                'Computer Science': 'BSCS',
                'Information Technology': 'BSIT',
                'Data Science': 'BSDS',
                'Software Engineering': 'BSSE'
            }[student.course] || student.course;
            
            html += `
                <tr data-course="${escapeFn(student.course)}" style="animation: fadeIn 0.3s ease ${index * 0.05}s both;">
                    <td style="width: 40px; text-align: center;">
                        <input type="checkbox" 
                               class="student-checkbox" 
                               data-id="${student.id}" 
                               ${checked}>
                    </td>
                    <td>
                        <span class="status-badge ${courseClass}">
                            #${student.id}
                        </span>
                    </td>
                    <td><strong style="color: var(--text-primary);">${escapeFn(student.student_number)}</strong></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 32px; height: 32px; background: var(--course-${courseClass}); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border-radius: 50%;">
                                ${escapeFn(student.first_name.charAt(0))}${escapeFn(student.last_name.charAt(0))}
                            </div>
                            <span style="color: var(--text-primary);">${escapeFn(student.first_name)} ${escapeFn(student.last_name)}</span>
                        </div>
                    </td>
                    <td>
                        <span class="course-name ${courseClass}">
                            ${escapeFn(courseDisplay)}
                        </span>
                    </td>
                    <td style="color: var(--text-secondary);">${student.year_level}${yearSuffixFn(student.year_level)} Year</td>
                    <td>
                        <span class="status-badge ${courseClass}">
                            Active
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn-sm" onclick="editStudent(${student.id})" title="Edit Record">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn-sm" onclick="deleteStudent(${student.id})" title="Delete Record">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="action-btn-sm" onclick="viewStudentDetail(${student.id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        const recordCount = document.getElementById('recordCount');
        if (recordCount && window.allStudents) {
            recordCount.textContent = `Showing ${students.length} of ${window.allStudents.length} records`;
        }
        
        // Update grid if visible
        if (currentView === 'grid') {
            displayStudentsGrid(students);
        }
        
        // Reattach checkbox listeners
        document.querySelectorAll('.student-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleCheckboxChange);
        });
        
        // Update select all checkbox
        updateSelectAllCheckbox();
    };
}

// Override applyFilters
if (!window.applyFilters) {
    window.applyFilters = function() {
        if (!window.allStudents || !window.currentFilters) {
            console.log('Waiting for students data...');
            return;
        }
        
        let filtered = [...window.allStudents];
    
        // Apply search filter
        if (window.currentFilters.search) {
            const search = window.currentFilters.search.toLowerCase();
            filtered = filtered.filter(s =>
                s.first_name.toLowerCase().includes(search) ||
                s.last_name.toLowerCase().includes(search) ||
                s.student_number.toLowerCase().includes(search) ||
                s.course.toLowerCase().includes(search)
            );
        }
    
        // Apply course filter
        if (window.currentFilters.filterType !== 'all') {
            const courseMap = {
                'cs': 'Computer Science',
                'it': 'Information Technology',
                'ds': 'Data Science',
                'se': 'Software Engineering'
            };
            const selectedCourse = courseMap[window.currentFilters.filterType];
            if (selectedCourse) {
                filtered = filtered.filter(s => s.course === selectedCourse);
            }
        }
    
        // Apply year filter
        if (yearFilter !== 'all') {
            filtered = filtered.filter(s => s.year_level === parseInt(yearFilter));
        }
    
        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortOrder) {
                case 'name-asc':
                    return a.last_name.localeCompare(b.last_name);
                case 'name-desc':
                    return b.last_name.localeCompare(a.last_name);
                case 'id-asc':
                    return a.student_number.localeCompare(b.student_number);
                case 'id-desc':
                    return b.student_number.localeCompare(a.student_number);
                case 'course-asc':
                    return a.course.localeCompare(b.course);
                case 'year-asc':
                    return a.year_level - b.year_level;
                case 'year-desc':
                    return b.year_level - a.year_level;
                default:
                    return 0;
            }
        });
    
        // Update views
        if (window.displayStudents) {
            window.displayStudents(filtered);
        }
    };
}

// Bulk Selection
function setupBulkSelection() {
    const selectAllCheckbox = document.getElementById('selectAll');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.student-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
                const studentId = parseInt(checkbox.dataset.id);
                if (e.target.checked) {
                    selectedStudents.add(studentId);
                } else {
                    selectedStudents.delete(studentId);
                }
            });
            updateBulkActions();
        });
    }
}

function handleCheckboxChange(e) {
    const studentId = parseInt(e.target.dataset.id);
    
    if (e.target.checked) {
        selectedStudents.add(studentId);
    } else {
        selectedStudents.delete(studentId);
    }
    
    updateBulkActions();
    updateSelectAllCheckbox();
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const allCheckboxes = document.querySelectorAll('.student-checkbox');
    const checkedCount = Array.from(allCheckboxes).filter(cb => cb.checked).length;
    
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = checkedCount === allCheckboxes.length && allCheckboxes.length > 0;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
    }
}

function updateBulkActions() {
    const count = selectedStudents.size;
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const bulkPromoteBtn = document.getElementById('bulkPromoteBtn');
    const countText = document.getElementById('selectedCountText');
    
    if (count > 0) {
        if (bulkDeleteBtn) bulkDeleteBtn.style.display = 'inline-flex';
        if (bulkPromoteBtn) bulkPromoteBtn.style.display = 'inline-flex';
        if (countText) countText.textContent = count;
    } else {
        if (bulkDeleteBtn) bulkDeleteBtn.style.display = 'none';
        if (bulkPromoteBtn) bulkPromoteBtn.style.display = 'none';
    }
}

async function handleBulkDelete() {
    if (selectedStudents.size === 0) return;

    const confirmed = await showConfirmationModal(
        `Delete ${selectedStudents.size} student(s)?`,
        'This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
        const deletePromises = Array.from(selectedStudents).map(id =>
            fetch(`/api/students/${id}`, { method: 'DELETE' })
        );

        await Promise.all(deletePromises);
        
        if (window.showToast) window.showToast(`${selectedStudents.size} student(s) deleted successfully!`, 'success');
        selectedStudents.clear();
        updateBulkActions();
        if (window.fetchAllStudents) await window.fetchAllStudents();
        updateCourseStats();
    } catch (error) {
        console.error('Bulk delete error:', error);
        if (window.showToast) window.showToast('Failed to delete students', 'error');
    }
}

async function handleBulkPromote() {
    if (selectedStudents.size === 0) return;

    const confirmed = await showConfirmationModal(
        `Promote ${selectedStudents.size} student(s)?`,
        'This will increase their year level by 1.'
    );

    if (!confirmed) return;

    try {
        const promotePromises = Array.from(selectedStudents).map(async id => {
            const student = window.allStudents ? window.allStudents.find(s => s.id === id) : null;
            if (student && student.year_level < 4) {
                return fetch(`/api/students/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...student,
                        year_level: student.year_level + 1
                    })
                });
            }
        });

        await Promise.all(promotePromises);
        
        if (window.showToast) window.showToast(`${selectedStudents.size} student(s) promoted successfully!`, 'success');
        selectedStudents.clear();
        updateBulkActions();
        if (window.fetchAllStudents) await window.fetchAllStudents();
        updateCourseStats();
    } catch (error) {
        console.error('Bulk promote error:', error);
        if (window.showToast) window.showToast('Failed to promote students', 'error');
    }
}

// Student Detail Modal
function setupDetailModal() {
    const modal = document.getElementById('studentDetailModal');
    const closeBtn = document.getElementById('closeDetailModal');
    const closeDetailBtn = document.getElementById('closeDetailBtn');
    const editBtn = document.getElementById('editDetailStudent');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeDetailModal);
    }

    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', closeDetailModal);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeDetailModal();
            }
        });
    }

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            const studentId = parseInt(editBtn.dataset.studentId);
            const student = window.allStudents ? window.allStudents.find(s => s.id === studentId) : null;
            if (student) {
                closeDetailModal();
                openModal(student);
            }
        });
    }
}

function viewStudentDetail(id) {
    const student = window.allStudents ? window.allStudents.find(s => s.id === id) : null;
    if (!student) return;

    const modal = document.getElementById('studentDetailModal');
    if (!modal) return;
    
    const initials = `${student.first_name[0]}${student.last_name[0]}`;
    
    const courseColors = {
        'Computer Science': 'var(--course-cs)',
        'Information Technology': 'var(--course-it)',
        'Data Science': 'var(--course-ds)',
        'Software Engineering': 'var(--course-se)'
    };

    const detailAvatar = document.getElementById('detailAvatar');
    const detailName = document.getElementById('detailName');
    const detailCourseBadge = document.getElementById('detailCourseBadge');
    const detailStudentNumber = document.getElementById('detailStudentNumber');
    const detailID = document.getElementById('detailID');
    const detailCourse = document.getElementById('detailCourse');
    const detailYear = document.getElementById('detailYear');
    const detailStatus = document.getElementById('detailStatus');
    const detailEnrolled = document.getElementById('detailEnrolled');
    const detailUpdated = document.getElementById('detailUpdated');
    const editBtn = document.getElementById('editDetailStudent');

    if (detailAvatar) {
        detailAvatar.textContent = initials;
        detailAvatar.style.background = courseColors[student.course] || 'var(--accent-blue)';
    }
    
    if (detailName) detailName.textContent = `${student.first_name} ${student.last_name}`;
    if (detailCourseBadge) {
        detailCourseBadge.textContent = student.course;
        detailCourseBadge.style.background = courseColors[student.course] || 'var(--accent-blue)';
    }
    if (detailStudentNumber) detailStudentNumber.textContent = student.student_number;
    if (detailID) detailID.textContent = `#${student.id}`;
    if (detailCourse) detailCourse.textContent = student.course;
    if (detailYear) detailYear.textContent = `Year ${student.year_level}`;
    if (detailStatus) detailStatus.textContent = 'Active';
    
    const now = new Date();
    if (detailEnrolled) detailEnrolled.textContent = now.toLocaleDateString();
    if (detailUpdated) detailUpdated.textContent = now.toLocaleDateString();

    if (editBtn) editBtn.dataset.studentId = student.id;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeDetailModal() {
    const modal = document.getElementById('studentDetailModal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Import Modal
function setupImportModal() {
    const modal = document.getElementById('importModal');
    const closeBtn = document.getElementById('closeImportModal');
    const cancelBtn = document.getElementById('cancelImportBtn');
    const dropzone = document.getElementById('importDropzone');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const fileInput = document.getElementById('csvFileInput');
    const importBtn = document.getElementById('confirmImportBtn');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeImportModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeImportModal);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeImportModal();
            }
        });
    }

    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleImportFile(files[0]);
            }
        });
    }

    if (selectFileBtn && fileInput) {
        selectFileBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleImportFile(e.target.files[0]);
            }
        });
    }

    if (importBtn) {
        importBtn.addEventListener('click', confirmImport);
    }
}

let importData = [];

function openImportModal() {
    const modal = document.getElementById('importModal');
    const fileInput = document.getElementById('csvFileInput');
    const preview = document.getElementById('importPreview');
    
    if (fileInput) fileInput.value = '';
    if (preview) preview.style.display = 'none';
    importData = [];
    
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        importData = [];
    }, 300);
}

function handleImportFile(file) {
    if (!file.name.endsWith('.csv')) {
        if (window.showToast) window.showToast('Please select a CSV file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        parseCSV(text);
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
        if (window.showToast) window.showToast('CSV file is empty', 'error');
        return;
    }

    // Skip header row
    importData = lines.slice(1).map(line => {
        const parts = line.split(',').map(s => s.trim());
        return {
            student_number: parts[0],
            first_name: parts[1],
            last_name: parts[2],
            course: parts[3],
            year_level: parseInt(parts[4])
        };
    }).filter(student => 
        student.student_number && 
        student.first_name && 
        student.last_name && 
        student.course && 
        student.year_level
    );

    if (importData.length === 0) {
        if (window.showToast) window.showToast('No valid student data found in CSV', 'error');
        return;
    }

    displayImportPreview();
}

function displayImportPreview() {
    const preview = document.getElementById('importPreview');
    const previewTable = document.getElementById('importPreviewTable');

    if (!preview || !previewTable) return;

    let tableHTML = '<table><tr><th>Student #</th><th>First Name</th><th>Last Name</th><th>Course</th><th>Year</th></tr>';
    importData.slice(0, 5).forEach(student => {
        tableHTML += `
            <tr>
                <td>${student.student_number}</td>
                <td>${student.first_name}</td>
                <td>${student.last_name}</td>
                <td>${student.course}</td>
                <td>${student.year_level}</td>
            </tr>
        `;
    });
    tableHTML += '</table>';

    previewTable.innerHTML = tableHTML;
    preview.style.display = 'block';
    
    if (importData.length > 5 && window.showToast) {
        window.showToast(`Showing 5 of ${importData.length} students`, 'info');
    }
}

async function confirmImport() {
    if (importData.length === 0) {
        if (window.showToast) window.showToast('No data to import', 'error');
        return;
    }

    try {
        const promises = importData.map(student =>
            fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(student)
            })
        );

        await Promise.all(promises);
        
        if (window.showToast) window.showToast(`${importData.length} student(s) imported successfully!`, 'success');
        closeImportModal();
        if (window.fetchAllStudents) await window.fetchAllStudents();
        updateCourseStats();
    } catch (error) {
        console.error('Import error:', error);
        if (window.showToast) window.showToast('Failed to import students', 'error');
    }
}

// Confirmation Modal Helper
function showConfirmationModal(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        if (!modal) return resolve(false);
        
        const messageEl = document.getElementById('modalMessage');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');

        if (!messageEl || !confirmBtn || !cancelBtn) return resolve(false);

        messageEl.textContent = message;

        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    });
}

// Make functions global
window.viewStudentDetail = viewStudentDetail;
window.openStudentModal = openModal;
window.closeStudentModal = closeModal;