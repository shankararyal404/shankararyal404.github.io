import { getFile, saveFile } from '../../lib/github.js';
import { isAuthenticated } from '../../lib/auth.js';

export default async function handler(req, res) {
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const filePath = 'content/projects.json';
        const existingFile = await getFile(filePath);
        let projects = existingFile ? JSON.parse(existingFile.content) : [];

        if (req.method === 'POST') {
            // CREATE
            const { title, description, image, link, tags } = req.body;
            const newProject = {
                id: Date.now().toString(),
                title,
                description,
                image,
                link,
                tags: tags || [],
                published: true
            };
            projects.push(newProject);
            await saveFile(filePath, JSON.stringify(projects, null, 2), `Add project: ${title}`, existingFile?.sha);
            return res.status(201).json({ message: 'Project created', project: newProject });

        } else if (req.method === 'PUT') {
            // UPDATE
            const { id, title, description, image, link, tags } = req.body;
            const index = projects.findIndex(p => p.id === id);
            if (index === -1) return res.status(404).json({ message: 'Project not found' });

            projects[index] = { ...projects[index], title, description, image, link, tags };
            await saveFile(filePath, JSON.stringify(projects, null, 2), `Update project: ${title}`, existingFile.sha);
            return res.status(200).json({ message: 'Project updated' });

        } else if (req.method === 'DELETE') {
            // SOFT DELETE
            const { id } = req.body;
            const project = projects.find(p => p.id === id);
            if (!project) return res.status(404).json({ message: 'Project not found' });

            project.published = false;
            await saveFile(filePath, JSON.stringify(projects, null, 2), `Unpublish project: ${id}`, existingFile.sha);
            return res.status(200).json({ message: 'Project unpublished' });

        } else {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process project request' });
    }
}
