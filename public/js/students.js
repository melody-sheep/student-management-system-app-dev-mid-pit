// Students Page Specific JavaScript
document.addEventListener('DOMContentLoaded', () => {
    initializeStudentsPage();
});

let yearFilter = 'all';
let sortOrder = 'name-asc';
let currentView = 'table'; // 'table' or 'grid'
let selectedStudents = new Set();

function initializeStudentsPage() {
    setupStudentModal();
    setupToolbar();
    setupFilters();
    setupViewToggle();
    setupBulkSelection();
    setupDetailModal();
    setupImportModal();
    updateCourseStats();
    setupRefresh();
}

// Modal Management
function setupStudentModal() {
    const modal = document.getElementById('studentModal');
    const addBtn = document.getElementById('addStudentBtn');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelFormBtn');
    const form = document.getElementById('studentForm');

    addBtn.addEventListener('click', () => {
        openModal();
    });

    closeBtn.addEventListener('click', () => {
        closeModal();
    });

    cancelBtn.addEventListener('click', () => {
        closeModal();
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleStudentSubmit(e);
    });
}

function openModal(editData = null) {
    const modal = document.getElementById('studentModal');
    const modalContent = modal.querySelector('.modal-content');
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
        modalTitle.textContent = 'Edit Student Record';
        modalIcon.className = 'fas fa-pencil';
        submitText.textContent = 'Update Student';
        submitIcon.className = 'fas fa-save';
        
        // Show edit banner with student preview
        editBanner.style.display = 'flex';
        modalContent.classList.add('edit-mode');
        
        // Set student preview
        const initials = `${editData.first_name[0]}${editData.last_name[0]}`;
        previewAvatar.textContent = initials;
        previewName.textContent = `${editData.first_name} ${editData.last_name}`;
        previewId.textContent = `ID: ${editData.student_number}`;
        
        // Populate form
        form.student_number.value = editData.student_number;
        form.first_name.value = editData.first_name;
        form.last_name.value = editData.last_name;
        form.course.value = editData.course;
        form.year_level.value = editData.year_level;
        
        // Disable student number editing to prevent conflicts
        form.student_number.readOnly = true;
        form.student_number.style.opacity = '0.6';
        form.student_number.style.cursor = 'not-allowed';
        
        isEditMode = true;
        currentEditId = editData.id;
    } else {
        // Add Mode
        modalTitle.textContent = 'Add New Student';
        modalIcon.className = 'fas fa-user-plus';
        submitText.textContent = 'Save Student';
        submitIcon.className = 'fas fa-floppy-disk';
        
        // Hide edit banner
        editBanner.style.display = 'none';
        modalContent.classList.remove('edit-mode');
        
        form.reset();
        form.student_number.readOnly = false;
        form.student_number.style.opacity = '1';
        form.student_number.style.cursor = 'text';
        
        isEditMode = false;
        currentEditId = null;
    }

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        // Focus first input
        if (!editData) {
            form.student_number.focus();
        } else {
            form.first_name.focus();
        }
    }, 10);
    
    // Setup real-time validation
    setupFormValidation();
}

function closeModal() {
    const modal = document.getElementById('studentModal');
    const modalContent = modal.querySelector('.modal-content');
    const form = document.getElementById('studentForm');
    
    modal.classList.remove('show');
    modalContent.classList.remove('edit-mode');
    
    setTimeout(() => {
        modal.style.display = 'none';
        form.reset();
        
        // Clear validation messages
        document.querySelectorAll('.validation-message').forEach(el => {
            el.style.display = 'none';
            el.className = 'validation-message';
        });
        
        // Reset student number field
        form.student_number.readOnly = false;
        form.student_number.style.opacity = '1';
        form.student_number.style.cursor = 'text';
        
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
    const submitText = document.getElementById('submitBtnText');
    const submitIcon = document.getElementById('submitIcon');
    
    const data = {
        student_number: form.student_number.value.trim(),
        first_name: form.first_name.value.trim(),
        last_name: form.last_name.value.trim(),
        course: form.course.value,
        year_level: parseInt(form.year_level.value)
    };
    
    // Validate data
    if (!validateFormData(data)) {
        return;
    }

    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        let response;
        if (isEditMode && currentEditId) {
            response = await fetch(`/api/students/${currentEditId}`, {
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
                const message = isEditMode ? 
                    `✓ ${data.first_name} ${data.last_name}'s record updated successfully!` : 
                    `✓ ${data.first_name} ${data.last_name} added successfully!`;
                window.showToast(message, 'success');
            }
            closeModal();
            if (window.fetchAllStudents) window.fetchAllStudents();
            updateCourseStats();
        } else {
            const error = await response.json();
            showValidationError('student_number', error.error || 'Operation failed');
            if (window.showToast) window.showToast(error.error || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        if (window.showToast) window.showToast('Failed to save student. Please try again.', 'error');
    } finally {
        // Remove loading state
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
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
                document.getElementById('studentNumberValidation').style.display = 'none';
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
                document.getElementById('firstNameValidation').style.display = 'none';
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
                document.getElementById('lastNameValidation').style.display = 'none';
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
        importBtn.addEventListener('click', () => {
            openImportModal();
        });
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

// Advanced Filters
function setupFilters() {
    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortOrder = e.target.value;
            applyFilters();
        });
    }

    // Year filters (if they exist)
    const yearChips = document.querySelectorAll('.year-chip');
    yearChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            yearChips.forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            yearFilter = e.target.dataset.year;
            applyFilters();
        });
    });
}

