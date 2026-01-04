export default function handler(req, res) {
    const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
    const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${process.env.GITHUB_CLIENT_ID}&` +
        `redirect_uri=${SITE_URL}/api/auth/github-callback&` +
        `scope=read:user user:email`;

    res.redirect(githubAuthUrl);
}
