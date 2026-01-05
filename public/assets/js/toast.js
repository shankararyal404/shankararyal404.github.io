/**
 * Custom Toast Notification System
 * Usage: showToast("Message goes here", "success", 3000);
 * Types: success, error, warning, info
 */

function showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');

    // Create container if it doesn't exist
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: 'checkmark-circle-outline',
        error: 'alert-circle-outline',
        warning: 'warning-outline',
        info: 'information-circle-outline'
    };

    toast.innerHTML = `
        <div class="toast-icon">
            <ion-icon name="${icons[type] || icons.info}"></ion-icon>
        </div>
        <div class="toast-content">${message}</div>
        <div class="toast-close" onclick="this.parentElement.remove()">
            <ion-icon name="close-outline"></ion-icon>
        </div>
        <div class="toast-progress">
            <div class="toast-progress-bar"></div>
        </div>
    `;

    container.appendChild(toast);

    // Progress bar animation
    const progressBar = toast.querySelector('.toast-progress-bar');
    progressBar.style.transition = `transform ${duration}ms linear`;
    progressBar.style.transform = 'scaleX(0)';

    // Request animation frame to ensure transition trigger
    requestAnimationFrame(() => {
        progressBar.style.transform = 'scaleX(0)';
        // To animate from 1 to 0, or 0 to 1?
        // Let's do scaleX from 1 down to 0 for a countdown effect.
        progressBar.style.transform = 'scaleX(1)';
        requestAnimationFrame(() => {
            progressBar.style.transform = 'scaleX(0)';
        });
    });

    // Auto remove
    const timeout = setTimeout(() => {
        removeToast(toast);
    }, duration);

    // Support for pause on hover if needed (optional)
    toast.onmouseenter = () => clearTimeout(timeout);
    toast.onmouseleave = () => {
        // This is a simple version, doesn't resume precisely but starts fresh
        // For simplicity, let's skip pause for now to keep it clean.
    };
}

function removeToast(toast) {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => {
        toast.remove();

        // Remove container if empty
        const container = document.querySelector('.toast-container');
        if (container && container.children.length === 0) {
            container.remove();
        }
    });
}

// Export to window
window.showToast = showToast;
