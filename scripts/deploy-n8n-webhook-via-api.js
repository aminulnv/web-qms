/**
 * Deploy n8n-webhook-test function using Supabase Management API
 * This requires SUPABASE_ACCESS_TOKEN environment variable
 * Usage: $env:SUPABASE_ACCESS_TOKEN="your-token"; node scripts/deploy-n8n-webhook-via-api.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xijmkmvsumeoqarpmpvi.supabase.co';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!SUPABASE_ACCESS_TOKEN) {
  console.log('⚠️  SUPABASE_ACCESS_TOKEN not found.');
  console.log('Please get your access token from: https://supabase.com/dashboard/account/tokens');
  console.log('Then run: $env:SUPABASE_ACCESS_TOKEN="your-token"; node scripts/deploy-n8n-webhook-via-api.js');
  process.exit(1);
}

// Create a zip file of the function
function createFunctionZip() {
  return new Promise((resolve, reject) => {
    const functionPath = path.join(__dirname, '..', 'supabase', 'functions', 'n8n-webhook-test');
    const zipPath = path.join(__dirname, '..', 'n8n-webhook-test-function.zip');
    
    // Check if function directory exists
    if (!fs.existsSync(functionPath)) {
      reject(new Error(`Function directory not found: ${functionPath}`));
      return;
    }
    
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(`✓ Created function zip: ${zipPath} (${archive.pointer()} bytes)`);
      resolve(zipPath);
    });
    
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(functionPath, false);
    archive.finalize();
  });
}

// Deploy function using Supabase Management API
async function deployFunction(zipPath) {
  return new Promise((resolve, reject) => {
    const zipData = fs.readFileSync(zipPath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    const formData = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from('Content-Disposition: form-data; name="name"\r\n\r\n'),
      Buffer.from('n8n-webhook-test\r\n'),
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from('Content-Disposition: form-data; name="file"; filename="function.zip"\r\n'),
      Buffer.from('Content-Type: application/zip\r\n\r\n'),
      zipData,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/functions`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formData.length
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✓ Function deployed successfully');
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(formData);
    req.end();
  });
}

async function main() {
  try {
    console.log('=== Deploying n8n Webhook Test Function ===\n');
    console.log('Project:', projectRef);
    console.log('');
    
    // Create zip
    console.log('1. Creating function zip file...');
    const zipPath = await createFunctionZip();
    
    // Deploy function
    console.log('2. Deploying function to Supabase...');
    await deployFunction(zipPath);
    
    // Cleanup
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      console.log('✓ Cleaned up temporary files');
    }
    
    console.log('\n✅ Deployment complete!');
    console.log(`Function URL: ${SUPABASE_URL}/functions/v1/n8n-webhook-test`);
    console.log('\nTest with curl:');
    console.log(`curl -X POST '${SUPABASE_URL}/functions/v1/n8n-webhook-test' \\`);
    console.log(`  -H 'Authorization: Bearer YOUR_ANON_KEY' \\`);
    console.log(`  -H 'apikey: YOUR_ANON_KEY' \\`);
    console.log(`  -H 'Content-Type: application/json' \\`);
    console.log(`  -d '{"auditor_name":"John Doe","employee_name":"Jane Smith","alias_name":"JS","from":"2024-01-01","to":"2024-01-31"}'`);
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('   This usually means your SUPABASE_ACCESS_TOKEN is invalid or expired.');
      console.error('   Get a new token from: https://supabase.com/dashboard/account/tokens');
    }
    process.exit(1);
  }
}

main();


