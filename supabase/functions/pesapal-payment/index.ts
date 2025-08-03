
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
  console.log('Pesapal payment function called:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify origin
    const origin = req.headers.get('origin') || '';
    console.log('Request origin:', origin);
    
    const { orderId, amount, currency, email, phone, description, callback_url, notification_id, cartItems, deliveryInfo, prescriptionId } = await req.json()
    
    console.log('Payment request data:', { orderId, amount, currency, email, phone });

    // Input validation
    if (!orderId || typeof orderId !== 'string' || orderId.length > 50) {
      console.error('Invalid order ID:', orderId);
      return new Response(
        JSON.stringify({ error: 'Invalid order ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateAmount(amount)) {
      console.error('Invalid amount:', amount);
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (currency !== 'KES') {
      console.error('Invalid currency:', currency);
      return new Response(
        JSON.stringify({ error: 'Only KES currency supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateEmail(email)) {
      console.error('Invalid email:', email);
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateKenyanPhone(phone)) {
      console.error('Invalid phone:', phone);
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
    const baseUrl = 'https://pay.pesapal.com/v3'
    const ipnId = Deno.env.get('PESAPAL_IPN_ID')

    console.log('Pesapal config check:', {
      hasConsumerKey: !!consumerKey,
      hasConsumerSecret: !!consumerSecret,
      hasIpnId: !!ipnId
    });

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
      const errorText = await authResponse.text()
      console.error('Auth error response:', errorText)
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

    console.log('Pesapal access token obtained successfully');

    // Create payment order
    console.log('Creating Pesapal payment order...')
    const orderData = {
      id: sanitizedOrderId,
      currency: currency,
      amount: Math.round(amount * 100) / 100,
      description: sanitizedDescription,
      callback_url: callback_url || `${origin}/pesapal-callback`,
      notification_id: ipnId,
      branch: "SiletoExpress",
      billing_address: {
        email_address: sanitizedEmail,
        phone_number: sanitizedPhone,
        country_code: "KE",
        first_name: "Customer",
        last_name: "SiletoExpress"
      }
    }

    console.log('Pesapal order data:', JSON.stringify(orderData, null, 2));

    const orderResponse = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData)
    })

    console.log('Pesapal order response status:', orderResponse.status);

    if (!orderResponse.ok) {
      console.error('Failed to create Pesapal order:', orderResponse.status, orderResponse.statusText)
      const errorText = await orderResponse.text()
      console.error('Order error response:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create payment order', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderResult = await orderResponse.json()
    console.log('Pesapal order created successfully:', orderResult)

    // Validate redirect URL
    if (!orderResult.redirect_url || !orderResult.redirect_url.includes('pesapal.com')) {
      console.error('Invalid redirect URL received:', orderResult.redirect_url)
      return new Response(
        JSON.stringify({ error: 'Invalid payment redirect URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client and create payment record
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Create payment record with all necessary metadata
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: orderResult.merchant_reference || sanitizedOrderId,
        amount: amount,
        currency: currency,
        status: 'pending',
        payment_method: 'pesapal',
        pesapal_tracking_id: orderResult.order_tracking_id,
        transaction_id: orderResult.merchant_reference,
        metadata: {
          cart_items: cartItems || [],
          delivery_info: deliveryInfo || {},
          prescription_id: prescriptionId,
          pesapal_order_id: sanitizedOrderId,
          email: sanitizedEmail,
          phone: sanitizedPhone
        }
      });

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
    } else {
      console.log('Payment record created successfully');
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
        message: 'An unexpected error occurred while processing your payment',
        details: error.message 
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
