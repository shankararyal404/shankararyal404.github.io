import { renderNavbar, renderFooter } from './navbar.js';
import { getBlogs, getCategoryClass } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
    renderFooter();
    initBlogPost();
});

async function initBlogPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) {
        window.location.href = 'index.html';
        return;
    }

    const blogs = await getBlogs();
    const blog = blogs.find(b => b.slug === slug);

    if (!blog) {
        document.getElementById('blog-content').innerHTML = '<h2>Blog not found</h2><a href="index.html" class="btn btn-primary" style="margin-top: 20px; display: inline-block;">Go Back</a>';
        return;
    }

    document.title = blog.title + " | Shankar Aryal";
    const tagClass = getCategoryClass(blog.category);

    const contentDiv = document.getElementById('blog-content');
    contentDiv.className = 'glass-panel';
    contentDiv.style.padding = '40px';
    contentDiv.style.borderRadius = 'var(--radius-lg)';

    contentDiv.innerHTML = `
        <span class="category-tag ${tagClass}" style="margin-bottom: 20px;">${blog.category}</span>
        <h1 class="h1" style="margin-bottom: 20px; font-size: var(--fs-h1); line-height: 1.2;">${blog.title}</h1>
        <p style="color: var(--manatee); margin-bottom: 30px; display: flex; align-items: center; gap: 10px;">
           <span>📅 ${blog.date}</span>
        </p>
        <img src="${blog.image}" alt="${blog.title}" style="width: 100%; height: auto; border-radius: var(--radius-md); margin-bottom: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        
        <div class="content" style="font-size: 1.8rem; line-height: 1.8; color: var(--cadet-blue-crayola);">
          ${blog.content}
        </div>
        
        <hr style="margin-block: 40px; border-color: var(--glass-border);">
        
        <h3 class="h3">Comments</h3>
        <p style="margin-top: 10px; color: var(--manatee);">Comments section placeholder.</p>
      `;
}
