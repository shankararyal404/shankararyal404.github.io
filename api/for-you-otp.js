import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const OTP_SECRET = process.env.FOR_YOU_OTP_SECRET || 'otp-fallback-secret';
const JWT_SECRET = process.env.FOR_YOU_JWT_SECRET || 'jwt-fallback-secret';

function verifyOTP(submittedOtp, otpToken) {
  try {
    const decoded = Buffer.from(otpToken, 'base64url').toString('utf8');
    const parts   = decoded.split(':');
    if (parts.length !== 3) return false;
    const [otpHash, expiry, sig] = parts;
    const payload = otpHash + ':' + expiry;
    const expectedSig = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
    if (sig !== expectedSig) return false;
    if (Date.now() > parseInt(expiry)) return false;
    const submittedHash = crypto.createHmac('sha256', OTP_SECRET).update(submittedOtp.trim()).digest('hex');
    return submittedHash === otpHash;
  } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store, no-cache');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { otp, otpToken } = req.body || {};
  if (!otp || !otpToken)
    return res.status(400).json({ error: 'Missing required fields.' });

  if (!verifyOTP(String(otp), otpToken))
    return res.status(401).json({ error: 'Invalid or expired code. Please try again.' });

  const sessionToken = jwt.sign(
    { authenticated: true, purpose: 'for-you', v: 1 },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  return res.status(200).json({ success: true, sessionToken });
}
