import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const SITE_URL = process.env.SITE_URL || 'https://www.shankararyal404.com.np';
const CONTENT_DIR = 'content';
const TEMPLATE_DIR = 'templates';
const OUTPUT_DIR = '.';

// Load Templates
const baseTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'base.html'), 'utf-8');
const blogPostTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'blog-post.html'), 'utf-8');
const tagPageTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'tag-page.html'), 'utf-8');
const blogCardTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'blog-card.html'), 'utf-8');
const indexContentTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'index-content.html'), 'utf-8');
const staticPageTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'static-page.html'), 'utf-8');

let footerLatestBlogsHtml = ''; // Will be populated after blogs are processed

// Helper: Render Page
function renderPage(content, title, description, image, type = 'website', canonical = '', jsonLd = '', keywords = '') {
    let html = baseTemplate
        .replace('{{TITLE}}', title)
        .replace('{{DESCRIPTION}}', description)
        .replace('{{KEYWORDS}}', keywords)
        .replace('{{CANONICAL}}', canonical) // First usage match
        .replace('{{OG_TYPE}}', type)
        .replace('{{OG_TITLE}}', title)
        .replace('{{OG_DESCRIPTION}}', description)
        .replace('{{OG_IMAGE}}', image)
        .replace('{{CANONICAL}}', canonical) // Replace again if used in OG or elsewhere
        .replace('{{JSON_LD}}', jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '')
        .replace('{{CONTENT}}', content)
        .replace('{{YEAR}}', new Date().getFullYear())
        // Replace Footer Blogs Placeholder globally or specifically if it exists in baseTemplate
        .replace('{{FOOTER_BLOGS}}', footerLatestBlogsHtml || '<li>No blogs yet.</li>');

    // Cleanup unused tags if any match remained
    return html;
}

// 1. Process Blogs
const blogsDir = path.join(CONTENT_DIR, 'blogs');
const blogFiles = fs.readdirSync(blogsDir).filter(f => f.endsWith('.md'));
const blogs = [];
const tagsMap = {};

blogFiles.forEach(file => {
    const raw = fs.readFileSync(path.join(blogsDir, file), 'utf-8');
    const { data, content } = matter(raw);

    if (data.published === false) return; // Skip unpublished

    const htmlContent = marked.parse(content);
    const slug = data.slug || file.replace('.md', '');
    const url = `${SITE_URL}/blogs/${slug}.html`;
    const image = data.cover || `${SITE_URL}/assets/images/default-cover.webp`;

    blogs.push({ ...data, slug, htmlContent, url, image, dateObj: new Date(data.date) });

    // Render Blog Post
    const blogHtml = blogPostTemplate
        .replace('{{BLOG_TITLE}}', data.title)
        .replace('{{BLOG_DATE}}', data.date)
        .replace('{{BLOG_CATEGORY}}', data.category)
        .replace('{{BLOG_CATEGORY_SLUG}}', data.category.toLowerCase().replace(/ /g, '-')) // Simple slugify
        .replace('{{BLOG_IMAGE}}', image)
        .replace('{{BLOG_BODY}}', htmlContent)
        .replace('{{BLOG_TAGS}}', (data.tags || []).map(t => `<a href="/blogs/tags/${t.toLowerCase()}.html" class="tag">${t}</a>`).join(', '));

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": data.title,
        "image": image,
        "datePublished": data.date,
        "author": { "@type": "Person", "name": "Shankar Aryal" }
    };

    const fullHtml = renderPage(
        blogHtml,
        `${data.title} | Shankar Aryal`,
        data.excerpt || data.description,
        image,
        'article',
        url,
        jsonLd
    );

    fs.writeFileSync(path.join(OUTPUT_DIR, 'blogs', `${slug}.html`), fullHtml);
    console.log(`Generated: blogs/${slug}.html`);

    // Collect Tags
    const allTags = [...(data.tags || []), data.category];
    allTags.forEach(tag => {
        if (!tag) return;
        const normalizedTag = tag.toLowerCase().trim();
        if (!tagsMap[normalizedTag]) tagsMap[normalizedTag] = { name: tag, posts: [] };
        tagsMap[normalizedTag].posts.push({ ...data, slug, image });
    });
});

