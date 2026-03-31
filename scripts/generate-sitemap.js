import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://www.shankararyal404.com.np';

/**
 * Generate sitemap.xml from content files
 */
async function generateSitemap() {
    const pages = [];

    // 1. Static pages
    pages.push({
        url: '/',
        changefreq: 'weekly',
        priority: 1.0,
        lastmod: new Date().toISOString()
    });

    pages.push({
        url: '/blogs/index.html',
        changefreq: 'daily',
        priority: 0.9,
        lastmod: new Date().toISOString()
    });

    // 2. Blog posts from content/blogs/*.md
    const blogsDir = path.join(__dirname, '../content/blogs');

    if (fs.existsSync(blogsDir)) {
        const blogFiles = fs.readdirSync(blogsDir).filter(f => f.endsWith('.md'));

        for (const file of blogFiles) {
            const slug = file.replace('.md', '');
            const filePath = path.join(blogsDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const { data } = matter(fileContent);

            // Get file modification time
            const stats = fs.statSync(filePath);

            pages.push({
                url: `/blog-post/${slug}.html`,
                changefreq: 'monthly',
                priority: 0.8,
                lastmod: data.date || stats.mtime.toISOString()
            });
        }
    }

    // 3. Tag pages from public/blogs/tags/*.html
    const tagsDir = path.join(__dirname, '../public/blogs/tags');

    if (fs.existsSync(tagsDir)) {
        const tagFiles = fs.readdirSync(tagsDir).filter(f => f.endsWith('.html'));

        for (const file of tagFiles) {
            pages.push({
                url: `/blogs/tags/${file}`,
                changefreq: 'weekly',
                priority: 0.6
            });
        }
    }

    // 4. Category pages (if they exist)
    const categoriesDir = path.join(__dirname, '../public/blogs/categories');

    if (fs.existsSync(categoriesDir)) {
        const categoryFiles = fs.readdirSync(categoriesDir).filter(f => f.endsWith('.html'));

        for (const file of categoryFiles) {
            pages.push({
                url: `/blogs/categories/${file}`,
                changefreq: 'weekly',
                priority: 0.7
            });
        }
    }

    // 5. Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages.map(page => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    ${page.lastmod ? `<lastmod>${page.lastmod.split('T')[0]}</lastmod>` : ''}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    // 6. Write sitemap
    const outputPath = path.join(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(outputPath, xml);

    console.log(`✅ Sitemap generated successfully!`);
    console.log(`   📄 ${pages.length} URLs included`);
    console.log(`   📍 Output: ${outputPath}`);

    return pages.length;
}

// Run generator
generateSitemap().catch(error => {
    console.error('❌ Sitemap generation failed:', error);
    process.exit(1);
});
