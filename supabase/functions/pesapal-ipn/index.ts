import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PesapalStatusResponse {
  payment_method: string
  amount: number
  created_date: string
  confirmation_code: string
  payment_status_description: string
  description: string
  message: string
  payment_account: string
  call_back_url: string
  status_code: number
  merchant_reference: string
  account_number: string
  status: string
}

serve(async (req) => {
  console.log('Pesapal IPN received:', req.method, req.url)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'GET') {
      // Handle IPN callback from Pesapal
      const url = new URL(req.url)
      const orderTrackingId = url.searchParams.get('OrderTrackingId')
      const merchantReference = url.searchParams.get('OrderMerchantReference')

      console.log('IPN parameters:', { orderTrackingId, merchantReference })

      if (!orderTrackingId || !merchantReference) {
        console.error('Missing required IPN parameters')
        return new Response('Missing parameters', { status: 400, headers: corsHeaders })
      }

      // Get Pesapal credentials
      const consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY')
      const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET')

      if (!consumerKey || !consumerSecret) {
        console.error('Missing Pesapal credentials')
        throw new Error('Pesapal credentials not configured')
      }

      // Step 1: Get access token
      const authResponse = await fetch('https://pay.pesapal.com/v3/api/Auth/RequestToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          consumer_key: consumerKey,
          consumer_secret: consumerSecret
        })
      })

      if (!authResponse.ok) {
        console.error('Failed to authenticate with Pesapal for IPN')
        throw new Error('Failed to authenticate with Pesapal')
      }

      const authData = await authResponse.json()

      // Step 2: Get transaction status
      const statusResponse = await fetch(`https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        }
      })

      if (!statusResponse.ok) {
        console.error('Failed to get transaction status:', await statusResponse.text())
        throw new Error('Failed to get transaction status')
      }

      const statusData: PesapalStatusResponse = await statusResponse.json()
      console.log('Transaction status:', statusData)

      // Step 3: Get existing payment record first to preserve metadata
      const { data: existingPayment, error: fetchError } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('pesapal_tracking_id', orderTrackingId)
        .single()

      if (fetchError || !existingPayment) {
        console.error('Failed to fetch payment record:', fetchError)
        throw new Error('Payment record not found')
      }

      // Step 4: Update payment record with transaction status
      const paymentStatus = statusData.status_code === 1 ? 'success' : 
                           statusData.status_code === 2 ? 'failed' : 'pending'

      const { data: payment, error: paymentError } = await supabaseClient
        .from('payments')
        .update({
          status: paymentStatus,
          transaction_id: statusData.confirmation_code,
          metadata: {
            ...existingPayment.metadata, // Preserve existing metadata (cart_items, delivery_info, etc.)
            payment_method: statusData.payment_method,
            payment_account: statusData.payment_account,
            confirmation_code: statusData.confirmation_code,
            payment_status_description: statusData.payment_status_description,
            status_code: statusData.status_code,
            created_date: statusData.created_date
          }
        })
        .eq('pesapal_tracking_id', orderTrackingId)
        .select()
        .single()

      if (paymentError) {
        console.error('Failed to update payment record:', paymentError)
        throw new Error('Failed to update payment record')
      }

      console.log('Payment record updated:', payment)

      // Step 5: Create order and update payment if payment is successful
      if (paymentStatus === 'success') {
        console.log('Payment successful, creating order...')
        
        // Get the payment metadata containing cart items and delivery info
        const metadata = payment.metadata as any
        if (!metadata?.cart_items || !metadata?.delivery_info) {
          console.error('Missing cart items or delivery info in payment metadata')
          throw new Error('Invalid payment metadata')
        }

        // Create order
        const { data: order, error: orderError } = await supabaseClient
          .from('orders')
          .insert({
            user_id: payment.user_id,
            total_amount: payment.amount,
            phone_number: metadata.delivery_info.phone,
            delivery_address: `${metadata.delivery_info.address}, ${metadata.delivery_info.city}`,
            status: 'approved',
            payment_method: 'pesapal',
            currency: payment.currency || 'KES'
          })
          .select()
          .single()

        if (orderError) {
          console.error('Failed to create order:', orderError)
          throw new Error('Failed to create order')
        }

        console.log('Order created:', order.id)

        // Create order items
        const orderItems = metadata.cart_items.map((item: any) => ({
          order_id: order.id,
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        }))

        const { error: itemsError } = await supabaseClient
          .from('order_items')
          .insert(orderItems)

        if (itemsError) {
          console.error('Failed to create order items:', itemsError)
          throw new Error('Failed to create order items')
        }

        console.log('Order items created')

        // Link prescription if exists
        if (metadata.prescription_id) {
          const { error: prescriptionError } = await supabaseClient
            .from('prescriptions')
            .update({ order_id: order.id })
            .eq('id', metadata.prescription_id)

          if (prescriptionError) {
            console.error('Failed to link prescription:', prescriptionError)
          } else {
            console.log('Prescription linked to order')
          }
        }

        // Update payment record with order_id
        const { error: updatePaymentError } = await supabaseClient
          .from('payments')
          .update({ order_id: order.id })
          .eq('id', payment.id)

        if (updatePaymentError) {
          console.error('Failed to update payment with order_id:', updatePaymentError)
        } else {
          console.log('Payment updated with order_id')
        }
      } else {
        console.log(`Payment ${paymentStatus}, no order created`)
      }

      return new Response('IPN processed successfully', {
        status: 200,
        headers: corsHeaders
      })
    }

    if (req.method === 'POST') {
      // Handle POST IPN (alternative method)
      const body = await req.text()
      console.log('POST IPN body:', body)
      
      // Parse form data or JSON as needed
      // This is for future implementation if Pesapal sends POST IPNs
      
      return new Response('POST IPN received', {
        status: 200,
        headers: corsHeaders
      })
    }

    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('IPN processing error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})