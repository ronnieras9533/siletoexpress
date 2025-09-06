
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Input validation functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
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
    const { amount, currency, customerInfo, formData } = await req.json()

    // Input validation
    if (!validateAmount(amount)) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['USD', 'EUR', 'KES'].includes(currency)) {
      return new Response(
        JSON.stringify({ error: 'Unsupported currency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateEmail(customerInfo.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedCustomerInfo = {
      email: sanitizeInput(customerInfo.email.toLowerCase()),
      phone: sanitizeInput(customerInfo.phone),
      name: sanitizeInput(customerInfo.name)
    };

    // Get PayPal credentials from environment
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID')
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
    const paypalBaseUrl = Deno.env.get('PAYPAL_BASE_URL') || 'https://api-m.sandbox.paypal.com' // sandbox by default

    if (!paypalClientId || !paypalClientSecret) {
      console.error('Missing PayPal credentials')
      return new Response(
        JSON.stringify({ error: 'Payment service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get PayPal access token
    console.log('Getting PayPal access token...')
    const authResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`,
      },
      body: 'grant_type=client_credentials'
    })

    if (!authResponse.ok) {
      console.error('Failed to get PayPal access token:', authResponse.status, authResponse.statusText)
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with payment service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authData = await authResponse.json()
    const accessToken = authData.access_token

    if (!accessToken) {
      console.error('No access token received from PayPal')
      return new Response(
        JSON.stringify({ error: 'Authentication failed with payment service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create PayPal order
    console.log('Creating PayPal order...')
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency === 'KES' ? 'USD' : currency, // Convert KES to USD for PayPal
          value: currency === 'KES' ? (amount / 100).toFixed(2) : amount.toFixed(2) // Rough conversion for demo
        },
        description: `Sileto Pharmaceuticals Order - ${amount} ${currency}`
      }],
      application_context: {
        return_url: `${req.headers.get('origin')}/payment-success`,
        cancel_url: `${req.headers.get('origin')}/checkout`,
        shipping_preference: 'NO_SHIPPING'
      }
    }

    const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData)
    })

    if (!orderResponse.ok) {
      console.error('Failed to create PayPal order:', orderResponse.status, orderResponse.statusText)
      const errorText = await orderResponse.text()
      console.error('Error response:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create payment order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderResult = await orderResponse.json()
    console.log('PayPal order created:', orderResult)

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Log payment initiation for security monitoring
    try {
      await supabase
        .from('debug_log')
        .insert({
          message: `PayPal payment initiated: ${orderResult.id} - Amount: ${amount} ${currency} - Email: ${sanitizedCustomerInfo.email}`
        });
    } catch (error) {
      console.warn('Failed to log payment initiation:', error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderResult.id,
        approval_url: orderResult.links?.find((link: any) => link.rel === 'approve')?.href,
        message: 'PayPal order created successfully'
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
    console.error('Error in PayPal payment function:', error)
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
