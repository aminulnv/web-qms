/**
 * Script to fetch and display conversation data from Intercom via Edge Function
 * Usage: node scripts/fetch-conversation.js <conversation_id>
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const CONVERSATION_ID = process.argv[2] || '215471462705191';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY are required');
    console.error('Please set them in your .env file');
    process.exit(1);
}

console.log('Fetching conversation from Edge Function...');
console.log('Conversation ID:', CONVERSATION_ID);
console.log('Edge Function URL:', `${SUPABASE_URL}/functions/v1/intercom-proxy?conversation_id=${CONVERSATION_ID}`);
console.log('');

const url = new URL(`${SUPABASE_URL}/functions/v1/intercom-proxy?conversation_id=${CONVERSATION_ID}`);
const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Accept': 'application/json'
    }
};

const client = url.protocol === 'https:' ? https : http;

const req = client.request(options, (res) => {
    let data = '';

    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    console.log('');

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const conversation = JSON.parse(data);
            
            console.log('=== FULL CONVERSATION RESPONSE ===');
            console.log(JSON.stringify(conversation, null, 2));
            console.log('');
            
            // Check specific parts
            if (conversation.conversation_parts?.conversation_parts) {
                const parts = conversation.conversation_parts.conversation_parts;
                console.log(`Total parts: ${parts.length}`);
                console.log('');
                
                // Check part 32842906801
                const part1 = parts.find(p => p.id === '32842906801');
                if (part1) {
                    console.log('=== PART 32842906801 ===');
                    console.log('Keys:', Object.keys(part1));
                    console.log('Has email_message_metadata?', 'email_message_metadata' in part1);
                    console.log('email_message_metadata value:', part1.email_message_metadata);
                    console.log('Full part:', JSON.stringify(part1, null, 2));
                    console.log('');
                } else {
                    console.log('Part 32842906801 NOT FOUND');
                    console.log('');
                }
                
                // Check part 32842914590
                const part2 = parts.find(p => p.id === '32842914590');
                if (part2) {
                    console.log('=== PART 32842914590 ===');
                    console.log('Keys:', Object.keys(part2));
                    console.log('Has email_message_metadata?', 'email_message_metadata' in part2);
                    console.log('email_message_metadata value:', part2.email_message_metadata);
                    console.log('Full part:', JSON.stringify(part2, null, 2));
                    console.log('');
                } else {
                    console.log('Part 32842914590 NOT FOUND');
                    console.log('');
                }
                
                // Show all part types and which ones have email_message_metadata
                console.log('=== ALL PARTS SUMMARY ===');
                parts.forEach((part, index) => {
                    const hasEmailMeta = 'email_message_metadata' in part;
                    const emailMetaValue = part.email_message_metadata;
                    if (hasEmailMeta || part.part_type === 'open' || part.part_type === 'comment') {
                        console.log(`Part ${index + 1}: ${part.id} (${part.part_type})`);
                        console.log(`  Has email_message_metadata key: ${hasEmailMeta}`);
                        console.log(`  email_message_metadata value: ${emailMetaValue}`);
                        console.log(`  All keys: ${Object.keys(part).join(', ')}`);
                        console.log('');
                    }
                });
            }
        } catch (error) {
            console.error('Error parsing response:', error);
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Request error:', error);
});

req.end();

