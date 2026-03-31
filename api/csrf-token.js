import { generateCsrfToken, setCsrfCookie } from '../lib/csrf.js';

/**
 * CSRF Token Endpoint
 * Generates and returns a CSRF token for form submissions
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Generate new CSRF token
    const token = generateCsrfToken();

    // Set as secure cookie
    setCsrfCookie(res, token);

    // Also return in response for client-side use
    return res.status(200).json({
        csrf_token: token,
        expires_in: 3600 // 1 hour
    });
}
