/**
 * CSV Upload Script for FN Chat CFD Scorecard
 * 
 * This script reads the CSV file and transforms it to match the fn_chat_cfd table schema
 * Run this script after executing the SQL migration (add_missing_columns_fn_chat_cfd.sql)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration - Update these with your Supabase details
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';
const TABLE_NAME = 'fn_chat_cfd';
const CSV_FILE_PATH = path.join(__dirname, 'Unified Data of QC - CEx FN Chat.csv');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n');
    const headers = parseCSVLine(lines[0]);
    
    console.log(`Found ${headers.length} columns in CSV`);
    console.log('Headers:', headers);
    
    const records = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // Skip empty lines
        
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index];
            });
            records.push(record);
        }
    }
    
    console.log(`Parsed ${records.length} records from CSV`);
    return { headers, records };
}

/**
 * Parse a single CSV line (handles quoted values with commas)
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    
    return result;
}

/**
 * Transform CSV record to database format
 */
function transformRecord(csvRecord, index) {
    // Clean up column names (remove leading/trailing spaces)
    const cleanRecord = {};
    Object.keys(csvRecord).forEach(key => {
        cleanRecord[key.trim()] = csvRecord[key];
    });
    
    // Map CSV columns to database columns
    const dbRecord = {
        id: `audit_fn_chat_cfd_${Date.now()}_${index}`,
        // Use Audit Timestamp from CSV if available, otherwise use current time
        submitted_at: parseDateTime(cleanRecord['Audit Timestamp']) || new Date().toISOString(),
        
        // Core audit fields
        audit_duration: cleanRecord['Audit Duration'] || null,
        auditor_email: cleanRecord["Auditor's Email"] || null,
        auditor_name: cleanRecord["Auditor's Name"] || null,
        transcript: cleanRecord['Transcript'] || null,
        employee_name: cleanRecord["Employee's Name"] || null,
        employee_email: cleanRecord["Employee's Email"] || null,
        interaction_date: parseDate(cleanRecord['Interaction Date']),
        employee_type: cleanRecord['Employee Type'] || null,
        audit_type: cleanRecord['Audit Type'] || null,
        agent_pre_status: cleanRecord['Agent Pre Status'] || null,
        quarter: cleanRecord['Quarter'] || null,
        country_of_employee: cleanRecord['Country of Employee'] || null,
        interaction_id: cleanRecord['Interaction ID'] || null,
        client_email: cleanRecord["Client's Email"] || null,
        week: parseInteger(cleanRecord['Week']),
        channel: cleanRecord['Channel'] || null,
        agent_post_status: cleanRecord['Agent Post Status'] || null,
        average_score: parseFloat(cleanRecord['Average Score']) || null,
        passing_status: cleanRecord['Passing/Not Passing'] || null,
        total_errors_count: parseInteger(cleanRecord['Total Errors Count']),
        critical_fail_error: parseInteger(cleanRecord['Critical Fail Error']),
        critical_errors: parseInteger(cleanRecord['Critical Error']),
        significant_error: parseInteger(cleanRecord['Significant Error']),
        error_description: cleanRecord['Error Description'] || null,
        recommendations: cleanRecord['Recommendations/Next Steps'] || null,
        validation_status: cleanRecord['Validation Status'] || null,
        
        // Reversal tracking fields
        reversal_requested_at: parseDateTime(cleanRecord['Reversal Requested At']),
        reversal_responded_at: parseDateTime(cleanRecord['Reversal Responded At']),
        sla_in_hours: parseFloat(cleanRecord['SLA (In Hours)']),
        reason_for_reversal_response_delay: cleanRecord['Reason for Reversal Response Delay'] || null,
        reversal_approved: parseBoolean(cleanRecord['Reversal Approved?']),
        within_auditor_scope: parseBoolean(cleanRecord["Within Auditor's Scope?"]),
        score_before_appeal: parseFloat(cleanRecord['Score Before Appeal']),
        score_after_appeal: parseFloat(cleanRecord['Score After Appeal']),
        did_result_in_pass: parseBoolean(cleanRecord['Did this result result in a pass?']),
        reversal_type: cleanRecord['Reversal Type'] || null,
        reversal_metrics_parameters: cleanRecord['Reversal Metrics / Parameters'] || null,
        reversal_justification_from_agent: cleanRecord['Reversal Justification from Agent'] || null,
        reversal_attachments: cleanRecord['Reversal Attachments'] || null,
        reversal_approved_by: cleanRecord['Reversal Approved By\n(Agent\'s Supervisor)'] || cleanRecord['Reversal Approved By'] || null,
        reversal_resolved_by: cleanRecord['Reversal Resolved By'] || null,
        
        // Acknowledgement tracking (set default for bulk import)
        acknowledgement_status: 'Pending',
        acknowledgement_status_updated_at: null,
        
        // Error parameters (15 error types)
        error_leading_to_a_loss_of_business: parseInteger(cleanRecord['Error Leading to a Loss of Business']?.trim() || cleanRecord['  Error Leading to a Loss of Business']?.trim()),
        zero_tolerance: parseInteger(cleanRecord['Zero Tolerance']?.trim() || cleanRecord['  Zero Tolerance']?.trim()),
        incorrect_information: parseInteger(cleanRecord['Incorrect Information']?.trim() || cleanRecord['  Incorrect Information']?.trim()),
        lack_of_professionalism: parseInteger(cleanRecord['Lack of Professionalism']?.trim() || cleanRecord['  Lack of Professionalism']?.trim()),
        lack_of_escalation_unnecessary_escalation: parseInteger(cleanRecord['Lack of Escalation/Unnecessary Escalation']?.trim() || cleanRecord['  Lack of Escalation/Unnecessary Escalation']?.trim()),
        lack_of_investigation: parseInteger(cleanRecord['Lack of Investigation']?.trim() || cleanRecord['  Lack of Investigation']?.trim()),
        lack_of_empathy: parseInteger(cleanRecord['Lack of Empathy']?.trim() || cleanRecord['  Lack of Empathy']?.trim()),
        lack_of_knowledge: parseInteger(cleanRecord['Lack of Knowledge']?.trim() || cleanRecord['  Lack of Knowledge']?.trim()),
        lack_of_information_about_internal_communications: parseInteger(cleanRecord['Lack of Information about Internal Communications']?.trim() || cleanRecord['  Lack of Information about Internal Communications']?.trim()),
        missing_information: parseInteger(cleanRecord['Missing Information']?.trim() || cleanRecord['  Missing Information']?.trim()),
        outdated_macro_usage: parseInteger(cleanRecord['Outdated Macro Usage']?.trim() || cleanRecord['  Outdated Macro Usage']?.trim()),
        grammatical_errors: parseInteger(cleanRecord['Grammatical Errors']?.trim() || cleanRecord['  Grammatical Errors']?.trim()),
        information_overload: parseInteger(cleanRecord['Information Overload']?.trim() || cleanRecord['  Information Overload']?.trim()),
        inadequate_excessive_engagement: parseInteger(cleanRecord['Inadequate/Excessive Engagement']?.trim() || cleanRecord['  Inadequate/Excessive Engagement']?.trim()),
        missing_minimal_information: parseInteger(cleanRecord['Missing Minimal Information']?.trim() || cleanRecord['  Missing Minimal Information']?.trim()),
        
        // Feedback fields
        feedback_error_leading_to_a_loss_of_business: cleanRecord['Feedback -   Error Leading to a Loss of Business'] || null,
        feedback_zero_tolerance: cleanRecord['Feedback -   Zero Tolerance'] || null,
        feedback_incorrect_information: cleanRecord['Feedback -   Incorrect Information'] || null,
        feedback_lack_of_professionalism: cleanRecord['Feedback -   Lack of Professionalism'] || null,
        feedback_lack_of_escalation_unnecessary_escalation: cleanRecord['Feedback -   Lack of Escalation/Unnecessary Escalation'] || null,
        feedback_lack_of_investigation: cleanRecord['Feedback -   Lack of Investigation'] || null,
        feedback_lack_of_empathy: cleanRecord['Feedback -   Lack of Empathy'] || null,
        feedback_lack_of_knowledge: cleanRecord['Feedback -   Lack of Knowledge'] || null,
        feedback_lack_of_information_about_internal_communications: cleanRecord['Feedback -   Lack of Information about Internal Communications'] || null,
        feedback_missing_information: cleanRecord['Feedback -   Missing Information'] || null,
        feedback_outdated_macro_usage: cleanRecord['Feedback -   Outdated Macro Usage'] || null,
        feedback_grammatical_errors: cleanRecord['Feedback -   Grammatical Errors'] || null,
        feedback_information_overload: cleanRecord['Feedback -   Information Overload'] || null,
        feedback_inadequate_excessive_engagement: cleanRecord['Feedback -   Inadequate/Excessive Engagement'] || null,
        feedback_missing_minimal_information: cleanRecord['Feedback -   Missing Minimal Information'] || null
    };
    
    return dbRecord;
}

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '' || dateStr.toLowerCase() === 'n/a') return null;
    try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0]; // Return just the date part
    } catch (e) {
        return null;
    }
}

