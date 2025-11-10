/**
 * Admin Conversations Management
 * Displays conversations for a specific admin within a date range
 */

// Get Supabase configuration
const supabaseUrl = window.SupabaseConfig?.url || '';
const supabaseAnonKey = window.SupabaseConfig?.anonKey || '';

// ============================================================================
// Local Caching Utilities for Conversations (IndexedDB)
// ============================================================================

const CONVERSATION_CACHE_PREFIX = 'admin_conversations_cache_';
const CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours
const INDEXEDDB_DB_NAME = 'QMSConversationCache';
const INDEXEDDB_STORE_NAME = 'conversations';
const INDEXEDDB_VERSION = 1;

// Check if IndexedDB is available
const INDEXEDDB_AVAILABLE = typeof indexedDB !== 'undefined';

// Generate cache key from admin ID and date
function getConversationCacheKey(adminId, date) {
    // Normalize adminId to string to ensure consistency
    const normalizedAdminId = String(adminId || '').trim();
    // Normalize date to YYYY-MM-DD format
    let normalizedDate = '';
    if (date) {
        if (typeof date === 'string') {
            normalizedDate = date.trim();
            if (normalizedDate.includes('T')) {
                normalizedDate = normalizedDate.split('T')[0];
            }
        } else if (date instanceof Date) {
            normalizedDate = date.toISOString().split('T')[0];
        }
    }
    return `${normalizedAdminId}_${normalizedDate}`;
}

