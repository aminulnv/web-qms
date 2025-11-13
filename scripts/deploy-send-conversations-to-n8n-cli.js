/**
 * Script to deploy send-conversations-to-n8n edge function to Supabase
 * Usage: node scripts/deploy-send-conversations-to-n8n-cli.js
 */

// Try to load dotenv if available
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, continue without it
}

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xijmkmvsumeoqarpmpvi.supabase.co';

// Extract project reference from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('Error: Could not extract project reference from SUPABASE_URL');
  process.exit(1);
}

console.log('=== Deploying send-conversations-to-n8n Edge Function ===\n');
console.log('Project:', projectRef);
console.log('');

// Try to deploy using npx supabase
async function deployFunction() {
  try {
    console.log('Attempting to deploy using Supabase CLI...');
    
    // Check if function directory exists
    const functionPath = path.join(__dirname, '..', 'supabase', 'functions', 'send-conversations-to-n8n');
    if (!fs.existsSync(functionPath)) {
      throw new Error(`Function directory not found: ${functionPath}`);
    }

    console.log('Function directory found:', functionPath);
    console.log('Deploying function...\n');

    // Try to deploy using npx supabase
    try {
      execSync(
        `npx supabase functions deploy send-conversations-to-n8n --project-ref ${projectRef} --no-verify-jwt`,
        { 
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit',
          env: { ...process.env }
        }
      );
      console.log('\n✓ Function deployed successfully');
      return true;
    } catch (error) {
      console.error('\n❌ Deployment failed:', error.message);
      console.error('\nIf you see authentication errors, you need to:');
      console.error('1. Get your access token from: https://supabase.com/dashboard/account/tokens');
      console.error('2. Run: npx supabase login --token YOUR_TOKEN');
      console.error('3. Or set: $env:SUPABASE_ACCESS_TOKEN="YOUR_TOKEN"');
      throw error;
    }
  } catch (error) {
    console.error('Deployment error:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  try {
    const success = await deployFunction();
    
    if (success) {
      console.log('\n✅ Deployment complete!');
      console.log(`Function URL: ${SUPABASE_URL}/functions/v1/send-conversations-to-n8n`);
    } else {
      console.error('\n❌ Deployment failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

main();


