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
        this.stats = { views: 0, reactions: [] };
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
        await this.trackView();
        await this.loadComments();
        this.setupEventListeners();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="comment-widget-container">
                <div class="comment-widget-header">
                    <h2 class="comment-widget-title">Engagement</h2>
                    <div class="post-stats-header">
                        <span id="view-count-badge" class="admin-badge" style="background: var(--white-alpha-10);"><ion-icon name="eye-outline"></ion-icon> Loading...</span>
                        <span id="comment-count-badge" class="admin-badge" style="background: var(--bg-elevated);"><ion-icon name="chatbubbles-outline"></ion-icon> Loading...</span>
                    </div>
                </div>

                <!-- Post Reactions -->
                <div id="post-reactions-container" class="post-reactions-bar">
                    <div class="loading-shimmer" style="height: 30px; border-radius: 15px;"></div>
                </div>

                <div class="section-divider" style="margin: 20px 0; border-top: 1px solid var(--white-alpha-10);"></div>

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

    async trackView() {
        try {
            await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'view', post_slug: this.postSlug })
            });
        } catch (e) {
            console.warn('View tracking failed', e);
        }
    }

    async loadComments() {
        try {
            const response = await fetch(`${this.apiUrl}?post_slug=${this.postSlug}`);
            const data = await response.json();

            // Handle new response structure { comments, stats }
            this.comments = Array.isArray(data.comments) ? data.comments : [];
            this.stats = data.stats || { views: 0, reactions: [] };

            const commentBadge = document.getElementById('comment-count-badge');
            if (commentBadge) {
                commentBadge.innerHTML = `<ion-icon name="chatbubbles-outline"></ion-icon> ${this.comments.length} Comments`;
            }

            const viewBadge = document.getElementById('view-count-badge');
            if (viewBadge) {
                viewBadge.innerHTML = `<ion-icon name="eye-outline"></ion-icon> ${this.formatNumber(this.stats.views)} Views`;
            }

            this.renderPostReactions();
            this.renderComments();
        } catch (error) {
            console.error('Failed to load comments:', error);
            this.comments = [];

            const listContainer = document.getElementById('comments-list');
            if (listContainer) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--fiery-rose);">
                        <p>Failed to load engagement data.</p>
                        <small style="opacity: 0.7;">Check if Turso Database is configured correctly.</small>
                    </div>
                `;
            }
        }
    }

    renderPostReactions() {
        const container = document.getElementById('post-reactions-container');
        if (!container) return;

        const list = [
            { type: '👍', label: 'Like' },
            { type: '❤️', label: 'Love' },
            { type: '😂', label: 'Haha' },
            { type: '🫡', label: 'Respect' },
            { type: '🤯', label: 'Wow' },
            { type: '🎉', label: 'Celebrate' },
            { type: '🚀', label: 'Rocket' }
        ];

        container.innerHTML = `
            <div class="reactions-flex">
                ${list.map(r => {
            const stat = this.stats.reactions.find(s => s.reaction_type === r.type);
            const count = stat ? stat.count : 0;
            return `
                        <div class="reaction-item ${count > 0 ? 'has-count' : ''}" 
                             onclick="commentWidget.handlePostReaction('${r.type}')"
                             title="${r.label}">
                            <span class="emoji">${r.type}</span>
                            <span class="count">${count}</span>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    async handlePostReaction(type) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'react',
                    post_slug: this.postSlug,
                    user_id: this.userId,
                    reaction_type: type
                })
            });

            if (response.ok) {
                await this.loadComments();
            }
        } catch (error) {
            console.error('Post reaction error:', error);
        }
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num;
    }

    renderComments() {
        const listContainer = document.getElementById('comments-list');
        if (!listContainer) return;

        if (this.comments.length === 0) {
            listContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px; border: 1px dashed var(--white-alpha-10); border-radius: 12px; margin-top: 20px;">No comments yet. Be the first to share your thoughts!</p>';
            return;
        }

        const topLevel = this.comments.filter(c => !c.parent_id);
        const replies = this.comments.filter(c => c.parent_id);

        listContainer.innerHTML = topLevel.map(comment => this.generateCommentHtml(comment, replies)).join('');
    }

    generateCommentHtml(comment, allReplies) {
        const date = new Date(comment.created_at).toLocaleDateString();
        const isAdmin = comment.is_admin === 1;
        const avatar = comment.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author_name)}&background=random&color=fff`;

        const childReplies = allReplies.filter(r => r.parent_id === comment.id);

        return `
            <div class="comment-item" id="comment-${comment.id}">
                <div class="comment-avatar">
                    <img src="${avatar}" alt="${comment.author_name}">
                </div>
                <div class="comment-body">
                    <div class="comment-meta">
                        <span class="author-name">${comment.author_name}</span>
                        ${isAdmin ? '<span class="admin-badge" style="background:var(--emerald)">Admin</span>' : ''}
                        <span class="comment-date">${date}</span>
                    </div>
                    <div class="comment-text">${this.escapeHtml(comment.content)}</div>
                    
                    <div class="comment-actions">
                        ${this.generateReactionHtml(comment)}
                        <button class="reply-trigger" onclick="commentWidget.showReplyForm(${comment.id})">
                             <ion-icon name="arrow-undo-outline"></ion-icon> Reply
                        </button>
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
            <div class="reaction-group" 
                 onclick="commentWidget.handleReaction(${comment.id}, '${r.type}')">
                <span class="reaction-emoji">${r.type}</span>
                <span class="reaction-count">${r.count}</span>
            </div>
        `).join('');
    }

    setupEventListeners() {
        const form = document.getElementById('main-comment-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const textarea = form.querySelector('textarea');
            const isAnon = document.getElementById('anon-checkbox').checked;

            if (!textarea.value.trim()) return;

            await this.postComment({
                content: textarea.value,
                is_anonymous: isAnon,
                author_name: isAnon ? 'Anonymous' : 'Visitor',
                parent_id: null
            });

            textarea.value = '';
        });
    }

    async postComment(data) {
        const submitBtn = document.getElementById('submit-btn');
        if (!submitBtn) return;

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
        if (!container) return;

        if (container.innerHTML !== '') {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <form class="comment-form" style="margin-top: 15px; border-style: dashed; padding: 15px;">
                <textarea class="comment-textarea" placeholder="Write a reply..." required style="min-height: 80px;"></textarea>
                <div class="form-footer">
                    <button type="button" class="auth-btn" style="padding: 5px 12px;" onclick="this.closest('form').remove()">Cancel</button>
                    <button type="submit" class="submit-btn" style="padding: 8px 16px;">Post Reply</button>
                </div>
            </form>
        `;

        const form = container.querySelector('form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const textarea = form.querySelector('textarea');
            if (!textarea.value.trim()) return;

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
