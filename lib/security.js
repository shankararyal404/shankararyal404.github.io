import crypto from 'crypto';

// Rate limiting in-memory cache
const rateLimitCache = new Map();

/**
 * Checks if an IP has exceeded rate limits
 * @param {string} ip - User IP address
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if within limit, false otherwise
 */
export function checkRateLimit(ip, maxRequests, windowMs) {
    const now = Date.now();
    if (!rateLimitCache.get(ip)) {
        rateLimitCache.set(ip, []);
    }

    const requests = rateLimitCache.get(ip);
    const validRequests = requests.filter(time => now - time < windowMs);

    if (validRequests.length >= maxRequests) {
        return false;
    }

    validRequests.push(now);
    rateLimitCache.set(ip, validRequests);
    return true;
}

/**
 * Sanitizes comment content to prevent XSS.
 * Removes all HTML tags except <b>, <i>, <em>, <strong>, <code>, <pre>.
 * Also escapes special characters.
 */
export function sanitizeComment(content) {
    if (!content) return '';

    // 1. Strip all tags except safe ones
    // Using a more robust regex for stripping tags while preserving allowed ones
    content = content.replace(/<(?!\/?(?:b|i|em|strong|code|pre)\b)[^>]+>/gi, '');

    // 2. Escape special characters to prevent breakout if any tags remain malformed
    content = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

    // 3. Restore allowed tags
    content = content
        .replace(/&lt;b&gt;/gi, '<b>').replace(/&lt;\/b&gt;/gi, '</b>')
        .replace(/&lt;i&gt;/gi, '<i>').replace(/&lt;\/i&gt;/gi, '</i>')
        .replace(/&lt;em&gt;/gi, '<em>').replace(/&lt;\/em&gt;/gi, '</em>')
        .replace(/&lt;strong&gt;/gi, '<strong>').replace(/&lt;\/strong&gt;/gi, '</strong>')
        .replace(/&lt;code&gt;/gi, '<code>').replace(/&lt;\/code&gt;/gi, '</code>')
        .replace(/&lt;pre&gt;/gi, '<pre>').replace(/&lt;\/pre&gt;/gi, '</pre>');

    // 4. Limit consecutive repeated characters (Spam protection)
    content = content.replace(/(.)\1{5,}/g, '$1$1$1');

    return content.trim();
}

/**
 * Detects spam based on URL count, keywords, and repetitive patterns.
 */
export function detectSpam(content) {
    if (!content) return false;

    // A. URL count threshold
    const urlCount = (content.match(/https?:\/\//gi) || []).length;
    if (urlCount > 3) return true;

    // B. Spam keywords
    const spamKeywords = [
        'casino', 'viagra', 'cialis', 'lottery', 'prize', 'click here',
        'get rich', 'earn money', 'bitcoin', 'crypto mining', 'free gift',
        'winner', 'cheap pharmacy', 'unlimited views'
    ];
    const lower = content.toLowerCase();
    if (spamKeywords.some(word => lower.includes(word))) return true;

    // C. Excessive caps detection
    if (content.length > 30) {
        const caps = content.replace(/[^A-Z]/g, '').length;
        if (caps / content.length > 0.8) return true;
    }

    return false;
}

/**
 * Validates author name
 */
export function validateAuthorName(name) {
    if (!name) return false;
    // 1-100 chars, alphanumeric, space, underscore, dash
    const re = /^[a-zA-Z0-9 _-]{1,100}$/;
    return re.test(name);
}

/**
 * CSRF Protection
 */
export function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

export function verifyCsrfToken(storedToken, providedToken) {
    if (!storedToken || !providedToken) return false;
    try {
        return crypto.timingSafeEqual(
            Buffer.from(storedToken),
            Buffer.from(providedToken)
        );
    } catch (e) {
        return false;
    }
}
