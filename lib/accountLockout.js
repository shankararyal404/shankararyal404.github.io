/**
 * Account Lockout Protection
 * Prevents brute force attacks by locking accounts after failed login attempts
 */

// In-memory storage for failed attempts
// In production, consider using Redis or database
const failedAttempts = new Map();
const lockedAccounts = new Map();

// Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 3600000; // 1 hour in milliseconds
const ATTEMPT_WINDOW = 900000; // 15 minutes in milliseconds

/**
 * Records a failed login attempt
 * @param {string} username - Username that failed login
 * @param {string} ip - IP address of the attempt
 * @returns {object} - { locked: boolean, attemptsLeft: number, unlockAt: number }
 */
export function recordFailedLogin(username, ip) {
    const key = `${username}-${ip}`;
    const now = Date.now();

    // Get or create attempt record
    let attempts = failedAttempts.get(key) || {
        count: 0,
        firstAttempt: now,
        attempts: []
    };

    // Add current attempt
    attempts.attempts.push(now);
    attempts.count++;
    attempts.lastAttempt = now;

    // Clean up old attempts outside the window
    attempts.attempts = attempts.attempts.filter(
        time => now - time < ATTEMPT_WINDOW
    );
    attempts.count = attempts.attempts.length;

    // Update storage
    failedAttempts.set(key, attempts);

    // Check if account should be locked
    if (attempts.count >= MAX_FAILED_ATTEMPTS) {
        const unlockAt = now + LOCKOUT_DURATION;
        lockedAccounts.set(key, {
            lockedAt: now,
            unlockAt,
            attempts: attempts.count
        });

        return {
            locked: true,
            attemptsLeft: 0,
            unlockAt,
            minutesLeft: Math.ceil(LOCKOUT_DURATION / 60000)
        };
    }

    return {
        locked: false,
        attemptsLeft: MAX_FAILED_ATTEMPTS - attempts.count,
        unlockAt: null
    };
}

/**
 * Checks if an account is currently locked
 * @param {string} username - Username to check
 * @param {string} ip - IP address to check
 * @returns {object} - { locked: boolean, unlockAt: number, minutesLeft: number }
 */
export function isAccountLocked(username, ip) {
    const key = `${username}-${ip}`;
    const lockInfo = lockedAccounts.get(key);

    if (!lockInfo) {
        return { locked: false, unlockAt: null, minutesLeft: 0 };
    }

    const now = Date.now();

    // Check if lock has expired
    if (now >= lockInfo.unlockAt) {
        // Unlock account
        lockedAccounts.delete(key);
        failedAttempts.delete(key);
        return { locked: false, unlockAt: null, minutesLeft: 0 };
    }

    // Account is still locked
    const minutesLeft = Math.ceil((lockInfo.unlockAt - now) / 60000);

    return {
        locked: true,
        unlockAt: lockInfo.unlockAt,
        minutesLeft
    };
}

/**
 * Clears failed login attempts for a user (call on successful login)
 * @param {string} username - Username to clear
 * @param {string} ip - IP address to clear
 */
export function clearFailedAttempts(username, ip) {
    const key = `${username}-${ip}`;
    failedAttempts.delete(key);
    lockedAccounts.delete(key);
}

/**
 * Gets current attempt count for a user
 * @param {string} username - Username to check
 * @param {string} ip - IP address to check
 * @returns {number} - Number of failed attempts
 */
export function getAttemptCount(username, ip) {
    const key = `${username}-${ip}`;
    const attempts = failedAttempts.get(key);
    return attempts ? attempts.count : 0;
}

/**
 * Manually locks an account (for admin use)
 * @param {string} username - Username to lock
 * @param {string} ip - IP address to lock
 * @param {number} duration - Lock duration in milliseconds (default: 1 hour)
 */
export function lockAccount(username, ip, duration = LOCKOUT_DURATION) {
    const key = `${username}-${ip}`;
    const now = Date.now();

    lockedAccounts.set(key, {
        lockedAt: now,
        unlockAt: now + duration,
        manual: true
    });
}

/**
 * Manually unlocks an account (for admin use)
 * @param {string} username - Username to unlock
 * @param {string} ip - IP address to unlock
 */
export function unlockAccount(username, ip) {
    const key = `${username}-${ip}`;
    lockedAccounts.delete(key);
    failedAttempts.delete(key);
}

/**
 * Gets all currently locked accounts (for monitoring)
 * @returns {array} - Array of locked account info
 */
export function getLockedAccounts() {
    const locked = [];
    const now = Date.now();

    for (const [key, info] of lockedAccounts.entries()) {
        if (now < info.unlockAt) {
            const [username, ip] = key.split('-');
            locked.push({
                username,
                ip,
                lockedAt: info.lockedAt,
                unlockAt: info.unlockAt,
                minutesLeft: Math.ceil((info.unlockAt - now) / 60000),
                manual: info.manual || false
            });
        } else {
            // Clean up expired locks
            lockedAccounts.delete(key);
        }
    }

    return locked;
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanup() {
    const now = Date.now();

    // Clean up old failed attempts
    for (const [key, attempts] of failedAttempts.entries()) {
        if (now - attempts.lastAttempt > ATTEMPT_WINDOW) {
            failedAttempts.delete(key);
        }
    }

    // Clean up expired locks
    for (const [key, info] of lockedAccounts.entries()) {
        if (now >= info.unlockAt) {
            lockedAccounts.delete(key);
        }
    }
}

// Auto-cleanup every 5 minutes
setInterval(cleanup, 300000);
