/**
 * Custom Comment Widget
 * Integrates with Turso-backed API
 */
class CommentWidget {
    constructor(options) {
        this.postSlug = options.postSlug;
        this.apiUrl = options.apiUrl || '/api/comments';
        this.containerId = options.containerId || 'comment-widget';
        this.container = document.getElementById(this.containerId);
        this.theme = options.theme || document.documentElement.getAttribute('data-theme') || 'dark';

        this.comments = [];
        this.userId = this.getOrCreateUserId();

        if (this.container) {
            this.init();
        }
    }

    getOrCreateUserId() {
        let userId = localStorage.getItem('comment_user_id');
        if (!userId) {
            userId = 'anon_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('comment_user_id', userId);
        }
        return userId;
    }

    async init() {
        this.renderLayout();
        await this.loadComments();
        this.setupEventListeners();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="comment-widget-container">
                <div class="comment-widget-header">
                    <h2 class="comment-widget-title">Comments</h2>
                    <span id="comment-count-badge" class="admin-badge" style="background: var(--bg-elevated); color: var(--text-secondary);">Loading...</span>
                </div>

                <!-- Auth Buttons -->
                <div class="comment-auth-buttons">
                    <button class="auth-btn active" data-provider="anonymous">
                        <ion-icon name="person-circle-outline"></ion-icon> Anonymous
                    </button>
                    <button class="auth-btn" data-provider="github" onclick="alert('GitHub Login coming soon!')">
                        <ion-icon name="logo-github"></ion-icon> GitHub
                    </button>
                    <button class="auth-btn" data-provider="google" onclick="alert('Google Login coming soon!')">
                        <ion-icon name="logo-google"></ion-icon> Google
                    </button>
                </div>

                <!-- Comment Form -->
                <form class="comment-form" id="main-comment-form">
                    <textarea class="comment-textarea" placeholder="Share your thoughts..." required></textarea>
                    <div class="form-footer">
                        <label class="anonymous-toggle">
                            <input type="checkbox" checked id="anon-checkbox"> Post Anonymously
                        </label>
                        <button type="submit" class="submit-btn" id="submit-btn">Post Comment</button>
                    </div>
                </form>

                <!-- Comments List -->
                <div class="comments-list" id="comments-list">
                    <!-- Loaded dynamically -->
                </div>
            </div>
        `;
    }

    async loadComments() {
        try {
            const response = await fetch(`${this.apiUrl}?post_slug=${this.postSlug}`);
            const data = await response.json();

            // Ensure this.comments is always an array
            this.comments = Array.isArray(data) ? data : [];

            const badge = document.getElementById('comment-count-badge');
            if (badge) {
                badge.textContent = `${this.comments.length} Comments`;
            }
            this.renderComments();
        } catch (error) {
            console.error('Failed to load comments:', error);
            this.comments = [];
            const badge = document.getElementById('comment-count-badge');
            if (badge) badge.textContent = 'Error';

            document.getElementById('comments-list').innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--fiery-rose);">
                    <p>Failed to load comments.</p>
                    <small style="opacity: 0.7;">Check if Turso Database is configured correctly.</small>
                </div>
            `;
        }
    }

    renderComments() {
        const listContainer = document.getElementById('comments-list');
        if (this.comments.length === 0) {
            listContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No comments yet. Be the first to share your thoughts!</p>';
            return;
        }

        // Separate top-level comments and replies
        const topLevel = this.comments.filter(c => !c.parent_id);
        const replies = this.comments.filter(c => c.parent_id);

        listContainer.innerHTML = topLevel.map(comment => this.generateCommentHtml(comment, replies)).join('');
    }

    generateCommentHtml(comment, allReplies) {
        const date = new Date(comment.created_at).toLocaleDateString();
        const isAdmin = comment.is_admin === 1;
        const avatar = comment.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author_name)}&background=random`;

        const childReplies = allReplies.filter(r => r.parent_id === comment.id);

        return `
            <div class="comment-item" id="comment-${comment.id}">
                <div class="comment-avatar">
                    <img src="${avatar}" alt="${comment.author_name}">
                </div>
                <div class="comment-body">
                    <div class="comment-meta">
                        <span class="author-name">${comment.author_name}</span>
                        ${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
                        <span class="comment-date">${date}</span>
                    </div>
                    <div class="comment-text">${this.escapeHtml(comment.content)}</div>
                    
                    <div class="comment-actions">
                        ${this.generateReactionHtml(comment)}
                        <button class="reply-trigger" onclick="commentWidget.showReplyForm(${comment.id})">Reply</button>
                    </div>

                    <div id="reply-form-container-${comment.id}"></div>

                    ${childReplies.length > 0 ? `
                        <div class="replies-container">
                            ${childReplies.map(reply => this.generateCommentHtml(reply, allReplies)).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    generateReactionHtml(comment) {
        const reactions = [
            { type: '👍', count: comment.likes || 0 },
            { type: '❤️', count: comment.hearts || 0 },
            { type: '😂', count: comment.laughs || 0 },
            { type: '🫡', count: comment.salutes || 0 },
            { type: '🤯', count: comment.mindblown || 0 }
        ];

        return reactions.map(r => `
            <div class="reaction-group ${this.hasUserReacted(comment.id, r.type) ? 'active' : ''}" 
                 onclick="commentWidget.handleReaction(${comment.id}, '${r.type}')">
                <span class="reaction-emoji">${r.type}</span>
                <span class="reaction-count">${r.count}</span>
            </div>
        `).join('');
    }

    hasUserReacted(commentId, type) {
        // This is a placeholder as the current API doesn't return user-specific reaction state
        // In a real app, you'd check a local cache or the API response
        return false;
    }

    setupEventListeners() {
        const form = document.getElementById('main-comment-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const textarea = form.querySelector('textarea');
            const isAnon = document.getElementById('anon-checkbox').checked;

            await this.postComment({
                content: textarea.value,
                is_anonymous: isAnon,
                author_name: isAnon ? 'Anonymous' : 'Visitor', // Placeholder for actual auth
                parent_id: null
            });

            textarea.value = '';
        });
    }

    async postComment(data) {
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'comment',
                    post_slug: this.postSlug,
                    ...data
                })
            });

            if (response.ok) {
                await this.loadComments();
            } else {
                alert('Failed to post comment.');
            }
        } catch (error) {
            console.error('Post comment error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post Comment';
        }
    }

    showReplyForm(commentId) {
        const container = document.getElementById(`reply-form-container-${commentId}`);
        if (container.innerHTML !== '') {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <form class="comment-form" style="margin-top: 15px; border-style: dashed;">
                <textarea class="comment-textarea" placeholder="Write a reply..." required style="min-height: 80px;"></textarea>
                <div class="form-footer">
                    <button type="button" class="auth-btn" style="padding: 5px 12px; font-size: 1.2rem;" onclick="this.closest('form').remove()">Cancel</button>
                    <button type="submit" class="submit-btn" style="padding: 8px 16px; font-size: 1.3rem;">Post Reply</button>
                </div>
            </form>
        `;

        const form = container.querySelector('form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const textarea = form.querySelector('textarea');
            await this.postComment({
                content: textarea.value,
                is_anonymous: true,
                parent_id: commentId
            });
            container.innerHTML = '';
        });
    }

    async handleReaction(commentId, type) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'react',
                    comment_id: commentId,
                    user_id: this.userId,
                    reaction_type: type
                })
            });

            if (response.ok) {
                await this.loadComments();
            }
        } catch (error) {
            console.error('Reaction error:', error);
        }
    }

    setTheme(theme) {
        this.theme = theme;
        // The widget uses CSS variables from the main theme, 
        // which are automatically updated by the data-theme attribute on <html>
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global initialization helper
window.initCommentWidget = (options) => {
    window.commentWidget = new CommentWidget(options);
};
