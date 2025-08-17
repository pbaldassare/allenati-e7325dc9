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

    // Get request details
    const { data: request, error: requestError } = await supabaseClient
      .from('gym_join_requests')
      .select('*, gym:gyms(name)')
      .eq('id', requestId)
      .single();

    if (requestError) throw requestError;

    if (action === 'approve') {
      // Create gym membership
      const { error: membershipError } = await supabaseClient
        .from('user_gym_memberships')
        .insert({
          user_id: request.user_id,
          gym_id: request.gym_id,
          membership_type: 'member',
          status: 'active'
        });

      if (membershipError) throw membershipError;

      // Update request status
      const { error: updateError } = await supabaseClient
        .from('gym_join_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: request.user_id // In realtà dovrebbe essere l'ID del gym owner
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Request approved successfully' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === 'reject') {
      // Update request status
      const { error: updateError } = await supabaseClient
        .from('gym_join_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: request.user_id, // In realtà dovrebbe essere l'ID del gym owner
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
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});