// Update Course Statistics
function updateCourseStats() {
    if (!window.allStudents) return;
    
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

// Override applyFilters to include year and sort
let originalApplyFilters = null;
let originalDisplayStudents = null;

// Override displayStudents to add checkbox column
window.displayStudents = function(students) {
    const tbody = document.getElementById('studentTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody || !emptyState) {
        console.error('Required elements not found');
        return;
    }
    
    if (!students || students.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        const recordCount = document.getElementById('recordCount');
        if (recordCount) recordCount.textContent = 'Showing 0 of 0 records';
        
        // Clear select all checkbox
        const selectAll = document.getElementById('selectAll');
        if (selectAll) selectAll.checked = false;
        return;
    }
    
    emptyState.style.display = 'none';
    
    let html = '';
    students.forEach((student, index) => {
        const courseClass = window.getCourseClass ? window.getCourseClass(student.course) : 'cs';
        const checked = selectedStudents.has(student.id) ? 'checked' : '';
        const escapeFn = window.escapeHtml || ((str) => str);
        const yearSuffixFn = window.getYearSuffix || ((y) => 'th');
        
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
                        ${escapeFn(student.course)}
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
    
    // Reattach checkbox listeners
    document.querySelectorAll('.student-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
    });
};

window.applyFilters = function() {
    if (!window.allStudents || !window.currentFilters) {
        console.error('Required variables not available');
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
        filtered = filtered.filter(s => s.course === courseMap[window.currentFilters.filterType]);
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

    // Update both views
    window.displayStudents(filtered);
    if (currentView === 'grid') {
        displayStudentsGrid(filtered);
    }
};

// Refresh functionality
function setupRefresh() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (window.fetchAllStudents) window.fetchAllStudents();
            updateCourseStats();
            if (window.showToast) window.showToast('Data refreshed!', 'success');
        });
    }
}

// Make modal functions global for edit buttons
window.openStudentModal = openModal;
window.closeStudentModal = closeModal;

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
                applyFilters();
            }
        });
    });
}

