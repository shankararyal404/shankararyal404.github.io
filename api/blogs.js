import { github, REPO_OWNER, REPO_NAME, BRANCH } from '../lib/github.js';
import matter from 'gray-matter';
import { setCorsHeaders } from '../lib/cors.js';
import { cache } from '../lib/cache.js';
import { captureException } from '../lib/sentry.js';

export default async function handler(req, res) {
    // Enable CORS for public read access (whitelist-based)
    setCorsHeaders(req, res, { methods: ['GET'], allowAll: true }); // Public API, allow all for GET

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const { slug } = req.query;

    try {
        if (slug) {
            // Check cache first (5 minutes TTL)
            const cacheKey = `blog-${slug}`;
            const cached = cache.get(cacheKey);

            if (cached) {
                // Edge caching headers for CDN
                res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
                return res.status(200).json(cached);
            }

            // GET SINGLE BLOG
            const path = `content/blogs/${slug}.md`;
            try {
                const { data } = await github.rest.repos.getContent({
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    path: path,
                    ref: BRANCH
                });

                const content = Buffer.from(data.content, 'base64').toString('utf8');
                const doc = matter(content);

                const response = {
                    slug,
                    ...doc.data,
                    content: doc.content
                };

                // Cache for 5 minutes
                cache.set(cacheKey, response, 5 * 60 * 1000);

                // Edge caching headers for CDN
                res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
                return res.status(200).json(response);
            } catch (err) {
                return res.status(404).json({ message: 'Blog not found' });
            }
        } else {
            // Check cache first (5 minutes TTL)
            const cacheKey = 'blogs-all';
            const cached = cache.get(cacheKey);

            if (cached) {
                // Edge caching headers for CDN
                res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
                return res.status(200).json(cached);
            }

            // GET ALL BLOGS
            const { data } = await github.rest.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: 'content/blogs',
                ref: BRANCH
            });

            // Filter for markdown files only
            const files = data.filter(f => f.name.endsWith('.md'));

            // Fetch content for all files to get metadata (frontmatter)
            const blogs = await Promise.all(files.map(async (file) => {
                const { data: fileData } = await github.rest.repos.getContent({
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    path: file.path,
                    ref: BRANCH
                });
                const content = Buffer.from(fileData.content, 'base64').toString('utf8');
                const doc = matter(content);
                return {
                    slug: file.name.replace('.md', ''),
                    ...doc.data
                };
            }));

            // Sort by date desc
            blogs.sort((a, b) => new Date(b.date) - new Date(a.date));

            const response = { blogs };

            // Cache for 5 minutes
            cache.set(cacheKey, response, 5 * 60 * 1000);

            // Edge caching headers for CDN
            res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
            return res.status(200).json(response);
        }
    } catch (error) {
        captureException(error, {
            tags: { endpoint: '/api/blogs', method: req.method },
            extra: { slug }
        });
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
}
