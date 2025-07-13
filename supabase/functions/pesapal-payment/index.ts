
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  amount: number
  currency: string
  userId: string
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
  prescriptionId?: string | null
  cartItems: Array<{
    id: string
    quantity: number
    price: number
  }>
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

// Authentication with Pesapal
async function authenticateWithPesapal(): Promise<string> {
  console.log('Starting Pesapal authentication...')
  
  const consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY')
  const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET')

  if (!consumerKey || !consumerSecret) {
    console.error('Missing Pesapal credentials - consumerKey:', !!consumerKey, 'consumerSecret:', !!consumerSecret)
    throw new Error('Pesapal credentials not configured')
  }

  try {
    const authPayload = {
      consumer_key: consumerKey,
      consumer_secret: consumerSecret
    }
    
    console.log('Sending auth request to Pesapal with payload keys:', Object.keys(authPayload))

    const authResponse = await fetch('https://pay.pesapal.com/v3/api/Auth/RequestToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(authPayload)
    })

    console.log('Pesapal auth response status:', authResponse.status)

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error('Failed to authenticate with Pesapal:', errorText)
      throw new Error(`Failed to authenticate with Pesapal: ${errorText}`)
    }

    const authData: PesapalAuthResponse = await authResponse.json()
    console.log('Pesapal auth successful, token length:', authData.token?.length || 0)

    if (!authData.token) {
      console.error('No token in auth response:', authData)
      throw new Error('Failed to get access token from Pesapal')
    }

    return authData.token
  } catch (error) {
    console.error('Error in authenticateWithPesapal:', error)
    throw error
  }
}

// Create payment order with Pesapal
async function createPesapalPaymentOrder(
  token: string,
  requestData: PaymentRequest
): Promise<{ paymentData: PesapalPaymentResponse; merchantReference: string }> {
  console.log('Creating Pesapal payment order...')
  
  try {
    const { amount, currency, userId, customerInfo, formData } = requestData
    const merchantReference = `PESAPAL_${userId}_${Date.now()}`
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL not configured')
    }
    
    const callbackUrl = `${supabaseUrl}/functions/v1/pesapal-ipn`
    const redirectUrl = `https://siletoexpress.netlify.app/pesapal-callback`

    // Ensure phone number is properly formatted
    const formattedPhone = customerInfo.phone.replace(/^\+?254/, '254')
    console.log('Original phone:', customerInfo.phone, 'Formatted phone:', formattedPhone)

    const paymentOrderData = {
      id: merchantReference,
      currency: currency,
      amount: amount,
      description: `SiletoExpress Payment - ${merchantReference}`,
      callback_url: callbackUrl,
      redirect_mode: 'PARENT_WINDOW',
      cancellation_url: redirectUrl,
      notification_id: merchantReference,
      branch: 'SiletoExpress Main',
      billing_address: {
        email_address: customerInfo.email,
        phone_number: formattedPhone,
        country_code: 'KE',
        first_name: customerInfo.name.split(' ')[0] || 'Customer',
        last_name: customerInfo.name.split(' ').slice(1).join(' ') || 'User',
        line_1: formData.address || 'N/A',
        city: formData.city || 'Nairobi',
        state: 'Kenya',
        postal_code: '00100',
        zip_code: '00100'
      }
    }

    console.log('Payment order data prepared:', {
      id: paymentOrderData.id,
      amount: paymentOrderData.amount,
      currency: paymentOrderData.currency,
      email: paymentOrderData.billing_address.email_address,
      phone: paymentOrderData.billing_address.phone_number
    })

    const paymentResponse = await fetch('https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentOrderData)
    })

    console.log('Pesapal payment response status:', paymentResponse.status)

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text()
      console.error('Failed to create payment order:', errorText)
      throw new Error(`Failed to create payment order: ${errorText}`)
    }

    const paymentData: PesapalPaymentResponse = await paymentResponse.json()
    console.log('Payment order created successfully:', {
      tracking_id: paymentData.order_tracking_id,
      merchant_ref: paymentData.merchant_reference,
      has_redirect_url: !!paymentData.redirect_url
    })

    if (!paymentData.redirect_url) {
      console.error('No redirect URL in payment response:', paymentData)
      throw new Error('No redirect URL received from Pesapal')
    }

    return { paymentData, merchantReference }
  } catch (error) {
    console.error('Error in createPesapalPaymentOrder:', error)
    throw error
  }
}

