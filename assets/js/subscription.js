/**
 * Subscription Form Handler
 */
document.addEventListener('DOMContentLoaded', () => {
    const subForm = document.getElementById('subscription-form');
    const msgBox = document.getElementById('sub-message');

    if (subForm) {
        subForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('sub-email');
            const btn = subForm.querySelector('button');

            // Basic validation
            if (!emailInput.value || !emailInput.value.includes('@')) {
                showMessage('Please enter a valid email.', 'error');
                return;
            }

            // Loading state
            const originalBtnText = btn.innerText;
            btn.innerText = 'Subscribing...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailInput.value })
                });

                const data = await res.json();

                if (res.ok) {
                    showMessage('Success! Please check your email to verify.', 'success');
                    subForm.reset();
                } else {
                    showMessage(data.error || 'Something went wrong.', 'error');
                }
            } catch (err) {
                console.error(err);
                showMessage('Network error. Please try again.', 'error');
            } finally {
                btn.innerText = originalBtnText;
                btn.disabled = false;
            }
        });
    }

    function showMessage(text, type) {
        msgBox.innerText = text;
        msgBox.className = `sub-message ${type}`;
        setTimeout(() => {
            msgBox.innerText = '';
            msgBox.className = 'sub-message';
        }, 5000);
    }
});

/**
 * Social Sharing - Dynamic Links (if not generating statically)
 * Ideally static is better for performance, but this ensures correct current URL.
 */
document.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Platform specific logic if needed, but hrefs should work
    });
});
