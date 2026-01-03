/**
 * Theme Management System
 * Handles light/dark theme switching with persistence and system preference detection
 * Follows international best practices (Google, GitHub, Vercel standards)
 */

const ThemeManager = {
    // Configuration
    STORAGE_KEY: 'theme-preference',
    SOURCE_KEY: 'theme-source',
    THEME_ATTRIBUTE: 'data-theme',
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark'
    },
    SOURCES: {
        MANUAL: 'manual',
        SYSTEM: 'system'
    },

    /**
     * Initialize theme system
     * Called on page load
     */
    init() {
        this.applyTheme(this.getTheme());
        this.setupToggle();
        this.watchSystemPreference();
        this.syncAcrossTabs();
    },

    /**
     * Get current theme based on priority:
     * 1. Manual user selection (highest priority)
     * 2. System preference
     * 3. Default (dark)
     */
    getTheme() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        const source = localStorage.getItem(this.SOURCE_KEY);

        // Priority 1: User manual selection
        if (saved && source === this.SOURCES.MANUAL) {
            return saved;
        }

        // Priority 2: System preference
        if (window.matchMedia) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = prefersDark ? this.THEMES.DARK : this.THEMES.LIGHT;

            // Save system preference (but don't override manual selection)
            if (!saved || source !== this.SOURCES.MANUAL) {
                localStorage.setItem(this.STORAGE_KEY, theme);
                localStorage.setItem(this.SOURCE_KEY, this.SOURCES.SYSTEM);
            }

            return theme;
        }

        // Priority 3: Default fallback
        return this.THEMES.DARK;
    },

    /**
     * Apply theme to document
     * @param {string} theme - 'light' or 'dark'
     */
    applyTheme(theme) {
        document.documentElement.setAttribute(this.THEME_ATTRIBUTE, theme);
        this.updateToggleIcon(theme);

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme }
        }));
    },

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute(this.THEME_ATTRIBUTE);
        const newTheme = currentTheme === this.THEMES.LIGHT ? this.THEMES.DARK : this.THEMES.LIGHT;

        // Save as manual selection
        localStorage.setItem(this.STORAGE_KEY, newTheme);
        localStorage.setItem(this.SOURCE_KEY, this.SOURCES.MANUAL);

        this.applyTheme(newTheme);
    },

    /**
     * Update toggle button icon
     * @param {string} theme - Current theme
     */
    updateToggleIcon(theme) {
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;

        const lightIcon = toggle.querySelector('.theme-icon.light');
        const darkIcon = toggle.querySelector('.theme-icon.dark');

        if (theme === this.THEMES.LIGHT) {
            // Show moon icon (to switch to dark)
            if (lightIcon) lightIcon.style.display = 'none';
            if (darkIcon) darkIcon.style.display = 'block';
        } else {
            // Show sun icon (to switch to light)
            if (lightIcon) lightIcon.style.display = 'block';
            if (darkIcon) darkIcon.style.display = 'none';
        }
    },

    /**
     * Setup toggle button click handler
     */
    setupToggle() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent menu from closing if inside navbar
                this.toggleTheme();
            });
        }
    },

    /**
     * Watch for system preference changes
     * Only applies if user hasn't manually set preference
     */
    watchSystemPreference() {
        if (!window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        mediaQuery.addEventListener('change', (e) => {
            const source = localStorage.getItem(this.SOURCE_KEY);

            // Only update if user hasn't manually set preference
            if (source !== this.SOURCES.MANUAL) {
                const theme = e.matches ? this.THEMES.DARK : this.THEMES.LIGHT;
                localStorage.setItem(this.STORAGE_KEY, theme);
                localStorage.setItem(this.SOURCE_KEY, this.SOURCES.SYSTEM);
                this.applyTheme(theme);
            }
        });
    },

    /**
     * Sync theme across browser tabs/windows
     */
    syncAcrossTabs() {
        window.addEventListener('storage', (e) => {
            if (e.key === this.STORAGE_KEY && e.newValue) {
                this.applyTheme(e.newValue);
            }
        });
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}

// Export for use in other scripts
window.ThemeManager = ThemeManager;
