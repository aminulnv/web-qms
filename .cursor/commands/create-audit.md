# Create Audit Page - Context Documentation

## File Overview
- **File**: `create-audit.html`
- **Size**: ~17,632 lines
- **Purpose**: Quality Management System (QMS) page for creating and managing audit assignments
- **Framework**: Vanilla JavaScript with Supabase backend
- **UI**: Tailwind CSS with custom styles

## Key Dependencies
- Supabase JS Client (`@supabase/supabase-js@2`)
- External scripts loaded:
  - `supabase-config.js` - Supabase configuration
  - `auth-check.js` - Authentication
  - `access-control.js` - Access control
  - `confirmation-dialog.js` - Dialog modals
  - `load-sidebar.js` - Sidebar navigation
  - `search.js` - Search functionality
  - `form-validation.js` - Form validation
  - `intercom-config.js` - Intercom integration
  - `audit-template.js` - Audit templates
  - `keyboard-shortcuts.js` - Keyboard shortcuts

## Main Sections & DOM Structure

### 1. Header & Stats Section
- **ID**: `yourStatsSection`
- **Stats Elements**:
  - `statsAssignedCount` - Assigned audits count
  - `statsCompletedCount` - Completed audits count
  - `statsRemainingCount` - Remaining audits count
  - `statsInProgressCount` - In-progress audits count
  - `statsReversalCount` - Reversal audits count
  - `statsAvgDuration` - Average duration per audit

### 2. Pending Audits Section
- **ID**: `pendingAuditsSection`
- **Key Elements**:
  - `pendingAuditsList` - Container for audit cards
  - `pendingCount` - Badge showing count
  - `auditsViewTitle` - Title text
  - `createManualAuditBtn` - Button to create manual audit
  - `toggleAllAuditsBtn` - Toggle between assigned/completed
  - `showFiltersBtn` - Show/hide filters
  - `sortIconBtn` - Sort menu button
  - `auditSortBy` - Sort dropdown

### 3. Filters Section
- **ID**: `filtersSection`
- **Filter Inputs**:
  - `filterStartDate` - Start date filter
  - `filterEndDate` - End date filter
  - `filterStatus` - Status filter (pending, in_progress, completed)
  - `filterScorecard` - Scorecard filter
  - `filterSearch` - Text search filter

### 4. Pull Conversations Section
- **ID**: `pullConversationsSection`
- **Key Elements**:
  - `pullConversationsCount` - Conversation count
  - `pullConversationsAdminName` - Admin name display
  - `pullConversationsLoading` - Loading indicator
  - `pullConversationsError` - Error display
  - `pullConversationsList` - Conversations table
  - `pullConversationsActiveFilters` - Active filters display
  - `pullConversationsProgressBar` - Progress bar
  - `pullConversationsProgress` - Progress text

### 5. Conversations Section (Employee-specific)
- **ID**: `conversationsSection`
- **Key Elements**:
  - `conversationsEmployeeName` - Employee name
  - `conversationsStartDate` - Start date picker
  - `conversationsEndDate` - End date picker
  - `conversationsLoading` - Loading state
  - `conversationsList` - Conversations list container
  - `conversationsTableBody` - Table body for conversations
  - `conversationsError` - Error display
  - `conversationsErrorMessage` - Error message text
  - `conversationsPagination` - Pagination container
  - `conversationsPaginationPages` - Page number buttons
  - `conversationsPaginationPrev` - Previous page button
  - `conversationsPaginationNext` - Next page button
  - `conversationsPaginationStart` - Start index display
  - `conversationsPaginationEnd` - End index display
  - `conversationsPaginationTotal` - Total count display
  - `conversationsCount` - Conversation count display
  - `conversationsCountLoader` - Loading indicator for count

### 6. AI Audit Section
- **ID**: `aiAuditSection`
- **Key Elements**:
  - `aiAuditStatusSummary` - Status summary
  - `aiAuditProcessingIndicator` - Processing indicator
  - `aiAuditProcessingList` - List of processing audits
  - `aiAuditLastRefresh` - Last refresh time

### 7. Audit Timer
- **ID**: `auditTimer`
- **Elements**:
  - `timerControlBtn` - Play/pause/reset button
  - Timer display text

## Key JavaScript Functions

### Scorecard Management
- `loadScorecards(channelFilter)` - Load available scorecards
- `autoSelectScorecardByChannel(channelName)` - Auto-select scorecard by channel
- `loadScorecardParameters(scorecardId)` - Load parameters for a scorecard

