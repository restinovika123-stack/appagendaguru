const { betterAuth } = require("better-auth");
const { drizzleAdapter } = require("better-auth/adapters/drizzle");
const { db } = require("../db");
const schema = require("../db/schema");
require("dotenv").config();

const baseURL = process.env.BETTER_AUTH_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const auth = betterAuth({
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET || "fallback-dev-secret-change-in-prod",
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema: schema
    }),
    emailAndPassword: {
        enabled: true
    },
    user: {
        additionalFields: {
            school: {
                type: "string",
                required: false
            }
        }
    }
});

module.exports = { auth };
