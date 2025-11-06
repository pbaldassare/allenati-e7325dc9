import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { user_id, gym_id } = await req.json();

    if (!user_id || !gym_id) {
      throw new Error('user_id and gym_id are required');
    }

    console.log('Owner removing user from gym:', { 
      user_id, 
      gym_id, 
      requesting_user: user.id 
    });

    // Verify requesting user is owner or super instructor of this gym
    const { data: isOwner } = await supabase.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'gym_owner' 
    });
    const { data: hasPrivileges } = await supabase.rpc('instructor_has_owner_privileges_for_gym', { 
      _user_id: user.id, 
      _gym_id: gym_id 
    });

    if (!isOwner && !hasPrivileges) {
      throw new Error('Permission denied: must be gym owner or super instructor');
    }

    // Prevent self-removal
    if (user_id === user.id) {
      throw new Error('Cannot remove yourself from the gym');
    }

    // Verify user is member of this gym
    const { data: membership, error: membershipError } = await supabase
      .from('user_gym_memberships')
      .select('id, status')
      .eq('user_id', user_id)
      .eq('gym_id', gym_id)
      .single();

    if (membershipError || !membership) {
      throw new Error('User is not a member of this gym');
    }

    // Soft delete: set membership to inactive
    const { error: updateError } = await supabase
      .from('user_gym_memberships')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('gym_id', gym_id);

    if (updateError) throw updateError;

    // If user is instructor, deactivate their instructor assignment for this gym
    const { data: instructor } = await supabase
      .from('instructors')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (instructor) {
      await supabase
        .from('instructor_gym_assignments')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('instructor_id', instructor.id)
        .eq('gym_id', gym_id);
    }

    // Cancel all future bookings for this user in this gym
    // First, get all course IDs for this gym
    const { data: gymCourses } = await supabase
      .from('courses')
      .select('id')
      .eq('gym_id', gym_id);

    const courseIds = gymCourses?.map(c => c.id) || [];

    if (courseIds.length > 0) {
      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancellation_reason: 'Utente rimosso dalla palestra',
          cancelled_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('status', 'confirmed')
        .in('course_id', courseIds)
        .gte('scheduled_date', new Date().toISOString().split('T')[0]);

      if (bookingsError) {
        console.error('Error cancelling bookings:', bookingsError);
        // Don't throw, this is not critical
      }
    }

    console.log('User removed from gym successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User removed from gym successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in owner-delete-user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
