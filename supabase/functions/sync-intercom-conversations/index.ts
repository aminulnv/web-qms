// Supabase Edge Function to sync Intercom conversations to cache
// Fetches all conversations for each admin from the last 365 days and stores them in intercom_conversations_cache

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const INTERCOM_API_BASE = 'https://api.intercom.io'
const INTERCOM_ACCESS_TOKEN = Deno.env.get('INTERCOM_ACCESS_TOKEN')
if (!INTERCOM_ACCESS_TOKEN) {
  throw new Error('INTERCOM_ACCESS_TOKEN environment variable is required')
}

interface Conversation {
  id: string | number
  type?: string
  state?: string
  read?: boolean
  created_at?: number
  updated_at?: number
  waiting_since?: number
  source?: {
    author?: {
      name?: string
      email?: string
    }
    subject?: string
    owner?: {
      id?: string | number
    }
  }
  conversation_parts?: Array<{
    body?: string
  }>
  conversation_rating?: {
    rating?: number
  }
  contacts?: {
    contacts?: Array<{
      name?: string
      email?: string
    }>
  }
  admin_id?: string | number
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    if (!INTERCOM_ACCESS_TOKEN) {
      throw new Error('INTERCOM_ACCESS_TOKEN not set')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🚀 Starting conversation sync...')

    // Parse batch parameters from query string or body
    const url = new URL(req.url)
    const startIndex = parseInt(url.searchParams.get('start') || '0', 10)
    const batchSize = parseInt(url.searchParams.get('batch_size') || '1', 10) // Process 1 admin per batch

    // Get all admins from cache
    const { data: allAdmins, error: adminsError } = await supabase
      .from('intercom_admin_cache')
      .select('id, email, name')
      .order('name')

    if (adminsError) {
      throw new Error(`Failed to fetch admins: ${adminsError.message}`)
    }

    if (!allAdmins || allAdmins.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No admins found in cache' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Process only the batch range
    const endIndex = Math.min(startIndex + batchSize, allAdmins.length)
    const admins = allAdmins.slice(startIndex, endIndex)

    console.log(`📥 Found ${allAdmins.length} total admins, processing batch ${startIndex + 1}-${endIndex} (${admins.length} admins)`)

    // Helper function to format dates
    const formatDate = (date: Date): string => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const h = String(date.getHours()).padStart(2, '0')
      const min = String(date.getMinutes()).padStart(2, '0')
      const sec = String(date.getSeconds()).padStart(2, '0')
      return `${y}-${m}-${d} ${h}:${min}:${sec}`
    }

    // Calculate date range (last 365 days) - will process in monthly chunks
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 365)

    let totalFetched = 0
    let totalInserted = 0
    let totalErrors = 0
    const adminResults: any[] = []

