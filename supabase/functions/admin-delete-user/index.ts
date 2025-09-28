import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Admin delete user function called')

    // Create Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if the authenticated user is an admin
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
    
    if (roleError) {
      console.error('Error checking user roles:', roleError)
      return new Response(
        JSON.stringify({ error: 'Error verifying permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isAdmin = userRoles?.some(role => role.role === 'admin')
    if (!isAdmin) {
      console.error('User is not an admin:', user.id)
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email } = await req.json()
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin deleting user with email:', email)

    let targetUserId = null
    let userToDelete = null
    const normalizedEmail = email.toLowerCase().trim()

    // Get all auth users
    const { data: authUsers, error: findUserError } = await supabaseClient.auth.admin.listUsers()
    
    if (findUserError) {
      console.error('Error listing auth users:', findUserError)
      return new Response(
        JSON.stringify({ error: 'Error finding user in auth system' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Strategy 1: Exact email match in auth.users
    userToDelete = authUsers.users.find(u => u.email === email)
    if (userToDelete) {
      targetUserId = userToDelete.id
      console.log('Found user with exact email match:', targetUserId)
    } 
    
    // Strategy 2: Case-insensitive email match in auth.users
    if (!userToDelete) {
      userToDelete = authUsers.users.find(u => u.email?.toLowerCase().trim() === normalizedEmail)
      if (userToDelete) {
        targetUserId = userToDelete.id
        console.log('Found user with case-insensitive email match:', targetUserId)
      }
    }

    // Strategy 3: Search via profiles table
    if (!userToDelete) {
      console.log('Trying profiles table search...')
      const { data: profileMatches, error: profileError } = await supabaseClient
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .eq('email', email)
        .limit(1)
      
      if (!profileError && profileMatches && profileMatches.length > 0) {
        const profileMatch = profileMatches[0]
        const authUser = authUsers.users.find(u => u.id === profileMatch.user_id)
        if (authUser) {
          targetUserId = profileMatch.user_id
          userToDelete = authUser
          console.log('Found user via profiles table:', targetUserId)
        }
      }
    }

    if (!targetUserId || !userToDelete) {
      console.error('User not found with email:', email)
      
      // Show similar emails for debugging
      const similarEmails = authUsers.users
        .filter(u => u.email && u.email.toLowerCase().includes(email.toLowerCase().split('@')[0]))
        .map(u => u.email)
        .slice(0, 3)
      
      const errorMessage = similarEmails.length > 0 
        ? `User not found. Similar emails: ${similarEmails.join(', ')}`
        : 'User not found'
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found user to delete:', targetUserId, 'with email:', userToDelete.email)

    // Start deletion process - Anonymize chat messages (keep for referential integrity)
    const { error: chatError } = await supabaseClient
      .from('chat_messages')
      .update({ 
        content: '[Messaggio cancellato]',
        user_id: null 
      })
      .eq('user_id', targetUserId)

    if (chatError) {
      console.error('Error anonymizing chat messages:', chatError)
    }

    // Anonymize bookings (keep for historical data)
    const { error: bookingError } = await supabaseClient
      .from('bookings')
      .update({ notes: '[Utente cancellato]' })
      .eq('user_id', targetUserId)

    if (bookingError) {
      console.error('Error anonymizing bookings:', bookingError)
    }

    // Deactivate chat participants
    const { error: participantError } = await supabaseClient
      .from('chat_participants')
      .update({ is_active: false })
      .eq('user_id', targetUserId)

    if (participantError) {
      console.error('Error deactivating chat participants:', participantError)
    }

    // Anonymize orders
    const { error: orderError } = await supabaseClient
      .from('orders')
      .update({ 
        notes: '[Ordine di utente cancellato]',
        shipping_address: null 
      })
      .eq('user_id', targetUserId)

    if (orderError) {
      console.error('Error anonymizing orders:', orderError)
    }

    // Delete user-specific data
    const tablesToDelete = [
      'user_activity_tracking',
      'mobile_notifications', 
      'user_subscriptions',
      'user_preferences',
      'shopping_cart',
      'points_transactions',
      'credits_transactions',
      'gym_credits',
      'user_gym_memberships',
      'gym_join_requests',
      'user_roles',
      'instructors'
    ]

    for (const table of tablesToDelete) {
      const { error } = await supabaseClient
        .from(table)
        .delete()
        .eq('user_id', targetUserId)
      
      if (error) {
        console.error(`Error deleting from ${table}:`, error)
      }
    }

    // Delete user files from storage
    try {
      // Delete avatar
      const { error: avatarError } = await supabaseClient.storage
        .from('avatars')
        .remove([`${targetUserId}/avatar`])
      
      if (avatarError) {
        console.log('No avatar to delete or error:', avatarError)
      }

      // Delete medical certificate
      const { error: certError } = await supabaseClient.storage
        .from('medical-certificates')
        .remove([`${targetUserId}/certificate.pdf`])
      
      if (certError) {
        console.log('No medical certificate to delete or error:', certError)
      }
    } catch (storageError) {
      console.error('Storage deletion error:', storageError)
    }

    // Finally delete the profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('user_id', targetUserId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
    }

    // Delete the user from auth
    const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(targetUserId)
    
    if (deleteAuthError) {
      console.error('Error deleting user from auth:', deleteAuthError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user from authentication system' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User successfully deleted:', email)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${email} has been completely deleted`,
        deletedUserId: targetUserId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error in admin-delete-user:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
