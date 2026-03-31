import { execSync } from 'child_process';

/**
 * Master Setup Script
 * Initializes all 3 databases sequentially.
 * Usage: node scripts/setup-all.js
 */

async function runSetup() {
    console.log('🚀 Starting Full Database Setup...\n');

    const scripts = [
        { name: 'Primary DB (Indexes)', path: 'scripts/setup-database.js' },
        { name: 'Subscriber DB (Tables)', path: 'scripts/setup-subscribers.js' },
        { name: 'Infrastructure DB (Logs/Cache)', path: 'scripts/setup-infra.js' }
    ];

    for (const script of scripts) {
        console.log(`--------------------------------------------------`);
        console.log(`📂 Running: ${script.name}...`);
        try {
            // Use inherit to show real-time output
            execSync(`node ${script.path}`, { stdio: 'inherit' });
            console.log(`✅ ${script.name} completed successfully.\n`);
        } catch (error) {
            console.error(`❌ ${script.name} failed! Check your credentials in .env.`);
            // Continue with others even if one fails
        }
    }

    console.log(`--------------------------------------------------`);
    console.log('✨ All setups finished! You are ready to deploy.\n');
}

runSetup();
