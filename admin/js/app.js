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
// Now always targets /api/admin for write ops
async function apiCall(body = {}, method = 'POST') {
    try {
        const res = await fetch(`${API_BASE}`, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (res.status === 401) {
            window.location.href = '/admin/login.html';
            return null;
        }
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'API Request Failed');
        }
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
    // Public READ API (separate from Admin API)
    try {
        const res = await fetch('/api/blogs');
        const data = await res.json();
        allBlogs = data.blogs || [];
    } catch (e) {
        console.error("Failed to load blogs", e);
        allBlogs = [];
    }

    const activeBlogs = allBlogs.filter(b => b.published !== false);
    const archivedBlogs = allBlogs.filter(b => b.published === false);

    const tbody = document.getElementById('blogs-list');
    tbody.innerHTML = activeBlogs.map(b => `
        <tr>
            <td>${b.title}</td>
            <td>${b.category}</td>
            <td>${b.date || '-'}</td>
            <td>
                <button class="action-btn edit-btn" onclick="openEditBlog('${b.slug}')">Edit</button>
                <button class="action-btn delete-btn" style="background: var(--orange-soda);" onclick="deleteItem('blog', '${b.slug}')">Unpublish</button>
            </td>
        </tr>
    `).join('');

    const archiveBody = document.getElementById('archived-blogs-list');
    if (archiveBody) {
        archiveBody.innerHTML = archivedBlogs.map(b => `
            <tr>
                <td>${b.title}</td>
                <td>${b.unpublishedAt ? new Date(b.unpublishedAt).toLocaleDateString() : '-'}</td>
                <td>
                    <button class="action-btn edit-btn" style="background: var(--emerald);" onclick="republishBlog('${b.slug}')">Publish Back</button>
                    <button class="action-btn delete-btn" onclick="deleteItem('blog', '${b.slug}', true)">Delete Permanently</button>
                </td>
            </tr>
        `).join('');
    }
}

window.republishBlog = async (slug) => {
    if (!confirm('Republish this blog?')) return;

    // We update published to true and remove unpublishedAt
    await apiCall({
        type: 'blog',
        action: 'update', // Using PUT update
        slug: slug,
        data: {
            published: true,
            unpublishedAt: null
        }
    }, 'PUT');
    loadBlogs();
};

window.openEditBlog = (slug) => {
    const blog = allBlogs.find(b => b.slug === slug);
    if (!blog) return;

    document.getElementById('blog-id').value = blog.slug; // slug is key
    document.getElementById('blog-title').value = blog.title;
    document.getElementById('blog-slug').value = blog.slug;
    document.getElementById('blog-category').value = blog.category;
    document.getElementById('blog-image').value = blog.cover || blog.image;
    document.getElementById('blog-alt').value = blog.image_alt || '';
    updateImagePreview('blog', blog.cover || blog.image);
    document.getElementById('blog-excerpt').value = blog.excerpt || '';
    document.getElementById('blog-content').value = blog.content || ''; // Might need to fetch content if not in list
    document.getElementById('blog-modal-title').innerText = 'Edit Blog';

    // Set literature fields if applicable
    const literatureFields = document.getElementById('literature-fields');
    if (blog.category === 'Literature') {
        literatureFields.style.display = 'block';
        document.getElementById('lit-type').value = blog.type || '';
        document.getElementById('lit-written-by').value = blog.written_by || '';
        document.getElementById('lit-place').value = blog.place || '';
        document.getElementById('lit-publisher').value = blog.publisher || '';

        // Bilingual fields with fallbacks
        document.getElementById('lit-reflection-ne').value = blog.reflection_ne || blog.reflection || '';
        document.getElementById('lit-reflection-en').value = blog.reflection_en || '';

        document.getElementById('lit-theme-ne').value = blog.theme_ne || blog.theme || '';
        document.getElementById('lit-theme-en').value = blog.theme_en || '';

        document.getElementById('lit-intro-ne').value = blog.intro_ne || '';
        document.getElementById('lit-intro-en').value = blog.intro_en || '';
    } else {
        literatureFields.style.display = 'none';
    }

    document.getElementById('blog-modal').classList.add('open');
};

// Blog Form
const blogForm = document.getElementById('blog-form');