// Store payment intent in database
async function storePaymentIntent(
  supabaseClient: any,
  requestData: PaymentRequest,
  paymentData: PesapalPaymentResponse,
  merchantReference: string
): Promise<void> {
  console.log('Storing payment intent in database...')
  
  try {
    const { userId, amount, currency, cartItems, prescriptionId, formData, customerInfo } = requestData

    const paymentRecord = {
      user_id: userId,
      order_id: null, // No order created yet
      amount: amount,
      currency: currency,
      method: 'pesapal',
      gateway: 'pesapal',
      status: 'pending',
      pesapal_tracking_id: paymentData.order_tracking_id,
      pesapal_merchant_reference: merchantReference,
      metadata: {
        redirect_url: paymentData.redirect_url,
        cart_items: cartItems,
        prescription_id: prescriptionId,
        delivery_info: {
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          notes: formData.notes
        },
        billing_address: {
          email_address: customerInfo.email,
          phone_number: customerInfo.phone,
          first_name: customerInfo.name.split(' ')[0],
          last_name: customerInfo.name.split(' ').slice(1).join(' '),
          line_1: formData.address,
          city: formData.city
        }
      }
    }

    console.log('Payment record to insert:', {
      user_id: paymentRecord.user_id,
      amount: paymentRecord.amount,
      tracking_id: paymentRecord.pesapal_tracking_id,
      merchant_ref: paymentRecord.pesapal_merchant_reference
    })

    const { error: paymentError } = await supabaseClient
      .from('payments')
      .insert(paymentRecord)

    if (paymentError) {
      console.error('Failed to store payment intent:', paymentError)
      throw new Error(`Failed to store payment intent: ${paymentError.message}`)
    }

    console.log('Payment intent stored successfully')
  } catch (error) {
    console.error('Error in storePaymentIntent:', error)
    throw error
  }
}

serve(async (req) => {
  console.log('=== Pesapal Payment Function Called ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Initializing Supabase client...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase environment variables')
      throw new Error('Supabase configuration missing')
    }
    
    const supabaseClient = createClient(supabaseUrl, serviceKey)
    console.log('Supabase client initialized')

    if (req.method === 'POST') {
      console.log('Processing POST request...')
      
      let requestData: PaymentRequest
      try {
        requestData = await req.json()
        console.log('Request data parsed:', {
          userId: requestData.userId,
          amount: requestData.amount,
          currency: requestData.currency,
          cartItemsCount: requestData.cartItems?.length || 0,
          hasCustomerInfo: !!requestData.customerInfo,
          hasFormData: !!requestData.formData
        })
      } catch (error) {
        console.error('Failed to parse request JSON:', error)
        throw new Error('Invalid JSON in request body')
      }

      // Validate required fields
      if (!requestData.userId || !requestData.amount || !requestData.currency) {
        console.error('Missing required fields:', { userId: requestData.userId, amount: requestData.amount, currency: requestData.currency })
        throw new Error('Missing required payment data')
      }

      if (!requestData.customerInfo?.email || !requestData.customerInfo?.phone) {
        console.error('Missing customer info:', requestData.customerInfo)
        throw new Error('Missing customer information')
      }

      // Step 1: Authenticate with Pesapal
      console.log('Step 1: Authenticating with Pesapal...')
      const token = await authenticateWithPesapal()

      // Step 2: Create payment order
      console.log('Step 2: Creating payment order...')
      const { paymentData, merchantReference } = await createPesapalPaymentOrder(token, requestData)

      // Step 3: Store payment intent in database
      console.log('Step 3: Storing payment intent...')
      await storePaymentIntent(supabaseClient, requestData, paymentData, merchantReference)

      console.log('Payment process completed successfully')
      
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

    console.log('Method not allowed:', req.method)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('=== Pesapal Payment Error ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
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
