import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationId, userEmail, password, gymData } = await req.json();

    console.log('Creating gym user for:', userEmail);

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check if user already exists
    const { data: existingUsers, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      console.error('Error listing users:', getUserError);
      throw new Error(`Failed to check existing users: ${getUserError.message}`);
    }
    
    const existingUser = existingUsers.users.find(user => user.email === userEmail);
    
    let userId: string;
    let userExists = false;

    if (existingUser) {
      userId = existingUser.id;
      userExists = true;
      console.log('User already exists:', userId);
    } else {
      // Create new user
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: password,
        email_confirm: true,
      });

      if (createUserError) {
        console.error('Error creating user:', createUserError);
        throw new Error(`Failed to create user: ${createUserError.message}`);
      }

      userId = newUser.user.id;
      console.log('Created new user:', userId);
    }

    // Update gym application with user ID and clear email to satisfy check constraint
    const { error: updateAppError } = await supabaseAdmin
      .from('gym_applications')
      .update({ applicant_user_id: userId, applicant_email: null })
      .eq('id', applicationId);

    if (updateAppError) {
      console.error('Error updating application:', updateAppError);
      throw new Error(`Failed to update application: ${updateAppError.message}`);
    }

    // Check if gym already exists
    const { data: existingGym } = await supabaseAdmin
      .from('gyms')
      .select('id')
      .eq('name', gymData.gym_name)
      .eq('owner_email', userEmail)
      .single();

    let gymId: string;
    let gymExists = false;

    if (existingGym) {
      gymId = existingGym.id;
      gymExists = true;
      console.log('Gym already exists:', gymId);
    } else {
      // Create new gym
      const { data: newGym, error: createGymError } = await supabaseAdmin
        .from('gyms')
        .insert({
          name: gymData.gym_name,
          description: gymData.gym_description,
          address: gymData.gym_address,
          city: gymData.gym_city,
          postal_code: gymData.gym_postal_code,
          phone: gymData.gym_phone,
          email: gymData.gym_email,
          website: gymData.gym_website,
          owner_email: userEmail,
        })
        .select('id')
        .single();

      if (createGymError) {
        console.error('Error creating gym:', createGymError);
        throw new Error(`Failed to create gym: ${createGymError.message}`);
      }

      gymId = newGym.id;
      console.log('Created new gym:', gymId);
    }

    // Assign gym_owner role if not exists
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'gym_owner',
      }, {
        onConflict: 'user_id,role',
        ignoreDuplicates: true
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      throw new Error(`Failed to assign gym_owner role: ${roleError.message}`);
    }

    // Create gym membership if not exists
    const { error: membershipError } = await supabaseAdmin
      .from('user_gym_memberships')
      .upsert({
        user_id: userId,
        gym_id: gymId,
        membership_type: 'owner',
        status: 'active',
      }, {
        onConflict: 'user_id,gym_id',
        ignoreDuplicates: true
      });

    if (membershipError) {
      console.error('Error creating membership:', membershipError);
      throw new Error(`Failed to create gym membership: ${membershipError.message}`);
    }

    // Create default rooms for new gyms only
    if (!gymExists) {
      const defaultRooms = [
        { name: 'Sala 1', color: '#10B981', capacity: 20 }, // Green
        { name: 'Sala 2', color: '#3B82F6', capacity: 25 }, // Blue
        { name: 'Sala 3', color: '#EF4444', capacity: 30 }, // Red
      ];

      for (const room of defaultRooms) {
        const { error: roomError } = await supabaseAdmin
          .from('gym_rooms')
          .insert({
            gym_id: gymId,
            name: room.name,
            capacity: room.capacity,
            color: room.color,
            is_active: true,
          });

        if (roomError) {
          console.error(`Error creating room ${room.name}:`, roomError);
          // Don't throw error for room creation failures, just log
        } else {
          console.log(`Created default room: ${room.name} for gym ${gymId}`);
        }
      }
    }

    console.log('Successfully set up gym user:', userId, 'for gym:', gymId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId, 
        gymId,
        userExists,
        gymExists,
        message: userExists 
          ? 'User già esistente collegato alla palestra con successo'
          : 'Nuovo utente creato e configurato con successo'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-gym-user function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});