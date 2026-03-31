/**
 * Security Event Logger
 * Logs security-related events for monitoring and incident response
 */

/**
 * Log levels
 */
export const LogLevel = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL'
};

/**
 * Security event types
 */
export const SecurityEvent = {
    // Authentication
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',

    // Authorization
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    PERMISSION_DENIED: 'PERMISSION_DENIED',

    // Rate Limiting
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

    // Input Validation
    INVALID_INPUT: 'INVALID_INPUT',
    XSS_ATTEMPT: 'XSS_ATTEMPT',
    SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',

    // CSRF
    CSRF_VALIDATION_FAILED: 'CSRF_VALIDATION_FAILED',
    CSRF_TOKEN_MISSING: 'CSRF_TOKEN_MISSING',

    // IP Blocking
    BLOCKED_IP_ATTEMPT: 'BLOCKED_IP_ATTEMPT',
    IP_BLOCKED: 'IP_BLOCKED',

    // Spam
    SPAM_DETECTED: 'SPAM_DETECTED',
    HONEYPOT_TRIGGERED: 'HONEYPOT_TRIGGERED',

    // Data
    DATA_BREACH_ATTEMPT: 'DATA_BREACH_ATTEMPT',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',

    // Admin
    ADMIN_ACTION: 'ADMIN_ACTION',
    CONFIG_CHANGED: 'CONFIG_CHANGED'
};

/**
 * Logs a security event
 * @param {string} event - Event type from SecurityEvent
 * @param {object} details - Event details
 * @param {string} level - Log level (default: WARNING)
 */
export function logSecurityEvent(event, details = {}, level = LogLevel.WARNING) {
    const timestamp = new Date().toISOString();

    const logEntry = {
        timestamp,
        event,
        level,
        ...details
    };

    // Console logging with color coding
    const prefix = `[SECURITY:${level}]`;

    switch (level) {
        case LogLevel.CRITICAL:
            console.error(prefix, JSON.stringify(logEntry, null, 2));
            break;
        case LogLevel.ERROR:
            console.error(prefix, JSON.stringify(logEntry, null, 2));
            break;
        case LogLevel.WARNING:
            console.warn(prefix, JSON.stringify(logEntry, null, 2));
            break;
        default:
            console.log(prefix, JSON.stringify(logEntry, null, 2));
    }

    // TODO: Send to external logging service
    // await sendToSentry(logEntry);
    // await sendToDatadog(logEntry);
    // await sendToCloudWatch(logEntry);

    return logEntry;
}

/**
 * Logs authentication events
 */
export function logAuthEvent(event, username, ip, success = false, details = {}) {
    return logSecurityEvent(
        event,
        {
            username,
            ip,
            success,
            userAgent: details.userAgent,
            ...details
        },
        success ? LogLevel.INFO : LogLevel.WARNING
    );
}

/**
 * Logs rate limit violations
 */
export function logRateLimitEvent(ip, endpoint, details = {}) {
    return logSecurityEvent(
        SecurityEvent.RATE_LIMIT_EXCEEDED,
        {
            ip,
            endpoint,
            ...details
        },
        LogLevel.WARNING
    );
}

/**
 * Logs CSRF violations
 */
export function logCsrfEvent(ip, endpoint, details = {}) {
    return logSecurityEvent(
        SecurityEvent.CSRF_VALIDATION_FAILED,
        {
            ip,
            endpoint,
            ...details
        },
        LogLevel.ERROR
    );
}

/**
 * Logs spam detection
 */
export function logSpamEvent(ip, content, reason, details = {}) {
    return logSecurityEvent(
        SecurityEvent.SPAM_DETECTED,
        {
            ip,
            contentLength: content?.length || 0,
            reason,
            ...details
        },
        LogLevel.WARNING
    );
}

/**
 * Logs blocked IP attempts
 */
export function logBlockedIpEvent(ip, endpoint, details = {}) {
    return logSecurityEvent(
        SecurityEvent.BLOCKED_IP_ATTEMPT,
        {
            ip,
            endpoint,
            ...details
        },
        LogLevel.ERROR
    );
}

/**
 * Logs admin actions
 */
export function logAdminAction(action, username, details = {}) {
    return logSecurityEvent(
        SecurityEvent.ADMIN_ACTION,
        {
            action,
            username,
            ...details
        },
        LogLevel.INFO
    );
}

/**
 * Logs suspicious activity
 */
export function logSuspiciousActivity(description, ip, details = {}) {
    return logSecurityEvent(
        SecurityEvent.SUSPICIOUS_ACTIVITY,
        {
            description,
            ip,
            ...details
        },
        LogLevel.CRITICAL
    );
}

/**
 * Logs input validation failures
 */
export function logValidationError(field, value, ip, details = {}) {
    return logSecurityEvent(
        SecurityEvent.INVALID_INPUT,
        {
            field,
            valueLength: value?.length || 0,
            ip,
            ...details
        },
        LogLevel.WARNING
    );
}

/**
 * Creates a summary of security events (for monitoring dashboard)
 * @param {array} events - Array of log entries
 * @returns {object} - Summary statistics
 */
export function createSecuritySummary(events) {
    const summary = {
        total: events.length,
        byLevel: {},
        byEvent: {},
        topIPs: {},
        timeline: []
    };

    events.forEach(event => {
        // Count by level
        summary.byLevel[event.level] = (summary.byLevel[event.level] || 0) + 1;

        // Count by event type
        summary.byEvent[event.event] = (summary.byEvent[event.event] || 0) + 1;

        // Count by IP
        if (event.ip) {
            summary.topIPs[event.ip] = (summary.topIPs[event.ip] || 0) + 1;
        }
    });

    return summary;
}
