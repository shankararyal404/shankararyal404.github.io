import { getFile } from '../../lib/github.js';

export default async function handler(req, res) {
    try {
        const file = await getFile('content/projects.json');
        if (!file) return res.json([]);

        const projects = JSON.parse(file.content);
        // Filter published
        const publishedProjects = projects.filter(p => p.published !== false);

        res.status(200).json(publishedProjects.sort((a, b) => b.id - a.id));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
}
