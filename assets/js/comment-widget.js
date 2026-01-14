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
        this.stats = { reactions: [] };

        // Auth State
        this.isLoggedIn = false;
        this.user = { name: '', id: '', avatar: '', isAnonymous: true };

        if (this.container) {
            this.init();
        }
    }

    async init() {
        await this.fetchCsrfToken();
        await this.loadUserData();
        await this.loadComments();
        this.setupEventListeners();
    }

    async fetchCsrfToken() {
        try {
            const res = await fetch(`/api/auth?action=csrf&t=${Date.now()}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.csrfToken) {
                    this.csrfToken = data.csrfToken;
                    return true;
                }
            }
        } catch (e) {
            console.warn('Failed to fetch CSRF token', e);
        }
        return false;
    }

    /**
     * Loads user data from Social Session or Local Storage
     */
    async loadUserData() {
        // ... existing loadUserData code ...
        // Optimistic check: if we have a redirect cookie, we might be logging in
        // But for HttpOnly cookies, we MUST ask the backend
        try {
            const res = await fetch('/api/auth?action=verify', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.authenticated && data.user) {
                    this.user = {
                        name: data.user.name,
                        email: data.user.email || '',
                        avatar: data.user.avatar,
                        provider: data.user.provider || 'social',
                        id: data.user.provider_id || data.user.id || this.generateAnonId(),
                        isAnonymous: false
                    };
                    this.isLoggedIn = true;
                    this.renderLayout();
                    return;
                }
            }
        } catch (e) {
            console.warn('Auth verification failed', e);
        }

        this.loadAnonymousData();
        this.renderLayout();
    }

    async postComment(data, isRetry = false) {
        const submitBtn = document.getElementById('submit-btn');
        if (!submitBtn) return;

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Posting...';

        // 1. Ensure we have a token
        if (!this.csrfToken) {
            const success = await this.fetchCsrfToken();
            if (!success || !this.csrfToken) {
                showToast('Security token missing. Please refresh the page.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'comment',
                    post_slug: this.postSlug,
                    csrf_token: this.csrfToken,
                    ...data
                })
            });

            const result = await response.json();

            if (response.ok) {
                await this.loadComments();
            } else if (response.status === 403 && !isRetry) {
                console.warn('CSRF Token invalid, refreshing and retrying...');
                await this.fetchCsrfToken();
                // Update csrf_token in the data just in case, though usually grabbed from this.csrfToken
                // Recursively call postComment with retry=true
                submitBtn.disabled = false; // reset state before retry
                submitBtn.textContent = originalText;
                return this.postComment(data, true);
            } else {
                showToast(result.error || 'Failed to post comment.', 'error');
                // Re-enable button if we are not retrying or if retry failed
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } catch (error) {
            console.error('Post comment error:', error);
            showToast('A network error occurred.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        } finally {
            // Only reset if success or final failure (handled above inside logic for retry)
            // But to be safe, if we are NOT retrying, we reset.
            // If response.ok (success), we reset.
            // Converting this logic is tricky with the finally block running always.
            // Better to manage button state explicitly in cases.
            if (submitBtn.textContent === 'Posting...' && !isRetry) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }

    // ... skip ...

    async handleReaction(commentId, type, isRetry = false) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'react',
                    comment_id: commentId,
                    user_id: this.user.id,
                    reaction_type: type,
                    csrf_token: this.csrfToken
                })
            });

            if (response.ok) {
                await this.loadComments();
            } else if (response.status === 403 && !isRetry) {
                await this.fetchCsrfToken();
                return this.handleReaction(commentId, type, true);
            } else {
                const result = await response.json();
                if (response.status === 429) showToast(result.error, 'warning');
            }
        } catch (error) {
            console.error('Reaction error:', error);
        }
    }

    async handlePostReaction(type, isRetry = false) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'react',
                    post_slug: this.postSlug,
                    user_id: this.user.id,
                    reaction_type: type,
                    csrf_token: this.csrfToken
                })
            });

            if (response.ok) {
                await this.loadComments();
            } else if (response.status === 403 && !isRetry) {
                await this.fetchCsrfToken();
                return this.handlePostReaction(type, true);
            }
        } catch (error) {
            console.error('Post reaction error:', error);
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

    // getCookie helper is no longer critical for auth session but kept for other needs if any
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
        const isProd = window.location.hostname.includes('shankararyal404.com.np');
        const domain = isProd ? 'Domain=.shankararyal404.com.np;' : '';
        document.cookie = `redirect_after_login=${window.location.href}; Path=/; ${domain} Max-Age=3600; Secure; SameSite=Lax`;
        window.location.href = `/api/auth/${provider}`;
    }

    logout() {
        window.location.href = '/api/auth/logout';
    }

    async loadComments() {
        try {
            const response = await fetch(`${this.apiUrl}?post_slug=${this.postSlug}`);
            const data = await response.json();

            this.comments = (Array.isArray(data.comments) ? data.comments : [])
                .filter(c => c.content && c.content.trim().length > 0); // Filter "ghost" comments
            this.stats = data.stats || { reactions: [] };

            const commentBadge = document.getElementById('comment-count-badge');
            if (commentBadge) {
                commentBadge.innerHTML = `<ion-icon name="chatbubbles-outline"></ion-icon> ${this.comments.length} Comments`;
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

    // ... renderPostReactions ...

    // ... handlePostReaction ...

    renderComments() {
        const listContainer = document.getElementById('comments-list');
        if (!listContainer) return;

        if (this.comments.length === 0) {
            listContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px; border: 1px dashed var(--white-alpha-10); border-radius: 12px; margin-top: 20px;">No comments yet. Be the first to share your thoughts!</p>';
            return;
        }

        const topLevel = this.comments.filter(c => !c.parent_id);
        const replies = this.comments.filter(c => c.parent_id);
        listContainer.innerHTML = topLevel.map(comment => this.generateCommentHtml(comment, replies, 0)).join('');
    }

    generateCommentHtml(comment, allReplies, depth) {
        const date = new Date(comment.created_at).toLocaleDateString();
        const isAdmin = comment.is_admin === 1;
        const isSocial = comment.auth_provider !== 'anonymous';
        const avatar = comment.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author_name)}&background=random&color=fff`;

        const childReplies = allReplies.filter(r => r.parent_id === comment.id);

        // Pagination Logic: Show 3, Hide Rest
        const VISIBLE_LIMIT = 3;
        const visibleReplies = childReplies.slice(0, VISIBLE_LIMIT);
        const hiddenReplies = childReplies.slice(VISIBLE_LIMIT);

        return `
            <div class="comment-item" id="comment-${comment.id}" data-depth="${depth}">
                <div class="comment-avatar">
                    <img src="${avatar}" alt="${comment.author_name}">
                </div>
                <div class="comment-wrapper">
                    <div class="comment-header">
                        <div class="meta-left">
                            <span class="author-name">${comment.author_name}</span>
                            ${isSocial ? `<span class="auth-provider-badge">${this.getProviderIcon(comment.auth_provider)}</span>` : ''}
                            ${isAdmin ? '<span class="admin-badge" style="background:var(--emerald)">Admin</span>' : ''}
                            <span class="comment-date">${date}</span>
                        </div>
                        <button class="collapse-toggle" onclick="commentWidget.toggleComment(${comment.id})" title="Collapse Thread">
                            [–]
                        </button>
                    </div>
                    
                    <div class="comment-content-wrapper" id="comment-content-${comment.id}">
                        <div class="comment-body">
                            <div class="comment-text">${comment.content}</div>
                            
                            <div class="comment-actions">
                                ${this.generateReactionHtml(comment)}
                                <button class="reply-trigger" onclick="commentWidget.showReplyForm(${comment.id})">
                                     <ion-icon name="arrow-undo-outline"></ion-icon> Reply
                                </button>
                            </div>

                            <div id="reply-form-container-${comment.id}"></div>
                        </div>

                        ${childReplies.length > 0 ? `
                            <div class="replies-container">
                                ${visibleReplies.map(reply => this.generateCommentHtml(reply, allReplies, depth + 1)).join('')}
                                
                                ${hiddenReplies.length > 0 ? `
                                    <div id="more-replies-${comment.id}" style="display:none;">
                                        ${hiddenReplies.map(reply => this.generateCommentHtml(reply, allReplies, depth + 1)).join('')}
                                    </div>
                                    <button class="show-more-btn" onclick="commentWidget.toggleReplies(${comment.id}, this)">
                                        <ion-icon name="return-down-forward-outline"></ion-icon> Show ${hiddenReplies.length} more replies
                                    </button>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getProviderIcon(provider) {
        if (provider === 'google') return '<ion-icon name="logo-google" style="color:#ea4335"></ion-icon>';
        if (provider === 'github') return '<ion-icon name="logo-github" style="color:#fff"></ion-icon>';
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
                    csrf_token: this.csrfToken,
                    ...data
                })
            });

            const result = await response.json();

            if (response.ok) {
                await this.loadComments();
            } else {
                showToast(result.error || 'Failed to post comment.', 'error');
            }
        } catch (error) {
            console.error('Post comment error:', error);
            showToast('A network error occurred.', 'error');
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
                    reaction_type: type,
                    csrf_token: this.csrfToken
                })
            });

            if (response.ok) {
                await this.loadComments();
            } else {
                const result = await response.json();
                if (response.status === 429) showToast(result.error, 'warning');
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

    toggleReplies(parentId, btn) {
        const hiddenContainer = document.getElementById(`more-replies-${parentId}`);
        if (hiddenContainer) {
            // Fade in effect could be added here, but block is fine for now
            hiddenContainer.style.display = 'block';
            if (btn) btn.style.display = 'none';
        }
    }

    toggleComment(id) {
        const contentWrapper = document.getElementById(`comment-content-${id}`);
        const btn = document.querySelector(`#comment-${id} .collapse-toggle`);

        if (contentWrapper.style.display === 'none') {
            contentWrapper.style.display = 'block';
            btn.innerHTML = '[–]';
            btn.title = 'Collapse Thread';
        } else {
            contentWrapper.style.display = 'none';
            btn.innerHTML = '[+]';
            btn.title = 'Expand Thread';
        }
    }
}

// Global initialization helper
window.initCommentWidget = (options) => {
    window.commentWidget = new CommentWidget(options);
};
