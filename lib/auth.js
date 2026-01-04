import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

/**
 * Signs a user profile into a JWT
 */
export function signToken(profile) {
    return jwt.sign(profile, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies a JWT token
 */
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

/**
 * Sets the auth session cookie
 */
export function setAuthCookie(res, token) {
    res.setHeader('Set-Cookie', `auth_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
}

/**
 * Clears the auth session cookie
 */
export function clearAuthCookie(res) {
    res.setHeader('Set-Cookie', 'auth_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
}

/**
 * Parses cookies from request
 */
export function parseCookies(req) {
    const list = {};
    const cookieHeader = req.headers?.cookie;
    if (!cookieHeader) return list;

    cookieHeader.split(';').forEach(cookie => {
        let [name, ...rest] = cookie.split('=');
        name = name.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        if (!value) return;
        list[name] = decodeURIComponent(value);
    });

    return list;
}
/**
 * Checks if the request is authenticated (Admin)
 */
export function isAuthenticated(req) {
    const cookies = parseCookies(req);
    const token = cookies.auth_token;
    if (!token) return false;
    return !!verifyToken(token);
}
