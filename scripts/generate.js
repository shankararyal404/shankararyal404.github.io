import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import sharp from 'sharp';
// import yaml from 'js-yaml'; // Unused and missing dependency

// Custom Marked Renderer for Skeleton Loading & Responsive Images
const renderer = {
    image(href, title, text) {
        // Register for responsive processing
        const isExternal = href.startsWith('http') && !href.startsWith(SITE_URL);
        const cleanHref = href.replace(SITE_URL, '');
        const isStatic = cleanHref.endsWith('.avif') || cleanHref.endsWith('.webp') || cleanHref.endsWith('.png') || cleanHref.endsWith('.jpg');

        if (!isExternal && isStatic) {
            responsiveImages.add(cleanHref);
            const ext = path.extname(cleanHref);
            const base = cleanHref.substring(0, cleanHref.length - ext.length);
            const srcset = IMAGE_SIZES.map(s => `${base}-${s}w${ext} ${s}w`).join(', ');

            return `
            <div class="img-wrapper skeleton-box">
                <img src="${href}" 
                     alt="${text}" 
                     title="${title || ''}" 
                     srcset="${srcset}"
                     sizes="(max-width: 768px) 100vw, 800px"
                     loading="lazy" 
                     decoding="async" 
                     onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton-box');">
            </div>`;
        }

        return `
        <div class="img-wrapper skeleton-box">
            <img src="${href}" alt="${text}" title="${title || ''}" loading="lazy" decoding="async" onload="this.classList.add('loaded'); this.parentElement.classList.remove('skeleton-box');">
        </div>`;
    }
};

marked.use({ renderer });

const SITE_URL = process.env.SITE_URL || 'https://www.shankararyal404.com.np';
const FB_APP_ID = process.env.FB_APP_ID || '1190738489837282'; // User provided App ID
const CONTENT_DIR = 'content';
const TEMPLATE_DIR = 'templates';
const OUTPUT_DIR = 'public';

// Track all AVIF images that need a JPG fallback for social media
const imagesToConvert = new Set();
// Track all images that need responsive variants (webp/avif)
const responsiveImages = new Set();
const IMAGE_SIZES = [480, 800, 1200];

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
    // Clean specific generated folders to avoid ghost files
    const foldersToClean = ['blogs', 'blog-post'];
    foldersToClean.forEach(folder => {
        const fullPath = path.join(OUTPUT_DIR, folder);
        if (fs.existsSync(fullPath)) {
            fs.rmSync(fullPath, { recursive: true, force: true });
        }
    });
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

// Global SEO Metadata Constants
const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Shankar Aryal",
    "url": "https://www.shankararyal404.com.np/",
    "image": hero.profileImage ? getAbsoluteUrl(hero.profileImage) : "https://www.shankararyal404.com.np/assets/images/shankararyal.jpg",
    "sameAs": [
        "https://x.com/ShankarAryal404",
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

let footerLatestBlogsHtml = ''; // Will be populated after blogs are processed

// Helper: Get Image Dimensions (Async)
// Helper: Get Image Dimensions (Async)
async function getDimensions(src) {
    if (!src || src.startsWith('http') || src.startsWith('//')) return null;
    try {
        const cleanSrc = src.split('?')[0];
        const relativePath = cleanSrc.startsWith('/') ? cleanSrc.slice(1) : cleanSrc;

        // 1. Try Source (Preferred)
        const sourcePath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(sourcePath)) {
            const metadata = await sharp(sourcePath).metadata();
            return { width: metadata.width, height: metadata.height };
        }

        // 2. Try Public (Fallback)
        const publicPath = path.join(process.cwd(), 'public', relativePath);
        if (fs.existsSync(publicPath)) {
            const metadata = await sharp(publicPath).metadata();
            return { width: metadata.width, height: metadata.height };
        }
    } catch (e) {
        console.warn('Could not get dimensions for', src, e.message);
    }
    return null;
}

