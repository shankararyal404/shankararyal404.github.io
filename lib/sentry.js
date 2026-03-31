/**
 * Custom Error Monitoring Shim (Sentry Replacement)
 * Provides error tracking via Console Logs and Email Alerts
 */

import { emailHelpers } from './mail.js';
import { env } from './env-config.js';

// Configuration
const ENABLE_EMAIL_ALERTS = env.isProd; // Only send emails in production
let userContext = null;
const breadcrumbs = [];

/**
 * Capture an exception with context
 * @param {Error} error - The error to capture
 * @param {Object} context - Additional context (tags, extra, user)
 */
export function captureException(error, context = {}) {
    try {
        const timestamp = new Date().toISOString();

        // 1. Log to Console (Vercel Logs)
        const logData = {
            level: 'ERROR',
            timestamp,
            message: error.message || String(error),
            stack: error.stack,
            tags: context.tags || {},
            extra: context.extra || {},
            user: userContext || context.user || {},
            breadcrumbs: breadcrumbs.slice(-5) // Last 5 breadcrumbs
        };

        console.error(JSON.stringify(logData, null, 2));

        // 2. Send Email Alert (Critical/Production only)
        // Rate limit logging not implemented here but relied on general email sense
        if (ENABLE_EMAIL_ALERTS) {
            // Avoid awaiting to not block response
            emailHelpers.sendSecurityAlert(
                `Exception: ${error.message?.substring(0, 50) || 'Unknown Error'}`,
                `
Severity: ERROR
Endpoint: ${context.tags?.endpoint || 'Unknown'}
User: ${logData.user.email || logData.user.id || 'Anonymous'}
Stack Trace:
${error.stack?.substring(0, 1000)}

Extra Data:
${JSON.stringify(context.extra, null, 2)}
                `
            ).catch(err => console.error('Failed to send error email:', err));
        }

    } catch (loggingError) {
        console.error('Failed to log error:', loggingError);
        console.error('Original Error:', error);
    }
}

/**
 * Capture a message (non-error event)
 * @param {string} message - The message to capture
 * @param {string} level - Severity level (info, warning, error)
 * @param {Object} context - Additional context
 */
export function captureMessage(message, level = 'info', context = {}) {
    const logData = {
        level: level.toUpperCase(),
        timestamp: new Date().toISOString(),
        message,
        tags: context.tags || {},
        extra: context.extra || {},
        user: userContext
    };

    if (level === 'error' || level === 'fatal') {
        console.error(JSON.stringify(logData));
    } else if (level === 'warning') {
        console.warn(JSON.stringify(logData));
    } else {
        console.log(JSON.stringify(logData));
    }
}

/**
 * Add breadcrumb for debugging
 * @param {string} message - Breadcrumb message
 * @param {string} category - Category (navigation, http, user, etc.)
 * @param {string} level - Level (info, warning, error)
 */
export function addBreadcrumb(message, category = 'custom', level = 'info') {
    breadcrumbs.push({
        timestamp: Date.now(),
        message,
        category,
        level
    });

    // Keep only last 20
    if (breadcrumbs.length > 20) {
        breadcrumbs.shift();
    }
}

/**
 * Set user context for error tracking
 * @param {Object} user - User object { id, email, username }
 */
export function setUser(user) {
    userContext = user;
}

/**
 * Clear user context
 */
export function clearUser() {
    userContext = null;
}

/**
 * Wrap async function with error tracking
 * @param {Function} fn - Async function to wrap
 * @param {string} operation - Operation name for context
 */
export function withErrorTracking(fn, operation) {
    return async (...args) => {
        try {
            addBreadcrumb(`Starting ${operation}`, 'operation', 'info');
            const result = await fn(...args);
            addBreadcrumb(`Completed ${operation}`, 'operation', 'info');
            return result;
        } catch (error) {
            captureException(error, {
                tags: { operation },
                extra: { args: JSON.stringify(args) },
            });
            throw error;
        }
    };
}

export default {
    captureException,
    captureMessage,
    addBreadcrumb,
    setUser,
    clearUser,
    withErrorTracking
};
