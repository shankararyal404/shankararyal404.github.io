import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default async function handler(req, res) {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
        return res.status(401).json({ valid: false });
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET);
        res.status(200).json({ valid: true });
    } catch (err) {
        res.status(401).json({ valid: false });
    }
}
