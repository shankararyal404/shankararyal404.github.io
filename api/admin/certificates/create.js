import { updateJsonFile } from '../../../lib/github.js';
import { isAuthenticated } from '../../../lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

    const certData = req.body;

    try {
        await updateJsonFile('content/certificates.json', (certs) => {
            const newCert = {
                id: Date.now(),
                ...certData,
                published: true
            };
            return [newCert, ...certs];
        }, `Create certificate: ${certData.title}`);

        res.status(201).json({ message: 'Certificate created via GitHub CMS' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create certificate' });
    }
}
