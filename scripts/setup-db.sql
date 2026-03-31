-- Step 1: Drop old tables
DROP TABLE IF EXISTS reactions;
DROP TABLE IF EXISTS comments;

-- Step 2: Create Comments Table
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  author_avatar TEXT,
  content TEXT NOT NULL,
  parent_id INTEGER DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_anonymous INTEGER DEFAULT 0,
  auth_provider TEXT DEFAULT 'anonymous',
  is_admin INTEGER DEFAULT 0,
  status TEXT DEFAULT 'approved',
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE
);

-- Step 3: Create Reactions Table (Fixed)
CREATE TABLE reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER DEFAULT NULL,
  post_slug TEXT DEFAULT NULL,
  user_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK ((comment_id IS NOT NULL AND post_slug IS NULL) OR (comment_id IS NULL AND post_slug IS NOT NULL)),
  FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE
);

-- Step 4: Create IP Blocklist (for security)
CREATE TABLE ip_blocklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT UNIQUE NOT NULL,
  reason TEXT,
  blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Create Indexes (Simple version)
CREATE INDEX idx_comments_post_slug ON comments(post_slug);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_reactions_comment_id ON reactions(comment_id);
CREATE INDEX idx_reactions_post_slug ON reactions(post_slug);
CREATE INDEX idx_reactions_user_id ON reactions(user_id);

-- Step 7: Create Composite Index for Uniqueness (Simpler approach)
-- For comment reactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_comment_unique 
ON reactions(comment_id, user_id, reaction_type) 
WHERE comment_id IS NOT NULL;

-- For post reactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_post_unique 
ON reactions(post_slug, user_id, reaction_type) 
WHERE post_slug IS NOT NULL;