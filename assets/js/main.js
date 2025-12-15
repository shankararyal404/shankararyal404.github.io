import { renderNavbar, renderFooter } from './navbar.js';
import { getFeaturedProjects, getCertificates, getLatestBlogs, getCategoryClass, createBlogCard } from './api.js';

let scrollObserver;

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  renderFooter();
  initObserver();
  initHome();
});

function initObserver() {
  scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        scrollObserver.unobserve(entry.target); // Run once for performance
      }
    });
  }, { threshold: 0.1 });

  // 1. Select anything explicitly marked 'reveal'
  document.querySelectorAll('.reveal').forEach(el => scrollObserver.observe(el));

  // 2. legacy support: select .section and ensure they are reveal
  document.querySelectorAll('.section').forEach(el => {
    el.classList.add('reveal');
    scrollObserver.observe(el);
  });
}

async function initHome() {
  try {
    const projects = await getFeaturedProjects();
    const certificates = await getCertificates();
    const blogs = await getLatestBlogs();

    // Render Projects
    const portfolioGrid = document.getElementById('portfolio-grid');
    if (portfolioGrid) {
      portfolioGrid.innerHTML = projects.map(p => `
        <div class="project-card reveal">
          <img src="${p.image}" alt="${p.title}" class="project-bg-img">
          <div class="project-content-overlay">
             <div class="project-tags">
                ${(p.tags || []).map(t => `<span class="tech-pill">${t}</span>`).join('')}
             </div>
             <h3 class="project-title">${p.title}</h3>
             <p class="project-desc">${p.description}</p>
             <a href="${p.link}" class="project-link-btn">View Project <span>↗</span></a>
          </div>
        </div>
      `).join('');
    }

    // Render Certificates
    const certificatesGrid = document.getElementById('certificates-grid');
    if (certificatesGrid) {
      certificatesGrid.innerHTML = certificates.map(c => `
        <div class="card reveal">
          <div class="card-img-holder">
            <img src="${c.image}" alt="${c.title}">
          </div>
          <div class="card-content">
             <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <span class="category-tag ${getCategoryClass(c.category)}">${c.category}</span>
                <span class="card-date">${c.date}</span>
             </div>
             <h3 class="h3 card-title">${c.title}</h3>
             <p style="color: var(--manatee); margin-bottom: 5px;">Issuer: ${c.issuer}</p>
             <div style="flex-grow: 1;"></div>
             <a href="${c.link}" class="btn-link" style="color: var(--primary); font-weight: 600; margin-top: 15px;">View Credential &rarr;</a>
          </div>
        </div>
      `).join('');
    }

    // Render Blogs
    const blogGrid = document.getElementById('blog-grid');
    if (blogGrid) {
      blogGrid.innerHTML = blogs.map(b => createBlogCard(b, false)).join('');
    }

    // IMPORTANT: Observe new elements
    requestAnimationFrame(() => {
      document.querySelectorAll('.reveal:not(.active)').forEach(el => {
        if (scrollObserver) scrollObserver.observe(el);
      });
    });

  } catch (error) {
    console.error("Error loading dynamic content:", error);
  }
}

// Contact Form Handler
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Sending...';
    btn.disabled = true;

    const data = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      message: document.getElementById('message').value
    };

    try {
      const res = await fetch('/api/contact/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok) {
        alert('Message sent successfully! I will get back to you soon.');
        contactForm.reset();
      } else {
        alert('Error: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send message. Please try again.');
    } finally {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });
}
