import { checkSession, logout } from './auth.js';

const API_BASE = '/api/admin';

// DOM Elements
const logoutBtn = document.getElementById('logout-btn');

// --- AUTH ---
logoutBtn.addEventListener('click', () => {
    logout();
});

// --- TABS ---
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// --- API HELPER ---
async function apiCall(endpoint, method = 'POST', body = {}) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json'
                // Cookie sent automatically
            },
            body: JSON.stringify(body)
        });
        if (res.status === 401) {
            window.location.href = '/admin/login.html';
            return null;
        }
        if (!res.ok) throw new Error('API Request Failed');
        return await res.json();
    } catch (err) {
        console.error(err);
        alert('Operation failed: ' + err.message);
        return null;
    }
}

// --- BLOGS ---
let allBlogs = [];
async function loadBlogs() {
    const res = await fetch('/api/blogs/all');
    allBlogs = await res.json();
    if (!Array.isArray(allBlogs)) allBlogs = [];

    const tbody = document.getElementById('blogs-list');
    tbody.innerHTML = allBlogs.map(b => `
        <tr>
            <td>${b.title}</td>
            <td>${b.category}</td>
            <td>${b.date || b.created_at || '-'}</td>
            <td>
                <button class="action-btn edit-btn" onclick="openEditBlog('${b.id || b.slug}')">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteItem('blogs', '${b.slug}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

window.openEditBlog = (idOrSlug) => {
    // Determine if slug or ID logic. Our GitHub backend uses 'slug' as key for blogs?
    // Blogs list returns { ...frontmatter, slug, content }.
    // Let's use slug as primary key for edit lookup.

    // Convert to string just in case
    const lookup = String(idOrSlug);
    const blog = allBlogs.find(b => String(b.id) === lookup || b.slug === lookup);

    if (!blog) return;

    // Use slug for ID field so update knows which file
    document.getElementById('blog-id').value = blog.slug || blog.id;
    document.getElementById('blog-title').value = blog.title;
    document.getElementById('blog-slug').value = blog.slug;
    document.getElementById('blog-category').value = blog.category;
    document.getElementById('blog-image').value = blog.cover || blog.image;
    document.getElementById('blog-excerpt').value = blog.excerpt;
    document.getElementById('blog-content').value = blog.content;
    document.getElementById('blog-modal-title').innerText = 'Edit Blog';

    document.getElementById('blog-modal').classList.add('open');
};

// Blog Form
const blogForm = document.getElementById('blog-form');
blogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('blog-id').value; // usage: key for update (slug)
    const data = {
        title: document.getElementById('blog-title').value,
        slug: document.getElementById('blog-slug').value,
        category: document.getElementById('blog-category').value,
        image: document.getElementById('blog-image').value,
        excerpt: document.getElementById('blog-excerpt').value,
        content: document.getElementById('blog-content').value,
    };

    if (id) {
        await apiCall('/blogs', 'PUT', data);
    } else {
        await apiCall('/blogs', 'POST', data);
    }
    window.closeModal('blog-modal');
    loadBlogs();
});

// --- PROJECTS ---
let allProjects = [];
async function loadProjects() {
    const res = await fetch('/api/projects/all');
    allProjects = await res.json();
    if (!Array.isArray(allProjects)) allProjects = [];

    const tbody = document.getElementById('projects-list');
    tbody.innerHTML = allProjects.map(p => `
        <tr>
            <td>${p.title}</td>
            <td>${Array.isArray(p.tags) ? p.tags.join(', ') : p.tags}</td>
            <td>${p.link}</td>
            <td>
               <button class="action-btn edit-btn" onclick="openEditProject(${p.id})">Edit</button>
               <button class="action-btn delete-btn" onclick="deleteItem('projects', ${p.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

window.openEditProject = (id) => {
    const project = allProjects.find(p => p.id === id);
    if (!project) return;

    document.getElementById('project-id').value = project.id;
    document.getElementById('project-title').value = project.title;
    document.getElementById('project-desc').value = project.description;
    document.getElementById('project-image').value = project.image;
    document.getElementById('project-link').value = project.link;
    document.getElementById('project-tags').value = Array.isArray(project.tags) ? project.tags.join(', ') : project.tags;
    document.getElementById('project-modal-title').innerText = 'Edit Project';

    document.getElementById('project-modal').classList.add('open');
}

const projectForm = document.getElementById('project-form');
projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('project-id').value;
    const tags = document.getElementById('project-tags').value.split(',').map(t => t.trim());
    const data = {
        title: document.getElementById('project-title').value,
        description: document.getElementById('project-desc').value,
        image: document.getElementById('project-image').value,
        link: document.getElementById('project-link').value,
        tags: tags
    };

    if (id) {
        await apiCall('/projects', 'PUT', { id, ...data });
    } else {
        await apiCall('/projects', 'POST', data);
    }
    window.closeModal('project-modal');
    loadProjects();
});


