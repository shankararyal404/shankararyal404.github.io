import { signToken, setAuthCookie, parseCookies } from '../../lib/auth.js';

export default async function handler(req, res) {
    const { code } = req.query;
    const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

    if (!code) return res.redirect('/?error=no_code');

    try {
        const tokenResponse = await fetch(`https://graph.facebook.com/v12.0/oauth/access_token?` +
            `client_id=${process.env.FACEBOOK_CLIENT_ID}&` +
            `redirect_uri=${SITE_URL}/api/auth/facebook-callback&` +
            `client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&` +
            `code=${code}`);

        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error(tokenData.error.message);

        const { access_token } = tokenData;

        const profileResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${access_token}`);
        const profile = await profileResponse.json();

        const sessionToken = signToken({
            provider: 'facebook',
            provider_id: profile.id,
            name: profile.name,
            email: profile.email,
            avatar: profile.picture?.data?.url
        });

        setAuthCookie(res, sessionToken);
        const cookies = parseCookies(req);
        res.redirect(cookies.redirect_after_login || '/');
    } catch (error) {
        console.error('Facebook OAuth Error:', error);
        res.redirect('/?error=facebook_auth_failed');
    }
}
