import { query } from '../lib/db.js';

export default async function handler(req, res) {
    const { slug } = req.query;

    if (!slug) {
        return res.status(400).json({ message: 'Slug required' });
    }

    try {
        if (req.method === 'GET') {
            // LIST comments for a blog
            const comments = await query(
                'SELECT * FROM comments WHERE blog_slug = ? ORDER BY created_at DESC',
                [slug]
            );
            return res.status(200).json(comments);

        } else if (req.method === 'POST') {
            // CREATE comment
            const { name, content } = req.body;

            if (!name || !content) {
                return res.status(400).json({ message: 'Name and content required' });
            }

            await query(
                'INSERT INTO comments (blog_slug, user_name, content) VALUES (?, ?, ?)',
                [slug, name, content]
            );

            return res.status(201).json({ message: 'Comment posted' });

        } else {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process comment request' });
    }
}
