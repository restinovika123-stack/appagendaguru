require('dotenv').config();

/** @type { import("drizzle-kit").Config } */
module.exports = {
  schema: "./db/schema.js",
  out: "./drizzle",
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || "file:./backend-data/agendaguru.sqlite",
    authToken: process.env.TURSO_AUTH_TOKEN,
  }
};
