
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
    const { transaction_id } = await req.json();
    
    const flutterwaveApiKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flutterwaveApiKey) {
      throw new Error('Flutterwave API key not configured');
    }

    // Verify transaction with Flutterwave
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${flutterwaveApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const verificationResult = await response.json();

    if (verificationResult.status === 'success' && verificationResult.data.status === 'successful') {
      // Update payment status in database
      const supabaseService = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: payment } = await supabaseService
        .from('payments')
        .select('*, orders(*)')
        .eq('transaction_id', transaction_id)
        .single();

      if (payment) {
        // Update payment status
        await supabaseService
          .from('payments')
          .update({
            status: 'success',
            metadata: {
              ...payment.metadata,
              verification_response: verificationResult
            }
          })
          .eq('id', payment.id);

        // Update order status
        await supabaseService
          .from('orders')
          .update({
            status: 'approved',
            payment_method: 'card'
          })
          .eq('id', payment.order_id);

        return new Response(JSON.stringify({
          status: 'success',
          data: verificationResult.data
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
    }

    return new Response(JSON.stringify({
      status: 'error',
      message: 'Transaction verification failed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
