/**
 * AI Audit Conversations Module
 * Handles running AI audits on conversations from the create audit page
 */

// Helper function to get conversations (handles both direct and window-scoped variables)
function getConversationsToAudit() {
    // Try to access variables directly (they should be in global scope)
    const allConvs = typeof allEmployeeConversations !== 'undefined' ? allEmployeeConversations : window.allEmployeeConversations;
    const rawConvs = typeof rawEmployeeConversations !== 'undefined' ? rawEmployeeConversations : window.rawEmployeeConversations;
    
    // Use filtered conversations if available, otherwise all raw conversations
    if (allConvs && allConvs.length > 0) {
        return allConvs;
    } else if (rawConvs && rawConvs.length > 0) {
        return rawConvs;
    }
    return [];
}

// Helper function to get pull conversations (for Pull Conversations from Intercom section)
function getPullConversationsToAudit() {
    // Try to access pull conversations variables
    const filteredList = typeof pullConversationsFilteredList !== 'undefined' ? pullConversationsFilteredList : window.pullConversationsFilteredList;
    const rawList = typeof pullConversationsList !== 'undefined' ? pullConversationsList : window.pullConversationsList;
    
    // Use filtered list if available, otherwise raw list
    if (filteredList && filteredList.length > 0) {
        return filteredList;
    } else if (rawList && rawList.length > 0) {
        return rawList;
    }
    return [];
}

// Run AI Audit on conversations
window.runAIAudit = async function() {
    // Get conversations to audit
    const conversationsToAudit = getConversationsToAudit();
    
    if (conversationsToAudit.length === 0) {
        await window.confirmationDialog?.show({
            title: 'No Conversations',
            message: 'No conversations available to audit. Please load conversations first.',
            confirmText: 'OK',
            type: 'warning'
        });
        return;
    }
    
    // Show confirmation dialog
    const confirmed = await window.confirmationDialog?.show({
        title: 'Run AI Audit',
        message: `This will run AI audit on ${conversationsToAudit.length} conversation(s). Do you want to continue?`,
        confirmText: 'Run Audit',
        cancelText: 'Cancel',
        type: 'info'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        console.log('🚀 Running AI audit on', conversationsToAudit.length, 'conversations');
        
        // TODO: Implement AI audit logic here
        // This could:
        // 1. Batch process conversations
        // 2. Call an API endpoint for AI audit
        // 3. Show progress indicator
        // 4. Display results
        
        // For now, show a placeholder message
        await window.confirmationDialog?.show({
            title: 'AI Audit Started',
            message: `AI audit has been initiated for ${conversationsToAudit.length} conversation(s). This feature is under development.`,
            confirmText: 'OK',
            type: 'info'
        });
        
    } catch (error) {
        console.error('Error running AI audit:', error);
        await window.confirmationDialog?.show({
            title: 'Error',
            message: 'Failed to run AI audit: ' + (error.message || 'Unknown error'),
            confirmText: 'OK',
            type: 'error'
        });
    }
};

// Run AI Audit for Pull Conversations (from Intercom section)
window.runAIAuditForPullConversations = async function() {
    // Get pull conversations to audit
    const conversationsToAudit = getPullConversationsToAudit();
    
    if (conversationsToAudit.length === 0) {
        await window.confirmationDialog?.show({
            title: 'No Conversations',
            message: 'No conversations available to audit. Please load conversations first.',
            confirmText: 'OK',
            type: 'warning'
        });
        return;
    }
    
    // Show confirmation dialog
    const confirmed = await window.confirmationDialog?.show({
        title: 'Run AI Audit',
        message: `This will run AI audit on ${conversationsToAudit.length} conversation(s). Do you want to continue?`,
        confirmText: 'Run Audit',
        cancelText: 'Cancel',
        type: 'info'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        console.log('🚀 Running AI audit on', conversationsToAudit.length, 'pull conversations');
        
        // TODO: Implement AI audit logic here
        // This could:
        // 1. Batch process conversations
        // 2. Call an API endpoint for AI audit
        // 3. Show progress indicator
        // 4. Display results
        
        // For now, show a placeholder message
        await window.confirmationDialog?.show({
            title: 'AI Audit Started',
            message: `AI audit has been initiated for ${conversationsToAudit.length} conversation(s). This feature is under development.`,
            confirmText: 'OK',
            type: 'info'
        });
        
    } catch (error) {
        console.error('Error running AI audit:', error);
        await window.confirmationDialog?.show({
            title: 'Error',
            message: 'Failed to run AI audit: ' + (error.message || 'Unknown error'),
            confirmText: 'OK',
            type: 'error'
        });
    }
};

