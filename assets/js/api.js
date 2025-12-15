/**
 * API Centralization Layer
 * Serves mock data for now, will switch to Firebase later.
 */

const USE_MOCK_DATA = true;

const MOCK_BLOGS = [
    {
        id: 1,
        title: "The Silence of the Night",
        date: "2025-01-10",
        slug: "silence-of-night",
        category: "Poem",
        excerpt: "A short poem about the tranquility of midnight hours.",
        content: "<p>The stars align in the velvet sky...</p>",
        image: "https://via.placeholder.com/600x400"
    },
    {
        id: 2,
        title: "Future of AI in Nepal",
        date: "2024-12-20",
        slug: "ai-in-nepal",
        category: "Technology",
        excerpt: "How Artificial Intelligence is shaping the tech landscape in Nepal.",
        content: "<p>AI adoption is growing rapidly...</p>",
        image: "https://via.placeholder.com/600x400"
    },
    {
        id: 3,
        title: "Why Minimalist Design Works",
        date: "2024-11-15",
        slug: "minimalist-design",
        category: "Opinion",
        excerpt: "My thoughts on why less is often more in web design.",
        content: "<p>Clutter confuses the user...</p>",
        image: "https://via.placeholder.com/600x400"
    },
    {
        id: 4,
        title: "Building this Portfolio",
        date: "2024-10-05",
        slug: "building-portfolio",
        category: "Project",
        excerpt: "A walkthrough of how I built this website from scratch.",
        content: "<p>It started with a blank HTML file...</p>",
        image: "https://via.placeholder.com/600x400"
    },
    {
        id: 5,
        title: "Random Thoughts on Coding",
        date: "2024-09-22",
        slug: "random-coding-thoughts",
        category: "Thoughts",
        excerpt: "Just some ramblings about the state of web dev.",
        content: "<p>Is React becoming too complex?...</p>",
        image: "https://via.placeholder.com/600x400"
    }
];

const MOCK_PROJECTS = [
    {
        id: 1,
        title: "Portfolio Website",
        description: "My personal portfolio website built with HTML/CSS.",
        image: "https://via.placeholder.com/400x300",
        link: "#",
        tags: ["HTML", "Result", "CSS"]
    },
    {
        id: 2,
        title: "E-commerce Dashboard",
        description: "Admin dashboard for an online store.",
        image: "https://via.placeholder.com/400x300",
        link: "#",
        tags: ["React", "Node.js"]
    }
];

const MOCK_CERTIFICATES = [
    {
        id: 1,
        title: "Google UX Design Professional Certificate",
        issuer: "Coursera",
        date: "2024-08-10",
        image: "https://via.placeholder.com/400x300",
        link: "#",
        category: "Design"
    },
    {
        id: 2,
        title: "Meta Front-End Developer",
        issuer: "Coursera",
        date: "2024-06-15",
        image: "https://via.placeholder.com/400x300",
        link: "#",
        category: "Development"
    },
    {
        id: 3,
        title: "AWS Certified Cloud Practitioner",
        issuer: "Amazon Web Services",
        date: "2024-03-20",
        image: "https://via.placeholder.com/400x300",
        link: "#",
        category: "Cloud"
    }
];

export async function getBlogs() {
    try {
        const response = await fetch('/api/blogs/all');
        if (!response.ok) throw new Error('Failed to fetch blogs');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        // Fallback or returned empty array
        return MOCK_BLOGS; // Keep mock as fallback for local dev without Vercel
    }
}

export async function getLatestBlogs() {
    try {
        const response = await fetch('/api/blogs/latest');
        if (!response.ok) throw new Error('Failed to fetch latest blogs');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        return MOCK_BLOGS.slice(0, 3);
    }
}

export async function getFeaturedProjects() {
    if (USE_MOCK_DATA) {
        return new Promise(resolve => setTimeout(() => resolve(MOCK_PROJECTS), 500));
    }
}

export async function getCertificates() {
    if (USE_MOCK_DATA) {
        return new Promise(resolve => setTimeout(() => resolve(MOCK_CERTIFICATES), 500));
    }
}

// Helpers used across pages
export function getCategoryClass(category) {
    const lower = category.toLowerCase();
    if (lower.includes('poem')) return 'tag-poem';
    if (lower.includes('thought')) return 'tag-thoughts';
    if (lower.includes('project')) return 'tag-project';
    if (lower.includes('tech') || lower.includes('education')) return 'tag-tech';
    if (lower.includes('opinion')) return 'tag-opinion';
    return 'tag-tech';
}

export function createBlogCard(blog, isPathRelative = false) {
    const basePath = isPathRelative ? '' : 'blogs/';
    const tagClass = getCategoryClass(blog.category);

    return `
    <div class="card">
      <div class="card-img-holder">
        <img src="${blog.image}" alt="${blog.title}">
      </div>
      <div class="card-content">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <span class="category-tag ${tagClass}">${blog.category}</span>
          <span class="card-date">${blog.date}</span>
        </div>
        <h3 class="h3 card-title">${blog.title}</h3>
        <p style="color: var(--manatee); margin-bottom: 20px; flex-grow: 1;">${blog.excerpt}</p>
        <a href="${basePath}blog.html?slug=${blog.slug}" class="btn-link" style="color: var(--primary); font-weight: 600; text-transform: uppercase; font-size: 1.4rem; letter-spacing: 1px;">Read More &rarr;</a>
      </div>
    </div>
  `;
}
