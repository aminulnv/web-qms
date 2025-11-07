/**
 * Sync Intercom Admins to Supabase Cache
 * Fetches all admins from Intercom API and upserts them into intercom_admin_cache table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const INTERCOM_ACCESS_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;
const INTERCOM_API_BASE_URL = process.env.INTERCOM_API_BASE_URL || 'https://api.intercom.io';

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
    process.exit(1);
}

if (!INTERCOM_ACCESS_TOKEN) {
    console.error('❌ Error: INTERCOM_ACCESS_TOKEN must be set in environment variables');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch all admins from Intercom API
 */
async function fetchIntercomAdmins() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔄 FETCHING ADMINS FROM INTERCOM API');
    console.log('═══════════════════════════════════════════════════════');
    
    const url = `${INTERCOM_API_BASE_URL}/admins`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
                'Accept': 'application/json',
                'Intercom-Version': '2.10'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();
        
        // Validate response structure
        if (!data || data.type !== 'admin.list' || !Array.isArray(data.admins)) {
            throw new Error('Invalid response format. Expected { type: "admin.list", admins: [...] }');
        }
        
        console.log(`✅ Successfully fetched ${data.admins.length} admins from Intercom`);
        return data.admins;
        
    } catch (error) {
        console.error('❌ ERROR FETCHING ADMINS FROM INTERCOM');
        console.error('Error:', error.message);
        throw error;
    }
}

/**
 * Sync admins to Supabase cache table
 */
async function syncAdminsToSupabase(admins) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('💾 SYNCING ADMINS TO SUPABASE CACHE');
    console.log('═══════════════════════════════════════════════════════');
    
    const now = new Date().toISOString();
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const admin of admins) {
        try {
            // Extract id, email, name for direct columns
            const adminId = admin.id;
            const adminEmail = admin.email || '';
            const adminName = admin.name || '';
            
            if (!adminId) {
                console.warn(`⚠️  Skipping admin without ID:`, admin);
                errorCount++;
                errors.push({ admin: adminEmail || 'unknown', error: 'Missing ID' });
                continue;
            }
            
            // Prepare data for upsert
            const cacheData = {
                id: adminId,
                email: adminEmail.toLowerCase().trim(), // Normalize email
                name: adminName,
                admin_data: admin, // Store all admin fields as JSON
                last_synced_at: now
            };
            
            // Upsert (insert or update if exists)
            const { error: upsertError } = await supabase
                .from('intercom_admin_cache')
                .upsert(cacheData, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                });
            
            if (upsertError) {
                console.error(`❌ Error upserting admin ${adminId} (${adminEmail}):`, upsertError.message);
                errorCount++;
                errors.push({ admin: adminEmail, error: upsertError.message });
            } else {
                successCount++;
                console.log(`✅ Synced: ${adminName} (${adminEmail})`);
            }
        } catch (error) {
            console.error(`❌ Error processing admin ${admin.id}:`, error.message);
            errorCount++;
            errors.push({ admin: admin.email || admin.id, error: error.message });
        }
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 SYNC SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Successfully synced: ${successCount} admins`);
    console.log(`❌ Errors: ${errorCount} admins`);
    
    if (errors.length > 0) {
        console.log('\n⚠️  Errors encountered:');
        errors.forEach(({ admin, error }) => {
            console.log(`   - ${admin}: ${error}`);
        });
    }
    
    console.log('═══════════════════════════════════════════════════════');
    
    return { successCount, errorCount, errors };
}

/**
 * Main sync function
 */
async function main() {
    try {
        // Fetch admins from Intercom
        const admins = await fetchIntercomAdmins();
        
        if (admins.length === 0) {
            console.log('⚠️  No admins found to sync');
            return;
        }
        
        // Sync to Supabase
        const result = await syncAdminsToSupabase(admins);
        
        if (result.errorCount === 0) {
            console.log('\n🎉 All admins synced successfully!');
            process.exit(0);
        } else {
            console.log(`\n⚠️  Sync completed with ${result.errorCount} error(s)`);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ FATAL ERROR');
        console.error(error);
        process.exit(1);
    }
}

// Run the sync
main();