// Category change handler - show/hide literature fields
const categorySelect = document.getElementById('blog-category');
if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
        const literatureFields = document.getElementById('literature-fields');
        if (e.target.value === 'Literature') {
            literatureFields.style.display = 'block';
        } else {
            literatureFields.style.display = 'none';
        }
    });
}

blogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('blog-id').value;
    const category = document.getElementById('blog-category').value;

    const data = {
        title: document.getElementById('blog-title').value,
        slug: document.getElementById('blog-slug').value,
        category: category,
        image: document.getElementById('blog-image').value,
        image_alt: document.getElementById('blog-alt').value || '',
        excerpt: document.getElementById('blog-excerpt').value,
        tags: document.getElementById('blog-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        content: document.getElementById('blog-content').value
    };

    // Add literature-specific fields if category is Literature
    if (category === 'Literature') {
        data.type = document.getElementById('lit-type').value;
        data.written_by = document.getElementById('lit-written-by').value;
        data.place = document.getElementById('lit-place').value;
        data.publisher = document.getElementById('lit-publisher').value;

        // Save as individual fields
        data.reflection_ne = document.getElementById('lit-reflection-ne').value;
        data.reflection_en = document.getElementById('lit-reflection-en').value;

        data.theme_ne = document.getElementById('lit-theme-ne').value;
        data.theme_en = document.getElementById('lit-theme-en').value;

        data.intro_ne = document.getElementById('lit-intro-ne').value;
        data.intro_en = document.getElementById('lit-intro-en').value;
    }

    if (id) {
        // Update
        await apiCall({
            type: 'blog',
            action: 'update', // Optional, backend implies update by PUT but we can be explicit
            slug: id,
            data: data
        }, 'PUT');
    } else {
        // Create
        await apiCall({
            type: 'blog',
            action: 'create',
            data: data
        }, 'POST');
    }
    window.closeModal('blog-modal');
    loadBlogs();
});

// --- PROJECTS ---
// Projects are stored in projects.json
let allProjects = [];

async function loadProjects() {
    try {
        // Use the new GET support in api/admin
        // Helper to handle GET calls which might query params different than body
        // Only our apiCall helper was designed for POST/PUT logic. Let's fix apiCall or use direct fetch.
        // Direct fetch is easier here since apiCall hardcodes POST/PUT logic often.
        // Re-checking apiCall: it takes (body, method). 
        // Let's use direct fetch for GET to avoid body issues.
        const res = await fetch(`${API_BASE}?type=projects`);
        if (res.ok) {
            allProjects = await res.json();
        }
    } catch (e) {
        console.error("Failed to load projects", e);
    }

    const tbody = document.getElementById('projects-list');
    if (tbody) {
        tbody.innerHTML = allProjects.map(p => `
            <tr>
                <td>${p.title}</td>
                <td>${(p.tags || []).join(', ')}</td>
                <td>
                    ${p.link ? `<a href="${p.link}" target="_blank">Live</a>` : ''} 
                    ${p.articleLink ? `| <a href="${p.articleLink}">Article</a>` : ''}
                </td>
                <td>${p.status || 'Active'}</td>
                <td>${p.featured ? 'Featured' : '-'}</td>
                <td>
                     <button class="action-btn edit-btn" onclick="openEditItem('projects', '${p.id}')">Edit</button>
                     <button class="action-btn delete-btn" onclick="deleteItem('projects', '${p.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }
}

// Project Form Submit Handler
const projectForm = document.getElementById('project-form');
if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('project-id').value;
        const projectData = {
            id: id || 'proj-' + Date.now(),
            title: document.getElementById('project-title').value,
            description: document.getElementById('project-desc').value,
            image: document.getElementById('project-image').value,
            link: document.getElementById('project-link').value || '',
            articleLink: document.getElementById('project-articleLink').value || '',
            tags: document.getElementById('project-tags').value.split(',').map(t => t.trim()).filter(Boolean),
            status: document.getElementById('project-status').value,
            featured: document.getElementById('project-featured').checked,
            published: true
        };

        if (id) {
            const index = allProjects.findIndex(p => p.id == id);
            if (index !== -1) allProjects[index] = projectData;
        } else {
            allProjects.push(projectData);
        }

        const result = await apiCall({
            type: 'projects',
            data: allProjects
        }, 'PUT');

        if (result) {
            closeModal('project-modal');
            loadProjects();
        }
    });
}


// --- CERTIFICATES ---
let allCertificates = [];
async function loadCertificates() {
    try {
        const res = await fetch(`${API_BASE}?type=certificates`);
        if (res.ok) {
            allCertificates = await res.json();
        }
    } catch (e) {
        console.error("Failed to load certificates", e);
    }

    const tbody = document.getElementById('certificates-list');
    if (tbody) {
        tbody.innerHTML = allCertificates.map(c => `
            <tr>
                <td>${c.title}</td>
                <td>${c.issuer}</td>
                <td>${c.date}</td>
                <td>
                     <button class="action-btn delete-btn" onclick="deleteItem('certificates', '${c.title}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }
}

// Certificate Form Submit Handler
const certForm = document.getElementById('cert-form');
if (certForm) {
    certForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('cert-id').value;
        const certData = {
            id: id || Date.now(),
            title: document.getElementById('cert-title').value,
            issuer: document.getElementById('cert-issuer').value,
            date: document.getElementById('cert-date').value,
            category: document.getElementById('cert-category').value,
            image: document.getElementById('cert-image').value,
            link: document.getElementById('cert-link').value || '#',
            published: true
        };

        // Add or update certificate in the array
        if (id) {
            // Update existing
            const index = allCertificates.findIndex(c => c.id == id);
            if (index !== -1) {
                allCertificates[index] = certData;
            }
        } else {
            // Add new
            allCertificates.push(certData);
        }

        // Save to GitHub via API
        const result = await apiCall({
            type: 'certificates',
            data: allCertificates
        }, 'PUT');

        if (result) {
            alert('Certificate saved successfully!');
            closeModal('certificate-modal');
            loadCertificates();
        }
    });
}



