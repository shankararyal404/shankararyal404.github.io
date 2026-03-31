
import { query, db } from './lib/db.js';

async function migrate() {
    console.log('Starting Non-Destructive Migration...');

    const columnsToAdd = [
        { name: 'author_avatar', type: 'TEXT' },
        { name: 'parent_id', type: 'INTEGER' },
        { name: 'is_anonymous', type: 'INTEGER DEFAULT 0' },
        { name: 'auth_provider', type: "TEXT DEFAULT 'anonymous'" },
        { name: 'is_admin', type: 'INTEGER DEFAULT 0' },
        { name: 'status', type: "TEXT DEFAULT 'approved'" }
    ];

    try {
        // 1. Get current columns
        const currentCols = await query('PRAGMA table_info(comments)');
        const currentColNames = currentCols.map(c => c.name);

        // 2. Add missing columns
        for (const col of columnsToAdd) {
            if (!currentColNames.includes(col.name)) {
                console.log(`Adding column: ${col.name}...`);
                await db.execute({
                    sql: `ALTER TABLE comments ADD COLUMN ${col.name} ${col.type}`,
                    args: []
                });
            } else {
                console.log(`Column ${col.name} already exists.`);
            }
        }

        // 3. Ensure Index for parent_id
        console.log('Ensuring index for parent_id...');
        await db.execute({
            sql: 'CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)',
            args: []
        });

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    }
}

migrate();
