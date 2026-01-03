import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
// import yaml from 'js-yaml'; // Unused and missing dependency

// Custom Marked Renderer for Skeleton Loading
const renderer = {
    image(href, title, text) {
        return `
        <div class="img-wrapper skeleton-box">
            <img src="${href}" alt="${text}" title="${title || ''}" loading="lazy" decoding="async" onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton-box');">
        </div>`;
    }
};

marked.use({ renderer });

const SITE_URL = process.env.SITE_URL || 'https://www.shankararyal404.com.np';
const CONTENT_DIR = 'content';
const TEMPLATE_DIR = 'templates';
const OUTPUT_DIR = 'public';

// Load Content Data
const hero = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'hero.json'), 'utf-8'));
const about = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'about.json'), 'utf-8'));
const skills = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'skills.json'), 'utf-8'));
const projects = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'projects.json'), 'utf-8'));
const certs = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'certificates.json'), 'utf-8'));
const education = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'education.json'), 'utf-8'));
const technologies = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'technologies.json'), 'utf-8'));
const socialLinks = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'social-links.json'), 'utf-8'));

// 0. Ensure Output Directories Exist
if (fs.existsSync(OUTPUT_DIR)) {
    // Optional: Clean output dir if needed (rimraf logic), but for now just ensure exists
} else {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Create subdirectories immediately
const blogsOutputDir = path.join(OUTPUT_DIR, 'blogs');
if (!fs.existsSync(blogsOutputDir)) fs.mkdirSync(blogsOutputDir, { recursive: true });

const tagsOutputDir = path.join(OUTPUT_DIR, 'blogs', 'tags');
if (!fs.existsSync(tagsOutputDir)) fs.mkdirSync(tagsOutputDir, { recursive: true });

// Load Templates
const baseTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'base.html'), 'utf-8');
const blogPostTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'blog-post.html'), 'utf-8');
const tagPageTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'tag-page.html'), 'utf-8');
const blogCardTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'blog-card.html'), 'utf-8');
const indexContentTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'index-content.html'), 'utf-8');
const staticPageTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'static-page.html'), 'utf-8');
const blogIndexTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'blog-index.html'), 'utf-8');

let footerLatestBlogsHtml = ''; // Will be populated after blogs are processed

// Helper: Render Page
function renderPage(bodyHtml, pageTitle, metaDescription, metaImage, metaType = 'website', canonicalUrl = '', jsonLd = '', keywords = '', categoryCSSLink = '', robots = 'index, follow') {
    let html = baseTemplate
        .replaceAll('{{TITLE}}', pageTitle)
        .replaceAll('{{DESCRIPTION}}', metaDescription)
        .replaceAll('{{KEYWORDS}}', keywords)
        .replaceAll('{{ROBOTS}}', robots)
        .replaceAll('{{CANONICAL}}', canonicalUrl)
        .replaceAll('{{OG_TYPE}}', metaType)
        .replaceAll('{{OG_TITLE}}', pageTitle)
        .replaceAll('{{OG_DESCRIPTION}}', metaDescription)
        .replaceAll('{{OG_IMAGE}}', metaImage)
        .replaceAll('{{JSON_LD}}', jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '')
        .replaceAll('{{CATEGORY_CSS}}', categoryCSSLink)
        .replaceAll('{{CONTENT}}', bodyHtml)
        .replaceAll('{{YEAR}}', new Date().getFullYear())
        .replaceAll('{{SOCIAL_LINKS}}', (socialLinks || []).filter(s => s.visible).map(s => `
            <li><a href="${s.url}" target="_blank" class="social-link" title="${s.platform}"><ion-icon name="${s.icon}"></ion-icon></a></li>
        `).join(''))
        .replaceAll('{{FOOTER_BLOGS}}', footerLatestBlogsHtml || '<li>No blogs yet.</li>');

    return html;
}

// 1. Process Blogs (Two-Pass Approach)
const blogsDir = path.join(CONTENT_DIR, 'blogs');
const blogFiles = fs.readdirSync(blogsDir).filter(f => f.endsWith('.md'));
const blogs = [];
const tagsMap = {};

// Import category utilities (Dynamic Import)
const { getCategorySlug } = await import('../lib/categories.js');

