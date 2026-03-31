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
                    'assets/images/shankararyal',
                    'assets/images/projects',
                    'assets/images/certificates',
                    'assets/images/blogs/article',
                    'assets/images/blogs/general',
                    'assets/images/blogs/literature',
                    'assets/images/blogs/study',
                    'assets/images/blogs/technology',
                    'assets/images/blogs/thoughts',
                    'assets/images/blogs/politics',
                    'assets/images/blogs/philosophy'
                ];

                let foundFiles = [];
                const scanDir = async (path) => {
                    try {
                        const items = await getDirectory(path);
                        for (const item of items) {
                            // Ignore responsive variants (suffixes like -480w, -800w, -1200w)
                            const isVariant = item.name.match(/-(480|800|1200)w\.(avif|webp|jpg|jpeg|png)$/i);
                            if (item.type === 'file' && item.name.match(/\.(avif|jpg|jpeg|png|webp|gif)$/i) && !isVariant) {
                                foundFiles.push({ path: item.path, size: item.size, sha: item.sha });
                            }
                        }
                    } catch (e) {
                        // Directory might not exist yet, skip silently
                    }
                };

                // Scan all configured directories
                for (const dir of dirsToScan) {
                    await scanDir(dir);
                }

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
        const { path: imagePath } = req.body;
        if (!imagePath) return res.status(400).json({ error: 'Path required' });

        try {
            // 1. Remove from Manifest
            const file = await getFile('content/gallery.json');
            let data = file ? JSON.parse(file.content) : [];
            const originalLen = data.length;

            data = data.filter(i => i.path !== imagePath);

            if (data.length < originalLen) {
                await saveFile('content/gallery.json', JSON.stringify(data, null, 2), `Delete image ${path.basename(imagePath)}`, file?.sha);
            }

            // 2. Physical Delete (Optional if handled by Upload API)
            // But usually this API should be self contained if called directly.
            // app.js calls DELETE /api/upload which handles physical delete.
            // This endpoint updates metadata. 
            // If app.js calls this, it should also handle physical delete.
            // Current app.js calls /api/upload for delete.
            // We should ensure /api/upload ALSO updates gallery.json.
            // OR we change app.js to call this.

            // For now, let's implement this as a metadata cleaner.

            return res.status(200).json({ message: 'Gallery entry deleted' });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
