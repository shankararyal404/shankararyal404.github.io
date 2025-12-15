import { github, getFile, REPO_OWNER, REPO_NAME, BRANCH } from '../../lib/github.js';
import matter from 'gray-matter';

export default async function handler(req, res) {
    try {
        // 1. List files in content/blogs
        const { data: files } = await github.rest.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: 'content/blogs',
            ref: BRANCH
        });

        const markdownFiles = files.filter(f => f.name.endsWith('.md'));

        // 2. Fetch content for each (Parallel) using getFile helper or raw content
        const posts = await Promise.all(markdownFiles.map(async (file) => {
            const fileData = await getFile(file.path);
            const { data, content } = matter(fileData.content);
            return {
                ...data,
                slug: data.slug || file.name.replace('.md', ''),
                content,
                id: data.id || file.sha
            };
            // Optimizing: Maybe just return frontmatter for list?
            // Let's return full content for now as app expects it or just excerpt
        }));

        // 3. Filter and Sort
        const publishedPosts = posts
            .filter(p => p.published !== false)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json(publishedPosts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
}
