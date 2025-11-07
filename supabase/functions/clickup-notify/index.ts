// Supabase Edge Function to send ClickUp chat notifications
// This function handles sending audit assignment notifications to employees via ClickUp chat

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLICKUP_API_URL = 'https://api.clickup.com/api/v2'
const CLICKUP_API_V3_URL = 'https://api.clickup.com/api/v3'
const CLICKUP_API_TOKEN = Deno.env.get('CLICKUP_API_TOKEN') || ''
const CLICKUP_WORKSPACE_ID = '3480971' // From the MCP response

interface AuditNotification {
  employee_email: string
  employee_name: string
  auditor_emails: string[]
  audit_count: number
  week: number
}

interface RequestBody {
  channel_id: string
  audits: AuditNotification[]
  all_users: Array<{ email: string; name: string }>
}

interface ClickUpUser {
  id: number
  username: string
  email: string
  color: string
  profilePicture: string
  initials: string
}

serve(async (req) => {
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

  try {
    if (!CLICKUP_API_TOKEN) {
      console.error('CLICKUP_API_TOKEN is not set!')
      throw new Error('CLICKUP_API_TOKEN environment variable is not set')
    }
    
    console.log('ClickUp API token is set (length:', CLICKUP_API_TOKEN.length, ')')

    const body: RequestBody = await req.json()
    const { channel_id, audits, all_users } = body

    if (!channel_id || !audits || audits.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: channel_id and audits' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const results = []
    const userMap = new Map(all_users.map(u => [u.email, u.name]))

    // Get all ClickUp workspace members once (more efficient)
    // ClickUp API: GET /team returns teams, we need to get members from workspace
    let allClickUpMembers: any[] = []
    try {
      // First get teams to find workspace
      const teamsResponse = await fetch(
        `${CLICKUP_API_URL}/team`,
        {
          headers: {
            'Authorization': CLICKUP_API_TOKEN,
            'Content-Type': 'application/json',
          },
        }
      )

      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json()
        const teams = teamsData.teams || []
        
        console.log(`Found ${teams.length} teams in ClickUp workspace`)
        
        // Get members from each team
        for (const team of teams) {
          if (team.members && Array.isArray(team.members)) {
            console.log(`Team ${team.id} has ${team.members.length} members`)
            allClickUpMembers = allClickUpMembers.concat(team.members)
          }
        }
        
        console.log(`Total ClickUp members found: ${allClickUpMembers.length}`)
      } else {
        const errorText = await teamsResponse.text()
        console.warn('Failed to fetch ClickUp teams:', teamsResponse.status, teamsResponse.statusText, errorText)
      }
    } catch (error) {
      console.warn('Error fetching ClickUp workspace members:', error)
    }

    // Process each employee's audit notification
    for (const audit of audits) {
      try {
        // Find ClickUp user by email from cached members
        console.log(`Looking for ClickUp user with email: ${audit.employee_email}`)
        const clickupUser = findUserByEmail(allClickUpMembers, audit.employee_email)

        if (!clickupUser) {
          console.warn(`ClickUp user not found for email: ${audit.employee_email}. Total members searched: ${allClickUpMembers.length}`)
          results.push({
            employee_email: audit.employee_email,
            status: 'skipped',
            reason: 'User not found in ClickUp'
          })
          continue
        }
        
        console.log(`Found ClickUp user: ${clickupUser.name} (ID: ${clickupUser.id}) for ${audit.employee_email}`)

        // Get auditor names
        const auditorNames = audit.auditor_emails.map(email => userMap.get(email) || email)
        const auditorList = auditorNames.length > 0 
          ? auditorNames.join(', ') 
          : 'assigned auditor'

        // Create notification message
        const message = `📋 **Audit Assignment Notification**

Hi ${audit.employee_name || 'there'},

You have been assigned ${audit.audit_count} audit${audit.audit_count > 1 ? 's' : ''} for quality review.

**Details:**
- **Auditor(s):** ${auditorList}
- **Number of Audits:** ${audit.audit_count}
- **Week:** ${audit.week}

Please check your audit dashboard for more details.`

        // Send message to ClickUp channel using v2 API (more stable)
        // v2 API format: POST /api/v2/chat/channel/{channel_id}/message
        const messagePayload: any = {
          content: message,
          notify_all: false
        }
        
        // Add assignee if user ID is available (v2 API uses assignee as number)
        if (clickupUser.id) {
          messagePayload.assignee = clickupUser.id
        }

        console.log(`Sending message to ClickUp channel ${channel_id} for ${audit.employee_email}`)
        console.log('Message payload:', JSON.stringify(messagePayload, null, 2))

        const messageResponse = await fetch(
          `${CLICKUP_API_URL}/chat/channel/${channel_id}/message`,
          {
            method: 'POST',
            headers: {
              'Authorization': CLICKUP_API_TOKEN,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messagePayload),
          }
        )
        
        console.log(`ClickUp API response status: ${messageResponse.status} ${messageResponse.statusText}`)

        const responseText = await messageResponse.text()
        console.log(`ClickUp API response body: ${responseText.substring(0, 500)}`)
        
        if (!messageResponse.ok) {
          let errorData = {}
          try {
            errorData = JSON.parse(responseText)
          } catch (e) {
            errorData = { raw: responseText }
          }
          console.error(`ClickUp API error for ${audit.employee_email}:`, {
            status: messageResponse.status,
            statusText: messageResponse.statusText,
            error: errorData,
            url: `${CLICKUP_API_URL}/chat/channel/${channel_id}/message`
          })
          throw new Error(`Failed to send message (${messageResponse.status}): ${messageResponse.statusText} - ${JSON.stringify(errorData)}`)
        }

        let messageData = {}
        try {
          messageData = JSON.parse(responseText)
          console.log('Message sent successfully:', messageData)
        } catch (e) {
          console.warn('Could not parse response as JSON:', responseText)
          messageData = { raw: responseText }
        }
        
        results.push({
          employee_email: audit.employee_email,
          status: 'sent',
          message_id: messageData.message_id || messageData.message?.id || messageData.id || 'unknown'
        })

      } catch (error) {
        console.error(`Error processing notification for ${audit.employee_email}:`, error)
        results.push({
          employee_email: audit.employee_email,
          status: 'error',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total: audits.length,
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'error').length,
        skipped: results.filter(r => r.status === 'skipped').length
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      }
    )

  } catch (error) {
    console.error('Error in clickup-notify function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      }
    )
  }
})

function findUserByEmail(members: any[], email: string): ClickUpUser | null {
  for (const member of members) {
    const user = member.user || member
    if (user?.email?.toLowerCase() === email.toLowerCase()) {
      return user
    }
  }
  return null
}

