import { getFile } from '../../lib/github.js';

export default async function handler(req, res) {
    try {
        const file = await getFile('content/certificates.json');
        if (!file) return res.json([]);

        const certs = JSON.parse(file.content);
        // Filter published
        const publishedCerts = certs.filter(c => c.published !== false);

        res.status(200).json(publishedCerts.sort((a, b) => b.id - a.id));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch certificates' });
    }
}