// PASS 1: Collect Metadata & Content
for (const file of blogFiles) {
    const raw = fs.readFileSync(path.join(blogsDir, file), 'utf-8');
    const { data, content } = matter(raw);
    if (!data.published) continue;

    // Slug & Basic Data
    const slug = data.slug || file.replace('.md', '');
    const image = data.cover || data.image || `${SITE_URL}/assets/images/default-cover.webp`;
    const dateObj = new Date(data.date);

    // SEO & Classification
    const categorySlug = getCategorySlug(data.category);
    // const categoryUrl = ... (will compute in Pass 2)

    // Collect Tags
    const allTags = [...(data.tags || []), data.category];
    allTags.forEach(tag => {
        if (!tag) return;
        const normalizedTag = tag.toLowerCase().trim();
        if (!tagsMap[normalizedTag]) tagsMap[normalizedTag] = { name: tag, posts: [] };
        // We'll push full post data later
    });

    // Subdirectory Support
    const subdirectory = data.subdirectory || 'blogs';
    const url = `${SITE_URL}/${subdirectory}/${slug}.html`;

    blogs.push({
        ...data,
        slug,
        image,
        content, // Store content for Pass 2
        dateObj,
        categorySlug,
        subdirectory,
        url,
        raw // Keep raw if needed
    });
}

// Global Sorting (Newest First)
blogs.sort((a, b) => b.dateObj - a.dateObj);

// Populate TagsMap Posts using sorted blogs
blogs.forEach(blog => {
    const allTags = [...(blog.tags || []), blog.category];
    allTags.forEach(tag => {
        if (!tag) return;
        const normalizedTag = tag.toLowerCase().trim();
        if (tagsMap[normalizedTag]) {
            tagsMap[normalizedTag].posts.push(blog);
        }
    });
});

// GENERATE FOOTER RECENT BLOGS (Now populated correctly!)
footerLatestBlogsHtml = blogs.slice(0, 3).map(b => `
    <li><a href="/${b.subdirectory}/${b.slug}.html">${b.title}</a></li>
`).join('');
console.log(`[Build] Footer populated with ${Math.min(blogs.length, 3)} recent blogs.`);