// Helper: Inject Dimensions into HTML (Async)
async function injectDimensions(html) {
    if (!html) return html;
    const imgRegex = /<img([^>]+)src=["']([^"']+)["']([^>]*)>/g;
    const matches = [...html.matchAll(imgRegex)];
    let newHtml = html;

    // Use a map to avoid multiple replaces of same string if needed,
    // but here we just replace strict matches.
    for (const match of matches) {
        const [fullTag, beforeSrc, src, afterSrc] = match;
        if (fullTag.includes('width=') && fullTag.includes('height=')) continue;

        const dims = await getDimensions(src);
        if (dims) {
            // Reconstruct tag with width/height
            // Check if width/height already partially exist
            let newAttrs = '';
            if (!fullTag.includes('width=')) newAttrs += ` width="${dims.width}"`;
            if (!fullTag.includes('height=')) newAttrs += ` height="${dims.height}"`;

            if (newAttrs) {
                const newTag = `<img${beforeSrc}src="${src}"${afterSrc}${newAttrs}>`;
                newHtml = newHtml.replace(fullTag, newTag);
            }
        }
    }
    return newHtml;
}

// Helper: Sanitize Meta Strings (SEO)
function sanitizeMeta(str) {
    if (!str) return '';
    return str
        .replace(/\r?\n|\r/g, ' ') // Replace newlines with space
        .replace(/\s+/g, ' ')      // Collapse multiple spaces
        .replace(/"/g, '&quot;')   // Escape quotes for attributes
        .trim();
}

// Helper: Ensure Absolute URL
function getAbsoluteUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${SITE_URL}${cleanUrl}`;
}

/**
 * Helper: Generate Optimized Image Tag
 * @param {string} src - Source path
 * @param {string} alt - Alt text
 * @param {object} options - attrs: obj, sizes: string, isLcp: bool
 */
async function generateOptimizedImageTag(src, alt, options = {}) {
    if (!src) return '';

    const isExternal = src.startsWith('http') && !src.startsWith(SITE_URL);
    const cleanSrc = src.replace(SITE_URL, '');
    const isStatic = cleanSrc.endsWith('.avif') || cleanSrc.endsWith('.webp') || cleanSrc.endsWith('.png') || cleanSrc.endsWith('.jpg');

    if (isExternal || !isStatic) {
        return `<img src="${src}" alt="${alt}" loading="${options.isLcp ? 'eager' : 'lazy'}" ${options.isLcp ? 'fetchpriority="high"' : 'decoding="async"'}>`;
    }

    // Add to responsive processing queue
    responsiveImages.add(cleanSrc);

    const dims = await getDimensions(cleanSrc);
    const widthAttr = dims ? ` width="${dims.width}"` : '';
    const heightAttr = dims ? ` height="${dims.height}"` : '';

    // Generate srcset
    const ext = path.extname(cleanSrc);
    const base = cleanSrc.substring(0, cleanSrc.length - ext.length);
    const srcset = IMAGE_SIZES.map(s => `${base}-${s}w${ext} ${s}w`).join(', ');
    const sizes = options.sizes || '(max-width: 1200px) 100vw, 1200px';

    return `
        <img src="${src}" 
             alt="${alt}" 
             srcset="${srcset}" 
             sizes="${sizes}"
             ${widthAttr}${heightAttr}
             loading="${options.isLcp ? 'eager' : 'lazy'}" 
             ${options.isLcp ? 'fetchpriority="high"' : 'decoding="async"'}
             class="${options.className || ''}">`.trim();
}

// Helper: Render Page (Async now)
async function renderPage(bodyHtml, pageTitle, metaDescription, metaImage, metaType = 'website', canonicalUrl = '', jsonLd = '', keywords = '', categoryCSSLink = '', robots = 'index, follow', metaImageAlt = '') {
    const cleanTitle = sanitizeMeta(pageTitle);
    const cleanDesc = sanitizeMeta(metaDescription);
    const cleanKeywords = sanitizeMeta(keywords);

    // Logic for Global Social Media Preview Fallback (AVIF/WEBP -> JPG)
    let finalMetaImage = metaImage;
    if (metaImage && (metaImage.endsWith('.avif') || metaImage.endsWith('.webp'))) {
        const isExternal = metaImage.startsWith('http') && !metaImage.startsWith(SITE_URL);

        if (!isExternal) {
            // Keep local path for tracking
            const localImage = metaImage.replace(SITE_URL, '');
            imagesToConvert.add(localImage);
            finalMetaImage = metaImage.replace(/\.(avif|webp)$/, '.jpg');
        }
    }
    const absImage = getAbsoluteUrl(finalMetaImage);

    let html = baseTemplate
        .replaceAll('{{TITLE}}', cleanTitle)
        .replaceAll('{{DESCRIPTION}}', cleanDesc)
        .replaceAll('{{KEYWORDS}}', cleanKeywords)
        .replaceAll('{{ROBOTS}}', robots)
        .replaceAll('{{CANONICAL}}', canonicalUrl)
        .replaceAll('{{OG_TYPE}}', metaType)
        .replaceAll('{{OG_TITLE}}', cleanTitle)
        .replaceAll('{{OG_DESCRIPTION}}', cleanDesc)
        .replaceAll('{{OG_IMAGE}}', absImage)
        .replaceAll('{{OG_IMAGE_ALT}}', sanitizeMeta(metaImageAlt || cleanTitle))
        .replaceAll('{{JSON_LD}}', jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '')
        .replaceAll('{{CATEGORY_CSS}}', categoryCSSLink)
        .replaceAll('{{CONTENT}}', bodyHtml)
        .replaceAll('{{YEAR}}', new Date().getFullYear())
        .replaceAll('{{SOCIAL_LINKS}}', (socialLinks || []).filter(s => s.visible).map(s => `
            <li><a href="${s.url}" target="_blank" class="social-link" title="${s.platform}"><ion-icon name="${s.icon}"></ion-icon></a></li>
        `).join(''))
        .replaceAll('{{FOOTER_BLOGS}}', footerLatestBlogsHtml || '<li>No blogs yet.</li>')
        .replaceAll('{{FB_APP_ID}}', FB_APP_ID);

    // Inject Dimensions before returning
    html = await injectDimensions(html);

    return html;
}

// 1. Process Blogs (Two-Pass Approach)
const blogsDir = path.join(CONTENT_DIR, 'blogs');
const blogFiles = fs.readdirSync(blogsDir).filter(f => f.endsWith('.md'));
const blogs = [];
const tagsMap = {};

// Import category utilities (Dynamic Import)
const { getCategorySlug } = await import('../lib/categories.js');

// PASS 1: Collect Metadata & Content (PARALLELIZED)
const formatDate = (date) => {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;
        return d.toISOString().split('T')[0];
    } catch (e) {
        return date;
    }
};

// Process all blog files in parallel
const blogPromises = blogFiles.map(async (file) => {
    const raw = fs.readFileSync(path.join(blogsDir, file), 'utf-8');
    const { data, content } = matter(raw);
    if (!data.published) return null;

    // Slug & Basic Data
    const slug = data.slug || file.replace('.md', '');
    const image = data.cover || data.image || `${SITE_URL}/assets/images/default-cover.webp`;

    // SEO & Classification
    const categorySlug = getCategorySlug(data.category);

    // Subdirectory Support
    const subdirectory = data.subdirectory || 'blogs';
    const url = `${SITE_URL}/${subdirectory}/${slug}.html`;

    // Date Logic
    const uploadDate = formatDate(data.date);
    const publishedDate = formatDate(data.original_date || data.date);
    const dateObj = new Date(uploadDate);

    return {
        ...data,
        slug,
        image,
        content,
        uploadDate,
        publishedDate,
        dateObj,
        categorySlug,
        subdirectory,
        url,
        raw
    };
});

// Wait for all blogs to be processed
const blogResults = await Promise.all(blogPromises);
blogs.push(...blogResults.filter(b => b !== null));

// Collect Tags (after blogs are loaded)
blogs.forEach(blog => {
    const allTags = [...(blog.tags || []), blog.category];
    allTags.forEach(tag => {
        if (!tag) return;
        const normalizedTag = tag.toLowerCase().trim();
        if (!tagsMap[normalizedTag]) tagsMap[normalizedTag] = { name: tag, posts: [] };
    });
});

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

// PASS 2: Generate Individual Pages (PARALLELIZED)
// Process blogs in batches to avoid overwhelming the system
const BATCH_SIZE = 5; // Process 5 blogs at a time

async function processBlog(blog) {
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

    // Calculate Read Time
    const wordCount = blog.content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200); // 200 words per minute

    const optimizedBlogImg = await generateOptimizedImageTag(blog.image, blog.title, { isLcp: true, className: "blog-banner" });

    // Prepare uniform render data
    const hasEn = !!(blog.reflection_en || blog.theme_en || blog.intro_en);
    const hasNe = !!(blog.reflection_ne || blog.theme_ne || blog.intro_ne);

    let renderData = {
        ...blog,
        BLOG_TITLE: blog.title,
        BLOG_SLUG: blog.slug,
        BLOG_DATE: blog.publishedDate,
        PUBLISHED_DATE: blog.publishedDate,
        UPLOAD_DATE: (blog.uploadDate !== blog.publishedDate) ? blog.uploadDate : '',
        BLOG_CATEGORY: blog.category,
        BLOG_CATEGORY_SLUG: blog.categorySlug,
        BLOG_IMAGE: blog.image,
        BLOG_IMAGE_TAG: optimizedBlogImg,
        BLOG_TAGS: (blog.tags || []).map(t => `<a href="/blogs/tags/${t.toLowerCase().replace(/ /g, '-')}.html" class="tag">${t}</a>`).join(', '),
        WRITTEN_BY: blog.written_by || '',
        PLACE: blog.place || '',
        PUBLISHER: blog.publisher || '',
        LITERATURE_TYPE: blog.type || '',
        READ_TIME: readTime,
        HAS_EN: hasEn,
        HAS_NE: hasNe,
        REFLECTION_EN: blog.reflection_en,
        REFLECTION_NE: blog.reflection_ne || blog.reflection,
        THEME_EN: blog.theme_en,
        THEME_NE: blog.theme_ne || blog.theme,
        INTRO_EN: blog.intro_en,
        INTRO_NE: blog.intro_ne,
        SITE_URL,
        URL: url,
        ENCODED_URL: encodeURIComponent(url),
        ENCODED_TITLE: encodeURIComponent(blog.title),
        INDEX_STATUS: indexStatus,
        CATEGORY_URL: categoryUrl
    };

    let blogHtml = blogTemplate;

    // 1. Handle Conditionals {{#KEY}}...{{/KEY}}
    blogHtml = blogHtml.replace(/{{\s*#(\w+)\s*}}([\s\S]*?){{\s*\/\1\s*}}/g, (match, key, innerContent) => {
        return renderData[key] ? innerContent : '';
    });

    // 2. Handle Placeholders {{KEY}} (Except BLOG_BODY)
    blogHtml = blogHtml.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
        if (key === 'BLOG_BODY') return match;
        const val = renderData[key];
        if (val === undefined) return match;
        if (typeof val === 'boolean') return val ? 'true' : 'false';
        return val;
    });

    // 3. Finally insert BLOG_BODY
    blogHtml = blogHtml.replaceAll('{{BLOG_BODY}}', htmlContent);
    blogHtml = blogHtml.replaceAll('{{COMMENTS_LIST}}', '');

    // ----------------------------------------------------
    // BLOG SUGGESTION ENGINE
    // ----------------------------------------------------
    const candidates = blogs.filter(b => b.slug !== blog.slug).map(b => {
        let score = 0;
        if (b.category === blog.category) score += 3;
        if (blog.tags && b.tags) {
            const shared = b.tags.filter(t => blog.tags.includes(t));
            score += shared.length;
        }
        return { blog: b, score };
    });

    candidates.sort((a, b) => b.score - a.score);

    let topN = candidates.slice(0, 6);
    for (let i = topN.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [topN[i], topN[j]] = [topN[j], topN[i]];
    }
    const suggestions = topN.slice(0, 3).map(c => c.blog);

    const suggestionHtmlList = await Promise.all(suggestions.map(async s => {
        const optimizedImg = await generateOptimizedImageTag(s.image, s.title, { className: "blog-banner", sizes: "(max-width: 768px) 100vw, 400px" });
        return blogCardTemplate
            .replaceAll('{{POST_IMAGE}}', optimizedImg)
            .replaceAll('{{POST_TITLE}}', s.title)
            .replaceAll('{{POST_SLUG}}', s.slug)
            .replaceAll('{{POST_SUBDIRECTORY}}', s.subdirectory || 'blogs')
            .replaceAll('{{POST_CATEGORY}}', s.category)
            .replaceAll('{{POST_CATEGORY_SLUG}}', s.category.toLowerCase().replace(/ /g, '-'))
            .replaceAll('{{POST_DATE}}', s.publishedDate)
            .replaceAll('{{POST_EXCERPT}}', s.excerpt || '')
            .replaceAll('{{POST_TAGS}}', (s.tags || []).join(', ').toLowerCase());
    }));
    let suggestionHtml = '';
    if (suggestions.length > 0) {
        suggestionHtml = `
            <div class="blog-suggestions" style="margin-top: 60px; padding-top: 40px; border-top: 1px solid var(--white-alpha-10);">
                <h3 class="" style="margin-bottom: 25px; font-size: 1.5rem;">Recommended for you</h3>
                <div class="suggestion-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                    ${suggestionHtmlList.join('')}
                </div>
            </div>`;
    }

    if (blogHtml.includes('</article>')) {
        blogHtml = blogHtml.replace('</article>', `${suggestionHtml}</article>`);
    } else {
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
            "datePublished": blog.publishedDate,
            "author": { "@type": "Person", "name": "Shankar Aryal" },
            "mainEntityOfPage": { "@type": "WebPage", "@id": url }
        }
    ];

    const categoryCSSLink = `<link rel="stylesheet" href="/assets/css/blog/${blog.categorySlug}.css?v=${Date.now()}">`;

    const fullHtml = await renderPage(
        blogHtml,
        `${blog.title} | Shankar Aryal`,
        blog.excerpt || '',
        blog.image,
        'article',
        url,
        jsonLd,
        keywords,
        categoryCSSLink,
        indexStatus,
        blog.title
    );

    const outputSubDir = path.join(OUTPUT_DIR, blog.subdirectory);
    if (!fs.existsSync(outputSubDir)) fs.mkdirSync(outputSubDir, { recursive: true });

    fs.writeFileSync(path.join(outputSubDir, `${blog.slug}.html`), fullHtml);
    console.log(`Generated: ${blog.subdirectory}/${blog.slug}.html`);
}

// Process blogs in parallel batches
for (let i = 0; i < blogs.length; i += BATCH_SIZE) {
    const batch = blogs.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(blog => processBlog(blog)));
    console.log(`[Build] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(blogs.length / BATCH_SIZE)}`);
}

// 1.5 Generate Blog Index (Listing Page)
const allBlogsListHtmlList = await Promise.all(blogs.map(async post => {
    const optimizedImg = await generateOptimizedImageTag(post.image, post.title, { className: "blog-banner", sizes: "(max-width: 768px) 100vw, 400px" });
    return blogCardTemplate
        .replaceAll('{{POST_IMAGE}}', optimizedImg)
        .replaceAll('{{POST_TITLE}}', post.title)
        .replaceAll('{{POST_SLUG}}', post.slug)
        .replaceAll('{{POST_SUBDIRECTORY}}', post.subdirectory || 'blogs')
        .replaceAll('{{POST_CATEGORY}}', post.category)
        .replaceAll('{{POST_CATEGORY_SLUG}}', post.category.toLowerCase().replace(/ /g, '-'))
        .replaceAll('{{POST_DATE}}', post.publishedDate)
        .replaceAll('{{POST_EXCERPT}}', post.excerpt || '')
        .replaceAll('{{POST_TAGS}}', (post.tags || []).join(', ').toLowerCase());
}));
const allBlogsListHtml = allBlogsListHtmlList.join('');

const blogIndexHtml = blogIndexTemplate
    .replaceAll('{{BLOG_LIST}}', allBlogsListHtml)
    .replaceAll('{{PAGINATION}}', '') // Pagination logic can be added later
    // In case user wants to filter
    .replaceAll('{{TAG_CLOUD}}', '');

const fullBlogIndexHtml = await renderPage(
    blogIndexHtml,
    `All Blogs | Shankar Aryal`,
    `Read all articles, tutorials, and insights by Shankar Aryal.`,
    `/assets/images/shankararyal/shankararyal.avif`,
    'website',
    `${SITE_URL}/blogs/index.html`,
    [websiteLd],
    "Shankar Aryal, blog, articles, Technology, Literature, web development",
    '',
    'index, follow',
    "Shankar Aryal's Blog Index - All Articles"
);

fs.writeFileSync(path.join(OUTPUT_DIR, 'blogs', 'index.html'), fullBlogIndexHtml);
console.log(`Generated: blogs/index.html`);

// 2. Process Tags
// (Directory created at startup)

for (const tagData of Object.values(tagsMap)) {
    const tagSlug = tagData.name.toLowerCase().replace(/ /g, '-');
    const tagUrl = `${SITE_URL}/blogs/tags/${tagSlug}.html`;

    // Determine Tag Layout Class
    let tagLayoutClass = 'tag-layout-default';
    const lowerName = tagData.name.toLowerCase();
    if (lowerName.includes('poem')) tagLayoutClass = 'tag-layout-poem';
    else if (lowerName.includes('tech') || lowerName.includes('code') || lowerName.includes('cyber')) tagLayoutClass = 'tag-layout-tech';
    else if (lowerName.includes('thought') || lowerName.includes('opinion')) tagLayoutClass = 'tag-layout-thoughts';
    else if (lowerName.includes('security')) tagLayoutClass = 'tag-layout-security';

    const blogListHtmlList = await Promise.all(tagData.posts.map(async post => {
        const optimizedImg = await generateOptimizedImageTag(post.image, post.title, { className: "blog-banner", sizes: "(max-width: 768px) 100vw, 400px" });
        return blogCardTemplate
            .replaceAll('{{POST_IMAGE}}', optimizedImg)
            .replaceAll('{{POST_TITLE}}', post.title)
            .replaceAll('{{POST_SLUG}}', post.slug)
            .replaceAll('{{POST_SUBDIRECTORY}}', post.subdirectory || 'blogs')
            .replaceAll('{{POST_CATEGORY}}', post.category)
            .replaceAll('{{POST_CATEGORY_SLUG}}', post.category.toLowerCase().replace(/ /g, '-'))
            .replaceAll('{{POST_DATE}}', post.publishedDate)
            .replaceAll('{{POST_EXCERPT}}', post.excerpt || '')
            .replaceAll('{{POST_TAGS}}', (post.tags || []).join(', ').toLowerCase());
    }));
    const blogListHtml = blogListHtmlList.join('');

    const tagHtml = tagPageTemplate
        .replaceAll('{{TAG_NAME}}', tagData.name)
        .replaceAll('{{POST_COUNT}}', tagData.posts.length)
        .replaceAll('{{BLOG_LIST}}', blogListHtml)
        .replaceAll('{{TAG_CLASS}}', tagLayoutClass);

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

    const fullHtml = await renderPage(
        tagHtml,
        `${tagData.name} Articles | Shankar Aryal`,
        tagDescription,
        `/assets/images/shankararyal/shankararyal.avif`,
        'website',
        tagUrl,
        jsonLd,
        tagData.name,
        '',
        'index, follow',
        `Blog articles tagged with ${tagData.name}`
    );

    fs.writeFileSync(path.join(tagsOutputDir, `${tagSlug}.html`), fullHtml);
    console.log(`Generated: blogs/tags/${tagSlug}.html`);
}

// 2.5 Process Static Pages (Privacy, 404, etc)
const pagesDir = path.join(CONTENT_DIR, 'pages');
if (fs.existsSync(pagesDir)) {
    const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.md'));
    for (const file of pageFiles) {
        const raw = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
        const { data, content } = matter(raw);
        const htmlContent = marked.parse(content);

        const pageHtml = staticPageTemplate
            .replaceAll('{{PAGE_TITLE}}', data.title)
            .replaceAll('{{PAGE_CONTENT}}', htmlContent);

        const slug = file.replace('.md', '');
        const outputName = slug === '404' ? '404.html' : `${slug}.html`;

        const fullHtml = await renderPage(
            pageHtml,
            `${data.title} | Shankar Aryal`,
            data.description || data.title,
            `/assets/images/shankararyal/shankararyal.avif`,
            'website',
            `${SITE_URL}/${outputName}`,
            [websiteLd],
            data.keywords || '',
            '',
            'index, follow',
            data.title
        );

        fs.writeFileSync(path.join(OUTPUT_DIR, outputName), fullHtml);
        console.log(`Generated: ${outputName}`);
    }
}

// 3. Process Index
// 3. Process Index
// Data moved to top of file


// Hero Section with Stats and Premium Layout
const heroHtml = `
    <span class="hero-subtitle">Hello, I'm</span>
    <h1 class="h1 hero-title"><span class="text-gradient">Shankar</span>Aryal</h1>
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
const optimizedHeroImg = await generateOptimizedImageTag(hero.profileImage || about.image, "Shankar Aryal", { isLcp: true, className: "hero-main-img" });
const heroImageHtml = `
    <div class="hero-card-wrapper">
        <div class="hero-card">
            <div class="badge-student">Engineering Student</div>
            ${optimizedHeroImg}
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
const aboutImg1 = await generateOptimizedImageTag(about.images && about.images[0] ? about.images[0] : about.image, "Working", { sizes: "(max-width: 768px) 100vw, 400px" });
const aboutImg2 = await generateOptimizedImageTag(about.images && about.images[1] ? about.images[1] : (hero.profileImage || 'https://via.placeholder.com/150'), "Profile", { sizes: "(max-width: 768px) 100vw, 200px" });

const aboutHtml = `
    <div class="about-collage">
        <div class="about-img-main">
            ${aboutImg1}
            <div class="floating-icon icon-react"><ion-icon name="logo-react"></ion-icon></div>
            <div class="floating-icon icon-python"><ion-icon name="logo-python"></ion-icon></div>
            <div class="floating-icon icon-angular"><ion-icon name="logo-angular"></ion-icon></div>
        </div>
        <div class="about-img-sub">
             ${aboutImg2}
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
const projectsHtmlList = await Promise.all(projects.filter(p => p.published).map(async p => {
    const optimizedImg = await generateOptimizedImageTag(p.image, p.title, { className: "project-bg-img", sizes: "(max-width: 768px) 100vw, 400px" });
    return `
    <div class="project-card reveal">
        ${optimizedImg}
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
`;
}));
const projectsHtml = projectsHtmlList.join('');

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

