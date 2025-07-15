
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  orderId: string
  amount: number
  currency: string
  email: string
  phone: string
  description: string
}

interface PesapalAuthResponse {
  token: string
  expiryDate: string
  error?: string
  message?: string
}

interface PesapalOrderRequest {
  id: string
  currency: string
  amount: number
  description: string
  callback_url: string
  redirect_mode: string
  notification_id: string
  billing_address: {
    email_address: string
    phone_number: string
    country_code: string
    first_name: string
    middle_name: string
    last_name: string
    line_1: string
    line_2: string
    city: string
    state: string
    postal_code: string
    zip_code: string
  }
}

interface PesapalOrderResponse {
  order_tracking_id: string
  merchant_reference: string
  redirect_url: string
  error?: {
    error_type: string
    code: string
    message: string
    description: string
  }
}

const getPesapalBaseUrl = (): string => {
  const env = Deno.env.get('PESAPAL_BASE_URL') || 'https://cybqa.pesapal.com/pesapalv3/api'
  console.log('Using Pesapal base URL:', env)
  return env
}

const getSupabaseUrl = (): string => {
  const url = Deno.env.get('SUPABASE_URL')
  if (!url) {
    throw new Error('SUPABASE_URL environment variable is required')
  }
  return url.replace(/\/$/, '') // Remove trailing slash
}

const authenticateWithPesapal = async (): Promise<string> => {
  const consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY')
  const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET')
  
  if (!consumerKey || !consumerSecret) {
    throw new Error('Pesapal credentials not configured')
  }

  console.log('Authenticating with Pesapal...')
  
  const baseUrl = getPesapalBaseUrl()
  const authUrl = `${baseUrl}/Auth/RequestToken`
  
  const authData = {
    consumer_key: consumerKey,
    consumer_secret: consumerSecret
  }

  console.log('Auth request to:', authUrl)
  console.log('Auth data (redacted):', { consumer_key: consumerKey, consumer_secret: '[REDACTED]' })

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(authData)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Pesapal auth failed:', response.status, errorText)
    throw new Error(`Pesapal authentication failed: ${response.status} ${errorText}`)
  }

  const authResult: PesapalAuthResponse = await response.json()
  console.log('Auth response:', authResult)
  
  if (authResult.error) {
    throw new Error(`Pesapal auth error: ${authResult.message}`)
  }

  if (!authResult.token) {
    throw new Error('No token received from Pesapal')
  }

  console.log('Successfully authenticated with Pesapal')
  return authResult.token
}

const createPesapalPaymentOrder = async (
  token: string, 
  paymentData: PaymentRequest
): Promise<PesapalOrderResponse> => {
  console.log('Creating Pesapal payment order for:', paymentData.orderId)
  
  const supabaseUrl = getSupabaseUrl()
  const baseUrl = getPesapalBaseUrl()
  const paymentUrl = `${baseUrl}/Transactions/SubmitOrderRequest`
  
  // Construct proper callback URL for Pesapal IPN
  const callbackUrl = `${supabaseUrl}/functions/v1/pesapal-ipn`
  const redirectUrl = `https://siletoexpress.netlify.app/pesapal-callback`

  console.log('URLs configured:', {
    paymentUrl,
    callbackUrl,
    redirectUrl,
    supabaseUrl
  })

  // Enhanced phone number formatting with validation
  let formattedPhone = paymentData.phone.replace(/\D/g, '')
  
  // Handle different phone number formats
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.substring(1)
  } else if (!formattedPhone.startsWith('254')) {
    formattedPhone = '254' + formattedPhone
  }
  
  // Validate phone number length
  if (formattedPhone.length !== 12) {
    console.warn('Invalid phone number format:', paymentData.phone, 'formatted to:', formattedPhone)
  }

  console.log('Phone number formatting:', {
    original: paymentData.phone,
    formatted: formattedPhone
  })

  const paymentOrderData: PesapalOrderRequest = {
    id: paymentData.orderId,
    currency: paymentData.currency || 'KES',
    amount: paymentData.amount,
    description: paymentData.description,
    callback_url: callbackUrl,
    redirect_mode: 'PARENT_WINDOW',
    notification_id: paymentData.orderId,
    billing_address: {
      email_address: paymentData.email,
      phone_number: formattedPhone,
      country_code: 'KE',
      first_name: 'Customer',
      middle_name: '',
      last_name: 'User',
      line_1: 'Nairobi',
      line_2: '',
      city: 'Nairobi',
      state: 'Nairobi',
      postal_code: '00100',
      zip_code: '00100'
    }
  }

  console.log('Payment order data being sent to Pesapal:', {
    id: paymentOrderData.id,
    amount: paymentOrderData.amount,
    currency: paymentOrderData.currency,
    email: paymentOrderData.billing_address.email_address,
    phone: paymentOrderData.billing_address.phone_number,
    callback_url: paymentOrderData.callback_url,
    redirect_mode: paymentOrderData.redirect_mode,
    url: paymentUrl
  })

  const response = await fetch(paymentUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(paymentOrderData)
  })

  console.log('Pesapal payment response status:', response.status)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Pesapal payment order failed:', response.status, errorText)
    throw new Error(`Payment order creation failed: ${response.status} ${errorText}`)
  }

  const result: PesapalOrderResponse = await response.json()
  console.log('Pesapal payment order response:', result)
  
  if (result.error) {
    const errorMsg = `Pesapal error: ${JSON.stringify(result.error)}`
    console.error('Pesapal returned error:', result.error)
    throw new Error(`Payment order creation failed: ${errorMsg}`)
  }

  if (!result.order_tracking_id || !result.redirect_url) {
    console.error('Invalid Pesapal response - missing required fields:', result)
    throw new Error('Invalid response from Pesapal - missing tracking ID or redirect URL')
  }

  console.log('Successfully created Pesapal payment order:', {
    tracking_id: result.order_tracking_id,
    merchant_ref: result.merchant_reference
  })
  
  return result
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Received request:', req.method, req.url)
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const paymentData: PaymentRequest = await req.json()
    console.log('Payment request data:', {
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      email: paymentData.email,
      phone: paymentData.phone
    })

    // Validate required fields
    if (!paymentData.orderId || !paymentData.amount || !paymentData.email) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: orderId, amount, email' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Authenticate with Pesapal
    const token = await authenticateWithPesapal()
    
    // Create payment order
    const paymentOrder = await createPesapalPaymentOrder(token, paymentData)
    
    // Store payment record in database
    const { error: dbError } = await supabase
      .from('payments')
      .insert({
        order_id: paymentData.orderId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'KES',
        method: 'pesapal',
        gateway: 'pesapal',
        status: 'pending',
        pesapal_tracking_id: paymentOrder.order_tracking_id,
        pesapal_merchant_reference: paymentOrder.merchant_reference,
        metadata: {
          email: paymentData.email,
          phone: paymentData.phone,
          description: paymentData.description
        }
      })

    if (dbError) {
      console.error('Database error storing payment:', dbError)
      throw new Error(`Database error: ${dbError.message}`)
    }

    console.log('Payment order created successfully:', {
      tracking_id: paymentOrder.order_tracking_id,
      redirect_url: paymentOrder.redirect_url
    })

    return new Response(JSON.stringify({
      success: true,
      order_tracking_id: paymentOrder.order_tracking_id,
      redirect_url: paymentOrder.redirect_url,
      merchant_reference: paymentOrder.merchant_reference
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in pesapal-payment function:', error)
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
