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

        // Now create the order since payment is successful
        const orderData = payment.metadata;
        const { data: order, error: orderError } = await supabaseClient
          .from('orders')
          .insert({
            user_id: payment.user_id,
            total_amount: payment.amount,
            phone_number: orderData.phone_number,
            delivery_address: orderData.delivery_address,
            status: 'approved', // Directly set to approved since payment is successful
            payment_method: 'mpesa',
            currency: 'KES',
            mpesa_receipt_number: mpesaReceiptNumber
          })
          .select()
          .single();

        if (orderError) {
          console.error('Error creating order:', orderError);
        } else {
          console.log('Order created successfully:', order.id);

          // Create order items
          if (orderData.items && Array.isArray(orderData.items)) {
            const orderItems = orderData.items.map((item: any) => ({
              order_id: order.id,
              product_id: item.id,
              quantity: item.quantity,
              price: item.price
            }));

            const { error: itemsError } = await supabaseClient
              .from('order_items')
              .insert(orderItems);

            if (itemsError) {
              console.error('Error creating order items:', itemsError);
            } else {
              console.log('Order items created successfully');
            }
          }

          // Link prescription if exists
          if (orderData.prescription_id) {
            const { error: prescriptionError } = await supabaseClient
              .from('prescriptions')
              .update({ order_id: order.id })
              .eq('id', orderData.prescription_id);

            if (prescriptionError) {
              console.error('Error linking prescription:', prescriptionError);
            }
          }

          // Update payment with order reference
          const { error: updatePaymentError } = await supabaseClient
            .from('payments')
            .update({
              status: 'completed',
              order_id: order.id,
              metadata: {
                ...payment.metadata,
                callback: callbackData,
                mpesa_receipt_number: mpesaReceiptNumber,
                phone_number: phoneNumber,
                order_id: order.id
              }
            })
            .eq('id', payment.id);

          if (updatePaymentError) {
            console.error('Error updating payment with order:', updatePaymentError);
          }
        }

        console.log('Payment processing completed successfully');
      } else {
        // Payment failed - just update payment status (no order to cancel since none was created)
        console.log('Payment failed:', ResultDesc);

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