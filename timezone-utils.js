/**
 * Timezone Utility Functions for Dhaka Timezone (UTC+6)
 * 
 * All date and time operations should use these functions to ensure
 * consistent handling of Dhaka timezone across the application.
 */

// Dhaka timezone offset in minutes (UTC+6 = 360 minutes)
const DHAKA_UTC_OFFSET_MINUTES = 6 * 60; // 360 minutes

/**
 * Get current date/time in Dhaka timezone
 * @returns {Date} Date object representing current time in Dhaka
 */
function getDhakaNow() {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const dhakaTime = new Date(utcTime + (DHAKA_UTC_OFFSET_MINUTES * 60000));
    return dhakaTime;
}

/**
 * Convert a UTC date to Dhaka timezone
 * @param {Date|string} date - Date object or ISO string
 * @returns {Date} Date object in Dhaka timezone
 */
function toDhakaTime(date) {
    if (!date) return null;
    const dateObj = date instanceof Date ? date : new Date(date);
    const utcTime = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
    const dhakaTime = new Date(utcTime + (DHAKA_UTC_OFFSET_MINUTES * 60000));
    return dhakaTime;
}

/**
 * Create a date in Dhaka timezone from year, month, day
 * @param {number} year - Year
 * @param {number} month - Month (0-11, where 0 = January)
 * @param {number} day - Day of month
 * @param {number} hours - Hours (0-23), default 0
 * @param {number} minutes - Minutes (0-59), default 0
 * @param {number} seconds - Seconds (0-59), default 0
 * @param {number} milliseconds - Milliseconds (0-999), default 0
 * @returns {Date} Date object in Dhaka timezone
 */
function createDhakaDate(year, month, day, hours = 0, minutes = 0, seconds = 0, milliseconds = 0) {
    // Create date as if it's UTC, then adjust for Dhaka offset
    const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));
    // Subtract Dhaka offset to get the correct local time
    const dhakaTime = new Date(utcDate.getTime() - (DHAKA_UTC_OFFSET_MINUTES * 60000));
    return dhakaTime;
}

/**
 * Parse a date string (YYYY-MM-DD) as a date in Dhaka timezone
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {string} timeString - Optional time string (HH:MM:SS or HH:MM)
 * @returns {Date} Date object in Dhaka timezone
 */
