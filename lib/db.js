import { createClient } from "@libsql/client";

// Cleanse Turso URL: Ensure it uses libsql:// protocol and remove trailing slash
let dbUrl = process.env.TURSO_DATABASE_URL?.replace(/\/$/, "");
if (dbUrl && dbUrl.startsWith("https://")) {
    dbUrl = dbUrl.replace("https://", "libsql://");
}

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
