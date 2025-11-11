# Intercom Conversation Fetching & Participation Calculation

## Overview

This document explains how we fetch conversations from Intercom and calculate admin participation using a Supabase Edge Function that acts as a proxy to the Intercom API.

**TLDR:** Frontend calls edge function → Edge function searches Intercom → Fetches conversations → Filters by actual participation → Returns results with metrics.

## Architecture

```
Frontend (admin-conversations.js)
    ↓
Supabase Edge Function (intercom-proxy)
    ↓
Intercom API (Search API + Individual Conversation API)
```

**TLDR:** Simple 3-layer architecture: Frontend → Edge Function → Intercom API.

## Edge Function Endpoints

The edge function (`supabase/functions/intercom-proxy/index.ts`) supports these endpoints:

1. **Get Conversations with Participation**: `endpoint=conversations&admin_id={id}&updated_date={date}`
2. **Get Single Conversation**: `conversation_id={id}&display_as={html|plaintext}`
3. **Get Admins**: `endpoint=admins`
4. **Get Teams**: `endpoint=teams`

**TLDR:** Four main endpoints - conversations (with participation), single conversation, admins, and teams.

## How It Works: Participation-Based Filtering

### Step 1: Search for Conversation IDs

The edge function uses Intercom's Search API to find conversations where an admin was assigned.

**TLDR:** Search Intercom for conversations where admin is in `teammate_ids` and conversation was created or updated on the selected date.

**cURL Example:**
```bash
curl -X POST "https://api.intercom.io/conversations/search" \
  -H "Authorization: Bearer YOUR_INTERCOM_ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Intercom-Version: 2.14" \
  -d '{
    "query": {
      "operator": "OR",
      "value": [
        {
          "operator": "AND",
          "value": [
            { "field": "teammate_ids", "operator": "=", "value": "6522653" },
            { "field": "created_at", "operator": ">", "value": 1762740000 },
            { "field": "created_at", "operator": "<", "value": 1762826399 }
          ]
        },
        {
          "operator": "AND",
          "value": [
            { "field": "teammate_ids", "operator": "=", "value": "6522653" },
            { "field": "updated_at", "operator": ">", "value": 1762740000 },
            { "field": "updated_at", "operator": "<", "value": 1762826399 }
          ]
        }
      ]
    },
    "pagination": {
      "per_page": 150
    }
  }'
```

**What this does:**
- Finds conversations where admin ID is in `teammate_ids`
- Filters by date: conversations created OR updated on the date
- Returns up to 150 conversation IDs

**Response:**
```json
{
  "conversations": [
    { "id": "215471689565896" },
    { "id": "215471675148327" }
  ],
  "total_count": 25
}
```

### Step 2: Fetch Individual Conversations

For each conversation ID, fetch the full conversation with all message parts.

**TLDR:** Get full conversation data including all messages/parts for each ID found in Step 1.

**cURL Example:**
```bash
curl -X GET "https://api.intercom.io/conversations/215471689565896?display_as=html" \
  -H "Authorization: Bearer YOUR_INTERCOM_ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -H "Intercom-Version: 2.14"
```

**Response Structure:**
```json
{
  "id": "215471689565896",
  "conversation_parts": {
    "conversation_parts": [
      {
        "id": "33672220370",
        "part_type": "comment",
        "body": "<p>Hello...</p>",
        "created_at": 1762748354,
        "author": {
          "id": "8742044",
          "type": "admin",
          "name": "Emma Sinclair"
        }
      }
    ]
  }
}
```

### Step 3: Calculate Participation

Analyze each conversation's parts to find where the admin actually participated.

**TLDR:** Count conversation parts where: author is admin, admin ID matches, and part was created on the selected date.

**Participation Rules:**

A part counts as participation if ALL are true:
1. `author.type === "admin"`
2. `author.id === adminId`
3. `created_at` is within the date range

**Example:**
```javascript
// Conversation part:
{
  "author": {
    "type": "admin",
    "id": "8742044"
  },
  "created_at": 1762748354  // Within date range
}

// Check:
// ✅ author.type === "admin"
// ✅ author.id === "8742044" (matches adminId)
// ✅ created_at is within date range
// Result: Counts as 1 participation part
```

**What doesn't count:**
- Parts from users/contacts
- Parts from bots/AI
- Parts from other admins
- Parts outside the date range

### Step 4: Return Filtered Results

Return only conversations where admin participated, with participation metrics.

**TLDR:** Return conversations with participation, plus total counts and metrics.

**Response:**
```json
{
  "conversations": [
    {
      "id": "215471689565896",
      "participation_part_count": 3,
      "conversation_parts": { ... }
    }
  ],
  "total_count": 15,
  "intercom_total_count": 25,
  "participation_count": 42,
  "admin_id": "8742044",
  "date": "2025-11-10"
}
```

**Response Fields:**
- `conversations`: Conversations where admin participated
- `total_count`: Number of conversations with participation
- `intercom_total_count`: Total conversations found by search (before filtering)
- `participation_count`: Total parts created by admin across all conversations
- `participation_part_count`: Parts created by admin in each conversation

## Complete cURL Examples

### Get Conversations for an Admin (via Edge Function)

**TLDR:** Call edge function with admin ID and date to get conversations with participation.

```bash
curl -X GET "https://YOUR_SUPABASE_URL/functions/v1/intercom-proxy?endpoint=conversations&admin_id=8742044&updated_date=2025-11-10" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Accept: application/json"
```

**Parameters:**
- `endpoint=conversations`: Use conversations endpoint
- `admin_id=8742044`: Admin ID to filter by
- `updated_date=2025-11-10`: Date in YYYY-MM-DD format

### Get Single Conversation (via Edge Function)

