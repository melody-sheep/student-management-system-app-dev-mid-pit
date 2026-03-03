// Wait for page to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded!');
    fetchAllStudents();
});

// FETCH: Get all students
async function fetchAllStudents() {
    try {
        const response = await fetch('/api/students');
        const students = await response.json();
        console.log('Students from database:', students);
        displayStudents(students);
    } catch (error) {
        console.error('Error:', error);
    }
}

// DISPLAY: Show students in table
function displayStudents(students) {
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '';
    
    students.forEach(student => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${student.id}</td>
            <td>${student.student_number}</td>
            <td>${student.first_name}</td>
            <td>${student.last_name}</td>
            <td>${student.course}</td>
            <td>${student.year_level}</td>
            <td>
                <button class="edit-btn" data-id="${student.id}">Edit</button>
                <button class="delete-btn" data-id="${student.id}">Delete</button>
            </td>
        `;
    });
}