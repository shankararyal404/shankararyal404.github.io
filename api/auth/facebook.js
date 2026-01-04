export default function handler(req, res) {
    const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
    const facebookAuthUrl = `https://www.facebook.com/v12.0/dialog/oauth?` +
        `client_id=${process.env.FACEBOOK_CLIENT_ID}&` +
        `redirect_uri=${SITE_URL}/api/auth/facebook-callback&` +
        `scope=email,public_profile`;

    res.redirect(facebookAuthUrl);
}
