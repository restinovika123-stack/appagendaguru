const express = require('express');
const { db, dbReady } = require('../db');
const { eq } = require('drizzle-orm');
const schema = require('../db/schema');
const { loadUserDb, syncUserDb } = require('../lib/user-db');

const router = express.Router();

router.get('/health', async (req, res) => {
    try {
        await dbReady;
        res.json({ ok: true, engine: 'drizzle', database: process.env.TURSO_DATABASE_URL ? 'turso' : 'sqlite' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/users/:userId/db', async (req, res) => {
    try {
        const dbData = await loadUserDb(req.params.userId);
        if (!dbData) return res.status(404).json({ message: 'User not found' });
        res.json({ db: dbData });
    } catch (err) {
        console.error('Load user DB error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.put('/users/:userId/db', async (req, res) => {
    const { userId } = req.params;
    const { db: userDb } = req.body;

    if (!userDb) return res.status(400).json({ error: 'Database object missing' });

    try {
        await syncUserDb(userId, userDb);
        res.json({ ok: true });
    } catch (err) {
        console.error('Sync user DB error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.put('/users/:userId/profile', async (req, res) => {
    const { userId } = req.params;
    const { fullName, school, userPhoto } = req.body;

    try {
        await dbReady;

        await db.update(schema.user)
            .set({ name: fullName, school: school, image: userPhoto, updatedAt: new Date() })
            .where(eq(schema.user.id, userId));

        const [updated] = await db.select().from(schema.user).where(eq(schema.user.id, userId)).limit(1);
        res.json({
            user: {
                UserID: updated.id,
                FullName: updated.name,
                School: updated.school,
                LoginID: updated.email,
                UserPhoto: updated.image || ''
            }
        });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