### Stats & Dashboard
- `updateYourStats()` - Update user statistics display

### Pending Audits Management
- `loadPendingAudits()` - Load pending audit assignments
- `displayPendingAudits()` - Render audit cards
- `createGroupedAuditCard(group, isAgent, isExpanded)` - Create grouped audit card (by employee)
- `createIndividualAuditCard(audit, isAgent)` - Create individual audit card
- `sortPendingAudits()` - Sort audits by selected criteria
- `applyFilters()` - Apply filters to audits
- `clearFilters()` - Clear all filters
- `toggleFilters()` - Show/hide filter section
- `toggleAllAuditsView()` - Toggle between assigned/completed views

### Pagination
- `calculatePendingPagination()` - Calculate pagination for pending audits
- `getPaginatedPendingAudits()` - Get paginated audit list
- `updatePendingPaginationUI()` - Update pagination controls
- `goToPendingPage(page)` - Navigate to specific page
- `goToPendingNextPage()` - Next page
- `goToPendingPreviousPage()` - Previous page

### Conversation Management
- `pullConversationsForEmployee(employeeEmail, employeeName)` - Pull conversations from Intercom
- `fetchConversationsForDateRange(startDate, endDate)` - Fetch conversations for date range
- `fetchConversationsForCurrentUser(selectedDate)` - Fetch conversations for current user
- `displayPullConversationsList(conversations)` - Display conversations in table
- `filterPullConversations()` - Filter conversations
- `updatePullConversationsActiveFilters()` - Update active filters display
- `clearPullConversationsFilters()` - Clear conversation filters

### Employee Conversations
- `loadConversationsForEmployee()` - Load conversations for specific employee
- `fetchEmployeeConversationsProgressively(adminId, startDate, endDate, filters)` - Progressive fetch with retry logic
- `displayEmployeeConversations()` - Display employee conversations in table
- `updateConversationsPaginationControls(totalPages)` - Update pagination controls for conversations
- `conversationsGoToPage(page)` - Navigate to specific conversation page
- `extractClientName(conversation)` - Extract client name from conversation
- `extractClientEmail(conversation)` - Extract client email
- `extractAdminFromConversation(conversation)` - Extract admin info
- `getConversationRating(conversation)` - Get rating from conversation
- `extractProductType(conversation)` - Extract product type
- `generateStarRating(rating)` - Generate star rating HTML display
- `copyConversationId(conversationId, buttonElement)` - Copy conversation ID to clipboard
- `showConversationsError(message)` - Display error message in conversations section

### Admin Management
- `findAdminIdForEmployee(employeeEmail)` - Find Intercom admin ID for employee
- `cacheAdminAsync(supabaseClient, admin)` - Cache admin in database
- `showAdminSearchModal(employeeEmail, employeeName)` - Show admin search modal
- `closeAdminSearchModal()` - Close admin search modal
- `searchIntercomAdmins()` - Search for Intercom admins
- `selectAdminFromSearch(admin)` - Select admin from search results
- `skipAdminSearch()` - Skip admin linking

### AI Audit Features
- `rankConversationsForAIAudit(conversations)` - Rank conversations for AI audit
- `processConversationsForAIAudit(conversations)` - Process conversations for AI audit
- `displayAIAuditConversations()` - Display AI audit conversation list
- `getAIAuditStatus(conversationIds)` - Get AI audit status
- `handleAIAuditStatusClick(conversationId, status, aiStatusData)` - Handle AI audit status click
- `showAIAuditResultsModal(conversationId, aiStatusData)` - Show AI audit results
- `startManualAuditFromAI(conversationId)` - Start manual audit from AI results
- `updateAIAuditProcessingIndicator(aiAuditStatusMap, conversations)` - Update processing indicator
- `startAIAuditAutoRefresh()` - Start auto-refresh for AI audits

### Caching System
- `initConversationCacheDB()` - Initialize IndexedDB for caching
- `getConversationCacheDB()` - Get IndexedDB instance
- `getCachedConversations(adminId, date)` - Get cached conversations
- `cacheConversations(adminId, date, data)` - Cache conversations
- `clearOldCacheEntries()` - Clear expired cache entries
- `clearAllConversationCaches()` - Clear all caches

