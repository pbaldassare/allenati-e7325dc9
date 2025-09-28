import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

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

const createBookingConfirmationHTML = (data: BookingConfirmationRequest): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Prenotazione Confermata</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">✅ Prenotazione Confermata!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">La tua prenotazione è stata registrata con successo</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="margin-top: 0; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Dettagli Prenotazione</h2>
          
          <div style="margin: 15px 0;">
            <strong style="color: #555;">👋 Utente:</strong> ${data.userName}
          </div>
          
          <div style="margin: 15px 0;">
            <strong style="color: #555;">🏃 Corso:</strong> ${data.courseName}
          </div>
          
          <div style="margin: 15px 0;">
            <strong style="color: #555;">📅 Data:</strong> ${data.scheduledDate}
          </div>
          
          <div style="margin: 15px 0;">
            <strong style="color: #555;">🕒 Orario:</strong> ${data.scheduledTime}
          </div>
          
          <div style="margin: 15px 0;">
            <strong style="color: #555;">🏢 Palestra:</strong> ${data.gymName}
          </div>
          
          <div style="margin: 15px 0;">
            <strong style="color: #555;">📍 Indirizzo:</strong> ${data.gymAddress}
          </div>
          
          <div style="margin: 15px 0;">
            <strong style="color: #555;">👨‍🏫 Istruttore:</strong> ${data.instructorName}
          </div>
          
          <div style="margin: 15px 0;">
            <strong style="color: #555;">💳 Crediti utilizzati:</strong> ${data.creditsUsed}
          </div>
        </div>

        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0; color: #155724;">📝 Informazioni Importanti</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Ricorda di arrivare 10-15 minuti prima dell'inizio del corso</li>
            <li>Porta con te abbigliamento sportivo adeguato</li>
            <li>Se hai bisogno di annullare, fallo almeno 24 ore prima</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            Booking ID: #${data.bookingId}<br>
            Email inviata automaticamente da Allenati.me
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

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

    const requestData: BookingConfirmationRequest = await req.json();

    console.log('📧 Sending booking confirmation to:', requestData.userEmail);

    // Generate HTML content
    const html = createBookingConfirmationHTML(requestData);

    // For now, we'll just log that we would send an email
    // In production, this would integrate with an email service
    console.log("✅ Email HTML generated successfully");
    console.log("📧 Would send email to:", requestData.userEmail);
    console.log("📧 Subject: ✅ Prenotazione confermata:", requestData.courseName);

    // Log the email action
    await supabase
      .from('admin_action_logs')
      .insert({
        action_type: 'booking_confirmation_email_generated',
        details: {
          booking_id: requestData.bookingId,
          user_email: requestData.userEmail,
          course_name: requestData.courseName
        }
      });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email confirmation generated successfully",
      html: html.substring(0, 200) + "..." // Return truncated HTML for verification
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