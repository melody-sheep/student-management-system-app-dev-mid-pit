// Wait for page to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 StudentFlow initialized!');
    initializeApp();
});

// Global state
let allStudents = [];
let currentFilter = {
    search: '',
    course: '',
    year: ''
};

// Initialize application
function initializeApp() {
    // Show loading state
    showLoading(true);
    
    // Fetch initial data
    fetchAllStudents();
    
    // Setup event listeners
    setupEventListeners();
    
    // Populate course filter
    populateCourseFilter();
}

// Setup all event listeners
function setupEventListeners() {
    // Form submission
    document.getElementById('studentForm').addEventListener('submit', handleFormSubmit);
    
    // Search button
    document.getElementById('searchBtn').addEventListener('click', applyFilters);
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetFilters);
    
    // Real-time search (optional)
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 500));
    
    // Filter changes
    document.getElementById('filterCourse').addEventListener('change', applyFilters);
    document.getElementById('filterYear').addEventListener('change', applyFilters);
    
    // Form reset
    document.getElementById('studentForm').addEventListener('reset', () => {
        // Reset form state
        document.getElementById('studentForm').dataset.mode = 'add';
        document.getElementById('studentForm').dataset.editId = '';
    });
}

// FETCH: Get all students
async function fetchAllStudents() {
    try {
        showLoading(true);
        const response = await fetch('/api/students');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        allStudents = await response.json();
        console.log('📊 Students loaded:', allStudents.length);
        
        // Update total students count
        updateStudentCount();
        
        // Apply any existing filters
        applyFilters();
        
    } catch (error) {
        console.error('❌ Error fetching students:', error);
        showToast('Failed to load students', 'error');
        showEmptyState(true);
    } finally {
        showLoading(false);
    }
}

