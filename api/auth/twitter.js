export default function handler(req, res) {
    const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
    // Using OAuth 2.0 PKCE flow for X (simplified initiation)
    // Note: Twitter OAuth 2.0 requires more steps (challenge, etc.), 
    // This is a placeholder for the initiation URL structure.
    const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${process.env.TWITTER_CLIENT_ID}&` +
        `redirect_uri=${SITE_URL}/api/auth/twitter-callback&` +
        `scope=tweet.read%20users.read%20offline.access&` +
        `state=state&` +
        `code_challenge=challenge&` +
        `code_challenge_method=plain`;

    res.redirect(twitterAuthUrl);
}
