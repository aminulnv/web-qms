// AI Audit Batch Proxy Edge Function
// Proxies requests to n8n webhook to avoid CORS issues

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL') || 'https://qaatsaas.app.n8n.cloud/webhook/ai-audit-batch'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the payload from the request
    const payload = await req.json()
    
    console.log('📤 Received AI Audit batch request:', {
      batch_id: payload.batch_id,
      conversations_count: payload.conversations?.length || 0,
      callback_url: payload.callback_url
    })
    
    // Log the full payload for debugging (but truncate if too large)
    const payloadStr = JSON.stringify(payload, null, 2)
    if (payloadStr.length > 5000) {
      console.log('📋 Payload (truncated):', payloadStr.substring(0, 5000) + '...')
    } else {
      console.log('📋 Full payload:', payloadStr)
    }
    
    // Forward the request to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ n8n webhook error:', response.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `n8n webhook error (${response.status}): ${errorText}`,
          status: response.status
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    const result = await response.json()
    console.log('✅ AI Audit batch submitted successfully to n8n:', result)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        batch_id: payload.batch_id,
        result: result
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('❌ Error in AI Audit batch proxy:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

