// Wait for page to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('📚 Student Management System initialized');
    initializeApp();
});

// Global state
let allStudents = [];
let currentFilters = {
    search: '',
    filterType: 'all'
};
let isEditMode = false;
let currentEditId = null;

// Course class mapping
const courseClassMap = {
    'Computer Science': 'cs',
    'Information Technology': 'it',
    'Data Science': 'ds',
    'Software Engineering': 'se'
};

// Initialize application
function initializeApp() {
    initializeTheme();
    fetchAllStudents();
    setupEventListeners();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    setupFormValidation(); // New: real-time validation
}

// ===== THEME MANAGEMENT =====
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    }
    
    themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    if (document.body.classList.contains('dark-mode')) {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    }
    
    showToast(`Switched to ${document.body.classList.contains('dark-mode') ? 'dark' : 'light'} mode`, 'info');
}

// ===== FETCH ALL STUDENTS =====
async function fetchAllStudents() {
    try {
        showLoading(true);
        const response = await fetch('/api/students');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        allStudents = await response.json();
        console.log(`📊 Loaded ${allStudents.length} student records`);
        
        updateStats();
        applyFilters();
        
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('Failed to load student records', 'error');
        showEmptyState(true);
    } finally {
        showLoading(false);
    }
}

// ===== DISPLAY STUDENTS =====
function displayStudents(students) {
    const tbody = document.getElementById('studentTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!students || students.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        document.getElementById('recordCount').textContent = 'Showing 0 of 0 records';
        return;
    }
    
    emptyState.style.display = 'none';
    
    let html = '';
    students.forEach((student, index) => {
        const courseClass = getCourseClass(student.course);
        
        html += `
            <tr data-course="${escapeHtml(student.course)}" style="animation: fadeIn 0.3s ease ${index * 0.05}s both;">
                <td>
                    <span class="status-badge ${courseClass}">
                        #${student.id}
                    </span>
                </td>
                <td><strong style="color: var(--text-primary);">${escapeHtml(student.student_number)}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 32px; height: 32px; background: var(--course-${courseClass}); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                            ${escapeHtml(student.first_name.charAt(0))}${escapeHtml(student.last_name.charAt(0))}
                        </div>
                        <span style="color: var(--text-primary);">${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</span>
                    </div>
                </td>
                <td>
                    <span class="course-name ${courseClass}">
                        ${escapeHtml(student.course)}
                    </span>
                </td>
                <td style="color: var(--text-secondary);">${student.year_level}${getYearSuffix(student.year_level)} Year</td>
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
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    document.getElementById('recordCount').textContent = 
        `Showing ${students.length} of ${allStudents.length} records`;
}

// Helper to get course class
function getCourseClass(course) {
    return courseClassMap[course] || '';
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Form submission
    document.getElementById('studentForm').addEventListener('submit', handleFormSubmit);
    
    // Clear form button
    document.getElementById('clearFormBtn').addEventListener('click', resetForm);
    
    // Toggle form panel
    document.getElementById('toggleFormBtn').addEventListener('click', () => {
        const panelBody = document.querySelector('.panel .panel-body');
        const icon = document.querySelector('#toggleFormBtn i');
        
        if (panelBody.style.display === 'none') {
            panelBody.style.display = 'block';
            icon.className = 'fas fa-chevron-down';
        } else {
            panelBody.style.display = 'none';
            icon.className = 'fas fa-chevron-up';
        }
    });
    
    // Search input with debounce
    document.getElementById('searchInput').addEventListener('input', debounce(() => {
        currentFilters.search = document.getElementById('searchInput').value.toLowerCase();
        applyFilters();
    }, 300));
    
    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            currentFilters.filterType = this.dataset.filter;
            applyFilters();
        });
    });
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', fetchAllStudents);
    
    // Menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sideNav').classList.toggle('collapsed');
    });
}

// ===== FORM VALIDATION (real-time) =====
function setupFormValidation() {
    const inputs = ['student_number', 'first_name', 'last_name', 'course', 'year_level'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', validateFormRealTime);
            el.addEventListener('change', validateFormRealTime);
        }
    });
    validateFormRealTime(); // initial check
}

function validateFormRealTime() {
    const data = {
        student_number: document.getElementById('student_number').value,
        first_name: document.getElementById('first_name').value,
        last_name: document.getElementById('last_name').value,
        course: document.getElementById('course').value,
        year_level: document.getElementById('year_level').value
    };
    
    const isValid = 
        data.student_number && data.student_number.length >= 5 &&
        data.first_name && data.first_name.length >= 2 &&
        data.last_name && data.last_name.length >= 2 &&
        data.course &&
        data.year_level && data.year_level >= 1 && data.year_level <= 4;
    
    const submitBtn = document.querySelector('#studentForm button[type="submit"]');
    if (isValid) {
        submitBtn.disabled = false;
        submitBtn.classList.add('btn-valid');
    } else {
        submitBtn.disabled = true;
        submitBtn.classList.remove('btn-valid');
    }
}

// ===== FORM HANDLING =====
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        student_number: document.getElementById('student_number').value,
        first_name: document.getElementById('first_name').value,
        last_name: document.getElementById('last_name').value,
        course: document.getElementById('course').value,
        year_level: parseInt(document.getElementById('year_level').value)
    };
    
    if (!validateForm(formData)) return;
    
    try {
        showLoading(true);
        
        const url = isEditMode ? `/api/students/${currentEditId}` : '/api/students';
        const method = isEditMode ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Operation failed');
        }
        
        showToast(
            isEditMode ? 'Student record updated successfully' : 'New student record added successfully',
            'success'
        );
        
        resetForm();
        await fetchAllStudents();
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== EDIT STUDENT =====
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
        
        // Set edit mode
        isEditMode = true;
        currentEditId = id;
        
        // Update UI
        const submitBtn = document.querySelector('#studentForm button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-pen"></i> Update Record';
        
        // Expand form if collapsed
        const panelBody = document.querySelector('.panel .panel-body');
        panelBody.style.display = 'block';
        document.querySelector('#toggleFormBtn i').className = 'fas fa-chevron-down';
        
        // Highlight form
        document.querySelector('.panel').style.borderColor = 'var(--accent-orange)';
        
        // Scroll to form
        document.querySelector('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        showToast('Edit mode activated', 'info');
        
        // Re-validate after populating
        validateFormRealTime();
        
    } catch (error) {
        showToast('Failed to load student details', 'error');
    } finally {
        showLoading(false);
    }
}

// ===== DELETE STUDENT =====
async function deleteStudent(id) {
    const confirmed = await showConfirmationModal(
        'Delete Record',
        'Are you sure you want to delete this student record? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/students/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete student record');
        }
        
        showToast('Student record deleted successfully', 'success');
        await fetchAllStudents();
        
    } catch (error) {
        showToast('Failed to delete student record', 'error');
    } finally {
        showLoading(false);
    }
}

// ===== FILTERS =====
function applyFilters() {
    let filtered = [...allStudents];
    
    // Apply search filter
    if (currentFilters.search) {
        filtered = filtered.filter(student => 
            student.first_name.toLowerCase().includes(currentFilters.search) ||
            student.last_name.toLowerCase().includes(currentFilters.search) ||
            student.student_number.toLowerCase().includes(currentFilters.search)
        );
    }
    
    // Apply course filter
    if (currentFilters.filterType !== 'all') {
        const courseMap = {
            'cs': 'Computer Science',
            'it': 'Information Technology',
            'ds': 'Data Science',
            'se': 'Software Engineering'
        };
        const selectedCourse = courseMap[currentFilters.filterType];
        filtered = filtered.filter(student => student.course === selectedCourse);
    }
    
    displayStudents(filtered);
}

// ===== UTILITY FUNCTIONS =====
function validateForm(data) {
    if (!data.student_number || data.student_number.length < 5) {
        showToast('Please enter a valid student ID', 'error');
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

function resetForm() {
    document.getElementById('studentForm').reset();
    isEditMode = false;
    currentEditId = null;
    
    const submitBtn = document.querySelector('#studentForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Record';
    
    document.querySelector('.panel').style.borderColor = 'var(--border-color)';
    
    validateFormRealTime(); // re-check validity
}

function updateStats() {
    document.getElementById('totalStudents').textContent = allStudents.length;
    
    const courses = new Set(allStudents.map(s => s.course));
    document.getElementById('activeCourses').textContent = courses.size;
}

function updateCurrentTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    document.getElementById('currentTime').textContent = timeStr;
}

function getYearSuffix(year) {
    const suffixes = ['st', 'nd', 'rd', 'th'];
    return suffixes[year - 1] || 'th';
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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

// ===== UI HELPER FUNCTIONS =====
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const table = document.getElementById('studentTable');
    
    if (show) {
        spinner.style.display = 'flex';
        table.style.opacity = '0.5';
    } else {
        spinner.style.display = 'none';
        table.style.opacity = '1';
    }
}

function showEmptyState(show) {
    const emptyState = document.getElementById('emptyState');
    emptyState.style.display = show ? 'block' : 'none';
}

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
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function showConfirmationModal(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const modalMessage = document.getElementById('modalMessage');
        const modalTitle = modal.querySelector('h3');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.style.display = 'flex';
        
        const handleConfirm = () => {
            modal.style.display = 'none';
            document.getElementById('modalConfirm').removeEventListener('click', handleConfirm);
            document.getElementById('modalCancel').removeEventListener('click', handleCancel);
            resolve(true);
        };
        
        const handleCancel = () => {
            modal.style.display = 'none';
            document.getElementById('modalConfirm').removeEventListener('click', handleConfirm);
            document.getElementById('modalCancel').removeEventListener('click', handleCancel);
            resolve(false);
        };
        
        document.getElementById('modalConfirm').addEventListener('click', handleConfirm);
        document.getElementById('modalCancel').addEventListener('click', handleCancel);
        
        // Close modal if clicked outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                handleCancel();
            }
        });
    });
}

// Export functions for global access (for onclick handlers)
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;