    // Process each admin
    for (let i = 0; i < admins.length; i++) {
      const admin = admins[i]
      console.log(`[${i + 1}/${admins.length}] Processing ${admin.name} (${admin.id})`)

      try {
        // Helper function to prepare conversation data for insertion
        const prepareConversationData = (conv: Conversation, adminId: string): any | null => {
          const id = typeof conv.id === 'string' ? parseInt(conv.id, 10) : conv.id
          if (isNaN(id)) return null

          // Extract admin ID
          let extractedAdminId = String(adminId)
          if (conv.source?.owner?.id) {
            extractedAdminId = String(conv.source.owner.id)
          } else if (conv.admin_id) {
            extractedAdminId = String(conv.admin_id)
          }

          // Extract client info
          let clientName = 'Unknown'
          let clientEmail: string | null = null
          if (conv.source?.author) {
            clientName = conv.source.author.name || conv.source.author.email || 'Unknown'
            clientEmail = conv.source.author.email || null
          } else if (conv.contacts?.contacts?.[0]) {
            const contact = conv.contacts.contacts[0]
            clientName = contact.name || contact.email || 'Unknown'
            clientEmail = contact.email || null
          }

          // Extract rating
          const rating = conv.conversation_rating?.rating || null

          // Extract subject
          const subject = conv.source?.subject || 
                         conv.conversation_parts?.[0]?.body?.substring(0, 200) || 
                         'No subject'

          // Extract product type
          let productType: string | null = null
          // Priority 1: Check ticket custom_attributes for Product Type
          if ((conv as any).ticket?.custom_attributes?.["Product Type"]) {
            const pt = (conv as any).ticket.custom_attributes["Product Type"]
            if (pt && typeof pt === 'object' && pt.value) {
              productType = pt.value
            } else if (typeof pt === 'string' && pt.trim()) {
              productType = pt
            }
          }
          // Priority 2: Check tags
          if (!productType && (conv as any).tags?.tags && Array.isArray((conv as any).tags.tags)) {
            for (const tag of (conv as any).tags.tags) {
              const tagName = tag.name || ''
              if (tagName.includes('CFD') || tagName === 'CFD Conversation' || tagName.includes('CFD FIN')) {
                productType = 'CFD'
                break
              }
              if (tagName.includes('Futures') || tagName === 'Future Conversations' || tagName.includes('Futures FIN')) {
                productType = 'Futures'
                break
              }
            }
          }
          // Priority 3: Check source body
          if (!productType && conv.source?.body) {
            const body = conv.source.body.toLowerCase()
            if (body.includes('cfd / forex') || body.includes('cfd/forex') || body.includes('<p>cfd / forex</p>')) {
              productType = 'CFD / Forex'
            } else if (body.includes('<p>futures</p>') || (body.includes('futures') && !body.includes('cfd'))) {
              productType = 'Futures'
            }
          }
          // Priority 4: Check topics
          if (!productType && (conv as any).topics?.topics && Array.isArray((conv as any).topics.topics)) {
            for (const topic of (conv as any).topics.topics) {
              const topicName = topic.name || ''
              if (topicName.includes('Futures')) {
                productType = 'Futures'
                break
              }
              if (topicName.includes('CFD')) {
                productType = 'CFD'
                break
              }
            }
          }

          // Convert timestamps
          const convertTs = (ts?: number): string | null => {
            if (!ts) return null
            return new Date(ts < 10000000000 ? ts * 1000 : ts).toISOString()
          }

          return {
            id: id,
            admin_id: extractedAdminId,
            type: conv.type || null,
            state: conv.state || null,
            read: conv.read !== undefined ? conv.read : null,
            created_at: convertTs(conv.created_at),
            updated_at: convertTs(conv.updated_at),
            waiting_since: convertTs(conv.waiting_since),
            client_name: clientName,
            client_email: clientEmail,
            subject: subject,
            rating: rating,
            product_type: productType,
            conversation_data: conv,
            last_synced_at: new Date().toISOString()
          }
        }

        // Helper function to insert conversations in batches
        const insertConversations = async (conversations: Conversation[], adminId: string): Promise<{ inserted: number, errors: number }> => {
          const insertData: any[] = []
          const seenIds = new Set<number>()
          
          // Deduplicate and prepare data
          for (const conv of conversations) {
            const id = typeof conv.id === 'string' ? parseInt(conv.id, 10) : conv.id
            if (isNaN(id) || seenIds.has(id)) continue
            seenIds.add(id)
            
            const data = prepareConversationData(conv, adminId)
            if (data) insertData.push(data)
          }

          if (insertData.length === 0) return { inserted: 0, errors: 0 }

          // Insert in batches of 100
          let inserted = 0
          let errors = 0
          const dbBatchSize = 100

          for (let j = 0; j < insertData.length; j += dbBatchSize) {
            const batch = insertData.slice(j, j + dbBatchSize)
            const batchNum = Math.floor(j / dbBatchSize) + 1
            const totalBatches = Math.ceil(insertData.length / dbBatchSize)

            const { data: insertedData, error: insertError } = await supabase
              .from('intercom_conversations_cache')
              .upsert(batch, { onConflict: 'id' })
              .select('id')

            if (insertError) {
              console.error(`      ❌ Insert batch ${batchNum}/${totalBatches} failed:`, insertError.message)
              errors += batch.length
            } else {
              inserted += insertedData?.length || batch.length
              console.log(`      ✅ Insert batch ${batchNum}/${totalBatches}: ${insertedData?.length || batch.length} inserted`)
            }
          }

          return { inserted, errors }
        }

        let adminFetched = 0
        let adminInserted = 0
        let adminErrors = 0
        
        // Process 12 months (one year) in monthly chunks - insert incrementally
        for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
          // Calculate month start (beginning of the month)
          const monthStartDate = new Date(endDate)
          monthStartDate.setMonth(monthStartDate.getMonth() - monthOffset)
          monthStartDate.setDate(1)
          monthStartDate.setHours(0, 0, 0, 0)
          
          // Calculate month end (beginning of next month, or endDate if last month)
          const monthEndDate = new Date(monthStartDate)
          if (monthOffset === 0) {
            // Last month - use actual endDate
            monthEndDate.setTime(endDate.getTime())
          } else {
            // Move to next month
            monthEndDate.setMonth(monthEndDate.getMonth() + 1)
          }
          
          // For the first month, use the original startDate if it's earlier
          if (monthOffset === 11 && startDate < monthStartDate) {
            monthStartDate.setTime(startDate.getTime())
          }
          
          const monthUpdatedSince = formatDate(monthStartDate)
          const monthUpdatedBefore = formatDate(monthEndDate)
          
          console.log(`   📅 Processing month ${monthOffset + 1}/12: ${monthUpdatedSince} to ${monthUpdatedBefore}`)
          
          let startingAfter: string | null = null
          let page = 0
          const maxPages = 50 // Reduced pages per month to avoid timeout
          let monthConversations: Conversation[] = []

          while (page < maxPages) {
            page++
            
            let url = `${INTERCOM_API_BASE}/conversations?type=admin&admin_id=${admin.id}&updated_since=${encodeURIComponent(monthUpdatedSince)}&updated_before=${encodeURIComponent(monthUpdatedBefore)}&per_page=150`
            
            if (startingAfter) {
              url += `&starting_after=${encodeURIComponent(startingAfter)}`
            }

            const response = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
                'Accept': 'application/json',
              },
            })