// --- IMAGE UPLOAD LOGIC ---
window.handleFileUpload = async (input, section, type = 'cover') => {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB');
        input.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('section', section);

    if (section === 'blogs') {
        const category = document.getElementById('blog-category').value;
        const slug = document.getElementById('blog-slug').value;
        const title = document.getElementById('blog-title').value;

        let finalSlug = slug;
        if (!finalSlug && title) {
            finalSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            document.getElementById('blog-slug').value = finalSlug;
        }

        if (!category || !finalSlug) {
            alert('Please select a Category and ensure Title/Slug is filled before uploading.');
            input.value = '';
            return;
        }
        formData.append('category', category);
        formData.append('slug', finalSlug);
    }

    // Show Loading
    const prefix = section === 'certificates' ? 'cert' : section === 'blogs' ? 'blog' : 'project';
    const previewContainer = document.getElementById(`${prefix}-preview`);
    if (previewContainer) previewContainer.innerHTML = '<span style="font-size:0.8rem">Uploading...</span>';

    try {
        const token = localStorage.getItem('adminToken'); // Assuming token storage
        // Note: admin.js uses cookie based auth usually or implicit on backend? 
        // Logic in admin.js checkSession calls /api/admin/auth/me usually.
        // But actual calls use cookie?
        // Wait, app.js apiCall doesn't send token header explicitly.
        // It relies on cookies if it's same origin.
        // But our upload.js checks header.
        // Let's rely on cookie if upload.js removes header check OR we implement token storage.
        // Current app.js doesn't seem to use Bearer token. 
        // It just calls /api/admin.
        // So I should probably rely on Cookie in upload.js too or just pass Authorization if I have it.
        // Re-reading app.js: It imports checkSession.
        // I will attempt simple fetch. If it 401s, user needs to login.

        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Upload failed');
        }

        const data = await res.json();
        document.getElementById(`${prefix}-image`).value = data.path;
        updateImagePreview(prefix, data.path);

    } catch (error) {
        console.error(error);
        alert('Image upload failed: ' + error.message);
        if (previewContainer) previewContainer.innerHTML = '<span style="color:var(--fiery-rose)">Failed</span>';
        input.value = '';
    }
};

