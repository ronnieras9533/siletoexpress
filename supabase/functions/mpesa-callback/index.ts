import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const callbackData = await req.json();
    console.log('M-PESA Callback received:', JSON.stringify(callbackData, null, 2));

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { Body } = callbackData;
    const { stkCallback } = Body;

    if (stkCallback) {
      const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
      
      console.log('Processing STK callback:', { CheckoutRequestID, ResultCode, ResultDesc });

      // Find the payment record
      const { data: payment, error: findError } = await supabaseClient
        .from('payments')
        .select('*, orders(*)')
        .eq('transaction_id', CheckoutRequestID)
        .single();

      if (findError) {
        console.error('Error finding payment:', findError);
        return new Response('Payment not found', { status: 404 });
      }

      if (ResultCode === 0) {
        // Payment successful
        let mpesaReceiptNumber = '';
        let phoneNumber = '';
        let amount = 0;
        
        if (CallbackMetadata?.Item) {
          for (const item of CallbackMetadata.Item) {
            if (item.Name === 'MpesaReceiptNumber') {
              mpesaReceiptNumber = item.Value;
            } else if (item.Name === 'PhoneNumber') {
              phoneNumber = item.Value;
            } else if (item.Name === 'Amount') {
              amount = item.Value;
            }
          }
        }

        console.log('Payment successful:', { mpesaReceiptNumber, phoneNumber, amount });

        // Update payment status
        const { error: updatePaymentError } = await supabaseClient
          .from('payments')
          .update({
            status: 'completed',
            metadata: {
              ...payment.metadata,
              callback: callbackData,
              mpesa_receipt_number: mpesaReceiptNumber,
              phone_number: phoneNumber
            }
          })
          .eq('id', payment.id);

        if (updatePaymentError) {
          console.error('Error updating payment:', updatePaymentError);
        }

        // Update order status
        if (payment.orders) {
          const { error: updateOrderError } = await supabaseClient
            .from('orders')
            .update({
              status: 'approved',
              mpesa_receipt_number: mpesaReceiptNumber
            })
            .eq('id', payment.order_id);

          if (updateOrderError) {
            console.error('Error updating order:', updateOrderError);
          }
        }

        console.log('Payment and order updated successfully');
      } else {
        // Payment failed
        console.log('Payment failed:', ResultDesc);

        // Update payment status to failed
        const { error: updatePaymentError } = await supabaseClient
          .from('payments')
          .update({
            status: 'failed',
            metadata: {
              ...payment.metadata,
              callback: callbackData,
              error_message: ResultDesc
            }
          })
          .eq('id', payment.id);

        if (updatePaymentError) {
          console.error('Error updating failed payment:', updatePaymentError);
        }

        // Update order status to cancelled
        if (payment.orders) {
          const { error: updateOrderError } = await supabaseClient
            .from('orders')
            .update({
              status: 'cancelled'
            })
            .eq('id', payment.order_id);

          if (updateOrderError) {
            console.error('Error updating cancelled order:', updateOrderError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ message: 'Callback processed successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('M-PESA callback error:', error);
    return new Response(
      JSON.stringify({
        error: 'Callback processing failed',
        message: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});