            if (!response.ok) {
              const errorText = await response.text()
              throw new Error(`Intercom API error (${response.status}): ${errorText}`)
            }

            const data = await response.json()
            const conversations = data.conversations || []

            if (conversations.length === 0) break

            monthConversations.push(...conversations)
            console.log(`      📄 Page ${page}: ${conversations.length} conversations (Month total: ${monthConversations.length})`)

            // Check for next page
            if (data.pages?.next) {
              const next = data.pages.next
              if (typeof next === 'string') {
                const match = next.match(/starting_after=([^&]+)/)
                startingAfter = match ? decodeURIComponent(match[1]) : null
              } else if (next.starting_after || next.cursor) {
                startingAfter = next.starting_after || next.cursor
              } else {
                startingAfter = null
              }
              if (!startingAfter) break
            } else {
              break
            }

            // Rate limiting
            await new Promise(r => setTimeout(r, 500))
          }
          
          // Insert this month's conversations immediately
          if (monthConversations.length > 0) {
            console.log(`   💾 Inserting ${monthConversations.length} conversations for month ${monthOffset + 1}/12...`)
            const result = await insertConversations(monthConversations, String(admin.id))
            adminInserted += result.inserted
            adminErrors += result.errors
            adminFetched += monthConversations.length
            console.log(`   ✅ Month ${monthOffset + 1}/12 complete: ${monthConversations.length} fetched, ${result.inserted} inserted`)
          } else {
            console.log(`   ✅ Month ${monthOffset + 1}/12 complete: 0 conversations`)
          }
        }

        totalFetched += adminFetched
        totalInserted += adminInserted
        totalErrors += adminErrors

        // Update migration_date for this admin
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        await supabase
          .from('intercom_admin_cache')
          .update({ last_conversations_sync_date: today })
          .eq('id', admin.id)

        adminResults.push({
          admin: admin.name,
          fetched: adminFetched,
          inserted: adminInserted,
          errors: adminErrors,
          migration_date: today
        })

        // Delay between admins
        if (i < admins.length - 1) {
          await new Promise(r => setTimeout(r, 1000))
        }

      } catch (error) {
        console.error(`   ❌ Error processing ${admin.name}:`, error)
        totalErrors++
        adminResults.push({
          admin: admin.name,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_admins: allAdmins.length,
          batch_start: startIndex,
          batch_end: endIndex,
          admins_processed: admins.length,
          total_fetched: totalFetched,
          total_inserted: totalInserted,
          total_errors: totalErrors,
          has_more: endIndex < allAdmins.length,
          next_start: endIndex < allAdmins.length ? endIndex : null
        },
        results: adminResults
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
    console.error('Error in sync function:', error)
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

