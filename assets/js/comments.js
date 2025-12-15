// comments.js
const COMMENTS_API_BASE = '/api/comments';
const slug = window.location.pathname.split('/').pop().replace('.html', '');

async function loadComments() {
    const container = document.getElementById('comments-list');
    if (!container) return;

    try {
        const res = await fetch(`${COMMENTS_API_BASE}/list?slug=${slug}`);
        const comments = await res.json();

        if (comments.length === 0) {
            container.innerHTML = '<p class="text-muted">No comments yet. Be the first to share your thoughts!</p>';
            return;
        }

        container.innerHTML = comments.map(c => `
            <div class="comment-item reveal">
                <div class="comment-header">
                    <strong>${escapeHtml(c.user_name)}</strong>
                    <span class="comment-date">${new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <div class="comment-body">
                    ${escapeHtml(c.content)}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="error-msg">Failed to load comments.</p>';
    }
}

async function submitComment(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Posting...';
    btn.disabled = true;

    const name = document.getElementById('comment-name').value;
    const content = document.getElementById('comment-content').value;

    try {
        const res = await fetch(`${COMMENTS_API_BASE}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, name, content })
        });

        if (res.ok) {
            document.getElementById('comment-form').reset();
            loadComments();
            alert('Comment posted!');
        } else {
            alert('Failed to post comment.');
        }
    } catch (err) {
        alert('Error posting comment.');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', () => {
    loadComments();
    const form = document.getElementById('comment-form');
    if (form) form.addEventListener('submit', submitComment);
});
