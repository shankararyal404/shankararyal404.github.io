// This file is now mainly handling the mobile toggle if the HTML is pre-rendered.
// If your base.html has the toggle logic, this file might be redundant OR needs to match the class names.

const navToggler = document.querySelector('[data-nav-toggler]');
const navbarList = document.querySelector('[data-navbar] ul'); // Targeting the ul inside nav

if (navToggler && navbarList) {
  navToggler.addEventListener('click', () => {
    navbarList.classList.toggle('active');
    navToggler.classList.toggle('active');
    document.body.classList.toggle('nav-active'); // Optional: to lock scroll
  });
}

// Close nav when clicking a link
const navLinks = document.querySelectorAll('.navbar-link');
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (navbarList.classList.contains('active')) {
      navbarList.classList.remove('active');
      navToggler.classList.remove('active');
      document.body.classList.remove('nav-active');
    }
  });
});

// Dummy export for compatibility (navbar is pre-rendered in HTML)
export function renderNavbar() {
  // Navbar is already in the HTML, this is just for module compatibility
}

export function renderFooter() {
  const footerContainer = document.getElementById('footer');
  if (!footerContainer) return;

  const year = new Date().getFullYear();

  footerContainer.innerHTML = `
    <footer class="footer section">
      <div class="container">
        <div class="footer-content">
          <h3 class="h3 text-gradient" style="margin-bottom: 20px;">Shankar Aryal</h3>
          <p style="color: var(--manatee); margin-bottom: 20px;">Building digital experiences with passion and precision.</p>
          <div class="social-links" style="display: flex; justify-content: center; gap: 20px; margin-bottom: 20px;">
             <a href="#" style="color: var(--white);">GitHub</a>
             <a href="#" style="color: var(--white);">LinkedIn</a>
             <a href="#" style="color: var(--white);">Twitter</a>
          </div>
          <p>&copy; ${year} Shankar Aryal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  `;
}
