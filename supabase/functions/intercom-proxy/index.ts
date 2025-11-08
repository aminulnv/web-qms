// Intercom Proxy Edge Function
// Participation-based filtering: Get conversations where admin actually participated

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const INTERCOM_API_BASE = 'https://api.intercom.io'
const INTERCOM_ACCESS_TOKEN = Deno.env.get('INTERCOM_ACCESS_TOKEN')
if (!INTERCOM_ACCESS_TOKEN) {
  throw new Error('INTERCOM_ACCESS_TOKEN environment variable is required')
}
const MAX_CONVERSATIONS = 150
const EDGE_FUNCTION_TIMEOUT = 60000 // 60 seconds
const BATCH_SIZE = 10 // Process 10 conversations at a time

// Helper function to fetch a single conversation with parts
async function fetchConversationWithParts(conversationId: string): Promise<any | null> {
  try {
    // Fetch conversation with conversation_parts included
    const url = `${INTERCOM_API_BASE}/conversations/${conversationId}?display_as=plaintext`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
        'Accept': 'application/json',
        'Intercom-Version': '2.14',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`  ❌ Failed to fetch conversation ${conversationId}: ${response.status} - ${errorText}`)
      return null
    }

    const data = await response.json()
    
    // Debug: Log if conversation_parts is missing
    if (!data.conversation_parts) {
      console.warn(`  ⚠️  Conversation ${conversationId} has no conversation_parts field`)
    }
    
    return data
  } catch (error) {
    console.error(`  ❌ Error fetching conversation ${conversationId}:`, error.message)
    return null
  }
}

