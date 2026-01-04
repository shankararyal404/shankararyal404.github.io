import { signToken, setAuthCookie, parseCookies } from '../../lib/auth.js';

export default async function handler(req, res) {
    const { code } = req.query;
    const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

    if (!code) return res.redirect('/?error=no_code');

    try {
        const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
            },
            body: new URLSearchParams({
                code,
                grant_type: 'authorization_code',
                client_id: process.env.TWITTER_CLIENT_ID,
                redirect_uri: `${SITE_URL}/api/auth/twitter-callback`,
                code_verifier: 'challenge'
            })
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

        const { access_token } = tokenData;

        // Get user profile
        const profileResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const profileData = await profileResponse.json();
        const profile = profileData.data;

        const sessionToken = signToken({
            provider: 'twitter',
            provider_id: profile.id,
            name: profile.name,
            email: '', // Twitter doesn't always provide email in basic scope
            avatar: profile.profile_image_url
        });

        setAuthCookie(res, sessionToken);
        const cookies = parseCookies(req);
        res.redirect(cookies.redirect_after_login || '/');
    } catch (error) {
        console.error('Twitter OAuth Error:', error);
        res.redirect('/?error=twitter_auth_failed');
    }
}
