import { github, getFile, REPO_OWNER, REPO_NAME, BRANCH } from '../../lib/github.js';
import matter from 'gray-matter';

export default async function handler(req, res) {
    try {
        const { data: files } = await github.rest.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: 'content/blogs',
            ref: BRANCH
        });

        const markdownFiles = files.filter(f => f.name.endsWith('.md'));

        const posts = await Promise.all(markdownFiles.map(async (file) => {
            const fileData = await getFile(file.path);
            const { data } = matter(fileData.content);
            return { ...data, slug: data.slug || file.name.replace('.md', '') };
        }));

        const latestPosts = posts
            .filter(p => p.published !== false)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3);

        res.status(200).json(latestPosts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch latest blogs' });
    }
}
