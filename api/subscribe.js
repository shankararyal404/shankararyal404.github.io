import { querySubscriber as query } from '../lib/db.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { env } from '../lib/env-config.js';

export default async function handler(req, res) {
    const { action, token, email } = req.query;
    const siteUrl = process.env.SITE_URL || 'https://www.shankararyal404.com.np';

    // --- GET ACTIONS (Verify / Unsubscribe) ---
    if (req.method === 'GET') {
        // 1. VERIFY
        // 1. VERIFY
        if (action === 'verify') {
            if (!token) return res.status(400).send('Invalid token');
            try {
                const result = await query('SELECT * FROM subscribers WHERE verification_token = ?', [token]);

                if (result.length === 0) {
                    // Failover: Check if already verified (useful if link clicked twice)
                    if (email) {
                        const alreadyVerified = await query('SELECT * FROM subscribers WHERE email = ? AND is_verified = 1', [email]);
                        if (alreadyVerified.length > 0) {
                            return res.redirect(`${siteUrl}/?subscription=verified`);
                        }
                    }
                    return res.status(400).send('Invalid or expired token');
                }

                await query('UPDATE subscribers SET is_verified = 1, verification_token = NULL WHERE id = ?', [result[0].id]);
                return res.redirect(`${siteUrl}/?subscription=verified`);
            } catch (error) {
                console.error('Verification error:', error);
                return res.status(500).send('Internal server error');
            }
        }

        // 2. UNSUBSCRIBE
        if (action === 'unsubscribe') {
            if (!email) return res.status(400).send('Email required');
            try {
                await query('UPDATE subscribers SET unsubscribed_at = CURRENT_TIMESTAMP WHERE email = ?', [email]);
                return res.redirect(`${siteUrl}/?subscription=unsubscribed`);
            } catch (error) {
                console.error('Unsubscribe error:', error);
                return res.status(500).send('Internal server error');
            }
        }

        // Default GET
        return res.status(400).json({ error: 'Invalid action' });
    }

    // --- POST ACTION (New Subscribe) ---
    if (req.method === 'POST') {
        const { email: postEmail } = req.body;

        if (!postEmail || !/^\S+@\S+\.\S+$/.test(postEmail)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        try {
            const existing = await query('SELECT * FROM subscribers WHERE email = ?', [postEmail]);
            if (existing.length > 0 && existing[0].is_verified) {
                return res.status(409).json({ error: 'Email already subscribed' });
            }

            const newToken = crypto.randomBytes(32).toString('hex');
            const verifyLink = `${siteUrl}/api/subscribe?action=verify&token=${newToken}&email=${encodeURIComponent(postEmail)}`;

            if (existing.length > 0) {
                await query('UPDATE subscribers SET verification_token = ?, created_at = CURRENT_TIMESTAMP, unsubscribed_at = NULL WHERE email = ?', [newToken, postEmail]);
            } else {
                await query('INSERT INTO subscribers (email, verification_token) VALUES (?, ?)', [postEmail, newToken]);
            }

            // Send Email
            const transporter = nodemailer.createTransport(env.email.smtp);
            await transporter.sendMail({
                from: env.email.noReply || 'no-reply@shankararyal404.com.np',
                to: postEmail,
                subject: 'Confirm your subscription - Shankar Aryal Blog',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Welcome!</h2>
                        <p>Thanks for subscribing to my blog. Please click the button below to verify your email address.</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${verifyLink}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
                        </p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">If the button doesn't work, copy this link:<br>${verifyLink}</p>
                    </div>
                `
            });

            return res.status(200).json({ message: 'Verification email sent' });

        } catch (error) {
            console.error('Subscription error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
