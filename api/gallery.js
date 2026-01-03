import { getDirectory, getFile, saveFile } from '../lib/github.js';
import path from 'path';

export default async function handler(req, res) {
    const { method } = req;

    // Auth Check
    const token = req.headers.authorization?.replace('Bearer ', '');
    // verifyToken(token) ...

    if (method === 'GET') {
        const type = req.query.type;

        if (type === 'sync') {
            try {
                const manifestParams = await getFile('content/gallery.json');
                let manifest = manifestParams ? JSON.parse(manifestParams.content) : [];

                const dirsToScan = [
                    'assets/images',
                    'assets/images/global',
                    'assets/images/hero',
                    'assets/images/projects',
                    'assets/images/certificates'
                ];

                let foundFiles = [];
                const scanDir = async (path) => {
                    try {
                        const items = await getDirectory(path);
                        for (const item of items) {
                            if (item.type === 'file' && item.name.match(/\.(avif|jpg|jpeg|png|webp|gif)$/i)) {
                                foundFiles.push({ path: item.path, size: item.size, sha: item.sha });
                            }
                            if (item.type === 'dir' && path === 'assets/images/blogs') {
                                await scanDir(item.path);
                            }
                            if (item.type === 'dir' && path.startsWith('assets/images/blogs/')) {
                                const subItems = await getDirectory(item.path);
                                for (const sub of subItems) {
                                    if (sub.type === 'file' && sub.name.match(/\.(avif|jpg|jpeg|png|webp|gif)$/i)) {
                                        foundFiles.push({ path: sub.path, size: sub.size, sha: sub.sha });
                                    }
                                }
                            }
                        }
                    } catch (e) { }
                };

                for (const dir of dirsToScan) await scanDir(dir);
                await scanDir('assets/images/blogs');

                let updated = false;
                for (const file of foundFiles) {
                    const exists = manifest.find(m => m.path === file.path);
                    if (!exists) {
                        manifest.push({
                            path: file.path,
                            section: file.path.split('/')[2] || 'misc',
                            alt: '',
                            width: 0, height: 0, size: file.size,
                            created: new Date().toISOString(),
                            updated: new Date().toISOString(),
                            unused: false
                        });
                        updated = true;
                    }
                }

                // Remove deleted images from manifest
                const foundPaths = foundFiles.map(f => f.path);
                const originalLength = manifest.length;
                manifest = manifest.filter(m => foundPaths.includes(m.path));

                if (manifest.length < originalLength) {
                    updated = true; // Mark as updated if we removed items
                }

                if (updated) {
                    await saveFile('content/gallery.json', JSON.stringify(manifest, null, 2), `Auto-Sync Gallery`, manifestParams?.sha);
                }

                return res.status(200).json(manifest);
            } catch (e) {
                console.error(e);
                return res.status(500).json({ error: e.message });
            }
        }

        // Default List
        try {
            const file = await getFile('content/gallery.json');
            const data = file ? JSON.parse(file.content) : [];
            return res.status(200).json(data);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (method === 'POST') {
        // Sync or Batch Update?
        // Usually POST is for creating new item, but item creation happens on Upload.
        // Maybe this is for Manual Sync Trigger?
    }

    if (method === 'PUT') {
        // Update Metadata (Alt text etc)
        const { path: imagePath, alt, section, category } = req.body;
        if (!imagePath) return res.status(400).json({ error: 'Path required' });

        try {
            const file = await getFile('content/gallery.json');
            let data = file ? JSON.parse(file.content) : [];

            const idx = data.findIndex(i => i.path === imagePath);
            if (idx !== -1) {
                data[idx] = { ...data[idx], alt, section, category, updated: new Date().toISOString() };
            } else {
                data.push({
                    path: imagePath,
                    alt: alt || '',
                    section: section || 'misc',
                    category: category || '',
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                });
            }

            await saveFile('content/gallery.json', JSON.stringify(data, null, 2), `Update gallery metadata for ${path.basename(imagePath)}`, file?.sha);
            return res.status(200).json({ message: 'Updated' });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (method === 'DELETE') {
        // Handle deletion from manifest (Physical delete handled by upload.js usually, 
        // but maybe gallery should handle full delete?)
        // Spec says "Gallery must allow Admin to Delete images".
        // So yes.
        const { path: imagePath } = req.body; // or query
        // ... implementation ...
        return res.status(501).json({ error: 'Not implemented via Gallery API yet, use Upload API DELETE' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
