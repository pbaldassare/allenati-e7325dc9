import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { Resend } from "npm:resend@2.0.0";
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { BookingConfirmationEmail } from './_templates/booking-confirmation.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  bookingId: string;
  userEmail: string;
  userName: string;
  courseName: string;
  scheduledDate: string;
  scheduledTime: string;
  gymName: string;
  gymAddress: string;
  instructorName: string;
  creditsUsed: number;
  qrCode?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 Booking confirmation email function called');

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      bookingId,
      userEmail, 
      userName, 
      courseName, 
      scheduledDate, 
      scheduledTime, 
      gymName, 
      gymAddress,
      instructorName,
      creditsUsed,
      qrCode 
    }: BookingConfirmationRequest = await req.json();

    console.log('📧 Sending booking confirmation to:', userEmail);

    // Render the email template
    const html = await renderAsync(
      React.createElement(BookingConfirmationEmail, {
        userName,
        courseName,
        scheduledDate,
        scheduledTime,
        gymName,
        gymAddress,
        instructorName,
        creditsUsed,
        qrCode,
        bookingId
      })
    );

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Allenati.me <noreply@allenati.me>",
      to: [userEmail],
      subject: `✅ Prenotazione confermata: ${courseName}`,
      html,
    });

    console.log("✅ Email sent successfully:", emailResponse);

    // Log the email sending action
    await supabase
      .from('admin_action_logs')
      .insert({
        action_type: 'booking_confirmation_email_sent',
        details: {
          booking_id: bookingId,
          user_email: userEmail,
          course_name: courseName,
          email_id: emailResponse.data?.id
        }
      });

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("❌ Error in send-booking-confirmation function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);