// Helper function to check if conversation has admin participation
function hasAdminParticipation(
  conversation: any,
  adminId: string,
  startTimestamp: number,
  endTimestamp: number
): { hasParticipation: boolean; partCount: number } {
  // Extract conversation parts
  let parts: any[] = []
  if (conversation.conversation_parts) {
    if (Array.isArray(conversation.conversation_parts)) {
      parts = conversation.conversation_parts
    } else if (conversation.conversation_parts.conversation_parts && Array.isArray(conversation.conversation_parts.conversation_parts)) {
      parts = conversation.conversation_parts.conversation_parts
    } else if (conversation.conversation_parts.parts && Array.isArray(conversation.conversation_parts.parts)) {
      parts = conversation.conversation_parts.parts
    }
  }

  let partCount = 0

  for (const part of parts) {
    const author = part.author || {}
    const authorType = author.type
    const authorId = author.id ? String(author.id) : null

    if (!authorId) continue

    // Get created_at timestamp
    let partTimestamp: number | null = null
    if (part.created_at) {
      if (typeof part.created_at === 'number') {
        partTimestamp = part.created_at < 10000000000 
          ? part.created_at 
          : Math.floor(part.created_at / 1000)
      } else {
        partTimestamp = Math.floor(new Date(part.created_at).getTime() / 1000)
      }
    }

    if (!partTimestamp) continue

    // Check if part matches: admin author, correct admin ID, and within date range
    // Compare both as strings and as numbers to handle different formats
    const isAdmin = authorType === 'admin'
    const adminIdStr = String(adminId)
    const adminIdNum = parseInt(adminId, 10)
    const authorIdNum = parseInt(authorId, 10)
    // Check if admin IDs match (as strings or numbers)
    const isTargetAdmin = authorId === adminIdStr || (!isNaN(adminIdNum) && !isNaN(authorIdNum) && authorIdNum === adminIdNum)
    const isInDateRange = partTimestamp >= startTimestamp && partTimestamp <= endTimestamp

    if (isAdmin && isTargetAdmin && isInDateRange) {
      partCount++
    }
  }

  return {
    hasParticipation: partCount > 0,
    partCount
  }
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  const startTime = Date.now()

  try {
    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint')
    const conversationId = url.searchParams.get('conversation_id')
    const adminId = url.searchParams.get('admin_id')
    
    // CONVERSATIONS ENDPOINT - Participation-based filtering
    if (endpoint === 'conversations' && adminId) {
      const updatedDate = url.searchParams.get('updated_date')
      const updatedSince = url.searchParams.get('updated_since')
      const updatedBefore = url.searchParams.get('updated_before')
      
      // Get date range - Intercom API expects Unix timestamps (seconds since epoch)
      let since: number
      let before: number
      
      if (updatedDate) {
        // Parse YYYY-MM-DD and convert to Unix timestamps
        const [year, month, day] = updatedDate.split('-').map(Number)
        // Start of day in UTC: 00:00:00
        const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
        // End of day in UTC: 23:59:59
        const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59))
        // Convert to Unix timestamp (seconds)
        since = Math.floor(start.getTime() / 1000)
        before = Math.floor(end.getTime() / 1000)
      } else if (updatedSince && updatedBefore) {
        // If provided as strings, try to parse them
        // Check if they're already Unix timestamps
        const sinceNum = Number(updatedSince)
        const beforeNum = Number(updatedBefore)
        if (!isNaN(sinceNum) && !isNaN(beforeNum)) {
          since = sinceNum
          before = beforeNum
        } else {
          // Try parsing as date strings
          since = Math.floor(new Date(updatedSince).getTime() / 1000)
          before = Math.floor(new Date(updatedBefore).getTime() / 1000)
        }
      } else {
        // Default: today in UTC
        const today = new Date()
        const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0))
        const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59))
        since = Math.floor(start.getTime() / 1000)
        before = Math.floor(end.getTime() / 1000)
      }

      // Check for pagination cursor (for Search API)
      const startingAfter = url.searchParams.get('starting_after')
      
      console.log(`📞 Starting participation-based search: admin=${adminId}, date=${updatedDate || 'today'}`)
      console.log(`   Date range: ${new Date(since * 1000).toISOString()} to ${new Date(before * 1000).toISOString()}`)
      console.log(`   Unix timestamps: ${since} to ${before}`)
      if (startingAfter) {
        console.log(`   Pagination: starting_after=${startingAfter}`)
      }

      // Step 1: Search for conversation IDs using /conversations/search
      // Intercom Search API expects teammate_ids as a string (not number)
      const adminIdStr = String(adminId)
      
      const searchQuery: any = {
        query: {
          operator: "OR",
          value: [
            {
              operator: "AND",
              value: [
                { field: "teammate_ids", operator: "=", value: adminIdStr },
                { field: "created_at", operator: ">", value: since },
                { field: "created_at", operator: "<", value: before }
              ]
            },
            {
              operator: "AND",
              value: [
                { field: "teammate_ids", operator: "=", value: adminIdStr },
                { field: "updated_at", operator: ">", value: since },
                { field: "updated_at", operator: "<", value: before }
              ]
            }
          ]
        },
        pagination: {
          per_page: MAX_CONVERSATIONS
        }
      }
      
      // Add pagination cursor if provided (Search API pagination)
      if (startingAfter) {
        searchQuery.pagination.starting_after = startingAfter
      }

      const searchUrl = `${INTERCOM_API_BASE}/conversations/search`
      console.log(`🔍 Searching conversations with query...`)
      console.log(`   Query:`, JSON.stringify(searchQuery, null, 2))

      const searchResponse = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Intercom-Version': '2.14',
        },
        body: JSON.stringify(searchQuery),
      })

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text()
        console.error(`❌ Search API error response:`, errorText)
        throw new Error(`Intercom Search API error (${searchResponse.status}): ${errorText}`)
      }

      const searchData = await searchResponse.json()
      let conversationIds = (searchData.conversations || []).map((c: any) => c.id)
      const intercomTotalCount = searchData.total_count || conversationIds.length
      
      // Handle pagination for Search API (if there are more results)
      // Note: Search API pagination uses 'starting_after' cursor in the response
      const searchPages = searchData.pages || {}
      let hasMorePages = false
      let nextCursor = null
      
      if (searchPages.next?.starting_after) {
        nextCursor = searchPages.next.starting_after
        hasMorePages = true
      } else if (searchPages.next?.cursor) {
        nextCursor = searchPages.next.cursor
        hasMorePages = true
      }
      
      // Apply max limit
      conversationIds = conversationIds.slice(0, MAX_CONVERSATIONS)

      console.log(`✅ Found ${conversationIds.length} conversations from search (total: ${intercomTotalCount})`)
      if (hasMorePages) {
        console.log(`   ⚠️  More results available (pagination not fully implemented for Search API)`)
      }

      if (conversationIds.length === 0) {
        return new Response(
          JSON.stringify({
            type: 'conversation.list',
            conversations: [],
            total_count: 0,
            intercom_total_count: intercomTotalCount,
            has_more: false,
            pages: searchData.pages || null,
            admin_id: adminId,
            date: updatedDate || new Date().toISOString().split('T')[0],
            participation_count: 0
          }, null, 2),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        )
      }

      // Step 2: Fetch individual conversations and filter by participation
      console.log(`🔄 Fetching ${conversationIds.length} conversations to check participation...`)
      const conversationsWithParticipation: any[] = []
      let totalParticipationCount = 0
      let processedCount = 0
      let errorCount = 0

      // Process in batches to avoid overwhelming the API
      for (let i = 0; i < conversationIds.length; i += BATCH_SIZE) {
        // Check timeout
        const elapsed = Date.now() - startTime
        if (elapsed > EDGE_FUNCTION_TIMEOUT - 5000) { // Leave 5s buffer
          console.log(`⏰ Timeout approaching (${elapsed}ms), stopping at ${processedCount} conversations`)
          break
        }

        const batch = conversationIds.slice(i, i + BATCH_SIZE)
        console.log(`   Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: conversations ${i + 1}-${Math.min(i + BATCH_SIZE, conversationIds.length)}`)

        // Fetch all conversations in batch in parallel
        const batchPromises = batch.map(id => fetchConversationWithParts(id))
        const batchResults = await Promise.all(batchPromises)

        // Process each conversation
        for (const conversation of batchResults) {
          if (!conversation) {
            errorCount++
            continue
          }

          processedCount++
          // Pass adminId as string for comparison (function expects string)
          const participation = hasAdminParticipation(conversation, String(adminId), since, before)

          if (participation.hasParticipation) {
            totalParticipationCount += participation.partCount
            conversationsWithParticipation.push({
              id: conversation.id,
              created_at: conversation.created_at,
              updated_at: conversation.updated_at,
              created_at_iso: conversation.created_at ? new Date(conversation.created_at * 1000).toISOString() : null,
              updated_at_iso: conversation.updated_at ? new Date(conversation.updated_at * 1000).toISOString() : null,
              participation_part_count: participation.partCount,
              ...conversation
            })
          }
        }

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < conversationIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      const elapsed = Date.now() - startTime
      console.log(`✅ Completed: ${conversationsWithParticipation.length} conversations with participation out of ${processedCount} processed (${errorCount} errors)`)
      console.log(`   Total participation parts: ${totalParticipationCount}`)
      console.log(`   Time elapsed: ${elapsed}ms`)

      if (elapsed > EDGE_FUNCTION_TIMEOUT - 5000) {
        console.log(`⚠️  Warning: Approaching timeout limit (${EDGE_FUNCTION_TIMEOUT}ms)`)
      }

      return new Response(
        JSON.stringify({
          type: 'conversation.list',
          conversations: conversationsWithParticipation,
          total_count: conversationsWithParticipation.length,
          intercom_total_count: intercomTotalCount,
          has_more: hasMorePages || conversationIds.length >= MAX_CONVERSATIONS,
          pages: searchData.pages || null,
          next_cursor: nextCursor,
          admin_id: adminId,
          date: updatedDate || new Date().toISOString().split('T')[0],
          participation_count: totalParticipationCount,
          processed_count: processedCount,
          error_count: errorCount
        }, null, 2),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }
    
    // SINGLE CONVERSATION
    if (conversationId) {
      const displayAs = url.searchParams.get('display_as') || 'plaintext'
      const intercomUrl = `${INTERCOM_API_BASE}/conversations/${conversationId}?display_as=${displayAs}`
      
      const response = await fetch(intercomUrl, {
        headers: {
          'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Intercom API error (${response.status}): ${errorText}`)
      }

      return new Response(JSON.stringify(await response.json()), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
    
    // TEAMS/ADMINS ENDPOINTS
    if (endpoint === 'teams' || endpoint === 'admins') {
      const intercomUrl = `${INTERCOM_API_BASE}/${endpoint}`
      
      const response = await fetch(intercomUrl, {
        headers: {
          'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Intercom API error (${response.status}): ${errorText}`)
      }

      return new Response(JSON.stringify(await response.json()), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
    
    // ERROR: No valid parameters
    return new Response(
      JSON.stringify({ 
        error: 'Missing required parameter: either endpoint=teams, endpoint=admins, endpoint=conversations (with admin_id and optionally updated_date or updated_since/updated_before), or conversation_id must be provided'
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
