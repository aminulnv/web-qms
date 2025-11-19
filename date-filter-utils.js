/**
 * Date Filter Utilities
 * Shared utility functions for quick date filtering across the application
 * Uses Dhaka timezone utilities for consistent date handling
 */

/**
 * Apply quick date filter (Today, Yesterday, This Month)
 * This function can be called directly or wrapped by page-specific implementations
 * @param {string} period - 'today', 'yesterday', or 'thisMonth'
 * @param {Object} options - Configuration options
 * @param {Object} options.dateFilter - Date filter object to update (must have start and end properties)
 * @param {Function} options.setUseWeekFilter - Optional function to set useWeekFilter to false
 * @param {Function} options.onUpdate - Optional callback function to call after updating dates (e.g., updateWeekDisplay)
 * @param {Function} options.onRefresh - Optional callback function to refresh data after filter update (e.g., applyFilters)
 * @param {boolean} options.useDateObjects - If true, stores Date objects instead of strings (for home.html)
 * @param {Function} options.formatDateForInput - Optional custom date formatter (for home.html)
 */
window.applyQuickDateFilter = function(period, options = {}) {
    const {
        dateFilter,
        setUseWeekFilter = null,
        onUpdate = null,
        onRefresh = null,
        useDateObjects = false,
        formatDateForInput = null
    } = options;

    if (!dateFilter) {
        console.error('applyQuickDateFilter: dateFilter option is required');
        return;
    }

    const today = getDhakaStartOfDay();
    
    let startDate, endDate;
    
    switch(period) {
        case 'today':
            startDate = getDhakaStartOfDay();
            endDate = getDhakaEndOfDay();
            break;
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = getDhakaStartOfDay(yesterday);
            endDate = getDhakaEndOfDay(yesterday);
            break;
        case 'thisMonth':
            startDate = getDhakaFirstDayOfMonth(today);
            endDate = getDhakaLastDayOfMonth(today);
            break;
        default:
            return;
    }
    
    // Update date filter based on storage format
    if (useDateObjects) {
        // For home.html which uses Date objects
        dateFilter.start = startDate;
        dateFilter.end = endDate;
    } else {
        // For other pages which use date strings (YYYY-MM-DD format)
        const startDateStr = formatDhakaDateForInput(startDate);
        const endDateStr = formatDhakaDateForInput(endDate);
        dateFilter.start = startDateStr;
        dateFilter.end = endDateStr;
    }
    
    // Update useWeekFilter if setter function provided
    if (setUseWeekFilter && typeof setUseWeekFilter === 'function') {
        setUseWeekFilter(false);
    }
    
    // Update date input fields
    const startDateEl = document.getElementById('startDate');
    const endDateEl = document.getElementById('endDate');
    const dateBtnTextEl = document.getElementById('dateBtnText');
    
    if (startDateEl) {
        if (useDateObjects && formatDateForInput) {
            startDateEl.value = formatDateForInput(startDate);
        } else if (!useDateObjects) {
            startDateEl.value = formatDhakaDateForInput(startDate);
        }
    }
    
    if (endDateEl) {
        if (useDateObjects && formatDateForInput) {
            endDateEl.value = formatDateForInput(endDate);
        } else if (!useDateObjects) {
            endDateEl.value = formatDhakaDateForInput(endDate);
        }
    }
    
    // Update date button text
    if (dateBtnTextEl) {
        const start = formatDhakaDate(startDate, { month: 'short', day: 'numeric' });
        const end = formatDhakaDate(endDate, { month: 'short', day: 'numeric' });
        dateBtnTextEl.textContent = `${start} - ${end}`;
    }
    
    // Update active state of quick filter buttons
    const quickDateButtons = document.querySelectorAll('.quick-date-btn');
    quickDateButtons.forEach(btn => btn.classList.remove('active'));
    
    const activeButton = document.getElementById(period + 'Btn');
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Call onUpdate callback if provided (e.g., updateWeekDisplay)
    if (onUpdate && typeof onUpdate === 'function') {
        onUpdate();
    }
    
    // Call onRefresh callback if provided (e.g., applyFilters, filterAudits)
    if (onRefresh && typeof onRefresh === 'function') {
        onRefresh();
    }
};

