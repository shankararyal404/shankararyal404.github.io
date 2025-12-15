import { updateJsonFile } from '../../../lib/github.js';
import { isAuthenticated } from '../../../lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.body;

    try {
        await updateJsonFile('content/projects.json', (projects) => {
            return projects.map(p => p.id === Number(id) ? { ...p, published: false } : p);
        }, `Soft delete project: ${id}`);

        res.status(200).json({ message: 'Project unpublished via GitHub CMS' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
}
