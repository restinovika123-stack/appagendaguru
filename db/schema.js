const { sqliteTable, text, integer, primaryKey } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// --- Better Auth Tables ---

const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // Custom fields for AgendaGuru
  school: text('school'),
});

const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// --- AgendaGuru Application Tables ---

const classrooms = sqliteTable('classrooms', {
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  classId: text('classId').notNull(),
  className: text('className').notNull(),
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.classId] }),
}));

const students = sqliteTable('students', {
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  studentId: text('studentId').notNull(),
  classId: text('classId').notNull(),
  studentName: text('studentName').notNull(),
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.studentId] }),
}));

const attendanceSheets = sqliteTable('attendance_sheets', {
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  recordId: text('recordId').notNull(),
  classId: text('classId').notNull(),
  monthYear: text('monthYear').notNull(),
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.recordId] }),
}));

const attendanceSheetDates = sqliteTable('attendance_sheet_dates', {
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  recordId: text('recordId').notNull(),
  columnIndex: integer('columnIndex').notNull(),
  dateValue: text('dateValue'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.recordId, table.columnIndex] }),
}));

const attendanceSheetEntries = sqliteTable('attendance_sheet_entries', {
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  recordId: text('recordId').notNull(),
  studentId: text('studentId').notNull(),
  columnIndex: integer('columnIndex').notNull(),
  statusValue: text('statusValue').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.recordId, table.studentId, table.columnIndex] }),
}));

const gradeSheets = sqliteTable('grade_sheets', {
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  recordId: text('recordId').notNull(),
  classId: text('classId').notNull(),
  subject: text('subject').notNull(),
  gradeType: text('gradeType').notNull(),
  monthYear: text('monthYear'),
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.recordId] }),
}));

const gradeSheetColumns = sqliteTable('grade_sheet_columns', {
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  recordId: text('recordId').notNull(),
  columnIndex: integer('columnIndex').notNull(),
  dateValue: text('dateValue'),
  coverageText: text('coverageText'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.recordId, table.columnIndex] }),
}));

const gradeSheetEntries = sqliteTable('grade_sheet_entries', {
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  recordId: text('recordId').notNull(),
  studentId: text('studentId').notNull(),
  columnIndex: integer('columnIndex').notNull(),
  scoreText: text('scoreText'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.recordId, table.studentId, table.columnIndex] }),
}));

const kokuEntries = sqliteTable('koku_entries', {
  entryId: integer('entryId').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  studentName: text('studentName').notNull(),
  category: text('category').notNull(),
  narrative: text('narrative').notNull(),
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
});

const journalEntries = sqliteTable('journal_entries', {
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  recordId: text('recordId').notNull(),
  entryDate: text('entryDate').notNull(),
  classId: text('classId').notNull(),
  subject: text('subject').notNull(),
  content: text('content').notNull(),
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.recordId] }),
}));

const scheduleEntries = sqliteTable('schedule_entries', {
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  recordId: text('recordId').notNull(),
  dayName: text('dayName').notNull(),
  timeStart: text('timeStart').notNull(),
  timeEnd: text('timeEnd').notNull(),
  subject: text('subject').notNull(),
  classId: text('classId').notNull(),
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.recordId] }),
}));

module.exports = {
  user,
  session,
  account,
  verification,
  classrooms,
  students,
  attendanceSheets,
  attendanceSheetDates,
  attendanceSheetEntries,
  gradeSheets,
  gradeSheetColumns,
  gradeSheetEntries,
  kokuEntries,
  journalEntries,
  scheduleEntries,
};