// Sort blogs by date
blogs.sort((a, b) => b.dateObj - a.dateObj);

// Generate Footer Blogs HTML (Top 3)
footerLatestBlogsHtml = blogs.slice(0, 3).map(b => `
    <li><a href="/blogs/${b.slug}.html">${b.title}</a></li>
`).join('');

// 2. Process Tags
const tagsOutputDir = path.join(OUTPUT_DIR, 'blogs', 'tags');
if (!fs.existsSync(tagsOutputDir)) fs.mkdirSync(tagsOutputDir, { recursive: true });

Object.values(tagsMap).forEach(tagData => {
    const tagSlug = tagData.name.toLowerCase().replace(/ /g, '-');
    const tagUrl = `${SITE_URL}/blogs/tags/${tagSlug}.html`;

    const blogListHtml = tagData.posts.map(post => {
        return blogCardTemplate
            .replace('{{POST_IMAGE}}', post.image)
            .replace('{{POST_TITLE}}', post.title)
            .replace('{{POST_SLUG}}', post.slug)
            .replace('{{POST_Category}}', post.category) // Case sensitive in template?
            .replace('{{POST_CATEGORY}}', post.category)
            .replace('{{POST_CATEGORY_SLUG}}', post.category.toLowerCase().replace(/ /g, '-'))
            .replace('{{POST_DATE}}', post.date)
            .replace('{{POST_EXCERPT}}', post.excerpt || '');
    }).join('');

    const tagHtml = tagPageTemplate
        .replace('{{TAG_NAME}}', tagData.name)
        .replace('{{POST_COUNT}}', tagData.posts.length)
        .replace('{{BLOG_LIST}}', blogListHtml);

    const fullHtml = renderPage(
        tagHtml,
        `${tagData.name} Blogs | Shankar Aryal`,
        `Read articles about ${tagData.name}.`,
        `${SITE_URL}/assets/images/default-cover.webp`,
        'website',
        tagUrl
    );

    fs.writeFileSync(path.join(tagsOutputDir, `${tagSlug}.html`), fullHtml);
    console.log(`Generated: blogs/tags/${tagSlug}.html`);
});

// 2.5 Process Static Pages (Privacy, 404, etc)
const pagesDir = path.join(CONTENT_DIR, 'pages');
if (fs.existsSync(pagesDir)) {
    const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.md'));
    pageFiles.forEach(file => {
        const raw = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
        const { data, content } = matter(raw);
        const htmlContent = marked.parse(content);

        const pageHtml = staticPageTemplate
            .replace('{{PAGE_TITLE}}', data.title)
            .replace('{{PAGE_CONTENT}}', htmlContent);

        const slug = file.replace('.md', '');
        const outputName = slug === '404' ? '404.html' : `${slug}.html`;

        const fullHtml = renderPage(
            pageHtml,
            `${data.title} | Shankar Aryal`,
            data.description || data.title,
            `${SITE_URL}/assets/images/default-cover.webp`,
            'website',
            `${SITE_URL}/${outputName}`
        );

        fs.writeFileSync(path.join(OUTPUT_DIR, outputName), fullHtml);
        console.log(`Generated: ${outputName}`);
    });
}

// 3. Process Index
const hero = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'hero.json'), 'utf-8'));
const about = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'about.json'), 'utf-8'));
const skills = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'skills.json'), 'utf-8'));
const projects = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'projects.json'), 'utf-8'));
const certs = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'certificates.json'), 'utf-8'));
const education = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'education.json'), 'utf-8'));

// Hero Section with Stats and Premium Layout
const heroHtml = `
    <span class="hero-subtitle">Hello, I'm</span>
    <h1 class="h1 hero-title">${hero.name}</h1>
    <h2 class="h2 hero-role">Building Digital Excellence</h2>
    <p class="hero-desc">${hero.description}</p>
    
    <div class="hero-stats">
        <div class="stat-item">
            <span class="stat-num">5+</span>
            <span class="stat-label">Projects</span>
        </div>
         <div class="stat-divider"></div>
        <div class="stat-item">
            <span class="stat-num">3+</span>
            <span class="stat-label">Technologies</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
            <span class="stat-num">100%</span>
            <span class="stat-label">Commitment</span>
        </div>
    </div>

    <div class="hero-btns">
        <a href="#contact" class="btn btn-primary">Let's Connect</a>
        <a href="#portfolio" class="btn btn-outline">View Work</a>
    </div>
`;

