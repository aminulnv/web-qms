/**
 * Recalculate Audit Scores Script
 * 
 * This script recalculates scores for all existing audits using the fixed scoring logic.
 * It fixes the bug where parameters with null/undefined parameter_type were not being
 * deducted from scores.
 * 
 * Usage: Run in browser console on any page with Supabase access (e.g., home.html)
 * 
 * The script will:
 * 1. Load all active scorecards
 * 2. For each scorecard, load all audits
 * 3. Recalculate each audit's score using the fixed logic
 * 4. Update audits where the score has changed
 */

async function recalculateAllAuditScores() {
    console.log('🚀 Starting audit score recalculation...');
    console.log('This will fix scores for audits where errors were not properly deducted.\n');
    
    try {
        // Wait for Supabase to be ready
        let attempts = 0;
        while (!window.supabaseClient && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.supabaseClient) {
            throw new Error('Supabase client not initialized. Please refresh the page and try again.');
        }
        
        // Step 1: Get all active scorecards
        const { data: scorecards, error: scError } = await window.supabaseClient
            .from('scorecards')
            .select('id, name, table_name, scoring_type, passing_threshold, max_bonus_points, allow_over_100')
            .eq('is_active', true);
        
        if (scError) throw scError;
        if (!scorecards || scorecards.length === 0) {
            console.log('⚠️ No active scorecards found.');
            return;
        }
        
        console.log(`📋 Found ${scorecards.length} active scorecards\n`);
        
        let totalAuditsProcessed = 0;
        let totalAuditsUpdated = 0;
        let totalAuditsUnchanged = 0;
        let totalErrors = 0;
        
        // Step 2: Process each scorecard
        for (const scorecard of scorecards) {
            console.log(`\n🔄 Processing scorecard: ${scorecard.name} (${scorecard.scoring_type})`);
            console.log(`   Table: ${scorecard.table_name}`);
            
            try {
                // Load parameters for this scorecard
                const { data: parameters, error: paramsError } = await window.supabaseClient
                    .from('scorecard_parameters')
                    .select('*')
                    .eq('scorecard_id', scorecard.id)
                    .eq('is_active', true)
                    .order('display_order', { ascending: true });
                
                if (paramsError) {
                    console.error(`   ❌ Error loading parameters:`, paramsError);
                    totalErrors++;
                    continue;
                }
                
                if (!parameters || parameters.length === 0) {
                    console.log(`   ⚠️ No parameters found for this scorecard. Skipping.`);
                    continue;
                }
                
                console.log(`   📊 Found ${parameters.length} parameters`);
                
                // Load all audits from this scorecard's table
                const { data: audits, error: auditsError } = await window.supabaseClient
                    .from(scorecard.table_name)
                    .select('*')
                    .not('submitted_at', 'is', null); // Only process submitted audits
                
                if (auditsError) {
                    console.error(`   ❌ Error loading audits:`, auditsError);
                    totalErrors++;
                    continue;
                }
                
                if (!audits || audits.length === 0) {
                    console.log(`   ℹ️ No audits found in this table.`);
                    continue;
                }
                
                console.log(`   📦 Found ${audits.length} audits to process`);
                
                let scorecardUpdated = 0;
                let scorecardUnchanged = 0;
                
                // Step 3: Recalculate score for each audit
                for (const audit of audits) {
                    totalAuditsProcessed++;
                    
                    try {
                        // Recalculate score using fixed logic
                        const recalculatedScore = calculateScoreForAudit(audit, parameters, scorecard);
                        const originalScore = audit.average_score || audit.averageScore || 0;
                        
                        // Round to 2 decimal places
                        const roundedScore = Math.round(recalculatedScore * 100) / 100;
                        const roundedOriginal = Math.round(parseFloat(originalScore) * 100) / 100;
                        
                        // Check if score changed
                        if (Math.abs(roundedScore - roundedOriginal) > 0.01) {
                            // Score changed - update the audit
                            const { error: updateError } = await window.supabaseClient
                                .from(scorecard.table_name)
                                .update({ 
                                    average_score: roundedScore,
                                    // Also update passing_status if needed
                                    passing_status: roundedScore >= (scorecard.passing_threshold || 85) ? 'Pass' : 'Fail'
                                })
                                .eq('id', audit.id);
                            
                            if (updateError) {
                                console.error(`   ❌ Error updating audit ${audit.id}:`, updateError);
                                totalErrors++;
                            } else {
                                scorecardUpdated++;
                                totalAuditsUpdated++;
                                console.log(`   ✅ Updated audit ${audit.id}: ${roundedOriginal}% → ${roundedScore}% (diff: ${(roundedScore - roundedOriginal).toFixed(2)}%)`);
                            }
                        } else {
                            scorecardUnchanged++;
                            totalAuditsUnchanged++;
                        }
                    } catch (err) {
                        console.error(`   ❌ Error processing audit ${audit.id}:`, err);
                        totalErrors++;
                    }
                }
                
                console.log(`   ✅ Scorecard complete: ${scorecardUpdated} updated, ${scorecardUnchanged} unchanged`);
                
            } catch (err) {
                console.error(`   ❌ Error processing scorecard ${scorecard.name}:`, err);
                totalErrors++;
            }
        }
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 RECALCULATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total audits processed: ${totalAuditsProcessed}`);
        console.log(`✅ Audits updated: ${totalAuditsUpdated}`);
        console.log(`➖ Audits unchanged: ${totalAuditsUnchanged}`);
        console.log(`❌ Errors: ${totalErrors}`);
        console.log('='.repeat(60));
        console.log('\n✅ Score recalculation complete!');
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
        alert('Error recalculating scores: ' + error.message);
    }
}

/**
 * Calculate score for an audit using the fixed scoring logic
 */
function calculateScoreForAudit(audit, parameters, scorecard) {
    const scoringType = scorecard.scoring_type || 'deductive';
    
    switch (scoringType) {
        case 'deductive':
            return calculateDeductiveScoreForAudit(audit, parameters);
        case 'additive':
            return calculateAdditiveScoreForAudit(audit, parameters);
        case 'hybrid':
            return calculateHybridScoreForAudit(audit, parameters, scorecard);
        default:
            return calculateDeductiveScoreForAudit(audit, parameters);
    }
}

/**
 * Deductive scoring: Start at 100, subtract for errors
 * Uses the FIXED logic that defaults parameter_type to 'error' if null/undefined
 */
function calculateDeductiveScoreForAudit(audit, parameters) {
    let totalDeduction = 0;
    
    parameters.forEach(param => {
        // FIXED: Default to 'error' if parameter_type is null/undefined/empty
        const paramType = param.parameter_type || 'error';
        const pointsDirection = param.points_direction;
        
        // Skip achievement/bonus types that don't have subtract direction
        if ((paramType === 'achievement' || paramType === 'bonus') && pointsDirection !== 'subtract') {
            return;
        }
        
        // Get value from audit record
        let value = 0;
        const fieldValue = audit[param.field_id];
        
        if (param.field_type === 'radio') {
            // Radio button: value is 0 or 1
            value = fieldValue ? (parseInt(fieldValue) || 0) : 0;
        } else {
            // Counter field: value is the count
            value = fieldValue ? (parseInt(fieldValue) || 0) : 0;
        }
        
        const penalty = parseFloat(param.penalty_points) || 0;
        totalDeduction += value * penalty;
    });
    
    return Math.max(0, 100 - totalDeduction);
}

/**
 * Additive scoring: Start at 0, add for achievements
 */
function calculateAdditiveScoreForAudit(audit, parameters) {
    let totalPoints = 0;
    let maxPossiblePoints = 0;
    
    parameters.forEach(param => {
        if (param.parameter_type !== 'achievement' && param.points_direction !== 'add') return;
        
        const points = parseFloat(param.penalty_points) || 0;
        
        // Max possible is if all achievements were completed
        if (param.field_type === 'radio') {
            maxPossiblePoints += points;
        } else {
            maxPossiblePoints += points;
        }
        
        // Get value from audit record
        let value = 0;
        const fieldValue = audit[param.field_id];
        
        if (param.field_type === 'radio') {
            value = fieldValue ? (parseInt(fieldValue) || 0) : 0;
        } else {
            value = fieldValue ? (parseInt(fieldValue) || 0) : 0;
        }
        
        totalPoints += value * points;
    });
    
    // Convert to percentage
    if (maxPossiblePoints === 0) return 0;
    return Math.min(100, (totalPoints / maxPossiblePoints) * 100);
}

/**
 * Hybrid scoring: Deduct for errors, add for achievements
 * Uses the FIXED logic that defaults parameter_type to 'error' if null/undefined
 */
function calculateHybridScoreForAudit(audit, parameters, scorecard) {
    let baseScore = 100;
    let bonusPoints = 0;
    
    parameters.forEach(param => {
        // Get value from audit record
        let value = 0;
        const fieldValue = audit[param.field_id];
        
        if (param.field_type === 'radio') {
            value = fieldValue ? (parseInt(fieldValue) || 0) : 0;
        } else {
            value = fieldValue ? (parseInt(fieldValue) || 0) : 0;
        }
        
        const points = parseFloat(param.penalty_points) || 0;
        
        // FIXED: Default to 'error' if parameter_type is null/undefined/empty
        const paramType = param.parameter_type || 'error';
        const pointsDirection = param.points_direction;
        
        if (paramType === 'error' || pointsDirection === 'subtract') {
            // Subtract from base score
            baseScore -= value * points;
        } else if (paramType === 'achievement' || paramType === 'bonus' || pointsDirection === 'add') {
            // Add to bonus
            bonusPoints += value * points;
        }
    });
    
    // Apply max bonus cap if set
    const maxBonus = parseFloat(scorecard.max_bonus_points) || 0;
    if (maxBonus > 0) {
        bonusPoints = Math.min(bonusPoints, maxBonus);
    }
    
    // Calculate final score
    let finalScore = baseScore + bonusPoints;
    
    // Apply over 100% cap if not allowed
    const allowOver100 = scorecard.allow_over_100 || false;
    if (!allowOver100) {
        finalScore = Math.min(100, finalScore);
    }
    
    // Ensure minimum of 0
    finalScore = Math.max(0, finalScore);
    
    return finalScore;
}

// Make function available globally
window.recalculateAllAuditScores = recalculateAllAuditScores;

console.log('✅ Recalculate audit scores script loaded!');
console.log('Run: recalculateAllAuditScores()');

