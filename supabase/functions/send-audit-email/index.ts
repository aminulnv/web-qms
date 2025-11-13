// Supabase Edge Function to send email notifications to employees when audits are submitted
// This function sends an email notification to the audited employee

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AuditEmailRequest {
  employee_email: string
  employee_name?: string
  auditor_name?: string
  auditor_email?: string
  audit_id: string
  audit_type?: string
  passing_status?: string
  average_score?: number
  submitted_at?: string
  scorecard_name?: string
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
    const body: AuditEmailRequest = await req.json()
    const { 
      employee_email, 
      employee_name, 
      auditor_name, 
      auditor_email,
      audit_id,
      audit_type,
      passing_status,
      average_score,
      submitted_at,
      scorecard_name
    } = body

    // Validate required fields
    if (!employee_email || !audit_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: employee_email and audit_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration not found')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Format the submission date
    const submissionDate = submitted_at 
      ? new Date(submitted_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })

    // Format passing status for display
    const statusDisplay = passing_status === 'Passing' ? 'Passed' : 
                         passing_status === 'Not Passing' ? 'Not Passed' : 
                         passing_status || 'Pending'

    // Format score display
    const scoreDisplay = average_score !== null && average_score !== undefined 
      ? `${average_score.toFixed(2)}%` 
      : 'N/A'

    // Create email subject
    const subject = `Quality Audit Completed - ${statusDisplay}`

    // Create email HTML content
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit Notification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Quality Audit Completed</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello ${employee_name || 'there'},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      A quality audit has been completed for you. Here are the details:
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1A733E;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 40%;">Audit ID:</td>
          <td style="padding: 8px 0;">${audit_id}</td>
        </tr>
        ${scorecard_name ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Scorecard:</td>
          <td style="padding: 8px 0;">${scorecard_name}</td>
        </tr>
        ` : ''}
        ${audit_type ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Audit Type:</td>
          <td style="padding: 8px 0;">${audit_type}</td>
        </tr>
        ` : ''}
        ${auditor_name ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Auditor:</td>
          <td style="padding: 8px 0;">${auditor_name}${auditor_email ? ` (${auditor_email})` : ''}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Status:</td>
          <td style="padding: 8px 0;">
            <span style="background: ${passing_status === 'Passing' ? '#d4edda' : '#f8d7da'}; 
                         color: ${passing_status === 'Passing' ? '#155724' : '#721c24'}; 
                         padding: 4px 12px; 
                         border-radius: 4px; 
                         font-weight: bold;">
              ${statusDisplay}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Average Score:</td>
          <td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #1A733E;">${scoreDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Submitted:</td>
          <td style="padding: 8px 0;">${submissionDate}</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 16px; margin-top: 30px;">
      Please log in to your Quality Management System dashboard to view the complete audit details and feedback.
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      This is an automated notification. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
    `

    // Create plain text version
    const emailText = `
Quality Audit Completed

Hello ${employee_name || 'there'},

A quality audit has been completed for you. Here are the details:

Audit ID: ${audit_id}
${scorecard_name ? `Scorecard: ${scorecard_name}\n` : ''}${audit_type ? `Audit Type: ${audit_type}\n` : ''}${auditor_name ? `Auditor: ${auditor_name}${auditor_email ? ` (${auditor_email})` : ''}\n` : ''}Status: ${statusDisplay}
Average Score: ${scoreDisplay}
Submitted: ${submissionDate}

Please log in to your Quality Management System dashboard to view the complete audit details and feedback.

This is an automated notification. Please do not reply to this email.
    `.trim()

    // Try to send email using Supabase's email service (if available)
    // Note: Supabase doesn't have a built-in email service, so we'll use a third-party service
    // For now, we'll use Resend as it's popular and easy to integrate
    // You can also use SendGrid, Mailgun, or any other email service
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (RESEND_API_KEY) {
      // Use Resend to send email
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: Deno.env.get('RESEND_FROM_EMAIL') || 'QMS <notifications@example.com>',
          to: [employee_email],
          subject: subject,
          html: emailHtml,
          text: emailText,
        }),
      })

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text()
        console.error('Resend API error:', errorText)
        throw new Error(`Failed to send email via Resend: ${resendResponse.status} ${resendResponse.statusText}`)
      }

      const resendData = await resendResponse.json()
      console.log('Email sent successfully via Resend:', resendData)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email sent successfully',
          email_id: resendData.id,
          employee_email: employee_email
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
    } else {
      // Fallback: Log the email content (for development/testing)
      // In production, you should configure an email service
      console.log('RESEND_API_KEY not configured. Email would be sent to:', employee_email)
      console.log('Email subject:', subject)
      console.log('Email content:', emailText)
      
      // You could also store this in a database table for manual sending or use another service
      // For now, we'll return a success but log a warning
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Email service not configured. Please set RESEND_API_KEY environment variable.',
          employee_email: employee_email,
          warning: 'Email was not sent. Configure RESEND_API_KEY to enable email notifications.'
        }),
        {
          status: 200, // Return 200 so audit submission doesn't fail
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          },
        }
      )
    }

  } catch (error) {
    console.error('Error in send-audit-email function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
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

