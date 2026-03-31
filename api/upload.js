import { saveFile, deleteFile, getFile } from '../lib/github.js';
import { IncomingForm } from 'formidable';
import sharp from 'sharp';
import path from 'path';
import { env } from '../lib/env-config.js';

// Disable default body parser for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export default async function handler(req, res) {
    // Basic Method check
    if (req.method === 'DELETE') {
        return handleDelete(req, res);
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const form = new IncomingForm();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error parsing form data' });
            }

            // 'file' is the key we expect from frontend
            const uploadedFile = files.file?.[0] || files.file;
            if (!uploadedFile) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            // Validate Type
            if (!ALLOWED_TYPES.includes(uploadedFile.mimetype)) {
                return res.status(400).json({ error: 'Invalid file type. Only standard images allowed.' });
            }

            const section = fields.section?.[0] || 'misc';
            const category = fields.category?.[0];
            const slug = fields.slug?.[0];

            // Construct Path
            let targetDir = `assets/images/${section.toLowerCase()}`;

            if (section === 'blogs') {
                if (!category || !slug) {
                    return res.status(400).json({ error: 'Category and Slug required for blog images' });
                }
                const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                targetDir = `assets/images/blogs/${categorySlug}`;
            }

            // Filename processing
            const originalName = uploadedFile.originalFilename || 'image';
            const nameWithoutExt = path.parse(originalName).name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            const targetFilename = `${nameWithoutExt}.webp`; // Force WebP
            const targetPath = `${targetDir}/${targetFilename}`;

            // Process with Sharp
            // 1. Main Image (WebP, optimized)
            const buffer = await sharp(uploadedFile.filepath)
                .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            // 2. Blur Placeholder (Tiny, base64)
            const blurBuffer = await sharp(uploadedFile.filepath)
                .resize(10, 10, { fit: 'inside' })
                .toBuffer();
            const blurDataURL = `data:image/png;base64,${blurBuffer.toString('base64')}`;

            // Save to GitHub
            // Check if file exists to get SHA for update
            const existingFile = await getFile(targetPath);
            await saveFile(targetPath, buffer, `Upload image: ${targetPath}`, existingFile ? existingFile.sha : null);

            // Return path and metadata
            return res.status(200).json({
                path: `/${targetPath}`,
                url: `/${targetPath}`,
                blurDataURL,
                message: 'Image uploaded successfully'
            });
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
}

async function handleDelete(req, res) {
    try {
        const requestUrl = new URL(req.url, `http://${req.headers.host}`);
        const filePath = requestUrl.searchParams.get('path');

        if (!filePath) return res.status(400).json({ error: 'Path required' });

        if (!filePath.startsWith('assets/images/') && !filePath.startsWith('/assets/images/')) {
            return res.status(403).json({ error: 'Invalid file path' });
        }

        const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
        await deleteFile(cleanPath, `Delete image: ${cleanPath}`);
        return res.status(200).json({ message: 'File deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Deletion failed' });
    }
}
