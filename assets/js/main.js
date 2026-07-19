
import { renderFooter } from './navbar.js';

let scrollObserver;

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Nav Toggle Logic is completely handled by inline script in base.html
  // This ensures the menu works even before main.js loads/hydrates
  const navToggler = document.querySelector('[data-nav-toggler]');
  if (!navToggler) {
    // Silent return or debug log if strictly needed, but better to keep console clean
  }

  renderFooter();
  initObserver();
  initSkillRings();
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

  // Observe any static elements loaded by SSG that need animation
  document.querySelectorAll('.reveal:not(.active)').forEach(el => scrollObserver.observe(el));
}

// Skill Ring Cards — Scroll-triggered SVG ring animation
function initSkillRings() {
  const grid = document.querySelector('.skills-ring-grid');
  if (!grid) return;

  const ringObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      // Fade in all cards with staggered CSS delay
      grid.querySelectorAll('.skill-ring-card').forEach(card => {
        card.classList.add('visible');
      });

      // Animate each SVG ring stroke
      grid.querySelectorAll('.ring-progress').forEach(circle => {
        const target = circle.getAttribute('data-target-offset');
        if (target !== null) {
          // Small delay to let the card fade-in start first
          requestAnimationFrame(() => {
            circle.style.strokeDashoffset = target;
          });
        }
      });

      ringObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  ringObserver.observe(grid);
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
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok) {
        showToast('Message sent successfully! I will get back to you soon.', 'success');
        contactForm.reset();
      } else {
        showToast('Error: ' + result.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to send message. Please try again.', 'error');
    } finally {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });
}

// Certificate Modal Functions
window.openCertificateModal = function (element) {
  const modal = document.getElementById('certificate-modal');
  const title = element.getAttribute('data-cert-title');
  const issuer = element.getAttribute('data-cert-issuer');
  const date = element.getAttribute('data-cert-date');
  const image = element.getAttribute('data-cert-image');
  const description = element.getAttribute('data-cert-description');

  document.getElementById('cert-modal-title').textContent = title;
  document.getElementById('cert-modal-issuer').textContent = issuer;
  document.getElementById('cert-modal-date').textContent = date;
  document.getElementById('cert-modal-img').src = image;
  document.getElementById('cert-modal-description').textContent = description;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeCertificateModal = function (event) {
  // If event is passed and it's not clicking the overlay, don't close
  if (event && event.target.closest('.cert-modal-content') && !event.target.classList.contains('cert-modal-close')) {
    return;
  }

  const modal = document.getElementById('certificate-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
};

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('certificate-modal');
    if (modal && modal.classList.contains('active')) {
      closeCertificateModal();
    }
  }
});
