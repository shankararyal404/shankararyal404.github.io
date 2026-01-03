import { isAuthenticated } from '../lib/auth.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from '../lib/rateLimit.js';
import { sendMail } from '../lib/mail.js';

export default async function handler(req, res) {
    // POST: Login & OTP Verification
    if (req.method === 'POST') {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // 🔒 Rate Limiting: Max 3 attempts per minute per IP
        if (!checkRateLimit(`auth-${ip}`, 3, 60 * 1000)) {
            return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
        }

        const { username, password, otp, tempToken } = req.body;

        // === STEP 2: VERIFY OTP ===
        if (otp && tempToken) {
            try {
                const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
                if (decoded.purpose !== '2fa') throw new Error('Invalid token purpose');

                // Verify OTP
                const isValid = bcrypt.compareSync(otp, decoded.otpHash);
                if (!isValid) return res.status(401).json({ message: 'Invalid OTP code' });

                // Success: Issue Real Session Token
                const token = jwt.sign({ username: decoded.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
                const isProduction = process.env.NODE_ENV === 'production';
                const secureFlag = isProduction ? 'Secure;' : '';

                // 🔐 CSRF & Security: SameSite=Strict, HttpOnly
                res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; ${secureFlag} SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`);
                return res.status(200).json({ success: true, message: 'Authenticated' });
            } catch (err) {
                console.error("OTP Error:", err);
                return res.status(401).json({ message: 'Session expired or invalid. Please login again.' });
            }
        }

        // === STEP 1: VERIFY PASSWORD ===
        if (username === process.env.ADMIN_USERNAME && bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH)) {
            // Generate 6-digit OTP
            const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpHash = bcrypt.hashSync(generatedOtp, 10);

            // Send OTP via Email
            try {
                await sendMail({
                    from: process.env.EMAIL_USER,
                    to: process.env.EMAIL_TO || 'shankararyal404@gmail.com',
                    subject: '🔐 Admin Access OTP - Shankar Aryal',
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                            <h2 style="color: #333;">Admin Login Request</h2>
                            <p>Here is your One-Time Password (OTP) to verify your identity:</p>
                            <h1 style="color: #2b79c2; letter-spacing: 5px; background: #f0f8ff; padding: 10px; text-align: center; border-radius: 5px;">${generatedOtp}</h1>
                            <p style="color: #666; font-size: 0.9em;">Valid for 5 minutes. Do not share this code.</p>
                        </div>
                    `
                });
            } catch (emailErr) {
                console.error("Email Sending Failed:", emailErr);
                return res.status(500).json({ message: 'Failed to send OTP. Check server logs.' });
            }

            // Return Temporary Token to Client (Required for Step 2)
            // Token contains Hashed OTP, so server remains stateless
            const tempToken = jwt.sign(
                { username, otpHash, purpose: '2fa' },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );

            return res.status(200).json({
                requireOtp: true,
                tempToken,
                message: 'OTP sent to your registered email.'
            });

        } else {
            console.warn(`Failed login attempt for ${username} from ${ip}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
    }

    // GET: Verify Session
    if (req.method === 'GET') {
        const authenticated = isAuthenticated(req);
        return res.status(200).json({ authenticated });
    }

    // DELETE: Logout
    if (req.method === 'DELETE') {
        res.setHeader('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}