// --- CERTIFICATES ---
let allCerts = [];
async function loadCertificates() {
    const res = await fetch('/api/certificates/all');
    allCerts = await res.json();
    if (!Array.isArray(allCerts)) allCerts = [];

    const tbody = document.getElementById('certificates-list');
    tbody.innerHTML = allCerts.map(c => `
        <tr>
            <td>${c.title}</td>
            <td>${c.issuer}</td>
            <td>${c.date}</td>
            <td>
               <button class="action-btn edit-btn" onclick="openEditCert(${c.id})">Edit</button>
               <button class="action-btn delete-btn" onclick="deleteItem('certificates', ${c.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

window.openEditCert = (id) => {
    const cert = allCerts.find(c => c.id === id);
    if (!cert) return;

    document.getElementById('cert-id').value = cert.id;
    document.getElementById('cert-title').value = cert.title;
    document.getElementById('cert-issuer').value = cert.issuer;
    document.getElementById('cert-date').value = cert.date;
    document.getElementById('cert-category').value = cert.category;
    document.getElementById('cert-image').value = cert.image;
    document.getElementById('cert-link').value = cert.link;
    document.getElementById('cert-modal-title').innerText = 'Edit Certificate';

    document.getElementById('certificate-modal').classList.add('open');
}

const certForm = document.getElementById('cert-form');
certForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cert-id').value;
    const data = {
        title: document.getElementById('cert-title').value,
        issuer: document.getElementById('cert-issuer').value,
        date: document.getElementById('cert-date').value,
        category: document.getElementById('cert-category').value,
        image: document.getElementById('cert-image').value,
        link: document.getElementById('cert-link').value,
    };

    if (id) {
        await apiCall('/certificates', 'PUT', { id, ...data });
    } else {
        await apiCall('/certificates', 'POST', data);
    }
    window.closeModal('certificate-modal');
    loadCertificates();
});


// --- GLOBAL ACTIONS ---
window.deleteItem = async (type, idOrSlug) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    // Blogs use slug usually, others use ID. Pass usage appropriate param.
    // If type is blogs, endpoint expects { slug: ... }
    // If type is projects/certificates, endpoint expects { id: ... }

    const body = {};
    if (type === 'blogs') {
        body.slug = idOrSlug;
    } else {
        body.id = idOrSlug;
    }

    await apiCall(`/${type}`, 'DELETE', body);
    loadAllData();
};

// --- MODAL RESET ---
window.openModal = (id) => {
    document.getElementById(id).classList.add('open');
    if (id === 'blog-modal') {
        document.getElementById('blog-form').reset();
        document.getElementById('blog-id').value = '';
        document.getElementById('blog-modal-title').innerText = 'Add New Blog';
    }
    if (id === 'project-modal') {
        document.getElementById('project-form').reset();
        document.getElementById('project-id').value = '';
        document.getElementById('project-modal-title').innerText = 'Add New Project';
    }
    if (id === 'certificate-modal') {
        document.getElementById('cert-form').reset();
        document.getElementById('cert-id').value = '';
        document.getElementById('cert-modal-title').innerText = 'Add New Certificate';
    }
};

function loadAllData() {
    loadBlogs();
    loadProjects();
    loadCertificates();
}

// Init
// Check Auth first
checkSession().then(() => {
    loadAllData();
}).catch(() => {
    // Should have redirected by auth.js usually, but fallback
    window.location.href = '/admin/login.html';
});
