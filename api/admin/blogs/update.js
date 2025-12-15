import { getFile, saveFile } from '../../../lib/github.js';
import { isAuthenticated } from '../../../lib/auth.js';
import matter from 'gray-matter';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

    const { slug, title, category, excerpt, content, image } = req.body;
    // Assuming 'slug' is the ID for file lookup. If slug changes, we might need to delete old and create new.
    // For simplicity, let's assume slug is constant or passed as 'originalSlug'.

    try {
        const filePath = `content/blogs/${slug}.md`;
        const existingFile = await getFile(filePath);

        if (!existingFile) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // Preserve existing fields like ID or Date if needed, or overwrite
        const existingData = matter(existingFile.content);

        const newFrontmatter = {
            ...existingData.data,
            title,
            category,
            excerpt,
            cover: image,
            // Date preserved
        };

        const fileContent = matter.stringify(content, newFrontmatter);

        await saveFile(filePath, fileContent, `Update blog: ${title}`, existingFile.sha);

        res.status(200).json({ message: 'Blog updated via GitHub CMS' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update blog' });
    }
}
