/**
 * Custom Comment Widget
 * Integrates with Turso-backed API and Social Auth
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

        // Auth State
        this.isLoggedIn = false;
        this.user = { name: '', id: '', avatar: '', isAnonymous: true };

        if (this.container) {
            this.init();
        }
    }

    async init() {
        this.loadUserData();
        this.renderLayout();
        await this.trackView();
        await this.loadComments();
        this.setupEventListeners();
    }

    /**
     * Loads user data from Social Session or Local Storage
     */
    loadUserData() {
        const authSession = this.getCookie('auth_session');
        if (authSession) {
            try {
                const payload = JSON.parse(atob(authSession.split('.')[1]));
                this.user = {
                    name: payload.name,
                    email: payload.email,
                    avatar: payload.avatar,
                    provider: payload.provider,
                    id: payload.provider_id,
                    isAnonymous: false
                };
                this.isLoggedIn = true;
            } catch (e) {
                console.error('Failed to parse auth session', e);
                this.loadAnonymousData();
            }
        } else {
            this.loadAnonymousData();
        }
    }

    loadAnonymousData() {
        this.user = {
            name: localStorage.getItem('commentUsername') || '',
            id: localStorage.getItem('commentUserId') || this.generateAnonId(),
            isAnonymous: true
        };
        if (!localStorage.getItem('commentUserId')) {
            localStorage.setItem('commentUserId', this.user.id);
        }
    }

    generateAnonId() {
        return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
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

                <!-- User Information / Auth -->
                <div class="comment-auth-section" id="auth-section">
                    ${this.renderAuthUI()}
                </div>

                <!-- Comment Form -->
                <form class="comment-form" id="main-comment-form">
                    ${!this.isLoggedIn ? `
                        <div class="anonymous-inputs">
                            <input type="text" id="author-name" class="comment-input" 
                                   value="${this.escapeHtml(this.user.name)}" 
                                   placeholder="Your Name (Persistent)"
                                   maxlength="100">
                        </div>
                    ` : ''}
                    
                    <div style="display:none;">
                        <input type="text" id="honeypot" name="honeypot" tabindex="-1" autocomplete="off">
                    </div>

                    <textarea class="comment-textarea" id="comment-textarea" placeholder="Share your thoughts..." required maxlength="5000"></textarea>
                    
                    <div class="form-footer">
                        <span class="char-count" id="char-count">0/5000</span>
                        <button type="submit" class="submit-btn" id="submit-btn">Post Comment</button>
                    </div>
                </form>

                <!-- Comments List -->
                <div class="comments-list" id="comments-list">
                    <!-- Loaded dynamically -->
                </div>
            </div>
        `;

        // Update char count listener
        const textarea = document.getElementById('comment-textarea');
        const countSpan = document.getElementById('char-count');
        textarea?.addEventListener('input', () => {
            countSpan.textContent = `${textarea.value.length}/5000`;
        });
    }

    renderAuthUI() {
        if (this.isLoggedIn) {
            return `
                <div class="user-logged-in">
                    <img src="${this.user.avatar}" alt="${this.user.name}" class="user-avatar-small">
                    <span>Logged in as <strong>${this.user.name}</strong></span>
                    <button class="auth-text-btn" onclick="commentWidget.logout()">Logout</button>
                </div>
            `;
        } else {
            return `
                <div class="social-login-prompt">
                    <span>Sign in to comment with:</span>
                    <div class="social-buttons">
                        <button class="social-btn google" onclick="commentWidget.login('google')" title="Login with Google">
                            <ion-icon name="logo-google"></ion-icon>
                        </button>
                        <button class="social-btn github" onclick="commentWidget.login('github')" title="Login with GitHub">
                            <ion-icon name="logo-github"></ion-icon>
                        </button>
                        <button class="social-btn facebook" onclick="commentWidget.login('facebook')" title="Login with Facebook">
                            <ion-icon name="logo-facebook"></ion-icon>
                        </button>
                        <button class="social-btn twitter" onclick="commentWidget.login('twitter')" title="Login with X">
                            <ion-icon name="logo-twitter"></ion-icon>
                        </button>
                    </div>
                    <span class="or-separator">or continue as guest below</span>
                </div>
            `;
        }
    }

    login(provider) {
        // Store current URL to redirect back after login
        document.cookie = `redirect_after_login=${window.location.href}; Path=/; Max-Age=3600; Secure; SameSite=Lax`;
        window.location.href = `/api/auth/${provider}`;
    }

    logout() {
        window.location.href = '/api/auth/logout';
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
                listContainer.innerHTML = `<p style="color:var(--fiery-rose); text-align:center;">Failed to load engagement data.</p>`;
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
                    user_id: this.user.id,
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
        const isSocial = comment.auth_provider !== 'anonymous';
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
                        ${isSocial ? `<span class="auth-provider-badge">${this.getProviderIcon(comment.auth_provider)}</span>` : ''}
                        ${isAdmin ? '<span class="admin-badge" style="background:var(--emerald)">Admin</span>' : ''}
                        <span class="comment-date">${date}</span>
                    </div>
                    <div class="comment-text">${comment.content}</div>
                    
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

    getProviderIcon(provider) {
        if (provider === 'google') return '<ion-icon name="logo-google" style="color:#ea4335"></ion-icon>';
        if (provider === 'github') return '<ion-icon name="logo-github" style="color:#fff"></ion-icon>';
        if (provider === 'facebook') return '<ion-icon name="logo-facebook" style="color:#1877f2"></ion-icon>';
        if (provider === 'twitter') return '<ion-icon name="logo-twitter" style="color:#1da1f2"></ion-icon>';
        return '';
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
            const textarea = document.getElementById('comment-textarea');
            const authorNameInput = document.getElementById('author-name');
            const honeypot = document.getElementById('honeypot')?.value;

            const content = textarea.value.trim();
            const authorName = this.isLoggedIn ? this.user.name : (authorNameInput?.value.trim() || 'Anonymous');

            if (!content) return;

            // Persistence
            if (!this.isLoggedIn && authorNameInput) {
                localStorage.setItem('commentUsername', authorName);
                this.user.name = authorName;
            }

            await this.postComment({
                content: content,
                author_name: authorName,
                author_email: this.user.email || '',
                author_avatar: this.user.avatar || '',
                is_anonymous: !this.isLoggedIn,
                auth_provider: this.isLoggedIn ? this.user.provider : 'anonymous',
                parent_id: null,
                honeypot: honeypot
            });

            textarea.value = '';
            document.getElementById('char-count').textContent = '0/5000';
        });
    }

    async postComment(data) {
        const submitBtn = document.getElementById('submit-btn');
        if (!submitBtn) return;

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
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

            const result = await response.json();

            if (response.ok) {
                await this.loadComments();
            } else {
                alert(result.error || 'Failed to post comment.');
            }
        } catch (error) {
            console.error('Post comment error:', error);
            alert('A network error occurred.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
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
                <textarea class="comment-textarea" placeholder="Write a reply..." required style="min-height: 80px;" maxlength="5000"></textarea>
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
            const content = textarea.value.trim();
            if (!content) return;

            await this.postComment({
                content: content,
                author_name: this.user.name || 'Anonymous',
                author_email: this.user.email || '',
                author_avatar: this.user.avatar || '',
                is_anonymous: !this.isLoggedIn,
                auth_provider: this.isLoggedIn ? this.user.provider : 'anonymous',
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
                    user_id: this.user.id,
                    reaction_type: type
                })
            });

            if (response.ok) {
                await this.loadComments();
            } else {
                const result = await response.json();
                if (response.status === 429) alert(result.error);
            }
        } catch (error) {
            console.error('Reaction error:', error);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global initialization helper
window.initCommentWidget = (options) => {
    window.commentWidget = new CommentWidget(options);
};
