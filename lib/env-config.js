import 'dotenv/config';

/**
 * environment variable validation and configuration
 */

const requiredEnvVars = [
    'TURSO_DATABASE_URL',
    'TURSO_AUTH_TOKEN',
    'JWT_SECRET',
    'EMAIL_ADMIN',
    'EMAIL_CONTACT',
    'EMAIL_NOTIFICATION',
    'EMAIL_NO_REPLY',
    'EMAIL_SECURITY',
    'EMAIL_INFO'
];

// Optional but recommended
const optionalEnvVars = [
    'TURSO_INFRA_DATABASE_URL', // Defaults to TURSO_DATABASE_URL if missing
    'TURSO_INFRA_AUTH_TOKEN',   // Defaults to TURSO_AUTH_TOKEN if missing
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS'
];

function validateEnv() {
    const missing = requiredEnvVars.filter(key => !process.env[key]);

    if (missing.length > 0) {
        // In production, we might want to throw. In dev, maybe just warn?
        // For now, let's warn to avoid crashing if user hasn't set them all yet locally
        console.warn(`⚠️  Missing required environment variables: ${missing.join(', ')}`);
    }
}

// Validate on import
validateEnv();

export const env = {
    database: {
        primary: {
            url: process.env.TURSO_DATABASE_URL,
            token: process.env.TURSO_AUTH_TOKEN
        },
        infra: {
            url: process.env.TURSO_INFRA_DATABASE_URL || process.env.TURSO_DATABASE_URL,
            token: process.env.TURSO_INFRA_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN
        },
        subscriber: {
            url: process.env.TURSO_SUBSCRIBER_DATABASE_URL || process.env.TURSO_DATABASE_URL,
            token: process.env.TURSO_SUBSCRIBER_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN
        }
    },
    email: {
        admin: process.env.EMAIL_ADMIN,
        contact: process.env.EMAIL_CONTACT,
        notification: process.env.EMAIL_NOTIFICATION,
        noReply: process.env.EMAIL_NO_REPLY,
        security: process.env.EMAIL_SECURITY,
        info: process.env.EMAIL_INFO,
        smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            secure: parseInt(process.env.SMTP_PORT || '587') === 465 // True for 465, false for 587
        }
    },
    security: {
        jwtSecret: process.env.JWT_SECRET,
        oauth: {
            google: {
                id: process.env.GOOGLE_CLIENT_ID,
                secret: process.env.GOOGLE_CLIENT_SECRETS
            },
            github: {
                id: process.env.GITHUB_Client_ID,
                secret: process.env.GITHUB_CLIENT_SECRET
            },
            twitter: {
                id: process.env.TWITTER_CLIENT_ID,
                secret: process.env.TWITTER_CLIENT_SECRET
            }
        }
    },
    isProd: process.env.NODE_ENV === 'production'
};
