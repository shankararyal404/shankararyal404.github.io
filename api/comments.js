import { db, query } from '../lib/db.js';

export default async function handler(req, res) {
    const { method } = req;
    const { post_slug } = req.query;

    if (method === 'GET') {
        if (!post_slug) {
            return res.status(400).json({ error: 'post_slug is required' });
        }

        try {
            // Fetch comments for the post
            const comments = await query(
                `SELECT c.*, 
                 (SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id AND r.reaction_type = '👍') as likes,
                 (SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id AND r.reaction_type = '❤️') as hearts,
                 (SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id AND r.reaction_type = '😂') as laughs,
                 (SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id AND r.reaction_type = '🫡') as salutes,
                 (SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id AND r.reaction_type = '🤯') as mindblown,
                 (SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id AND r.reaction_type = '😱') as scared,
                 (SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id AND r.reaction_type = '🎉') as celebrates,
                 (SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id AND r.reaction_type = '🚀') as rockets
                 FROM comments c 
                 WHERE c.post_slug = ? AND c.status = 'approved'
                 ORDER BY c.created_at ASC`,
                [post_slug]
            );

            return res.status(200).json(Array.isArray(comments) ? comments : []);
        } catch (error) {
            console.error('Fetch comments error detail:', {
                message: error.message,
                stack: error.stack,
                post_slug
            });
            return res.status(500).json({ error: 'Failed to fetch comments', details: error.message });
        }
    }

    if (method === 'POST') {
        const { action } = req.body;

        if (action === 'comment') {
            const { post_slug, author_name, author_email, content, parent_id, is_anonymous, auth_provider, author_avatar } = req.body;

            if (!post_slug || !content) {
                return res.status(400).json({ error: 'post_slug and content are required' });
            }

            try {
                const result = await db.execute({
                    sql: `INSERT INTO comments (post_slug, author_name, author_email, author_avatar, content, parent_id, is_anonymous, auth_provider) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [post_slug, author_name || 'Anonymous', author_email || '', author_avatar || '', content, parent_id || null, is_anonymous ? 1 : 0, auth_provider || 'none']
                });

                return res.status(201).json({ message: 'Comment posted successfully', id: result.lastInsertRowid });
            } catch (error) {
                console.error('Post comment error:', error);
                return res.status(500).json({ error: 'Failed to post comment' });
            }
        }

        if (action === 'react') {
            const { comment_id, user_id, reaction_type } = req.body;

            if (!comment_id || !user_id || !reaction_type) {
                return res.status(400).json({ error: 'comment_id, user_id, and reaction_type are required' });
            }

            try {
                // Upsert reaction (Unique constraint handles toggle logic or we can do it manually)
                // For simplicity, let's try to insert, if fails (unique), delete it (toggle off)
                try {
                    await db.execute({
                        sql: `INSERT INTO reactions (comment_id, user_id, reaction_type) VALUES (?, ?, ?)`,
                        args: [comment_id, user_id, reaction_type]
                    });
                    return res.status(200).json({ message: 'Reaction added' });
                } catch (e) {
                    if (e.message.includes('UNIQUE constraint failed')) {
                        await db.execute({
                            sql: `DELETE FROM reactions WHERE comment_id = ? AND user_id = ? AND reaction_type = ?`,
                            args: [comment_id, user_id, reaction_type]
                        });
                        return res.status(200).json({ message: 'Reaction removed' });
                    }
                    throw e;
                }
            } catch (error) {
                console.error('Reaction error:', error);
                return res.status(500).json({ error: 'Failed to update reaction' });
            }
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