// Profile Card HTML (Replaces simple image)
const heroImageHtml = `
    <div class="hero-card-wrapper">
        <div class="hero-card">
            <div class="badge-student">Engineering Student</div>
            <img src="${hero.profileImage || about.image}" alt="Shankar Aryal" class="hero-main-img">
            <div class="hero-card-footer">
                <a href="/assets/resume.pdf" target="_blank" class="icon-btn" title="Resume"><ion-icon name="print-outline"></ion-icon></a>
                <a href="#" class="icon-btn" title="Website"><ion-icon name="globe-outline"></ion-icon></a>
                <a href="#skills" class="icon-btn" title="Skills"><ion-icon name="code-slash-outline"></ion-icon></a>
            </div>
        </div>
    </div>
`;

// About Section with Collage and Floating Icons
const aboutHtml = `
    <div class="about-collage">
        <div class="about-img-main">
            <img src="${about.image}" alt="Working">
            <div class="floating-icon icon-react"><ion-icon name="logo-react"></ion-icon></div>
            <div class="floating-icon icon-python"><ion-icon name="logo-python"></ion-icon></div>
            <div class="floating-icon icon-angular"><ion-icon name="logo-angular"></ion-icon></div>
        </div>
        <div class="about-img-sub">
             <img src="${hero.profileImage || 'https://via.placeholder.com/150'}" alt="Profile">
             <div class="floating-icon icon-js"><ion-icon name="logo-javascript"></ion-icon></div>
        </div>
    </div>
    
    <div class="about-text-content">
        <h3 class="h3 about-subtitle">Being aspiring developer and student</h3>
        <h2 class="h2 about-heading">I am developing my skills in these areas.</h2>
        <p class="about-desc">${about.bio}</p>
        <blockquote class="about-quote">
            "In the realm of electrical engineering and coding, I am not just building circuits and programs; I am crafting the foundation of tomorrow's innovations."
        </blockquote>
    </div>
`;

// Skills (Grouped)
const skillsHtml = skills.map(cat => `
    <div class="skill-category">
        <h3 class="h4" style="margin-bottom: 10px; color: var(--light-gray);">${cat.category}</h3>
        <div class="skill-tags">
            ${cat.items.map(item => `<span class="skill-tag">${item}</span>`).join('')}
        </div>
    </div>
`).join('');

