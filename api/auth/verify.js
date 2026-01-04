import { verifyToken, parseCookies } from '../../lib/auth.js';

export default function handler(req, res) {
    const cookies = parseCookies(req);
    const token = cookies.auth_session;

    if (!token) {
        return res.status(401).json({ authenticated: false });
    }

    const profile = verifyToken(token);
    if (!profile) {
        return res.status(401).json({ authenticated: false });
    }

    return res.status(200).json({ authenticated: true, user: profile });
}
