const { betterAuth } = require("better-auth");
const { drizzleAdapter } = require("better-auth/adapters/drizzle");
const { db } = require("../db");
const schema = require("../db/schema");

const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema: schema
    }),
    emailAndPassword: {
        enabled: true
    },
    // Optional: Add more fields to user
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
