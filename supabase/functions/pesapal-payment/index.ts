import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  amount: number
  currency: string
  orderId: string
  customerInfo: {
    email: string
    phone: string
    name: string
  }
  formData: {
    phone: string
    address: string
    city: string
    notes: string
  }
}

interface PesapalAuthResponse {
  token: string
  expiryDate: string
  error: null
  status: string
  message: string
}

interface PesapalPaymentResponse {
  order_tracking_id: string
  merchant_reference: string
  redirect_url: string
  error: null
  status: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'POST') {
      const requestData: PaymentRequest = await req.json()
      console.log('Payment request received:', requestData)

      const { amount, currency, orderId, customerInfo, formData } = requestData

      // Get Pesapal credentials from secrets
      const consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY')
      const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET')

      if (!consumerKey || !consumerSecret) {
        console.error('Missing Pesapal credentials')
        throw new Error('Pesapal credentials not configured')
      }

      console.log('Authenticating with Pesapal...')

      // Step 1: Get access token from Pesapal
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
        console.error('Failed to authenticate with Pesapal:', await authResponse.text())
        throw new Error('Failed to authenticate with Pesapal')
      }

      const authData: PesapalAuthResponse = await authResponse.json()
      console.log('Pesapal auth response:', authData)

      if (!authData.token) {
        throw new Error('Failed to get access token from Pesapal')
      }

      // Step 2: Create payment order
      const merchantReference = `ORDER_${orderId}_${Date.now()}`
      const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/pesapal-ipn`
      const redirectMode = 'PARENT_WINDOW'
      const redirectUrl = `https://hevbjzdahldvijwqtqcx.supabase.co/pesapal-callback`

      const paymentOrderData = {
        id: merchantReference,
        currency: currency,
        amount: amount,
        description: `SiletoExpress Order #${orderId}`,
        callback_url: callbackUrl,
        redirect_mode: redirectMode,
        cancellation_url: redirectUrl,
        notification_id: merchantReference,
        branch: 'SiletoExpress Main',
        billing_address: {
          email_address: customerInfo.email,
          phone_number: customerInfo.phone.replace(/^\+?254/, '254'),
          country_code: 'KE',
          first_name: customerInfo.name.split(' ')[0] || 'Customer',
          last_name: customerInfo.name.split(' ').slice(1).join(' ') || 'User',
          line_1: formData.address,
          city: formData.city,
          state: 'Kenya',
          postal_code: '00100',
          zip_code: '00100'
        }
      }

      console.log('Creating payment order with data:', paymentOrderData)

      const paymentResponse = await fetch('https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        },
        body: JSON.stringify(paymentOrderData)
      })

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text()
        console.error('Failed to create payment order:', errorText)
        throw new Error(`Failed to create payment order: ${errorText}`)
      }

      const paymentData: PesapalPaymentResponse = await paymentResponse.json()
      console.log('Payment order created:', paymentData)

      if (!paymentData.redirect_url) {
        throw new Error('No redirect URL received from Pesapal')
      }

      // Step 3: Store payment record in database
      const { error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          order_id: orderId,
          amount: amount,
          currency: currency,
          method: 'pesapal',
          gateway: 'pesapal',
          status: 'pending',
          pesapal_tracking_id: paymentData.order_tracking_id,
          pesapal_merchant_reference: merchantReference,
          metadata: {
            redirect_url: paymentData.redirect_url,
            billing_address: paymentOrderData.billing_address
          }
        })

      if (paymentError) {
        console.error('Failed to store payment record:', paymentError)
        throw new Error('Failed to store payment record')
      }

      console.log('Payment record stored successfully')

      return new Response(
        JSON.stringify({
          success: true,
          redirect_url: paymentData.redirect_url,
          order_tracking_id: paymentData.order_tracking_id,
          merchant_reference: merchantReference
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Pesapal payment error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Payment processing failed',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})