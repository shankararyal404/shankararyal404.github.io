// Auth Logic

// 1. Handle Login Form
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('error-msg');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                window.location.href = '/admin/index.html';
            } else {
                errorMsg.style.display = 'block';
                errorMsg.textContent = 'Invalid username or password';
            }
        } catch (err) {
            console.error(err);
            errorMsg.style.display = 'block';
            errorMsg.textContent = 'Login failed';
        }
    });
}

// 2. Check Session (Index Page)
export async function checkSession() {
    // If we are on login page, skip
    if (window.location.pathname.includes('login.html')) return;

    try {
        const res = await fetch('/api/auth/verify');
        if (!res.ok) {
            // Redirect to login if not authorized
            window.location.href = '/admin/login.html';
        }
    } catch (err) {
        window.location.href = '/admin/login.html';
    }
}

// 3. Logout
export async function logout() {
    await fetch('/api/auth/logout');
    window.location.href = '/admin/login.html';
}

// Run check on load if not login page
if (!window.location.pathname.includes('login.html')) {
    checkSession();
}
