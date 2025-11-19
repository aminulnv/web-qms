/**
 * Environment Utilities
 * Detects if we're in staging/development or production
 * Automatically prefixes table names with 'dev_' in staging
 */

window.Environment = {
  /**
   * Detect if we're in staging/development environment
   * Checks Vercel environment variables or URL patterns
   */
  isStaging() {
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Check if URL contains staging/preview indicators
    const hostname = window.location.hostname;
    const isPreview = hostname.includes('git') || 
                     hostname.includes('staging') ||
                     hostname.includes('dev') ||
                     hostname.includes('preview');
    
    // Check environment variable if available
    const envVar = window.env?.ENVIRONMENT;
    
    if (envVar === 'staging' || envVar === 'preview' || envVar === 'development' || isPreview) {
      return true;
    }
    
    // Default to production
    return false;
  },

  /**
   * Get table name with environment prefix
   * Production: returns original name (e.g., "users")
   * Staging: returns prefixed name (e.g., "dev_users")
   */
  getTableName(tableName) {
    if (this.isStaging()) {
      // Add dev_ prefix for staging
      return `dev_${tableName}`;
    }
    // Return original name for production
    return tableName;
  },

  /**
   * Get environment name for display
   */
  getEnvironmentName() {
    return this.isStaging() ? 'staging' : 'production';
  }
};

// Helper function for easy access
window.getTableName = function(tableName) {
  if (window.Environment && window.Environment.getTableName) {
    return window.Environment.getTableName(tableName);
  }
  return tableName;
};


