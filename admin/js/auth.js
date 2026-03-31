// Auth Logic

// 1. Handle Login Form
const loginForm = document.getElementById('login-form');
let tempToken = null; // Store query token for 2nd step

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const otpGroup = document.getElementById('otp-group');
        const errorMsg = document.getElementById('error-msg');
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        // Reset Error
        errorMsg.style.display = 'none';
        errorMsg.style.color = '#ff4d4d'; // default error color

        const isOtpMode = otpGroup.style.display !== 'none';

        try {
            if (isOtpMode) {
                // === STEP 2: VERIFY OTP ===
                const otp = document.getElementById('otp').value;
                if (!otp) throw new Error('Please enter the code');

                submitBtn.disabled = true;
                submitBtn.textContent = 'Verifying...';

                const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ otp, tempToken })
                });

                const data = await res.json();

                if (res.ok) {
                    window.location.href = '/admin/index.html';
                } else {
                    throw new Error(data.message || 'Invalid OTP');
                }

            } else {
                // === STEP 1: LOGIN ===
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                submitBtn.disabled = true;
                submitBtn.textContent = 'Checking...';

                const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (res.ok && data.requireOtp) {
                    // Transition to Step 2
                    tempToken = data.tempToken;

                    // UI Updates
                    document.getElementById('username').closest('.form-group').style.display = 'none';
                    document.getElementById('password').closest('.form-group').style.display = 'none';
                    otpGroup.style.display = 'block';
                    document.getElementById('otp').focus();

                    submitBtn.textContent = 'Verify Identity';
                    submitBtn.disabled = false;

                    errorMsg.style.display = 'block';
                    errorMsg.style.color = 'var(--primary)'; // Success/Info color
                    errorMsg.textContent = data.message; // "OTP sent..."

                } else if (res.ok) {
                    // Direct login (fallback if 2FA disabled)
                    window.location.href = '/admin/index.html';
                } else {
                    // Login failed
                    if (res.status === 429) {
                        throw new Error(data.message); // Rate limit message
                    }
                    throw new Error('Invalid username or password');
                }
            }
        } catch (err) {
            console.error(err);
            errorMsg.style.display = 'block';
            errorMsg.style.color = '#ff4d4d';
            errorMsg.textContent = err.message || 'Login failed';

            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = isOtpMode ? 'Verify Identity' : 'Login';
        }
    });
}

// 2. Check Session (Index Page)
export async function checkSession() {
    // If we are on login page, skip
    if (window.location.pathname.includes('login.html')) return;

    try {
        const res = await fetch('/api/auth', { cache: 'no-store' }); // GET /api/auth with no-cache
        if (!res.ok) throw new Error("Auth check failed status: " + res.status);

        const data = await res.json();
        if (!data.authenticated) {
            throw new Error("Not authenticated");
        }
    } catch (err) {
        console.warn("Session check failed:", err);
        throw err; // Propagate error so app.js knows to redirect/not show dashboard
    }
}

// 3. Logout
export async function logout() {
    await fetch('/api/auth', { method: 'DELETE' }); // DELETE /api/auth
    window.location.href = '/admin/login.html';
}

// Run check on load if not login page
if (!window.location.pathname.includes('login.html')) {
    checkSession();
}
