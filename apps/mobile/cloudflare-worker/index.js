/**
 * Cloudflare Worker for Daily Motivational Notifications
 * 
 * This worker sends daily push notifications at 9:00 AM UTC
 * to all registered users with their daily motivational quote.
 * 
 * Setup Instructions:
 * 1. Create a Cloudflare Workers account (free)
 * 2. Create a new Worker
 * 3. Copy this code to your worker
 * 4. Create a KV namespace called "TOKENS"
 * 5. Bind the KV namespace to your worker
 * 6. Add a Cron Trigger:  0 6 * * * (9:00 AM Turkey time = 6:00 AM UTC)
 * 7. Deploy!
 */

// Motivational quotes array (same as in React Native app)
const motivationalQuotes = [
    { text: "Başarı tesadüf değildir. Sıkı çalışma, azim, öğrenme, fedakarlık ve en önemlisi yaptığınız işi sevmektir.", author: "Pelé" },
    { text: "Başarının sırrı, sıradan şeyleri olağanüstü iyi yapmaktır.", author: "John D. Rockefeller" },
    { text: "Gelecek, hayallerinin güzelliğine inananlarındır.", author: "Eleanor Roosevelt" },
    { text: "Yapabileceğinizi düşündüğünüz şey, başarınızı belirler.", author: "Henry Ford" },
    { text: "Başarı, cesaretini kaybetmeden başarısızlıktan başarısızlığa yürümektir.", author: "Winston Churchill" },
    // ... (Add all 425 quotes here - truncated for brevity)
];

/**
 * Get daily quote based on server date
 */
function getDailyQuote(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const startOfYear = new Date(year, 0, 1);
    const diff = date.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay) + 1;

    const index = dayOfYear % motivationalQuotes.length;
    return motivationalQuotes[index];
}

/**
 * Get current server date in YYYY-MM-DD format
 */
function getServerDateKey() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Send push notification via Expo Push API
 */
async function sendPushNotification(token, quote) {
    const message = {
        to: token,
        sound: 'default',
        title: '💪 Günlük Motivasyonun',
        body: `"${quote.text}"\n\n— ${quote.author}`,
        data: {
            quote: quote.text,
            author: quote.author
        },
        priority: 'high',
        channelId: 'daily-motivation',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });

    return response.json();
}

/**
 * Main request handler
 */
export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Register token endpoint
        if (url.pathname === '/register' && request.method === 'POST') {
            try {
                const { token } = await request.json();

                if (!token) {
                    return new Response(JSON.stringify({ error: 'Token required' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // Store token in KV
                await env.TOKENS.put(token, Date.now().toString());

                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // Unregister token endpoint
        if (url.pathname === '/unregister' && request.method === 'POST') {
            try {
                const { token } = await request.json();
                await env.TOKENS.delete(token);

                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        return new Response('GymBuddy Notification Service', {
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        });
    },

    /**
     * Scheduled (Cron) handler - Runs daily at 9:00 AM Turkey time (6:00 AM UTC)
     * Add trigger: 0 6 * * *
     */
    async scheduled(event, env, ctx) {
        console.log('🔔 [Cron] Starting daily notification job...');

        try {
            // Get today's quote
            const dateKey = getServerDateKey();
            const quote = getDailyQuote(dateKey);

            console.log(`📜 [Cron] Today's quote (${dateKey}):`, quote);

            // Get all registered tokens
            const tokens = await env.TOKENS.list();

            console.log(`👥 [Cron] Found ${tokens.keys.length} registered tokens`);

            // Send notifications to all tokens
            const promises = tokens.keys.map(async ({ name: token }) => {
                try {
                    const result = await sendPushNotification(token, quote);
                    console.log(`✅ [Cron] Sent to ${token.substring(0, 20)}...`);
                    return { token, success: true, result };
                } catch (error) {
                    console.error(`❌ [Cron] Failed for ${token.substring(0, 20)}:`, error);
                    return { token, success: false, error: error.message };
                }
            });

            const results = await Promise.allSettled(promises);

            const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failCount = results.length - successCount;

            console.log(`🎉 [Cron] Notification job complete: ${successCount} success, ${failCount} failed`);

        } catch (error) {
            console.error('❌ [Cron] Notification job failed:', error);
        }
    }
};
