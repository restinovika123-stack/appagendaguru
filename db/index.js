const { drizzle } = require('drizzle-orm/libsql');
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const projectRoot = path.join(__dirname, '..');
const isVercel = Boolean(process.env.VERCEL);
const localDbFile = path.join(projectRoot, 'backend-data', 'agendaguru.sqlite');

function resolveDatabaseConfig() {
    const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
    const tursoAuthToken = process.env.TURSO_AUTH_TOKEN?.trim();

    if (tursoUrl) {
        return {
            mode: 'turso',
            url: tursoUrl,
            authToken: tursoAuthToken || undefined,
        };
    }

    if (!isVercel) {
        const localDbDir = path.dirname(localDbFile);
        if (!fs.existsSync(localDbDir)) {
            fs.mkdirSync(localDbDir, { recursive: true });
        }

        return {
            mode: 'sqlite',
            url: `file:${localDbFile}`,
            authToken: undefined,
        };
    }

    console.warn('TURSO_DATABASE_URL tidak ditemukan di Vercel. Menggunakan SQLite in-memory; data akan hilang saat instance berhenti.');
    return {
        mode: 'memory',
        url: 'file::memory:',
        authToken: undefined,
    };
}

const databaseConfig = resolveDatabaseConfig();
const client = createClient({
    url: databaseConfig.url,
    authToken: databaseConfig.authToken,
});
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
    databaseMode: databaseConfig.mode,
};
