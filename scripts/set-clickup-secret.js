/**
 * Script to set ClickUp API token as Supabase Edge Function secret
 * This uses the Supabase Management API
 * 
 * Usage: 
 *   1. Get your Supabase access token from: https://supabase.com/dashboard/account/tokens
 *   2. Set it: $env:SUPABASE_ACCESS_TOKEN="your-token"
 *   3. Run: node scripts/set-clickup-secret.js
 */

const https = require('https');

const SUPABASE_URL = 'https://xijmkmvsumeoqarpmpvi.supabase.co';
const CLICKUP_API_TOKEN = 'pk_95529802_A4TLOTATJKR5N6EQUML3BRSXTWR8X75J';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Error: SUPABASE_ACCESS_TOKEN environment variable is not set');
  console.log('\nTo set the secret:');
  console.log('1. Get your access token from: https://supabase.com/dashboard/account/tokens');
  console.log('2. Set it: $env:SUPABASE_ACCESS_TOKEN="your-token"');
  console.log('3. Run this script again: node scripts/set-clickup-secret.js');
  process.exit(1);
}

function setSecret() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      name: 'CLICKUP_API_TOKEN',
      value: CLICKUP_API_TOKEN
    });

    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/secrets`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    console.log(`Setting secret for project: ${projectRef}...`);

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Secret set successfully!');
          resolve(JSON.parse(responseData || '{}'));
        } else if (res.statusCode === 409) {
          console.log('⚠️  Secret already exists. Attempting to update...');
          // Try to update by deleting and recreating
          updateSecret().then(resolve).catch(reject);
        } else {
          console.error(`❌ Failed to set secret: HTTP ${res.statusCode}`);
          console.error('Response:', responseData);
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

function updateSecret() {
  return new Promise((resolve, reject) => {
    // First delete the existing secret
    const deleteOptions = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/secrets/CLICKUP_API_TOKEN`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`
      }
    };

    const deleteReq = https.request(deleteOptions, (res) => {
      res.on('end', () => {
        // Now create it again
        setSecret().then(resolve).catch(reject);
      });
    });

    deleteReq.on('error', reject);
    deleteReq.end();
  });
}

async function main() {
  try {
    await setSecret();
    console.log('\n✅ ClickUp API token has been set as a secret!');
    console.log('\nNext steps:');
    console.log('1. Deploy the function using: supabase functions deploy clickup-notify --project-ref ' + projectRef);
    console.log('2. Or deploy via the Supabase Dashboard');
    console.log('\nSee DEPLOY-CLICKUP-FUNCTION.md for full deployment instructions.');
  } catch (error) {
    console.error('\n❌ Failed to set secret:', error.message);
    process.exit(1);
  }
}

main();

