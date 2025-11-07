/**
 * Script to deploy ClickUp notification edge function to Supabase
 * Usage: node scripts/deploy-clickup-function.js
 */

// Try to load dotenv if available
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, continue without it
}

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xijmkmvsumeoqarpmpvi.supabase.co';
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN || 'pk_95529802_A4TLOTATJKR5N6EQUML3BRSXTWR8X75J';

// Extract project reference from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('Error: Could not extract project reference from SUPABASE_URL');
  process.exit(1);
}

console.log('Deploying ClickUp notification edge function...');
console.log('Project:', projectRef);
console.log('');

// Function to set secret using Supabase Management API
async function setSecret(accessToken, projectRef, secretName, secretValue) {
  return new Promise((resolve, reject) => {
    const url = `https://api.supabase.com/v1/projects/${projectRef}/secrets`;
    const data = JSON.stringify({
      name: secretName,
      value: secretValue
    });

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData || '{}'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Try to deploy using npx supabase
async function deployFunction() {
  try {
    console.log('Attempting to deploy using Supabase CLI...');
    
    // Check if function directory exists
    const functionPath = path.join(__dirname, '..', 'supabase', 'functions', 'clickup-notify');
    if (!fs.existsSync(functionPath)) {
      throw new Error(`Function directory not found: ${functionPath}`);
    }

    // Try to deploy using npx supabase
    try {
      console.log('Deploying function...');
      const deployOutput = execSync(
        `npx supabase functions deploy clickup-notify --project-ref ${projectRef}`,
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
  console.log('=== ClickUp Notification Function Deployment ===\n');

  // Deploy the function
  const deployed = await deployFunction();
  
  if (!deployed) {
    console.log('\n⚠️  Automatic deployment failed.');
    console.log('Please deploy manually using one of these methods:');
    console.log('\n1. Using Supabase CLI (if installed):');
    console.log(`   supabase functions deploy clickup-notify --project-ref ${projectRef}`);
    console.log('\n2. Using Supabase Dashboard:');
    console.log('   - Go to: https://supabase.com/dashboard/project/' + projectRef + '/functions');
    console.log('   - Click "Deploy a new function"');
    console.log('   - Upload the contents of supabase/functions/clickup-notify/');
    console.log('\n3. Set the secret manually:');
    console.log('   - Go to: https://supabase.com/dashboard/project/' + projectRef + '/settings/functions');
    console.log('   - Add secret: CLICKUP_API_TOKEN = ' + CLICKUP_API_TOKEN);
    process.exit(1);
  }

  // Set the secret
  console.log('\nSetting CLICKUP_API_TOKEN secret...');
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  
  if (accessToken) {
    try {
      await setSecret(accessToken, projectRef, 'CLICKUP_API_TOKEN', CLICKUP_API_TOKEN);
      console.log('✓ Secret set successfully');
    } catch (error) {
      console.warn('⚠️  Failed to set secret automatically:', error.message);
      console.log('\nPlease set the secret manually:');
      console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/settings/functions');
      console.log('2. Add secret: CLICKUP_API_TOKEN');
      console.log('3. Value: ' + CLICKUP_API_TOKEN);
    }
  } else {
    console.log('⚠️  SUPABASE_ACCESS_TOKEN not found in environment variables');
    console.log('Please set the secret manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/settings/functions');
    console.log('2. Add secret: CLICKUP_API_TOKEN');
    console.log('3. Value: ' + CLICKUP_API_TOKEN);
  }

  console.log('\n✓ Deployment process completed!');
  console.log('\nThe function is available at:');
  console.log(`${SUPABASE_URL}/functions/v1/clickup-notify`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