function updateImagePreview(prefix, imageUrl) {
    const preview = document.getElementById(`${prefix}-preview`);
    if (preview) {
        if (imageUrl) {
            preview.innerHTML = `<img src="${imageUrl}" alt="Preview">`;
        } else {
            preview.innerHTML = '<span style="font-size: 0.7rem; color: var(--manatee);">No image</span>';
        }
    }
}

// --- DELETE HANDLING ---
window.deleteItem = async (type, id, force = false) => {
    const msg = force ? 'Are you sure you want to PERMANENTLY delete this? This cannot be undone.' : (type === 'blog' ? 'Are you sure you want to unpublish this blog?' : 'Are you sure you want to delete this item?');
    if (!confirm(msg)) return;

    // Blog is special (file based)
    if (type === 'blog') {
        await apiCall({
            type: 'blog',
            slug: id,
            force: force
        }, 'DELETE');
        loadBlogs();
        return;
    }

    // Array based items
    let list = [];
    let saveType = type;

    if (type === 'projects') list = allProjects;
    else if (type === 'education') list = allEducation;
    else if (type === 'skills') list = allSkills;
    else if (type === 'technologies') list = allTechnologies;
    else if (type === 'social-links') list = allSocialLinks;
    else if (type === 'certificates') list = allCertificates;

    // Filter out
    // Note: most items use 'id', but some might use 'title' if id missing. Relying on passed 'id' which matches item.id
    // But old data might not have IDs. For now assuming new data has IDs or we pass unique field.
    // In loadX functions we used ID or title.

    // For safety, let's filter by ID if present, else try title/name
    // Filter out
    let itemToDelete = list.find(item => (item.id && item.id == id) || (!item.id && item.title == id));

    // Attempt Image Deletion if exists
    if (itemToDelete && itemToDelete.image && itemToDelete.image.startsWith('/assets/images/')) {
        try {
            await fetch(`/api/upload?path=${itemToDelete.image}`, { method: 'DELETE' });
        } catch (e) { console.error('Failed to delete image', e); }
    }

    const newList = list.filter(item => (item.id && item.id != id) || (!item.id && item.title != id && item.name != id));

    const result = await apiCall({
        type: saveType,
        data: newList
    }, 'PUT');

    if (result) {
        if (type === 'projects') loadProjects();
        if (type === 'education') loadEducation();
        if (type === 'skills') loadSkills();
        if (type === 'technologies') loadTechnologies();
        if (type === 'social-links') loadSocialLinks();
        if (type === 'certificates') loadCertificates();
    }
};

window.openEditItem = (type, id) => {
    if (type === 'projects') {
        const item = allProjects.find(p => p.id == id);
        if (!item) return;
        document.getElementById('project-id').value = item.id;
        document.getElementById('project-title').value = item.title;
        document.getElementById('project-desc').value = item.description;
        document.getElementById('project-image').value = item.image || '';
        updateImagePreview('project', item.image);
        document.getElementById('project-link').value = item.link || '';
        document.getElementById('project-articleLink').value = item.articleLink || '';
        document.getElementById('project-status').value = item.status || 'Active';
        document.getElementById('project-featured').checked = item.featured || false;
        document.getElementById('project-tags').value = (item.tags || []).join(', ');
        document.getElementById('project-modal-title').innerText = 'Edit Project';
        document.getElementById('project-modal').classList.add('open');
    }
    if (type === 'education') {
        const item = allEducation.find(e => e.id == id);
        if (!item) return;
        document.getElementById('edu-id').value = item.id;
        document.getElementById('edu-institution').value = item.institution;
        document.getElementById('edu-url').value = item.url || '';
        document.getElementById('edu-degree').value = item.degree;
        document.getElementById('edu-startDate').value = item.startDate || '';
        document.getElementById('edu-endDate').value = item.endDate || '';
        document.getElementById('edu-isCurrent').checked = item.isCurrent || false;
        document.getElementById('edu-description').value = item.description || '';
        document.getElementById('edu-details').value = (item.details || []).join('\n');
        document.getElementById('education-modal-title').innerText = 'Edit Education';
        document.getElementById('education-modal').classList.add('open');
    }
    if (type === 'skills') {
        const item = allSkills.find(s => s.id == id);
        if (!item) return;
        document.getElementById('skill-id').value = item.id;
        document.getElementById('skill-name').value = item.name;
        document.getElementById('skill-category').value = item.category;
        document.getElementById('skill-level').value = item.level || 'Intermediate';
        document.getElementById('skill-modal-title').innerText = 'Edit Skill';
        document.getElementById('skill-modal').classList.add('open');
    }
    if (type === 'technologies') {
        const item = allTechnologies.find(t => t.id == id);
        if (!item) return;
        document.getElementById('tech-id').value = item.id;
        document.getElementById('tech-name').value = item.name;
        document.getElementById('tech-icon').value = item.icon || '';
        document.getElementById('tech-link').value = item.link || '';
        document.getElementById('tech-modal-title').innerText = 'Edit Technology';
        document.getElementById('tech-modal').classList.add('open');
    }
    if (type === 'social-links') {
        const item = allSocialLinks.find(s => s.id == id);
        if (!item) return;
        document.getElementById('social-id').value = item.id;
        document.getElementById('social-platform').value = item.platform;
        document.getElementById('social-url').value = item.url;
        document.getElementById('social-icon').value = item.icon || '';
        document.getElementById('social-visible').checked = item.visible !== false;
        document.getElementById('social-modal-title').innerText = 'Edit Social Link';
        document.getElementById('social-modal').classList.add('open');
    }
};


