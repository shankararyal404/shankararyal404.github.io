import { createClient } from '@libsql/client';

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { slug, name, content } = req.body;

    if (!slug || !name || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.execute({
            sql: 'INSERT INTO comments (blog_slug, user_name, content) VALUES (?, ?, ?)',
            args: [slug, name, content],
        });

        res.status(201).json({ message: 'Comment added successfully' });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
}
