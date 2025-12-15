import { updateJsonFile } from '../../../lib/github.js';
import { isAuthenticated } from '../../../lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

    const projectData = req.body;

    try {
        await updateJsonFile('content/projects.json', (projects) => {
            const newProject = {
                id: Date.now(),
                ...projectData,
                published: true
            };
            return [newProject, ...projects];
        }, `Create project: ${projectData.title}`);

        res.status(201).json({ message: 'Project created via GitHub CMS' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create project' });
    }
}