const certsHtmlList = await Promise.all(certs.filter(c => c.published).map(async c => {
    const optimizedImg = await generateOptimizedImageTag(c.image, c.title, { className: "cert-img", sizes: "(max-width: 768px) 100vw, 400px" });
    return `
    <div class="certificate-card reveal">
         ${optimizedImg}
         <div class="cert-content">
            <h3 class="h3">${c.title}</h3>
            <p>${c.issuer}</p>
            ${c.link && c.link !== '#' ? `<a href="${c.link}" target="_blank" class="credential-link" style="color: var(--primary); font-size: 0.9rem; margin-top: 10px; display: inline-flex; align-items: center; gap: 5px;">View Credential <ion-icon name="open-outline"></ion-icon></a>` : ''}
         </div>
    </div>
`;
}));
const certsHtml = certsHtmlList.join('');

const latestBlogsHtmlList = await Promise.all(blogs.slice(0, 3).map(async post => {
    const optimizedImg = await generateOptimizedImageTag(post.image, post.title, { className: "blog-banner", sizes: "(max-width: 768px) 100vw, 400px" });
    return blogCardTemplate
        .replaceAll('{{POST_IMAGE}}', optimizedImg)
        .replaceAll('{{POST_TITLE}}', post.title)
        .replaceAll('{{POST_SLUG}}', post.slug)
        .replaceAll('{{POST_SUBDIRECTORY}}', post.subdirectory || 'blogs')
        .replaceAll('{{POST_CATEGORY}}', post.category)
        .replaceAll('{{POST_CATEGORY_SLUG}}', post.category.toLowerCase().replace(/ /g, '-'))
        .replaceAll('{{POST_DATE}}', post.date)
        .replaceAll('{{POST_EXCERPT}}', post.excerpt || '')
        .replaceAll('{{POST_TAGS}}', (post.tags || []).join(', ').toLowerCase());
}));
const latestBlogsHtml = latestBlogsHtmlList.join('');

