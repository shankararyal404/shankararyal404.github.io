import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export function isAuthenticated(req) {
    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth_token;

        if (!token) return false;

        jwt.verify(token, process.env.JWT_SECRET);
        return true;
    } catch (err) {
        return false;
    }
}
