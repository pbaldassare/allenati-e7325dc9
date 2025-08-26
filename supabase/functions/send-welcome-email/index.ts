import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WelcomeEmailRequest {
  userEmail: string;
  firstName?: string;
  lastName?: string;
  creditsReceived?: number;
  gymName?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

function generateWelcomeEmailHTML(data: WelcomeEmailRequest): string {
  const { firstName = 'Nuovo', lastName = 'Utente', creditsReceived = 1, gymName } = data;
  const fullName = `${firstName} ${lastName}`.trim();
  
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Benvenuto nella nostra community!</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { font-size: 28px; margin-bottom: 10px; font-weight: 700; }
    .header p { font-size: 16px; opacity: 0.9; }
    .content { padding: 40px 30px; }
    .welcome-message { text-align: center; margin-bottom: 30px; }
    .welcome-message h2 { color: #667eea; font-size: 24px; margin-bottom: 15px; }
    .welcome-message p { font-size: 16px; color: #666; line-height: 1.7; }
    .credits-card { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0; }
    .credits-card h3 { font-size: 20px; margin-bottom: 10px; }
    .credits-card .credits-number { font-size: 36px; font-weight: bold; margin: 10px 0; }
    .features { margin: 30px 0; }
    .features h3 { color: #333; font-size: 20px; margin-bottom: 20px; text-align: center; }
    .feature-list { list-style: none; }
    .feature-list li { padding: 8px 0; padding-left: 30px; position: relative; }
    .feature-list li:before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; font-size: 18px; }
    .cta-section { text-align: center; margin: 40px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: transform 0.2s; }
    .cta-button:hover { transform: translateY(-2px); }
    .gym-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
    .footer p { color: #666; font-size: 14px; }
    .social-links { margin: 20px 0; }
    .social-links a { margin: 0 10px; color: #667eea; text-decoration: none; }
    @media (max-width: 600px) {
      .container { margin: 0 10px; }
      .header, .content { padding: 20px; }
      .header h1 { font-size: 24px; }
      .cta-button { padding: 12px 25px; font-size: 14px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Benvenuto!</h1>
      <p>La tua avventura fitness inizia ora</p>
    </div>
    
    <div class="content">
      <div class="welcome-message">
        <h2>Ciao ${fullName}! 👋</h2>
        <p>Siamo entusiasti di averti nella nostra community! Hai fatto il primo passo verso una vita più sana e attiva.</p>
      </div>
      
      <div class="credits-card">
        <h3>🎁 Regalo di Benvenuto</h3>
        <div class="credits-number">${creditsReceived}</div>
        <p>Credito gratuito per iniziare subito!</p>
      </div>
      
      ${gymName ? `
      <div class="gym-info">
        <h3>🏋️‍♀️ La tua palestra</h3>
        <p><strong>${gymName}</strong></p>
        <p>Sei ora membro di questa fantastica community!</p>
      </div>
      ` : ''}
      
      <div class="features">
        <h3>Cosa puoi fare con la nostra app:</h3>
        <ul class="feature-list">
          <li>Prenota le tue lezioni preferite in pochi tap</li>
          <li>Visualizza gli orari dei corsi in tempo reale</li>
          <li>Tieni traccia dei tuoi crediti e abbonamenti</li>
          <li>Ricevi notifiche per le tue prenotazioni</li>
          <li>Connettiti con altri membri della community</li>
          <li>Scopri nuovi corsi e istruttori</li>
        </ul>
      </div>
      
      <div class="cta-section">
        <a href="#" class="cta-button">🚀 Inizia a Esplorare</a>
        <p style="margin-top: 15px; color: #666; font-size: 14px;">
          Pronto a prenotare la tua prima lezione?
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Hai domande?</strong></p>
      <p>Siamo qui per aiutarti! Contattaci per qualsiasi dubbio.</p>
      
      <div class="social-links">
        <a href="#">📧 Supporto</a>
        <a href="#">📱 Download App</a>
        <a href="#">ℹ️ Come Funziona</a>
      </div>
      
      <p style="margin-top: 20px; font-size: 12px; color: #999;">
        © 2024 - Tutti i diritti riservati.<br>
        Hai ricevuto questa email perché ti sei registrato alla nostra piattaforma.
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function sendOneSignalEmail(data: WelcomeEmailRequest): Promise<boolean> {
  try {
    console.log('Sending welcome email via OneSignal to:', data.userEmail);
    
    const emailHTML = generateWelcomeEmailHTML(data);
    
    const oneSignalPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_email_tokens: [data.userEmail],
      email_subject: "🎉 Benvenuto nella nostra community fitness!",
      email_body: emailHTML,
      email_from_name: "Team Fitness",
      email_from_address: "noreply@fitness.app"
    };

    console.log('OneSignal payload prepared:', {
      app_id: ONESIGNAL_APP_ID,
      email: data.userEmail,
      subject: oneSignalPayload.email_subject
    });

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const responseData = await response.json();
    console.log('OneSignal response:', responseData);

    if (response.ok) {
      console.log('Welcome email sent successfully via OneSignal');
      return true;
    } else {
      console.error('OneSignal API error:', responseData);
      return false;
    }
  } catch (error) {
    console.error('Error sending welcome email via OneSignal:', error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Welcome email function called');
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: WelcomeEmailRequest = await req.json();
    console.log('Request data received:', {
      email: requestData.userEmail,
      firstName: requestData.firstName,
      lastName: requestData.lastName,
      credits: requestData.creditsReceived,
      gym: requestData.gymName
    });

    // Validate required fields
    if (!requestData.userEmail) {
      console.error('Missing required field: userEmail');
      return new Response(
        JSON.stringify({ error: 'Missing required field: userEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate OneSignal configuration
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error('OneSignal configuration missing');
      return new Response(
        JSON.stringify({ error: 'OneSignal configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send welcome email via OneSignal
    const emailSent = await sendOneSignalEmail(requestData);

    // Log the result in Supabase
    try {
      const { error: logError } = await supabase
        .from('admin_action_logs')
        .insert({
          action: 'welcome_email_sent',
          admin_id: '00000000-0000-0000-0000-000000000000', // System action
          target_type: 'user_email',
          target_id: requestData.userEmail,
          new_data: {
            email_sent: emailSent,
            user_data: requestData,
            timestamp: new Date().toISOString()
          }
        });

      if (logError) {
        console.error('Error logging welcome email action:', logError);
      }
    } catch (logError) {
      console.error('Error logging welcome email action:', logError);
    }

    if (emailSent) {
      console.log('Welcome email sent successfully');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Welcome email sent successfully',
          email: requestData.userEmail
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Failed to send welcome email');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to send welcome email',
          email: requestData.userEmail
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in send-welcome-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);