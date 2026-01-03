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
            if (action !== 'create') return res.status(400).json({ message: 'Invalid action for POST' });

            if (type === 'blog') {
                const frontmatter = {
                    id: Date.now().toString(),
                    title: data.title,
                    date: new Date().toISOString().split('T')[0],
                    slug: data.slug,
                    category: data.category || 'General',
                    excerpt: data.excerpt || '',
                    tags: data.tags || [],
                    cover: data.image || '',
                    published: true
                };

                const fileContent = matter.stringify(data.content || '', frontmatter);
                const filePath = `content/blogs/${data.slug}.md`;

                await saveFile(filePath, fileContent, `Create blog: ${data.title}`);
                return res.status(201).json({ message: 'Blog created' });
            }

            // Handle other types if needed (e.g. project, certificate) - currently usually JSON updates
            return res.status(400).json({ message: 'Unsupported type for creation' });
        }

        // --- UPDATE (PUT) ---
        else if (req.method === 'PUT') {
            const { type, slug, data } = req.body || {};

            if (type === 'blog') {
                const filePath = `content/blogs/${slug}.md`;
                const existingFile = await getFile(filePath);
                if (!existingFile) return res.status(404).json({ message: 'Blog not found' });

                const existingDoc = matter(existingFile.content);
                const newFrontmatter = {
                    ...existingDoc.data,
                    ...data // Merge new data
                };

                // Keep distinct fields if not provided
                if (data.image) newFrontmatter.cover = data.image;

                const fileContent = matter.stringify(data.content || existingDoc.content, newFrontmatter);
                await saveFile(filePath, fileContent, `Update blog: ${slug}`, existingFile.sha);

                return res.status(200).json({ message: 'Blog updated' });
            }

            // JSON Files (Hero, About, Skills, etc.)
            if (['hero', 'about', 'skills', 'education', 'certificates', 'projects', 'technologies', 'social-links'].includes(type)) {
                const filePath = `content/${type}.json`;

                await updateJsonFile(filePath, (currentData) => {
                    // Update: If data is an array (replacing list), return it directly.
                    // Otherwise merge objects.
                    if (Array.isArray(data)) {
                        return data;
                    }
                    return { ...currentData, ...data };
                }, `Update ${type} content`);

                return res.status(200).json({ message: `${type} updated` });
            }

            return res.status(400).json({ message: 'Unsupported type' });
        }

        // --- DELETE (DELETE) ---
        else if (req.method === 'DELETE') {
            // In DELETE body is strictly { type, slug, force }
            const { type, slug, force } = req.body || {};

            if (type === 'blog') {
                const filePath = `content/blogs/${slug}.md`;
                const existingFile = await getFile(filePath);
                if (!existingFile) return res.status(404).json({ message: 'Blog not found' });

                if (force) {
                    // Permanent Delete
                    // We need deleteFile function from github.js
                    const { deleteFile } = await import('../lib/github.js'); // Dynamic import to avoid changing top imports if not needed, or just standard import above
                    await deleteFile(filePath, `Delete blog permanently: ${slug}`, existingFile.sha);
                    return res.status(200).json({ message: 'Blog deleted permanently' });
                }

                // Soft Delete
                const doc = matter(existingFile.content);
                doc.data.published = false;
                doc.data.unpublishedAt = new Date().toISOString(); // Mark timestamp

                const fileContent = matter.stringify(doc.content, doc.data);
                await saveFile(filePath, fileContent, `Unpublish blog: ${slug}`, existingFile.sha);
                return res.status(200).json({ message: 'Blog unpublished' });
            }

            return res.status(400).json({ message: 'Delete not supported for this type' });
        }

        return res.status(405).json({ message: 'Method Not Allowed' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
