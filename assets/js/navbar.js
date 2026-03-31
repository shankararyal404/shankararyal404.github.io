// Navbar functionality is now handled by inline script in base.html
// This file is kept for compatibility and future enhancements

// Export function for compatibility (navbar toggle is handled in base.html)
export function initNavbar() {
  // Navigation toggle is handled by inline script in base.html
  // This function is kept for module compatibility
  console.log('Navbar module loaded - toggle handled by inline script');
}

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
