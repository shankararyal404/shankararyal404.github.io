/**
 * Input Validation Utilities
 * Comprehensive validation functions for user inputs
 */

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
export function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;

    // RFC 5322 compliant email regex (simplified)
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Additional checks
    if (email.length > 254) return false; // Max email length
    if (email.includes('..')) return false; // No consecutive dots

    return regex.test(email);
}

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @param {array} allowedProtocols - Allowed protocols (default: http, https)
 * @returns {boolean} - True if valid URL
 */
export function validateUrl(url, allowedProtocols = ['http:', 'https:']) {
    if (!url || typeof url !== 'string') return false;

    try {
        const parsed = new URL(url);
        return allowedProtocols.includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * Validates slug format (lowercase alphanumeric with hyphens)
 * @param {string} slug - Slug to validate
 * @returns {boolean} - True if valid slug
 */
export function validateSlug(slug) {
    if (!slug || typeof slug !== 'string') return false;

    const regex = /^[a-z0-9-]+$/;
    return regex.test(slug) && slug.length >= 3 && slug.length <= 100;
}

/**
 * Validates username format
 * @param {string} username - Username to validate
 * @returns {boolean} - True if valid username
 */
export function validateUsername(username) {
    if (!username || typeof username !== 'string') return false;

    // 3-30 characters, alphanumeric, underscore, hyphen
    const regex = /^[a-zA-Z0-9_-]{3,30}$/;
    return regex.test(username);
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, errors: array }
 */
export function validatePassword(password) {
    const errors = [];

    if (!password || typeof password !== 'string') {
        return { valid: false, errors: ['Password is required'] };
    }

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }

    if (password.length > 128) {
        errors.push('Password must be less than 128 characters');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain number');
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
        errors.push('Password must contain special character');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Sanitizes string input
 * @param {string} input - Input to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input, maxLength = 1000) {
    if (typeof input !== 'string') return '';

    return input
        .trim()
        .slice(0, maxLength)
        .replace(/[<>]/g, ''); // Remove potential HTML tags
}

/**
 * Validates phone number (international format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone
 */
export function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;

    // Remove spaces, hyphens, parentheses
    const cleaned = phone.replace(/[\s\-()]/g, '');

    // Must start with + and have 10-15 digits
    const regex = /^\+?[1-9]\d{9,14}$/;
    return regex.test(cleaned);
}

/**
 * Validates date string (ISO 8601 format)
 * @param {string} dateString - Date to validate
 * @returns {boolean} - True if valid date
 */
export function validateDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

/**
 * Validates integer within range
 * @param {any} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} - True if valid integer in range
 */
export function validateInteger(value, min = -Infinity, max = Infinity) {
    const num = parseInt(value, 10);
    return Number.isInteger(num) && num >= min && num <= max;
}

/**
 * Validates content length
 * @param {string} content - Content to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateContentLength(content, minLength = 1, maxLength = 5000) {
    if (!content || typeof content !== 'string') {
        return { valid: false, error: 'Content is required' };
    }

    const length = content.trim().length;

    if (length < minLength) {
        return { valid: false, error: `Content must be at least ${minLength} characters` };
    }

    if (length > maxLength) {
        return { valid: false, error: `Content must be less than ${maxLength} characters` };
    }

    return { valid: true, error: null };
}

/**
 * Validates file extension
 * @param {string} filename - Filename to validate
 * @param {array} allowedExtensions - Allowed extensions (e.g., ['jpg', 'png'])
 * @returns {boolean} - True if valid extension
 */
export function validateFileExtension(filename, allowedExtensions) {
    if (!filename || typeof filename !== 'string') return false;

    const ext = filename.split('.').pop().toLowerCase();
    return allowedExtensions.includes(ext);
}

/**
 * Validates hex color code
 * @param {string} color - Color code to validate
 * @returns {boolean} - True if valid hex color
 */
export function validateHexColor(color) {
    if (!color || typeof color !== 'string') return false;

    const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return regex.test(color);
}
