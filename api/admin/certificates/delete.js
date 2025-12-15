import { updateJsonFile } from '../../../lib/github.js';
import { isAuthenticated } from '../../../lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.body;

    try {
        await updateJsonFile('content/certificates.json', (certs) => {
            return certs.map(c => c.id === Number(id) ? { ...c, published: false } : c);
        }, `Soft delete certificate: ${id}`);

        res.status(200).json({ message: 'Certificate unpublished via GitHub CMS' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete certificate' });
    }
}
