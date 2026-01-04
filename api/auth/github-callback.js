import { signToken, setAuthCookie, parseCookies } from '../../lib/auth.js';

export default async function handler(req, res) {
    const { code } = req.query;
    const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

    if (!code) {
        return res.redirect('/?error=no_code');
    }

    try {
        // 1. Exchange code for token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                code,
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                redirect_uri: `${SITE_URL}/api/auth/github-callback`
            })
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

        const { access_token } = tokenData;

        // 2. Get user profile
        const profileResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `token ${access_token}`,
                'User-Agent': 'shankararyal-blog-comments'
            }
        });

        const profile = await profileResponse.json();

        // 3. Create session JWT
        const sessionToken = signToken({
            provider: 'github',
            provider_id: profile.id.toString(),
            name: profile.name || profile.login,
            email: profile.email,
            avatar: profile.avatar_url
        });

        // 4. Set cookie
        setAuthCookie(res, sessionToken);

        // 5. Redirect back
        const cookies = parseCookies(req);
        const redirectUrl = cookies.redirect_after_login || '/';
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('GitHub OAuth Error:', error);
        res.redirect('/?error=github_auth_failed');
    }
}
