# Edge Function Fix Required - URGENT

## Problem - CONFIRMED
The `intercom-proxy` Edge Function is **stripping out** the `email_message_metadata` field from Intercom API responses. 

**Evidence:**
- The Intercom API returns `email_message_metadata` for email parts (confirmed via Postman and direct API calls)
- The Edge Function response shows parts with only these keys: `['type', 'id', 'part_type', 'body', 'created_at', 'updated_at', 'notified_at', 'assigned_to', 'author', 'attachments', 'external_id', 'redacted']`
- The `email_message_metadata` field is **completely missing** from the response
- This prevents email parts from being detected and displayed with proper email formatting

**Affected Parts:**
- Part `32842906801` (part_type: "open") - User email - MISSING `email_message_metadata`
- Part `32842914590` (part_type: "comment") - Admin email - MISSING `email_message_metadata`

## Current Issue
When fetching conversations, parts with `part_type: "open"` that are email interactions are missing the `email_message_metadata` field, which contains:
- `subject`: Email subject line
- `email_address_headers`: Array with `from`, `to`, and `reply_to` information

## Solution
Update the `intercom-proxy` Edge Function to ensure it requests and returns ALL fields from the Intercom API.

### Intercom API Endpoint
The Edge Function should be calling:
```
GET https://api.intercom.io/conversations/{conversation_id}
```

### Required Changes - CRITICAL

**The Edge Function is currently filtering/removing fields from the response. It must be updated to return ALL fields.**

1. **Check for field filtering**: The Edge Function is likely using `JSON.parse(JSON.stringify())` or similar operations that strip out fields, OR it's explicitly filtering fields. **Remove any field filtering logic.**

2. **Verify the API call**: The Edge Function should be making a request like:
   ```javascript
   const response = await fetch(`https://api.intercom.io/conversations/${conversationId}`, {
     headers: {
       'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
       'Accept': 'application/json',
       'Intercom-Version': '2.11' // or latest version
     }
   });
   const conversation = await response.json();
   ```

3. **Return complete data WITHOUT filtering**: The Edge Function must return the FULL conversation object with ALL fields intact:
   ```javascript
   // ❌ WRONG - This strips out fields:
   const filtered = {
     type: conversation.type,
     id: conversation.id,
     // ... only selected fields
   };
   
   // ✅ CORRECT - Return everything:
   return new Response(JSON.stringify(conversation), {
     headers: { 'Content-Type': 'application/json' }
   });
   ```

4. **Check for JSON serialization issues**: If using any JSON manipulation, ensure it preserves all fields:
   ```javascript
   // ❌ WRONG - This might strip fields:
   const clean = JSON.parse(JSON.stringify(conversation, (key, value) => {
     // Any filtering logic here removes fields
   }));
   
   // ✅ CORRECT - No filtering:
   const clean = JSON.parse(JSON.stringify(conversation));
   ```

5. **Verify nested objects**: Ensure `conversation_parts.conversation_parts[]` array items include ALL fields, especially `email_message_metadata`.

## Testing
After updating the Edge Function:
1. Deploy the updated function
2. Test with conversation ID: `215471462705191`
3. **Verify in browser console** that the response includes `email_message_metadata`:
   ```javascript
   // In browser console after loading conversation:
   const part = conversation.conversation_parts.conversation_parts.find(p => p.id === '32842906801');
   console.log('Has email_message_metadata?', 'email_message_metadata' in part);
   console.log('email_message_metadata:', part.email_message_metadata);
   ```
4. Verify that part `32842906801` includes `email_message_metadata` with:
   - `subject`: "Re: Re: CFD / Forex"
   - `email_address_headers`: Array with from/to information
5. Verify that part `32842914590` includes `email_message_metadata` with:
   - `subject`: "Re: CFD / Forex"
   - `email_address_headers`: Array with from/to/reply_to information

## Expected Response Structure
The part should include:
```json
{
  "id": "32842906801",
  "part_type": "open",
  "body": "...",
  "email_message_metadata": {
    "subject": "Re: Re: CFD / Forex",
    "email_address_headers": [
      {
        "type": "from",
        "name": "Khalid Alabdullah",
        "email_address": "itskhali_d@web.de"
      },
      {
        "type": "to",
        "name": "Mark from FundedNext",
        "email_address": "support@fundednext.com"
      }
    ]
  },
  ...
}
```

## Current Workaround
Until the Edge Function is fixed, email parts with `part_type: "open"` will not be displayed with email formatting, as the `email_message_metadata` field is missing from the API response.