// Initialize IndexedDB database
function initConversationCacheDB() {
    return new Promise((resolve, reject) => {
        if (!INDEXEDDB_AVAILABLE) {
            console.warn('⚠️ IndexedDB not available, will use localStorage fallback');
            resolve(null);
            return;
        }

        const request = indexedDB.open(INDEXEDDB_DB_NAME, INDEXEDDB_VERSION);

        request.onerror = () => {
            console.error('❌ IndexedDB open error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            console.log('✅ IndexedDB database opened successfully');
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object store if it doesn't exist
            if (!db.objectStoreNames.contains(INDEXEDDB_STORE_NAME)) {
                const objectStore = db.createObjectStore(INDEXEDDB_STORE_NAME, { keyPath: 'cacheKey' });
                
                // Create indexes
                objectStore.createIndex('adminId', 'adminId', { unique: false });
                objectStore.createIndex('date', 'date', { unique: false });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                objectStore.createIndex('expiresAt', 'expiresAt', { unique: false });
                
                console.log('✅ IndexedDB object store and indexes created');
            }
        };
    });
}

// Get database instance (with initialization)
let dbInstance = null;
async function getConversationCacheDB() {
    if (!INDEXEDDB_AVAILABLE) {
        return null;
    }
    
    if (dbInstance) {
        return dbInstance;
    }
    
    try {
        dbInstance = await initConversationCacheDB();
        return dbInstance;
    } catch (error) {
        console.error('❌ Failed to initialize IndexedDB:', error);
        return null;
    }
}

// Get cached conversations from IndexedDB (with localStorage fallback)
async function getCachedConversations(adminId, date) {
    const cacheKey = getConversationCacheKey(adminId, date);
    console.log('🔍 Checking cache with key:', cacheKey, 'for adminId:', adminId, 'date:', date);
    
    // Try IndexedDB first
    const db = await getConversationCacheDB();
    if (db) {
        try {
            return new Promise((resolve) => {
                const transaction = db.transaction([INDEXEDDB_STORE_NAME], 'readonly');
                const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
                const request = store.get(cacheKey);
                
                request.onsuccess = () => {
                    const cachedData = request.result;
                    
                    if (!cachedData) {
                        console.log('📦 No cache found in IndexedDB for:', cacheKey);
                        resolve(null);
                        return;
                    }
                    
                    const now = Date.now();
                    
                    // Check if cache is expired
                    if (cachedData.expiresAt && now > cachedData.expiresAt) {
                        console.log('⏰ Cache expired for:', cacheKey, 'Expired at:', new Date(cachedData.expiresAt).toISOString());
                        deleteCachedConversation(cacheKey);
                        resolve(null);
                        return;
                    }
                    
                    // Validate cache data structure
                    if (!cachedData.data) {
                        console.warn('⚠️ Cache data structure invalid, missing data field:', cacheKey);
                        deleteCachedConversation(cacheKey);
                        resolve(null);
                        return;
                    }
                    
                    const conversationCount = cachedData.data.conversations?.length || 0;
                    console.log('✅ Cache hit in IndexedDB for:', cacheKey, `(${conversationCount} conversations)`, 'Cached at:', new Date(cachedData.timestamp).toISOString());
                    resolve(cachedData.data);
                };
                
                request.onerror = () => {
                    console.warn('⚠️ Error reading from IndexedDB:', request.error);
                    resolve(null);
                };
            });
        } catch (error) {
            console.warn('⚠️ Error accessing IndexedDB:', error);
            // Fall through to localStorage fallback
        }
    }
    
    // Fallback to localStorage
    try {
        const localStorageKey = CONVERSATION_CACHE_PREFIX + cacheKey;
        const cachedData = localStorage.getItem(localStorageKey);
        
        if (!cachedData) {
            console.log('📦 No cache found in localStorage for:', localStorageKey);
            return null;
        }
        
        const parsed = JSON.parse(cachedData);
        const now = Date.now();
        
        // Check if cache is expired
        if (parsed.expiresAt && now > parsed.expiresAt) {
            console.log('⏰ Cache expired for:', localStorageKey, 'Expired at:', new Date(parsed.expiresAt).toISOString());
            localStorage.removeItem(localStorageKey);
            return null;
        }
        
        // Validate cache data structure
        if (!parsed.data) {
            console.warn('⚠️ Cache data structure invalid, missing data field:', localStorageKey);
            localStorage.removeItem(localStorageKey);
            return null;
        }
        
        const conversationCount = parsed.data.conversations?.length || 0;
        console.log('✅ Cache hit in localStorage for:', localStorageKey, `(${conversationCount} conversations)`, 'Cached at:', new Date(parsed.timestamp).toISOString());
        return parsed.data;
        
    } catch (error) {
        console.warn('⚠️ Error reading from localStorage:', error);
        return null;
    }
}

// Delete a cached conversation
async function deleteCachedConversation(cacheKey) {
    const db = await getConversationCacheDB();
    if (db) {
        try {
            const transaction = db.transaction([INDEXEDDB_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
            store.delete(cacheKey);
        } catch (error) {
            console.warn('⚠️ Error deleting from IndexedDB:', error);
        }
    }
    
    // Also try localStorage
    try {
        localStorage.removeItem(CONVERSATION_CACHE_PREFIX + cacheKey);
    } catch (error) {
        // Ignore
    }
}

// Store conversations in cache (IndexedDB with localStorage fallback)
async function cacheConversations(adminId, date, data) {
    // Validate inputs
    if (!adminId || !date || !data) {
        console.warn('⚠️ Cannot cache: missing required parameters', { adminId, date, hasData: !!data });
        return false;
    }
    
    const cacheKey = getConversationCacheKey(adminId, date);
    console.log('💾 Cache save attempt - Key:', cacheKey, 'AdminId:', adminId, 'Date:', date);
    
    const expiresAt = Date.now() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000); // 24 hours from now
    
    const cacheData = {
        cacheKey: cacheKey,
        adminId: String(adminId), // Normalize to string
        date: String(date), // Normalize to string
        data: data,
        timestamp: Date.now(),
        expiresAt: expiresAt,
        conversationCount: data.conversations?.length || 0
    };
    
    // Try IndexedDB first
    const db = await getConversationCacheDB();
    if (db) {
        try {
            return new Promise((resolve) => {
                const transaction = db.transaction([INDEXEDDB_STORE_NAME], 'readwrite');
                const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
                const request = store.put(cacheData);
                
                request.onsuccess = () => {
                    const sizeInMB = (JSON.stringify(cacheData).length / (1024 * 1024)).toFixed(2);
                    console.log('✅ Successfully cached conversations in IndexedDB for:', cacheKey, `(${cacheData.conversationCount} conversations, ${sizeInMB}MB)`, 'Expires:', new Date(expiresAt).toISOString());
                    resolve(true);
                };
                
                request.onerror = async () => {
                    console.warn('⚠️ Error saving to IndexedDB:', request.error);
                    // Fall through to localStorage fallback
                    const result = await cacheToLocalStorage(cacheKey, cacheData);
                    resolve(result);
                };
            });
        } catch (error) {
            console.warn('⚠️ Error accessing IndexedDB:', error);
            // Fall through to localStorage fallback
            return await cacheToLocalStorage(cacheKey, cacheData);
        }
    }
    
    // Fallback to localStorage
    return await cacheToLocalStorage(cacheKey, cacheData);
}

// Helper function to cache to localStorage (fallback)
async function cacheToLocalStorage(cacheKey, cacheData) {
    try {
        const localStorageKey = CONVERSATION_CACHE_PREFIX + cacheKey;
        const cacheString = JSON.stringify(cacheData);
        const sizeInMB = (cacheString.length / (1024 * 1024)).toFixed(2);
        
        // Check if data is too large for localStorage (limit is ~5-10MB, but be conservative)
        if (cacheString.length > 2 * 1024 * 1024) { // 2MB limit per entry (more conservative)
            console.warn('⚠️ Cache data too large for localStorage (' + sizeInMB + 'MB), skipping cache storage.');
            return false;
        }
        
        localStorage.setItem(localStorageKey, cacheString);
        
        // Verify it was saved
        const verifyCache = localStorage.getItem(localStorageKey);
        if (!verifyCache) {
            console.error('❌ Cache save failed: Item not found after save attempt');
            return false;
        }
        
        console.log('✅ Successfully cached conversations in localStorage for:', localStorageKey, `(${cacheData.conversationCount} conversations, ${sizeInMB}MB)`, 'Expires:', new Date(cacheData.expiresAt).toISOString());
        return true;
        
    } catch (error) {
        // Handle quota exceeded error
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            console.warn('⚠️ localStorage quota exceeded, clearing old cache entries...');
            await clearOldCacheEntries();
            
            // Try once more after clearing
            try {
                const localStorageKey = CONVERSATION_CACHE_PREFIX + cacheKey;
                localStorage.setItem(localStorageKey, JSON.stringify(cacheData));
                const verifyCache = localStorage.getItem(localStorageKey);
                if (verifyCache) {
                    console.log('✅ Cached to localStorage after clearing old entries');
                    return true;
                }
            } catch (retryError) {
                console.warn('⚠️ Still unable to cache to localStorage after clearing:', retryError);
            }
        }
        console.warn('⚠️ Error caching to localStorage:', error);
        return false;
    }
}

// Clear old cache entries (keep only last 50 entries for IndexedDB, or last 5 for localStorage)
async function clearOldCacheEntries() {
    const db = await getConversationCacheDB();
    
    if (db) {
        // Use IndexedDB cleanup
        try {
            return new Promise((resolve) => {
                const transaction = db.transaction([INDEXEDDB_STORE_NAME], 'readwrite');
                const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
                const index = store.index('timestamp');
                const request = index.openCursor(null, 'prev'); // Descending order (newest first)
                
                const entries = [];
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        entries.push(cursor.value);
                        cursor.continue();
                    } else {
                        // All entries loaded, now process
                        if (entries.length === 0) {
                            console.log('📦 No cache entries to clear in IndexedDB');
                            resolve();
                            return;
                        }
                        
                        // Calculate total size
                        const totalSize = entries.reduce((sum, entry) => {
                            return sum + (JSON.stringify(entry).length || 0);
                        }, 0);
                        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
                        console.log(`📊 IndexedDB cache stats: ${entries.length} entries, ${totalSizeMB}MB total`);
                        
                        // Keep last 50 entries (IndexedDB can handle much more)
                        const maxEntries = 50;
                        if (entries.length > maxEntries) {
                            const toRemove = entries.slice(maxEntries);
                            const deleteTransaction = db.transaction([INDEXEDDB_STORE_NAME], 'readwrite');
                            const deleteStore = deleteTransaction.objectStore(INDEXEDDB_STORE_NAME);
                            
                            let deletedCount = 0;
                            toRemove.forEach(entry => {
                                deleteStore.delete(entry.cacheKey);
                                deletedCount++;
                                console.log(`🗑️ Removed old cache from IndexedDB: ${entry.cacheKey} (${entry.conversationCount || 0} conversations)`);
                            });
                            
                            console.log(`🗑️ Removed ${deletedCount} old cache entries from IndexedDB`);
                        }
                        
                        // If still too large (more than 500MB), be more aggressive - keep only last 30
                        if (totalSize > 500 * 1024 * 1024 && entries.length > 30) {
                            console.warn('⚠️ IndexedDB cache still too large, keeping only last 30 entries');
                            const toRemove = entries.slice(30);
                            const deleteTransaction = db.transaction([INDEXEDDB_STORE_NAME], 'readwrite');
                            const deleteStore = deleteTransaction.objectStore(INDEXEDDB_STORE_NAME);
                            
                            toRemove.forEach(entry => {
                                deleteStore.delete(entry.cacheKey);
                            });
                        }
                        
                        resolve();
                    }
                };
                
                request.onerror = () => {
                    console.warn('⚠️ Error reading from IndexedDB for cleanup:', request.error);
                    resolve();
                };
            });
        } catch (error) {
            console.warn('⚠️ Error clearing IndexedDB cache:', error);
        }
    }
    
    // Fallback to localStorage cleanup
    try {
        const cacheKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(CONVERSATION_CACHE_PREFIX) || key.startsWith('conversations_cache_'))) {
                cacheKeys.push(key);
            }
        }
        
        if (cacheKeys.length === 0) {
            console.log('📦 No cache entries to clear in localStorage');
            return;
        }
        
        // Sort by timestamp (newest first) and calculate sizes
        const cacheEntries = cacheKeys.map(key => {
            try {
                const data = localStorage.getItem(key);
                const parsed = JSON.parse(data);
                const size = new Blob([data]).size;
                return { 
                    key, 
                    timestamp: parsed.timestamp || 0,
                    size: size,
                    conversationCount: parsed.data?.conversations?.length || 0
                };
            } catch {
                return { key, timestamp: 0, size: 0, conversationCount: 0 };
            }
        }).sort((a, b) => b.timestamp - a.timestamp);
        
        // Calculate total cache size
        const totalSize = cacheEntries.reduce((sum, entry) => sum + entry.size, 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        console.log(`📊 localStorage cache stats: ${cacheEntries.length} entries, ${totalSizeMB}MB total`);
        
        // If we have more than 5 entries, remove oldest ones
        if (cacheEntries.length > 5) {
            const toRemove = cacheEntries.slice(5);
            const removedSize = toRemove.reduce((sum, entry) => sum + entry.size, 0);
            toRemove.forEach(entry => {
                localStorage.removeItem(entry.key);
                console.log(`🗑️ Removed old cache from localStorage: ${entry.key} (${entry.conversationCount} conversations, ${(entry.size / 1024).toFixed(1)}KB)`);
            });
            console.log(`🗑️ Removed ${toRemove.length} old cache entries from localStorage, freed ${(removedSize / (1024 * 1024)).toFixed(2)}MB`);
        }
    } catch (error) {
        console.warn('⚠️ Error clearing localStorage cache:', error);
    }
}

