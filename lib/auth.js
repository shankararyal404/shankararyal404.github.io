import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { queryInfra } from './db-pool.js';
import { env } from './env-config.js';
import { emailHelpers } from './mail.js';

const JWT_SECRET = env.security.jwtSecret || 'fallback-secret-for-dev';
// 15 minutes for access token
const ACCESS_TOKEN_TTL = 15 * 60;
// 7 days for refresh token
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

/**
 * Signs a user profile into a JWT Access Token
 */
export function signToken(profile) {
    return jwt.sign(profile, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
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
 * Generate a secure random refresh token
 */
export function generateRefreshToken() {
    return crypto.randomBytes(48).toString('hex');
}

/**
 * Create a new session in the database
 */
export async function createSession({ userId, ip, userAgent }) {
    const token = generateRefreshToken();
    const expiresAt = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL;

    // Check active sessions limit (max 5)
    const existing = await queryInfra({
        sql: 'SELECT token FROM sessions WHERE user_id = ? ORDER BY created_at ASC',
        args: [userId]
    });

    if (existing && existing.length >= 5) {
        // Delete oldest session
        await queryInfra({
            sql: 'DELETE FROM sessions WHERE token = ?',
            args: [existing[0].token]
        });
    }

    // Insert new session
    await queryInfra({
        sql: `INSERT INTO sessions (token, user_id, expires_at, ip_address, user_agent)
              VALUES (?, ?, ?, ?, ?)`,
        args: [token, userId, expiresAt, ip, userAgent]
    });

    // Notify if new device (simple check: if no other sessions existed for this IP)
    /* 
       Note: A robust "new device" check requires storing known devices. 
       For now, we just skip email spam on every login, 
       but we could check if this IP has been seen before for this user.
    */

    return token;
}

/**
 * Verify and Rotate Refresh Token
 * Returns new keys if valid, throws if invalid
 */
export async function rotateRefreshToken(oldToken, ip, userAgent) {
    // 1. Get session
    const sessions = await queryInfra({
        sql: 'SELECT * FROM sessions WHERE token = ?',
        args: [oldToken]
    });

    if (!sessions || sessions.length === 0) {
        // Possible reuse detection could go here (if we kept used tokens)
        throw new Error('Invalid refresh token');
    }

    const session = sessions[0];

    // 2. Check expiry
    if (Date.now() / 1000 > session.expires_at) {
        await revokeSession(oldToken);
        throw new Error('Refresh token expired');
    }

    // 3. Security: Check IP change (optional strict mode)
    // if (session.ip_address !== ip) ...

    // 4. Rotate: Delete old, create new
    await revokeSession(oldToken);

    // Create new session for same user
    const newToken = await createSession({
        userId: session.user_id,
        ip,
        userAgent
    });

    return {
        accessToken: signToken({ id: session.user_id, email: session.user_id, role: 'admin' }), // Assuming id is email for now or lookup user
        refreshToken: newToken
    };
}

/**
 * Revoke a session
 */
export async function revokeSession(token) {
    await queryInfra({
        sql: 'DELETE FROM sessions WHERE token = ?',
        args: [token]
    });
}

/**
 * Sets the auth cookies (Access + Refresh)
 */
export function setAuthCookies(res, accessToken, refreshToken) {
    const isProd = env.isProd;
    const domain = isProd ? 'Domain=.shankararyal404.com.np;' : '';
    const secure = isProd ? 'Secure;' : '';
    const sameSite = 'SameSite=Lax';

    // Access Token (Short lived)
    res.setHeader('Set-Cookie', [
        `auth_token=${accessToken}; Path=/; ${domain} HttpOnly; ${secure} ${sameSite}; Max-Age=${ACCESS_TOKEN_TTL}`,
        `refresh_token=${refreshToken}; Path=/api/auth/refresh; ${domain} HttpOnly; ${secure} ${sameSite}; Max-Age=${REFRESH_TOKEN_TTL}`
    ]);
}

/**
 * Clears auth cookies
 */
export function clearAuthCookies(res) {
    const isProd = env.isProd;
    const domain = isProd ? 'Domain=.shankararyal404.com.np;' : '';

    res.setHeader('Set-Cookie', [
        `auth_token=; Path=/; ${domain} HttpOnly; Max-Age=0`,
        `refresh_token=; Path=/api/auth/refresh; ${domain} HttpOnly; Max-Age=0`
    ]);
}

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

export function isAuthenticated(req) {
    const cookies = parseCookies(req);
    const token = cookies.auth_token;
    if (!token) return false;
    return !!verifyToken(token);
}
