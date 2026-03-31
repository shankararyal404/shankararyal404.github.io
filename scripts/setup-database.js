import { query } from '../lib/db-pool.js';

/**
 * Setup database indexes for better query performance
 * Run this script once to create all necessary indexes
 */

const indexes = [
    // Comments table indexes
    {
        name: 'idx_comments_post_slug',
        sql: 'CREATE INDEX IF NOT EXISTS idx_comments_post_slug ON comments(post_slug)'
    },
    {
        name: 'idx_comments_status',
        sql: 'CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status)'
    },
    {
        name: 'idx_comments_created_at',
        sql: 'CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC)'
    },
    {
        name: 'idx_comments_post_status',
        sql: 'CREATE INDEX IF NOT EXISTS idx_comments_post_status ON comments(post_slug, status)'
    },

    // Reactions table indexes
    {
        name: 'idx_reactions_comment_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON reactions(comment_id)'
    },
    {
        name: 'idx_reactions_post_slug',
        sql: 'CREATE INDEX IF NOT EXISTS idx_reactions_post_slug ON reactions(post_slug)'
    },
    {
        name: 'idx_reactions_type',
        sql: 'CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type)'
    },

    // IP blocklist indexes
    {
        name: 'idx_ip_blocklist_ip',
        sql: 'CREATE INDEX IF NOT EXISTS idx_ip_blocklist_ip ON ip_blocklist(ip)'
    },
    {
        name: 'idx_ip_blocklist_created',
        sql: 'CREATE INDEX IF NOT EXISTS idx_ip_blocklist_created ON ip_blocklist(created_at DESC)'
    }
];

/**
 * Create all database indexes
 */
async function setupIndexes() {
    console.log('🔧 Setting up database indexes...\n');

    let successCount = 0;
    let failCount = 0;

    for (const index of indexes) {
        try {
            await query(index.sql);
            console.log(`✅ Created index: ${index.name}`);
            successCount++;
        } catch (error) {
            console.error(`❌ Failed to create index ${index.name}:`, error.message);
            failCount++;
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Success: ${successCount}/${indexes.length}`);
    if (failCount > 0) {
        console.log(`   ❌ Failed: ${failCount}/${indexes.length}`);
    }
    console.log('\n✨ Database setup complete!');
}

/**
 * Verify indexes exist
 */
async function verifyIndexes() {
    console.log('\n🔍 Verifying indexes...\n');

    try {
        // SQLite/libSQL command to list indexes
        const result = await query(`
      SELECT name, tbl_name 
      FROM sqlite_master 
      WHERE type = 'index' 
      AND name LIKE 'idx_%'
      ORDER BY tbl_name, name
    `);

        if (result.length === 0) {
            console.log('⚠️  No indexes found');
            return;
        }

        console.log('Found indexes:');
        result.forEach(row => {
            console.log(`   ✓ ${row.name} on ${row.tbl_name}`);
        });

        console.log(`\n📊 Total indexes: ${result.length}`);
    } catch (error) {
        console.error('❌ Failed to verify indexes:', error.message);
    }
}

/**
 * Analyze table statistics
 */
async function analyzeDatabase() {
    console.log('\n📊 Analyzing database...\n');

    try {
        // Get table statistics
        const tables = ['comments', 'reactions', 'ip_blocklist'];

        for (const table of tables) {
            try {
                const count = await query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   ${table}: ${count[0]?.count || 0} rows`);
            } catch (error) {
                console.log(`   ${table}: Error - ${error.message}`);
            }
        }
    } catch (error) {
        console.error('❌ Failed to analyze database:', error.message);
    }
}

// Run setup
(async () => {
    try {
        await setupIndexes();
        await verifyIndexes();
        await analyzeDatabase();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Setup failed:', error);
        process.exit(1);
    }
})();
