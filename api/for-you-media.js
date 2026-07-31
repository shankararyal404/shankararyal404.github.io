import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET  = process.env.FOR_YOU_JWT_SECRET || 'jwt-fallback-secret';
const ACCOUNT_ID  = process.env.R2_ACCOUNT_ID;
const BUCKET      = process.env.R2_BUCKET_NAME;
const ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY;
const REGION      = 'auto';

// Strict whitelist of allowed file names
const ALLOWED = new Set([
  'teddywithsunflower.jpg','teddywithcapandsunflower.jpg','bunnywithsunflower.jpg',
  'teddysunflower.jpg','teddykissingsunflower.jpg','teddybunny.jpg','sunflowers.jpg',
  'teddywithcake.jpg','teddywithsunflowercute.jpg','teddybunnycute.jpg',
  'vidiodancing.mp4','love-song.mp3',
  // Allow common extensions too
  'teddywithsunflower.jpeg','teddywithcapandsunflower.jpeg','bunnywithsunflower.jpeg',
  'teddysunflower.jpeg','teddykissingsunflower.jpeg','teddybunny.jpeg','sunflowers.jpeg',
  'teddywithcake.jpeg','teddywithsunflowercute.jpeg','teddybunnycute.jpeg',
  'vidiodancing.webm','love-song.mp3','love-song.ogg',
]);

function generatePresignedUrl(key, expiresSecs = 900) {
  const now      = new Date();
  const dateStr  = now.toISOString().slice(0,10).replace(/-/g,'');
  const dtStr    = now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const host     = ACCOUNT_ID + '.r2.cloudflarestorage.com';
  const path     = '/' + BUCKET + '/' + encodeURIComponent(key);
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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer '))
    return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    if (!decoded.authenticated || decoded.purpose !== 'for-you')
      throw new Error('invalid purpose');
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please refresh and log in again.' });
  }

  const { file } = req.query;
  if (!file || !ALLOWED.has(file))
    return res.status(400).json({ error: 'File not found.' });

  const url = generatePresignedUrl(file);
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ url });
}
