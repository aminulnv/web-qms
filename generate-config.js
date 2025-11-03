/**
 * Config File Generator
 * This script generates config files from .env file or environment variables
 * 
 * Usage:
 *   1. Create a .env file (copy from .env.example) with your credentials
 *   2. Run: node generate-config.js
 * 
 * Or use environment variables directly:
 *   INTERCOM_ACCESS_TOKEN=xxx INTERCOM_APP_ID=xxx SUPABASE_URL=xxx SUPABASE_ANON_KEY=xxx node generate-config.js
 */

const fs = require('fs');
const path = require('path');

// Try to load dotenv if available
let dotenv;
try {
    dotenv = require('dotenv');
    // Load .env file
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log('✅ Loaded .env file');
    } else {
        // In Vercel/build environments, env vars come from the platform
        // This is expected and normal - no warning needed
        if (process.env.VERCEL || process.env.CI) {
            console.log('📦 Build environment detected - using environment variables from platform');
        } else {
            console.warn('⚠️  .env file not found. Using environment variables directly.');
            console.warn('   For local development, create a .env file by copying .env.example');
        }
    }
} catch (error) {
    console.warn('⚠️  dotenv package not found. Install it with: npm install dotenv');
    console.warn('   Using environment variables directly instead.');
}

// Read from environment variables (from .env file or system env)
const INTERCOM_ACCESS_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;
const INTERCOM_APP_ID = process.env.INTERCOM_APP_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validate required variables
const missingVars = [];
if (!INTERCOM_ACCESS_TOKEN) missingVars.push('INTERCOM_ACCESS_TOKEN');
if (!INTERCOM_APP_ID) missingVars.push('INTERCOM_APP_ID');
if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
if (!SUPABASE_ANON_KEY) missingVars.push('SUPABASE_ANON_KEY');

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease set these environment variables and try again.');
    process.exit(1);
}

// Generate intercom-config.js
const intercomConfig = `// Intercom API Configuration
// This file is auto-generated from environment variables
// IMPORTANT: This file contains sensitive credentials and is excluded from git via .gitignore
window.intercomConfig = {
    accessToken: '${INTERCOM_ACCESS_TOKEN}',
    apiBaseUrl: 'https://api.intercom.io',
    appId: '${INTERCOM_APP_ID}'
};
`;

// Generate supabase-config.js (partial - you'll need to add the rest of the functions)
const supabaseConfigStart = `/**
 * Supabase Configuration and Client Setup
 * This file is auto-generated from environment variables
 * IMPORTANT: This file contains sensitive credentials and is excluded from git via .gitignore
 */

// Supabase Configuration
const SUPABASE_URL = '${SUPABASE_URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
`;

// Read the example file to get the full structure
const examplePath = path.join(__dirname, 'supabase-config.example.js');
let supabaseConfigFull = '';

if (fs.existsSync(examplePath)) {
    const exampleContent = fs.readFileSync(examplePath, 'utf8');
    // Replace placeholder values in the example with actual values
    supabaseConfigFull = exampleContent
        .replace('YOUR_SUPABASE_URL_HERE', SUPABASE_URL)
        .replace('YOUR_SUPABASE_ANON_KEY_HERE', SUPABASE_ANON_KEY)
        .replace(
            /\/\*\*[\s\S]*?IMPORTANT: Never commit[\s\S]*?\*\//,
            '/**\n * Supabase Configuration and Client Setup\n * This file is auto-generated from environment variables\n * IMPORTANT: This file contains sensitive credentials and is excluded from git via .gitignore\n */'
        )
        // Remove "Replace with..." comments since values are already filled
        .replace(/\/\/ Replace with your actual Supabase project URL/g, '')
        .replace(/\/\/ Replace with your actual Supabase anonymous key/g, '');
} else {
    // Fallback: use a template if example file doesn't exist
    console.warn('⚠️  supabase-config.example.js not found, using fallback template');
    supabaseConfigFull = `/**
 * Supabase Configuration and Client Setup
 * This file is auto-generated from environment variables
 * IMPORTANT: This file contains sensitive credentials and is excluded from git via .gitignore
 */

// Supabase Configuration
const SUPABASE_URL = '${SUPABASE_URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';

// Initialize Supabase client
let supabaseClient = null

function initializeSupabase() {
  if (typeof window.supabase !== 'undefined') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    window.supabaseClient = supabaseClient
    console.log('Supabase client initialized successfully')
    return true
  }
  return false
}

function waitForSupabase() {
  if (initializeSupabase()) {
    return
  }
  setTimeout(waitForSupabase, 100)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForSupabase)
} else {
  waitForSupabase()
}

window.SupabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  getClient: () => supabaseClient
}
`;
}

// Write files
fs.writeFileSync('intercom-config.js', intercomConfig);
fs.writeFileSync('supabase-config.js', supabaseConfigFull);

console.log('✅ Config files generated successfully!');
console.log('   - intercom-config.js');
console.log('   - supabase-config.js');
console.log('');
console.log('⚠️  These files are gitignored and should NOT be committed to GitHub.');

