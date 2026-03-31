import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'fallback-csrf-secret-change-in-production';

/**
 * Generates a cryptographically secure CSRF token
 * @returns {string} - 64-character hex token
 */
export function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Verifies CSRF token using timing-safe comparison
 * @param {string} storedToken - Token from cookie/session
 * @param {string} providedToken - Token from form submission
 * @returns {boolean} - True if tokens match
 */
export function verifyCsrfToken(storedToken, providedToken) {
    if (!storedToken || !providedToken) {
        return false;
    }

    // Ensure both tokens are the same length
    if (storedToken.length !== providedToken.length) {
        return false;
    }

    try {
        // Use timing-safe comparison to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(storedToken),
            Buffer.from(providedToken)
        );
    } catch (e) {
        console.error('CSRF verification error:', e);
        return false;
    }
}

/**
 * Sets CSRF token as a secure cookie
 * @param {object} res - Response object
 * @param {string} token - CSRF token to set
 */
export function setCsrfCookie(res, token) {
    const maxAge = 604800; // 7 days
    const isProd = process.env.NODE_ENV === 'production';
    const domain = isProd ? 'Domain=.shankararyal404.com.np;' : '';

    res.setHeader('Set-Cookie',
        `csrf_token=${token}; Path=/; ${domain} HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
    );
}

/**
 * Parses cookies from request headers
 * @param {object} req - Request object
 * @returns {object} - Parsed cookies
 */
export function parseCookies(req) {
    const cookies = {};
    const cookieHeader = req.headers.cookie;

    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const [name, ...rest] = cookie.split('=');
            const value = rest.join('=').trim();
            if (name && value) {
                cookies[name.trim()] = decodeURIComponent(value);
            }
        });
    }

    return cookies;
}