### Conversation Linking
- `linkConversationToAudit(conversation, auditId)` - Link conversation to audit assignment
- `removeConversationFromAudit(auditId, conversationId)` - Remove conversation link from audit
- `updateConversationIdForAudit(auditId, conversationIdValue)` - Update conversation ID in audit assignment
- `navigateToAssignment(assignmentId)` - Navigate to audit form for assignment

### Form Management & Editing
- `loadAuditForEditing()` - Load audit data for editing from URL parameters
- `populateFormWithAuditData(audit)` - Populate form fields with audit data
- `loadEmployees()` - Load all employees from Supabase
- `loadChannels()` - Load available channels
- `renderErrorParameters()` - Render error parameter fields
- `clearErrorParameters()` - Clear all error parameter fields
- `updateFeedbackBoxesForParameter(fieldId, fieldType, paramType)` - Update feedback boxes
- `setupFeedbackTextareaAutoExpand(fieldId, textareaElement)` - Setup auto-expand for textareas
- `setInitialAverageScore()` - Set initial average score
- `populateErrorDescription()` - Populate error description field
- `createManualAudit()` - Create new manual audit (reset form)

### Calibration & ATA Modes
- `checkCalibrationMode()` - Check if in calibration mode from URL params
- `checkATAMode()` - Check if in ATA (After The Audit) mode from URL params
- `loadCalibrationSampleAudit()` - Load calibration sample audit
- `loadATAOriginalAudit()` - Load ATA original audit

### Utility Functions
- `copyToClipboard(text, buttonElement)` - Copy text to clipboard
- `escapeHtml(text)` - Escape HTML characters (multiple implementations)
- `formatTimeAgo(date)` - Format relative time
- `formatDateForAPI(dateStr)` - Format date for API (start of day)
- `formatEndDateForAPI(dateStr)` - Format end date for API (end of day)
- `formatConversationDateForDisplay(timestamp)` - Format conversation date (DD/MM/YYYY HH:MM)
- `formatDate(dateString)` - Format date string
- `getInitials(name)` - Get initials from name
- `showToastNotification(message, type)` - Show toast notification
- `buildIntercomUrl(conversationId)` - Build Intercom conversation URL
- `fetchWithRetry(url, options, maxRetries, retryDelay, timeoutMs)` - Fetch with retry logic and timeout

## Key State Variables

### Global State
```javascript
let currentScorecard = null;
let currentParameters = [];
let allAvailableScorecards = [];
let pendingAudits = [];
let allPendingAudits = [];
let isEditingPendingAudit = false;
let currentEditingAuditId = null;
let currentAssignmentId = null;
let showAllAudits = false;
let isEditingExistingAudit = false;
let currentEditingTableName = null;
let currentSortOrder = 'name_asc';
let selectedAuditId = null;
```

### Pagination State
```javascript
let pendingCurrentPage = 1;
let pendingItemsPerPage = 5;
let pendingTotalPages = 1;
```

### Filter State
```javascript
let activeFilters = {
    startDate: null,
    endDate: null,
    status: null,
    scorecard: null,
    search: null
};
```

### Conversation State
```javascript
let currentEmployeeEmail = null;
let currentEmployeeName = null;
let currentAdminId = null;
let allEmployeeConversations = [];
let rawEmployeeConversations = [];
let currentConversationsPage = 1;
const conversationsItemsPerPage = 20;
const maxConversationsToFetch = 150;
let isLoadingEmployeeConversations = false;
```

### Pull Conversations State
```javascript
let pullConversationsAdminId = null;
let pullConversationsAdminName = null;
let pullConversationsAdminEmail = null;
let pullConversationsAdminAlias = null;
let pullConversationsEmployeeEmail = null;
let pullConversationsDateRange = 'yesterday';
let pullConversationsList = [];
let pullConversationsFilteredList = [];
let pullConversationsFilters = {
    rating: {},
    cxScore: {},
    length: {},
    clientSearch: '',
    conversationId: ''
};
```

### AI Audit State
```javascript
let aiAuditEmployeeEmail = null;
let aiAuditEmployeeName = null;
let aiAuditConversations = [];
let aiAuditTop10Ranked = [];
let aiAuditSelectedConversations = new Set();
```

### Calibration Mode State
```javascript
let isCalibrationMode = false;
let calibrationSessionId = null;
let calibrationSampleAuditId = null;
let calibrationInteractionId = null;
let calibrationScorecardId = null;
let calibrationTableName = null;
```

