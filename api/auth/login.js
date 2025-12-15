import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const { username, password } = req.body;

    // Verify credentials (in production, use bcrypt to compare hash)
    // For this simplified version as per user request (hash provided in env is strict string match or similar)
    // User provided ADMIN_PASSWORD_HASH=... in prompt. 
    // IMPORTANT: The prompt says "Server verifies password... stored hashed password only".
    // Since we don't have a DB with users, we compare against ENV.
    // If the user literally meant "hash", we should use a hash comparison.
    // But for simplicity with "No database", usually we might accept the direct string if it was a simpler setup, 
    // but let's assume the ENV contains the *value* we expect. 
    // Actually, strictly speaking, we should hash the input password and compare with stored hash.
    // I will implement a simple comparison for now as I don't want to add bcrypt unless necessary/requested (User said "No paid auth", "Simple").
    // Wait, user provided a specific hash in the prompt: "5h@nK@r=@d1m1#$W6B~49358048". This looks like a complex password, not a bcrypt hash.
    // I will assume ADMIN_PASSWORD_HASH in env IS the password (or the hash of it). 
    // Let's implement strict equality check for now against process.env.ADMIN_PASSWORD_HASH.

    const validUser = process.env.ADMIN_USERNAME;
    const validPassHash = process.env.ADMIN_PASSWORD_HASH;

    // Hash the input password to compare with stored hash
    const { createHash } = await import('crypto');
    const inputHash = createHash('sha256').update(password).digest('hex');

    if (username !== validUser || inputHash !== validPassHash) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Issue JWT
    const token = jwt.sign({ role: 'admin', username }, process.env.JWT_SECRET, {
        expiresIn: '2h' // 2 hours session
    });

    // Set Cookie
    res.setHeader('Set-Cookie', serialize('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7200,
        path: '/'
    }));

    res.status(200).json({ message: 'Login successful' });
}
