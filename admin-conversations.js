/**
 * Admin Conversations Management
 * Displays conversations for a specific admin within a date range
 */

// Get Supabase configuration
const supabaseUrl = window.SupabaseConfig?.url || '';
const supabaseAnonKey = window.SupabaseConfig?.anonKey || '';

// Get admin info from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const adminId = urlParams.get('admin_id');
const adminName = urlParams.get('admin_name') || 'Unknown Admin';

// DOM Elements
let loadingState, errorState, errorMessage, conversationsContainer, conversationsTableBody, conversationCount;
let startDateInput, endDateInput, applyFilterBtn, resetFilterBtn, adminInfo;
let startDateDisplay, endDateDisplay;
let pagination, paginationStart, paginationEnd, paginationTotal, paginationPrev, paginationNext, paginationPages;
let loadingProgress;

// Current date range
let currentStartDate = null;
let currentEndDate = null;

// Pagination state
let allConversations = [];
let currentPage = 1;
const itemsPerPage = 20;
let isLoadingMore = false;
let totalExpectedPages = 0;

/**
 * Initialize DOM elements
 */
function initializeDOMElements() {
    loadingState = document.getElementById('loadingState');
    errorState = document.getElementById('errorState');
    errorMessage = document.getElementById('errorMessage');
    conversationsContainer = document.getElementById('conversationsContainer');
    conversationsTableBody = document.getElementById('conversationsTableBody');
    conversationCount = document.getElementById('conversationCount');
    startDateInput = document.getElementById('startDate');
    endDateInput = document.getElementById('endDate');
    applyFilterBtn = document.getElementById('applyFilterBtn');
    resetFilterBtn = document.getElementById('resetFilterBtn');
    adminInfo = document.getElementById('adminInfo');
    startDateDisplay = document.getElementById('startDateDisplay');
    endDateDisplay = document.getElementById('endDateDisplay');
    pagination = document.getElementById('pagination');
    paginationStart = document.getElementById('paginationStart');
    paginationEnd = document.getElementById('paginationEnd');
    paginationTotal = document.getElementById('paginationTotal');
    paginationPrev = document.getElementById('paginationPrev');
    paginationNext = document.getElementById('paginationNext');
    paginationPages = document.getElementById('paginationPages');
    loadingProgress = document.getElementById('loadingProgress');
}

/**
 * Format date for API (YYYY-MM-DD HH:MM:SS)
 */
function formatDateForAPI(dateStr) {
    // dateStr is in YYYY-MM-DD format from input
    return `${dateStr} 00:00:00`;
}

/**
 * Format date for API end date (YYYY-MM-DD HH:MM:SS)
 */
function formatEndDateForAPI(dateStr) {
    // dateStr is in YYYY-MM-DD format from input
    return `${dateStr} 23:59:59`;
}

/**
 * Format date for display (DD/MM/YYYY)
 */
function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';
    // dateStr is in YYYY-MM-DD format
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

/**
 * Set default date range (5 days from current date)
 */
function setDefaultDateRange() {
    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 5);

    // Format dates as YYYY-MM-DD for input
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    currentStartDate = formatDate(startDate);
    currentEndDate = formatDate(endDate);

    startDateInput.value = currentStartDate;
    endDateInput.value = currentEndDate;
    
    // Update display
    updateDateDisplays();
}

/**
 * Update date displays
 */
function updateDateDisplays() {
    if (startDateDisplay && startDateInput.value) {
        startDateDisplay.textContent = `(${formatDateForDisplay(startDateInput.value)})`;
    }
    if (endDateDisplay && endDateInput.value) {
        endDateDisplay.textContent = `(${formatDateForDisplay(endDateInput.value)})`;
    }
}

/**
 * Fetch conversations page by page and update UI progressively
 */
