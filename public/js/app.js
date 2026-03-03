// Wait for page to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 AcademicSuite initialized!');
    initializeApp();
});

// Global state
let allStudents = [];
let currentFilters = {
    search: '',
    course: '',
    year: '',
    filterType: 'all'
};
let isEditMode = false;
let currentEditId = null;

// Initialize application
function initializeApp() {
    // Theme setup
    initializeTheme();
    
    // Fetch initial data
    fetchAllStudents();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update time
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Populate stats
    updateStats();
}

// ===== THEME MANAGEMENT =====
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
    }
    
    themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    if (document.body.classList.contains('light-mode')) {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    }
    
    showToast(`Switched to ${document.body.classList.contains('dark-mode') ? 'dark' : 'light'} mode`, 'info');
}

// ===== SIDE NAVIGATION =====
document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sideNav').classList.toggle('collapsed');
});

// ===== FETCH ALL STUDENTS =====
async function fetchAllStudents() {
    try {
        showLoading(true);
        const response = await fetch('/api/students');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        allStudents = await response.json();
        console.log('📊 Students loaded:', allStudents.length);
        
        updateStats();
        applyFilters();
        
    } catch (error) {
        console.error('❌ Error fetching students:', error);
        showToast('Failed to load students', 'error');
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
        html += `
            <tr style="animation: fadeIn 0.3s ease ${index * 0.05}s both;">
                <td><span class="status-badge">#${student.id}</span></td>
                <td><strong>${escapeHtml(student.student_number)}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <img src="https://ui-avatars.com/api/?name=${escapeHtml(student.first_name)}+${escapeHtml(student.last_name)}&background=831d1c&color=fff&bold=true&size=32" 
                             style="width: 32px; height: 32px; border-radius: 8px;">
                        ${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}
                    </div>
                </td>
                <td>${escapeHtml(student.course)}</td>
                <td>${student.year_level}${getYearSuffix(student.year_level)} Year</td>
                <td><span class="status-badge">Active</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-sm edit" onclick="editStudent(${student.id})" title="Edit Student">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn-sm delete" onclick="deleteStudent(${student.id})" title="Delete Student">
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

// ===== FORM HANDLING =====
document.getElementById('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        student_number: document.getElementById('student_number').value,
        first_name: document.getElementById('first_name').value,
        last_name: document.getElementById('last_name').value,
        course: document.getElementById('course').value,
        year_level: document.getElementById('year_level').value
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
        
        showToast(isEditMode ? 'Student updated successfully!' : 'Student added successfully!', 'success');
        
        resetForm();
        await fetchAllStudents();
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
});

document.getElementById('clearFormBtn').addEventListener('click', resetForm);
document.getElementById('toggleFormBtn').addEventListener('click', () => {
    const panel = document.querySelector('.form-panel .panel-body');
    const icon = document.querySelector('#toggleFormBtn i');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        icon.className = 'fas fa-chevron-down';
    } else {
        panel.style.display = 'none';
        icon.className = 'fas fa-chevron-up';
    }
});

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
        document.querySelector('.form-panel .panel-body').style.display = 'block';
        document.querySelector('#toggleFormBtn i').className = 'fas fa-chevron-down';
        
        // Highlight form
        document.querySelector('.form-panel').style.boxShadow = '0 0 0 2px var(--accent-gold)';
        
        showToast('Edit mode activated', 'info');
        
    } catch (error) {
        showToast('Failed to load student details', 'error');
    } finally {
        showLoading(false);
    }
}

// ===== DELETE STUDENT =====
async function deleteStudent(id) {
    const confirmed = await showConfirmationModal(
        'Delete Student Record',
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
        await fetchAllStudents();
        
    } catch (error) {
        showToast('Failed to delete student', 'error');
    } finally {
        showLoading(false);
    }
}

// ===== SEARCH & FILTERS =====
document.getElementById('searchInput').addEventListener('input', debounce(() => {
    currentFilters.search = document.getElementById('searchInput').value.toLowerCase();
    applyFilters();
}, 300));

document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        
        currentFilters.filterType = this.dataset.filter;
        applyFilters();
    });
});

document.getElementById('resetBtn').addEventListener('click', resetFilters);

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
        filtered = filtered.filter(student => 
            student.course === courseMap[currentFilters.filterType]
        );
    }
    
    displayStudents(filtered);
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-filter="all"]').classList.add('active');
    
    currentFilters = {
        search: '',
        filterType: 'all'
    };
    
    applyFilters();
    showToast('Filters cleared', 'info');
}

// ===== UTILITY FUNCTIONS =====
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
    
    if (!data.year_level) {
        showToast('Please select a year level', 'error');
        return false;
    }
    
    return true;
}

function resetForm() {
    document.getElementById('studentForm').reset();
    isEditMode = false;
    currentEditId = null;
    
    const submitBtn = document.querySelector('#studentForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Record';
    
    document.querySelector('.form-panel').style.boxShadow = 'none';
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
    return unsafe
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
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}

function showConfirmationModal(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        document.getElementById('modalMessage').textContent = message;
        modal.style.display = 'flex';
        
        document.getElementById('modalConfirm').onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };
        
        document.getElementById('modalCancel').onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };
    });
}