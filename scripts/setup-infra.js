import { queryInfra } from '../lib/db-pool.js';
import fs from 'fs';
import path from 'path';

async function setupInfraSchema() {
    try {
        console.log('🔧 Setting up Infrastructure DB Schema...');

        const migrationPath = path.join(process.cwd(), 'migrations', '001_optimization_schema.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split SQL into individual statements
        // Note: Simple split by semicolon. Be careful with semicolons inside strings if any.
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                await queryInfra(statement);
                // Extract table name for logging if possible
                const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
                if (match) {
                    console.log(`✅ Table Created/Verified: ${match[1]}`);
                }
            } catch (err) {
                console.error(`❌ Failed statement: ${statement.substring(0, 50)}...`);
                console.error(`Reason: ${err.message}`);
            }
        }

        console.log('\n✨ Infrastructure DB setup complete!');

    } catch (err) {
        console.error('Infrastructure setup failed:', err);
    }
}

setupInfraSchema();
