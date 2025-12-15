import { serialize } from 'cookie';

export default async function handler(req, res) {
    res.setHeader('Set-Cookie', serialize('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: -1,
        path: '/'
    }));

    res.status(200).json({ message: 'Logged out' });
}
