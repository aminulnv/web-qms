/**
 * Intercom Admin Report
 * Handles fetching and displaying Intercom administrators
 * Uses Supabase Edge Function to avoid CORS issues
 */

// Get Supabase configuration
const supabaseUrl = window.SupabaseConfig?.url || '';
const supabaseAnonKey = window.SupabaseConfig?.anonKey || '';

// DOM Elements
let loadingState, errorState, errorMessage, adminsContainer, adminsGrid, adminCount, totalAdminCount, searchInput, noResults;

// Team ID to Team Name mapping
let teamNameMap = {};

// Store all admins for filtering
let allAdmins = [];

/**
 * Initialize DOM elements
 */
function initializeDOMElements() {
    loadingState = document.getElementById('loadingState');
    errorState = document.getElementById('errorState');
    errorMessage = document.getElementById('errorMessage');
    adminsContainer = document.getElementById('adminsContainer');
    adminsGrid = document.getElementById('adminsGrid');
    adminCount = document.getElementById('adminCount');
    totalAdminCount = document.getElementById('totalAdminCount');
    searchInput = document.getElementById('searchInput');
    noResults = document.getElementById('noResults');
}

/**
 * Fetch admins from Intercom API via Supabase Edge Function (to avoid CORS)
 */
async function loadAdmins() {
    // Show loading state
    loadingState.style.display = 'block';
    errorState.style.display = 'none';
    adminsContainer.style.display = 'none';

    // Validate Supabase configuration
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 VALIDATING CONFIGURATION');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Supabase Configuration:');
    console.log('  SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ MISSING');
    console.log('  SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ MISSING');
    console.log('───────────────────────────────────────────────────────');
    console.log('Environment Sources:');
    console.log('  window.SupabaseConfig:', typeof window.SupabaseConfig !== 'undefined' ? '✅ Available' : '❌ Not available');
    
    if (typeof window.SupabaseConfig !== 'undefined') {
        console.log('  window.SupabaseConfig.url:', window.SupabaseConfig.url || '❌ Not set');
        console.log('  window.SupabaseConfig.anonKey:', window.SupabaseConfig.anonKey ? '✅ Set' : '❌ Not set');
    }
    console.log('═══════════════════════════════════════════════════════');

    if (!supabaseUrl) {
        const urlError = 'Missing SUPABASE_URL. Please check your environment variables.';
        console.error('❌ CONFIGURATION VALIDATION FAILED');
        console.error('Missing Supabase URL');
        showError(urlError);
        loadingState.style.display = 'none';
        return;
    }

    if (!supabaseAnonKey) {
        const keyError = 'Missing SUPABASE_ANON_KEY. Please check your environment variables.';
        console.error('❌ CONFIGURATION VALIDATION FAILED');
        console.error('Missing Supabase anonymous key');
        showError(keyError);
        loadingState.style.display = 'none';
        return;
    }
    
    console.log('✅ Configuration validated successfully');

    try {
        console.log('═══════════════════════════════════════════════════════');
        console.log('🚀 STARTING DATA FETCH');
        console.log('═══════════════════════════════════════════════════════');
        
        // First, fetch teams to create ID to name mapping
        console.log('Step 1: Fetching teams from Intercom API...');
        const teamsEdgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-proxy?endpoint=teams`;
        
        const teamsResponse = await fetch(teamsEdgeFunctionUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'apikey': supabaseAnonKey,
                'Accept': 'application/json'
            }
        });

        if (!teamsResponse.ok) {
            const errorData = await teamsResponse.json().catch(() => ({}));
            const errorMsg = errorData.error || `HTTP ${teamsResponse.status}: ${teamsResponse.statusText}`;
            console.warn('⚠️ Warning: Failed to fetch teams:', errorMsg);
            console.warn('Continuing without team names - will display team IDs instead');
            teamNameMap = {}; // Use empty map if teams fetch fails
        } else {
            const teamsData = await teamsResponse.json();
            console.log('✅ Successfully fetched teams');
            console.log('Teams response type:', teamsData?.type);
            console.log('Teams array length:', teamsData?.teams?.length || 0);
            
            // Create team ID to name mapping
            if (teamsData && teamsData.type === 'team.list' && Array.isArray(teamsData.teams)) {
                teamNameMap = {};
                teamsData.teams.forEach(team => {
                    if (team.id && team.name) {
                        teamNameMap[team.id] = team.name;
                    }
                });
                console.log(`Created mapping for ${Object.keys(teamNameMap).length} teams`);
            } else {
                console.warn('⚠️ Warning: Invalid teams response format, using empty mapping');
                teamNameMap = {};
            }
        }
        
        // Now fetch admins
        console.log('Step 2: Fetching admins from Intercom API...');
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-proxy?endpoint=admins`;
        
        console.log('───────────────────────────────────────────────────────');
        console.log('📍 API CALL DETAILS:');
        console.log('  Method: GET');
        console.log('  Edge Function URL:', edgeFunctionUrl);
        console.log('  Endpoint Parameter: endpoint=admins');
        console.log('───────────────────────────────────────────────────────');

        // Fetch admins from Intercom API via Supabase Edge Function
        const response = await fetch(edgeFunctionUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'apikey': supabaseAnonKey,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
            console.error('❌ Error response from edge function:', errorMsg);
            throw new Error(errorMsg);
        }

        const data = await response.json();

        console.log('✅ Successfully received response');
        console.log('Response status:', response.status);
        console.log('Response data type:', data?.type);
        console.log('Admins array length:', data?.admins?.length || 0);
        
        // Validate response structure
        if (data && data.type === 'admin.list' && Array.isArray(data.admins)) {
            console.log(`Fetched ${data.admins.length} admins`);
            allAdmins = data.admins;
            totalAdminCount.textContent = allAdmins.length;
            displayAdmins(allAdmins);
        } else {
            console.error('Invalid response format:', data);
            throw new Error('Invalid response format. Expected { type: "admin.list", admins: [...] }');
        }

    } catch (error) {
        // Comprehensive error logging
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌ ERROR FETCHING ADMINS FROM INTERCOM API');
        console.error('═══════════════════════════════════════════════════════');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        console.error('Error Type:', typeof error);
        
        if (error.stack) {
            console.error('Error Stack Trace:');
            console.error(error.stack);
        }
        
        // Log configuration state
        console.error('───────────────────────────────────────────────────────');
        console.error('Configuration State:');
        console.error('  Supabase URL:', supabaseUrl ? '✅ Set' : '❌ MISSING');
        console.error('  Supabase Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ MISSING');
        console.error('  Edge Function URL:', `${supabaseUrl}/functions/v1/intercom-proxy?endpoint=admins`);
        
        console.error('═══════════════════════════════════════════════════════');
        
        showError(error.message || 'Failed to fetch admins from Intercom API.');
    } finally {
        loadingState.style.display = 'none';
    }
}

