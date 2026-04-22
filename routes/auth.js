const express = require('express');
const { auth } = require('../lib/auth');
const { db } = require('../db');
const schema = require('../db/schema');
const { eq } = require('drizzle-orm');
const router = express.Router();

// Compatibility Wrapper for Login
router.post('/login', async (req, res) => {
    const { loginId, password } = req.body;
    try {
        const session = await auth.api.signInEmail({
            body: {
                email: loginId,
                password: password
            }
        });

        const [userData] = await db.select().from(schema.user).where(eq(schema.user.email, loginId)).limit(1);
        
        const { db: userDb } = await fetch(`${req.protocol}://${req.get('host')}/api/users/${encodeURIComponent(userData.id)}/db`).then(r => r.json());

        res.json({
            user: {
                UserID: userData.id,
                FullName: userData.name,
                School: userData.school,
                LoginID: userData.email,
                UserPhoto: userData.image || ''
            },
            db: userDb
        });
    } catch (err) {
        res.status(401).json({ message: 'Login ID atau password salah atau terjadi kesalahan.' });
    }
});

// Compatibility Wrapper for Register
router.post('/register', async (req, res) => {
    const { fullName, school, loginId, password } = req.body;
    try {
        const user = await auth.api.signUpEmail({
            body: {
                email: loginId,
                password: password,
                name: fullName,
                school: school
            }
        });

        res.status(201).json({
            user: {
                UserID: user.user.id,
                FullName: user.user.name,
                School: user.user.school,
                LoginID: user.user.email,
                UserPhoto: user.user.image || ''
            },
            db: {
                classes: [], students: [], attendance: [], grades: [],
                koku: [], journal: [], schedule: [],
                config: { userName: fullName, userSchool: school, userPhoto: '' }
            }
        });
    } catch (err) {
        res.status(400).json({ message: err.message || 'Pendaftaran gagal.' });
    }
});

// Better Auth native handler — convert Express req → Web Request → Web Response → Express res
router.all('/*', async (req, res) => {
    try {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const url = `${protocol}://${host}${req.originalUrl}`;

        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
            if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        }

        const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
        const body = hasBody ? JSON.stringify(req.body) : undefined;

        const webRequest = new Request(url, {
            method: req.method,
            headers,
            body
        });

        const response = await auth.handler(webRequest);

        res.status(response.status);
        response.headers.forEach((value, key) => res.setHeader(key, value));
        const text = await response.text();
        res.send(text);
    } catch (err) {
        console.error('Auth handler error:', err);
        res.status(500).json({ error: 'Auth handler failed', detail: err.message });
    }
});

module.exports = router;
