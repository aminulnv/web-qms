/**
 * Migration Script: Move audit_assignments to audit tables
 * 
 * This script migrates all audit_assignments records to their respective audit tables.
 * For pending/in_progress assignments, it creates records in the audit table.
 * For completed assignments, it links them to existing audit records.
 * 
 * Run this script ONCE after deploying the new code.
 * 
 * Usage: Run in browser console on any page with Supabase access
 */

async function migrateAssignmentsToAuditTables() {
    console.log('🚀 Starting migration of audit_assignments to audit tables...');
    
    try {
        // Step 1: Get all active scorecards
        const { data: scorecards, error: scError } = await window.supabaseClient
            .from('scorecards')
            .select('id, name, table_name')
            .eq('is_active', true);
        
        if (scError) throw scError;
        if (!scorecards || scorecards.length === 0) {
            console.log('⚠️ No active scorecards found. Nothing to migrate.');
            return;
        }
        
        console.log(`📋 Found ${scorecards.length} active scorecards`);
        
        // Create a map of scorecard_id to table_name
        const scorecardTableMap = {};
        scorecards.forEach(sc => {
            scorecardTableMap[sc.id] = sc.table_name;
        });
        
        // Step 2: Get all audit_assignments
        const { data: assignments, error: assignError } = await window.supabaseClient
            .from('audit_assignments')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (assignError) throw assignError;
        if (!assignments || assignments.length === 0) {
            console.log('✅ No audit_assignments found. Migration complete.');
            return;
        }
        
        console.log(`📦 Found ${assignments.length} audit assignments to migrate`);
        
        // Step 3: Group assignments by scorecard/table
        const assignmentsByTable = {};
        assignments.forEach(assignment => {
            const tableName = scorecardTableMap[assignment.scorecard_id];
            if (!tableName) {
                console.warn(`⚠️ Assignment ${assignment.id} has invalid scorecard_id: ${assignment.scorecard_id}`);
                return;
            }
            
            if (!assignmentsByTable[tableName]) {
                assignmentsByTable[tableName] = [];
            }
            assignmentsByTable[tableName].push(assignment);
        });
        
        console.log(`📊 Grouped assignments into ${Object.keys(assignmentsByTable).length} tables`);
        
        // Step 4: Migrate each table
        let totalMigrated = 0;
        let totalSkipped = 0;
        let totalErrors = 0;
        
        for (const [tableName, tableAssignments] of Object.entries(assignmentsByTable)) {
            console.log(`\n🔄 Processing table: ${tableName} (${tableAssignments.length} assignments)`);
            
            for (const assignment of tableAssignments) {
                try {
                    // Check if this assignment is already migrated (has audit_id and audit exists)
                    if (assignment.status === 'completed' && assignment.audit_id) {
                        // Check if audit exists in the table
                        const { data: existingAudit, error: checkError } = await window.supabaseClient
                            .from(tableName)
                            .select('id, audit_status')
                            .eq('id', assignment.audit_id)
                            .single();
                        
                        if (!checkError && existingAudit) {
                            // Audit exists, just update it with assignment metadata
                            const { error: updateError } = await window.supabaseClient
                                .from(tableName)
                                .update({
                                    audit_status: 'completed',
                                    assignment_created_at: assignment.created_at,
                                    assigned_by: assignment.assigned_by,
                                    completed_at: assignment.completed_at || existingAudit.submitted_at
                                })
                                .eq('id', assignment.audit_id);
                            
                            if (updateError) throw updateError;
                            console.log(`  ✅ Updated existing audit ${assignment.audit_id} with assignment metadata`);
                            totalMigrated++;
                            continue;
                        }
                    }
                    
                    // For pending/in_progress assignments, or completed without audit_id
                    // Create a new record in the audit table
                    const auditRecord = {
                        id: assignment.audit_id || `assignment_${assignment.id}_${Date.now()}`,
                        employee_email: assignment.employee_email,
                        employee_name: assignment.employee_name,
                        auditor_email: assignment.auditor_email,
                        audit_status: assignment.status, // pending, in_progress, or completed
                        assignment_created_at: assignment.created_at,
                        assigned_by: assignment.assigned_by,
                        week: assignment.week || null,
                        // For completed assignments, set submitted_at
                        submitted_at: assignment.status === 'completed' && assignment.completed_at 
                            ? assignment.completed_at 
                            : null,
                        // For completed assignments, set completed_at
                        completed_at: assignment.status === 'completed' && assignment.completed_at
                            ? assignment.completed_at
                            : null,
                        // All other audit fields will be null for pending/in_progress
                        channel: null,
                        interaction_id: null,
                        average_score: null,
                        passing_status: null,
                        // Add scorecard_id reference (stored as metadata)
                        _scorecard_id: assignment.scorecard_id
                    };
                    
                    // Check if record already exists (by id)
                    const { data: existing, error: existsError } = await window.supabaseClient
                        .from(tableName)
                        .select('id')
                        .eq('id', auditRecord.id)
                        .single();
                    
                    if (!existsError && existing) {
                        // Update existing record
                        const { error: updateError } = await window.supabaseClient
                            .from(tableName)
                            .update({
                                audit_status: auditRecord.audit_status,
                                assignment_created_at: auditRecord.assignment_created_at,
                                assigned_by: auditRecord.assigned_by,
                                week: auditRecord.week,
                                submitted_at: auditRecord.submitted_at,
                                completed_at: auditRecord.completed_at
                            })
                            .eq('id', auditRecord.id);
                        
                        if (updateError) throw updateError;
                        console.log(`  ✅ Updated existing record ${auditRecord.id}`);
                        totalMigrated++;
                    } else {
                        // Insert new record
                        const { error: insertError } = await window.supabaseClient
                            .from(tableName)
                            .insert(auditRecord);
                        
                        if (insertError) {
                            // If it's a duplicate key error, try to update instead
                            if (insertError.code === '23505' || insertError.message.includes('duplicate')) {
                                const { error: updateError } = await window.supabaseClient
                                    .from(tableName)
                                    .update({
                                        audit_status: auditRecord.audit_status,
                                        assignment_created_at: auditRecord.assignment_created_at,
                                        assigned_by: auditRecord.assigned_by,
                                        week: auditRecord.week,
                                        submitted_at: auditRecord.submitted_at,
                                        completed_at: auditRecord.completed_at
                                    })
                                    .eq('id', auditRecord.id);
                                
                                if (updateError) throw updateError;
                                console.log(`  ✅ Updated duplicate record ${auditRecord.id}`);
                                totalMigrated++;
                            } else {
                                throw insertError;
                            }
                        } else {
                            console.log(`  ✅ Created new record ${auditRecord.id} (status: ${auditRecord.audit_status})`);
                            totalMigrated++;
                        }
                    }
                } catch (error) {
                    console.error(`  ❌ Error migrating assignment ${assignment.id}:`, error);
                    totalErrors++;
                }
            }
        }
        
        console.log(`\n📊 Migration Summary:`);
        console.log(`   ✅ Migrated: ${totalMigrated}`);
        console.log(`   ⚠️  Skipped: ${totalSkipped}`);
        console.log(`   ❌ Errors: ${totalErrors}`);
        console.log(`\n✅ Migration complete!`);
        console.log(`\n⚠️  IMPORTANT: After verifying the migration, you can delete the audit_assignments table.`);
        console.log(`   However, keep a backup first in case you need to rollback.`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.migrateAssignmentsToAuditTables = migrateAssignmentsToAuditTables;
}

// Auto-run if in browser console
if (typeof window !== 'undefined' && window.console) {
    console.log('📝 Migration script loaded. Run: migrateAssignmentsToAuditTables()');
}

