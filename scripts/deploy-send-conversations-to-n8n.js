/**
 * Deployment script for send-conversations-to-n8n edge function
 * This requires SUPABASE_ACCESS_TOKEN environment variable
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
  console.log('Then run: $env:SUPABASE_ACCESS_TOKEN="your-token"; node scripts/deploy-send-conversations-to-n8n.js');
  process.exit(1);
}

// Create a zip file of the function
function createFunctionZip() {
  return new Promise((resolve, reject) => {
    const functionPath = path.join(__dirname, '..', 'supabase', 'functions', 'send-conversations-to-n8n');
    const zipPath = path.join(__dirname, '..', 'send-conversations-to-n8n-function.zip');
    
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
    
    const formData = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="name"',
      '',
      'send-conversations-to-n8n',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="function.zip"',
      'Content-Type: application/zip',
      '',
      zipData,
      `--${boundary}--`
    ].join('\r\n');
    
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/functions`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
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
    console.log('=== Deploying send-conversations-to-n8n Function ===\n');
    
    // Create zip
    console.log('1. Creating function zip file...');
    const zipPath = await createFunctionZip();
    
    // Deploy function
    console.log('2. Deploying function to Supabase...');
    await deployFunction(zipPath);
    console.log('✓ Function deployed successfully');
    
    // Cleanup
    fs.unlinkSync(zipPath);
    console.log('✓ Cleaned up temporary files');
    
    console.log('\n✅ Deployment complete!');
    console.log(`Function URL: ${SUPABASE_URL}/functions/v1/send-conversations-to-n8n`);
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

main();


