/**
 * Script to deploy n8n webhook test edge function to Supabase
 * Usage: node scripts/deploy-n8n-webhook-function.js
 */

// Try to load dotenv if available
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, continue without it
}

const https = require('https');
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

console.log('Deploying n8n webhook test edge function...');
console.log('Project:', projectRef);
console.log('');

// Try to deploy using npx supabase
async function deployFunction() {
  try {
    console.log('Attempting to deploy using Supabase CLI...');
    
    // Check if function directory exists
    const functionPath = path.join(__dirname, '..', 'supabase', 'functions', 'n8n-webhook-test');
    if (!fs.existsSync(functionPath)) {
      throw new Error(`Function directory not found: ${functionPath}`);
    }

    // Try to deploy using npx supabase
    try {
      console.log('Deploying function...');
      const deployOutput = execSync(
        `npx supabase functions deploy n8n-webhook-test --project-ref ${projectRef}`,
        { 
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit',
          env: { ...process.env }
        }
      );
      console.log('✓ Function deployed successfully');
      return true;
    } catch (error) {
      console.warn('Direct deployment failed, trying alternative method...');
      throw error;
    }
  } catch (error) {
    console.error('Deployment error:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('=== n8n Webhook Test Function Deployment ===\n');

  // Deploy the function
  const deployed = await deployFunction();
  
  if (!deployed) {
    console.log('\n⚠️  Automatic deployment failed.');
    console.log('Please deploy manually using one of these methods:');
    console.log('\n1. Using Supabase CLI (if installed):');
    console.log(`   supabase functions deploy n8n-webhook-test --project-ref ${projectRef}`);
    console.log('\n2. Using Supabase Dashboard:');
    console.log('   - Go to: https://supabase.com/dashboard/project/' + projectRef + '/functions');
    console.log('   - Click "Deploy a new function"');
    console.log('   - Upload the contents of supabase/functions/n8n-webhook-test/');
    console.log('\n3. Using npx (requires SUPABASE_ACCESS_TOKEN):');
    console.log('   $env:SUPABASE_ACCESS_TOKEN="your-token"; npx supabase functions deploy n8n-webhook-test --project-ref ' + projectRef);
    process.exit(1);
  }

  console.log('\n✓ Deployment process completed!');
  console.log('\nThe function is available at:');
  console.log(`${SUPABASE_URL}/functions/v1/n8n-webhook-test`);
  console.log('\nTest with curl:');
  console.log(`curl -X POST '${SUPABASE_URL}/functions/v1/n8n-webhook-test' \\`);
  console.log(`  -H 'Authorization: Bearer YOUR_ANON_KEY' \\`);
  console.log(`  -H 'apikey: YOUR_ANON_KEY' \\`);
  console.log(`  -H 'Content-Type: application/json' \\`);
  console.log(`  -d '{"auditor_name":"John Doe","employee_name":"Jane Smith","alias_name":"JS","from":"2024-01-01","to":"2024-01-31"}'`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


