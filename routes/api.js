const express = require('express');
const { db } = require('../db');
const { eq, and } = require('drizzle-orm');
const schema = require('../db/schema');
const router = express.Router();

// Health Check
router.get('/health', (req, res) => res.json({ ok: true, engine: 'drizzle' }));

// Helper to load user DB
async function loadUserDb(userId) {
    const [userData] = await db.select().from(schema.user).where(eq(schema.user.id, userId)).limit(1);
    if (!userData) return null;

    const [
        classes,
        students,
        attendanceSheets,
        attendanceDates,
        attendanceEntries,
        gradeSheets,
        gradeColumns,
        gradeEntries,
        koku,
        journal,
        schedule
    ] = await Promise.all([
        db.select().from(schema.classrooms).where(eq(schema.classrooms.userId, userId)),
        db.select().from(schema.students).where(eq(schema.students.userId, userId)),
        db.select().from(schema.attendanceSheets).where(eq(schema.attendanceSheets.userId, userId)),
        db.select().from(schema.attendanceSheetDates).where(eq(schema.attendanceSheetDates.userId, userId)),
        db.select().from(schema.attendanceSheetEntries).where(eq(schema.attendanceSheetEntries.userId, userId)),
        db.select().from(schema.gradeSheets).where(eq(schema.gradeSheets.userId, userId)),
        db.select().from(schema.gradeSheetColumns).where(eq(schema.gradeSheetColumns.userId, userId)),
        db.select().from(schema.gradeSheetEntries).where(eq(schema.gradeSheetEntries.userId, userId)),
        db.select().from(schema.kokuEntries).where(eq(schema.kokuEntries.userId, userId)),
        db.select().from(schema.journalEntries).where(eq(schema.journalEntries.userId, userId)),
        db.select().from(schema.scheduleEntries).where(eq(schema.scheduleEntries.userId, userId)),
    ]);

    // Map to Frontend Format
    const result = {
        classes: classes.map(c => ({ ClassID: c.classId, ClassName: c.className })),
        students: students.map(s => ({ StudentID: s.studentId, ClassID: s.classId, StudentName: s.studentName })),
        attendance: attendanceSheets.map(sh => {
            const dates = attendanceDates.filter(d => d.recordId === sh.recordId)
                .sort((a, b) => a.columnIndex - b.columnIndex)
                .map(d => d.dateValue || '');
            
            const entries = {};
            attendanceEntries.filter(e => e.recordId === sh.recordId).forEach(e => {
                if (!entries[e.studentId]) entries[e.studentId] = [];
                entries[e.studentId][e.columnIndex] = e.statusValue;
            });

            return {
                RecordID: sh.recordId,
                ClassID: sh.classId,
                MonthYear: sh.monthYear,
                DatesData: JSON.stringify(dates),
                AttendanceData: JSON.stringify(entries)
            };
        }),
        grades: gradeSheets.map(sh => {
            const cols = gradeColumns.filter(c => c.recordId === sh.recordId).sort((a, b) => a.columnIndex - b.columnIndex);
            const dates = cols.map(c => c.dateValue || '');
            const cakupan = cols.map(c => c.coverageText || '');

            const entries = {};
            gradeEntries.filter(e => e.recordId === sh.recordId).forEach(e => {
                if (!entries[e.studentId]) entries[e.studentId] = [];
                entries[e.studentId][e.columnIndex] = e.scoreText || '';
            });

            return {
                RecordID: sh.recordId,
                ClassID: sh.classId,
                Subject: sh.subject,
                Type: sh.gradeType,
                MonthYear: sh.monthYear,
                DatesData: JSON.stringify(dates),
                Cakupan: JSON.stringify(cakupan),
                GradesData: JSON.stringify(entries)
            };
        }),
        koku: koku.map(k => ({ Siswa: k.studentName, Kategori: k.category, Narasi: k.narrative })),
        journal: journal.map(j => ({ RecordID: j.recordId, Date: j.entryDate, ClassID: j.classId, Subject: j.subject, Content: j.content })),
        schedule: schedule.map(s => ({ RecordID: s.recordId, Day: s.dayName, TimeStart: s.timeStart, TimeEnd: s.timeEnd, Subject: s.subject, ClassID: s.classId })),
        config: {
            userName: userData.name,
            userSchool: userData.school || 'Sekolah',
            userPhoto: userData.image || ''
        }
    };

    return result;
}

