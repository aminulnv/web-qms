// Supabase Edge Function to filter conversations and send IDs to n8n webhook
// Receives: Full conversation list
// Filters: Prioritizes low ratings (1-2), then no ratings, up to 10 total
// Creates rows in ai_analysis_results table and sends table IDs to n8n

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const N8N_WEBHOOK_URL = 'https://n8nnextventures.xyz/webhook/4785460e-0bcb-4570-ac6f-a6b43c93a0a2'

interface Conversation {
  id?: string | number
  conversation_id?: string | number
  conversation_rating?: {
    rating?: number | string
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const requestStartTime = Date.now()
  const requestId = crypto.randomUUID()
  
  try {
    console.log('═══════════════════════════════════════════════════════')
    console.log(`🚀 [${requestId}] Starting send-conversations-to-n8n request`)
    console.log(`📅 Timestamp: ${new Date().toISOString()}`)
    console.log(`📡 Method: ${req.method}`)
    console.log('═══════════════════════════════════════════════════════')

    if (req.method !== 'POST') {
      console.error(`❌ [${requestId}] Invalid method: ${req.method} (expected POST)`)
      return new Response(
        JSON.stringify({ success: false, error: 'Only POST method is allowed' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Get conversation list and pull_history_id from request body
    console.log(`📥 [${requestId}] Parsing request body...`)
    const body = await req.json()
    const conversations: Conversation[] = body.conversations || body.conversation_list || []
    const pullHistoryId: string | undefined = body.pull_history_id

    // Enhanced logging of input data
    console.log(`📋 [${requestId}] Input Data Summary:`)
    console.log(`   - Total conversations received: ${conversations?.length || 0}`)
    console.log(`   - pull_history_id: ${pullHistoryId || 'NOT PROVIDED'}`)
    console.log(`   - Body keys: ${Object.keys(body).join(', ')}`)
    
    if (pullHistoryId) {
      console.log(`   ✅ pull_history_id is present: ${pullHistoryId}`)
    } else {
      console.log(`   ⚠️  pull_history_id is missing (this is optional)`)
    }

    if (!Array.isArray(conversations) || conversations.length === 0) {
      console.error(`❌ [${requestId}] Validation failed: No conversations provided`)
      console.error(`   - conversations type: ${typeof conversations}`)
      console.error(`   - conversations length: ${conversations?.length || 'N/A'}`)
      console.error(`   - pull_history_id: ${pullHistoryId || 'NOT PROVIDED'}`)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No conversations provided',
          sent_count: 0,
          request_id: requestId
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Log sample of conversations for debugging
    console.log(`📋 [${requestId}] Sample conversations (first 3):`)
    conversations.slice(0, 3).forEach((conv, idx) => {
      const convId = conv.id || conv.conversation_id || 'MISSING'
      const rating = conv.conversation_rating?.rating || 'NO RATING'
      console.log(`   [${idx + 1}] ID: ${convId}, Rating: ${rating}`)
    })
    
    if (conversations.length > 3) {
      console.log(`   ... and ${conversations.length - 3} more conversations`)
    }

    console.log(`🔄 [${requestId}] Starting filtering process for ${conversations.length} conversations...`)

    // Helper function to get rating from conversation
    function getRating(conversation: Conversation): number | null {
      if (conversation.conversation_rating?.rating) {
        const rating = typeof conversation.conversation_rating.rating === 'string'
          ? parseInt(conversation.conversation_rating.rating, 10)
          : conversation.conversation_rating.rating
        if (!isNaN(rating) && rating >= 1 && rating <= 5) {
          return rating
        }
      }
      return null
    }

    // Separate conversations into two groups: with ratings and without ratings
    console.log(`🔍 [${requestId}] Step 1: Separating conversations by rating...`)
    const conversationsWithRatings: Array<{ conversation: Conversation; rating: number }> = []
    const conversationsWithoutRatings: Conversation[] = []

    for (const conversation of conversations) {
      const rating = getRating(conversation)
      if (rating !== null) {
        conversationsWithRatings.push({ conversation, rating })
      } else {
        conversationsWithoutRatings.push(conversation)
      }
    }

    console.log(`   ✅ Found ${conversationsWithRatings.length} conversations with ratings`)
    console.log(`   ✅ Found ${conversationsWithoutRatings.length} conversations without ratings`)

    // Log rating distribution
    if (conversationsWithRatings.length > 0) {
      const ratingCounts: Record<number, number> = {}
      conversationsWithRatings.forEach(({ rating }) => {
        ratingCounts[rating] = (ratingCounts[rating] || 0) + 1
      })
      console.log(`   📊 Rating distribution:`, ratingCounts)
    }

    // Sort conversations with ratings from lowest to highest (1, 2, 3, 4, 5)
    console.log(`🔄 [${requestId}] Step 2: Sorting rated conversations (lowest to highest)...`)
    conversationsWithRatings.sort((a, b) => a.rating - b.rating)
    
    if (conversationsWithRatings.length > 0) {
      console.log(`   ✅ Sorted ${conversationsWithRatings.length} rated conversations`)
      console.log(`   📋 First 5 rated conversations:`, 
        conversationsWithRatings.slice(0, 5).map(c => ({
          id: c.conversation.id || c.conversation.conversation_id,
          rating: c.rating
        }))
      )
    }

    // Select conversations: first from rated (lowest to highest), then fill with unrated
    console.log(`🎯 [${requestId}] Step 3: Selecting conversations (limit: 10)...`)
    const selectedConversations: Conversation[] = []
    const limit = 10

    // Add rated conversations first (up to limit)
    const ratedToAdd = Math.min(conversationsWithRatings.length, limit)
    console.log(`   📌 Adding ${ratedToAdd} rated conversations (prioritizing lowest ratings)`)
    for (let i = 0; i < ratedToAdd; i++) {
      selectedConversations.push(conversationsWithRatings[i].conversation)
    }

    // Fill remaining slots with unrated conversations
    const remainingSlots = limit - selectedConversations.length
    console.log(`   📌 Remaining slots: ${remainingSlots}`)
    if (remainingSlots > 0 && conversationsWithoutRatings.length > 0) {
      const unratedToAdd = Math.min(remainingSlots, conversationsWithoutRatings.length)
      console.log(`   📌 Adding ${unratedToAdd} unrated conversations`)
      const unratedToAddList = conversationsWithoutRatings.slice(0, unratedToAdd)
      selectedConversations.push(...unratedToAddList)
    }

    console.log(`   ✅ Selected ${selectedConversations.length} conversations total`)
    console.log(`      - Rated: ${ratedToAdd}`)
    console.log(`      - Unrated: ${selectedConversations.length - ratedToAdd}`)

    // Extract conversation IDs
    console.log(`🆔 [${requestId}] Step 4: Extracting conversation IDs...`)
    const conversationIds = selectedConversations
      .map((c, idx) => {
        const id = c.id || c.conversation_id || null
        if (!id) {
          console.warn(`   ⚠️  Conversation at index ${idx} has no ID:`, {
            has_id: !!c.id,
            has_conversation_id: !!c.conversation_id,
            keys: Object.keys(c)
          })
        }
        return id
      })
      .filter(id => id !== null && id !== undefined && id !== '')
      .map(id => String(id))

    if (conversationIds.length === 0) {
      console.error(`❌ [${requestId}] No valid conversation IDs found after filtering`)
      console.error(`   - Selected conversations: ${selectedConversations.length}`)
      console.error(`   - pull_history_id: ${pullHistoryId || 'NOT PROVIDED'}`)
      console.error(`   - Sample conversation structure:`, selectedConversations[0] || 'N/A')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No valid conversation IDs found',
          sent_count: 0,
          request_id: requestId,
          debug_info: {
            selected_conversations_count: selectedConversations.length,
            pull_history_id: pullHistoryId || null
          }
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    console.log(`✅ [${requestId}] Filtering complete!`)
    console.log(`📊 [${requestId}] Summary:`)
    console.log(`   - Input: ${conversations.length} conversations`)
    console.log(`   - With ratings: ${conversationsWithRatings.length}`)
    console.log(`   - Without ratings: ${conversationsWithoutRatings.length}`)
    console.log(`   - Selected: ${selectedConversations.length} conversations`)
    console.log(`   - Final IDs: ${conversationIds.length} conversation IDs`)
    console.log(`📋 [${requestId}] Conversation IDs to send:`, conversationIds)
    console.log(`📎 [${requestId}] pull_history_id: ${pullHistoryId || 'NOT PROVIDED'}`)

    // Step 5: Create rows in ai_analysis_results table and get database-generated IDs
    console.log(`💾 [${requestId}] Step 5: Creating rows in ai_analysis_results table...`)
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`❌ [${requestId}] Missing Supabase configuration`)
      throw new Error('Missing Supabase configuration (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log(`   ✅ Supabase client initialized`)

    // Create rows for each conversation and collect the generated IDs
    const conversationMappings: Array<{ interaction_id: string; table_id: string }> = []
    const insertErrors: Array<{ conversation_id: string; error: string }> = []

    for (const conversationId of conversationIds) {
      try {
        console.log(`   📝 Inserting row for conversation ID: ${conversationId}`)
        
        // Insert row - id and submitted_at will be auto-generated by database
        const { data: insertedRow, error: insertError } = await supabase
          .from('ai_analysis_results')
          .insert({
            interaction_id: String(conversationId),
            pull_history_id: pullHistoryId || null
            // id: auto-generated by database default (gen_random_uuid()::text)
            // submitted_at: auto-generated by database default (now())
          })
          .select('id')
          .single()

        if (insertError) {
          console.error(`   ❌ Failed to insert row for conversation ${conversationId}:`, insertError)
          insertErrors.push({
            conversation_id: String(conversationId),
            error: insertError.message
          })
          continue
        }

        if (!insertedRow || !insertedRow.id) {
          console.error(`   ❌ No ID returned for conversation ${conversationId}`)
          insertErrors.push({
            conversation_id: String(conversationId),
            error: 'No ID returned from database'
          })
          continue
        }

        console.log(`   ✅ Created row with ID: ${insertedRow.id} for conversation: ${conversationId}`)
        conversationMappings.push({
          interaction_id: String(conversationId),
          table_id: insertedRow.id
        })
      } catch (error) {
        console.error(`   ❌ Exception inserting row for conversation ${conversationId}:`, error)
        insertErrors.push({
          conversation_id: String(conversationId),
          error: error?.message || 'Unknown error'
        })
      }
    }

    if (conversationMappings.length === 0) {
      console.error(`❌ [${requestId}] Failed to create any rows in ai_analysis_results`)
      console.error(`   - Errors:`, insertErrors)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create rows in ai_analysis_results table',
          request_id: requestId,
          insert_errors: insertErrors
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    if (insertErrors.length > 0) {
      console.warn(`⚠️  [${requestId}] Some rows failed to insert:`, insertErrors)
      console.warn(`   - Successful: ${conversationMappings.length}`)
      console.warn(`   - Failed: ${insertErrors.length}`)
    }

    console.log(`✅ [${requestId}] Successfully created ${conversationMappings.length} rows in ai_analysis_results`)
    console.log(`📋 [${requestId}] Conversation mappings:`, conversationMappings)

    // Step 5.5: Update pull_history record with filtered conversation IDs and status
    if (pullHistoryId) {
      console.log(`💾 [${requestId}] Step 5.5: Updating pull_history record with filtered conversation IDs...`)
      
      try {
        const filteredConversationIds = conversationMappings.map(m => m.interaction_id)
        
        const { error: updateError } = await supabase
          .from('conversation_pull_history')
          .update({
            ai_audit_conversation_ids: filteredConversationIds,
            ai_audit_status: 'sent'
          })
          .eq('id', pullHistoryId)

        if (updateError) {
          console.error(`   ⚠️  Failed to update pull_history record:`, updateError)
          console.error(`   - Error details:`, {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code
          })
          // Don't fail the whole request if this update fails
        } else {
          console.log(`   ✅ Updated pull_history record (ID: ${pullHistoryId}) with ${filteredConversationIds.length} filtered conversation IDs`)
          console.log(`   📋 Filtered IDs stored:`, filteredConversationIds)
          console.log(`   📊 Status updated to: 'sent'`)
        }
      } catch (error) {
        console.error(`   ⚠️  Exception updating pull_history record:`, error)
        console.error(`   - Error message:`, error?.message)
        // Don't fail the whole request if this update fails
      }
    } else {
      console.log(`   ⚠️  No pull_history_id provided - skipping pull_history update`)
    }

    // Step 6: Prepare n8n webhook request with new payload structure
    console.log(`📤 [${requestId}] Step 6: Preparing n8n webhook request...`)
    
    // Build payload with conversations array (using conversation_id instead of interaction_id) and pull_history_id
    const payload = {
      conversations: conversationMappings.map(m => ({
        conversation_id: m.interaction_id,
        table_id: m.table_id
      })),
      pull_history_id: pullHistoryId || null
    }

    console.log(`📋 [${requestId}] Payload to send to n8n:`)
    console.log(`   - conversations: ${JSON.stringify(payload.conversations, null, 2)}`)
    console.log(`   - pull_history_id: ${pullHistoryId || 'NOT INCLUDED'}`)

    // Send GET request to n8n webhook with client_data as single query parameter
    const queryParams = new URLSearchParams()
    queryParams.append('client_data', JSON.stringify(payload))
    
    const webhookUrl = `${N8N_WEBHOOK_URL}?${queryParams.toString()}`
    console.log(`🔗 [${requestId}] Webhook URL (base): ${N8N_WEBHOOK_URL}`)
    console.log(`🔗 [${requestId}] Full webhook URL: ${webhookUrl}`)
    console.log(`📦 [${requestId}] client_data payload:`, JSON.stringify(payload, null, 2))

    console.log(`🚀 [${requestId}] Step 7: Sending GET request to n8n webhook...`)
    const fetchStartTime = Date.now()
    
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    
    const fetchDuration = Date.now() - fetchStartTime
    console.log(`⏱️  [${requestId}] Fetch completed in ${fetchDuration}ms`)
    console.log(`📡 [${requestId}] Response status: ${response.status} ${response.statusText}`)

    console.log(`📥 [${requestId}] Step 8: Parsing n8n webhook response...`)
    const responseText = await response.text()
    let responseData: any = {}

    try {
      responseData = JSON.parse(responseText)
      console.log(`   ✅ Response parsed as JSON`)
    } catch (e) {
      console.warn(`   ⚠️  Response is not valid JSON, storing as raw text`)
      console.warn(`   📄 Raw response (first 500 chars): ${responseText.substring(0, 500)}`)
      responseData = { raw: responseText, parse_error: e.message }
    }

    if (!response.ok) {
      const totalDuration = Date.now() - requestStartTime
      console.error(`❌ [${requestId}] n8n webhook returned error`)
      console.error(`═══════════════════════════════════════════════════════`)
      console.error(`❌ [${requestId}] ERROR DETAILS:`)
      console.error(`   - Status: ${response.status} ${response.statusText}`)
      console.error(`   - Request ID: ${requestId}`)
      console.error(`   - Total duration: ${totalDuration}ms`)
      console.error(`   - pull_history_id: ${pullHistoryId || 'NOT PROVIDED'}`)
      console.error(`   - Conversations sent: ${conversationMappings.length}`)
      console.error(`   - Conversation mappings:`, conversationMappings)
      console.error(`   - Response body:`, JSON.stringify(responseData, null, 2))
      console.error(`   - Webhook URL: ${webhookUrl}`)
      if (insertErrors.length > 0) {
        console.error(`   - Insert errors:`, insertErrors)
      }
      console.error(`═══════════════════════════════════════════════════════`)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `n8n webhook returned ${response.status}: ${response.statusText}`,
          request_id: requestId,
          webhook_response: responseData,
          sent_payload: payload,
          sent_count: conversationMappings.length,
          insert_errors: insertErrors.length > 0 ? insertErrors : undefined,
          debug_info: {
            webhook_url: webhookUrl,
            fetch_duration_ms: fetchDuration,
            total_duration_ms: totalDuration
          }
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    const totalDuration = Date.now() - requestStartTime
    console.log(`✅ [${requestId}] Successfully sent conversation mappings to n8n!`)
    console.log(`═══════════════════════════════════════════════════════`)
    console.log(`✅ [${requestId}] SUCCESS SUMMARY:`)
    console.log(`   - Request ID: ${requestId}`)
    console.log(`   - Total duration: ${totalDuration}ms`)
    console.log(`   - Fetch duration: ${fetchDuration}ms`)
    console.log(`   - pull_history_id: ${pullHistoryId || 'NOT PROVIDED'}`)
    console.log(`   - Conversations sent: ${conversationMappings.length}`)
    console.log(`   - Conversation mappings:`, JSON.stringify(conversationMappings, null, 2))
    if (insertErrors.length > 0) {
      console.log(`   - Insert errors: ${insertErrors.length}`, insertErrors)
    }
    console.log(`   - n8n response status: ${response.status}`)
    console.log(`   - n8n response data:`, JSON.stringify(responseData, null, 2))
    console.log(`═══════════════════════════════════════════════════════`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conversation mappings sent to n8n webhook successfully',
        sent_payload: payload,
        webhook_response: responseData,
        sent_count: conversationMappings.length,
        filtered_from: conversations.length,
        insert_errors: insertErrors.length > 0 ? insertErrors : undefined,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    const totalDuration = Date.now() - requestStartTime
    console.error(`❌ [${requestId}] EXCEPTION in send-conversations-to-n8n function`)
    console.error(`═══════════════════════════════════════════════════════`)
    console.error(`❌ [${requestId}] EXCEPTION DETAILS:`)
    console.error(`   - Request ID: ${requestId}`)
    console.error(`   - Total duration: ${totalDuration}ms`)
    console.error(`   - Error type: ${error?.constructor?.name || 'Unknown'}`)
    console.error(`   - Error message: ${error?.message || 'No message'}`)
    console.error(`   - Error stack:`, error?.stack || 'No stack trace')
    console.error(`   - Timestamp: ${new Date().toISOString()}`)
    console.error(`═══════════════════════════════════════════════════════`)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error occurred',
        request_id: requestId,
        error_type: error?.constructor?.name || 'Unknown',
        debug_info: {
          total_duration_ms: totalDuration,
          timestamp: new Date().toISOString()
        }
      }),
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

