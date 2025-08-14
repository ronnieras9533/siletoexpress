import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Validation helpers
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
const validateKenyanPhone = (phone: string) => /^254[17]\d{8}$/.test(phone);
const validateAmount = (amount: number) => Number.isFinite(amount) && amount > 0 && amount <= 1000000;
const sanitizeInput = (input: string) => input.replace(/[<>\"'&]/g, '').trim();

serve(async (req) => {
  console.log('Pesapal payment function called:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const origin = req.headers.get('origin') || '';
    console.log('Request origin:', origin);

    // ✅ Direct JSON parse like mpesa
    let parsedData;
    try {
      parsedData = await req.json();
    } catch (err) {
      console.error('Invalid JSON body:', err);
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { orderId, amount, currency, email, phone, description, callback_url, cartItems, deliveryInfo, prescriptionId } = parsedData;
    console.log('Payment request data:', { orderId, amount, currency, email, phone });

    // ✅ Validations
    if (!orderId || typeof orderId !== 'string' || orderId.length > 50)
      return badRequest('Invalid order ID');
    if (!validateAmount(amount))
      return badRequest('Invalid amount');
    if (currency !== 'KES')
      return badRequest('Only KES currency supported');
    if (!validateEmail(email))
      return badRequest('Invalid email format');
    if (!validateKenyanPhone(phone))
      return badRequest('Invalid Kenyan phone number format');

    const sanitizedOrderId = sanitizeInput(orderId);
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedPhone = sanitizeInput(phone);
    const sanitizedDescription = sanitizeInput(description || `Payment for order ${sanitizedOrderId}`);

    // ✅ Pesapal credentials
    const consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET');
    const ipnId = Deno.env.get('PESAPAL_IPN_ID');
    const baseUrl = 'https://pay.pesapal.com/v3';

    if (!consumerKey || !consumerSecret) {
      return internalError('Payment service configuration error');
    }

    // ✅ Auth token
    const authResponse = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret })
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('Auth error:', errorText);
      return internalError('Failed to authenticate with payment service');
    }

    const authData = await authResponse.json();
    const accessToken = authData.token;
    if (!accessToken) return internalError('Authentication failed with payment service');

    // ✅ Order creation
    const orderData = {
      id: sanitizedOrderId,
      currency,
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
    };

    const orderResponse = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify(orderData)
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Order error:', errorText);
      return internalError('Failed to create payment order');
    }

    const orderResult = await orderResponse.json();
    if (!orderResult.redirect_url || !orderResult.redirect_url.includes('pesapal.com'))
      return internalError('Invalid payment redirect URL');

    // ✅ Save payment
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: orderResult.merchant_reference || sanitizedOrderId,
        amount,
        currency,
        status: 'pending',
        payment_method: 'pesapal',
        pesapal_tracking_id: orderResult.order_tracking_id,
        transaction_id: orderResult.merchant_reference,
        metadata: { cart_items: cartItems || [], delivery_info: deliveryInfo || {}, prescription_id: prescriptionId }
      });

    if (paymentError) console.error('Failed to store payment:', paymentError);

    return new Response(JSON.stringify({
      success: true,
      order_tracking_id: orderResult.order_tracking_id,
      merchant_reference: orderResult.merchant_reference,
      redirect_url: orderResult.redirect_url
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Pesapal payment error:', error);
    return internalError('Internal server error');
  }
});

// Helper responses
function badRequest(message: string) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function internalError(message: string) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
