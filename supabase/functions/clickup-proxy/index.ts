// ClickUp Proxy Edge Function
// Handles creating tasks in ClickUp and fetching tasks for public viewing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2'
const CLICKUP_API_TOKEN = Deno.env.get('CLICKUP_API_TOKEN')
if (!CLICKUP_API_TOKEN) {
  throw new Error('CLICKUP_API_TOKEN environment variable is required')
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-goog-api-key, content-type',
      },
    })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // Create task in ClickUp
    if (action === 'create-task' && req.method === 'POST') {
      const body = await req.json()
      const { listId, title, description, status, priority, tags } = body

      if (!listId) {
        return new Response(
          JSON.stringify({ error: 'listId is required' }),
          { 
            status: 400, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            } 
          }
        )
      }

      // Build task payload
      const taskPayload: any = {
        name: title,
        description: description || '',
        status: status || 'to do',
        priority: priority || null,
        assignees: [],
        tags: tags || [],
        check_required_custom_fields: false,
      }

      const clickupUrl = `${CLICKUP_API_BASE}/list/${listId}/task`
      
      const response = await fetch(clickupUrl, {
        method: 'POST',
        headers: {
          'Authorization': CLICKUP_API_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskPayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('ClickUp API error:', response.status, errorText)
        throw new Error(`ClickUp API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Get tasks from a list (for public viewing)
    if (action === 'get-tasks' && req.method === 'GET') {
      const listId = url.searchParams.get('listId')
      const archived = url.searchParams.get('archived') || 'false'
      
      if (!listId) {
        return new Response(
          JSON.stringify({ error: 'listId is required' }),
          { 
            status: 400, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            } 
          }
        )
      }

      const clickupUrl = `${CLICKUP_API_BASE}/list/${listId}/task?archived=${archived}&include_closed=true`
      
      const response = await fetch(clickupUrl, {
        method: 'GET',
        headers: {
          'Authorization': CLICKUP_API_TOKEN,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('ClickUp API error:', response.status, errorText)
        throw new Error(`ClickUp API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Upload attachment to task
    if (action === 'upload-attachment' && req.method === 'POST') {
      const taskId = url.searchParams.get('taskId')
      
      if (!taskId) {
        return new Response(
          JSON.stringify({ error: 'taskId is required' }),
          { 
            status: 400, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            } 
          }
        )
      }

      const formData = await req.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'file is required' }),
          { 
            status: 400, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            } 
          }
        )
      }

      const clickupUrl = `${CLICKUP_API_BASE}/task/${taskId}/attachment`
      
      const uploadFormData = new FormData()
      uploadFormData.append('attachment', file)

      const response = await fetch(clickupUrl, {
        method: 'POST',
        headers: {
          'Authorization': CLICKUP_API_TOKEN,
        },
        body: uploadFormData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('ClickUp API error:', response.status, errorText)
        throw new Error(`ClickUp API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action or method' }),
      { 
        status: 400, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  }
})

