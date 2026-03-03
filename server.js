const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const studentRoutes = require('./routes/students');
console.log('✅ Student routes loaded');
app.use('/api/students', studentRoutes);

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// Add a test route for students
app.get('/test-students', (req, res) => {
    res.json({ message: 'Student route prefix is working' });
});

// Start server with console log
app.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 Server is running!`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔧 Test: http://localhost:${PORT}/test`);
    console.log(`📊 API: http://localhost:${PORT}/api/students`);
    console.log(`🔍 Test Students: http://localhost:${PORT}/test-students`);
    console.log('=================================');
});