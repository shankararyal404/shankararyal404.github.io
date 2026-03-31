
import { query } from './lib/db.js';

async function checkSchema() {
    try {
        console.log('Checking comments table schema...');
        const result = await query('PRAGMA table_info(comments)');
        console.log('Columns in comments table:');
        result.forEach(col => {
            console.log(`- ${col.name} (${col.type})`);
        });

        console.log('\nChecking for sample data...');
        const samples = await query('SELECT * FROM comments LIMIT 1');
        console.log('Sample row:', JSON.stringify(samples[0], null, 2));

    } catch (error) {
        console.error('Schema check failed:', error);
    }
}

checkSchema();
