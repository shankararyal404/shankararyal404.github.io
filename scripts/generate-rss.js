import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://www.shankararyal404.com.np';
const SITE_NAME = 'Shankar Aryal';
const SITE_DESCRIPTION = 'Electrical Engineer & Full Stack Developer from Nepal. Explore innovative projects and insights on web development, Python programming, and cybersecurity.';
const AUTHOR_EMAIL = process.env.EMAIL_NOTIFICATION || 'notifications@shankararyal.com.np';

/**
 * Generate RSS feed from blog posts
 */
async function generateRSS() {
    const posts = [];

    // 1. Read all blog posts from content/blogs/*.md
    const blogsDir = path.join(__dirname, '../content/blogs');

    if (!fs.existsSync(blogsDir)) {
        console.error('❌ Blogs directory not found:', blogsDir);
        process.exit(1);
    }

    const blogFiles = fs.readdirSync(blogsDir).filter(f => f.endsWith('.md'));

    for (const file of blogFiles) {
        const slug = file.replace('.md', '');
        const filePath = path.join(blogsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);

        // Convert markdown to HTML for content
        const htmlContent = marked(content);

        // Create excerpt (first 200 characters)
        const excerpt = content.replace(/[#*`]/g, '').substring(0, 200) + '...';

        posts.push({
            title: data.title || 'Untitled',
            link: `${SITE_URL}/blog-post/${slug}.html`,
            description: data.description || excerpt,
            content: htmlContent,
            author: data.author || SITE_NAME,
            pubDate: data.date ? new Date(data.date).toUTCString() : new Date().toUTCString(),
            category: data.category || 'General',
            tags: data.tags || [],
            image: data.image ? `${SITE_URL}${data.image}` : null
        });
    }

    // 2. Sort by date (newest first)
    posts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // 3. Take latest 20 posts
    const latestPosts = posts.slice(0, 20);

    // Helper to escape XML characters
    const escapeXml = (unsafe) => {
        return unsafe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    };

    // 4. Generate RSS XML
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} Blog</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <managingEditor>${AUTHOR_EMAIL} (${escapeXml(SITE_NAME)})</managingEditor>
    <webMaster>${AUTHOR_EMAIL} (${escapeXml(SITE_NAME)})</webMaster>
    <image>
      <url>${SITE_URL}/assets/images/shankararyal.jpg</url>
      <title>${escapeXml(SITE_NAME)}</title>
      <link>${SITE_URL}</link>
    </image>
${latestPosts.map(post => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${post.link}</link>
      <guid isPermaLink="true">${post.link}</guid>
      <description><![CDATA[${post.description}]]></description>
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
      <dc:creator>${escapeXml(post.author)}</dc:creator>
      <pubDate>${post.pubDate}</pubDate>
      <category>${escapeXml(post.category)}</category>
${post.tags.map(tag => `      <category>${escapeXml(tag)}</category>`).join('\n')}
${post.image ? `      <enclosure url="${post.image}" type="image/jpeg"/>` : ''}
    </item>`).join('\n')}
  </channel>
</rss>`;

    // 5. Write RSS feed
    const outputPath = path.join(__dirname, '../public/feed.xml');
    fs.writeFileSync(outputPath, rss);

    console.log(`✅ RSS feed generated successfully!`);
    console.log(`   📄 ${latestPosts.length} posts included`);
    console.log(`   📍 Output: ${outputPath}`);
    console.log(`   🔗 Feed URL: ${SITE_URL}/feed.xml`);

    return latestPosts.length;
}

// Run generator
generateRSS().catch(error => {
    console.error('❌ RSS generation failed:', error);
    process.exit(1);
});