const educationHtml = `
    <div class="timeline">
        ${education.map(edu => `
            <div class="timeline-item reveal">
                <div class="timeline-dot"></div>
                <div class="timeline-date">${edu.period}</div>
                <div class="timeline-content glass-panel">
                    <h3 class="h3">${edu.degree}</h3>
                    <h4 class="h4" style="color: var(--primary);">${edu.institution}</h4>
                    <ul style="margin-top: 10px; padding-left: 20px;">
                        ${edu.details.map(d => `<li>${d}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('')}
    </div>
`;

const projectsHtml = projects.filter(p => p.published).map(p => `
    <div class="project-card reveal">
        <div class="project-banner">
            <img src="${p.image}" alt="${p.title}" loading="lazy">
        </div>
        <div class="project-content">
            <h3 class="h3 project-title">${p.title}</h3>
            <p class="project-desc">${p.description}</p>
            <div class="project-tags">${(p.tags || []).map(t => `<span>${t}</span>`).join('')}</div>
        </div>
    </div>
`).join('');

const certsHtml = certs.filter(c => c.published).map(c => `
    <div class="certificate-card reveal">
         <img src="${c.image}" alt="${c.title}" class="cert-img">
         <div class="cert-content">
            <h3 class="h3">${c.title}</h3>
            <p>${c.issuer}</p>
         </div>
    </div>
`).join('');

const latestBlogsHtml = blogs.slice(0, 3).map(post => {
    return blogCardTemplate
        .replace('{{POST_IMAGE}}', post.image)
        .replace('{{POST_TITLE}}', post.title)
        .replace('{{POST_SLUG}}', post.slug)
        .replace('{{POST_CATEGORY}}', post.category)
        .replace('{{POST_CATEGORY_SLUG}}', post.category.toLowerCase().replace(/ /g, '-'))
        .replace('{{POST_DATE}}', post.date)
        .replace('{{POST_EXCERPT}}', post.excerpt || '');
}).join('');

let indexContent = indexContentTemplate
    .replace('{{HERO_CONTENT}}', heroHtml)
    .replace('{{HERO_IMAGE}}', heroImageHtml)
    .replace('{{ABOUT_CONTENT}}', aboutHtml)
    .replace('{{EDUCATION_LIST}}', educationHtml)
    .replace('{{SKILLS_LIST}}', skillsHtml)
    .replace('{{CERTIFICATES_LIST}}', certsHtml)
    .replace('{{PROJECTS_LIST}}', projectsHtml)
    .replace('{{LATEST_BLOGS}}', latestBlogsHtml);

const indexJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Shankar Aryal",
    "url": "https://www.shankararyal404.com.np/",
    "image": "https://www.shankararyal404.com.np/assets/images/shankararyal.jpg",
    "sameAs": [
        "https://github.com/mrshankararyal",
        "https://www.linkedin.com/in/shankararyal/",
        "https://www.facebook.com/ShankarAryal01",
        "https://www.instagram.com/mrshankararyal/",
        "https://independent.academia.edu/ShankarAryal4",
        "https://codepen.io/Shankar-Aryal",
        "https://dev.to/shankararyal",
        "https://medium.com/@shankararyal737",
        "https://www.youtube.com/@shankararyal1755",
        "https://www.researchgate.net/profile/Shankar-Aryal-2?ev=hdr_xprf",
        "https://scholar.google.com/citations?user=rf8xZhQAAAAJ&hl=en"
    ],
    "jobTitle": ["Electrical Engineer", "Full Stack Developer"],
    "worksFor": {
        "@type": "Organization",
        "name": "LearnMe Educational Platform",
        "url": "https://learnmeedu.github.io/"
    },
    "alumniOf": {
        "@type": "EducationalOrganization",
        "name": "Khwopa College Of Engineering",
        "sameAs": "https://khwopa.edu.np/"
    },
    "address": {
        "@type": "PostalAddress",
        "addressLocality": "Bhaktapur",
        "addressRegion": "Bagmati",
        "addressCountry": "Nepal"
    },
    "description": "Shankar Aryal is a Full Stack Developer and Electrical Engineering student specializing in web development, Python programming, and cybersecurity.",
    "knowsLanguage": ["English", "Nepali"],
    "knowsAbout": [
        "Full Stack Development",
        "Python Programming",
        "React.js",
        "Cybersecurity",
        "Electrical Engineering",
        "Web Development"
    ]
};

const indexFullHtml = renderPage(
    indexContent,
    "Shankar Aryal | Electrical Engineer & Full Stack Developer",
    "Shankar Aryal - Electrical Engineer & Full Stack Developer from Nepal. Explore my innovative projects and portfolio showcasing my skills!",
    hero.profileImage || `${SITE_URL}/assets/images/shankararyal.jpg`,
    'website',
    SITE_URL,
    indexJsonLd,
    "Shankar Aryal, Electrical Engineering, Full Stack Developer, Python, portfolio, web development, LearnMe, QuantumShield, ShadowStrike, Nepal"
);

fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexFullHtml);
console.log('Generated: index.html');


// 4. Generate Sitemap & Robots
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>
    <url><loc>${SITE_URL}/blogs/index.html</loc><priority>0.8</priority></url>
    ${blogs.map(b => `<url><loc>${b.url}</loc><lastmod>${b.date}</lastmod><priority>0.7</priority></url>`).join('\n')}
    ${Object.keys(tagsMap).map(t => `<url><loc>${SITE_URL}/blogs/tags/${t.replace(/ /g, '-')}.html</loc><priority>0.5</priority></url>`).join('\n')}
</urlset>`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemap);
console.log('Generated: sitemap.xml');

const robots = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), robots);
console.log('Generated: robots.txt');
