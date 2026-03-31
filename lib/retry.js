/**
 * Retry function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} baseDelay - Base delay in milliseconds (default: 100)
 * @returns {Promise<*>} Result of function
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 100) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on last attempt
            if (attempt === maxRetries - 1) {
                break;
            }

            // Don't retry on client errors (4xx)
            if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt);
            const jitter = Math.random() * baseDelay; // Add jitter to prevent thundering herd
            const totalDelay = delay + jitter;

            console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${Math.round(totalDelay)}ms...`);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, totalDelay));
        }
    }

    // All retries failed
    console.error(`[Retry] All ${maxRetries} attempts failed`);
    throw lastError;
}

/**
 * Retry function with linear backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise<*>} Result of function
 */
export async function retryWithDelay(fn, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries - 1) {
                break;
            }

            console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Retry function with custom retry condition
 * @param {Function} fn - Async function to retry
 * @param {Function} shouldRetry - Function to determine if should retry (error) => boolean
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<*>} Result of function
 */
export async function retryWithCondition(fn, shouldRetry, maxRetries = 3, baseDelay = 100) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if should retry
            if (!shouldRetry(error) || attempt === maxRetries - 1) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`[Retry] Retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Timeout wrapper - fails if function takes too long
 * @param {Function} fn - Async function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Error message on timeout
 * @returns {Promise<*>} Result of function
 */
export async function withTimeout(fn, timeoutMs = 5000, errorMessage = 'Operation timed out') {
    return Promise.race([
        fn(),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
        )
    ]);
}

/**
 * Circuit breaker pattern - stops trying after too many failures
 */
export class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.failureThreshold = threshold;
        this.timeout = timeout;
        this.failures = 0;
        this.nextAttempt = Date.now();
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new Error('Circuit breaker is OPEN');
            }
            this.state = 'HALF_OPEN';
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failures++;
        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.warn(`[CircuitBreaker] Circuit opened after ${this.failures} failures`);
        }
    }

    reset() {
        this.failures = 0;
        this.state = 'CLOSED';
        this.nextAttempt = Date.now();
    }
}
