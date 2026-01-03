import { github, REPO_OWNER, REPO_NAME, BRANCH } from '../lib/github.js';
import matter from 'gray-matter';

export default async function handler(req, res) {
    // Enable CORS for public access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { slug } = req.query;

    try {
        if (slug) {
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

                return res.status(200).json({
                    slug,
                    ...doc.data,
                    content: doc.content
                });
            } catch (err) {
                return res.status(404).json({ message: 'Blog not found' });
            }
        } else {
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
            // Note: In a high-traffic production app, you might want to cache this or use the generated JSON.
            // But for this portfolio, fetching from GitHub ensuring latest data for Admin is fine.

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

            return res.status(200).json({ blogs });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
}