// Get admin info from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const adminId = urlParams.get('admin_id');
const adminName = urlParams.get('admin_name') || 'Unknown Admin';

// DOM Elements
let loadingState, errorState, errorMessage, conversationsContainer, conversationsTableBody, conversationCount;
let startDateInput, endDateInput, applyFilterBtn, resetFilterBtn, adminInfo;
let startDateDisplay, endDateDisplay;
let pagination, paginationStart, paginationEnd, paginationTotal, paginationPrev, paginationNext, paginationPages;
let loadingProgress, loadingStatus, progressBar;

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
    loadingStatus = document.getElementById('loadingStatus');
    progressBar = document.getElementById('progressBar');
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
 * Format date string for display (DD/MM/YYYY) - for date input values
 */
function formatDateStringForDisplay(dateStr) {
    if (!dateStr) return '';
    // dateStr is in YYYY-MM-DD format
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

/**
 * Set default date range (today's date)
 */
function setDefaultDateRange() {
    const today = new Date();

    // Format date as YYYY-MM-DD for input
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(today);
    currentStartDate = todayStr;
    currentEndDate = todayStr;

    // Set date selector if it exists
    const dateSelector = document.getElementById('dateSelector');
    if (dateSelector) {
        dateSelector.value = todayStr;
    }
    
    // Set old date inputs if they exist (for backward compatibility)
    if (startDateInput) {
        startDateInput.value = currentStartDate;
    }
    if (endDateInput) {
        endDateInput.value = currentEndDate;
    }
    
    // Update display
    updateDateDisplays();
}

/**
 * Update progress indicator
 */
function updateProgressIndicator(percentage, message) {
    if (loadingStatus) {
        loadingStatus.textContent = message || 'Pulling from Intercom...';
    }
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    if (loadingProgress && percentage === 100) {
        loadingProgress.textContent = `✅ Loaded ${allConversations.length} conversations`;
        setTimeout(() => {
            if (loadingProgress) {
                loadingProgress.textContent = '';
            }
        }, 3000);
    }
}

/**
 * Update date displays
 */
function updateDateDisplays() {
    // Update old date displays if they exist
    if (startDateDisplay && startDateInput && startDateInput.value) {
        startDateDisplay.textContent = `(${formatDateStringForDisplay(startDateInput.value)})`;
    }
    if (endDateDisplay && endDateInput && endDateInput.value) {
        endDateDisplay.textContent = `(${formatDateStringForDisplay(endDateInput.value)})`;
    }
    
    // Update new date selector display if it exists
    const dateSelector = document.getElementById('dateSelector');
    const selectedDateText = document.getElementById('selectedDateText');
    if (dateSelector && dateSelector.value && selectedDateText) {
        selectedDateText.textContent = formatDateStringForDisplay(dateSelector.value);
    }
}

/**
 * Fetch conversations page by page and update UI progressively
 */
async function fetchConversationsProgressively(adminId, selectedDate) {
    // Check cache first
    const cachedData = await getCachedConversations(adminId, selectedDate);
    if (cachedData) {
        console.log('📦 Using cached data');
        updateProgressIndicator(10, 'Loading from cache...');
        
        // Small delay to show cache loading
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Extract conversations from cached data
        let conversations = [];
        if (cachedData && Array.isArray(cachedData.conversations)) {
            conversations = cachedData.conversations;
        } else if (cachedData && cachedData.type === 'conversation.list' && Array.isArray(cachedData.conversations)) {
            conversations = cachedData.conversations;
        }
        
        // Update analytics from cached data
        if (cachedData) {
            updateAnalytics(cachedData);
        }
        
        console.log(`✅ Loaded ${conversations.length} conversations from cache`);
        
        // Store conversations
        allConversations = conversations;
        
        // Update count
        if (conversationCount) {
            conversationCount.textContent = conversations.length;
        }
        
        // Update progress: Complete
        updateProgressIndicator(100, 'Loaded from cache');
        
        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Hide loading and show results
        if (loadingState) loadingState.style.display = 'none';
        if (conversationsContainer) conversationsContainer.style.display = 'block';
        
        // Display conversations
        displayConversations();
        
        isLoadingMore = false;
        return;
    }
    
    // No cache found, fetch from API
    console.log('🌐 Fetching from API (no cache found)');
    
    let startingAfter = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 100; // Safety limit to prevent infinite loops
    isLoadingMore = true;
    
    // Store all fetched data for caching
    let allFetchedData = {
        conversations: [],
        participation_count: 0,
        intercom_total_count: 0,
        processed_count: 0,
        has_more: false
    };

    // Update progress: Initial
    updateProgressIndicator(10, 'Pulling from Intercom...');

    // Fetch first page immediately
    while (hasMore && pageCount < maxPages) {
        pageCount++;
        // Use updated_date parameter (single date in YYYY-MM-DD format)
        let edgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-proxy?endpoint=conversations&admin_id=${encodeURIComponent(adminId)}&updated_date=${encodeURIComponent(selectedDate)}`;
        
        // Add pagination parameter if we have a cursor
        if (startingAfter) {
            edgeFunctionUrl += `&starting_after=${encodeURIComponent(startingAfter)}`;
        }

        console.log(`Fetching page ${pageCount}...`);
        
        // Update progress: Searching
        if (pageCount === 1) {
            updateProgressIndicator(20, 'Searching conversations in Intercom...');
        } else {
            updateProgressIndicator(40 + (pageCount * 5), 'Pulling from Intercom...');
        }
        
        // Update loading progress text
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

        // Update progress: Pulling data
        if (pageCount === 1) {
            updateProgressIndicator(40, 'Pulling from Intercom...');
        }
        
        const data = await response.json();
        
        // Update progress: Processing
        if (pageCount === 1) {
            updateProgressIndicator(70, 'Processing participation data...');
        }
        
        // Extract conversations from response
        let pageConversations = [];
        if (data && Array.isArray(data.conversations)) {
            pageConversations = data.conversations;
        } else if (data && data.type === 'conversation.list' && Array.isArray(data.conversations)) {
            pageConversations = data.conversations;
        } else if (data && data.conversations && Array.isArray(data.conversations)) {
            pageConversations = data.conversations;
        }
        
        // Update analytics from edge function response (if available)
        if (pageCount === 1 && data) {
            updateAnalytics(data);
            // Store analytics data for caching
            allFetchedData.participation_count = data.participation_count || 0;
            allFetchedData.intercom_total_count = data.intercom_total_count || 0;
            allFetchedData.processed_count = data.processed_count || 0;
        }

        // Log response structure for debugging (only on first page)
        if (pageCount === 1) {
            console.log('📋 Response structure:', {
                hasConversations: !!data.conversations,
                conversationsType: Array.isArray(data.conversations) ? 'array' : typeof data.conversations,
                conversationsLength: Array.isArray(data.conversations) ? data.conversations.length : 'N/A',
                totalCount: data.total_count,
                participationCount: data.participation_count,
                hasMore: data.has_more,
                nextCursor: data.next_cursor
            });
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
            
            // Update total count (with null check)
            if (conversationCount) {
                conversationCount.textContent = allConversations.length;
            }
            
            // If this is the first page, hide loading and show results immediately
            if (pageCount === 1) {
                updateProgressIndicator(90, 'Almost done...');
                if (loadingState) loadingState.style.display = 'none';
                if (conversationsContainer) conversationsContainer.style.display = 'block';
                displayConversations();
            } else {
                // For subsequent pages, just update the display if we're on a page that's now available
                displayConversations();
            }
        }

        // Check if there are more pages
        // Edge function returns next_cursor and has_more
        hasMore = data.has_more === true;
        startingAfter = data.next_cursor || null;
        
        // Also check for old format (pages.next) for backward compatibility
        if (!startingAfter && data.pages) {
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
            }
        }

        // If we got no conversations on first page, show message and stop
        if (pageConversations.length === 0) {
            if (pageCount === 1) {
                console.log('⚠️ No conversations found for the selected date');
                if (loadingState) loadingState.style.display = 'none';
                if (conversationsContainer) conversationsContainer.style.display = 'block';
                const noResults = document.getElementById('noResults');
                if (noResults) noResults.style.display = 'block';
            }
            hasMore = false;
            break;
        }

        // If we didn't get a next_cursor and has_more is false, we're done
        if (!startingAfter && !hasMore) {
            hasMore = false;
        }
    }

    isLoadingMore = false;
    
    // Cache the complete result
    allFetchedData.conversations = allConversations;
    allFetchedData.has_more = hasMore;
    await cacheConversations(adminId, selectedDate, allFetchedData);
    
    // Update progress: Complete
    updateProgressIndicator(100, 'Almost done...');
    
    // Small delay to show completion
    await new Promise(resolve => setTimeout(resolve, 200));
    
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
    if (loadingState) loadingState.style.display = 'block';
    if (errorState) errorState.style.display = 'none';
    if (conversationsContainer) conversationsContainer.style.display = 'none';
    
    // Reset progress indicator
    updateProgressIndicator(0, 'Initializing...');

    // Get date from date selector (new) or date inputs (old)
    const dateSelector = document.getElementById('dateSelector');
    let selectedDate = null;
    
    if (dateSelector && dateSelector.value) {
        selectedDate = dateSelector.value;
    } else if (startDateInput && startDateInput.value) {
        selectedDate = startDateInput.value;
    } else if (endDateInput && endDateInput.value) {
        selectedDate = endDateInput.value;
    }

    if (!selectedDate) {
        showError('Please select a date.');
        if (loadingState) loadingState.style.display = 'none';
        return;
    }

    // Use the same date for both start and end (single date selection)
    currentStartDate = selectedDate;
    currentEndDate = selectedDate;

    try {
        console.log('═══════════════════════════════════════════════════════');
        console.log('🚀 FETCHING CONVERSATIONS (Progressive Loading)');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Admin ID:', adminId);
        console.log('Selected Date:', selectedDate);
        console.log('Date (Display):', formatDateStringForDisplay(selectedDate));

        // Reset state
        allConversations = [];
        currentPage = 1;
        
        // Start fetching conversations progressively (shows first 20 immediately)
        // Use updated_date parameter (single date) instead of updated_since/updated_before
        await fetchConversationsProgressively(adminId, selectedDate);

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
    if (!conversationsTableBody) {
        console.error('conversationsTableBody element not found');
        return;
    }
    
    conversationsTableBody.innerHTML = '';

    if (allConversations.length === 0) {
        const noResults = document.getElementById('noResults');
        if (noResults) noResults.style.display = 'block';
        if (conversationsContainer) conversationsContainer.style.display = 'block';
        if (pagination) pagination.style.display = 'none';
        return;
    }

    const noResults = document.getElementById('noResults');
    if (noResults) noResults.style.display = 'none';

    // Calculate pagination
    const totalPages = Math.ceil(allConversations.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, allConversations.length);
    const pageConversations = allConversations.slice(startIndex, endIndex);

    // Update pagination info (with null checks)
    if (paginationStart) paginationStart.textContent = allConversations.length > 0 ? startIndex + 1 : 0;
    if (paginationEnd) paginationEnd.textContent = endIndex;
    if (paginationTotal) {
        paginationTotal.textContent = allConversations.length;
        // Show loading indicator in pagination info if still loading
        if (isLoadingMore) {
            paginationTotal.textContent = `${allConversations.length}+`;
        }
    }
    
    // Show pagination if we have conversations
    if (pagination) {
        pagination.style.display = totalPages > 1 ? 'flex' : 'none';
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
        let subject = 'No subject';
        if (conversation.source?.subject) {
            subject = conversation.source.subject;
        } else if (conversation.source?.body) {
            // Remove HTML tags and get first 100 chars
            const bodyText = conversation.source.body.replace(/<[^>]*>/g, '').trim();
            subject = bodyText || 'No subject';
        } else if (conversation.conversation_parts) {
            // Try to get from conversation parts
            let parts = [];
            if (Array.isArray(conversation.conversation_parts)) {
                parts = conversation.conversation_parts;
            } else if (conversation.conversation_parts.conversation_parts && Array.isArray(conversation.conversation_parts.conversation_parts)) {
                parts = conversation.conversation_parts.conversation_parts;
            }
            if (parts.length > 0 && parts[0].body) {
                const bodyText = parts[0].body.replace(/<[^>]*>/g, '').trim();
                subject = bodyText || 'No subject';
            }
        }
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
            <td>
                ${conversation.participation_part_count ? `<span class="badge badge-success">${conversation.participation_part_count}</span>` : '-'}
            </td>
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
 * Update analytics cards with data from edge function response
 */
function updateAnalytics(data) {
    const analyticsDiv = document.getElementById('participationAnalytics');
    if (!analyticsDiv) return;
    
    // Show analytics section
    analyticsDiv.style.display = 'block';
    
    // Update participated conversations count
    const participatedCountEl = document.getElementById('participatedConversations');
    if (participatedCountEl) {
        const count = data.total_count || (data.conversations ? data.conversations.length : 0);
        participatedCountEl.textContent = count;
    }
    
    // Update total parts created (participation parts)
    const participationPartsEl = document.getElementById('participationParts');
    if (participationPartsEl && data.participation_count !== undefined) {
        participationPartsEl.textContent = data.participation_count;
    }
    
    // Update intercom total count
    const intercomTotalEl = document.getElementById('intercomTotalCount');
    if (intercomTotalEl && data.intercom_total_count !== undefined) {
        intercomTotalEl.textContent = data.intercom_total_count;
    }
    
    // Update processed count
    const processedCountEl = document.getElementById('processedCount');
    if (processedCountEl && data.processed_count !== undefined) {
        processedCountEl.textContent = data.processed_count;
    }
    
    // Show warning if there are more conversations
    const warningDiv = document.getElementById('moreConversationsWarning');
    const warningCountEl = document.getElementById('warningCount');
    if (warningDiv && data.has_more) {
        warningDiv.style.display = 'block';
        if (warningCountEl) {
            warningCountEl.textContent = data.total_count || 0;
        }
    } else if (warningDiv) {
        warningDiv.style.display = 'none';
    }
}

/**
 * Show error message
 */
function showError(message) {
    if (errorMessage) errorMessage.textContent = message;
    if (errorState) errorState.style.display = 'block';
    if (loadingState) loadingState.style.display = 'none';
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
    
    // Set owner information in header
    const ownerNameEl = document.getElementById('ownerName');
    const ownerInitialEl = document.getElementById('ownerInitial');
    const adminNameFilterEl = document.getElementById('adminNameFilter');
    
    if (ownerNameEl && adminName) {
        ownerNameEl.textContent = adminName;
    }
    
    if (ownerInitialEl && adminName) {
        // Get initials from admin name
        const initials = adminName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
        ownerInitialEl.textContent = initials || '?';
    }
    
    if (adminNameFilterEl && adminName) {
        adminNameFilterEl.textContent = adminName;
    }
    
    // Set admin info (if element exists)
    if (adminInfo) {
        adminInfo.textContent = `Viewing conversations for: ${escapeHtml(adminName)} (ID: ${adminId})`;
    }
    
    // Set default date range
    setDefaultDateRange();
    
    // Add event listeners (with null checks)
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', loadConversations);
    }
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            setDefaultDateRange();
            loadConversations();
        });
    }
    
    // Update displays when dates change
    if (startDateInput) {
        startDateInput.addEventListener('change', updateDateDisplays);
    }
    if (endDateInput) {
        endDateInput.addEventListener('change', updateDateDisplays);
    }
    
    // Add event listener for date selector (new single date picker)
    const dateSelector = document.getElementById('dateSelector');
    if (dateSelector) {
        dateSelector.addEventListener('change', () => {
            loadConversations();
        });
    }
    
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

