import { querySubscriber as query } from '../lib/db.js';

async function setupSubscribersSchema() {
    try {
        console.log('Setting up Subscribers Schema...');

        // 1. Subscribers Table
        await query(`
            CREATE TABLE IF NOT EXISTS subscribers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                is_verified BOOLEAN DEFAULT 0,
                verification_token TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                unsubscribed_at DATETIME
            )
        `);
        console.log('✓ Table "subscribers" created or already exists.');

        // Add index for verification_token (speeds up verify lookups)
        await query(`CREATE INDEX IF NOT EXISTS idx_subscribers_token ON subscribers (verification_token)`);
        console.log('✓ Index "idx_subscribers_token" created or already exists.');

        // 2. Blog Notifications Table (to track which blogs have been pushed)
        await query(`
            CREATE TABLE IF NOT EXISTS blog_notifications (
                slug TEXT PRIMARY KEY,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                subscriber_count INTEGER
            )
        `);
        console.log('✓ Table "blog_notifications" created or already exists.');

        // Verify
        const tables = await query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Current Tables:', tables.map(t => t.name));

    } catch (err) {
        console.error('Schema setup failed:', err);
    }
}

setupSubscribersSchema();
