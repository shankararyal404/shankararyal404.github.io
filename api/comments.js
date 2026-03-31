import { db, query } from '../lib/db.js';
import {
    checkRateLimit,
    sanitizeComment,
    detectSpam,
    validateAuthorName
} from '../lib/security.js';
import { verifyCsrfToken, parseCookies } from '../lib/csrf.js';
import { cache } from '../lib/cache.js';
import { setCorsHeaders } from '../lib/cors.js';
import { validateEmail, validateContentLength } from '../lib/validation.js';
import { verifyToken, isAuthenticated } from '../lib/auth.js';
import { logRateLimitEvent, logCsrfEvent, logSpamEvent, logBlockedIpEvent } from '../lib/logger.js';
import { captureException } from '../lib/sentry.js';
import { EMAIL_ADDRESSES } from '../lib/mail.js';

export default async function handler(req, res) {
    const { method } = req;
    const { post_slug } = req.query;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Set CORS headers (read-only for GET, restricted for POST)
    if (method === 'GET') {
        setCorsHeaders(req, res, { methods: ['GET'] });
    } else {
        setCorsHeaders(req, res, { methods: ['POST', 'OPTIONS'] });
    }

    // Handle preflight
    if (method === 'OPTIONS') {
        return res.status(204).end();
    }

    // Request size limit (10KB for comments)
    if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 10000) {
        return res.status(413).json({ error: 'Request too large' });
    }

    // --- GET Comments ---
    if (method === 'GET') {
        if (!post_slug) {
            return res.status(400).json({ error: 'post_slug is required' });
        }

        try {
            // Check cache first (1 minute TTL)
            const cacheKey = `comments-${post_slug}`;
            const cached = cache.get(cacheKey);

            if (cached) {
                return res.status(200).json(cached);
            }

            // 1. Fetch comments with reactions using JOIN (optimized - single query)
            const comments = await query(
                `SELECT c.id, c.post_slug, c.author_name, c.author_email, c.author_avatar, 
                 c.content, c.parent_id, c.is_admin, c.auth_provider,
                 c.status, c.created_at, c.user_agent, c.ip_address,
                 COUNT(CASE WHEN r.reaction_type = '👍' THEN 1 END) as likes,
                 COUNT(CASE WHEN r.reaction_type = '❤️' THEN 1 END) as hearts,
                 COUNT(CASE WHEN r.reaction_type = '😂' THEN 1 END) as laughs,
                 COUNT(CASE WHEN r.reaction_type = '🫡' THEN 1 END) as salutes,
                 COUNT(CASE WHEN r.reaction_type = '🤯' THEN 1 END) as mindblown,
                 COUNT(CASE WHEN r.reaction_type = '😱' THEN 1 END) as scared,
                 COUNT(CASE WHEN r.reaction_type = '🎉' THEN 1 END) as celebrates,
                 COUNT(CASE WHEN r.reaction_type = '🚀' THEN 1 END) as rockets
                 FROM comments c 
                 LEFT JOIN reactions r ON r.comment_id = c.id
                 WHERE c.post_slug = ? AND c.status = 'approved'
                 GROUP BY c.id, c.post_slug, c.author_name, c.author_email, c.author_avatar, 
                          c.content, c.parent_id, c.is_admin, c.auth_provider,
                          c.status, c.created_at, c.user_agent, c.ip_address
                 ORDER BY c.created_at ASC`,
                [post_slug]
            );

            // 2. Fetch Post Reactions
            const postReactions = await query(
                `SELECT reaction_type, COUNT(*) as count 
                 FROM reactions 
                 WHERE post_slug = ? AND comment_id IS NULL 
                 GROUP BY reaction_type`,
                [post_slug]
            );


            const response = {
                comments: Array.isArray(comments) ? comments : [],
                stats: {
                    reactions: postReactions || [],
                    postReactions: (postReactions || []).reduce((acc, r) => {
                        acc[r.reaction_type] = r.count;
                        return acc;
                    }, {})
                }
            };

            // Cache the response for 1 minute
            cache.set(cacheKey, response, 60000);

            return res.status(200).json(response);
        } catch (error) {
            captureException(error, {
                tags: { endpoint: '/api/comments', method: 'GET' },
                extra: { post_slug, ip }
            });
            console.error('Fetch comments error detail:', {
                message: error.message,
                stack: error.stack,
                post_slug
            });
            return res.status(500).json({ error: 'Failed to fetch comments', details: error.message });
        }
    }

    // --- POST Actions ---
    if (method === 'POST') {
        const { action } = req.body;

        // 1. Check IP Blocklist for all POST actions
        try {
            const blocked = await query('SELECT ip FROM ip_blocklist WHERE ip = ?', [ip]);
            if (blocked.length > 0) {
                logBlockedIpEvent(ip, '/api/comments', { action, userAgent: req.headers['user-agent'] });
                return res.status(403).json({ error: 'Access denied. Your IP is blocked.' });
            }
        } catch (e) {
            captureException(e, {
                tags: { endpoint: '/api/comments', operation: 'blocklist_check' },
                extra: { ip }
            });
            console.error('Blocklist check failed', e);
        }

        // --- Post Comment Action ---
        if (action === 'comment') {
            const {
                post_slug, author_name, author_email, content, parent_id,
                is_anonymous, auth_provider, author_avatar,
                honeypot, csrf_token
            } = req.body;

            // A. Rate Limiting (5 per min, 20 per hour)
            if (!checkRateLimit(ip, 5, 60000)) {
                logRateLimitEvent(ip, '/api/comments', { limit: '5/min', userAgent: req.headers['user-agent'] });
                return res.status(429).json({ error: 'Too many comments (1 min limit).' });
            }
            if (!checkRateLimit(ip, 20, 3600000)) {
                logRateLimitEvent(ip, '/api/comments', { limit: '20/hour', userAgent: req.headers['user-agent'] });
                return res.status(429).json({ error: 'Too many comments (1 hour limit).' });
            }

            // B. Honeypot check
            if (honeypot) {
                logSpamEvent(ip, content, 'honeypot', { post_slug });
                return res.status(400).json({ error: 'Spam detected.' });
            }

            // C. CSRF check (ENABLED for security)
            // C. CSRF check (ENABLED for security)
            const cookies = parseCookies(req);
            const tokenFromCookie = cookies.csrf_token;
            const tokenFromBody = csrf_token;

            if (!verifyCsrfToken(tokenFromCookie, tokenFromBody)) {
                console.error(`CSRF FAIL [${ip}]: Cookie=${!!tokenFromCookie}, Body=${!!tokenFromBody}, Match=${tokenFromCookie === tokenFromBody}`);
                logCsrfEvent(ip, '/api/comments', {
                    post_slug,
                    userAgent: req.headers['user-agent'],
                    debug: `Cookie:${tokenFromCookie ? 'Yes' : 'No'}, Body:${tokenFromBody ? 'Yes' : 'No'}`
                });
                return res.status(403).json({
                    error: 'CSRF token mismatch. Please refresh the page.',
                    debug: {
                        cookie: !!tokenFromCookie,
                        body: !!tokenFromBody,
                        mismatch: tokenFromCookie !== tokenFromBody
                    }
                });
            }

            // D. Validation
            const contentValidation = validateContentLength(content, 1, 5000);
            if (!contentValidation.valid) {
                return res.status(400).json({ error: contentValidation.error });
            }

            if (!post_slug) {
                return res.status(400).json({ error: 'post_slug is required' });
            }

            // D.2 - Detect Admin
            const isAdmin = isAuthenticated(req) || (author_email && author_email === EMAIL_ADDRESSES.admin && verifyToken(cookies.auth_session));

            if (author_name && !isAdmin) {
                if (!validateAuthorName(author_name)) {
                    return res.status(400).json({ error: 'Invalid author name format.' });
                }
                const lowerName = author_name.toLowerCase();
                if (lowerName.includes('admin') || lowerName.includes('shankar aryal') || lowerName.includes('moderator')) {
                    return res.status(400).json({ error: 'Username not allowed.' });
                }
            }

            if (author_email && !validateEmail(author_email)) {
                return res.status(400).json({ error: 'Invalid email format.' });
            }

            // E. Sanitization
            const cleanContent = sanitizeComment(content);
            if (!cleanContent) return res.status(400).json({ error: 'Comment content is empty after sanitization.' });

            // F. Spam Detection
            if (detectSpam(cleanContent)) {
                logSpamEvent(ip, cleanContent, 'content_analysis', { post_slug, author_name });
                return res.status(400).json({ error: 'Comment rejected as spam.' });
            }

            try {
                const result = await db.execute({
                    sql: `INSERT INTO comments (post_slug, author_name, author_email, author_avatar, content, parent_id, is_anonymous, auth_provider, ip_address, user_agent, status, is_admin) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
                    args: [
                        post_slug,
                        author_name || 'Anonymous',
                        author_email || '',
                        author_avatar || '',
                        cleanContent,
                        parent_id || null,
                        is_anonymous ? 1 : 0,
                        auth_provider || 'anonymous',
                        ip,
                        req.headers['user-agent'] || '',
                        isAdmin ? 1 : 0
                    ]
                });

                const insertId = result.lastInsertRowid ? result.lastInsertRowid.toString() : null;

                return res.status(201).json({
                    message: 'Comment posted successfully',
                    id: insertId
                });
            } catch (error) {
                captureException(error, {
                    tags: { endpoint: '/api/comments', method: 'POST', action: 'comment' },
                    extra: { post_slug, ip, author_name: author_name?.substring(0, 20) }
                });
                console.error('Post comment error detail:', {
                    message: error.message,
                    stack: error.stack
                });
                return res.status(500).json({ error: 'Failed to post comment', details: error.message });
            }
        }

        // --- Handle Reaction Action ---
        if (action === 'react') {
            const { comment_id, post_slug, user_id, reaction_type } = req.body;

            if ((!comment_id && !post_slug) || !user_id || !reaction_type) {
                return res.status(400).json({ error: 'comment_id or post_slug, user_id, and reaction_type are required' });
            }

            // Rate limit reactions too (e.g. 30 per min)
            if (!checkRateLimit(ip, 30, 60000)) {
                logRateLimitEvent(ip, '/api/comments/react', { limit: '30/min' });
                return res.status(429).json({ error: 'Too many reactions.' });
            }

            try {
                // Toggle reaction logic
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
                captureException(error, {
                    tags: { endpoint: '/api/comments', method: 'POST', action: 'react' },
                    extra: { comment_id, post_slug, user_id, reaction_type, ip }
                });
                console.error('Reaction error:', error);
                return res.status(500).json({ error: 'Failed to update reaction' });
            }
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
