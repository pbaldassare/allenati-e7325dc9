import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Set the JWT for the client to use
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    
    if (userError || !user) {
      throw new Error('Invalid or expired token')
    }

    console.log('User authenticated:', user.id)

    // Verify user is gym_owner
    const { data: hasOwnerRole, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'gym_owner' })
    
    if (roleError || !hasOwnerRole) {
      throw new Error('User is not a gym owner')
    }

    console.log('User is gym owner, proceeding...')

    // Get user's gym ID
    const { data: gymId, error: gymError } = await supabaseClient
      .rpc('get_user_gym_id', { _user_id: user.id })
    
    if (gymError || !gymId) {
      throw new Error('Could not find gym for user')
    }

    console.log('User gym ID:', gymId)

    const { email } = await req.json()
    
    if (!email || typeof email !== 'string') {
      throw new Error('Valid email is required')
    }

    console.log('Adding member with email:', email)

    // Find user by email in auth.users
    const { data: users, error: searchError } = await supabaseClient.auth.admin.listUsers()
    
    if (searchError) {
      throw new Error('Failed to search users')
    }

    const targetUser = users.users.find(u => u.email === email)
    
    if (!targetUser) {
      throw new Error('User with this email not found. They need to register first.')
    }

    console.log('Target user found:', targetUser.id)

    // Check if user already has a membership for this gym
    const { data: existingMembership } = await supabaseClient
      .from('user_gym_memberships')
      .select('*')
      .eq('user_id', targetUser.id)
      .eq('gym_id', gymId)
      .single()

    if (existingMembership) {
      // Update existing membership to active
      const { error: updateError } = await supabaseClient
        .from('user_gym_memberships')
        .update({ 
          status: 'active',
          membership_type: 'member',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', targetUser.id)
        .eq('gym_id', gymId)

      if (updateError) {
        throw new Error('Failed to update membership')
      }

      console.log('Updated existing membership')
    } else {
      // Create new membership
      const { error: insertError } = await supabaseClient
        .from('user_gym_memberships')
        .insert({
          user_id: targetUser.id,
          gym_id: gymId,
          membership_type: 'member',
          status: 'active'
        })

      if (insertError) {
        throw new Error('Failed to create membership: ' + insertError.message)
      }

      console.log('Created new membership')
    }

    // Get user profile data to return
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('user_id, first_name, last_name, profile_picture_url')
      .eq('user_id', targetUser.id)
      .single()

    const memberData = {
      user_id: targetUser.id,
      first_name: profile?.first_name || 'Nome',
      last_name: profile?.last_name || 'Cognome',
      profile_picture_url: profile?.profile_picture_url || null,
      membership_status: 'active',
      membership_type: 'member'
    }

    console.log('Successfully added member:', memberData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        member: memberData,
        message: 'Member added successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in owner-link-member:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})