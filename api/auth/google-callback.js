import { signToken, setAuthCookie, parseCookies } from '../../lib/auth.js';

export default async function handler(req, res) {
    const { code } = req.query;
    const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

    if (!code) {
        return res.redirect('/?error=no_code');
    }

    try {
        // 1. Exchange code for token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: `${SITE_URL}/api/auth/google-callback`,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

        const { access_token } = tokenData;

        // 2. Get user profile
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const profile = await profileResponse.json();

        // 3. Create session JWT
        const sessionToken = signToken({
            provider: 'google',
            provider_id: profile.id,
            name: profile.name,
            email: profile.email,
            avatar: profile.picture
        });

        // 4. Set cookie
        setAuthCookie(res, sessionToken);

        // 5. Redirect back
        const cookies = parseCookies(req);
        const redirectUrl = cookies.redirect_after_login || '/';
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('Google OAuth Error:', error);
        res.redirect('/?error=google_auth_failed');
    }
}
