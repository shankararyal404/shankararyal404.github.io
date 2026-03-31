import { renderNavbar, renderFooter } from './navbar.js';
import { getBlogs, createBlogCard } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
    renderFooter();
    initBlogsWithLoad();
});

async function initBlogsWithLoad() {
    const blogs = await getBlogs();

    const blogGrid = document.getElementById('blog-grid');
    // Pass isPathRelative = true because we are in blogs/
    if (blogGrid) {
        blogGrid.innerHTML = blogs.map(b => createBlogCard(b, true)).join('');
    }
}
