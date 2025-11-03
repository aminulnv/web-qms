// Intercom API Configuration
// Reads configuration from environment variables via window.env
// Make sure env-config.js is loaded before this file
if (typeof window.env === 'undefined') {
    console.error('Error: window.env is not defined. Make sure env-config.js is loaded before intercom-config.js');
}

window.intercomConfig = {
    // Your Intercom Personal Access Token
    // Get it from: https://app.intercom.com/a/apps/_/settings/api
    accessToken: window.env?.INTERCOM_ACCESS_TOKEN || '',
    
    // API Base URL
    apiBaseUrl: window.env?.INTERCOM_API_BASE_URL || 'https://api.intercom.io',
    
    // App ID (optional, for UI links)
    appId: window.env?.INTERCOM_APP_ID || ''
};

// Validate configuration
if (!window.intercomConfig.accessToken) {
    console.warn('Warning: INTERCOM_ACCESS_TOKEN is not set in environment variables');
}

