export default function handler(req, res) {
    const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${SITE_URL}/api/auth/google-callback&` +
        `response_type=code&` +
        `scope=openid email profile`;

    res.redirect(googleAuthUrl);
}
