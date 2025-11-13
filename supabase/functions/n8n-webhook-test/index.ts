// Supabase Edge Function to send conversation IDs to n8n webhook
// Sends: List of conversation IDs (max 10)

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const N8N_WEBHOOK_URL = 'https://n8nnextventures.xyz/webhook/4785460e-0bcb-4570-ac6f-a6b43c93a0a2'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  try {
    // Get conversation IDs from request body (POST) or query parameters (GET)
    let conversationIds: string[] | number[] = []

    if (req.method === 'POST') {
      const body = await req.json()
      conversationIds = body.conversation_ids || body.conversationIds || []
    } else if (req.method === 'GET') {
      const url = new URL(req.url)
      const idsParam = url.searchParams.get('conversation_ids') || url.searchParams.get('conversationIds') || ''
      if (idsParam) {
        try {
          conversationIds = JSON.parse(idsParam)
        } catch {
          conversationIds = idsParam.split(',').map(id => id.trim()).filter(id => id)
        }
      }
    }

    // Ensure it's an array and limit to 10
    if (!Array.isArray(conversationIds)) {
      conversationIds = []
    }
    conversationIds = conversationIds.slice(0, 10)

    // Log the payload for debugging
    console.log('📤 Sending to n8n webhook:', JSON.stringify({ conversation_ids: conversationIds }, null, 2))
    console.log('🔗 Webhook URL:', N8N_WEBHOOK_URL)

    // Send POST request to n8n webhook with conversation IDs
    const payload = {
      conversation_ids: conversationIds
    }

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    let responseData: any = {}

    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = { raw: responseText }
    }

    if (!response.ok) {
      console.error('❌ n8n webhook error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseData,
      })
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `n8n webhook returned ${response.status}: ${response.statusText}`,
          webhook_response: responseData,
          sent_payload: payload,
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

    console.log('✅ Successfully sent to n8n webhook:', responseData)

    return new Response(
        JSON.stringify({
          success: true,
          message: 'Conversation IDs sent to n8n webhook successfully',
          sent_payload: payload,
          webhook_response: responseData,
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
    console.error('❌ Error in n8n-webhook-test function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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

