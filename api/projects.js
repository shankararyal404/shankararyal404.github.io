import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    try {
        const filePath = path.join(process.cwd(), 'content', 'projects.json');
        const projects = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        const published = projects.filter(p => p.published !== false);
        res.status(200).json(published);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
}