// PASS 2: Generate Individual Pages
for (const blog of blogs) {
    const url = blog.url;
    const indexStatus = blog.noindex ? 'noindex, nofollow' : 'index, follow';
    const categoryUrl = `${SITE_URL}/blogs/tags/${blog.categorySlug.toLowerCase().replace(/ /g, '-')}.html`;

    // Select Template
    const templatePath = `templates/blog/${blog.categorySlug}.html`;
    let blogTemplate;
    try {
        blogTemplate = fs.readFileSync(templatePath, 'utf-8');
    } catch (e) {
        blogTemplate = fs.readFileSync('templates/blog/general.html', 'utf-8');
    }

    // Convert Markdown
    const htmlContent = marked.parse(blog.content);

    // Render Basic Blog HTML
    let blogHtml = blogTemplate
        .replaceAll('{{BLOG_TITLE}}', blog.title)
        .replaceAll('{{BLOG_DATE}}', blog.date)
        .replaceAll('{{BLOG_CATEGORY}}', blog.category)
        .replaceAll('{{BLOG_CATEGORY_SLUG}}', blog.categorySlug)
        .replaceAll('{{BLOG_IMAGE}}', blog.image)
        .replaceAll('{{BLOG_BODY}}', htmlContent)
        .replaceAll('{{BLOG_TAGS}}', (blog.tags || []).map(t => `<a href="/blogs/tags/${t.toLowerCase()}.html" class="tag">${t}</a>`).join(', '));

    // Literature Fields
    if (blog.category === 'Literature') {
        blogHtml = blogHtml
            .replaceAll('{{LITERATURE_TYPE}}', blog.type || '')
            .replaceAll('{{WRITTEN_BY}}', blog.written_by || '')
            .replaceAll('{{PLACE}}', blog.place || '')
            .replaceAll('{{PUBLISHER}}', blog.publisher || '')
            .replaceAll('{{THEME}}', blog.theme || '')
            .replaceAll('{{REFLECTION}}', blog.reflection || '')
            // New Bilingual Placeholders
            .replaceAll('{{REFLECTION_EN}}', blog.reflection_en || blog.reflection || '')
            .replaceAll('{{REFLECTION_NE}}', blog.reflection_ne || blog.reflection || '')
            .replaceAll('{{THEME_EN}}', blog.theme_en || blog.theme || '')
            .replaceAll('{{THEME_NE}}', blog.theme_ne || blog.theme || '')
            .replaceAll('{{INTRO_EN}}', blog.intro_en || '')
            .replaceAll('{{INTRO_NE}}', blog.intro_ne || '')
            .replaceAll('{{POEM_EN}}', marked.parse(blog.poem_en || ''))
            .replaceAll('{{POEM_NE}}', marked.parse(blog.poem_ne || blog.originalContent || ''));
    }

    // Clear Comments Placeholder
    blogHtml = blogHtml.replaceAll('{{COMMENTS_LIST}}', '');

    // ----------------------------------------------------
    // BLOG SUGGESTION ENGINE
    // ----------------------------------------------------
    // 1. Filter candidates (exclude self)
    const candidates = blogs.filter(b => b.slug !== blog.slug).map(b => {
        let score = 0;
        // Same Category (+3)
        if (b.category === blog.category) score += 3;
        // Matching Tags (+1 each)
        if (blog.tags && b.tags) {
            const shared = b.tags.filter(t => blog.tags.includes(t));
            score += shared.length;
        }
        // Recent is implicit by array order
        return { blog: b, score };
    });

    // 2. Sort by Score
    candidates.sort((a, b) => b.score - a.score);

    // 3. Select Top 6 and Randomize 3
    let topN = candidates.slice(0, 6);
    // Fisher-Yates Shuffle
    for (let i = topN.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [topN[i], topN[j]] = [topN[j], topN[i]];
    }
    const suggestions = topN.slice(0, 3).map(c => c.blog);

    // 4. Generate HTML
    let suggestionHtml = '';
    if (suggestions.length > 0) {
        suggestionHtml = `
        <div class="blog-suggestions" style="margin-top: 60px; padding-top: 40px; border-top: 1px solid var(--white-alpha-10);">
            <h3 class="" style="margin-bottom: 25px; font-size: 1.5rem;">Recommended for you</h3>
            <div class="suggestion-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                ${suggestions.map(s => {
            return blogCardTemplate
                .replaceAll('{{POST_IMAGE}}', s.image)
                .replaceAll('{{POST_TITLE}}', s.title)
                .replaceAll('{{POST_SLUG}}', s.slug)
                .replaceAll('{{POST_SUBDIRECTORY}}', s.subdirectory || 'blogs')
                .replaceAll('{{POST_CATEGORY}}', s.category)
                .replaceAll('{{POST_CATEGORY_SLUG}}', s.category.toLowerCase().replace(/ /g, '-'))
                .replaceAll('{{POST_DATE}}', s.date)
                .replaceAll('{{POST_EXCERPT}}', s.excerpt || '')
                .replaceAll('{{POST_TAGS}}', (s.tags || []).join(', ').toLowerCase());
        }).join('')}
            </div>
        </div>`;
    }

    // 5. Inject after Comments
    // Try to find closing of comments-section
    const commentsEndIdx = blogHtml.lastIndexOf('</div>'); // Risky if template changes, but let's try to append to article end
    // Safer: Replace </article> with Suggestion + </article>
    if (blogHtml.includes('</article>')) {
        blogHtml = blogHtml.replace('</article>', `${suggestionHtml}</article>`);
    } else {
        // Fallback
        blogHtml += suggestionHtml;
    }

    // JSON-LD
    const keywords = [blog.category, ...(blog.tags || [])].join(', ');
    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL }, { "@type": "ListItem", "position": 2, "name": "Blogs", "item": `${SITE_URL}/blogs/index.html` }, { "@type": "ListItem", "position": 3, "name": blog.category, "item": categoryUrl }, { "@type": "ListItem", "position": 4, "name": blog.title, "item": url }]
        },
        {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": blog.title,
            "description": blog.excerpt || '',
            "image": { "@type": "ImageObject", "url": blog.image },
            "datePublished": blog.date,
            "author": { "@type": "Person", "name": "Shankar Aryal" },
            "mainEntityOfPage": { "@type": "WebPage", "@id": url }
        }
    ];

    const categoryCSSLink = `<link rel="stylesheet" href="/assets/css/blog/${blog.categorySlug}.css">`;

    // Render Full Page (Uses populated footerLatestBlogsHtml!)
    const fullHtml = renderPage(
        blogHtml,
        `${blog.title} | Shankar Aryal`,
        blog.excerpt || '',
        blog.image,
        'article',
        url,
        jsonLd,
        keywords,
        categoryCSSLink,
        indexStatus
    );

    const outputSubDir = path.join(OUTPUT_DIR, blog.subdirectory);
    if (!fs.existsSync(outputSubDir)) fs.mkdirSync(outputSubDir, { recursive: true });

    fs.writeFileSync(path.join(outputSubDir, `${blog.slug}.html`), fullHtml);
    console.log(`Generated: ${blog.subdirectory}/${blog.slug}.html`);
}

