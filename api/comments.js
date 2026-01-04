import { db, query } from '../lib/db.js';

export default async function handler(req, res) {
    const { method } = req;
    const { post_slug } = req.query;

    if (method === 'GET') {
        if (!post_slug) {
            return res.status(400).json({ error: 'post_slug is required' });
        }

        try {
            // 1. Fetch comments with their reactions
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

            // 2. Fetch Post Stats (Views)
            const stats = await query(`SELECT view_count FROM post_stats WHERE post_slug = ?`, [post_slug]);
            const viewCount = stats.length > 0 ? stats[0].view_count : 0;

            // 3. Fetch Post Reactions
            const postReactions = await query(
                `SELECT reaction_type, COUNT(*) as count 
                 FROM reactions 
                 WHERE post_slug = ? AND comment_id IS NULL 
                 GROUP BY reaction_type`,
                [post_slug]
            );

            return res.status(200).json({
                comments: Array.isArray(comments) ? comments : [],
                stats: {
                    views: viewCount,
                    reactions: postReactions || []
                }
            });
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

        // --- View Count Action ---
        if (action === 'view') {
            const { post_slug } = req.body;
            if (!post_slug) return res.status(400).json({ error: 'post_slug required' });

            try {
                // Upsert view count
                await db.execute({
                    sql: `INSERT INTO post_stats (post_slug, view_count) VALUES (?, 1) 
                          ON CONFLICT(post_slug) DO UPDATE SET view_count = view_count + 1`,
                    args: [post_slug]
                });
                return res.status(200).json({ message: 'View tracked' });
            } catch (error) {
                console.error('View track error:', error);
                return res.status(500).json({ error: 'Failed to track view' });
            }
        }

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

                // Fix: BigInt serialization error
                const insertId = result.lastInsertRowid ? result.lastInsertRowid.toString() : null;

                return res.status(201).json({
                    message: 'Comment posted successfully',
                    id: insertId
                });
            } catch (error) {
                console.error('Post comment error detail:', {
                    message: error.message,
                    stack: error.stack
                });
                return res.status(500).json({ error: 'Failed to post comment', details: error.message });
            }
        }

        if (action === 'react') {
            const { comment_id, post_slug, user_id, reaction_type } = req.body;

            if ((!comment_id && !post_slug) || !user_id || !reaction_type) {
                return res.status(400).json({ error: 'comment_id or post_slug, user_id, and reaction_type are required' });
            }

            try {
                // Toggle reaction logic
                // Check if exists
                const existing = await query(
                    `SELECT id FROM reactions WHERE user_id = ? AND reaction_type = ? AND 
                     ${comment_id ? 'comment_id = ?' : 'post_slug = ? AND comment_id IS NULL'}`,
                    [user_id, reaction_type, comment_id || post_slug]
                );

                if (existing.length > 0) {
                    await db.execute({
                        sql: `DELETE FROM reactions WHERE id = ?`,
                        args: [existing[0].id]
                    });
                    return res.status(200).json({ message: 'Reaction removed' });
                } else {
                    await db.execute({
                        sql: `INSERT INTO reactions (comment_id, post_slug, user_id, reaction_type) VALUES (?, ?, ?, ?)`,
                        args: [comment_id || null, comment_id ? null : post_slug, user_id, reaction_type]
                    });
                    return res.status(200).json({ message: 'Reaction added' });
                }
            } catch (error) {
                console.error('Reaction error:', error);
                return res.status(500).json({ error: 'Failed to update reaction' });
            }
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
