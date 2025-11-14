/**
 * Quick Fix Script: Add audit_type column to scorecard table
 * 
 * Run this in the browser console on any page with Supabase access
 * This will add the missing audit_type column to your scorecard table
 */

async function fixMissingAuditTypeColumn(tableName = 'standard_deductive_scorecard_1763117187341') {
    if (!window.supabaseClient) {
        console.error('❌ Supabase client not found. Make sure you are on a page with Supabase initialized.');
        return;
    }

    console.log(`🔧 Adding audit_type column to table: ${tableName}`);
    
    try {
        // Use RPC to execute SQL (if you have an RPC function for this)
        // Otherwise, we'll need to use the Supabase SQL editor directly
        
        // Try to add the column using a direct SQL query via RPC
        // Note: This requires a custom RPC function or direct database access
        const { data, error } = await window.supabaseClient.rpc('exec_sql', {
            sql: `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS audit_type TEXT;`
        });

        if (error) {
            // If RPC doesn't exist, provide instructions
            if (error.message.includes('function') && error.message.includes('does not exist')) {
                console.warn('⚠️ Direct SQL execution not available via RPC.');
                console.log('\n📋 Please run this SQL in Supabase SQL Editor:');
                console.log(`\nALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS audit_type TEXT;\n`);
                console.log('Or use the migration file: supabase/migrations/add_audit_type_to_scorecard_tables.sql');
                return;
            }
            throw error;
        }

        console.log('✅ Successfully added audit_type column!');
        console.log('🔄 Please refresh the page and try submitting the audit again.');
        
    } catch (error) {
        console.error('❌ Error adding column:', error);
        console.log('\n📋 Manual fix required. Please run this SQL in Supabase SQL Editor:');
        console.log(`\nALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS audit_type TEXT;\n`);
    }
}

// Auto-run if table name is in the error context
if (typeof currentScorecard !== 'undefined' && currentScorecard?.table_name) {
    console.log('🔍 Detected scorecard table, you can run:');
    console.log(`fixMissingAuditTypeColumn('${currentScorecard.table_name}')`);
} else {
    console.log('📝 Usage: fixMissingAuditTypeColumn("standard_deductive_scorecard_1763117187341")');
    console.log('   Or: fixMissingAuditTypeColumn() to use the default table name');
}

// Make function available globally
window.fixMissingAuditTypeColumn = fixMissingAuditTypeColumn;