// 1.5 Generate Blog Index (Listing Page)
const allBlogsListHtml = blogs.map(post => {
    return blogCardTemplate
        .replaceAll('{{POST_IMAGE}}', post.image)
        .replaceAll('{{POST_TITLE}}', post.title)
        .replaceAll('{{POST_SLUG}}', post.slug)
        .replaceAll('{{POST_SUBDIRECTORY}}', post.subdirectory || 'blogs')
        .replaceAll('{{POST_CATEGORY}}', post.category)
        .replaceAll('{{POST_CATEGORY_SLUG}}', post.category.toLowerCase().replace(/ /g, '-'))
        .replaceAll('{{POST_DATE}}', post.date)
        .replaceAll('{{POST_EXCERPT}}', post.excerpt || '')
        .replaceAll('{{POST_TAGS}}', (post.tags || []).join(', ').toLowerCase());
}).join('');

const blogIndexHtml = blogIndexTemplate
    .replace('{{BLOG_LIST}}', allBlogsListHtml)
    .replace('{{PAGINATION}}', '') // Pagination logic can be added later
    // In case user wants to filter
    .replace('{{TAG_CLOUD}}', '');

const fullBlogIndexHtml = renderPage(
    blogIndexHtml,
    `All Blogs | Shankar Aryal`,
    `Read all articles, tutorials, and insights by Shankar Aryal.`,
    `${SITE_URL}/assets/images/default-cover.webp`,
    'website',
    `${SITE_URL}/blogs/index.html`
);

fs.writeFileSync(path.join(OUTPUT_DIR, 'blogs', 'index.html'), fullBlogIndexHtml);
console.log(`Generated: blogs/index.html`);

// 2. Process Tags
// (Directory created at startup)

