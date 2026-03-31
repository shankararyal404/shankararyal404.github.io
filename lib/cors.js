/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * Implements whitelist-based CORS to prevent unauthorized cross-origin requests
 */

// Allowed origins for CORS requests
const ALLOWED_ORIGINS = [
    'https://shankararyal404.com.np',
    'https://www.shankararyal404.com.np',
    process.env.SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    // Development
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
    process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : null,
].filter(Boolean);

/**
 * Sets CORS headers based on origin whitelist
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {object} options - CORS options
 */
export function setCorsHeaders(req, res, options = {}) {
    const origin = req.headers.origin;

    // Check if origin is in whitelist
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (options.allowAll) {
        // Fallback for public APIs (use sparingly)
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    // Set allowed methods
    const methods = options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));

    // Set allowed headers
    const headers = options.headers || ['Content-Type', 'Authorization', 'X-CSRF-Token'];
    res.setHeader('Access-Control-Allow-Headers', headers.join(', '));

    // Cache preflight requests for 24 hours
    res.setHeader('Access-Control-Max-Age', '86400');

    // Expose headers to client
    if (options.exposeHeaders) {
        res.setHeader('Access-Control-Expose-Headers', options.exposeHeaders.join(', '));
    }
}

/**
 * Handle CORS preflight (OPTIONS) requests
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {boolean} - True if preflight was handled
 */
export function handleCorsPreFlight(req, res, options = {}) {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res, options);
        res.status(204).end();
        return true;
    }
    return false;
}

/**
 * Validates origin against whitelist
 * @param {string} origin - Origin to validate
 * @returns {boolean} - True if origin is allowed
 */
export function isOriginAllowed(origin) {
    if (!origin) return false;
    return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Middleware-style CORS handler
 * @param {object} options - CORS options
 * @returns {function} - CORS handler function
 */
export function corsMiddleware(options = {}) {
    return (req, res) => {
        // Handle preflight
        if (handleCorsPreFlight(req, res, options)) {
            return true;
        }

        // Set CORS headers for actual request
        setCorsHeaders(req, res, options);
        return false;
    };
}
