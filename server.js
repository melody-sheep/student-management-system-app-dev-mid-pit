const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// Test database connection
async function testConnection() {
    try {
        await db.query('SELECT 1');
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
    }
}
testConnection();

// ===== API ROUTES =====

// GET all students
app.get('/api/students', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM students ORDER BY last_name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// GET student by ID
app.get('/api/students/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ error: 'Failed to fetch student' });
    }
});

// POST new student
app.post('/api/students', async (req, res) => {
    const { student_number, first_name, last_name, course, year_level } = req.body;
    
    // Validation
    if (!student_number || !first_name || !last_name || !course || !year_level) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    try {
        const [result] = await db.query(
            'INSERT INTO students (student_number, first_name, last_name, course, year_level) VALUES (?, ?, ?, ?, ?)',
            [student_number, first_name, last_name, course, year_level]
        );
        
        const [newStudent] = await db.query('SELECT * FROM students WHERE id = ?', [result.insertId]);
        
        res.status(201).json(newStudent[0]);
    } catch (error) {
        console.error('Error creating student:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Student number already exists' });
        }
        
        res.status(500).json({ error: 'Failed to create student' });
    }
});

// PUT update student
app.put('/api/students/:id', async (req, res) => {
    const { student_number, first_name, last_name, course, year_level } = req.body;
    const { id } = req.params;
    
    // Validation
    if (!student_number || !first_name || !last_name || !course || !year_level) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    try {
        const [result] = await db.query(
            'UPDATE students SET student_number = ?, first_name = ?, last_name = ?, course = ?, year_level = ? WHERE id = ?',
            [student_number, first_name, last_name, course, year_level, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const [updatedStudent] = await db.query('SELECT * FROM students WHERE id = ?', [id]);
        
        res.json(updatedStudent[0]);
    } catch (error) {
        console.error('Error updating student:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Student number already exists' });
        }
        
        res.status(500).json({ error: 'Failed to update student' });
    }
});

// DELETE student
app.delete('/api/students/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

// GET search students
app.get('/api/students/search/:keyword', async (req, res) => {
    try {
        const keyword = `%${req.params.keyword}%`;
        const [rows] = await db.query(
            'SELECT * FROM students WHERE first_name LIKE ? OR last_name LIKE ? OR student_number LIKE ? ORDER BY last_name ASC',
            [keyword, keyword, keyword]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Error searching students:', error);
        res.status(500).json({ error: 'Failed to search students' });
    }
});

// Serve frontend for any other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Student Management System running on http://localhost:${PORT}`);
});