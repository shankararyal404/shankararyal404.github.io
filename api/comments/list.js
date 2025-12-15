import { createClient } from '@libsql/client';

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
    const { slug } = req.query;

    if (!slug) {
        return res.status(400).json({ error: 'Blog slug is required' });
    }

    try {
        const result = await db.execute({
            sql: 'SELECT * FROM comments WHERE blog_slug = ? ORDER BY created_at DESC',
            args: [slug],
        });

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching comments:', error);
        // Return empty array on error (e.g. table not exists yet) to avoid breaking frontend
        res.status(200).json([]);
    }
}
