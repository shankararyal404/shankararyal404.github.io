import { queryInfra, query, closePool } from '../lib/db-pool.js';
import { cache } from '../lib/turso-cache.js';
import { env } from '../lib/env-config.js';

async function verify() {
    console.log('🔍 Starting Optimization Verification...');
    console.log('----------------------------------------');

    // 1. Check Env
    console.log('1. Environment Configuration:');
    console.log('   - Primary DB URL:', env.database.primary.url ? '✅ Set' : '❌ Missing');
    console.log('   - Infra DB URL:', env.database.infra.url ? '✅ Set' : '❌ Missing');
    console.log('   - Email Config:', env.email.admin ? '✅ Set' : '❌ Missing');

    if (!env.database.primary.url || !env.database.infra.url) {
        console.error('❌ Critical: Database URLs missing. Check .env.local');
        process.exit(1);
    }

    // 2. Check Database Connection & Schema
    console.log('\n2. Database Connection & Schema:');

    try {
        // Check Primary
        await query('SELECT 1', [], 'primary');
        console.log('   - Primary DB Connection: ✅ OK');

        // Check Infra
        await queryInfra('SELECT 1');
        console.log('   - Infra DB Connection:   ✅ OK');

        // Check Tables in Infra
        const tables = ['cache', 'sessions', 'audit_logs', 'rate_limits'];
        for (const table of tables) {
            const result = await queryInfra(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]);
            if (result.length > 0) {
                console.log(`   - Table '${table}':      ✅ Exists`);
            } else {
                console.error(`   - Table '${table}':      ❌ MISSING (Run migrations!)`);
            }
        }

    } catch (error) {
        console.error('❌ Database Error:', error.message);
        process.exit(1);
    }

    // 3. Test Cache
    console.log('\n3. Testing Turso Cache:');
    try {
        const testKey = 'verify-test-' + Date.now();
        const testValue = { foo: 'bar' };

        console.log('   - Setting cache value...');
        await cache.set(testKey, testValue, 10);

        console.log('   - Getting cache value...');
        const result = await cache.get(testKey);

        if (JSON.stringify(result) === JSON.stringify(testValue)) {
            console.log('   - Cache Read/Write:      ✅ Success');
        } else {
            console.error('   - Cache Read/Write:      ❌ Failed (Value mismatch)');
        }

        await cache.delete(testKey);

    } catch (error) {
        console.error('❌ Cache Error:', error.message);
    }

    console.log('\n----------------------------------------');
    console.log('✅ Verification Complete');
    await closePool();
}

verify().catch(console.error);
