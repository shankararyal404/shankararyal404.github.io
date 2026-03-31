import nodemailer from 'nodemailer';
import { env } from './env-config.js';

// Email addresses from environment
export const EMAIL_ADDRESSES = {
    contact: env.email.contact,
    admin: env.email.admin,
    notification: env.email.notification,
    noReply: env.email.noReply,
    security: env.email.security,
    info: env.email.info,
};

// Create transporter
const transporter = nodemailer.createTransport(env.email.smtp);

/**
 * Base send email function
 */
export async function sendEmail({ from, to, subject, html, text }) {
    if (!to) {
        console.warn('⚠️ Email attempt with no recipient');
        return false;
    }

    try {
        await transporter.sendMail({
            from: from || EMAIL_ADDRESSES.noReply,
            to,
            subject,
            html,
            text,
        });
        return true;
    } catch (error) {
        console.error('Email send failed to:', to, 'Error:', error.message);
        return false;
    }
}

// Helper utilities for specific use cases
export const emailHelpers = {
    // Send security alert (failed logins, etc)
    async sendSecurityAlert(subject, body) {
        return sendEmail({
            from: EMAIL_ADDRESSES.noReply,
            to: EMAIL_ADDRESSES.security,
            subject: `🚨 ${subject}`,
            html: `
                <div style="font-family: monospace; padding: 20px; background: #f8f8f8; border: 1px solid #ddd;">
                    <h2 style="color: #d9534f;">Security Alert</h2>
                    <p><strong>Event:</strong> ${subject}</p>
                    <pre style="background: #eee; padding: 10px;">${body}</pre>
                    <p style="font-size: 12px; color: #666;">Timestamp: ${new Date().toISOString()}</p>
                </div>
            `,
        });
    },

    // Send OTP
    async sendOTP(toEmail, otp) {
        return sendEmail({
            from: EMAIL_ADDRESSES.security,
            to: toEmail,
            subject: 'Your Login Code',
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Authentication Required</h2>
                    <p>Your one-time password is:</p>
                    <h1 style="letter-spacing: 5px; background: #f0f0f0; padding: 10px; display: inline-block;">${otp}</h1>
                    <p>This code expires in 2 minutes.</p>
                </div>
            `,
        });
    },

    // Send contact form notification to admin
    async notifyContactForm(userEmail, message) {
        return sendEmail({
            from: EMAIL_ADDRESSES.info,
            to: EMAIL_ADDRESSES.admin, // or contact email
            subject: `New Contact Form: ${userEmail}`,
            html: `
                <div style="font-family: sans-serif;">
                    <h3>New Contact Message</h3>
                    <p><strong>From:</strong> ${userEmail}</p>
                    <hr/>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>
            `,
        });
    },

    // Notify admin of new comment
    async notifyNewComment(postSlug, author, content) {
        return sendEmail({
            from: EMAIL_ADDRESSES.noReply,
            to: EMAIL_ADDRESSES.notification,
            subject: `New Comment on: ${postSlug}`,
            html: `
                <div style="font-family: sans-serif;">
                    <h3>New Comment Waiting</h3>
                    <p><strong>Post:</strong> ${postSlug}</p>
                    <p><strong>Author:</strong> ${author}</p>
                    <blockquote style="background: #f9f9f9; padding: 10px; border-left: 3px solid #ccc;">
                        ${content}
                    </blockquote>
                    <p><a href="https://www.shankararyal404.com.np/admin">Manage Comments</a></p>
                </div>
            `,
        });
    }
};

// Export transporter for custom usage if needed
export { transporter };
