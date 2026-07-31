import crypto from 'crypto';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

const CORRECT_PIN   = process.env.FOR_YOU_PIN         || '20620416';
const OTP_SECRET    = process.env.FOR_YOU_OTP_SECRET  || 'otp-fallback-secret';
const OTP_EMAIL     = process.env.FOR_YOU_OTP_EMAIL   || 'garimaacharya2062@gmail.com';
const JWT_SECRET    = process.env.FOR_YOU_JWT_SECRET  || 'jwt-fallback-secret';
const ACCOUNT_ID    = process.env.R2_ACCOUNT_ID;
const BUCKET        = process.env.R2_BUCKET_NAME;
const ACCESS_KEY    = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY    = process.env.R2_SECRET_ACCESS_KEY;
const REGION        = 'auto';

const ALLOWED_FILES = new Set([
  'teddywithsunflower.jpg','teddywithcapandsunflower.jpg','bunnywithsunflower.jpg',
  'teddysunflower.jpg','teddykissingsunflower.jpg','teddybunny.jpg','sunflowers.jpg',
  'teddywithcake.jpg','teddywithsunflowercute.jpg','teddybunnycute.jpg',
  'vidiodancing.mp4','love-song.mp3',
  'teddywithsunflower.jpeg','teddywithcapandsunflower.jpeg','bunnywithsunflower.jpeg',
  'teddysunflower.jpeg','teddykissingsunflower.jpeg','teddybunny.jpeg','sunflowers.jpeg',
  'teddywithcake.jpeg','teddywithsunflowercute.jpeg','teddybunnycute.jpeg',
  'vidiodancing.webm','love-song.ogg',
]);

const rateLimits = new Map();
function checkRateLimit(ip) {
  const now = Date.now(), key = 'pin-' + ip;
  const e = rateLimits.get(key) || { count: 0, resetAt: now + 15*60*1000 };
  if (now > e.resetAt) { e.count = 0; e.resetAt = now + 15*60*1000; }
  e.count++; rateLimits.set(key, e);
  return e.count <= 5;
}

function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }

function signOTP(otp) {
  const expiry  = Date.now() + 5*60*1000;
  const otpHash = crypto.createHmac('sha256', OTP_SECRET).update(otp).digest('hex');
  const payload = otpHash + ':' + expiry;
  const sig     = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
  return Buffer.from(payload + ':' + sig).toString('base64url');
}

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

