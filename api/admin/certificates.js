import { getFile, saveFile } from '../../lib/github.js';
import { isAuthenticated } from '../../lib/auth.js';

export default async function handler(req, res) {
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const filePath = 'content/certificates.json';
        const existingFile = await getFile(filePath);
        let certificates = existingFile ? JSON.parse(existingFile.content) : [];

        if (req.method === 'POST') {
            // CREATE
            const { title, issuer, date, image, link, category } = req.body;
            const newCert = {
                id: Date.now().toString(),
                title,
                issuer,
                date,
                image,
                link,
                category,
                published: true
            };
            certificates.push(newCert);
            await saveFile(filePath, JSON.stringify(certificates, null, 2), `Add certificate: ${title}`, existingFile?.sha);
            return res.status(201).json({ message: 'Certificate created', certificate: newCert });

        } else if (req.method === 'PUT') {
            // UPDATE
            const { id, title, issuer, date, image, link, category } = req.body;
            const index = certificates.findIndex(c => c.id === id);
            if (index === -1) return res.status(404).json({ message: 'Certificate not found' });

            certificates[index] = { ...certificates[index], title, issuer, date, image, link, category };
            await saveFile(filePath, JSON.stringify(certificates, null, 2), `Update certificate: ${title}`, existingFile.sha);
            return res.status(200).json({ message: 'Certificate updated' });

        } else if (req.method === 'DELETE') {
            // SOFT DELETE
            const { id } = req.body;
            const cert = certificates.find(c => c.id === id);
            if (!cert) return res.status(404).json({ message: 'Certificate not found' });

            cert.published = false;
            await saveFile(filePath, JSON.stringify(certificates, null, 2), `Unpublish certificate: ${id}`, existingFile.sha);
            return res.status(200).json({ message: 'Certificate unpublished' });

        } else {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process certificate request' });
    }
}
