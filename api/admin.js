import { getFile, saveFile, updateJsonFile } from '../lib/github.js';
import { isAuthenticated } from '../lib/auth.js';
import matter from 'gray-matter';

export default async function handler(req, res) {
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });


    try {
        // --- READ (GET) ---
        if (req.method === 'GET') {
            const { type: queryType } = req.query; // e.g. ?type=projects

            if (!queryType) return res.status(400).json({ message: 'Type required' });

            if (['hero', 'about', 'skills', 'education', 'certificates', 'projects', 'technologies', 'social-links'].includes(queryType)) {
                const filePath = `content/${queryType}.json`;
                const file = await getFile(filePath);
                if (!file) return res.json([]); // Return empty if new
                return res.json(JSON.parse(file.content));
            }

            // Note: Blogs are fetched via public API, so no need to handle here unless for raw content
            return res.status(400).json({ message: 'Invalid type for GET' });
        }

        // --- CREATE (POST) ---
        if (req.method === 'POST') {
            const { type, action, slug, data } = req.body || {};

            if (type === 'blog') {
                if (action !== 'create') return res.status(400).json({ message: 'Invalid action for blog POST' });
                // Clean data for frontmatter (remove body content)
                const metadata = { ...data };
                delete metadata.content;

                const frontmatter = {
                    id: Date.now().toString(),
                    date: new Date().toISOString().split('T')[0],
                    published: true,
                    subdirectory: 'blog-post', // Default subdirectory
                    ...metadata, // Spread filtered data
                };

                // Align image/cover naming convention
                if (data.image) {
                    frontmatter.cover = data.image;
                    delete frontmatter.image;
                }

                const fileContent = matter.stringify(data.content || '', frontmatter);
                const filePath = `content/blogs/${data.slug}.md`;

                await saveFile(filePath, fileContent, `Create blog: ${data.title}`);
                return res.status(201).json({ message: 'Blog created' });
            }

            // --- Consolidated: Item-level CREATE for JSON Collections ---
            if (['projects', 'certificates', 'education', 'skills', 'social-links'].includes(type)) {
                const filePath = `content/${type}.json`;
                const newItem = {
                    id: Date.now().toString(),
                    ...req.body,
                    published: true
                };
                delete newItem.type; // Remove routing helper

                await updateJsonFile(filePath, (currentData) => {
                    if (!Array.isArray(currentData)) return [newItem];
                    return [...currentData, newItem];
                }, `Add ${type} item: ${newItem.title || newItem.name || newItem.id}`);

                return res.status(201).json({ message: 'Item created', item: newItem });
            }

            return res.status(400).json({ message: 'Unsupported type for creation' });
        }

        // --- UPDATE (PUT) ---
        else if (req.method === 'PUT') {
            const { type, slug, data, id } = req.body || {};

            if (type === 'blog') {
                const filePath = `content/blogs/${slug}.md`;
                const existingFile = await getFile(filePath);
                if (!existingFile) return res.status(404).json({ message: 'Blog not found' });

                const existingDoc = matter(existingFile.content);

                // Clean data for frontmatter (remove body content)
                const metadata = { ...data };
                delete metadata.content;

                const newFrontmatter = {
                    ...existingDoc.data,
                    ...metadata // Merge new metadata only
                };

                // Maintain cover field convention
                if (data.image) newFrontmatter.cover = data.image;

                const fileContent = matter.stringify(data.content || existingDoc.content, newFrontmatter);
                await saveFile(filePath, fileContent, `Update blog: ${slug}`, existingFile.sha);

                return res.status(200).json({ message: 'Blog updated' });
            }

            // --- Consolidated: Item-level or Full-array UPDATE for JSON ---
            if (['hero', 'about', 'skills', 'education', 'certificates', 'projects', 'technologies', 'social-links'].includes(type)) {
                const filePath = `content/${type}.json`;

                await updateJsonFile(filePath, (currentData) => {
                    // 1. Full array update (common in current frontend)
                    if (data && Array.isArray(data)) {
                        return data;
                    }
                    // 2. Individual item update
                    if (id && Array.isArray(currentData)) {
                        const index = currentData.findIndex(item => item.id == id);
                        if (index !== -1) {
                            const updatedPayload = { ...req.body };
                            delete updatedPayload.type;
                            delete updatedPayload.id;
                            currentData[index] = { ...currentData[index], ...updatedPayload };
                        }
                        return currentData;
                    }
                    // 3. Object update (Hero, About)
                    return { ...currentData, ...data };
                }, `Update ${type} content`);

                return res.status(200).json({ message: `${type} updated` });
            }

            return res.status(400).json({ message: 'Unsupported type' });
        }

        // --- DELETE (DELETE) ---
        else if (req.method === 'DELETE') {
            // In DELETE body is strictly { type, slug, id, force }
            const { type, slug, id, force } = req.body || {};

            if (type === 'blog') {
                const filePath = `content/blogs/${slug}.md`;
                const existingFile = await getFile(filePath);
                if (!existingFile) return res.status(404).json({ message: 'Blog not found' });

                if (force) {
                    const { deleteFile } = await import('../lib/github.js');
                    await deleteFile(filePath, `Delete blog permanently: ${slug}`, existingFile.sha);
                    return res.status(200).json({ message: 'Blog deleted permanently' });
                }

                // Soft Delete
                const doc = matter(existingFile.content);
                doc.data.published = false;
                doc.data.unpublishedAt = new Date().toISOString();

                const fileContent = matter.stringify(doc.content, doc.data);
                await saveFile(filePath, fileContent, `Unpublish blog: ${slug}`, existingFile.sha);
                return res.status(200).json({ message: 'Blog unpublished' });
            }

            // --- Consolidated: Item-level DELETE for JSON ---
            if (['projects', 'certificates', 'education', 'skills', 'social-links'].includes(type)) {
                if (!id) return res.status(400).json({ message: 'Item ID required for deletion' });
                const filePath = `content/${type}.json`;

                await updateJsonFile(filePath, (currentData) => {
                    if (!Array.isArray(currentData)) return currentData;
                    if (force) {
                        return currentData.filter(item => item.id != id);
                    }
                    // Soft delete
                    return currentData.map(item => {
                        if (item.id == id) return { ...item, published: false };
                        return item;
                    });
                }, `${force ? 'Permanent delete' : 'Unpublish'} ${type} item: ${id}`);

                return res.status(200).json({ message: `Item ${force ? 'deleted' : 'unpublished'}` });
            }

            return res.status(400).json({ message: 'Delete not supported for this type' });
        }

        return res.status(405).json({ message: 'Method Not Allowed' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
