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

    // Parse request body - support multiple search parameters
    const { email, user_id, firstName, lastName } = await req.json()
    
    if (!email && !user_id && (!firstName || !lastName)) {
      return new Response(
        JSON.stringify({ error: 'Email, user_id, or firstName+lastName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin deleting user with params:', { email, user_id, firstName, lastName })

    let targetUserId = null
    let userToDelete = null
    let isOrphanedProfile = false

    // Get all auth users with enhanced logging
    const { data: authUsers, error: findUserError } = await supabaseClient.auth.admin.listUsers()
    
    if (findUserError) {
      console.error('Error listing auth users:', findUserError)
      return new Response(
        JSON.stringify({ error: 'Error finding user in auth system' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Total auth users available:', authUsers.users.length)
    console.log('Sample auth user IDs:', authUsers.users.slice(0, 3).map(u => ({ id: u.id, email: u.email })))

    // Strategy 1: Search by user_id (most reliable) with enhanced debugging
    if (user_id) {
      console.log('Searching by user_id:', user_id)
      
      // Check if user_id exists in auth users
      const userExists = authUsers.users.some(u => u.id === user_id)
      console.log('User exists in auth.users:', userExists)
      
      userToDelete = authUsers.users.find(u => u.id === user_id)
      if (userToDelete) {
        targetUserId = userToDelete.id
        console.log('Found user with user_id match:', targetUserId)
      } else {
        console.log('User not found in auth.users, checking for orphaned profile...')
        
        // Check if this is an orphaned profile (exists in profiles but not in auth.users)
        const { data: orphanedProfile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('user_id, email, first_name, last_name')
          .eq('user_id', user_id)
          .maybeSingle()
        
        if (!profileError && orphanedProfile) {
          console.log('Found orphaned profile:', orphanedProfile)
          targetUserId = user_id
          isOrphanedProfile = true
          // Create a mock userToDelete object for orphaned profiles
          userToDelete = { 
            id: user_id, 
            email: orphanedProfile.email || `orphaned-${user_id}@example.com` 
          }
        }
      }
    }
    
    // Strategy 2: Search by email if user_id failed or not provided
    if (!userToDelete && email) {
      const normalizedEmail = email.toLowerCase().trim()
      console.log('Searching by email:', email)
      
      // Exact email match
      userToDelete = authUsers.users.find(u => u.email === email)
      if (userToDelete) {
        targetUserId = userToDelete.id
        console.log('Found user with exact email match:', targetUserId)
      } else {
        // Case-insensitive email match
        userToDelete = authUsers.users.find(u => u.email?.toLowerCase().trim() === normalizedEmail)
        if (userToDelete) {
          targetUserId = userToDelete.id
          console.log('Found user with case-insensitive email match:', targetUserId)
        }
      }
    }

    // Strategy 3: Search by firstName + lastName in profiles
    if (!userToDelete && firstName && lastName) {
      console.log('Searching by name:', firstName, lastName)
      const { data: profileMatches, error: profileError } = await supabaseClient
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .ilike('first_name', firstName.trim())
        .ilike('last_name', lastName.trim())
        .limit(5)
      
      if (!profileError && profileMatches && profileMatches.length > 0) {
        console.log('Found profile matches:', profileMatches.length)
        for (const profileMatch of profileMatches) {
          const authUser = authUsers.users.find(u => u.id === profileMatch.user_id)
          if (authUser) {
            targetUserId = profileMatch.user_id
            userToDelete = authUser
            console.log('Found user via name search:', targetUserId, profileMatch.first_name, profileMatch.last_name)
            break
          } else {
            console.log('Found orphaned profile via name search:', profileMatch)
            targetUserId = profileMatch.user_id
            isOrphanedProfile = true
            userToDelete = { 
              id: profileMatch.user_id, 
              email: profileMatch.email || `orphaned-${profileMatch.user_id}@example.com` 
            }
            break
          }
        }
      }
    }

    // Strategy 4: Fallback email search in profiles table
    if (!userToDelete && email) {
      console.log('Trying profiles table email search...')
      const { data: profileMatches, error: profileError } = await supabaseClient
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .ilike('email', `%${email.toLowerCase().trim()}%`)
        .limit(5)
      
      if (!profileError && profileMatches && profileMatches.length > 0) {
        console.log('Found profile email matches:', profileMatches.length)
        for (const profileMatch of profileMatches) {
          const authUser = authUsers.users.find(u => u.id === profileMatch.user_id)
          if (authUser) {
            targetUserId = profileMatch.user_id
            userToDelete = authUser
            console.log('Found user via profiles email search:', targetUserId, profileMatch.email)
            break
          } else {
            console.log('Found orphaned profile via email search:', profileMatch)
            targetUserId = profileMatch.user_id
            isOrphanedProfile = true
            userToDelete = { 
              id: profileMatch.user_id, 
              email: profileMatch.email || `orphaned-${profileMatch.user_id}@example.com` 
            }
            break
          }
        }
      }
    }

    if (!targetUserId || !userToDelete) {
      console.error('User not found with provided parameters')
      console.error('Search debug info:', {
        email_provided: !!email,
        user_id_provided: !!user_id,
        name_provided: !!(firstName && lastName),
        total_auth_users: authUsers.users.length,
        search_attempts: {
          by_user_id: !!user_id,
          by_email: !!email,
          by_name: !!(firstName && lastName)
        }
      })
      
      // Show debugging info
      let similarUsers: Array<{email: string, id: string}> = []
      if (email) {
        const emailLocal = email.toLowerCase().split('@')[0]
        similarUsers = authUsers.users
          .filter(u => u.email && u.email.toLowerCase().includes(emailLocal))
          .map(u => ({ email: u.email || '', id: u.id }))
          .slice(0, 3)
      }
      
      const errorMessage = similarUsers.length > 0 
        ? `User not found. Similar users: ${similarUsers.map(u => `${u.email} (${u.id})`).join(', ')}`
        : 'User not found with provided parameters'
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          debug: {
            searchParams: { email, user_id, firstName, lastName },
            authUsersCount: authUsers.users.length,
            similarUsers
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found user to delete:', targetUserId, 'with email:', userToDelete.email)
    if (isOrphanedProfile) {
      console.log('Deleting orphaned profile (no corresponding auth user)')
    }

    // === CRITICAL: DELETE BOOKINGS FIRST TO PREVENT FOREIGN KEY VIOLATIONS ===
    console.log('STEP 1: Deleting user bookings to prevent foreign key constraints...')
    const { error: bookingsDeleteError } = await supabaseClient
      .from('bookings')
      .delete()
      .eq('user_id', targetUserId)
    
    if (bookingsDeleteError) {
      console.error('CRITICAL ERROR: Failed to delete bookings:', bookingsDeleteError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to delete user bookings - this prevents profile deletion',
          details: bookingsDeleteError 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Bookings deleted successfully')

    // Anonymize chat messages (keep for referential integrity)
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

    // NOW delete the profile (should work since bookings are gone)
    console.log('STEP 2: Deleting user profile...')
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('user_id', targetUserId)

    if (profileError) {
      console.error('CRITICAL ERROR: Failed to delete profile even after bookings cleanup:', profileError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to delete user profile even after cleaning up foreign keys',
          details: profileError 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Profile deleted successfully')

    // Delete the user from auth (skip for orphaned profiles)
    if (!isOrphanedProfile) {
      console.log('STEP 3: Deleting user from authentication system...')
      const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(targetUserId)
      
      if (deleteAuthError) {
        console.error('ERROR: Failed to delete user from auth:', deleteAuthError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to delete user from authentication system',
            details: deleteAuthError 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('✅ Auth user deleted successfully')
    } else {
      console.log('Skipping auth deletion for orphaned profile')
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
