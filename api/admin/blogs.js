import { getFile, saveFile } from '../../lib/github.js';
import { isAuthenticated } from '../../lib/auth.js';
import matter from 'gray-matter';

export default async function handler(req, res) {
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

    const { slug, title, category, excerpt, content, image } = req.body;

    try {
        if (req.method === 'POST') {
            // CREATE
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
            return res.status(201).json({ message: 'Blog created' });

        } else if (req.method === 'PUT') {
            // UPDATE
            const filePath = `content/blogs/${slug}.md`;
            const existingFile = await getFile(filePath);

            if (!existingFile) {
                return res.status(404).json({ message: 'Blog not found' });
            }

            const existingData = matter(existingFile.content);
            const newFrontmatter = {
                ...existingData.data,
                title,
                category,
                excerpt,
                cover: image,
            };

            const fileContent = matter.stringify(content, newFrontmatter);
            await saveFile(filePath, fileContent, `Update blog: ${title}`, existingFile.sha);
            return res.status(200).json({ message: 'Blog updated' });

        } else if (req.method === 'DELETE') {
            // SOFT DELETE
            const filePath = `content/blogs/${slug}.md`;
            const existingFile = await getFile(filePath);

            if (!existingFile) {
                return res.status(404).json({ message: 'Blog not found' });
            }

            const doc = matter(existingFile.content);
            doc.data.published = false;

            const fileContent = matter.stringify(doc.content, doc.data);
            await saveFile(filePath, fileContent, `Unpublish blog: ${slug}`, existingFile.sha);
            return res.status(200).json({ message: 'Blog unpublished' });

        } else {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process blog request' });
    }
}
