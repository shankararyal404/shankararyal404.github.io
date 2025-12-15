import { put } from '@vercel/blob';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // NOTE: This endpoint should be protected with a better auth mechanism in production.
    // For now, we assume simple checks or Vercel's protection.

    try {
        const { filename } = req.query;

        // Expecting the file body in the request
        const blob = await put(filename, req.body, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        res.status(200).json(blob);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Upload failed' });
    }
}