/**
 * Parse datetime string to ISO format
 */
function parseDateTime(dateTimeStr) {
    if (!dateTimeStr || dateTimeStr.trim() === '' || dateTimeStr.toLowerCase() === 'n/a') return null;
    try {
        const date = new Date(dateTimeStr);
        return isNaN(date.getTime()) ? null : date.toISOString();
    } catch (e) {
        return null;
    }
}

/**
 * Parse integer value
 */
function parseInteger(value) {
    if (!value || value.toString().trim() === '' || value.toString().toLowerCase() === 'n/a') return 0;
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse boolean value
 */
function parseBoolean(value) {
    if (!value || value.toString().trim() === '' || value.toString().toLowerCase() === 'n/a') return null;
    const lowerValue = value.toString().toLowerCase().trim();
    if (lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1') return true;
    if (lowerValue === 'false' || lowerValue === 'no' || lowerValue === '0') return false;
    return null;
}

/**
 * Upload records to Supabase in batches
 */
async function uploadRecords(records) {
    const BATCH_SIZE = 100; // Upload 100 records at a time
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);
    
    console.log(`\nUploading ${records.length} records in ${totalBatches} batches...`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, records.length);
        const batch = records.slice(start, end);
        
        console.log(`\nProcessing batch ${i + 1}/${totalBatches} (records ${start + 1}-${end})...`);
        
        try {
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .insert(batch);
            
            if (error) {
                console.error(`❌ Batch ${i + 1} failed:`, error.message);
                errorCount += batch.length;
                errors.push({ batch: i + 1, error: error.message, records: batch.length });
            } else {
                console.log(`✅ Batch ${i + 1} uploaded successfully`);
                successCount += batch.length;
            }
        } catch (e) {
            console.error(`❌ Batch ${i + 1} exception:`, e.message);
            errorCount += batch.length;
            errors.push({ batch: i + 1, error: e.message, records: batch.length });
        }
        
        // Add a small delay between batches to avoid rate limiting
        if (i < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('UPLOAD SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully uploaded: ${successCount} records`);
    console.log(`❌ Failed to upload: ${errorCount} records`);
    
    if (errors.length > 0) {
        console.log('\nERRORS:');
        errors.forEach(err => {
            console.log(`  - Batch ${err.batch}: ${err.error} (${err.records} records)`);
        });
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('='.repeat(60));
    console.log('CSV UPLOAD SCRIPT FOR FN CHAT CFD');
    console.log('='.repeat(60));
    
    // Check if CSV file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error(`❌ CSV file not found: ${CSV_FILE_PATH}`);
        console.log('\nPlease update the CSV_FILE_PATH in this script to point to your CSV file.');
        process.exit(1);
    }
    
    // Check Supabase configuration
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_KEY === 'YOUR_SUPABASE_KEY') {
        console.error('❌ Supabase credentials not configured');
        console.log('\nPlease set the following environment variables:');
        console.log('  - VITE_SUPABASE_URL');
        console.log('  - VITE_SUPABASE_ANON_KEY');
        console.log('\nOr update the script with your Supabase credentials.');
        process.exit(1);
    }
    
    try {
        // Parse CSV
        console.log(`\nReading CSV file: ${CSV_FILE_PATH}`);
        const { records } = parseCSV(CSV_FILE_PATH);
        
        if (records.length === 0) {
            console.error('❌ No records found in CSV file');
            process.exit(1);
        }
        
        // Transform records
        console.log('\nTransforming records...');
        const transformedRecords = records.map((record, index) => transformRecord(record, index));
        console.log(`✅ Transformed ${transformedRecords.length} records`);
        
        // Show sample record
        console.log('\nSample transformed record:');
        console.log(JSON.stringify(transformedRecords[0], null, 2));
        
        // Ask for confirmation (comment this out for automatic upload)
        console.log('\n⚠️  Ready to upload to Supabase table:', TABLE_NAME);
        console.log('Press Ctrl+C to cancel, or uncomment the upload line to proceed...');
        
        // Uncomment the line below to actually upload the data
        // await uploadRecords(transformedRecords);
        
        console.log('\n✅ Script completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the script
main();

