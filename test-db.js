require('dotenv').config();
const mysql = require('mysql2');

console.log('Testing database connection...');
console.log('Database config:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME
});

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:');
        console.error(err);
    } else {
        console.log('✅ Database connected successfully!');
    }
    connection.end();
});