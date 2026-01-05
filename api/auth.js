import { verifyToken, signToken, setAuthCookie, clearAuthCookie, parseCookies, isAuthenticated } from '../lib/auth.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from '../lib/rateLimit.js';
import { sendMail } from '../lib/mail.js';

export default async function handler(req, res) {
    const { provider, action, code } = req.query;

    // Dynamic SITE_URL detection to avoid localhost fallbacks on Vercel
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const SITE_URL = process.env.SITE_URL || `${protocol}://${host}`;

    // Robust Environment Variable mapping
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID;
    const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID;
    const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_ID;
    const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || process.env.TWITTER_ID;

    // Optional: Log missing variables for easier debugging in Vercel logs
    if (provider && !code) {
        if (provider === 'google' && !GOOGLE_CLIENT_ID) console.error("GOOGLE_CLIENT_ID is missing");
        if (provider === 'github' && !GITHUB_CLIENT_ID) console.error("GITHUB_CLIENT_ID is missing");
        if (provider === 'facebook' && !FACEBOOK_CLIENT_ID) console.error("FACEBOOK_CLIENT_ID is missing");
        if (provider === 'twitter' && !TWITTER_CLIENT_ID) console.error("TWITTER_CLIENT_ID is missing");
    }

    // 1. Social Auth Initiation
    if (req.method === 'GET' && provider && !code) {
        if (provider === 'google') {
            const params = new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                redirect_uri: `${SITE_URL}/api/auth/google-callback`,
                response_type: 'code',
                scope: 'openid email profile',
                prompt: 'select_account'
            });
            return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
        }
        if (provider === 'github') {
            const params = new URLSearchParams({
                client_id: GITHUB_CLIENT_ID,
                redirect_uri: `${SITE_URL}/api/auth/github-callback`,
                scope: 'read:user user:email'
            });
            return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
        }
        if (provider === 'facebook') {
            const params = new URLSearchParams({
                client_id: FACEBOOK_CLIENT_ID,
                redirect_uri: `${SITE_URL}/api/auth/facebook-callback`,
                scope: 'email,public_profile'
            });
            return res.redirect(`https://www.facebook.com/v12.0/dialog/oauth?${params.toString()}`);
        }
        if (provider === 'twitter') {
            const params = new URLSearchParams({
                response_type: 'code',
                client_id: TWITTER_CLIENT_ID,
                redirect_uri: `${SITE_URL}/api/auth/twitter-callback`,
                scope: 'tweet.read users.read offline.access',
                state: 'state',
                code_challenge: 'challenge',
                code_challenge_method: 'plain'
            });
            return res.redirect(`https://twitter.com/i/oauth2/authorize?${params.toString()}`);
        }
    }

    // 2. Social Auth Callback
    if (req.method === 'GET' && provider && code) {
        try {
            let profile;
            if (provider === 'google') {
                const tr = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        client_id: GOOGLE_CLIENT_ID,
                        client_secret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET,
                        redirect_uri: `${SITE_URL}/api/auth/google-callback`,
                        grant_type: 'authorization_code'
                    })
                });
                const td = await tr.json();
                const pr = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${td.access_token}` } });
                const p = await pr.json();
                profile = { provider: 'google', provider_id: p.id, name: p.name, email: p.email, avatar: p.picture };
            } else if (provider === 'github') {
                const tr = await fetch('https://github.com/login/oauth/access_token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        code,
                        client_id: GITHUB_CLIENT_ID,
                        client_secret: process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET,
                        redirect_uri: `${SITE_URL}/api/auth/github-callback`
                    })
                });
                const td = await tr.json();
                const pr = await fetch('https://api.github.com/user', { headers: { Authorization: `token ${td.access_token}`, 'User-Agent': 'blog' } });
                const p = await pr.json();
                profile = { provider: 'github', provider_id: p.id.toString(), name: p.name || p.login, email: p.email, avatar: p.avatar_url };
            } else if (provider === 'facebook') {
                const FB_SECRET = process.env.FACEBOOK_CLIENT_SECRET || process.env.FACEBOOK_SECRET || process.env.FACEBOOK_APP_SECRET;
                const tr = await fetch(`https://graph.facebook.com/v12.0/oauth/access_token?client_id=${FACEBOOK_CLIENT_ID}&redirect_uri=${SITE_URL}/api/auth/facebook-callback&client_secret=${FB_SECRET}&code=${code}`);
                const td = await tr.json();
                const pr = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${td.access_token}`);
                const p = await pr.json();
                profile = { provider: 'facebook', provider_id: p.id, name: p.name, email: p.email, avatar: p.picture?.data?.url };
            } else if (provider === 'twitter') {
                const TW_SECRET = process.env.TWITTER_CLIENT_SECRET || process.env.TWITTER_SECRET;
                const tr = await fetch('https://api.twitter.com/2/oauth2/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TW_SECRET}`).toString('base64')}` },
                    body: new URLSearchParams({ code, grant_type: 'authorization_code', client_id: TWITTER_CLIENT_ID, redirect_uri: `${SITE_URL}/api/auth/twitter-callback`, code_verifier: 'challenge' })
                });
                const td = await tr.json();
                const pr = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', { headers: { Authorization: `Bearer ${td.access_token}` } });
                const p = (await pr.json()).data;
                profile = { provider: 'twitter', provider_id: p.id, name: p.name, email: '', avatar: p.profile_image_url };
            }

            if (profile) {
                const token = signToken(profile);
                setAuthCookie(res, token);
                const cookies = parseCookies(req);
                return res.redirect(cookies.redirect_after_login || '/');
            }
        } catch (e) {
            console.error(`${provider} Auth Error:`, e);
            return res.redirect('/?error=auth_failed');
        }
    }

    // 3. Logout
    if (action === 'logout' || req.method === 'DELETE') {
        clearAuthCookie(res);
        res.setHeader('Set-Cookie', [
            'auth_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
            'auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
        ]);
        if (req.method === 'DELETE') return res.status(200).json({ success: true });
        return res.redirect(req.headers.referer || '/');
    }

    // 4. Verify/Session Check
    if (action === 'verify' || (req.method === 'GET' && !provider)) {
        const cookies = parseCookies(req);
        const adminAuth = isAuthenticated(req);
        const socialUser = verifyToken(cookies.auth_session);
        return res.status(200).json({
            authenticated: adminAuth || !!socialUser,
            admin: adminAuth,
            user: socialUser || (adminAuth ? { name: 'Admin', isAnonymous: false } : null)
        });
    }

    // 5. Admin Auth (POST)
    if (req.method === 'POST') {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (!checkRateLimit(`auth-${ip}`, 3, 60 * 1000)) return res.status(429).json({ message: 'Too many attempts' });

        const { username, password, otp, tempToken } = req.body;

        if (otp && tempToken) {
            try {
                const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
                if (decoded.purpose !== '2fa') throw new Error();
                if (!bcrypt.compareSync(otp, decoded.otpHash)) return res.status(401).json({ message: 'Invalid OTP' });
                const token = jwt.sign({ username: decoded.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
                res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`);
                return res.status(200).json({ success: true });
            } catch (e) { return res.status(401).json({ message: 'Session expired' }); }
        }

        if (username === process.env.ADMIN_USERNAME && bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH)) {
            const genOtp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpHash = bcrypt.hashSync(genOtp, 10);

            const siteUrl = process.env.SITE_URL || 'https://shankararyal404.com.np';
            const emailHtml = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 20px auto; padding: 30px; border-radius: 15px; background: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #e1e8f0;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1a365d; font-size: 24px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Admin Login Request</h1>
                    </div>
                    
                    <div style="color: #4a5568; line-height: 1.6; font-size: 16px;">
                        <p style="margin-bottom: 25px;">Hello,</p>
                        <p style="margin-bottom: 20px;">Here is your One-Time Password (OTP) to verify your identity:</p>
                        
                        <div style="background: #f7fafc; border: 2px dashed #3b82f6; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                            <span style="font-size: 42px; font-weight: 800; color: #2563eb; letter-spacing: 8px; display: block;">${genOtp}</span>
                        </div>
                        
                        <p style="font-size: 14px; color: #718096; margin-bottom: 30px;">
                            Valid for <strong>5 minutes</strong>. Do not share this code with anyone.
                        </p>
                        
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; margin-top: 30px;">
                            <p style="margin: 0; font-weight: 600; color: #2d3748;">Our Website Team - Shankar Aryal</p>
                            <p style="margin: 5px 0 0;"><a href="${siteUrl}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Visit our website</a></p>
                        </div>
                        
                        <div style="margin-top: 40px; padding: 15px; border-radius: 8px; background: #fff5f5; border-left: 4px solid #f56565;">
                            <p style="margin: 0; font-size: 13px; color: #c53030; font-weight: 500;">
                                <strong>Note:</strong> Without the authorization of Admin Shankar Aryal, login attempts may be considered illegal activity and appropriate action/punishment will be taken.
                            </p>
                        </div>
                    </div>
                </div>
            `;

            try {
                await sendMail({
                    from: process.env.EMAIL_USER,
                    to: process.env.EMAIL_TO,
                    subject: 'Admin Login OTP - Action Required',
                    html: emailHtml
                });
            } catch (mErr) { console.error("Mail error:", mErr); }
            const token = jwt.sign({ username, otpHash, purpose: '2fa' }, process.env.JWT_SECRET, { expiresIn: '5m' });
            return res.status(200).json({ requireOtp: true, tempToken: token });
        }
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.status(405).json({ message: 'Not Allowed' });
}
