
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://hevbjzdahldvijwqtqcx.netlify.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Input validation functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function validateKenyanPhone(phone: string): boolean {
  const kenyanPhoneRegex = /^254[17]\d{8}$/;
  return kenyanPhoneRegex.test(phone);
}

function validateAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0 && amount <= 1000000;
}

function sanitizeInput(input: string): string {
  return input.replace(/[<>\"'&]/g, '').trim();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify origin
    const origin = req.headers.get('x-client-origin') || req.headers.get('origin') || '';
    const allowedOrigins = [
      'https://hevbjzdahldvijwqtqcx.netlify.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    
    if (!allowedOrigins.includes(origin)) {
      console.error('Invalid origin:', origin);
      return new Response(
        JSON.stringify({ error: 'Invalid origin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check (simple in-memory store for demo)
    const rateLimitKey = req.headers.get('x-forwarded-for') || 'unknown';
    
    const { orderId, amount, currency, email, phone, description, callback_url, notification_id } = await req.json()

    // Input validation
    if (!orderId || typeof orderId !== 'string' || orderId.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Invalid order ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateAmount(amount)) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (currency !== 'KES') {
      return new Response(
        JSON.stringify({ error: 'Only KES currency supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateKenyanPhone(phone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Kenyan phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedOrderId = sanitizeInput(orderId);
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedPhone = sanitizeInput(phone);
    const sanitizedDescription = sanitizeInput(description || `Payment for order ${sanitizedOrderId}`);

    // Get Pesapal credentials from environment
    const consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY')
    const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET')
    const baseUrl = Deno.env.get('PESAPAL_BASE_URL') || 'https://cybqa.pesapal.com/pesapalv3'
    const ipnId = Deno.env.get('PESAPAL_IPN_ID')

    if (!consumerKey || !consumerSecret) {
      console.error('Missing Pesapal credentials')
      return new Response(
        JSON.stringify({ error: 'Payment service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token
    console.log('Getting Pesapal access token...')
    const authResponse = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret
      })
    })

    if (!authResponse.ok) {
      console.error('Failed to get Pesapal access token:', authResponse.status, authResponse.statusText)
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with payment service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authData = await authResponse.json()
    const accessToken = authData.token

    if (!accessToken) {
      console.error('No access token received from Pesapal')
      return new Response(
        JSON.stringify({ error: 'Authentication failed with payment service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create payment order with enhanced security
    console.log('Creating Pesapal payment order...')
    const orderData = {
      id: sanitizedOrderId,
      currency: currency,
      amount: Math.round(amount * 100) / 100, // Ensure 2 decimal places
      description: sanitizedDescription,
      callback_url: callback_url || `${origin}/pesapal-callback`,
      notification_id: notification_id || ipnId,
      branch: "SiletoExpress",
      billing_address: {
        email_address: sanitizedEmail,
        phone_number: sanitizedPhone,
        country_code: "KE",
        first_name: "Customer",
        last_name: "SiletoExpress"
      }
    }

    const orderResponse = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData)
    })

    if (!orderResponse.ok) {
      console.error('Failed to create Pesapal order:', orderResponse.status, orderResponse.statusText)
      const errorText = await orderResponse.text()
      console.error('Error response:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create payment order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderResult = await orderResponse.json()
    console.log('Pesapal order created:', orderResult)

    // Validate redirect URL
    if (!orderResult.redirect_url || !orderResult.redirect_url.includes('pesapal.com')) {
      console.error('Invalid redirect URL received:', orderResult.redirect_url)
      return new Response(
        JSON.stringify({ error: 'Invalid payment redirect URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Log payment initiation for security monitoring
    try {
      await supabase
        .from('debug_log')
        .insert({
          message: `Payment initiated: ${sanitizedOrderId} - Amount: ${amount} ${currency} - Email: ${sanitizedEmail}`
        });
    } catch (error) {
      console.warn('Failed to log payment initiation:', error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_tracking_id: orderResult.order_tracking_id,
        merchant_reference: orderResult.merchant_reference,
        redirect_url: orderResult.redirect_url,
        message: 'Payment initiated successfully'
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        } 
      }
    )

  } catch (error) {
    console.error('Error in Pesapal payment function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your payment' 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        } 
      }
    )
  }
})