router.get('/users/:userId/db', async (req, res) => {
    try {
        const dbData = await loadUserDb(req.params.userId);
        if (!dbData) return res.status(404).json({ message: 'User not found' });
        res.json({ db: dbData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update user database
router.put('/users/:userId/db', async (req, res) => {
    const { userId } = req.params;
    const { db: userDb } = req.body;

    if (!userDb) return res.status(400).json({ error: 'Database object missing' });

    try {
        await db.transaction(async (tx) => {
            // Update Profile if and only if config is provided
            if (userDb.config) {
                await tx.update(schema.user)
                    .set({
                        name: userDb.config.userName,
                        school: userDb.config.userSchool,
                        image: userDb.config.userPhoto,
                        updatedAt: new Date()
                    })
                    .where(eq(schema.user.id, userId));
            }

            // Delete existing data to sync
            await tx.delete(schema.classrooms).where(eq(schema.classrooms.userId, userId));
            await tx.delete(schema.students).where(eq(schema.students.userId, userId));
            await tx.delete(schema.attendanceSheets).where(eq(schema.attendanceSheets.userId, userId));
            await tx.delete(schema.attendanceSheetDates).where(eq(schema.attendanceSheetDates.userId, userId));
            await tx.delete(schema.attendanceSheetEntries).where(eq(schema.attendanceSheetEntries.userId, userId));
            await tx.delete(schema.gradeSheets).where(eq(schema.gradeSheets.userId, userId));
            await tx.delete(schema.gradeSheetColumns).where(eq(schema.gradeSheetColumns.userId, userId));
            await tx.delete(schema.gradeSheetEntries).where(eq(schema.gradeSheetEntries.userId, userId));
            await tx.delete(schema.kokuEntries).where(eq(schema.kokuEntries.userId, userId));
            await tx.delete(schema.journalEntries).where(eq(schema.journalEntries.userId, userId));
            await tx.delete(schema.scheduleEntries).where(eq(schema.scheduleEntries.userId, userId));

            // Re-insert Classes
            if (userDb.classes?.length) {
                await tx.insert(schema.classrooms).values(userDb.classes.map(c => ({
                    userId,
                    classId: c.ClassID,
                    className: c.ClassName
                })));
            }

            // Re-insert Students
            if (userDb.students?.length) {
                await tx.insert(schema.students).values(userDb.students.map(s => ({
                    userId,
                    studentId: s.StudentID,
                    classId: s.ClassID,
                    studentName: s.StudentName
                })));
            }

            // Re-insert Attendance Sheets and related tables
            for (const sheet of userDb.attendance || []) {
                await tx.insert(schema.attendanceSheets).values({
                    userId,
                    recordId: sheet.RecordID,
                    classId: sheet.ClassID,
                    monthYear: sheet.MonthYear
                });

                const dates = JSON.parse(sheet.DatesData || '[]');
                if (dates.length) {
                    await tx.insert(schema.attendanceSheetDates).values(dates.map((d, i) => ({
                        userId,
                        recordId: sheet.RecordID,
                        columnIndex: i,
                        dateValue: d
                    })));
                }

                const attData = JSON.parse(sheet.AttendanceData || '{}');
                const entries = [];
                for (const [sid, values] of Object.entries(attData)) {
                    values.forEach((v, i) => {
                        entries.push({
                            userId,
                            recordId: sheet.RecordID,
                            studentId: sid,
                            columnIndex: i,
                            statusValue: v || '-'
                        });
                    });
                }
                if (entries.length) {
                    await tx.insert(schema.attendanceSheetEntries).values(entries);
                }
            }

            // Re-insert Grade Sheets
            for (const sheet of userDb.grades || []) {
                await tx.insert(schema.gradeSheets).values({
                    userId,
                    recordId: sheet.RecordID,
                    classId: sheet.ClassID,
                    subject: sheet.Subject,
                    gradeType: sheet.Type,
                    monthYear: sheet.MonthYear
                });

                const dates = JSON.parse(sheet.DatesData || '[]');
                const cakupan = JSON.parse(sheet.Cakupan || '[]');
                const maxCols = Math.max(dates.length, cakupan.length);
                if (maxCols > 0) {
                    const cols = [];
                    for (let i = 0; i < maxCols; i++) {
                        cols.push({
                            userId,
                            recordId: sheet.RecordID,
                            columnIndex: i,
                            dateValue: dates[i] || null,
                            coverageText: cakupan[i] || null
                        });
                    }
                    await tx.insert(schema.gradeSheetColumns).values(cols);
                }

                const gradesData = JSON.parse(sheet.GradesData || '{}');
                const entries = [];
                for (const [sid, values] of Object.entries(gradesData)) {
                    values.forEach((v, i) => {
                        entries.push({
                            userId,
                            recordId: sheet.RecordID,
                            studentId: sid,
                            columnIndex: i,
                            scoreText: v || ''
                        });
                    });
                }
                if (entries.length) {
                    await tx.insert(schema.gradeSheetEntries).values(entries);
                }
            }

            // Re-insert Koku
            if (userDb.koku?.length) {
                await tx.insert(schema.kokuEntries).values(userDb.koku.map(k => ({
                    userId,
                    studentName: k.Siswa,
                    category: k.Kategori,
                    narrative: k.Narasi
                })));
            }

            // Re-insert Journal
            if (userDb.journal?.length) {
                await tx.insert(schema.journalEntries).values(userDb.journal.map(j => ({
                    userId,
                    recordId: j.RecordID,
                    entryDate: j.Date,
                    classId: j.ClassID,
                    subject: j.Subject,
                    content: j.Content
                })));
            }

            // Re-insert Schedule
            if (userDb.schedule?.length) {
                await tx.insert(schema.scheduleEntries).values(userDb.schedule.map(s => ({
                    userId,
                    recordId: s.RecordID,
                    dayName: s.Day,
                    timeStart: s.TimeStart,
                    timeEnd: s.TimeEnd,
                    subject: s.Subject,
                    classId: s.ClassID
                })));
            }
        });

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Update profile
router.put('/users/:userId/profile', async (req, res) => {
    const { userId } = req.params;
    const { fullName, school, userPhoto } = req.body;

    try {
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
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