### ATA Mode State
```javascript
let isATAMode = false;
let ataAuditId = null;
let ataTableName = null;
let ataScorecardId = null;
let originalAuditData = null; // Store original audit data for comparison
```

### Employee & Channel Data
```javascript
let allEmployees = []; // Store all employees loaded from Supabase
```

### Conversation Filter State
```javascript
let currentConversationFilters = {
    // Filter state for employee conversations
};
```

## Supabase Tables & Queries

### Main Tables
- `scorecards` - Available scorecards
- `scorecard_parameters` - Parameters for each scorecard
- `audit_assignments` - Audit assignments
- `users` - User information
- `intercom_admin_cache` - Cached Intercom admin data

### Common Query Patterns
```javascript
// Load scorecards
window.supabaseClient.from('scorecards').select('*')

// Load scorecard parameters
window.supabaseClient.from('scorecard_parameters')
    .select('*')
    .eq('scorecard_id', scorecardId)

// Load audit assignments
window.supabaseClient.from('audit_assignments')
    .select('*')
    .eq('auditor_email', userEmail)

// Load audits from dynamic table
window.supabaseClient.from(scorecard.table_name)
    .select('*')
    .eq('employee_email', email)
```

## API Endpoints

### Supabase Edge Functions
- `/functions/v1/intercom-proxy` - Intercom API proxy
  - Query params: `endpoint=admins`, `endpoint=conversations`, etc.

### Intercom API Integration
- Conversations API via edge function
- Admins API via edge function
- Uses Bearer token authentication

## Key Features & Workflows

### 1. Audit Assignment Workflow
1. User views assigned audits in `pendingAuditsList`
2. Can filter by date, status, scorecard, search
3. Can sort by name, date, status
4. Click "Start Audit" to begin
5. Opens audit form (likely in `audit-form.html`)

### 2. Pull Conversations Workflow
1. Click "Pull Conversations" button on audit card
2. System finds Intercom admin ID for employee
3. Fetches conversations from Intercom API (with retry logic and progressive loading)
4. Displays in table with filters and pagination
5. Can link conversations to audits via:
   - Drag-and-drop from conversation table to audit card
   - Manual entry in conversation ID input field
   - Clicking "Audit" button in conversation row
6. Can remove conversation links via delete button
7. Conversation linking updates `audit_assignments.conversation_id` field

### 3. AI Audit Workflow
1. Select conversations for AI audit
2. System ranks conversations
3. Shows top 10 ranked conversations
4. User selects which to audit
5. System processes via AI
6. Shows results in modal
7. Can start manual audit from AI results

### 4. Caching Strategy
- Uses IndexedDB for conversation caching
- Cache key: `conversations_cache_{adminId}_{date}`
- Cache expiry: 24 hours
- Falls back to localStorage if IndexedDB unavailable
- Automatic cache cleanup for old entries

### 5. Progressive Fetching with Retry
- `fetchWithRetry()` implements exponential backoff retry logic
- Timeout handling: 60s initial, increases on retries (90s, 120s)
- Max 3 retry attempts
- Handles network errors, timeouts, and HTTP errors
- Progress indicators during fetch

### 6. Calibration Mode Workflow
1. URL parameter: `?calibration=true&sessionId=...&auditId=...&interactionId=...&scorecardId=...&tableName=...`
2. System detects calibration mode on page load
3. Loads sample audit for calibration session
4. Form is pre-populated with sample data
5. User completes calibration audit
6. Results submitted to calibration system

### 7. ATA (After The Audit) Mode Workflow
1. URL parameter: `?ata=true&auditId=...&table=...&scorecard=...`
2. System detects ATA mode on page load
3. Loads original audit data
4. Stores original data for comparison
5. User can make corrections/updates
6. System tracks changes from original

### 8. Employee Conversations Pagination
- 20 conversations per page
- Progressive loading: shows initial results, continues fetching in background
- Pagination controls: Previous, Next, page numbers
- Displays: "Showing X-Y of Z" format
- Handles large datasets efficiently

## UI Patterns & Conventions

### Color Scheme
- Primary: `#1A733E` (green)
- Secondary: `#15582E` (darker green)
- Background: `#ffffff`, `#f9fafb`
- Border: `#e5e7eb`, `#d1d5db`
- Text: `#374151`, `#6b7280`

### Font Sizes (rem units)
- Small: `0.4043rem`, `0.4447rem`
- Medium: `0.4852rem`, `0.5659rem`
- Large: `0.6064rem`, `0.8086rem`
- Extra Large: `1.2937rem`, `1.6171rem`

