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
                    showToast('Success! Please check your email to verify.', 'success');
                    subForm.reset();
                } else {
                    showToast(data.error || 'Something went wrong.', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Network error. Please try again.', 'error');
            } finally {
                btn.innerText = originalBtnText;
                btn.disabled = false;
            }
        });
    }

    // Helper to check URL parameters for subscription status
    const params = new URLSearchParams(window.location.search);
    const subStatus = params.get('subscription');
    if (subStatus) {
        if (subStatus === 'verified') {
            showToast('Subscription verified! Welcome to the newsletter.', 'success', 5000);
        } else if (subStatus === 'unsubscribed') {
            showToast('You have been unsubscribed successfully.', 'info', 5000);
        }
        // Clean up URL without reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
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
