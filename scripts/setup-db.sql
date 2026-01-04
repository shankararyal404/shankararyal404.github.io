-- Turso Database Schema for Custom Commenting System

-- Create Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_slug TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_email TEXT,
    author_avatar TEXT,
    content TEXT NOT NULL,
    parent_id INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_anonymous BOOLEAN DEFAULT 0,
    auth_provider TEXT DEFAULT 'anonymous',
    is_admin BOOLEAN DEFAULT 0,
    status TEXT DEFAULT 'pending', -- approved, pending, spam
    FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE
);

-- Create Reactions Table
CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    user_id TEXT NOT NULL, -- Anonymous ID or Social ID
    reaction_type TEXT NOT NULL, -- 👍, ❤️, 😂, 🫡, 🤯, 😱, 🎉, 🚀
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id, reaction_type),
    FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_post_slug ON comments(post_slug);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON reactions(comment_id);
