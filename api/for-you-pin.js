import crypto from 'crypto';
import nodemailer from 'nodemailer';

const CORRECT_PIN   = process.env.FOR_YOU_PIN         || '20620416';
const OTP_SECRET    = process.env.FOR_YOU_OTP_SECRET  || 'otp-fallback-secret';
const OTP_EMAIL     = process.env.FOR_YOU_OTP_EMAIL   || 'garimaacharya2062@gmail.com';

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

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store, no-cache');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const ip = ((req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || 'unknown';
  if (!checkRateLimit(ip))
    return res.status(429).json({ error: 'Too many attempts. Please wait 15 minutes.' });

  const { pin } = req.body || {};
  if (!pin || String(pin) !== CORRECT_PIN)
    return res.status(401).json({ error: 'Incorrect PIN. Please try again.' });

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
      from:    '"\ud83d\udc9b A Secret Surprise" <' + process.env.SMTP_USER + '>',
      to:      OTP_EMAIL,
      subject: '\ud83d\udc8c Your Secret Code is Here!',
      html: `<div style="font-family:Georgia,serif;background:#0d0d2b;padding:40px;border-radius:20px;max-width:520px;margin:0 auto;border:2px solid rgba(244,193,103,0.4);"><div style="text-align:center;"><div style="font-size:56px;margin-bottom:12px;">&#x1F319;&#x2728;</div><h1 style="color:#f4c167;font-size:26px;margin:0 0 10px 0;">A Special Surprise Awaits!</h1><p style="color:#c8a96e;font-size:15px;line-height:1.7;">Someone has prepared something very special just for you &#x1F49B;<br>Use this code to unlock your birthday surprise:</p><div style="background:rgba(244,193,103,0.12);border:2px solid rgba(244,193,103,0.5);border-radius:18px;padding:32px;margin:24px 0;"><p style="color:#c8a96e;font-size:12px;letter-spacing:4px;text-transform:uppercase;margin:0 0 14px 0;">Your Secret Code</p><div style="font-size:52px;font-weight:900;color:#f4c167;letter-spacing:18px;font-family:monospace;">${otpDisplay}</div><p style="color:#9988aa;font-size:12px;margin:14px 0 0 0;">&#x23F0; Valid for <strong style="color:#f4c167;">5 minutes</strong> only</p></div><p style="color:#c8a96e;font-size:14px;font-style:italic;">Enter this code to unlock your beautiful birthday surprise &#x1F382;&#x1F33B;</p><div style="font-size:26px;letter-spacing:6px;margin-top:10px;">&#x1F49B;&#x1F33B;&#x1F43B;&#x1F495;&#x1F319;</div></div></div>`,
    });
  } catch (err) {
    console.error('[for-you-pin] Email error:', err.message);
    return res.status(500).json({ error: 'Failed to send code. Please try again.' });
  }

  return res.status(200).json({
    success: true, otpToken,
    email: OTP_EMAIL.replace(/(.{2}).+(@.+)/, '$1****$2'),
    message: 'Code sent to your email!',
  });
}
