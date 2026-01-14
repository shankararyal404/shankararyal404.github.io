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
                // Construct comment for local append
                const newComment = {
                    id: result.id,
                    post_slug: this.postSlug,
                    content: data.content,
                    author_name: data.author_name,
                    author_avatar: data.author_avatar,
                    created_at: new Date().toISOString(),
                    parent_id: data.parent_id || null,
                    auth_provider: data.auth_provider,
                    is_admin: result.is_admin || 0,
                    likes: 0, hearts: 0, laughs: 0, salutes: 0, mindblown: 0
                };

                this.comments.push(newComment);

                // Clear inputs
                const textarea = document.getElementById('comment-textarea');
                if (textarea) textarea.value = '';
                const charCount = document.getElementById('char-count');
                if (charCount) charCount.textContent = '0/5000';

                // Close reply forms
                document.querySelectorAll('.reply-form-active, .reply-modal-overlay').forEach(f => f.remove());

                // Update UI without full re-fetch
                this.renderComments();

                // Update Badge
                const commentBadge = document.getElementById('comment-count-badge');
                if (commentBadge) {
                    commentBadge.innerHTML = `<ion-icon name="chatbubbles-outline"></ion-icon> ${this.comments.length} Comments`;
                }

                showToast('Comment posted!', 'success');
            } else if (response.status === 403 && !isRetry) {
                await this.fetchCsrfToken();
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return this.postComment(data, true);
            } else {
                showToast(result.error || 'Failed to post comment.', 'error');
            }
        } catch (error) {
            console.error('Post comment error:', error);
            showToast('A network error occurred.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }

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
                // Update local counts for better UX
                const comment = this.comments.find(c => c.id == commentId);
                if (comment) {
                    const keyMap = { '👍': 'likes', '❤️': 'hearts', '😂': 'laughs', '🫡': 'salutes', '🤯': 'mindblown' };
                    const key = keyMap[type];
                    if (key) {
                        const result = await response.json();
                        if (result.message === 'Reaction added') comment[key] = (comment[key] || 0) + 1;
                        else if (result.message === 'Reaction removed') comment[key] = Math.max(0, (comment[key] || 0) - 1);
                        this.renderComments();
                    }
                }
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
                await this.loadComments(); // Re-fetch for post-level reactions simplifies merge logic
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

                <div id="post-reactions-container" class="post-reactions-bar">
                    <div class="loading-shimmer" style="height: 30px; border-radius: 15px;"></div>
                </div>

                <div class="section-divider" style="margin: 20px 0; border-top: 1px solid var(--white-alpha-10);"></div>

                <div class="comment-auth-section" id="auth-section">
                    ${this.renderAuthUI()}
                </div>

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

                <div class="comments-list" id="comments-list"></div>
            </div>
        `;

        const textarea = document.getElementById('comment-textarea');
        const countSpan = document.getElementById('char-count');
        textarea?.addEventListener('input', () => {
            if (countSpan) countSpan.textContent = `${textarea.value.length}/5000`;
        });
    }

    renderAuthUI() {
        if (this.isLoggedIn) {
            return `
                <div class="user-logged-in">
                    <img src="${this.user.avatar}" alt="${this.escapeHtml(this.user.name)}" class="user-avatar-small">
                    <span>Logged in as <strong>${this.escapeHtml(this.user.name)}</strong></span>
                    <button class="auth-text-btn" onclick="commentWidget.logout()">Logout</button>
                </div>
            `;
        } else {
            return `
                <div class="social-login-prompt">
                    <span>Sign in to comment with:</span>
                    <div class="social-buttons">
                        <button class="social-btn google" onclick="commentWidget.login('google')" title="Login with Google"><ion-icon name="logo-google"></ion-icon></button>
                        <button class="social-btn github" onclick="commentWidget.login('github')" title="Login with GitHub"><ion-icon name="logo-github"></ion-icon></button>
                        <button class="social-btn twitter" onclick="commentWidget.login('twitter')" title="Login with X"><ion-icon name="logo-twitter"></ion-icon></button>
                    </div>
                    <span class="or-separator">or continue as guest below</span>
                </div>
            `;
        }
    }

    login(provider) {
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
                .filter(c => c.content && c.content.trim().length > 0);
            this.stats = data.stats || { reactions: [] };

            const commentBadge = document.getElementById('comment-count-badge');
            if (commentBadge) {
                commentBadge.innerHTML = `<ion-icon name="chatbubbles-outline"></ion-icon> ${this.comments.length} Comments`;
            }

            this.renderPostReactions();
            this.renderComments();
        } catch (error) {
            console.error('Failed to load comments:', error);
            const listContainer = document.getElementById('comments-list');
            if (listContainer) {
                listContainer.innerHTML = `<p style="color:var(--fiery-rose); text-align:center;">Failed to load engagement data.</p>`;
            }
        }
    }

    renderPostReactions() {
        const container = document.getElementById('post-reactions-container');
        if (!container) return;

        const defaults = [
            { type: '🔥', count: 0 }, { type: '🤯', count: 0 },
            { type: '👏', count: 0 }, { type: '❤️', count: 0 },
            { type: '👍', count: 0 }, { type: '🫡', count: 0 }
        ];

        if (this.stats && Array.isArray(this.stats.reactions)) {
            this.stats.reactions.forEach(stat => {
                const def = defaults.find(d => d.type === stat.reaction_type);
                if (def) def.count = stat.count;
            });
        }

        container.innerHTML = defaults.map(r => `
            <button class="post-reaction-btn ${r.count > 0 ? 'has-count' : ''}" 
                    onclick="commentWidget.handlePostReaction('${r.type}')">
                <span>${r.type}</span>
                <span class="count">${r.count}</span>
            </button>
        `).join('');
    }

    renderComments() {
        const listContainer = document.getElementById('comments-list');
        if (!listContainer) return;

        if (this.comments.length === 0) {
            listContainer.innerHTML = '<p class="no-comments">No comments yet. Be the first to share your thoughts!</p>';
            return;
        }

        // Support Focus Mode (Single Thread View)
        const urlParams = new URLSearchParams(window.location.search);
        const focusId = parseInt(urlParams.get('focus_comment'));

        let rootComments;
        if (focusId && this.comments.some(c => c.id === focusId)) {
            rootComments = this.comments.filter(c => c.id === focusId);
            listContainer.innerHTML = `
                <div class="focus-notice">
                    <span>Viewing single comment thread.</span>
                    <a href="${window.location.pathname}">View all comments</a>
                </div>
            ` + rootComments.map(comment => this.generateCommentHtml(comment, this.comments, 0)).join('');
        } else {
            const topLevel = this.comments.filter(c => !c.parent_id);
            const replies = this.comments.filter(c => c.parent_id);
            listContainer.innerHTML = topLevel.map(comment => this.generateCommentHtml(comment, replies, 0)).join('');
        }
    }

    generateCommentHtml(comment, allReplies, depth) {
        const date = new Date(comment.created_at).toLocaleDateString();
        const isAdmin = comment.is_admin === 1;
        const isSocial = comment.auth_provider !== 'anonymous';
        const avatar = comment.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author_name)}&background=random&color=fff`;

        const childReplies = allReplies.filter(r => r.parent_id === comment.id);
        const childCount = childReplies.length;

        const isSmallScreen = window.innerWidth < 600;
        const visualDepth = isSmallScreen ? Math.min(depth, 2) : Math.min(depth, 4);

        // "Drill-Down" logic for deep threads (depth >= 5)
        if (depth >= 5 && childCount > 0) {
            return `
                <div class="continue-thread-box">
                    <button class="continue-thread-link" onclick="commentWidget.focusThread(${comment.id})">
                        View ${childCount} more repl${childCount === 1 ? 'y' : 'ies'} →
                    </button>
                </div>
            `;
        }

        let replyToHtml = '';
        if (comment.parent_id && (depth === 0 || isSmallScreen)) {
            const parent = this.comments.find(c => c.id === comment.parent_id);
            if (parent) {
                replyToHtml = `<span class="reply-to-text">in reply to <strong>${this.escapeHtml(parent.author_name)}</strong></span>`;
            }
        }

        const VISIBLE_LIMIT = 5;
        const visibleReplies = childReplies.slice(0, VISIBLE_LIMIT);
        const hiddenReplies = childReplies.slice(VISIBLE_LIMIT);

        return `
            <div class="comment-item" id="comment-${comment.id}" data-depth="${visualDepth}">
                <div class="comment-avatar"><img src="${avatar}" alt="${this.escapeHtml(comment.author_name)}"></div>
                <div class="comment-wrapper">
                    <div class="comment-header">
                        <div class="meta-left">
                            <span class="author-name">${this.escapeHtml(comment.author_name)}</span>
                            ${replyToHtml}
                            ${isSocial ? `<span class="auth-provider-badge">${this.getProviderIcon(comment.auth_provider)}</span>` : ''}
                            ${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
                            <span class="comment-date">${date}</span>
                        </div>
                        <button class="collapse-toggle" onclick="commentWidget.toggleComment(${comment.id}, ${childCount})">[–]</button>
                    </div>
                    
                    <div class="comment-content-wrapper" id="comment-content-${comment.id}">
                        <div class="comment-body">
                            <div class="comment-text">${this.escapeHtml(comment.content)}</div>
                            <div class="comment-actions">
                                <div class="action-left">
                                    ${depth === 0 ? this.generateReactionHtml(comment) : this.generateCompactReactionHtml(comment)}
                                    <button class="reply-trigger" onclick="commentWidget.showReplyForm(${comment.id})">
                                        <ion-icon name="arrow-undo-outline"></ion-icon> Reply
                                    </button>
                                </div>
                            </div>
                            <div id="reply-form-container-${comment.id}"></div>
                        </div>
                    </div>

                    ${childReplies.length > 0 ? `
                        <div class="replies-container" id="replies-${comment.id}">
                            ${visibleReplies.map(reply => this.generateCommentHtml(reply, allReplies, depth + 1)).join('')}
                            ${hiddenReplies.length > 0 ? `
                                <div id="more-replies-${comment.id}" style="display:none;">
                                    ${hiddenReplies.map(reply => this.generateCommentHtml(reply, allReplies, depth + 1)).join('')}
                                </div>
                                <button class="show-more-btn" onclick="commentWidget.toggleReplies(${comment.id}, this)">
                                    Show ${hiddenReplies.length} more replies
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    focusThread(commentId) {
        const url = new URL(window.location.href);
        url.searchParams.set('focus_comment', commentId);
        window.history.pushState({}, '', url);
        this.renderComments();
        this.container.scrollIntoView({ behavior: 'smooth' });
    }

    generateCompactReactionHtml(comment) {
        const reactions = [
            { type: '👍', count: comment.likes || 0 }, { type: '❤️', count: comment.hearts || 0 },
            { type: '😂', count: comment.laughs || 0 }, { type: '🫡', count: comment.salutes || 0 },
            { type: '🤯', count: comment.mindblown || 0 }
        ];

        const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
        const activeReactions = reactions.filter(r => r.count > 0).sort((a, b) => b.count - a.count);
        const topTwo = activeReactions.slice(0, 2);

        let vibeHtml = '';
        if (totalReactions > 0) {
            const icons = topTwo.map(r => r.type).join('');
            vibeHtml = `<div class="vibe-badge">${icons} ${totalReactions}</div>`;
        }

        return `
            <div class="reaction-hub-container">
                <button class="reaction-group" style="border: none; background: rgba(255,255,255,0.05);">
                    <ion-icon name="add-circle-outline"></ion-icon>
                    ${vibeHtml}
                </button>
                <div class="reaction-menu">
                    ${reactions.map(r => `
                        <span class="reaction-item" onclick="commentWidget.handleReaction(${comment.id}, '${r.type}')" title="${r.type}">
                            ${r.type}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getProviderIcon(provider) {
        if (provider === 'google') return '<ion-icon name="logo-google" style="color:#ea4335"></ion-icon>';
        if (provider === 'github') return '<ion-icon name="logo-github"></ion-icon>';
        if (provider === 'twitter') return '<ion-icon name="logo-twitter" style="color:#1da1f2"></ion-icon>';
        return '';
    }

    generateReactionHtml(comment) {
        const reactions = [
            { type: '👍', count: comment.likes || 0 }, { type: '❤️', count: comment.hearts || 0 },
            { type: '😂', count: comment.laughs || 0 }, { type: '🫡', count: comment.salutes || 0 },
            { type: '🤯', count: comment.mindblown || 0 }
        ];
        return reactions.map(r => `
            <div class="reaction-group" onclick="commentWidget.handleReaction(${comment.id}, '${r.type}')">
                <span class="reaction-emoji">${r.type}</span>
                <span class="reaction-count">${r.count}</span>
            </div>
        `).join('');
    }

    showReplyForm(parentId) {
        // Remove existing active reply forms
        document.querySelectorAll('.reply-form-active, .reply-modal-overlay').forEach(e => e.remove());

        const commentEl = document.getElementById(`comment-${parentId}`);
        const depth = parseInt(commentEl?.getAttribute('data-depth') || '0');
        const container = document.getElementById(`reply-form-container-${parentId}`);
        if (!container) return;

        const isMobile = window.innerWidth <= 768;
        const useModal = isMobile || depth >= 2;

        if (useModal) {
            this.showReplyModal(parentId);
        } else {
            const form = document.createElement('div');
            form.className = 'reply-form-active';
            form.innerHTML = `
                <textarea class="comment-textarea" id="reply-textarea-${parentId}" placeholder="Write a reply..." required maxlength="2000"></textarea>
                <div class="form-footer">
                    <button class="auth-text-btn" onclick="this.parentElement.parentElement.remove()">Cancel</button>
                    <button class="submit-btn" onclick="commentWidget.submitReply(${parentId})">Post Reply</button>
                </div>
            `;
            container.appendChild(form);
            form.querySelector('textarea').focus();
        }
    }

    showReplyModal(parentId) {
        const overlay = document.createElement('div');
        overlay.className = 'reply-modal-overlay';
        overlay.innerHTML = `
            <div class="reply-modal">
                <div class="modal-header">
                    <h3>Reply to Comment</h3>
                    <button onclick="this.closest('.reply-modal-overlay').remove()"><ion-icon name="close-outline"></ion-icon></button>
                </div>
                <textarea class="comment-textarea" id="reply-textarea-${parentId}" placeholder="Write your reply..." required maxlength="2000"></textarea>
                <div class="modal-footer">
                    <button class="submit-btn full-width" onclick="commentWidget.submitReply(${parentId})">Post Reply</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('textarea').focus();
    }

    async submitReply(parentId) {
        const textarea = document.getElementById(`reply-textarea-${parentId}`);
        const content = textarea?.value.trim();
        if (!content) return;

        await this.postComment({
            content: content,
            author_name: this.user.name || 'Anonymous',
            author_email: this.user.email || '',
            author_avatar: this.user.avatar || '',
            is_anonymous: !this.isLoggedIn,
            auth_provider: this.isLoggedIn ? this.user.provider : 'anonymous',
            parent_id: parentId
        });
    }

    setupEventListeners() {
        const form = document.getElementById('main-comment-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const textarea = document.getElementById('comment-textarea');
            const authorNameInput = document.getElementById('author-name');
            const honeypot = document.getElementById('honeypot')?.value;

            const content = textarea.value.trim();
            const authorName = this.isLoggedIn ? this.user.name : (authorNameInput?.value.trim() || 'Anonymous');

            if (!content) return;

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
        });
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
            hiddenContainer.style.display = 'block';
            if (btn) btn.style.display = 'none';
        }
    }

    toggleComment(id, childCount = 0) {
        const repliesWrapper = document.getElementById(`replies-${id}`);
        const contentWrapper = document.getElementById(`comment-content-${id}`);
        const btn = document.querySelector(`#comment-${id} .collapse-toggle`);

        if (childCount > 0) {
            const isHidden = repliesWrapper?.style.display === 'none';
            if (isHidden) {
                if (repliesWrapper) repliesWrapper.style.display = 'block';
                if (btn) btn.innerHTML = '[–]';
            } else {
                if (repliesWrapper) repliesWrapper.style.display = 'none';
                if (btn) btn.innerHTML = `[+] (${childCount} child${childCount === 1 ? '' : 'ren'})`;
            }
        } else {
            const isHidden = contentWrapper.style.display === 'none';
            if (isHidden) {
                contentWrapper.style.display = 'block';
                if (btn) btn.innerHTML = '[–]';
            } else {
                contentWrapper.style.display = 'none';
                if (btn) btn.innerHTML = '[+]';
            }
        }
    }
}

window.initCommentWidget = (options) => { window.commentWidget = new CommentWidget(options); };