// 3. Process Index
// Index content is built using variables defined in the Premium Sections above
let indexContent = indexContentTemplate
    .replaceAll('{{HERO_CONTENT}}', heroHtml)
    .replaceAll('{{HERO_IMAGE}}', heroImageHtml)
    .replaceAll('{{ABOUT_CONTENT}}', aboutHtml)
    .replaceAll('{{EDUCATION_LIST}}', educationHtml)
    .replaceAll('{{SKILLS_LIST}}', skillsHtml)
    .replaceAll('{{TECHNOLOGIES_LIST}}', technologiesHtml)
    .replaceAll('{{CERTIFICATES_LIST}}', certsHtml)
    .replaceAll('{{PROJECTS_LIST}}', projectsHtml)
    .replaceAll('{{LATEST_BLOGS}}', latestBlogsHtml);

const indexFullHtml = await renderPage(
    indexContent,
    "Shankar Aryal | Electrical Engineer & Full Stack Developer",
    "Shankar Aryal - Electrical Engineer & Full Stack Developer from Nepal. Explore my innovative projects and portfolio showcasing my skills!",
    hero.profileImage || "/assets/images/shankararyal/shankararyal.avif",
    'website',
    SITE_URL.endsWith('/') ? SITE_URL : SITE_URL + '/',
    indexJsonLd,
    "Shankar Aryal, Electrical Engineering, Full Stack Developer, Python, portfolio, web development, LearnMe, QuantumShield, ShadowStrike, Nepal",
    '',
    'index, follow',
    "Shankar Aryal - Electrical Engineer & Full Stack Developer Profile"
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

// Robots.txt: Strict Blocking & AI Protection
const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /assets/css/
Disallow: /assets/js/
# Keep images visible for Google Images
Allow: /assets/images/

# Block AI Bots & Scrapers
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: OmgilibBot
Disallow: /

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

// Copy Favicons & Web Manifest
const favicons = ['favicon.ico', 'favicon.svg', 'site.webmanifest'];
favicons.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(OUTPUT_DIR, file));
    }
});

