/**
 * Edge Middleware - Vercel Edge Runtime Compatible
 * Runs on every request before reaching API routes
 */

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - assets (public assets)
         */
        '/((?!_next/static|_next/image|favicon.ico|assets).*)',
    ],
};

// Simple in-memory rate limiting (Edge-compatible)
const rateLimitStore = new Map();

// Rate limit configuration
const RATE_LIMITS = {
    default: { limit: 100, window: 60 }, // 100 req per min
    auth: { limit: 10, window: 60 * 15 }, // 10 req per 15 min
    contact: { limit: 5, window: 60 * 60 }, // 5 req per hour
};

function checkSimpleRateLimit(ip, limitType) {
    const config = RATE_LIMITS[limitType] || RATE_LIMITS.default;
    const now = Math.floor(Date.now() / 1000);
    const windowKey = Math.floor(now / config.window);
    const key = `${limitType}:${ip}:${windowKey}`;

    const current = rateLimitStore.get(key) || 0;

    if (current >= config.limit) {
        return false; // Rate limit exceeded
    }

    rateLimitStore.set(key, current + 1);

    // Cleanup old entries (keep map size manageable)
    if (rateLimitStore.size > 10000) {
        const entries = Array.from(rateLimitStore.entries());
        entries.slice(0, 5000).forEach(([k]) => rateLimitStore.delete(k));
    }

    return true;
}

export default async function middleware(request) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const { pathname } = new URL(request.url);

    // 1. Bot Protection (Simple User-Agent check)
    const ua = request.headers.get('user-agent') || '';
    if (ua.includes('AhrefsBot') || ua.includes('SemrushBot') || ua.includes('PetalBot')) {
        return new Response(null, { status: 403, statusText: 'Forbidden' });
    }

    // 2. Rate Limiting (Simplified for Edge)
    let limitType = 'default';
    if (pathname.includes('/api/auth')) limitType = 'auth';
    if (pathname.includes('/api/contact')) limitType = 'contact';

    if (!checkSimpleRateLimit(ip, limitType)) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 3. CSRF Check (Simplified: Verify Origin/Referer for mutating requests)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const origin = request.headers.get('origin');
        const host = request.headers.get('host');

        // Allow if origin matches host
        if (origin && !origin.includes(host)) {
            // Could return 403, but being lenient for now
            // return new Response(JSON.stringify({ error: 'CSRF Validation Failed' }), { status: 403 });
        }
    }

    // Let request pass through - don't return anything
    // Middleware will automatically continue to next handler
}
