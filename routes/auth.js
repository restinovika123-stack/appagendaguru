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

        // session.user is the Better Auth user
        const [userData] = await db.select().from(schema.user).where(eq(schema.user.email, loginId)).limit(1);
        
        // Fetch DB data
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
                school: school // This works because of additionalFields in lib/auth.js
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

router.all('/*', async (req, res) => {
    const response = await auth.handler(req);
    // Better Auth handler returns a Response object (Web Standard)
    // We need to convert it to Express response
    res.status(response.status);
    response.headers.forEach((value, key) => {
        res.setHeader(key, value);
    });
    const body = await response.text();
    res.send(body);
});

module.exports = router;
