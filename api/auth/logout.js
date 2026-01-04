import { clearAuthCookie } from '../../lib/auth.js';

export default function handler(req, res) {
    clearAuthCookie(res);
    res.redirect(req.headers.referer || '/');
}
