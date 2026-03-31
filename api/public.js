import fs from 'fs';
import path from 'path';
import { captureException } from '../lib/sentry.js';

export default async function handler(req, res) {
    const { type } = req.query;

    if (!type || !['projects', 'certificates', 'education', 'skills', 'hero', 'about', 'technologies', 'social-links'].includes(type)) {
        return res.status(400).json({ error: 'Valid type required' });
    }

    try {
        const filePath = path.join(process.cwd(), 'content', `${type}.json`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Content not found' });
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Handle arrays vs objects
        if (Array.isArray(data)) {
            // Only return published items for listing types
            const published = data.filter(item => item.published !== false);
            // Edge caching headers for CDN (longer TTL for static content)
            res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
            return res.status(200).json(published);
        }

        // Edge caching headers for CDN (longer TTL for static content)
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json(data);
    } catch (error) {
        captureException(error, {
            tags: { endpoint: '/api/public', method: req.method },
            extra: { type }
        });
        console.error(`Fetch ${type} error:`, error);
        res.status(500).json({ error: `Failed to fetch ${type}` });
    }
}