// Generate High-Res PNG Favicons (Standard for Bing/Apple/Android)
const pngFavicons = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon.png', size: 192 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'apple-touch-icon-152x152.png', size: 152 },
    { name: 'apple-touch-icon-167x167.png', size: 167 },
    { name: 'mstile-144x144.png', size: 144 }
];

console.log(`[Favicon] Generating PNG icons for better compatibility...`);
for (const icon of pngFavicons) {
    try {
        const source = fs.existsSync('favicon.svg') ? 'favicon.svg' : 'favicon.ico';
        await sharp(source)
            .resize(icon.size, icon.size)
            .png()
            .toFile(path.join(OUTPUT_DIR, icon.name));
    } catch (e) {
        console.warn(`[Favicon] Failed to generate ${icon.name}:`, e.message);
    }
}

// Post-Build: Generate Social Media Fallbacks (JPG) into the output directory
console.log(`[Social] Generating ${imagesToConvert.size} compatibility JPG fallback(s)...`);
for (const originalAvif of imagesToConvert) {
    try {
        const relPathAVIF = originalAvif.startsWith('/') ? originalAvif.substring(1) : originalAvif;
        const srcPathSource = path.join(process.cwd(), relPathAVIF);

        const relPathJPG = relPathAVIF.replace(/\.(avif|webp)$/, '.jpg');
        const destPathPublic = path.join(OUTPUT_DIR, relPathJPG);

        if (fs.existsSync(srcPathSource)) {
            // Special Exception: Manual Override for profile image
            // Only skip for shankararyal image because the user has a custom crop
            if (relPathAVIF.includes('shankararyal/shankararyal.')) {
                const srcPathJPG = srcPathSource.replace(/\.(avif|webp)$/, '.jpg');
                if (fs.existsSync(srcPathJPG)) {
                    console.log(`[Social] Using manual override for ${relPathAVIF} (as requested)`);
                    continue;
                }
            }

            // Ensure parent directory in public exists
            const destDir = path.dirname(destPathPublic);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

            await sharp(srcPathSource)
                .resize(1200, 630, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 85, progressive: true })
                .toFile(destPathPublic);
        }
    } catch (e) {
        console.warn(`[Social] Failed to generate fallback for ${originalAvif}:`, e.message);
    }
}
console.log('[Social] Done generating compatibility images.');