async function fetchConversationsProgressively(adminId, updatedSince, updatedBefore) {
    let startingAfter = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 100; // Safety limit to prevent infinite loops
    isLoadingMore = true;

    // Fetch first page immediately
    while (hasMore && pageCount < maxPages) {
        pageCount++;
        let edgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-proxy?endpoint=conversations&admin_id=${encodeURIComponent(adminId)}&updated_since=${encodeURIComponent(updatedSince)}&updated_before=${encodeURIComponent(updatedBefore)}`;
        
        // Add pagination parameter if we have a cursor
        if (startingAfter) {
            edgeFunctionUrl += `&starting_after=${encodeURIComponent(startingAfter)}`;
        }

        console.log(`Fetching page ${pageCount}...`);
        
        // Update loading progress
        if (loadingProgress) {
            const currentTotal = allConversations.length;
            const currentPages = Math.ceil(currentTotal / itemsPerPage);
            loadingProgress.textContent = `Loading... Page ${pageCount} (${currentTotal} conversations, ${currentPages} page${currentPages !== 1 ? 's' : ''} ready)`;
        }

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
        
        // Extract conversations from response
        let pageConversations = [];
        if (data && Array.isArray(data.conversations)) {
            pageConversations = data.conversations;
        } else if (data && data.type === 'conversation.list' && Array.isArray(data.conversations)) {
            pageConversations = data.conversations;
        } else if (data && data.conversations && Array.isArray(data.conversations)) {
            pageConversations = data.conversations;
        }

        // Add to all conversations
        if (pageConversations.length > 0) {
            allConversations = allConversations.concat(pageConversations);
            console.log(`Page ${pageCount}: Fetched ${pageConversations.length} conversations (Total so far: ${allConversations.length})`);
            
            // Log first conversation structure for debugging (only on first page)
            if (pageCount === 1 && pageConversations.length > 0) {
                console.log('═══════════════════════════════════════════════════════');
                console.log('📋 CONVERSATION OBJECT STRUCTURE (First conversation):');
                console.log('═══════════════════════════════════════════════════════');
                console.log(JSON.stringify(pageConversations[0], null, 2));
                console.log('═══════════════════════════════════════════════════════');
                console.log('📋 Available fields in conversation:');
                console.log('═══════════════════════════════════════════════════════');
                const firstConv = pageConversations[0];
                console.log('Top-level fields:', Object.keys(firstConv));
                if (firstConv.source) {
                    console.log('source fields:', Object.keys(firstConv.source));
                    if (firstConv.source.author) {
                        console.log('source.author fields:', Object.keys(firstConv.source.author));
                    }
                }
                if (firstConv.contacts) {
                    console.log('contacts structure:', firstConv.contacts);
                }
                if (firstConv.conversation_rating) {
                    console.log('conversation_rating:', firstConv.conversation_rating);
                }
                if (firstConv.conversation_parts) {
                    console.log('conversation_parts type:', firstConv.conversation_parts.type);
                    if (firstConv.conversation_parts.conversation_parts) {
                        console.log('conversation_parts count:', firstConv.conversation_parts.conversation_parts.length);
                    }
                }
                console.log('═══════════════════════════════════════════════════════');
            }
            
            // Update total count
            conversationCount.textContent = allConversations.length;
            
            // If this is the first page, hide loading and show results immediately
            if (pageCount === 1) {
                loadingState.style.display = 'none';
                conversationsContainer.style.display = 'block';
                displayConversations();
            } else {
                // For subsequent pages, just update the display if we're on a page that's now available
                displayConversations();
            }
        }

        // Check if there are more pages
        hasMore = false;
        startingAfter = null;

        if (data.pages) {
            const pages = data.pages;
            
            if (pages.next) {
                const next = pages.next;
                
                if (typeof next === 'string') {
                    try {
                        if (next.includes('?')) {
                            const urlParts = next.split('?');
                            const urlParams = new URLSearchParams(urlParts[1]);
                            startingAfter = urlParams.get('starting_after');
                        } else {
                            startingAfter = next;
                        }
                    } catch (e) {
                        console.warn('Error parsing next URL:', e);
                        startingAfter = null;
                    }
                } else if (next && typeof next === 'object') {
                    startingAfter = next.starting_after || next.cursor || null;
                }
                
                hasMore = !!startingAfter;
            }
        }

        // If we got no conversations, we're done
        if (pageConversations.length === 0) {
            hasMore = false;
            break;
        }

        // If we didn't get a starting_after value, we're done
        if (!startingAfter) {
            hasMore = false;
        }
    }

    isLoadingMore = false;
    if (loadingProgress) {
        loadingProgress.textContent = `✅ All conversations loaded (${allConversations.length} total)`;
        setTimeout(() => {
            if (loadingProgress) {
                loadingProgress.textContent = '';
            }
        }, 3000);
    }
    
    console.log(`✅ Finished fetching all conversations. Total: ${allConversations.length} across ${pageCount} page(s)`);
    displayConversations(); // Final update
}

/**
 * Load conversations for the admin in the date range
 */
async function loadConversations() {
    if (!adminId) {
        showError('Admin ID is missing from URL parameters.');
        return;
    }

    // Show loading state
    loadingState.style.display = 'block';
    errorState.style.display = 'none';
    conversationsContainer.style.display = 'none';

    // Get date range from inputs
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        showError('Please select both start and end dates.');
        loadingState.style.display = 'none';
        return;
    }

    currentStartDate = startDate;
    currentEndDate = endDate;

    try {
        // Format dates for API (YYYY-MM-DD HH:MM:SS)
        const updatedSince = formatDateForAPI(startDate);
        const updatedBefore = formatEndDateForAPI(endDate);

        console.log('═══════════════════════════════════════════════════════');
        console.log('🚀 FETCHING CONVERSATIONS (Progressive Loading)');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Admin ID:', adminId);
        console.log('Date Range (Display):', formatDateForDisplay(startDate), 'to', formatDateForDisplay(endDate));
        console.log('Date Range (API):', updatedSince, 'to', updatedBefore);

        // Reset state
        allConversations = [];
        currentPage = 1;
        
        // Start fetching conversations progressively (shows first 20 immediately)
        await fetchConversationsProgressively(adminId, updatedSince, updatedBefore);

    } catch (error) {
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌ ERROR FETCHING CONVERSATIONS');
        console.error('═══════════════════════════════════════════════════════');
        console.error('Error:', error);
        showError(error.message || 'Failed to fetch conversations.');
    } finally {
        loadingState.style.display = 'none';
    }
}

/**
 * Extract client name from conversation
 */
function extractClientName(conversation) {
    // Try source.author.name
    if (conversation.source?.author?.name) {
        return conversation.source.author.name;
    }
    // Try contacts
    if (conversation.contacts?.contacts && conversation.contacts.contacts.length > 0) {
        const contact = conversation.contacts.contacts[0];
        if (contact.name) {
            return contact.name;
        }
    }
    // Try source.contacts
    if (conversation.source?.contacts?.contacts && conversation.source.contacts.contacts.length > 0) {
        const contact = conversation.source.contacts.contacts[0];
        if (contact.name) {
            return contact.name;
        }
    }
    // Try conversation parts
    if (conversation.conversation_parts?.conversation_parts) {
        for (const part of conversation.conversation_parts.conversation_parts) {
            if (part.author && (part.author.type === 'user' || part.author.type === 'contact')) {
                if (part.author.name) {
                    return part.author.name;
                }
            }
        }
    }
    return 'Unknown';
}

/**
 * Extract client email from conversation
 */
function extractClientEmail(conversation) {
    // Try source.author.email
    if (conversation.source?.author?.email) {
        return conversation.source.author.email;
    }
    // Try contacts
    if (conversation.contacts?.contacts && conversation.contacts.contacts.length > 0) {
        const contact = conversation.contacts.contacts[0];
        if (contact.email) {
            return contact.email;
        }
    }
    // Try source.contacts
    if (conversation.source?.contacts?.contacts && conversation.source.contacts.contacts.length > 0) {
        const contact = conversation.source.contacts.contacts[0];
        if (contact.email) {
            return contact.email;
        }
    }
    return '';
}

/**
 * Format date for display (DD/MM/YYYY HH:MM)
 */
function formatDateForDisplay(timestamp) {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'number' 
        ? new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp)
        : new Date(timestamp);
    if (isNaN(date.getTime())) return 'N/A';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Get rating from conversation and return as number (1-5) or null
 */
function getConversationRating(conversation) {
    if (conversation.conversation_rating?.rating) {
        const rating = parseInt(conversation.conversation_rating.rating, 10);
        if (!isNaN(rating) && rating >= 1 && rating <= 5) {
            return rating;
        }
    }
    return null;
}

/**
 * Generate star rating HTML
 */
function generateStarRating(rating) {
    const maxStars = 5;
    const filledStars = rating || 0;
    const emptyStars = maxStars - filledStars;
    
    let starsHtml = '<div class="rating-stars">';
    
    // Filled stars
    for (let i = 0; i < filledStars; i++) {
        starsHtml += `
            <svg aria-hidden="true" class="rating-star" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        `;
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += `
            <svg aria-hidden="true" class="rating-star rating-star-empty" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        `;
    }
    
    starsHtml += '</div>';
    
    // Add rating number if rating exists
    if (rating) {
        starsHtml += `<span class="ml-1 text-sm text-gray-500">${rating}.0</span>`;
    }
    
    return starsHtml;
}

/**
 * Display conversations in the table with pagination
 */
function displayConversations() {
    conversationsTableBody.innerHTML = '';

    if (allConversations.length === 0) {
        document.getElementById('noResults').style.display = 'block';
        conversationsContainer.style.display = 'block';
        pagination.style.display = 'none';
        return;
    }

    document.getElementById('noResults').style.display = 'none';

    // Calculate pagination
    const totalPages = Math.ceil(allConversations.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, allConversations.length);
    const pageConversations = allConversations.slice(startIndex, endIndex);

    // Update pagination info
    paginationStart.textContent = allConversations.length > 0 ? startIndex + 1 : 0;
    paginationEnd.textContent = endIndex;
    paginationTotal.textContent = allConversations.length;
    
    // Show loading indicator in pagination info if still loading
    if (isLoadingMore && paginationTotal) {
        paginationTotal.textContent = `${allConversations.length}+`;
    }

    // Display conversations for current page
    pageConversations.forEach(conversation => {
        const row = document.createElement('tr');
        
        // Extract client information
        const clientName = extractClientName(conversation);
        const clientEmail = extractClientEmail(conversation);
        
        // Format dates
        const createdDate = formatDateForDisplay(conversation.created_at || conversation.created_at_time);
        const updatedDate = formatDateForDisplay(conversation.updated_at);
        
        // Get subject/preview
        const subject = conversation.source?.subject || 
                       conversation.conversation_parts?.[0]?.body?.substring(0, 100) || 
                       'No subject';
        const subjectDisplay = subject.length > 100 ? subject.substring(0, 100) + '...' : subject;
        
        // Get conversation state
        const state = conversation.state || 'unknown';
        const stateBadge = state === 'open' 
            ? '<span class="badge badge-warning">Open</span>'
            : state === 'closed'
            ? '<span class="badge badge-success">Closed</span>'
            : '<span class="badge badge-danger">' + escapeHtml(state) + '</span>';

        // Get rating
        const rating = getConversationRating(conversation);
        const ratingHtml = generateStarRating(rating);

        row.innerHTML = `
            <td class="w-4">
                <div class="flex items-center">
                    <input type="checkbox" onclick="event.stopPropagation()" class="w-4 h-4 bg-gray-100 border-gray-300 rounded text-primary-600 focus:ring-primary-500 focus:ring-2">
                    <label class="sr-only">Select conversation</label>
                </div>
            </td>
            <td>
                <div class="client-name">${escapeHtml(clientName)}</div>
                ${clientEmail ? `<div class="client-email">${escapeHtml(clientEmail)}</div>` : ''}
            </td>
            <td>
                <div class="conversation-id-container">
                    <div class="conversation-id">${conversation.id || 'N/A'}</div>
                    <button 
                        class="copy-button" 
                        onclick="event.stopPropagation(); copyConversationId('${conversation.id || ''}', this);"
                        title="Copy conversation ID"
                    >
                        <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                    </button>
                </div>
            </td>
            <td>
                <div class="conversation-subject" title="${escapeHtml(subject)}">${escapeHtml(subjectDisplay)}</div>
            </td>
            <td>${ratingHtml}</td>
            <td>${stateBadge}</td>
            <td>${createdDate}</td>
            <td>${updatedDate}</td>
            <td>
                <button 
                    onclick="event.stopPropagation(); window.open('audit-view.html?conversation_id=${conversation.id}', '_blank');"
                    class="px-2 py-0.5 text-xs font-medium text-primary-700 bg-primary-50 rounded hover:bg-primary-100 transition-colors whitespace-nowrap"
                >
                    Audit
                </button>
            </td>
        `;

        // Make row clickable to view full conversation
        row.addEventListener('click', () => {
            window.open(`audit-view.html?conversation_id=${conversation.id}`, '_blank');
        });

        conversationsTableBody.appendChild(row);
    });

    // Update pagination controls
    if (pagination && paginationPages) {
        updatePaginationControls(totalPages);
        pagination.style.display = 'flex';
    }

    conversationsContainer.style.display = 'block';
}

/**
 * Update pagination controls
 */
function updatePaginationControls(totalPages) {
    if (!paginationPages || !paginationPrev || !paginationNext) {
        console.error('Pagination elements not found');
        return;
    }

    // Clear existing page buttons
    paginationPages.innerHTML = '';

    // Previous button
    if (paginationPrev) {
        paginationPrev.disabled = currentPage === 1;
    }

    // Next button - disable if on last available page or if still loading and we're at the edge
    if (paginationNext) {
        const lastAvailablePage = Math.ceil(allConversations.length / itemsPerPage);
        paginationNext.disabled = (currentPage >= totalPages && !isLoadingMore) || totalPages === 0;
        
        // Show loading indicator if we're on the last page and still loading
        if (currentPage >= lastAvailablePage && isLoadingMore) {
            paginationNext.disabled = false;
            paginationNext.innerHTML = `
                <svg aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
                <span class="ml-1">Loading...</span>
            `;
        } else {
            paginationNext.innerHTML = `
                <svg aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
            `;
        }
    }

    // Calculate available pages
    const lastAvailablePage = Math.ceil(allConversations.length / itemsPerPage);
    
    // Show all available pages, and if still loading, show a few more with loading indicators
    const pagesToShow = isLoadingMore ? Math.max(totalPages, lastAvailablePage + 2) : totalPages;
    
    // Generate page numbers - show all available pages
    for (let i = 1; i <= pagesToShow; i++) {
        const pageBtn = document.createElement('button');
        const pageNum = i; // Capture in closure
        const isPageReady = pageNum <= lastAvailablePage;
        const isCurrentlyLoading = isLoadingMore && pageNum > lastAvailablePage && pageNum <= totalPages;
        
        pageBtn.className = `pagination-button ${i === currentPage ? 'active' : ''} ${!isPageReady ? 'opacity-50' : ''}`;
        pageBtn.textContent = i;
        pageBtn.type = 'button';
        pageBtn.disabled = !isPageReady;
        
        // Add loading indicator for pages that are being loaded
        if (isCurrentlyLoading) {
            pageBtn.title = 'Loading...';
            pageBtn.textContent = `${i} ⏳`;
        } else if (!isPageReady) {
            pageBtn.title = 'Page not ready yet';
        }
        
        if (isPageReady) {
            pageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.goToPage(pageNum);
            });
        }
        
        paginationPages.appendChild(pageBtn);
    }
}

/**
 * Navigate to a specific page
 * Made globally accessible for onclick handlers
 */
window.goToPage = function(page) {
    const totalPages = Math.ceil(allConversations.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayConversations();
    
    // Scroll to top of table
    if (conversationsContainer) {
        conversationsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

/**
 * Copy conversation ID to clipboard
 * Made globally accessible for inline onclick handlers
 */
window.copyConversationId = function(conversationId, buttonElement) {
    if (!conversationId || conversationId === 'N/A') {
        return;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(conversationId).then(() => {
        // Visual feedback
        const originalHTML = buttonElement.innerHTML;
        buttonElement.classList.add('copy-success');
        buttonElement.innerHTML = `
            <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
        `;
        buttonElement.title = 'Copied!';

        // Reset after 2 seconds
        setTimeout(() => {
            buttonElement.classList.remove('copy-success');
            buttonElement.innerHTML = originalHTML;
            buttonElement.title = 'Copy conversation ID';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy conversation ID:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = conversationId;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            // Visual feedback
            const originalHTML = buttonElement.innerHTML;
            buttonElement.classList.add('copy-success');
            buttonElement.innerHTML = `
                <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            `;
            buttonElement.title = 'Copied!';
            setTimeout(() => {
                buttonElement.classList.remove('copy-success');
                buttonElement.innerHTML = originalHTML;
                buttonElement.title = 'Copy conversation ID';
            }, 2000);
        } catch (fallbackErr) {
            console.error('Fallback copy failed:', fallbackErr);
        }
        document.body.removeChild(textArea);
    });
}

/**
 * Show error message
 */
function showError(message) {
    errorMessage.textContent = message;
    errorState.style.display = 'block';
    loadingState.style.display = 'none';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    
    // Set admin info
    adminInfo.textContent = `Viewing conversations for: ${escapeHtml(adminName)} (ID: ${adminId})`;
    
    // Set default date range
    setDefaultDateRange();
    
    // Add event listeners
    applyFilterBtn.addEventListener('click', loadConversations);
    resetFilterBtn.addEventListener('click', () => {
        setDefaultDateRange();
        loadConversations();
    });
    
    // Update displays when dates change
    startDateInput.addEventListener('change', updateDateDisplays);
    endDateInput.addEventListener('change', updateDateDisplays);
    
    // Select all checkbox functionality
    const selectAllCheckbox = document.getElementById('checkbox-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = conversationsTableBody.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        });
    }
    
    // Pagination button handlers
    if (paginationPrev) {
        paginationPrev.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentPage > 1) {
                window.goToPage(currentPage - 1);
            }
        });
    }
    
    if (paginationNext) {
        paginationNext.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const totalPages = Math.ceil(allConversations.length / itemsPerPage);
            if (currentPage < totalPages) {
                window.goToPage(currentPage + 1);
            }
        });
    }
    
    // Load conversations on page load
    loadConversations();
});

