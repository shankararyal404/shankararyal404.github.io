import { github, saveFile } from '../../../lib/github.js';
import { isAuthenticated } from '../../../lib/auth.js';
import matter from 'gray-matter';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

    const { title, slug, category, excerpt, content, image } = req.body;

    try {
        const frontmatter = {
            id: Date.now().toString(),
            title,
            date: new Date().toISOString().split('T')[0],
            slug,
            category,
            excerpt,
            cover: image || '',
            published: true
        };

        const fileContent = matter.stringify(content, frontmatter);
        const filePath = `content/blogs/${slug}.md`;

        await saveFile(filePath, fileContent, `Create blog: ${title}`);

        res.status(201).json({ message: 'Blog created via GitHub CMS' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create blog' });
    }
}
