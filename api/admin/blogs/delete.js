import { getFile, saveFile } from '../../../lib/github.js';
import { isAuthenticated } from '../../../lib/auth.js';
import matter from 'gray-matter';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

    const { slug } = req.body; // Using slug as key

    try {
        const filePath = `content/blogs/${slug}.md`;
        const existingFile = await getFile(filePath);

        if (!existingFile) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        const doc = matter(existingFile.content);
        doc.data.published = false;

        const fileContent = matter.stringify(doc.content, doc.data);

        await saveFile(filePath, fileContent, `Soft delete blog: ${slug}`, existingFile.sha);

        res.status(200).json({ message: 'Blog unpublished via GitHub CMS' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete blog' });
    }
}