function parseDhakaDate(dateString, timeString = '00:00:00') {
    if (!dateString) return null;
    
    // Parse date string
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Parse time string
    let hours = 0, minutes = 0, seconds = 0;
    if (timeString) {
        const timeParts = timeString.split(':');
        hours = parseInt(timeParts[0]) || 0;
        minutes = parseInt(timeParts[1]) || 0;
        seconds = parseInt(timeParts[2]) || 0;
    }
    
    return createDhakaDate(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Get start of day in Dhaka timezone
 * @param {Date|string} date - Date object or date string
 * @returns {Date} Start of day (00:00:00) in Dhaka timezone
 */
function getDhakaStartOfDay(date) {
    const dhakaDate = date ? toDhakaTime(date) : getDhakaNow();
    return createDhakaDate(
        dhakaDate.getFullYear(),
        dhakaDate.getMonth(),
        dhakaDate.getDate(),
        0, 0, 0, 0
    );
}

/**
 * Get end of day in Dhaka timezone
 * @param {Date|string} date - Date object or date string
 * @returns {Date} End of day (23:59:59.999) in Dhaka timezone
 */
function getDhakaEndOfDay(date) {
    const dhakaDate = date ? toDhakaTime(date) : getDhakaNow();
    return createDhakaDate(
        dhakaDate.getFullYear(),
        dhakaDate.getMonth(),
        dhakaDate.getDate(),
        23, 59, 59, 999
    );
}

/**
 * Format date for display in Dhaka timezone
 * @param {Date|string} date - Date object or ISO string
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
function formatDhakaDate(date, options = {}) {
    if (!date) return 'N/A';
    
    const dhakaDate = toDhakaTime(date);
    const defaultOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...options
    };
    
    return dhakaDate.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Format date and time for display in Dhaka timezone
 * @param {Date|string} date - Date object or ISO string
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date and time string
 */
function formatDhakaDateTime(date, options = {}) {
    if (!date) return 'N/A';
    
    const dhakaDate = toDhakaTime(date);
    const defaultOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        ...options
    };
    
    return dhakaDate.toLocaleString('en-US', defaultOptions);
}

/**
 * Format date for input field (YYYY-MM-DD) in Dhaka timezone
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Date string in YYYY-MM-DD format
 */
function formatDhakaDateForInput(date) {
    if (!date) return '';
    
    const dhakaDate = toDhakaTime(date);
    const year = dhakaDate.getFullYear();
    const month = String(dhakaDate.getMonth() + 1).padStart(2, '0');
    const day = String(dhakaDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Convert Dhaka date to UTC ISO string for database queries
 * This ensures dates are stored/queried correctly in UTC
 * @param {Date} dhakaDate - Date object in Dhaka timezone
 * @returns {string} ISO string in UTC
 */
function dhakaDateToUTCISO(dhakaDate) {
    if (!dhakaDate) return null;
    
    // If it's already a Date object created in Dhaka timezone,
    // we need to convert it to UTC for database storage
    const dateObj = dhakaDate instanceof Date ? dhakaDate : new Date(dhakaDate);
    
    // Get the UTC equivalent
    const utcTime = dateObj.getTime() - (DHAKA_UTC_OFFSET_MINUTES * 60000);
    const utcDate = new Date(utcTime);
    
    return utcDate.toISOString();
}

/**
 * Get first day of month in Dhaka timezone
 * @param {Date|number} dateOrYear - Date object or year number
 * @param {number} month - Month (0-11), optional if dateOrYear is Date
 * @returns {Date} First day of month in Dhaka timezone
 */
function getDhakaFirstDayOfMonth(dateOrYear, month = null) {
    let year, monthIndex;
    
    if (dateOrYear instanceof Date) {
        const dhakaDate = toDhakaTime(dateOrYear);
        year = dhakaDate.getFullYear();
        monthIndex = month !== null ? month : dhakaDate.getMonth();
    } else {
        year = dateOrYear;
        monthIndex = month !== null ? month : 0;
    }
    
    return createDhakaDate(year, monthIndex, 1, 0, 0, 0, 0);
}

/**
 * Get last day of month in Dhaka timezone
 * @param {Date|number} dateOrYear - Date object or year number
 * @param {number} month - Month (0-11), optional if dateOrYear is Date
 * @returns {Date} Last day of month in Dhaka timezone
 */
function getDhakaLastDayOfMonth(dateOrYear, month = null) {
    let year, monthIndex;
    
    if (dateOrYear instanceof Date) {
        const dhakaDate = toDhakaTime(dateOrYear);
        year = dhakaDate.getFullYear();
        monthIndex = month !== null ? month : dhakaDate.getMonth();
    } else {
        year = dateOrYear;
        monthIndex = month !== null ? month : 0;
    }
    
    // Get first day of next month, then subtract 1 day
    const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1;
    const nextYear = monthIndex === 11 ? year + 1 : year;
    const firstDayNextMonth = createDhakaDate(nextYear, nextMonth, 1, 0, 0, 0, 0);
    const lastDay = new Date(firstDayNextMonth.getTime() - 1);
    lastDay.setHours(23, 59, 59, 999);
    
    return lastDay;
}

/**
 * Get week number for a date in Dhaka timezone
 * @param {Date} date - Date object (defaults to current Dhaka time)
 * @returns {number} Week number (1-53)
 */
function getDhakaWeekNumber(date = null) {
    const dhakaDate = date ? toDhakaTime(date) : getDhakaNow();
    
    // Get start of year in Dhaka timezone
    const startOfYear = createDhakaDate(dhakaDate.getFullYear(), 0, 1, 0, 0, 0, 0);
    const dayOfWeek = startOfYear.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const mondayOfWeek1 = new Date(startOfYear);
    mondayOfWeek1.setDate(startOfYear.getDate() + daysToMonday);
    mondayOfWeek1.setHours(0, 0, 0, 0);
    
    const dateDay = dhakaDate.getDay();
    const dateDaysToMonday = dateDay === 0 ? -6 : 1 - dateDay;
    const mondayOfDateWeek = new Date(dhakaDate);
    mondayOfDateWeek.setDate(dhakaDate.getDate() + dateDaysToMonday);
    mondayOfDateWeek.setHours(0, 0, 0, 0);
    
    const daysSinceWeek1 = Math.floor((mondayOfDateWeek - mondayOfWeek1) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.floor(daysSinceWeek1 / 7) + 1;
    
    return weekNumber;
}

/**
 * Get week dates (Monday to Sunday) for a week number in Dhaka timezone
 * @param {number} weekNumber - Week number (1-53)
 * @param {number} year - Year
 * @returns {Object} Object with start and end dates
 */
function getDhakaWeekDates(weekNumber, year) {
    const startOfYear = createDhakaDate(year, 0, 1, 0, 0, 0, 0);
    const dayOfWeek = startOfYear.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const mondayOfWeek1 = new Date(startOfYear);
    mondayOfWeek1.setDate(startOfYear.getDate() + daysToMonday);
    
    const weekStart = new Date(mondayOfWeek1);
    weekStart.setDate(mondayOfWeek1.getDate() + (weekNumber - 1) * 7);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { start: weekStart, end: weekEnd };
}

/**
 * Check if a date is within a date range (in Dhaka timezone)
 * @param {Date|string} date - Date to check
 * @param {Date|string} startDate - Start of range
 * @param {Date|string} endDate - End of range
 * @returns {boolean} True if date is within range
 */
function isDhakaDateInRange(date, startDate, endDate) {
    if (!date) return false;
    
    const checkDate = toDhakaTime(date);
    const start = startDate ? toDhakaTime(startDate) : null;
    const end = endDate ? toDhakaTime(endDate) : null;
    
    if (start && checkDate < start) return false;
    if (end && checkDate > end) return false;
    
    return true;
}

