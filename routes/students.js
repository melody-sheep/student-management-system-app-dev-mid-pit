const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all students
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM students ORDER BY last_name ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single student
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST new student
router.post('/', async (req, res) => {
    try {
        const { student_number, first_name, last_name, course, year_level } = req.body;
        
        // Check if student number exists
        const [existing] = await db.query('SELECT id FROM students WHERE student_number = ?', [student_number]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Student number already exists' });
        }

        const [result] = await db.query(
            'INSERT INTO students (student_number, first_name, last_name, course, year_level) VALUES (?, ?, ?, ?, ?)',
            [student_number, first_name, last_name, course, year_level]
        );

        const [newStudent] = await db.query('SELECT * FROM students WHERE id = ?', [result.insertId]);
        res.status(201).json(newStudent[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update student
router.put('/:id', async (req, res) => {
    try {
        const { student_number, first_name, last_name, course, year_level } = req.body;
        
        await db.query(
            'UPDATE students SET student_number = ?, first_name = ?, last_name = ?, course = ?, year_level = ? WHERE id = ?',
            [student_number, first_name, last_name, course, year_level, req.params.id]
        );

        const [updated] = await db.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
        res.json(updated[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE student
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SEARCH students
router.get('/search/:keyword', async (req, res) => {
    try {
        const keyword = `%${req.params.keyword}%`;
        const [rows] = await db.query(
            'SELECT * FROM students WHERE first_name LIKE ? OR last_name LIKE ?',
            [keyword, keyword]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;