// --- EDUCATION ---
let allEducation = [];
async function loadEducation() {
    try {
        const res = await fetch(`${API_BASE}?type=education`);
        if (res.ok) allEducation = await res.json();
    } catch (e) { console.error(e); }

    const tbody = document.getElementById('education-list');
    if (tbody) {
        tbody.innerHTML = allEducation.map(e => `
            <tr>
                <td>${e.institution}</td>
                <td>${e.degree}</td>
                <td>${e.startDate} - ${e.endDate}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="openEditItem('education', '${e.id}')">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteItem('education', '${e.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }
}

document.getElementById('education-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edu-id').value;
    const newData = {
        id: id || 'edu-' + Date.now(),
        institution: document.getElementById('edu-institution').value,
        url: document.getElementById('edu-url').value,
        degree: document.getElementById('edu-degree').value,
        startDate: document.getElementById('edu-startDate').value,
        endDate: document.getElementById('edu-endDate').value,
        isCurrent: document.getElementById('edu-isCurrent').checked,
        description: document.getElementById('edu-description').value,
        details: document.getElementById('edu-details').value.split('\n').filter(Boolean),
        achievements: [] // Optional add later if needed separate
    };

    if (id) {
        const idx = allEducation.findIndex(item => item.id == id);
        if (idx !== -1) allEducation[idx] = newData;
    } else {
        allEducation.push(newData);
    }

    await apiCall({ type: 'education', data: allEducation }, 'PUT');
    closeModal('education-modal');
    loadEducation();
});

// --- SKILLS ---
let allSkills = [];
async function loadSkills() {
    try {
        const res = await fetch(`${API_BASE}?type=skills`);
        if (res.ok) allSkills = await res.json();
    } catch (e) { console.error(e); }

    const tbody = document.getElementById('skills-list');
    if (tbody) {
        tbody.innerHTML = allSkills.map(s => `
            <tr>
                <td>${s.name}</td>
                <td>${s.category}</td>
                <td>${s.level}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="openEditItem('skills', '${s.id}')">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteItem('skills', '${s.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }
}

document.getElementById('skill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('skill-id').value;
    const newData = {
        id: id || 'skill-' + Date.now(),
        name: document.getElementById('skill-name').value,
        category: document.getElementById('skill-category').value,
        level: document.getElementById('skill-level').value
    };

    if (id) {
        const idx = allSkills.findIndex(item => item.id == id);
        if (idx !== -1) allSkills[idx] = newData;
    } else {
        allSkills.push(newData);
    }

    await apiCall({ type: 'skills', data: allSkills }, 'PUT');
    closeModal('skill-modal');
    loadSkills();
});


// --- TECHNOLOGIES ---
let allTechnologies = [];
async function loadTechnologies() {
    try {
        const res = await fetch(`${API_BASE}?type=technologies`);
        if (res.ok) allTechnologies = await res.json();
    } catch (e) { console.error(e); }

    const tbody = document.getElementById('technologies-list');
    if (tbody) {
        tbody.innerHTML = allTechnologies.map(t => `
            <tr>
                <td>${t.name}</td>
                <td>${t.icon}</td>
                <td>${t.link ? 'Yes' : 'No'}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="openEditItem('technologies', '${t.id}')">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteItem('technologies', '${t.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }
}

document.getElementById('tech-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('tech-id').value;
    const newData = {
        id: id || 'tech-' + Date.now(),
        name: document.getElementById('tech-name').value,
        icon: document.getElementById('tech-icon').value,
        link: document.getElementById('tech-link').value
    };
    if (id) {
        const idx = allTechnologies.findIndex(item => item.id == id);
        if (idx !== -1) allTechnologies[idx] = newData;
    } else {
        allTechnologies.push(newData);
    }
    await apiCall({ type: 'technologies', data: allTechnologies }, 'PUT');
    closeModal('tech-modal');
    loadTechnologies();
});

// --- SOCIAL LINKS ---
let allSocialLinks = [];
async function loadSocialLinks() {
    try {
        const res = await fetch(`${API_BASE}?type=social-links`);
        if (res.ok) allSocialLinks = await res.json();
    } catch (e) { console.error(e); }

    const tbody = document.getElementById('social-links-list');
    if (tbody) {
        tbody.innerHTML = allSocialLinks.map(s => `
            <tr>
                <td>${s.platform}</td>
                <td>${s.url}</td>
                <td>${s.visible ? 'Visible' : 'Hidden'}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="openEditItem('social-links', '${s.id}')">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteItem('social-links', '${s.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }
}

document.getElementById('social-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('social-id').value;
    const newData = {
        id: id || 'social-' + Date.now(),
        platform: document.getElementById('social-platform').value,
        url: document.getElementById('social-url').value,
        icon: document.getElementById('social-icon').value,
        visible: document.getElementById('social-visible').checked
    };
    if (id) {
        const idx = allSocialLinks.findIndex(item => item.id == id);
        if (idx !== -1) allSocialLinks[idx] = newData;
    } else {
        allSocialLinks.push(newData);
    }
    await apiCall({ type: 'social-links', data: allSocialLinks }, 'PUT');
    closeModal('social-modal');
    loadSocialLinks();
});

// --- MODAL RESET ---
window.openModal = (id) => {
    document.getElementById(id).classList.add('open');
    if (id === 'blog-modal') {
        document.getElementById('blog-form').reset();
        document.getElementById('blog-id').value = '';
        document.getElementById('literature-fields').style.display = 'none';
        document.getElementById('blog-modal-title').innerText = 'Add New Blog';
    }
    if (id === 'project-modal') {
        document.getElementById('project-form').reset();
        document.getElementById('project-id').value = '';
        document.getElementById('project-modal-title').innerText = 'Add New Project';
    }
    if (id === 'education-modal') {
        document.getElementById('education-form').reset();
        document.getElementById('edu-id').value = '';
        document.getElementById('education-modal-title').innerText = 'Add Education';
    }
    if (id === 'skill-modal') {
        document.getElementById('skill-form').reset();
        document.getElementById('skill-id').value = '';
        document.getElementById('skill-modal-title').innerText = 'Add Skill';
    }
    if (id === 'tech-modal') {
        document.getElementById('tech-form').reset();
        document.getElementById('tech-id').value = '';
        document.getElementById('tech-modal-title').innerText = 'Add Technology';
    }
    if (id === 'social-modal') {
        document.getElementById('social-form').reset();
        document.getElementById('social-id').value = '';
        document.getElementById('social-modal-title').innerText = 'Add Social Link';
    }
    if (id === 'certificate-modal') {
        document.getElementById('cert-form').reset();
        document.getElementById('cert-id').value = '';
        document.getElementById('cert-modal-title').innerText = 'Add New Certificate';
    }

    // Clear Previews on Open
    ['blog', 'project', 'cert'].forEach(p => updateImagePreview(p, ''));
};

// --- GALLERY ---
let allGalleryItems = [];

async function loadGallery() {
    const galleryGrid = document.getElementById('gallery-grid');
    const loading = document.getElementById('gallery-loading');
    if (!galleryGrid) return;

    loading.style.display = 'block';

    try {
        let res = await fetch('/api/gallery');
        if (!res.ok) throw new Error('Failed to load gallery');
        allGalleryItems = await res.json();
        renderGallery(allGalleryItems);
    } catch (e) {
        console.error("Gallery Load Failed", e);
        galleryGrid.innerHTML = '<p style="padding:20px; color:var(--manatee)">Failed to load gallery.</p>';
    } finally {
        loading.style.display = 'none';
    }
}

function renderGallery(items) {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; padding: 20px; color: var(--manatee); text-align: center;">No images found. Upload or Sync.</p>';
        return;
    }

    grid.innerHTML = items.map(item => `
        <div class="gallery-item" onclick="viewGalleryItem('${item.path}')">
            ${item.unused ? '<span class="unused-badge">Unused</span>' : ''}
            <img src="/${item.path}" class="gallery-thumb" loading="lazy" 
                 onerror="this.style.background='linear-gradient(135deg, #1a1d26 0%, #0d1017 100%)'; this.style.border='2px dashed var(--fiery-rose)'; this.alt='Missing Image';">
            <div class="gallery-meta">
                <div class="gallery-name" title="${item.path}">${item.path.split('/').pop()}</div>
                <div style="display:flex; justify-content:space-between;">
                    <span>${(item.size / 1024).toFixed(1)} KB</span>
                    <span>${item.width}x${item.height}</span>
                </div>
            </div>
        </div>
    `).join('');
}

window.syncGallery = async () => {
    const btn = document.querySelector('button[onclick="syncGallery()"]');
    if (btn) btn.innerText = 'Syncing...';

    try {
        const res = await fetch('/api/gallery?type=sync');
        allGalleryItems = await res.json();
        renderGallery(allGalleryItems);
        alert('Gallery Synced Successfully!');
    } catch (e) {
        alert('Sync failed: ' + e.message);
    } finally {
        if (btn) btn.innerText = 'Sync';
    }
};

window.handleGalleryUpload = async (input) => {
    // Re-use the existing file upload logic but for Gallery
    // We can pass a dummy section 'gallery' or 'global'
    // But handleFileUpload expects specific inputs for sections (like category for blogs).
    // Let's make handleFileUpload more robust or just use a direct call here.

    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('section', 'gallery'); // Will map to assets/images/gallery/ usually, or we can enforce root?
    // api/upload logic: if section not blogs/projects/etc, it goes to assets/images/<section>
    // Let's put it in 'uploads' or 'global'
    formData.append('section', 'global');

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error((await res.json()).error);

        await loadGallery(); // Reload to see new image
        alert('Image uploaded!');
    } catch (e) {
        alert('Upload failed: ' + e.message);
    }
    input.value = '';
};

window.filterGallery = () => {
    const term = document.getElementById('gallery-search').value.toLowerCase();
    const filtered = allGalleryItems.filter(i => i.path.toLowerCase().includes(term) || (i.alt && i.alt.toLowerCase().includes(term)));
    renderGallery(filtered);
};

window.viewGalleryItem = (path) => {
    // Simple View functionality
    const item = allGalleryItems.find(i => i.path === path);
    // Could open a modal details view here. For now, simple Alert + Copy.
    const url = `${window.location.origin}/${path}`;
    navigator.clipboard.writeText(`/${path}`).then(() => {
        alert(`Copied Path: /${path}\n\nInfo:\nAlt: ${item.alt || '-'}\nSize: ${item.width}x${item.height}`);
    });
};

/* --- LOADING DATA --- */
function loadAllData() {
    loadBlogs();
    loadProjects();
    loadEducation();
    loadSkills();
    loadTechnologies();
    loadSocialLinks();
    loadCertificates();
    loadGallery();
}

// Init
// Init
// Check Auth first
checkSession().then(() => {
    loadAllData();
    // Reveal Dashboard
    const dashboard = document.getElementById('dashboard-view');
    if (dashboard) dashboard.style.display = 'block';
}).catch((e) => {
    console.error("Initialization failed:", e);
    // If auth failed, checkSession usually redirects.
    // If it was a code error, we should see it.
    // Fallback redirect
    window.location.href = '/admin/login.html';
});
