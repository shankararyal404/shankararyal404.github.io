/**
 * Generate CSP Hashes for Inline Scripts
 * This script calculates SHA-256 hashes for inline scripts in templates
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Extract inline script content from base.html
const baseTemplatePath = path.join(process.cwd(), 'templates', 'base.html');
const baseTemplate = fs.readFileSync(baseTemplatePath, 'utf-8');

// Extract inline scripts
const scriptRegex = /<script[^>]*>(.*?)<\/script>/gs;
const scripts = [];
let match;

while ((match = scriptRegex.exec(baseTemplate)) !== null) {
    // Skip external scripts (have src attribute)
    if (!match[0].includes('src=') && match[1].trim().length > 0) {
        scripts.push(match[1].trim());
    }
}

console.log(`Found ${scripts.length} inline scripts\n`);

// Generate hashes
const hashes = scripts.map((script, index) => {
    const hash = crypto.createHash('sha256').update(script, 'utf8').digest('base64');
    console.log(`Script ${index + 1}:`);
    console.log(`  Preview: ${script.substring(0, 50)}...`);
    console.log(`  Hash: sha256-${hash}\n`);
    return `'sha256-${hash}'`;
});

console.log('CSP script-src hashes:');
console.log(hashes.join(' '));

// Write to file for use in vercel.json
const output = {
    scriptHashes: hashes,
    generatedAt: new Date().toISOString()
};

fs.writeFileSync(
    path.join(process.cwd(), 'csp-hashes.json'),
    JSON.stringify(output, null, 2)
);

console.log('\n✅ Hashes saved to csp-hashes.json');
