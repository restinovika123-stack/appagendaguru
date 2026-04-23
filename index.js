const express = require('express');
const cors = require('cors');
const path = require('path');
const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Better Auth and API Routes
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

// Fallback for SPA (Express 5-safe)
app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler — returns JSON so we can debug 500s on Vercel
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message, stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined });
});

// Start Server
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, HOST, () => {
        console.log(`🚀 AgendaGuru Modern Backend running at http://${HOST}:${PORT}`);
        console.log(`Using Database: ${process.env.TURSO_DATABASE_URL ? 'Turso DB' : 'Local SQLite'}`);
    });
}

module.exports = app;
