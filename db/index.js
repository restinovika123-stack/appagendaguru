const { drizzle } = require('drizzle-orm/libsql');
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const projectRoot = path.join(__dirname, '..');
const localDbFile = process.env.VERCEL
    ? '/tmp/agendaguru.sqlite'
    : path.join(projectRoot, 'backend-data', 'agendaguru.sqlite');

const url = process.env.TURSO_DATABASE_URL || `file:${localDbFile}`;
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });
const db = drizzle(client);

const migrationFiles = fs.existsSync(path.join(projectRoot, 'drizzle'))
    ? fs.readdirSync(path.join(projectRoot, 'drizzle'))
        .filter(name => name.endsWith('.sql'))
        .sort()
    : [];

let dbReady;

async function ensureDatabaseSchema() {
    if (dbReady) return dbReady;

    dbReady = (async () => {
        if (!process.env.TURSO_DATABASE_URL && process.env.VERCEL) {
            console.warn('TURSO_DATABASE_URL tidak ditemukan di Vercel. Fallback ke /tmp SQLite bersifat sementara dan tidak persisten.');
        }

        for (const fileName of migrationFiles) {
            const sqlPath = path.join(projectRoot, 'drizzle', fileName);
            const rawSql = fs.readFileSync(sqlPath, 'utf8');
            const statements = rawSql
                .split('--> statement-breakpoint')
                .map(statement => statement.trim())
                .filter(Boolean);

            for (const statement of statements) {
                try {
                    await client.execute(statement);
                } catch (error) {
                    const message = error?.message || '';
                    const isAlreadyExistsError =
                        message.includes('already exists') ||
                        message.includes('duplicate column name') ||
                        message.includes('has more than one primary key');

                    if (!isAlreadyExistsError) {
                        throw error;
                    }
                }
            }
        }
    })().catch(error => {
        dbReady = null;
        throw error;
    });

    return dbReady;
}

dbReady = ensureDatabaseSchema();
dbReady.catch(error => {
    console.error('Database bootstrap failed:', error.message);
});

module.exports = {
    db,
    client,
    dbReady,
};
