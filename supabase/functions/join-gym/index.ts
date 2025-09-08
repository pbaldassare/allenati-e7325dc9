import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface JoinGymRequest {
  gym_id: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header')
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const { gym_id }: JoinGymRequest = await req.json()
    
    if (!gym_id) {
      console.error('❌ Missing gym_id in request')
      return new Response(
        JSON.stringify({ error: 'gym_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🏃‍♂️ User ${user.id} attempting to join gym ${gym_id}`)

    // Verify gym exists and is active
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .select('id, name, is_active')
      .eq('id', gym_id)
      .eq('is_active', true)
      .single()

    if (gymError || !gym) {
      console.error('❌ Gym not found or inactive:', gymError)
      return new Response(
        JSON.stringify({ error: 'Gym not found or inactive' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user is already a member
    const { data: existingMembership, error: membershipCheckError } = await supabase
      .from('user_gym_memberships')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('gym_id', gym_id)
      .maybeSingle()

    if (membershipCheckError) {
      console.error('❌ Error checking existing membership:', membershipCheckError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (existingMembership) {
      if (existingMembership.status === 'active') {
        console.log(`ℹ️ User ${user.id} already member of gym ${gym_id}`)
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Already a member',
            gym: gym
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        // Reactivate existing membership
        const { error: updateError } = await supabase
          .from('user_gym_memberships')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMembership.id)

        if (updateError) {
          console.error('❌ Error reactivating membership:', updateError)
          return new Response(
            JSON.stringify({ error: 'Failed to reactivate membership' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        console.log(`✅ Reactivated membership for user ${user.id} in gym ${gym_id}`)
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Membership reactivated',
            gym: gym
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Create new membership
    const { error: insertError } = await supabase
      .from('user_gym_memberships')
      .insert({
        user_id: user.id,
        gym_id: gym_id,
        membership_type: 'member',
        status: 'active'
      })

    if (insertError) {
      console.error('❌ Error creating membership:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create membership' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`✅ Successfully created membership for user ${user.id} in gym ${gym.name}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Welcome to ${gym.name}!`,
        gym: gym
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error in join-gym function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})