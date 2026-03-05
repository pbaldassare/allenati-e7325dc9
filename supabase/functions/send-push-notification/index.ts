import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!

interface PushNotificationRequest {
  userId: string
  title: string
  message: string
  type: 'booking' | 'payment' | 'course_update' | 'system'
  data?: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { userId, title, message, type, data: extraData } = await req.json() as PushNotificationRequest

    if (!userId || !title || !message || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: userId, title, message, type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check user notification preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('notifications_enabled, push_bookings, push_promotions')
      .eq('user_id', userId)
      .maybeSingle()

    // Respect user preferences
    if (prefs) {
      if (!prefs.notifications_enabled) {
        console.log('Notifications disabled for user:', userId)
        return new Response(JSON.stringify({ success: false, reason: 'notifications_disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (type === 'booking' && prefs.push_bookings === false) {
        console.log('Booking notifications disabled for user:', userId)
        return new Response(JSON.stringify({ success: false, reason: 'booking_notifications_disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (type === 'payment' && prefs.push_promotions === false) {
        console.log('Promotion notifications disabled for user:', userId)
        return new Response(JSON.stringify({ success: false, reason: 'promotion_notifications_disabled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Send push notification via OneSignal REST API
    let oneSignalSuccess = false
    let oneSignalError: string | null = null

    try {
      const oneSignalResponse = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          include_aliases: { external_id: [userId] },
          target_channel: 'push',
          headings: { en: title },
          contents: { en: message },
          data: extraData || {},
        }),
      })

      const oneSignalResult = await oneSignalResponse.json()
      console.log('OneSignal API response:', JSON.stringify(oneSignalResult))

      if (oneSignalResponse.ok && !oneSignalResult.errors) {
        oneSignalSuccess = true
      } else {
        oneSignalError = JSON.stringify(oneSignalResult.errors || oneSignalResult)
      }
    } catch (err) {
      console.error('OneSignal API error:', err)
      oneSignalError = err.message
    }

    // Save notification record in mobile_notifications
    const { error: insertError } = await supabase
      .from('mobile_notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        data: extraData || {},
        sent_at: oneSignalSuccess ? new Date().toISOString() : null,
      })

    if (insertError) {
      console.error('Error saving notification record:', insertError)
    }

    return new Response(JSON.stringify({
      success: oneSignalSuccess,
      notificationSaved: !insertError,
      error: oneSignalError,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
