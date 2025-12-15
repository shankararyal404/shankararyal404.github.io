import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export default async function handler(req, res) {
    const { type } = req.query; // 'all' or 'latest'

    try {
        const blogsDir = path.join(process.cwd(), 'content', 'blogs');
        const files = fs.readdirSync(blogsDir).filter(f => f.endsWith('.md'));

        const blogs = files.map(file => {
            const raw = fs.readFileSync(path.join(blogsDir, file), 'utf-8');
            const { data } = matter(raw);
            return data;
        })
            .filter(blog => blog.published !== false)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (type === 'latest') {
            return res.status(200).json(blogs.slice(0, 3));
        } else {
            return res.status(200).json(blogs);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
}
