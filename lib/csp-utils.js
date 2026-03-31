/**
 * Content Security Policy Utilities
 * Generates CSP headers with hashes for inline scripts/styles
 */

import crypto from 'crypto';

/**
 * Generate SHA-256 hash for inline content
 * @param {string} content - The inline script or style content
 * @returns {string} Base64-encoded hash
 */
export function generateHash(content) {
    const hash = crypto.createHash('sha256').update(content, 'utf8').digest('base64');
    return `'sha256-${hash}'`;
}

/**
 * Extract inline script content from HTML
 * @param {string} html - HTML content
 * @returns {Array<string>} Array of script contents
 */
export function extractInlineScripts(html) {
    const scripts = [];
    const scriptRegex = /<script[^>]*>(.*?)<\/script>/gs;
    let match;
    
    while ((match = scriptRegex.exec(html)) !== null) {
        const content = match[1].trim();
        // Skip external scripts (have src attribute)
        if (!match[0].includes('src=') && content.length > 0) {
            scripts.push(content);
        }
    }
    
    return scripts;
}

/**
 * Extract inline style content from HTML
 * @param {string} html - HTML content
 * @returns {Array<string>} Array of style contents
 */
export function extractInlineStyles(html) {
    const styles = [];
    const styleRegex = /<style[^>]*>(.*?)<\/style>/gs;
    let match;
    
    while ((match = styleRegex.exec(html)) !== null) {
        const content = match[1].trim();
        if (content.length > 0) {
            styles.push(content);
        }
    }
    
    return styles;
}

/**
 * Generate CSP header with hashes
 * @param {Array<string>} scriptHashes - Array of script hashes
 * @param {Array<string>} styleHashes - Array of style hashes
 * @returns {string} CSP header value
 */
export function generateCSP(scriptHashes = [], styleHashes = []) {
    const scriptSrcHashes = scriptHashes.length > 0 
        ? scriptHashes.join(' ') 
        : '';
    const styleSrcHashes = styleHashes.length > 0 
        ? styleHashes.join(' ') 
        : '';
    
    // Build CSP without unsafe-inline and unsafe-eval
    const csp = [
        "default-src 'self'",
        `script-src 'self' ${scriptSrcHashes} https://vercel.live https://www.googletagmanager.com https://www.google-analytics.com https://accounts.google.com https://github.com https://api.twitter.com https://unpkg.com`,
        `style-src 'self' ${styleSrcHashes} https://fonts.googleapis.com`,
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://vercel.live https://www.google-analytics.com https://api.github.com https://oauth2.googleapis.com https://www.googleapis.com https://github.com https://api.twitter.com https://unpkg.com",
        "frame-src 'self' https://vercel.live https://accounts.google.com https://github.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://accounts.google.com https://github.com https://api.twitter.com",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
    ].filter(Boolean).join('; ');
    
    return csp;
}

/**
 * Generate nonce for dynamic content (API responses)
 * @returns {string} Random nonce
 */
export function generateNonce() {
    return crypto.randomBytes(16).toString('base64');
}