function generatePresignedUrl(key, expiresSecs = 900) {
  const now      = new Date();
  const dateStr  = now.toISOString().slice(0,10).replace(/-/g,'');
  const dtStr    = now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const host     = ACCOUNT_ID + '.r2.cloudflarestorage.com';
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  const path     = '/' + BUCKET + '/' + encodedKey;
  const credScope= dateStr + '/' + REGION + '/s3/aws4_request';
  const cred     = ACCESS_KEY + '/' + credScope;

  const qp = [
    ['X-Amz-Algorithm','AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', cred],
    ['X-Amz-Date', dtStr],
    ['X-Amz-Expires', String(expiresSecs)],
    ['X-Amz-SignedHeaders','host'],
  ].sort(([a],[b]) => a.localeCompare(b));

  const qs = qp.map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');

  const canonReq = ['GET', path, qs, 'host:'+host+'\n', 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const s2s = ['AWS4-HMAC-SHA256', dtStr, credScope,
    crypto.createHash('sha256').update(canonReq,'utf8').digest('hex')].join('\n');

  const kDate    = crypto.createHmac('sha256','AWS4'+SECRET_KEY).update(dateStr).digest();
  const kRegion  = crypto.createHmac('sha256',kDate).update(REGION).digest();
  const kService = crypto.createHmac('sha256',kRegion).update('s3').digest();
  const kSign    = crypto.createHmac('sha256',kService).update('aws4_request').digest();
  const sig      = crypto.createHmac('sha256',kSign).update(s2s).digest('hex');

  return 'https://' + host + path + '?' + qs + '&X-Amz-Signature=' + sig;
}

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store, no-cache');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const action = req.query.action || (req.url.includes('pin') ? 'pin' : req.url.includes('otp') ? 'otp' : req.url.includes('media') ? 'media' : '');

  if (action === 'pin') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const ip = ((req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || 'unknown';
    if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Too many attempts. Please wait 15 minutes.' });

    const { pin } = req.body || {};
    if (!pin || String(pin) !== CORRECT_PIN) return res.status(401).json({ error: 'Incorrect PIN. Please try again.' });

    const otp = generateOTP();
    const otpToken = signOTP(otp);

    try {
      const t = nodemailer.createTransport({
        host:   process.env.SMTP_HOST || 'smtp.gmail.com',
        port:   parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const otpDisplay = otp.split('').join(' ');
      await t.sendMail({
        from:    '"💛 A Secret Surprise" <' + process.env.SMTP_USER + '>',
        to:      OTP_EMAIL,
        subject: '💌 Your Secret Code is Here!',
        html: `<div style="font-family:Georgia,serif;background:#0d0d2b;padding:40px;border-radius:20px;max-width:520px;margin:0 auto;border:2px solid rgba(244,193,103,0.4);"><div style="text-align:center;"><div style="font-size:56px;margin-bottom:12px;">&#x1F319;&#x2728;</div><h1 style="color:#f4c167;font-size:26px;margin:0 0 10px 0;">A Special Surprise Awaits!</h1><p style="color:#c8a96e;font-size:15px;line-height:1.7;">Someone has prepared something very special just for you &#x1F49B;<br>Use this code to unlock your birthday surprise:</p><div style="background:rgba(244,193,103,0.12);border:2px solid rgba(244,193,103,0.5);border-radius:18px;padding:32px;margin:24px 0;"><p style="color:#c8a96e;font-size:12px;letter-spacing:4px;text-transform:uppercase;margin:0 0 14px 0;">Your Secret Code</p><div style="font-size:52px;font-weight:900;color:#f4c167;letter-spacing:18px;font-family:monospace;">${otpDisplay}</div><p style="color:#9988aa;font-size:12px;margin:14px 0 0 0;">&#x23F0; Valid for <strong style="color:#f4c167;">5 minutes</strong> only</p></div><p style="color:#c8a96e;font-size:14px;font-style:italic;">Enter this code to unlock your beautiful birthday surprise &#x1F382;&#x1F33B;</p><div style="font-size:26px;letter-spacing:6px;margin-top:10px;">&#x1F49B;&#x1F33B;&#x1F43B;&#x1F495;&#x1F319;</div></div></div>`,
      });
    } catch (err) {
      console.error('[for-you] Email error:', err.message);
      return res.status(500).json({ error: 'Failed to send code. Please try again.' });
    }

    return res.status(200).json({
      success: true, otpToken,
      email: OTP_EMAIL.replace(/(.{2}).+(@.+)/, '$1****$2'),
      message: 'Code sent to your email!',
    });
  }

  if (action === 'otp') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { otp, otpToken } = req.body || {};
    if (!otp || !otpToken) return res.status(400).json({ error: 'Missing required fields.' });

    if (!verifyOTP(String(otp), otpToken)) return res.status(401).json({ error: 'Invalid or expired code. Please try again.' });

    const sessionToken = jwt.sign(
      { authenticated: true, purpose: 'for-you', v: 1 },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({ success: true, sessionToken });
  }

  if (action === 'media') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const auth = req.headers['authorization'] || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
      if (!decoded.authenticated || decoded.purpose !== 'for-you') throw new Error('invalid');
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session. Please refresh and log in again.' });
    }

    const { file } = req.query;
    if (!file || !ALLOWED_FILES.has(file)) return res.status(400).json({ error: 'File not found.' });

    let fullKey = file;
    if (file.endsWith('.mp3') || file.endsWith('.ogg')) {
      fullKey = 'music/' + file;
    } else {
      fullKey = 'Babe/' + file;
    }

    const url = generatePresignedUrl(fullKey);
    return res.status(200).json({ url });
  }

  return res.status(400).json({ error: 'Invalid action parameter.' });
}