### Spacing (rem units)
- Small: `0.1617rem`, `0.2425rem`
- Medium: `0.3234rem`, `0.4852rem`
- Large: `0.6469rem`, `0.9704rem`
- Extra Large: `1.2937rem`, `1.9406rem`

### Button Styles
- Primary: Green background (`#1A733E`), white text
- Secondary: Gray background (`#f3f4f6`), dark text
- Hover: Darker shade of background color

### Modal Patterns
- Fixed position, full screen overlay
- Centered content with max-width
- Close button in top-right
- Animation: `modalSlideIn`, `modalSlideOut`

## Important Notes

### Performance Considerations
- Progressive loading for large conversation lists (shows initial results immediately)
- Pagination for audit lists (5 per page) and conversations (20 per page)
- Caching to reduce API calls (24-hour cache expiry)
- IndexedDB for offline capability
- Retry logic with exponential backoff for failed requests
- Timeout handling for long-running requests
- Maximum fetch limit: 150 conversations per request

### Error Handling
- Try-catch blocks around async operations
- User-friendly error messages
- Loading states for async operations
- Retry mechanisms for failed requests

### Data Flow
1. Load assignments from Supabase
2. Group by employee (if grouped view)
3. Fetch conversations from Intercom (cached)
4. Display with filters and pagination
5. Link conversations to audits
6. Submit audit form

### Common Issues to Watch For
- Admin ID not found → Shows admin search modal
- Large conversation lists → Use pagination/progressive loading (20 per page)
- Cache expiry → Refresh cache automatically (24-hour expiry)
- Network errors → Automatic retry with exponential backoff (max 3 attempts)
- Timeout errors → Increased timeout on retries (60s → 90s → 120s)
- Missing scorecard → Auto-select by channel
- Conversation already linked → Warning dialog before replacement
- Calibration/ATA mode → Check URL parameters on page load
- Form editing → Navigate to `edit-audit.html` for existing audits

## Quick Reference: Key Element IDs

### Stats
- `statsAssignedCount`, `statsCompletedCount`, `statsRemainingCount`, `statsInProgressCount`, `statsReversalCount`, `statsAvgDuration`

### Audits
- `pendingAuditsList`, `pendingCount`, `createManualAuditBtn`, `toggleAllAuditsBtn`, `filtersSection`

### Conversations
- `pullConversationsSection`, `pullConversationsList`, `pullConversationsCount`, `conversationsSection`, `conversationsList`, `conversationsTableBody`, `conversationsPagination`, `conversationsPaginationPages`, `conversationsPaginationPrev`, `conversationsPaginationNext`, `conversationsCount`

### Filters
- `filterStartDate`, `filterEndDate`, `filterStatus`, `filterScorecard`, `filterSearch`

### AI Audit
- `aiAuditSection`, `aiAuditStatusSummary`, `aiAuditProcessingIndicator`

### Modals
- `adminSearchModal`, `comingSoonModal`, `imageViewerModal`

## Common Modifications

### Adding a New Filter
1. Add input element in `filtersSection`
2. Add to `activeFilters` object
3. Update `applyFilters()` function
4. Update `clearFilters()` function
5. Update `updateActiveFiltersDisplay()` function

### Adding a New Sort Option
1. Add option to `auditSortBy` select
2. Update `sortPendingAudits()` function
3. Update `currentSortOrder` handling

### Adding a New Conversation Field
1. Extract in conversation processing functions (`extractClientName`, `extractProductType`, etc.)
2. Add column to conversations table in `displayPullConversationsList()` or `displayEmployeeConversations()`
3. Update filter functions if needed (`filterPullConversations()`, `applyClientSideFilters()`)
4. Add to `pullConversationsFilters` or `currentConversationFilters` state if filterable

### Adding Retry Logic to New API Calls
1. Use `fetchWithRetry()` function instead of standard `fetch()`
2. Configure maxRetries (default: 3), retryDelay (default: 1000ms), timeoutMs (default: 60000ms)
3. Handle AbortError for timeouts
4. Show appropriate error messages to users

### Working with Calibration/ATA Modes
1. Check URL parameters using `checkCalibrationMode()` or `checkATAMode()`
2. Set appropriate state variables
3. Load data using `loadCalibrationSampleAudit()` or `loadATAOriginalAudit()`
4. Handle form population differently in these modes
5. Submit to appropriate endpoints based on mode