**TLDR:** Get full conversation data including all parts and images.

```bash
curl -X GET "https://YOUR_SUPABASE_URL/functions/v1/intercom-proxy?conversation_id=215471689565896&display_as=html" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Accept: application/json"
```

**Parameters:**
- `conversation_id=215471689565896`: Conversation ID
- `display_as=html`: Return HTML format (or `plaintext` for text)

### Direct Intercom API Calls (for reference)

**TLDR:** These are the underlying Intercom API calls the edge function makes.

**Search Conversations:**
```bash
curl -X POST "https://api.intercom.io/conversations/search" \
  -H "Authorization: Bearer YOUR_INTERCOM_ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Intercom-Version: 2.14" \
  -d '{
    "query": {
      "operator": "OR",
      "value": [
        {
          "operator": "AND",
          "value": [
            { "field": "teammate_ids", "operator": "=", "value": "8742044" },
            { "field": "created_at", "operator": ">", "value": 1762740000 },
            { "field": "created_at", "operator": "<", "value": 1762826399 }
          ]
        },
        {
          "operator": "AND",
          "value": [
            { "field": "teammate_ids", "operator": "=", "value": "8742044" },
            { "field": "updated_at", "operator": ">", "value": 1762740000 },
            { "field": "updated_at", "operator": "<", "value": 1762826399 }
          ]
        }
      ]
    },
    "pagination": {
      "per_page": 150
    }
  }'
```

**Get Single Conversation:**
```bash
curl -X GET "https://api.intercom.io/conversations/215471689565896?display_as=html" \
  -H "Authorization: Bearer YOUR_INTERCOM_ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -H "Intercom-Version: 2.14"
```

## Participation Calculation Example

**TLDR:** Count admin's message parts within date range to determine participation.

**Scenario:**
- Admin ID: `8742044`
- Date: `2025-11-10`
- Conversation ID: `215471689565896`

**Conversation Parts:**
1. Bot message (`author.type = "bot"`) → ❌ Not participation
2. User message (`author.type = "user"`) → ❌ Not participation
3. Admin message (`author.type = "admin"`, `author.id = "8742044"`, `created_at = 1762748354`) → ✅ Participation (1 part)
4. Admin message (`author.type = "admin"`, `author.id = "8742044"`, `created_at = 1762748805`) → ✅ Participation (1 part)
5. Admin message (`author.type = "admin"`, `author.id = "8742044"`, `created_at = 1762749362`) → ✅ Participation (1 part)

**Result:**
- `participation_part_count = 3` (admin created 3 parts in this conversation)
- Conversation is included in results
- Total `participation_count` increases by 3

## Date Range Handling

**TLDR:** Convert date string to Unix timestamps (seconds) for start and end of day in UTC.

**Input:** `updated_date=2025-11-10`

**Conversion:**
```javascript
// Start of day: 2025-11-10 00:00:00 UTC
since = 1762740000  // Unix timestamp (seconds)

// End of day: 2025-11-10 23:59:59 UTC
before = 1762826399  // Unix timestamp (seconds)
```

**Why UTC?** Intercom API uses UTC timestamps, ensuring consistent filtering regardless of server timezone.

## Performance Optimizations

**TLDR:** Process conversations in batches of 10, with 100ms delays, and 60-second timeout protection.

**Batch Processing:**
- Process 10 conversations at a time in parallel
- 100ms delay between batches to avoid rate limiting
- 60-second timeout protection

## Pagination

**TLDR:** Use `starting_after` cursor from response to get next page of results.

**First Page:**
```bash
# No starting_after parameter
curl ... "?endpoint=conversations&admin_id=8742044&updated_date=2025-11-10"
```

**Next Page:**
```bash
# Add starting_after from previous response
curl ... "?endpoint=conversations&admin_id=8742044&updated_date=2025-11-10&starting_after=WzE3NjI2MTI5OTAwMDAsMjE1NDcxNjc1MDg5MTEzLDJd"
```

**Response includes:**
```json
{
  "has_more": true,
  "next_cursor": "WzE3NjI2MTI5OTAwMDAsMjE1NDcxNjc1MDg5MTEzLDJd"
}
```

## Frontend Integration

**TLDR:** Call edge function, handle pagination, and display results with participation metrics.

**Basic Call:**
```javascript
const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/intercom-proxy?endpoint=conversations&admin_id=${adminId}&updated_date=${date}`;

const response = await fetch(edgeFunctionUrl, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
    'Accept': 'application/json'
  }
});

const data = await response.json();
// data.conversations - Array of conversations with participation
// data.participation_count - Total parts created by admin
// data.intercom_total_count - Total conversations found by search
```

**With Pagination:**
```javascript
let allConversations = [];
let hasMore = true;
let startingAfter = null;

while (hasMore) {
  let url = `${SUPABASE_URL}/functions/v1/intercom-proxy?endpoint=conversations&admin_id=${adminId}&updated_date=${date}`;
  
  if (startingAfter) {
    url += `&starting_after=${encodeURIComponent(startingAfter)}`;
  }
  
  const response = await fetch(url, { ... });
  const data = await response.json();
  
  allConversations.push(...data.conversations);
  hasMore = data.has_more;
  startingAfter = data.next_cursor;
}
```

## Summary

**TLDR:** Search → Fetch → Filter → Return. Only conversations where admin actually created parts on the date are returned.

**Process:**
1. **Search**: Find conversations where admin is assigned (by `teammate_ids`)
2. **Fetch**: Get full conversation data for each ID
3. **Filter**: Count parts where admin actually participated
4. **Return**: Return conversations with participation + metrics

**Key Insight:** Being assigned to a conversation doesn't mean participation. We only count conversations where the admin actually created message parts within the date range.
