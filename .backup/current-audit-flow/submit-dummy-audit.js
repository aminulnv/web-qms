/**
 * Script to submit an audit report with dummy data
 * Run this in the browser console on the create-audit.html page
 * Usage: Just paste this entire script into the browser console and press Enter
 */

(async function submitDummyAudit() {
    console.log('=== Starting Dummy Audit Submission ===');
    
    try {
        // Step 1: Open the manual audit form
        if (typeof window.createManualAudit === 'function') {
            await window.createManualAudit();
            console.log('✓ Opened audit form');
            
            // Wait a bit for the form to render
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.error('createManualAudit function not found');
            return;
        }
        
        // Step 2: Wait for scorecards to load and select the first one
        const scorecardSelect = document.getElementById('scorecardSelect');
        if (!scorecardSelect) {
            console.error('Scorecard select not found');
            return;
        }
        
        // Wait for scorecards to load
        let attempts = 0;
        while ((!scorecardSelect.options || scorecardSelect.options.length <= 1) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }
        
        if (scorecardSelect.options.length <= 1) {
            console.error('No scorecards available');
            return;
        }
        
        // Select first available scorecard (not the "Select a scorecard..." option)
        scorecardSelect.value = scorecardSelect.options[1].value;
        scorecardSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✓ Selected scorecard:', scorecardSelect.options[1].text);
        
        // Wait for parameters to load
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Step 3: Fill in employee information
        const employeeSelect = document.getElementById('employeeName');
        if (employeeSelect && employeeSelect.options.length > 1) {
            // Select first available employee
            employeeSelect.value = employeeSelect.options[1].value;
            employeeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✓ Selected employee:', employeeSelect.options[1].text);
        } else {
            // If no employees, fill manually
            const employeeName = document.getElementById('employeeName');
            const employeeEmail = document.getElementById('employeeEmail');
            const employeeType = document.getElementById('employeeType');
            const countryOfEmployee = document.getElementById('countryOfEmployee');
            
            if (employeeName) employeeName.value = 'John Doe';
            if (employeeEmail) employeeEmail.value = 'john.doe@example.com';
            if (employeeType) employeeType.value = 'Employee';
            if (countryOfEmployee) countryOfEmployee.value = 'Bangladesh';
            console.log('✓ Filled employee info (dummy)');
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 4: Fill interaction details
        const interactionId = document.getElementById('interactionId');
        const interactionDate = document.getElementById('interactionDate');
        const channel = document.getElementById('channel');
        const clientEmail = document.getElementById('clientEmail');
        
        if (interactionId) {
            interactionId.value = 'INT-' + Date.now();
            console.log('✓ Filled interaction ID:', interactionId.value);
        }
        
        if (interactionDate) {
            const today = new Date();
            interactionDate.value = today.toISOString().split('T')[0];
            console.log('✓ Filled interaction date:', interactionDate.value);
        }
        
        if (channel) {
            // Select first available channel option
            if (channel.options && channel.options.length > 1) {
                channel.value = channel.options[1].value;
                channel.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                channel.value = 'FN Email';
            }
            console.log('✓ Selected channel:', channel.value);
        }
        
        if (clientEmail) {
            clientEmail.value = 'client@example.com';
            console.log('✓ Filled client email:', clientEmail.value);
        }
        
        // Step 5: Fill transcript
        const transcript = document.getElementById('transcript');
        if (transcript) {
            transcript.value = `Customer: Hello, I need help with my account.
Agent: Hello! I'd be happy to help you with your account. Could you please provide me with your account number?
Customer: Sure, it's 123456789.
Agent: Thank you. I can see your account. How can I assist you today?
Customer: I want to update my email address.
Agent: I can help you with that. What is your new email address?
Customer: newemail@example.com
Agent: Perfect, I've updated your email address. Is there anything else I can help you with?
Customer: No, that's all. Thank you!
Agent: You're welcome! Have a great day!`;
            console.log('✓ Filled transcript');
        }
        
        // Step 6: Fill audit type and validation status
        const auditType = document.getElementById('auditType');
        const validationStatus = document.getElementById('validationStatus');
        
        if (auditType) {
            auditType.value = 'Routine Audit (Recorded)';
            auditType.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✓ Selected audit type:', auditType.value);
        }
        
        if (validationStatus) {
            validationStatus.value = 'Validated';
            console.log('✓ Selected validation status:', validationStatus.value);
        }
        
        // Step 7: Fill pre/post status
        const agentPreStatus = document.getElementById('agentPreStatus');
        const agentPostStatus = document.getElementById('agentPostStatus');
        
        if (agentPreStatus) {
            agentPreStatus.value = 'No active quality concerns';
            console.log('✓ Selected pre-status:', agentPreStatus.value);
        }
        
        if (agentPostStatus) {
            agentPostStatus.value = 'No active quality concerns';
            console.log('✓ Selected post-status:', agentPostStatus.value);
        }
        
        // Step 8: Fill error parameters (if any exist)
        // This will vary based on the scorecard parameters
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get all error parameter fields
        const errorParametersContainer = document.getElementById('errorParametersContainer');
        if (errorParametersContainer) {
            // Find all counter inputs and radio buttons in the error parameters
            const counterInputs = errorParametersContainer.querySelectorAll('input[type="number"]');
            const radioGroups = errorParametersContainer.querySelectorAll('input[type="radio"]');
            
            // Fill some counters with dummy values (1-2 errors)
            counterInputs.forEach((input, index) => {
                if (index < 3) { // Fill first 3 counters
                    input.value = Math.floor(Math.random() * 2) + 1; // 1 or 2
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log(`✓ Filled counter ${input.id}:`, input.value);
                }
            });
            
            // Select some radio buttons (mix of YES and NO)
            radioGroups.forEach((radio, index) => {
                if (index % 2 === 0 && radio.value === '0') { // Select NO for some
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log(`✓ Selected radio ${radio.name}:`, radio.value);
                }
            });
            
            // Fill feedback fields
            const feedbackTextareas = errorParametersContainer.querySelectorAll('textarea');
            feedbackTextareas.forEach((textarea, index) => {
                if (index < 3 && textarea.value === '') { // Fill first 3 feedback fields
                    textarea.value = `Sample feedback for error parameter ${index + 1}. This is dummy data for testing purposes.`;
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log(`✓ Filled feedback ${textarea.id}`);
                }
            });
        }
        
        // Wait for calculations to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 9: Fill recommendations
        const recommendations = document.getElementById('recommendations');
        if (recommendations) {
            recommendations.value = `Recommendations for improvement:
1. Continue maintaining professional communication standards
2. Ensure all customer information is verified before making changes
3. Follow up with customers to ensure satisfaction

Next Steps:
- Review this audit with the employee
- Provide additional training if needed
- Schedule follow-up audit in next quarter`;
            console.log('✓ Filled recommendations');
        }
        
        // Step 10: Verify form is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 11: Submit the form
        console.log('=== Submitting form ===');
        const auditForm = document.getElementById('auditForm');
        if (auditForm) {
            // Create and dispatch submit event
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            auditForm.dispatchEvent(submitEvent);
            
            console.log('✓ Form submitted!');
            console.log('=== Dummy Audit Submission Complete ===');
        } else {
            console.error('Audit form not found');
        }
        
    } catch (error) {
        console.error('Error submitting dummy audit:', error);
        console.error('Stack:', error.stack);
    }
})();

