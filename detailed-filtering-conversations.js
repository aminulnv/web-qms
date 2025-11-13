/**
 * Detailed Filtering Conversations Module
 * Handles detailed filtering options for conversations from the create audit page
 */

// Run Detailed Filtering
window.runDetailedFiltering = function() {
    // Try to access the function directly or from window
    const openFilterDialog = typeof openConversationsFilterDialog !== 'undefined' 
        ? openConversationsFilterDialog 
        : window.openConversationsFilterDialog;
    
    if (typeof openFilterDialog === 'function') {
        openFilterDialog();
    } else {
        console.error('openConversationsFilterDialog function not found');
        // Fallback: try to find and show the filter modal directly
        const modal = document.getElementById('conversationsFilterModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            if (window.confirmationDialog) {
                window.confirmationDialog.show({
                    title: 'Filter Not Available',
                    message: 'Filter dialog not available. Please ensure conversations are loaded first.',
                    confirmText: 'OK',
                    type: 'warning'
                });
            } else {
                alert('Filter dialog not available. Please ensure conversations are loaded first.');
            }
        }
    }
};

// Run Detailed Filtering for Pull Conversations (from Intercom section)
window.runDetailedFilteringForPullConversations = function() {
    // Try to access the pull conversations filter dialog function
    const openFilterDialog = typeof openPullConversationsFilterDialog !== 'undefined' 
        ? openPullConversationsFilterDialog 
        : window.openPullConversationsFilterDialog;
    
    if (typeof openFilterDialog === 'function') {
        openFilterDialog();
    } else {
        console.error('openPullConversationsFilterDialog function not found');
        // Fallback: try to find and show the filter modal directly
        const modal = document.getElementById('pullConversationsFilterModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            if (window.confirmationDialog) {
                window.confirmationDialog.show({
                    title: 'Filter Not Available',
                    message: 'Filter dialog not available. Please ensure conversations are loaded first.',
                    confirmText: 'OK',
                    type: 'warning'
                });
            } else {
                alert('Filter dialog not available. Please ensure conversations are loaded first.');
            }
        }
    }
};

