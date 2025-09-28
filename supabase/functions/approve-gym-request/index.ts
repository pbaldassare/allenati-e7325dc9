import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { requestId, action, reason } = await req.json();

    if (!requestId || !action) {
      throw new Error("Request ID and action are required");
    }

    // Get request details - check both tables
    let request, requestType;
    
    // First try gym_join_requests
    const { data: joinRequest, error: joinError } = await supabaseClient
      .from('gym_join_requests')
      .select('*, gym:gyms(name)')
      .eq('id', requestId)
      .maybeSingle();
    
    if (joinRequest) {
      request = joinRequest;
      requestType = 'join';
    } else {
      // Try additional_gym_requests
      const { data: additionalRequest, error: additionalError } = await supabaseClient
        .from('additional_gym_requests')
        .select('*, gym:gyms(name)')
        .eq('id', requestId)
        .single();
      
      if (additionalError) throw additionalError;
      request = additionalRequest;
      requestType = 'additional';
    }

    if (!request) {
      throw new Error("Request not found");
    }

    if (action === 'approve') {
      // Create gym membership
      const membershipType = requestType === 'additional' ? 'owner' : 'member';
      const userId = requestType === 'additional' ? request.requester_user_id : request.user_id;
      
      const { error: membershipError } = await supabaseClient
        .from('user_gym_memberships')
        .insert({
          user_id: userId,
          gym_id: request.gym_id,
          membership_type: membershipType,
          status: 'active'
        });

      if (membershipError) throw membershipError;

      // Update request status in the appropriate table
      const tableName = requestType === 'additional' ? 'additional_gym_requests' : 'gym_join_requests';
      const { error: updateError } = await supabaseClient
        .from(tableName)
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId // TODO: Should be the ID of the approving admin
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Request approved successfully' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === 'reject') {
      // Update request status in the appropriate table
      const tableName = requestType === 'additional' ? 'additional_gym_requests' : 'gym_join_requests';
      const userId = requestType === 'additional' ? request.requester_user_id : request.user_id;
      
      const { error: updateError } = await supabaseClient
        .from(tableName)
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId, // TODO: Should be the ID of the approving admin
          message: reason || 'Request rejected'
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Request rejected successfully' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});