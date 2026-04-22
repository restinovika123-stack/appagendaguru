const { drizzle } = require('drizzle-orm/libsql');
const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const url = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, '../backend-data/agendaguru.sqlite')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });
const db = drizzle(client);

module.exports = { db, client };
