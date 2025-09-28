import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Delete user account function started")

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    // Get user session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    console.log(`Starting account deletion for user: ${user.id}`)

    // Parse request body for confirmation
    const { confirmationText, password } = await req.json()

    if (confirmationText !== 'ELIMINA IL MIO ACCOUNT') {
      throw new Error('Confirmation text does not match')
    }

    // Verify password by attempting to sign in
    const { error: passwordError } = await supabaseClient.auth.signInWithPassword({
      email: user.email!,
      password: password
    })

    if (passwordError) {
      throw new Error('Password verification failed')
    }

    console.log('Password verified, proceeding with deletion...')

    // Start database transaction for deletion process
    // 1. Anonymize chat messages (keep for history)
    await supabaseClient
      .from('chat_messages')
      .update({ 
        user_id: null,
        content: 'Messaggio di utente eliminato'
      })
      .eq('user_id', user.id)

    console.log('Chat messages anonymized')

    // 2. Deactivate chat participants
    await supabaseClient
      .from('chat_participants')
      .update({ is_active: false })
      .eq('user_id', user.id)

    console.log('Chat participants deactivated')

    // 3. Anonymize bookings (keep for gym statistics)
    await supabaseClient
      .from('bookings')
      .update({ 
        user_id: null,
        notes: 'Prenotazione di utente eliminato'
      })
      .eq('user_id', user.id)

    console.log('Bookings anonymized')

    // 4. Anonymize orders (keep for e-commerce history)
    await supabaseClient
      .from('orders')
      .update({ 
        user_id: null,
        notes: 'Ordine di utente eliminato'
      })
      .eq('user_id', user.id)

    console.log('Orders anonymized')

    // 5. Delete personal data tables (CASCADE will handle profiles)
    const deleteTables = [
      'user_activity_tracking',
      'user_achievements', 
      'points_transactions',
      'credits_transactions',
      'user_subscriptions',
      'user_gym_memberships',
      'user_roles',
      'user_preferences',
      'shopping_cart',
      'mobile_notifications',
      'payments'
    ]

    for (const table of deleteTables) {
      const { error } = await supabaseClient
        .from(table)
        .delete()
        .eq('user_id', user.id)
      
      if (error) {
        console.error(`Error deleting from ${table}:`, error)
      } else {
        console.log(`Deleted data from ${table}`)
      }
    }

    // 6. Delete user avatar from storage
    try {
      const { data: files } = await supabaseClient.storage
        .from('avatars')
        .list(user.id)
      
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`)
        await supabaseClient.storage
          .from('avatars')
          .remove(filePaths)
        console.log('Avatar files deleted')
      }
    } catch (storageError) {
      console.log('No avatar files to delete or error:', storageError)
    }

    // 7. Delete medical certificates from storage
    try {
      const { data: files } = await supabaseClient.storage
        .from('medical-certificates')
        .list(user.id)
      
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`)
        await supabaseClient.storage
          .from('medical-certificates')
          .remove(filePaths)
        console.log('Medical certificate files deleted')
      }
    } catch (storageError) {
      console.log('No medical certificate files to delete or error:', storageError)
    }

    // 8. Finally delete auth user (this will CASCADE delete profiles)
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user.id)
    
    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`)
    }

    console.log(`User account ${user.id} successfully deleted`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account eliminato con successo' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error deleting user account:', error)
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'Errore durante l\'eliminazione dell\'account' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
