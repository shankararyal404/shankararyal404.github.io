import { isAuthenticated } from '../lib/auth.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    const { action } = req.query;

    if (action === 'login') {
        // LOGIN
        if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

        const { username, password } = req.body;

        if (username === process.env.ADMIN_USERNAME && bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH)) {
            const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '7d' });

            // Fix: Consistency with lib/auth.js (using auth_token with underscore)
            res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`);
            return res.status(200).json({ message: 'Login successful' });
        } else {
            console.log('Login failed for:', username);
            console.log('Expected user:', process.env.ADMIN_USERNAME);
            console.log('Password match:', bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH));
            return res.status(401).json({ message: 'Invalid credentials' });
        }

    } else if (action === 'logout') {
        // LOGOUT
        res.setHeader('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
        return res.status(200).json({ message: 'Logged out' });

    } else if (action === 'verify') {
        // VERIFY
        const authenticated = isAuthenticated(req);
        return res.status(200).json({ authenticated });

    } else {
        return res.status(400).json({ message: 'Invalid action parameter' });
    }
}
