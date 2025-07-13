
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { 
      amount, 
      currency, 
      email, 
      phone_number, 
      name, 
      tx_ref, 
      redirect_url,
      order_id
    } = await req.json();

    const flutterwaveApiKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flutterwaveApiKey) {
      throw new Error('Flutterwave API key not configured');
    }

    const paymentData = {
      tx_ref,
      amount,
      currency,
      redirect_url,
      customer: {
        email,
        phone_number,
        name
      },
      customizations: {
        title: "SiletoExpress Payment",
        description: "Payment for your pharmacy order",
        logo: "https://your-domain.com/logo.png"
      }
    };

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const flutterwaveResponse = await response.json();

    if (flutterwaveResponse.status === 'success') {
      // Create payment record in database
      const supabaseService = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseService.from('payments').insert({
        user_id: user.id,
        order_id: order_id,
        method: 'card',
        amount: amount,
        currency: currency,
        status: 'pending',
        transaction_id: tx_ref,
        gateway: 'flutterwave',
        metadata: {
          flutterwave_response: flutterwaveResponse
        }
      });

      return new Response(JSON.stringify({
        status: 'success',
        data: {
          link: flutterwaveResponse.data.link
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      throw new Error(flutterwaveResponse.message || 'Payment initiation failed');
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
