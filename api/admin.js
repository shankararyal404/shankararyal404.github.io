import { getFile, saveFile, updateJsonFile } from '../lib/github.js';
import { db, query, querySubscriber } from '../lib/db.js';
import { isAuthenticated } from '../lib/auth.js';
import { EMAIL_ADDRESSES } from '../lib/mail.js';
import { env } from '../lib/env-config.js';
import nodemailer from 'nodemailer';
import matter from 'gray-matter';

export default async function handler(req, res) {
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

    try {
        // --- READ (GET) ---
        if (req.method === 'GET') {
            const { type: queryType, post_slug, status: commentStatus } = req.query;

            if (!queryType) return res.status(400).json({ message: 'Type required' });

            // 1. JSON Collections (GitHub-backed)
            if (['hero', 'about', 'skills', 'education', 'certificates', 'projects', 'technologies', 'social-links'].includes(queryType)) {
                const filePath = `content/${queryType}.json`;
                const file = await getFile(filePath);
                if (!file) return res.json([]);
                return res.json(JSON.parse(file.content));
            }

            // 2. Comments (Turso-backed)
            if (queryType === 'comments') {
                let sql = `SELECT * FROM comments`;
                const args = [];
                if (post_slug || commentStatus) {
                    sql += ` WHERE`;
                    if (post_slug) { sql += ` post_slug = ?`; args.push(post_slug); }
                    if (commentStatus) {
                        if (post_slug) sql += ` AND`;
                        sql += ` status = ?`; args.push(commentStatus);
                    }
                }
                sql += ` ORDER BY created_at DESC`;
                const comments = await query(sql, args);
                return res.status(200).json(comments);
            }

            return res.status(400).json({ message: 'Invalid type for GET' });
        }

        // --- CREATE (POST) ---
        if (req.method === 'POST') {
            const { type, action, slug, data, post_slug, content, parent_id } = req.body || {};

            // 1. Blog Post creation (GitHub)
            if (type === 'blog') {
                if (action !== 'create') return res.status(400).json({ message: 'Invalid action' });
                const metadata = { ...data }; delete metadata.content;
                const frontmatter = { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], published: true, subdirectory: 'blog-post', ...metadata };
                if (data.image) { frontmatter.cover = data.image; delete frontmatter.image; }
                const fileContent = matter.stringify(data.content || '', frontmatter);
                const filePath = `content/blogs/${data.slug}.md`;
                await saveFile(filePath, fileContent, `Create blog: ${data.title}`);
                return res.status(201).json({ message: 'Blog created' });
            }

            // 2. JSON Collections (GitHub)
            if (['projects', 'certificates', 'education', 'skills', 'social-links'].includes(type)) {
                const filePath = `content/${type}.json`;
                const newItem = { id: Date.now().toString(), ...req.body, published: true }; delete newItem.type;
                await updateJsonFile(filePath, (currentData) => {
                    if (!Array.isArray(currentData)) return [newItem];
                    return [...currentData, newItem];
                }, `Add ${type} item`);
                return res.status(201).json({ message: 'Item created', item: newItem });
            }

            // 3. Admin Comment Reply (Turso)
            if (type === 'comments' && action === 'reply') {
                const result = await db.execute({
                    sql: `INSERT INTO comments (post_slug, author_name, author_email, content, parent_id, is_admin, status) VALUES (?, ?, ?, ?, ?, 1, 'approved')`,
                    args: [post_slug, 'Shankar', EMAIL_ADDRESSES.admin, content, parent_id]
                });
                return res.status(201).json({ message: 'Reply posted', id: result.lastInsertRowid?.toString() });
            }

            // 4. Send Blog Notifications (Subscriber DB)
            if (type === 'notify') {
                const { slug, title, excerpt, image } = req.body;
                if (!slug || !title) return res.status(400).json({ message: 'Missing blog details' });

                // Check if already notified
                const notified = await querySubscriber('SELECT * FROM blog_notifications WHERE slug = ?', [slug]);
                if (notified.length > 0) return res.status(409).json({ message: 'Notification already sent' });

                // Get Subscribers
                const subscribers = await querySubscriber('SELECT email FROM subscribers WHERE is_verified = 1 AND unsubscribed_at IS NULL');
                if (subscribers.length === 0) return res.status(200).json({ message: 'No subscribers' });

                const siteUrl = process.env.SITE_URL || 'https://www.shankararyal404.com.np';
                const blogUrl = `${siteUrl}/${slug.includes('/') ? slug : 'blogs/' + slug + '.html'}`;
                const transporter = nodemailer.createTransport(env.email.smtp);

                let sentCount = 0;
                for (const sub of subscribers) {
                    const unsubLink = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(sub.email)}`;
                    try {
                        await transporter.sendMail({
                            from: env.email.noReply || 'no-reply@shankararyal404.com.np',
                            to: sub.email,
                            subject: `New Blog: ${title}`,
                            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                ${image ? `<img src="${image.startsWith('http') ? image : siteUrl + image}" alt="${title}" style="width:100%; border-radius: 8px;">` : ''}
                                <h2>${title}</h2>
                                <p>${excerpt || 'Check out my new blog post!'}</p>
                                <p style="text-align: center; margin: 30px 0;"><a href="${blogUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Read More</a></p>
                                <hr><p style="font-size: 12px; color: #666;">You are receiving this because you subscribed. <a href="${unsubLink}">Unsubscribe</a></p>
                            </div>`
                        });
                        sentCount++;
                    } catch (e) { console.error(`Failed to email ${sub.email}`, e); }
                }

                await querySubscriber('INSERT INTO blog_notifications (slug, subscriber_count) VALUES (?, ?)', [slug, sentCount]);
                return res.status(200).json({ message: `Sent ${sentCount} emails` });
            }

            return res.status(400).json({ message: 'Unsupported type for POST' });
        }

        // --- UPDATE (PUT/PATCH) ---
        else if (req.method === 'PUT' || req.method === 'PATCH') {
            const { type, slug, data, id, status } = req.body || {};

            // 1. Blog Update (GitHub)
            if (type === 'blog') {
                const filePath = `content/blogs/${slug}.md`;
                const existing = await getFile(filePath);
                if (!existing) return res.status(404).json({ message: 'Blog not found' });
                const doc = matter(existing.content);
                const metadata = { ...data }; delete metadata.content;
                const newFM = { ...doc.data, ...metadata };
                if (data.image) newFM.cover = data.image;
                const content = matter.stringify(data.content || doc.content, newFM);
                await saveFile(filePath, content, `Update blog: ${slug}`, existing.sha);
                return res.status(200).json({ message: 'Blog updated' });
            }

            // 2. JSON Collections (GitHub)
            if (['hero', 'about', 'skills', 'education', 'certificates', 'projects', 'technologies', 'social-links'].includes(type)) {
                await updateJsonFile(`content/${type}.json`, (cur) => {
                    if (data && Array.isArray(data)) return data;
                    if (id && Array.isArray(cur)) {
                        const idx = cur.findIndex(i => i.id == id);
                        if (idx !== -1) { const payload = { ...req.body }; delete payload.type; delete payload.id; cur[idx] = { ...cur[idx], ...payload }; }
                        return cur;
                    }
                    return { ...cur, ...data };
                }, `Update ${type}`);
                return res.status(200).json({ message: 'Content updated' });
            }

            // 3. Comment Status Update (Turso)
            if (type === 'comments' && status) {
                await db.execute({ sql: `UPDATE comments SET status = ? WHERE id = ?`, args: [status, id] });
                return res.status(200).json({ message: 'Comment updated' });
            }

            return res.status(400).json({ message: 'Unsupported type for update' });
        }

        // --- DELETE (DELETE) ---
        else if (req.method === 'DELETE') {
            const { type, slug, id, force } = req.body || {};

            // 1. Blog Delete (GitHub)
            if (type === 'blog') {
                const path = `content/blogs/${slug}.md`;
                const file = await getFile(path);
                if (!file) return res.status(404).json({ message: 'Not found' });
                if (force) {
                    const { deleteFile } = await import('../lib/github.js');
                    await deleteFile(path, `Permanent delete: ${slug}`, file.sha);
                    return res.status(200).json({ message: 'Deleted' });
                }
                const doc = matter(file.content); doc.data.published = false;
                await saveFile(path, matter.stringify(doc.content, doc.data), `Unpublish: ${slug}`, file.sha);
                return res.status(200).json({ message: 'Unpublished' });
            }

            // 2. JSON Collections (GitHub)
            if (['projects', 'certificates', 'education', 'skills', 'social-links'].includes(type)) {
                await updateJsonFile(`content/${type}.json`, (cur) => {
                    if (!Array.isArray(cur)) return cur;
                    if (force) return cur.filter(i => i.id != id);
                    return cur.map(i => i.id == id ? { ...i, published: false } : i);
                }, `Delete/unpublish ${type}`);
                return res.status(200).json({ message: 'Item processed' });
            }

            // 3. Comment Delete (Turso) - Recursive
            if (type === 'comments') {
                const commentId = id || req.query.id;

                // Use Recursive CTE to delete entire thread (parent + all descendants)
                await db.execute({
                    sql: `
                        WITH RECURSIVE thread(id) AS (
                            SELECT id FROM comments WHERE id = ?
                            UNION ALL
                            SELECT c.id FROM comments c
                            JOIN thread t ON c.parent_id = t.id
                        )
                        DELETE FROM comments WHERE id IN (SELECT id FROM thread)
                    `,
                    args: [commentId]
                });

                return res.status(200).json({ message: 'Deleted comment and replies' });
            }

            return res.status(400).json({ message: 'Unsupported type for delete' });
        }

        return res.status(405).json({ message: 'Method Not Allowed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
