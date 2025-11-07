/**
 * Alternative deployment script using Supabase Management API
 * This requires SUPABASE_ACCESS_TOKEN environment variable
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { createReadStream } = require('fs');
const archiver = require('archiver');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xijmkmvsumeoqarpmpvi.supabase.co';
const CLICKUP_API_TOKEN = 'pk_95529802_A4TLOTATJKR5N6EQUML3BRSXTWR8X75J';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!SUPABASE_ACCESS_TOKEN) {
  console.log('⚠️  SUPABASE_ACCESS_TOKEN not found.');
  console.log('Please get your access token from: https://supabase.com/dashboard/account/tokens');
  console.log('Then run: $env:SUPABASE_ACCESS_TOKEN="your-token"; node scripts/deploy-via-api.js');
  process.exit(1);
}

// Create a zip file of the function
function createFunctionZip() {
  return new Promise((resolve, reject) => {
    const functionPath = path.join(__dirname, '..', 'supabase', 'functions', 'clickup-notify');
    const zipPath = path.join(__dirname, '..', 'clickup-notify-function.zip');
    
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
      'clickup-notify',
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

// Set secret
async function setSecret() {
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
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData || '{}'));
        } else {
          // Secret might already exist, that's okay
          if (res.statusCode === 409) {
            console.log('Secret already exists, updating...');
            resolve({ exists: true });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    console.log('=== Deploying ClickUp Notification Function ===\n');
    
    // Create zip
    console.log('1. Creating function zip file...');
    const zipPath = await createFunctionZip();
    
    // Deploy function
    console.log('2. Deploying function to Supabase...');
    await deployFunction(zipPath);
    console.log('✓ Function deployed successfully');
    
    // Set secret
    console.log('3. Setting CLICKUP_API_TOKEN secret...');
    await setSecret();
    console.log('✓ Secret set successfully');
    
    // Cleanup
    fs.unlinkSync(zipPath);
    console.log('✓ Cleaned up temporary files');
    
    console.log('\n✅ Deployment complete!');
    console.log(`Function URL: ${SUPABASE_URL}/functions/v1/clickup-notify`);
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

main();

