import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧹 Starting cleanup of expired waitlist entries...');

    // Call the database function to process expired waitlist entries
    const { data, error } = await supabase.rpc('refund_expired_waitlist');

    if (error) {
      console.error('❌ Error running refund_expired_waitlist:', error);
      throw error;
    }

    const refundedCount = data?.length || 0;
    console.log(`✅ Cleanup complete. Refunded ${refundedCount} expired waitlist entries.`);

    if (refundedCount > 0) {
      console.log('Refunded entries:', data);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${refundedCount} expired waitlist entries`,
        refunded: data || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('💥 Fatal error in cleanup-expired-waitlist:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