Object.values(tagsMap).forEach(tagData => {
    const tagSlug = tagData.name.toLowerCase().replace(/ /g, '-');
    const tagUrl = `${SITE_URL}/blogs/tags/${tagSlug}.html`;

    // Determine Tag Layout Class
    let tagLayoutClass = 'tag-layout-default';
    const lowerName = tagData.name.toLowerCase();
    if (lowerName.includes('poem')) tagLayoutClass = 'tag-layout-poem';
    else if (lowerName.includes('tech') || lowerName.includes('code') || lowerName.includes('cyber')) tagLayoutClass = 'tag-layout-tech';
    else if (lowerName.includes('thought') || lowerName.includes('opinion')) tagLayoutClass = 'tag-layout-thoughts';
    else if (lowerName.includes('security')) tagLayoutClass = 'tag-layout-security';

    const blogListHtml = tagData.posts.map(post => {
        return blogCardTemplate
            .replaceAll('{{POST_IMAGE}}', post.image)
            .replaceAll('{{POST_TITLE}}', post.title)
            .replaceAll('{{POST_SLUG}}', post.slug)
            .replaceAll('{{POST_CATEGORY}}', post.category)
            .replaceAll('{{POST_CATEGORY_SLUG}}', post.category.toLowerCase().replace(/ /g, '-'))
            .replaceAll('{{POST_DATE}}', post.date)
            .replaceAll('{{POST_EXCERPT}}', post.excerpt || '')
            .replaceAll('{{POST_TAGS}}', (post.tags || []).join(', ').toLowerCase());
    }).join('');

    const tagHtml = tagPageTemplate
        .replace('{{TAG_NAME}}', tagData.name)
        .replace('{{POST_COUNT}}', tagData.posts.length)
        .replace('{{BLOG_LIST}}', blogListHtml)
        .replace('{{TAG_CLASS}}', tagLayoutClass);

    // Generate SEO-friendly description for tag pages
    const tagDescription = `Explore ${tagData.posts.length} article${tagData.posts.length > 1 ? 's' : ''} about ${tagData.name} by Shankar Aryal. Insights on electrical engineering, web development, and technology.`;

    // BreadcrumbList Schema
    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [{
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": SITE_URL
        }, {
            "@type": "ListItem",
            "position": 2,
            "name": "Blogs",
            "item": `${SITE_URL}/blogs/index.html`
        }, {
            "@type": "ListItem",
            "position": 3,
            "name": "Tags",
            "item": `${SITE_URL}/blogs/tags/` // Optional index if exists, otherwise just a path
        }, {
            "@type": "ListItem",
            "position": 4,
            "name": tagData.name,
            "item": tagUrl
        }]
    };

    // CollectionPage Schema
    const collectionLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${tagData.name} Articles`,
        "description": tagDescription,
        "url": tagUrl,
        "author": {
            "@type": "Person",
            "name": "Shankar Aryal",
            "url": "https://www.shankararyal404.com.np"
        },
        "numberOfItems": tagData.posts.length,
        "itemListElement": tagData.posts.map((post, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "url": `${SITE_URL}/blogs/${post.slug}.html`
        }))
    };

    const jsonLd = [breadcrumbLd, collectionLd];

    const fullHtml = renderPage(
        tagHtml,
        `${tagData.name} Articles | Shankar Aryal`,
        tagDescription,
        `${SITE_URL}/assets/images/default-cover.webp`,
        'website',
        tagUrl,
        jsonLd,
        tagData.name
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
// 3. Process Index
// Data moved to top of file


// Hero Section with Stats and Premium Layout
const heroHtml = `
    <span class="hero-subtitle">Hello, I'm</span>
    <h1 class="h1 hero-title">${hero.name}</h1>
    <h2 class="h2 hero-role">Building Digital Excellence</h2>
    <p class="hero-desc">${hero.description}</p>
    
    <div class="hero-stats">
        <div class="stat-item">
            <span class="stat-num">${projects.filter(p => p.published).length}+</span>
            <span class="stat-label">Projects</span>
        </div>
         <div class="stat-divider"></div>
        <div class="stat-item">
            <span class="stat-num">${skills.length}+</span>
            <span class="stat-label">Skills</span>
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
                <a href="/assets/resume.pdf" target="_blank" class="icon-btn">
                    <ion-icon name="print-outline"></ion-icon>
                    <span class="btn-text">Resume</span>
                </a>
                <a href="#" class="icon-btn">
                    <ion-icon name="globe-outline"></ion-icon>
                    <span class="btn-text">Website</span>
                </a>
                <a href="#skills" class="icon-btn">
                    <ion-icon name="code-slash-outline"></ion-icon>
                    <span class="btn-text">Skills</span>
                </a>
            </div>
        </div>
    </div>
`;

// About Section with Collage and Floating Icons
const aboutHtml = `
    <div class="about-collage">
        <div class="about-img-main">
            <img src="${about.images && about.images[0] ? about.images[0] : about.image}" alt="Working">
            <div class="floating-icon icon-react"><ion-icon name="logo-react"></ion-icon></div>
            <div class="floating-icon icon-python"><ion-icon name="logo-python"></ion-icon></div>
            <div class="floating-icon icon-angular"><ion-icon name="logo-angular"></ion-icon></div>
        </div>
        <div class="about-img-sub">
             <img src="${about.images && about.images[1] ? about.images[1] : (hero.profileImage || 'https://via.placeholder.com/150')}" alt="Profile">
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

// Skills (Grouped from Flat List)
const skillCategories = {};
skills.forEach(skill => {
    if (!skillCategories[skill.category]) skillCategories[skill.category] = [];
    skillCategories[skill.category].push(skill);
});

const skillsHtml = Object.keys(skillCategories).map(cat => `
    <div class="skill-category">
        <h3 class="h4" style="margin-bottom: 20px; color: var(--text-muted);">${cat}</h3>
        <div class="skill-list">
            ${skillCategories[cat].map(item => {
    const percentage = item.level === 'Advanced' ? '90%' : item.level === 'Intermediate' ? '70%' : '45%';
    return `
                <div class="skill-item" data-level="${item.level.toLowerCase()}">
                    <div class="skill-info">
                        <span class="skill-name">${item.name}</span>
                        <span class="skill-level-text">${item.level}</span>
                    </div>
                    <div class="skill-bar">
                        <div class="skill-progress" style="width: ${percentage};"></div>
                    </div>
                </div>`;
}).join('')}
        </div>
    </div>
`).join('');

// Education
const educationHtml = `
    <div class="timeline">
        ${education.map(edu => `
            <div class="timeline-item reveal">
                <div class="timeline-dot ${edu.isCurrent ? 'current' : ''}"></div>
                <div class="timeline-date">${edu.startDate} – ${edu.endDate}</div>
                <div class="timeline-content glass-panel">
                    <h3 class="h3">${edu.degree}</h3>
                    <h4 class="h4" style="color: var(--primary);">
                        ${edu.url ? `<a href="${edu.url}" target="_blank" style="color:inherit; text-decoration:none;">${edu.institution}</a>` : edu.institution}
                    </h4>
                    <p style="margin-top: 5px; font-style: italic; color: var(--manatee);">${edu.description || ''}</p>
                    <ul style="margin-top: 10px; padding-left: 20px;">
                        ${(edu.details || []).map(d => `<li>${d}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('')}
    </div>
`;

// Projects (Updated Schema)
const projectsHtml = projects.filter(p => p.published).map(p => `
    <div class="project-card reveal">
        <img src="${p.image}" alt="${p.title}" class="project-bg-img" loading="lazy">
        <div class="project-content-overlay">
            <h3 class="h3 project-title">${p.title}</h3>
            <p class="project-desc">${p.description}</p>
            <div class="project-tags">
                ${(p.tags || []).map(t => `<span class="tech-pill">${t}</span>`).join('')}
            </div>
            <div class="project-links" style="margin-top: 20px; display:flex; gap:10px;">
                ${p.link ? `
                <a href="${p.link}" class="project-link-btn" target="_blank">
                    Live Demo <ion-icon name="arrow-forward-outline"></ion-icon>
                </a>` : ''}
                ${p.articleLink ? `
                <a href="${p.articleLink}" class="project-link-btn secondary" target="_blank">
                    Read Article <ion-icon name="book-outline"></ion-icon>
                </a>` : ''}
            </div>
        </div>
        ${p.featured ? '<div class="featured-badge">Featured</div>' : ''}
    </div>
`).join('');

// Technologies
const technologiesHtml = technologies.map(t => `
    <div class="tech-item" style="text-align: center; margin: 10px; min-width: 80px;">
        <div class="tech-icon-circle" style="
            width: 60px; height: 60px; 
            background: var(--gunmetal); 
            border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; 
            margin: 0 auto 10px;
            font-size: 2rem;
            color: var(--primary);
            border: 1px solid var(--independence);
        ">
            ${t.icon ? `<ion-icon name="${t.icon}"></ion-icon>` : t.name[0]}
        </div>
        <span class="tech-name" style="color: var(--cadet-blue-crayola); font-size: 0.9rem;">${t.name}</span>
    </div>
`).join('');

const certsHtml = certs.filter(c => c.published).map(c => `
    <div class="certificate-card reveal">
         <img src="${c.image}" alt="${c.title}" class="cert-img">
         <div class="cert-content">
            <h3 class="h3">${c.title}</h3>
            <p>${c.issuer}</p>
            ${c.link && c.link !== '#' ? `<a href="${c.link}" target="_blank" class="credential-link" style="color: var(--primary); font-size: 0.9rem; margin-top: 10px; display: inline-flex; align-items: center; gap: 5px;">View Credential <ion-icon name="open-outline"></ion-icon></a>` : ''}
         </div>
    </div>
`).join('');

const latestBlogsHtml = blogs.slice(0, 3).map(post => {
    return blogCardTemplate
        .replaceAll('{{POST_IMAGE}}', post.image)
        .replaceAll('{{POST_TITLE}}', post.title)
        .replaceAll('{{POST_SLUG}}', post.slug)
        .replaceAll('{{POST_SUBDIRECTORY}}', post.subdirectory || 'blogs')
        .replaceAll('{{POST_CATEGORY}}', post.category)
        .replaceAll('{{POST_CATEGORY_SLUG}}', post.category.toLowerCase().replace(/ /g, '-'))
        .replaceAll('{{POST_DATE}}', post.date)
        .replaceAll('{{POST_EXCERPT}}', post.excerpt || '')
        .replaceAll('{{POST_TAGS}}', (post.tags || []).join(', ').toLowerCase());
}).join('');

let indexContent = indexContentTemplate
    .replace('{{HERO_CONTENT}}', heroHtml)
    .replace('{{HERO_IMAGE}}', heroImageHtml)
    .replace('{{ABOUT_CONTENT}}', aboutHtml)
    .replace('{{EDUCATION_LIST}}', educationHtml)
    .replace('{{SKILLS_LIST}}', skillsHtml)
    .replace('{{TECHNOLOGIES_LIST}}', technologiesHtml)
    .replace('{{CERTIFICATES_LIST}}', certsHtml)
    .replace('{{PROJECTS_LIST}}', projectsHtml)
    .replace('{{LATEST_BLOGS}}', latestBlogsHtml);

const personLd = {
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

const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Shankar Aryal Portfolio",
    "url": SITE_URL,
    "author": {
        "@type": "Person",
        "name": "Shankar Aryal"
    }
};

const indexJsonLd = [personLd, websiteLd];

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
// Sitemap Rules: Only published, indexable pages. Strict exclusions.
const sitemapBlogs = blogs.filter(b => b.published && !b.noindex);
const sitemapTags = Object.keys(tagsMap); // Tags are indexable by default, assume noindex check if needed later

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${SITE_URL}/</loc>
        <priority>1.0</priority>
        <changefreq>daily</changefreq>
    </url>
    <url>
        <loc>${SITE_URL}/blogs/index.html</loc>
        <priority>0.8</priority>
        <changefreq>daily</changefreq>
    </url>
    ${sitemapBlogs.map(b => `
    <url>
        <loc>${b.url}</loc>
        <lastmod>${new Date(b.lastModified || b.date).toISOString()}</lastmod>
        <priority>0.7</priority>
    </url>`).join('')}
    ${sitemapTags.map(t => `
    <url>
        <loc>${SITE_URL}/blogs/tags/${t.replace(/ /g, '-')}.html</loc>
        <priority>0.5</priority>
    </url>`).join('')}
</urlset>`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemap);
console.log('Generated: sitemap.xml');

// Robots.txt: Strict Blocking
const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /assets/css/
Disallow: /assets/js/
# Keep images visible for Google Images
Allow: /assets/images/

Sitemap: ${SITE_URL}/sitemap.xml`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), robots);
console.log('Generated: robots.txt with strict rules');

// 5. Copy Static Assets (Assets, Admin, Favicon)
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Copy Assets
if (fs.existsSync('assets')) {
    console.log('Copying assets...');
    copyDir('assets', path.join(OUTPUT_DIR, 'assets'));
}

// Copy Admin
if (fs.existsSync('admin')) {
    console.log('Copying admin panel...');
    copyDir('admin', path.join(OUTPUT_DIR, 'admin'));
}

// Ensure 404.html exists in output (either generated or copied)
if (!fs.existsSync(path.join(OUTPUT_DIR, '404.html')) && fs.existsSync('404.html')) {
    fs.copyFileSync('404.html', path.join(OUTPUT_DIR, '404.html'));
    console.log('Copied root 404.html to public/');
}

// Copy Favicons
const favicons = ['favicon.ico', 'favicon.svg'];
favicons.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(OUTPUT_DIR, file));
    }
});