/**
 * Handle search input
 */
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const filteredAdmins = filterAdminsByName(searchTerm);
    displayAdmins(filteredAdmins);
}

/**
 * Filter admins by name or email
 */
function filterAdminsByName(searchTerm) {
    if (!searchTerm) {
        return allAdmins;
    }
    
    return allAdmins.filter(admin => {
        const name = (admin.name || '').toLowerCase();
        const email = (admin.email || '').toLowerCase();
        return name.includes(searchTerm) || email.includes(searchTerm);
    });
}

/**
 * Display admins in grid cards
 */
function displayAdmins(admins) {
    adminCount.textContent = admins.length;
    adminsGrid.innerHTML = '';

    if (admins.length === 0) {
        noResults.style.display = 'block';
        adminsContainer.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    admins.forEach(admin => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        
        const teamIds = admin.team_ids || [];
        const primaryTeamIds = admin.team_priority_level?.primary_team_ids || [];
        const secondaryTeamIds = admin.team_priority_level?.secondary_team_ids || [];
        
        // Format team names display (using team ID to name mapping)
        let teamNamesHtml = '';
        if (teamIds.length > 0) {
            teamNamesHtml = '<div class="team-ids">';
            teamIds.forEach(teamId => {
                const isPrimary = primaryTeamIds.includes(teamId);
                const isSecondary = secondaryTeamIds.includes(teamId);
                
                // Determine chip class based on priority
                let chipClass = 'team-chip-default';
                if (isPrimary) chipClass = 'team-chip-primary';
                else if (isSecondary) chipClass = 'team-chip-secondary';
                
                // Use team name if available, otherwise fall back to team ID
                const teamDisplay = teamNameMap[teamId] || teamId;
                const displayText = teamNameMap[teamId] 
                    ? escapeHtml(teamDisplay)
                    : `${escapeHtml(teamDisplay)} (ID: ${teamId})`;
                
                teamNamesHtml += `<span class="team-chip ${chipClass}" title="Team ID: ${teamId}">${displayText}</span>`;
            });
            teamNamesHtml += '</div>';
        } else {
            teamNamesHtml = '<span class="text-gray-400" style="font-size: 0.75rem;">None</span>';
        }

        card.innerHTML = `
            <div class="admin-card-header">
                <div class="admin-card-name">${escapeHtml(admin.name || 'N/A')}</div>
                <div class="admin-card-email">${escapeHtml(admin.email || 'N/A')}</div>
                <div class="admin-card-id">ID: ${admin.id || 'N/A'}</div>
            </div>
            <div class="admin-card-body">
                <div class="admin-card-field">
                    <span class="admin-card-label">Job Title:</span>
                    <span class="admin-card-value">${escapeHtml(admin.job_title || '-')}</span>
                </div>
                <div class="admin-card-field">
                    <span class="admin-card-label">Inbox Seat:</span>
                    <span class="admin-card-value">
                        ${admin.has_inbox_seat 
                            ? '<span class="badge badge-success">Yes</span>' 
                            : '<span class="badge badge-danger">No</span>'}
                    </span>
                </div>
                <div class="admin-card-field">
                    <span class="admin-card-label">Away Mode:</span>
                    <span class="admin-card-value">
                        ${admin.away_mode_enabled 
                            ? `<span class="badge badge-warning">Enabled${admin.away_mode_reassign ? ' (Reassign)' : ''}</span>` 
                            : '<span class="badge badge-success">Disabled</span>'}
                    </span>
                </div>
                <div class="admin-card-field" style="flex-direction: column; align-items: flex-start; gap: 0.25rem; margin-top: 0.125rem;">
                    <span class="admin-card-label">Teams:</span>
                    <div style="width: 100%;">${teamNamesHtml}</div>
                </div>
            </div>
        `;

        // Make card clickable
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            window.location.href = `admin-conversations.html?admin_id=${admin.id}&admin_name=${encodeURIComponent(admin.name || '')}`;
        });

        adminsGrid.appendChild(card);
    });

    adminsContainer.style.display = 'block';
}

