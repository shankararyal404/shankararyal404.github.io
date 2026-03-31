import { queryInfra } from './db-pool.js';
import { emailHelpers } from './mail.js';

export const AuditSeverity = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical'
};

export const AuditEvent = {
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILED: 'login_failed',
    LOGOUT: 'logout',
    ADMIN_ACTION: 'admin_action',
    RATE_LIMIT: 'rate_limit_exceeded',
    CSRF_FAIL: 'csrf_validation_failed',
    SYSTEM_ERROR: 'system_error'
};

/**
 * Log a security or system event
 * @param {Object} event
 * @param {string} event.type - Event type
 * @param {string} event.userId - User ID if known
 * @param {string} event.ip - IP Address
 * @param {string} event.userAgent - User Agent
 * @param {Object} event.metadata - Additional data
 * @param {string} event.severity - Severity level
 */
export async function logAudit({ type, userId = null, ip = null, userAgent = null, metadata = {}, severity = AuditSeverity.INFO }) {
    try {
        // 1. Write to DB
        await queryInfra({
            sql: `INSERT INTO audit_logs (event_type, user_id, ip_address, user_agent, metadata, severity)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [type, userId, ip, userAgent, JSON.stringify(metadata), severity]
        });

        // 2. Alert if Critical
        if (severity === AuditSeverity.CRITICAL) {
            await emailHelpers.sendSecurityAlert(
                `Critical Event: ${type}`,
                `
Severity: ${severity.toUpperCase()}
User: ${userId || 'Unknown'}
IP: ${ip}
Metadata: ${JSON.stringify(metadata, null, 2)}
                `
            );
        }

    } catch (error) {
        console.error('Failed to write audit log:', error);
        // Fallback: try to send email if DB fails for critical errors?
        // For now just log to console to avoid loop
    }
}
