import { verifyToken, signToken, setAuthCookie, clearAuthCookie, parseCookies, isAuthenticated } from '../lib/auth.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from '../lib/rateLimit.js';
import { sendMail } from '../lib/mail.js';

export default async function handler(req, res) {
    const { provider, action, code } = req.query;
    const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

    // 1. Social Auth Initiation
    if (req.method === 'GET' && provider && !code) {
        if (provider === 'google') {
            return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${SITE_URL}/api/auth/google-callback&response_type=code&scope=openid email profile`);
        }
        if (provider === 'github') {
            return res.redirect(`https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${SITE_URL}/api/auth/github-callback&scope=read:user user:email`);
        }
        if (provider === 'facebook') {
            return res.redirect(`https://www.facebook.com/v12.0/dialog/oauth?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${SITE_URL}/api/auth/facebook-callback&scope=email,public_profile`);
        }
        if (provider === 'twitter') {
            return res.redirect(`https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${SITE_URL}/api/auth/twitter-callback&scope=tweet.read%20users.read%20offline.access&state=state&code_challenge=challenge&code_challenge_method=plain`);
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
                    body: JSON.stringify({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: `${SITE_URL}/api/auth/google-callback`, grant_type: 'authorization_code' })
                });
                const td = await tr.json();
                const pr = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${td.access_token}` } });
                const p = await pr.json();
                profile = { provider: 'google', provider_id: p.id, name: p.name, email: p.email, avatar: p.picture };
            } else if (provider === 'github') {
                const tr = await fetch('https://github.com/login/oauth/access_token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ code, client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, redirect_uri: `${SITE_URL}/api/auth/github-callback` })
                });
                const td = await tr.json();
                const pr = await fetch('https://api.github.com/user', { headers: { Authorization: `token ${td.access_token}`, 'User-Agent': 'blog' } });
                const p = await pr.json();
                profile = { provider: 'github', provider_id: p.id.toString(), name: p.name || p.login, email: p.email, avatar: p.avatar_url };
            } else if (provider === 'facebook') {
                const tr = await fetch(`https://graph.facebook.com/v12.0/oauth/access_token?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${SITE_URL}/api/auth/facebook-callback&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&code=${code}`);
                const td = await tr.json();
                const pr = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${td.access_token}`);
                const p = await pr.json();
                profile = { provider: 'facebook', provider_id: p.id, name: p.name, email: p.email, avatar: p.picture?.data?.url };
            } else if (provider === 'twitter') {
                const tr = await fetch('https://api.twitter.com/2/oauth2/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}` },
                    body: new URLSearchParams({ code, grant_type: 'authorization_code', client_id: process.env.TWITTER_CLIENT_ID, redirect_uri: `${SITE_URL}/api/auth/twitter-callback`, code_verifier: 'challenge' })
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
            try {
                await sendMail({ from: process.env.EMAIL_USER, to: process.env.EMAIL_TO, subject: 'Admin OTP', html: `<h1>${genOtp}</h1>` });
            } catch (mErr) { console.error("Mail error:", mErr); }
            const token = jwt.sign({ username, otpHash, purpose: '2fa' }, process.env.JWT_SECRET, { expiresIn: '5m' });
            return res.status(200).json({ requireOtp: true, tempToken: token });
        }
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.status(405).json({ message: 'Not Allowed' });
}
