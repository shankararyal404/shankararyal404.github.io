import { createClient } from "@libsql/client";

// Cleanse Turso URL (remove trailing slash)
const dbUrl = process.env.TURSO_DATABASE_URL?.replace(/\/$/, "");

export const db = createClient({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export const query = async (sql, args = []) => {
    try {
        const result = await db.execute({ sql, args });
        return result.rows || [];
    } catch (error) {
        console.error(`Database Query Error: ${error.message}`, { sql, args });
        throw error;
    }
};
