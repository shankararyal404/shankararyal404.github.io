import { db, query } from '../../lib/db.js';
import { isAuthenticated } from '../../lib/auth.js';

export default async function handler(req, res) {
    if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    if (method === 'GET') {
        const { post_slug, status } = req.query;
        let sql = `SELECT * FROM comments`;
        const args = [];

        if (post_slug || status) {
            sql += ` WHERE`;
            if (post_slug) {
                sql += ` post_slug = ?`;
                args.push(post_slug);
            }
            if (status) {
                if (post_slug) sql += ` AND`;
                sql += ` status = ?`;
                args.push(status);
            }
        }
        sql += ` ORDER BY created_at DESC`;

        try {
            const comments = await query(sql, args);
            return res.status(200).json(comments);
        } catch (error) {
            console.error('Fetch all comments error:', error);
            return res.status(500).json({ error: 'Failed to fetch comments' });
        }
    }

    if (method === 'POST') {
        const { post_slug, content, parent_id } = req.body;

        if (!post_slug || !content || !parent_id) {
            return res.status(400).json({ error: 'post_slug, content, and parent_id are required' });
        }

        try {
            const result = await db.execute({
                sql: `INSERT INTO comments (post_slug, author_name, author_email, content, parent_id, is_admin, status) 
                      VALUES (?, ?, ?, ?, ?, 1, 'approved')`,
                args: [post_slug, 'Admin', 'admin@shankararyal404.com.np', content, parent_id]
            });

            const insertId = result.lastInsertRowid ? result.lastInsertRowid.toString() : null;

            return res.status(201).json({
                message: 'Admin reply posted',
                id: insertId
            });
        } catch (error) {
            console.error('Post admin reply error:', error);
            return res.status(500).json({ error: 'Failed to post admin reply', details: error.message });
        }
    }

    if (method === 'PATCH') {
        const { id, status } = req.body;

        if (!id || !status) {
            return res.status(400).json({ error: 'id and status are required' });
        }

        try {
            await db.execute({
                sql: `UPDATE comments SET status = ? WHERE id = ?`,
                args: [status, id]
            });
            return res.status(200).json({ message: 'Comment updated' });
        } catch (error) {
            console.error('Update comment status error:', error);
            return res.status(500).json({ error: 'Failed to update comment' });
        }
    }

    if (method === 'DELETE') {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'id is required' });
        }

        try {
            await db.execute({
                sql: `DELETE FROM comments WHERE id = ? OR parent_id = ?`,
                args: [id, id]
            });
            return res.status(200).json({ message: 'Comment and replies deleted' });
        } catch (error) {
            console.error('Delete comment error:', error);
            return res.status(500).json({ error: 'Failed to delete comment' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
