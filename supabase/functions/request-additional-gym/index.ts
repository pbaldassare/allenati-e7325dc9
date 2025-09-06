import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { gym_id, message } = await req.json()

    if (!gym_id) {
      return new Response(
        JSON.stringify({ error: 'gym_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is a gym owner
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (rolesError) {
      console.error('Error checking user roles:', rolesError)
      return new Response(
        JSON.stringify({ error: 'Error verifying permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isOwner = userRoles?.some(r => r.role === 'gym_owner')
    if (!isOwner) {
      return new Response(
        JSON.stringify({ error: 'Only gym owners can request additional gyms' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if gym exists and is active
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .select('id, name')
      .eq('id', gym_id)
      .eq('is_active', true)
      .single()

    if (gymError || !gym) {
      return new Response(
        JSON.stringify({ error: 'Gym not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already owns this gym
    const { data: existingMembership } = await supabase
      .from('user_gym_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('gym_id', gym_id)
      .eq('membership_type', 'owner')
      .eq('status', 'active')
      .single()

    if (existingMembership) {
      return new Response(
        JSON.stringify({ error: 'You already own this gym' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await supabase
      .from('additional_gym_requests')
      .select('id')
      .eq('requester_user_id', user.id)
      .eq('gym_id', gym_id)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return new Response(
        JSON.stringify({ error: 'You already have a pending request for this gym' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the request
    const { error: insertError } = await supabase
      .from('additional_gym_requests')
      .insert({
        requester_user_id: user.id,
        gym_id: gym_id,
        message: message || null,
        status: 'pending'
      })

    if (insertError) {
      console.error('Error creating gym request:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Gym connection request created: User ${user.id} requested gym ${gym_id}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Gym connection request submitted successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in request-additional-gym function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})