// Post-Build: Generate Responsive Image Variants
console.log(`[Images] Generating variants for ${responsiveImages.size} images...`);
for (const originalImg of responsiveImages) {
    try {
        const relPath = originalImg.startsWith('/') ? originalImg.substring(1) : originalImg;
        const srcPath = path.join(process.cwd(), relPath);

        if (fs.existsSync(srcPath)) {
            const ext = path.extname(relPath);
            const base = relPath.substring(0, relPath.length - ext.length);

            for (const width of IMAGE_SIZES) {
                const destPath = path.join(OUTPUT_DIR, `${base}-${width}w${ext}`);
                const destDir = path.dirname(destPath);
                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

                const pipeline = sharp(srcPath).resize(width, null, { withoutEnlargement: true });

                if (ext === '.avif') pipeline.avif({ quality: 65 });
                else if (ext === '.webp') pipeline.webp({ quality: 75 });
                else if (ext === '.jpg' || ext === '.jpeg') pipeline.jpeg({ quality: 80, progressive: true });
                else if (ext === '.png') pipeline.png({ compressionLevel: 9 });

                await pipeline.toFile(destPath);
            }
        }
    } catch (e) {
        console.warn(`[Images] Failed to generate variants for ${originalImg}:`, e.message);
    }
}
console.log('[Images] Done generating responsive variants.');