// DISPLAY: Show students in table with animations
function displayStudents(students) {
    const tbody = document.getElementById('studentTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!students || students.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        document.getElementById('recordCount').textContent = 'Showing 0 records';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Build table HTML with staggered animation
    let html = '';
    students.forEach((student, index) => {
        html += `
            <tr style="animation: fadeIn 0.3s ease-out ${index * 0.05}s both;">
                <td><span class="status-badge status-active">#${student.id}</span></td>
                <td><strong>${escapeHtml(student.student_number)}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-user-circle" style="color: var(--primary); font-size: 1.5rem;"></i>
                        ${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}
                    </div>
                </td>
                <td>${escapeHtml(student.course)}</td>
                <td>${student.year_level}${getYearSuffix(student.year_level)} Year</td>
                <td><span class="status-badge status-active">Active</span></td>
                <td>
                    <button class="action-btn edit" onclick="editStudent(${student.id})" title="Edit Student">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteStudent(${student.id})" title="Delete Student">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Update record count
    document.getElementById('recordCount').textContent = 
        `Showing ${students.length} of ${allStudents.length} records`;
}

// HANDLE FORM SUBMIT: Add or Update student
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
        student_number: document.getElementById('student_number').value,
        first_name: document.getElementById('first_name').value,
        last_name: document.getElementById('last_name').value,
        course: document.getElementById('course').value,
        year_level: document.getElementById('year_level').value
    };
    
    // Validate form
    if (!validateForm(formData)) {
        return;
    }
    
    const form = e.target;
    const mode = form.dataset.mode || 'add';
    const editId = form.dataset.editId;
    
    try {
        showLoading(true);
        
        let url = '/api/students';
        let method = 'POST';
        
        if (mode === 'edit' && editId) {
            url = `/api/students/${editId}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Operation failed');
        }
        
        const result = await response.json();
        
        // Show success message
        showToast(mode === 'add' ? 'Student added successfully!' : 'Student updated successfully!', 'success');
        
        // Reset form
        resetForm();
        
        // Refresh student list
        await fetchAllStudents();
        
    } catch (error) {
        console.error('❌ Error:', error);
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// EDIT: Populate form with student data
async function editStudent(id) {
    try {
        showLoading(true);
        
        const response = await fetch(`/api/students/${id}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch student details');
        }
        
        const student = await response.json();
        
        // Populate form
        document.getElementById('student_number').value = student.student_number;
        document.getElementById('first_name').value = student.first_name;
        document.getElementById('last_name').value = student.last_name;
        document.getElementById('course').value = student.course;
        document.getElementById('year_level').value = student.year_level;
        
        // Set form to edit mode
        const form = document.getElementById('studentForm');
        form.dataset.mode = 'edit';
        form.dataset.editId = id;
        
        // Update form header
        document.querySelector('.form-header h2').innerHTML = '<i class="fas fa-edit"></i> Edit Student';
        
        // Scroll to form
        document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
        
        showToast('Edit mode activated', 'info');
        
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('Failed to load student details', 'error');
    } finally {
        showLoading(false);
    }
}

// DELETE: Remove student with confirmation
async function deleteStudent(id) {
    // Show custom confirmation dialog
    const confirmed = await showConfirmationDialog(
        'Delete Student',
        'Are you sure you want to delete this student? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/students/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete student');
        }
        
        showToast('Student deleted successfully!', 'success');
        
        // Refresh student list
        await fetchAllStudents();
        
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('Failed to delete student', 'error');
    } finally {
        showLoading(false);
    }
}

// SEARCH & FILTER: Apply all filters
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const courseFilter = document.getElementById('filterCourse').value;
    const yearFilter = document.getElementById('filterYear').value;
    
    let filteredStudents = [...allStudents];
    
    // Apply search filter
    if (searchTerm) {
        filteredStudents = filteredStudents.filter(student => 
            student.first_name.toLowerCase().includes(searchTerm) ||
            student.last_name.toLowerCase().includes(searchTerm) ||
            student.student_number.toLowerCase().includes(searchTerm) ||
            student.course.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply course filter
    if (courseFilter) {
        filteredStudents = filteredStudents.filter(student => 
            student.course === courseFilter
        );
    }
    
    // Apply year filter
    if (yearFilter) {
        filteredStudents = filteredStudents.filter(student => 
            student.year_level == yearFilter
        );
    }
    
    displayStudents(filteredStudents);
}

// RESET FILTERS: Clear all filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterCourse').value = '';
    document.getElementById('filterYear').value = '';
    
    displayStudents(allStudents);
    
    showToast('Filters cleared', 'info');
}

// POPULATE COURSE FILTER
function populateCourseFilter() {
    const courses = [
        'Computer Science',
        'Information Technology',
        'Data Science',
        'Software Engineering'
    ];
    
    const select = document.getElementById('filterCourse');
    
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        select.appendChild(option);
    });
}

// FORM VALIDATION
function validateForm(data) {
    if (!data.student_number || data.student_number.length < 5) {
        showToast('Please enter a valid student number', 'error');
        return false;
    }
    
    if (!data.first_name || data.first_name.length < 2) {
        showToast('First name must be at least 2 characters', 'error');
        return false;
    }
    
    if (!data.last_name || data.last_name.length < 2) {
        showToast('Last name must be at least 2 characters', 'error');
        return false;
    }
    
    if (!data.course) {
        showToast('Please select a course', 'error');
        return false;
    }
    
    if (!data.year_level || data.year_level < 1 || data.year_level > 4) {
        showToast('Please select a valid year level', 'error');
        return false;
    }
    
    return true;
}

// RESET FORM
function resetForm() {
    document.getElementById('studentForm').reset();
    const form = document.getElementById('studentForm');
    form.dataset.mode = 'add';
    form.dataset.editId = '';
    document.querySelector('.form-header h2').innerHTML = '<i class="fas fa-plus-circle"></i> Add New Student';
}

// UPDATE STUDENT COUNT
function updateStudentCount() {
    document.getElementById('totalStudents').textContent = allStudents.length;
}

// SHOW LOADING STATE
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const table = document.getElementById('studentTable');
    const emptyState = document.getElementById('emptyState');
    
    if (show) {
        spinner.style.display = 'block';
        table.style.opacity = '0.5';
        if (emptyState) emptyState.style.display = 'none';
    } else {
        spinner.style.display = 'none';
        table.style.opacity = '1';
    }
}

// SHOW EMPTY STATE
function showEmptyState(show) {
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('studentTable');
    
    if (show) {
        emptyState.style.display = 'block';
        table.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        table.style.display = 'table';
    }
}

// TOAST NOTIFICATION
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// CUSTOM CONFIRMATION DIALOG
function showConfirmationDialog(title, message) {
    return new Promise((resolve) => {
        // Create modal element
        const modal = document.createElement('div');
        modal.className = 'confirmation-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                padding: 2rem;
                border-radius: var(--radius-2xl);
                max-width: 400px;
                text-align: center;
                box-shadow: var(--shadow-2xl);
            ">
                <i class="fas fa-exclamation-triangle" style="color: var(--warning); font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 1rem;">${title}</h3>
                <p style="margin-bottom: 2rem; color: var(--gray);">${message}</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-secondary" onclick="this.closest('.confirmation-modal').remove(); resolve(false)">
                        Cancel
                    </button>
                    <button class="btn btn-danger" onclick="this.closest('.confirmation-modal').remove(); resolve(true)">
                        Delete
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle button clicks
        modal.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const isConfirm = btn.textContent.includes('Delete');
                resolve(isConfirm);
            });
        });
    });
}

// UTILITY: Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// UTILITY: Get year suffix
function getYearSuffix(year) {
    const suffixes = ['st', 'nd', 'rd', 'th'];
    return suffixes[year - 1] || 'th';
}

// UTILITY: Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}