function displayStudentsGrid(students) {
    const gridContainer = document.getElementById('studentGrid');
    const emptyStateGrid = document.getElementById('emptyStateGrid');
    
    if (!gridContainer) return;

    if (students.length === 0) {
        if (emptyStateGrid) emptyStateGrid.style.display = 'flex';
        gridContainer.innerHTML = '';
        return;
    }

    if (emptyStateGrid) emptyStateGrid.style.display = 'none';
    
    const courseColors = {
        'Computer Science': '#3b82f6',
        'Information Technology': '#10b981',
        'Data Science': '#8b5cf6',
        'Software Engineering': '#f59e0b'
    };

    gridContainer.innerHTML = students.map(student => {
        const initials = `${student.first_name[0]}${student.last_name[0]}`;
        const color = courseColors[student.course] || '#6b7280';
        
        return `
            <div class="student-card" onclick="viewStudentDetail(${student.id})">
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
                        <h4>${student.first_name} ${student.last_name}</h4>
                        <p>${student.student_number}</p>
                    </div>
                </div>
                <div class="student-card-details">
                    <div class="student-card-detail">
                        <i class="fas fa-graduation-cap"></i>
                        <span>${student.course}</span>
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

    // Attach to existing checkboxes (will be called after table render)
    document.querySelectorAll('.student-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
    });
}

function handleCheckboxChange(e) {
    const studentId = parseInt(e.target.dataset.id);
    
    if (e.target.checked) {
        selectedStudents.add(studentId);
    } else {
        selectedStudents.delete(studentId);
    }
    
    updateBulkActions();

    // Update select all checkbox
    const selectAllCheckbox = document.getElementById('selectAll');
    const allCheckboxes = document.querySelectorAll('.student-checkbox');
    const checkedCount = Array.from(allCheckboxes).filter(cb => cb.checked).length;
    
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = checkedCount === allCheckboxes.length && allCheckboxes.length > 0;
    }
}

function updateBulkActions() {
    const count = selectedStudents.size;
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const bulkPromoteBtn = document.getElementById('bulkPromoteBtn');
    const countText = document.getElementById('selectedCountText');
    
    if (count > 0) {
        if (bulkDeleteBtn) bulkDeleteBtn.style.display = 'flex';
        if (bulkPromoteBtn) bulkPromoteBtn.style.display = 'flex';
        if (countText) countText.textContent = count;
    } else {
        if (bulkDeleteBtn) bulkDeleteBtn.style.display = 'none';
        if (bulkPromoteBtn) bulkPromoteBtn.style.display = 'none';
    }
}

async function handleBulkDelete() {
    if (selectedStudents.size === 0) return;

    const confirmed = await showConfirmation(
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
        if (window.fetchAllStudents) window.fetchAllStudents();
        updateCourseStats();
    } catch (error) {
        console.error('Bulk delete error:', error);
        if (window.showToast) window.showToast('Failed to delete students', 'error');
    }
}

async function handleBulkPromote() {
    if (selectedStudents.size === 0) return;

    const confirmed = await showConfirmation(
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
        if (window.fetchAllStudents) window.fetchAllStudents();
    } catch (error) {
        console.error('Bulk promote error:', error);
        if (window.showToast) window.showToast('Failed to promote students', 'error');
    }
}

// Student Detail Modal
function setupDetailModal() {
    const modal = document.getElementById('studentDetailModal');
    const closeBtn = modal?.querySelector('.close-modal');
    const editBtn = document.getElementById('editDetailStudent');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeDetailModal);
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
    const initials = `${student.first_name[0]}${student.last_name[0]}`;
    
    const courseColors = {
        'Computer Science': '#3b82f6',
        'Information Technology': '#10b981',
        'Data Science': '#8b5cf6',
        'Software Engineering': '#f59e0b'
    };

    document.getElementById('detailAvatar').innerHTML = initials;
    document.getElementById('detailAvatar').style.background = courseColors[student.course];
    document.getElementById('detailName').textContent = `${student.first_name} ${student.last_name}`;
    document.getElementById('detailCourseBadge').textContent = student.course;
    document.getElementById('detailCourseBadge').style.background = courseColors[student.course];
    document.getElementById('detailStudentNumber').textContent = student.student_number;
    document.getElementById('detailFirstName').textContent = student.first_name;
    document.getElementById('detailLastName').textContent = student.last_name;
    document.getElementById('detailCourse').textContent = student.course;
    document.getElementById('detailYearLevel').textContent = `Year ${student.year_level}`;
    document.getElementById('detailCreatedAt').textContent = new Date(student.created_at).toLocaleDateString();

    document.getElementById('editDetailStudent').dataset.studentId = student.id;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeDetailModal() {
    const modal = document.getElementById('studentDetailModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Import Modal
function setupImportModal() {
    const modal = document.getElementById('importModal');
    const closeBtn = modal?.querySelector('.close-modal');
    const dropzone = document.getElementById('importDropzone');
    const fileInput = document.getElementById('importFile');
    const importBtn = document.getElementById('confirmImportBtn');
    const cancelBtn = document.getElementById('cancelImportBtn');

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
    document.getElementById('importFile').value = '';
    document.getElementById('importPreview').style.display = 'none';
    importData = [];
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
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
    const tbody = document.querySelector('#importPreviewTable tbody');

    tbody.innerHTML = importData.slice(0, 5).map(student => `
        <tr>
            <td>${student.student_number}</td>
            <td>${student.first_name}</td>
            <td>${student.last_name}</td>
            <td>${student.course}</td>
            <td>${student.year_level}</td>
        </tr>
    `).join('');

    preview.style.display = 'block';
    
    if (importData.length > 5) {
        if (window.showToast) window.showToast(`Showing 5 of ${importData.length} students`, 'info');
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
        if (window.fetchAllStudents) window.fetchAllStudents();
        updateCourseStats();
    } catch (error) {
        console.error('Import error:', error);
        if (window.showToast) window.showToast('Failed to import students', 'error');
    }
}

// Confirmation Modal Helper
function showConfirmation(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const confirmBtn = document.getElementById('confirmActionBtn');
        const cancelBtn = document.getElementById('cancelActionBtn');

        titleEl.textContent = title;
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

const originalDeleteStudent = window.deleteStudent;
window.deleteStudent = async function(id) {
    await originalDeleteStudent(id);
    // Clear from selected students
    selectedStudents.delete(id);
    updateBulkActions();
};

const originalEditStudent = window.editStudent;
window.editStudent = function(id) {
    const student = window.allStudents ? window.allStudents.find(s => s.id === id) : null;
    if (student) {
        openModal(student);
    }
};

// Coming soon feature
window.showComingSoon = function(event) {
    event.preventDefault();
    if (window.showToast) window.showToast('This feature is coming soon!', 'info');
};