/**
 * Show error message with detailed information
 */
function showError(message, details = null) {
    let errorText = message;
    if (details) {
        errorText += `\n\nDetails: ${JSON.stringify(details, null, 2)}`;
    }
    errorMessage.textContent = errorText;
    errorMessage.style.whiteSpace = 'pre-wrap';
    errorState.style.display = 'block';
    console.error('Displayed error to user:', message, details);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    
    // Add search event listener
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    loadAdmins();
});

/**
 * Sync Intercom admins to Supabase cache table
 * Fetches all admins from Intercom API and upserts them into intercom_admin_cache table
 */
async function syncIntercomAdmins() {
    const syncButton = document.getElementById('syncAdminsBtn');
    const syncStatus = document.getElementById('syncStatus');
    
    if (!syncButton || !syncStatus) {
        console.error('Sync button or status element not found');
        return;
    }
    
    // Disable button and show loading state
    syncButton.disabled = true;
    syncButton.textContent = 'Syncing...';
    syncStatus.textContent = 'Syncing admins from Intercom...';
    syncStatus.style.display = 'block';
    syncStatus.className = 'text-blue-600';
    
    try {
        // Get Supabase client
        const supabaseClient = window.SupabaseConfig?.getClient?.();
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        // Fetch all admins from Intercom API via Supabase Edge Function
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-proxy?endpoint=admins`;
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('🔄 SYNCING INTERCOM ADMINS TO SUPABASE CACHE');
        console.log('═══════════════════════════════════════════════════════');
        
        const response = await fetch(edgeFunctionUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'apikey': supabaseAnonKey,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
            throw new Error(errorMsg);
        }

        const data = await response.json();
        
        // Validate response structure
        if (!data || data.type !== 'admin.list' || !Array.isArray(data.admins)) {
            throw new Error('Invalid response format. Expected { type: "admin.list", admins: [...] }');
        }
        
        const admins = data.admins;
        console.log(`Fetched ${admins.length} admins from Intercom`);
        
        // Upsert each admin into Supabase cache table
        const now = new Date().toISOString();
        let successCount = 0;
        let errorCount = 0;
        
        for (const admin of admins) {
            try {
                // Extract id, email, name for direct columns
                const adminId = admin.id;
                const adminEmail = admin.email || '';
                const adminName = admin.name || '';
                
                if (!adminId) {
                    console.warn('Skipping admin without ID:', admin);
                    errorCount++;
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
                const { error: upsertError } = await supabaseClient
                    .from('intercom_admin_cache')
                    .upsert(cacheData, {
                        onConflict: 'id',
                        ignoreDuplicates: false
                    });
                
                if (upsertError) {
                    console.error(`Error upserting admin ${adminId}:`, upsertError);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (error) {
                console.error(`Error processing admin ${admin.id}:`, error);
                errorCount++;
            }
        }
        
        console.log(`✅ Sync completed: ${successCount} successful, ${errorCount} errors`);
        console.log('═══════════════════════════════════════════════════════');
        
        // Update UI
        if (errorCount === 0) {
            syncStatus.textContent = `✅ Successfully synced ${successCount} admins`;
            syncStatus.className = 'text-green-600';
        } else {
            syncStatus.textContent = `⚠️ Synced ${successCount} admins, ${errorCount} errors`;
            syncStatus.className = 'text-yellow-600';
        }
        
        // Reload admins from cache (optional - could also reload from Intercom)
        // For now, reload from Intercom to show fresh data
        setTimeout(() => {
            loadAdmins();
        }, 1000);
        
    } catch (error) {
        console.error('❌ ERROR SYNCING ADMINS');
        console.error('Error:', error);
        syncStatus.textContent = `❌ Sync failed: ${error.message}`;
        syncStatus.className = 'text-red-600';
    } finally {
        // Re-enable button
        syncButton.disabled = false;
        syncButton.textContent = 'Sync Admins';
        
        // Hide status after 5 seconds
        setTimeout(() => {
            if (syncStatus) {
                syncStatus.style.display = 'none';
            }
        }, 5000);
    }
}

// Make functions available globally
window.loadAdmins = loadAdmins;
window.syncIntercomAdmins = syncIntercomAdmins;
