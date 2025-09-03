import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    // Initialize Supabase client with service role key for database access
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { subscriptionId } = await req.json();
    
    if (!subscriptionId) {
      throw new Error('ID abbonamento non fornito');
    }

    console.log('Generating receipt for subscription:', subscriptionId);

    // Get subscription details with all related data
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans!inner(
          name,
          price,
          duration_days,
          credits_included,
          unlimited_access
        ),
        profiles!inner(
          first_name,
          last_name,
          fiscal_code,
          email
        )
      `)
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      throw new Error('Abbonamento non trovato');
    }

    // Get gym details from user's gym membership
    const { data: gymMembership } = await supabaseClient
      .from('user_gym_memberships')
      .select(`
        gyms!inner(
          name,
          address,
          city,
          postal_code,
          phone,
          email,
          logo_url
        )
      `)
      .eq('user_id', subscription.user_id)
      .eq('status', 'active')
      .single();

    if (!gymMembership?.gyms) {
      throw new Error('Dati palestra non trovati');
    }

    const gym = gymMembership.gyms;
    const plan = subscription.subscription_plans;
    const user = subscription.profiles;

    // Generate receipt number (timestamp-based for uniqueness)
    const receiptNumber = `RIC-${Date.now()}`;
    
    // Format dates
    const issueDate = new Date().toLocaleDateString('it-IT');
    const startDate = new Date(subscription.starts_at).toLocaleDateString('it-IT');
    const endDate = new Date(subscription.expires_at).toLocaleDateString('it-IT');

    // Create HTML content for PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ricevuta Abbonamento</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
                line-height: 1.6;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .gym-logo {
                max-width: 100px;
                margin-bottom: 10px;
            }
            .gym-name {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            .gym-info {
                font-size: 12px;
                color: #666;
            }
            .receipt-title {
                text-align: center;
                font-size: 20px;
                font-weight: bold;
                margin: 30px 0;
                text-transform: uppercase;
            }
            .receipt-number {
                text-align: right;
                margin-bottom: 20px;
                font-weight: bold;
            }
            .section {
                margin-bottom: 25px;
            }
            .section-title {
                font-weight: bold;
                border-bottom: 1px solid #ccc;
                padding-bottom: 5px;
                margin-bottom: 10px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            }
            .amount-section {
                background-color: #f9f9f9;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .total-amount {
                font-size: 18px;
                font-weight: bold;
                text-align: center;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #ccc;
                font-size: 10px;
                color: #666;
                text-align: center;
            }
            @media print {
                body { margin: 0; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            ${gym.logo_url ? `<img src="${gym.logo_url}" alt="Logo" class="gym-logo">` : ''}
            <div class="gym-name">${gym.name}</div>
            <div class="gym-info">
                ${gym.address}, ${gym.city} ${gym.postal_code}<br>
                Tel: ${gym.phone || 'N/A'} | Email: ${gym.email || 'N/A'}
            </div>
        </div>

        <div class="receipt-title">Ricevuta Abbonamento</div>
        
        <div class="receipt-number">
            Ricevuta N°: ${receiptNumber}<br>
            Data emissione: ${issueDate}
        </div>

        <div class="section">
            <div class="section-title">Dati Cliente</div>
            <div class="info-row">
                <span>Nome e Cognome:</span>
                <span>${user.first_name} ${user.last_name}</span>
            </div>
            <div class="info-row">
                <span>Email:</span>
                <span>${user.email}</span>
            </div>
            ${user.fiscal_code ? `
            <div class="info-row">
                <span>Codice Fiscale:</span>
                <span>${user.fiscal_code}</span>
            </div>
            ` : ''}
        </div>

        <div class="section">
            <div class="section-title">Dettagli Abbonamento</div>
            <div class="info-row">
                <span>Piano:</span>
                <span>${plan.name}</span>
            </div>
            <div class="info-row">
                <span>Durata:</span>
                <span>${plan.duration_days} giorni</span>
            </div>
            <div class="info-row">
                <span>Periodo:</span>
                <span>dal ${startDate} al ${endDate}</span>
            </div>
            <div class="info-row">
                <span>Tipo:</span>
                <span>${plan.unlimited_access ? 'Accesso Illimitato' : `${plan.credits_included} Crediti`}</span>
            </div>
            <div class="info-row">
                <span>Causale:</span>
                <span>${plan.name}</span>
            </div>
        </div>

        <div class="amount-section">
            <div class="total-amount">
                Importo: € ${plan.price ? parseFloat(plan.price).toFixed(2) : '0.00'}
            </div>
        </div>

        <div class="footer">
            Ricevuta generata automaticamente il ${issueDate}<br>
            ${gym.name} - Sistema di gestione abbonamenti
        </div>
    </body>
    </html>
    `;

    // Use Puppeteer to generate PDF
    const puppeteer = await import("https://deno.land/x/puppeteer@16.2.0/mod.ts");
    
    const browser = await puppeteer.default.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();

    console.log('PDF generated successfully for subscription:', subscriptionId);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ricevuta-abbonamento-${receiptNumber}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generating receipt:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Errore nella generazione della ricevuta' 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }
});