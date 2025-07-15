
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

// Enhanced environment variable loading with robust error handling
function getRequiredEnvVar(name: string): string {
  const value = Deno.env.get(name);
  
  if (!value) {
    console.error(`Environment variable ${name} is not set or is empty`);
    throw new Error(`Required environment variable ${name} is missing`);
  }

  // Trim whitespace and check for common issues
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    console.error(`Environment variable ${name} is empty after trimming`);
    throw new Error(`Environment variable ${name} is empty`);
  }

  // Log basic info without exposing the actual value
  console.log(`✓ ${name} loaded successfully (length: ${trimmedValue.length})`);
  return trimmedValue;
}

// Environment detection
function isProdEnvironment(): boolean {
  const env = Deno.env.get('DENO_DEPLOYMENT_ID');
  return !!env; // Supabase sets this in production
}

// Get Pesapal base URL based on environment
function getPesapalBaseUrl(): string {
  return isProdEnvironment() 
    ? 'https://pay.pesapal.com/v3/api' 
    : 'https://cybqa.pesapal.com/pesapalv3/api'; // sandbox
}

// Authentication with Pesapal with enhanced error handling
async function authenticateWithPesapal(): Promise<string> {
  console.log('=== Starting Pesapal authentication ===')
  console.log(`Environment: ${isProdEnvironment() ? 'Production' : 'Sandbox'}`)
  
  try {
    const consumerKey = getRequiredEnvVar('PESAPAL_CONSUMER_KEY');
    const consumerSecret = getRequiredEnvVar('PESAPAL_CONSUMER_SECRET');
    
    const baseUrl = getPesapalBaseUrl();
    const authUrl = `${baseUrl}/Auth/RequestToken`;
    
    const authPayload = {
      consumer_key: consumerKey,
      consumer_secret: consumerSecret
    }
    
    console.log(`Sending auth request to: ${authUrl}`);

    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(authPayload)
    })

    console.log(`Pesapal auth response status: ${authResponse.status}`);

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error(`Authentication failed with status ${authResponse.status}:`, errorText)
      throw new Error(`Authentication failed: ${authResponse.status} - ${errorText}`)
    }

    const authData: PesapalAuthResponse = await authResponse.json()
    console.log('Authentication response:', {
      status: authData.status,
      hasToken: !!authData.token,
      message: authData.message
    });

    if (!authData.token) {
      console.error('No token in auth response:', authData)
      throw new Error(`Authentication failed: ${authData.message || 'No token received'}`)
    }

    console.log('✓ Pesapal authentication successful')
    return authData.token

  } catch (error) {
    console.error('❌ Authentication error:', error.message)
    throw new Error(`Pesapal authentication failed: ${error.message}`)
  }
}

// Create payment order with enhanced validation and error handling
async function createPesapalPaymentOrder(
  token: string,
  requestData: PaymentRequest
): Promise<{ paymentData: PesapalPaymentResponse; merchantReference: string }> {
  console.log('=== Creating Pesapal payment order ===')
  
  try {
    const { amount, currency, userId, customerInfo, formData } = requestData
    const merchantReference = `PESAPAL_${userId}_${Date.now()}`
    const supabaseUrl = getRequiredEnvVar('SUPABASE_URL')
    
    const baseUrl = getPesapalBaseUrl();
    const paymentUrl = `${baseUrl}/Transactions/SubmitOrderRequest`;
    const callbackUrl = `${supabaseUrl}/functions/v1/pesapal-ipn`
    const redirectUrl = `https://siletoexpress.netlify.app/pesapal-callback`

    // Enhanced phone number formatting with validation
    let formattedPhone = customerInfo.phone.replace(/^\+?254/, '254');
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone.replace(/^0/, '');
    }
    
    // Validate phone number format
    if (!/^254\d{9}$/.test(formattedPhone)) {
      throw new Error(`Invalid phone number format: ${customerInfo.phone}`);
    }

    console.log('Phone formatting:', {
      original: customerInfo.phone,
      formatted: formattedPhone
    });

    // Enhanced billing address with validation
    const firstName = customerInfo.name.split(' ')[0] || 'Customer';
    const lastName = customerInfo.name.split(' ').slice(1).join(' ') || 'User';

    if (!customerInfo.email || !customerInfo.email.includes('@')) {
      throw new Error('Invalid email address');
    }

    // Fixed payment order data structure to match Pesapal API requirements
    const paymentOrderData = {
      id: merchantReference,
      currency: currency.toUpperCase(),
      amount: parseFloat(amount.toString()),
      description: `SiletoExpress Payment - Order ${merchantReference}`,
      callback_url: callbackUrl,
      redirect_mode: "PARENT_WINDOW",
      notification_id: merchantReference,
      branch: "SiletoExpress Main",
      billing_address: {
        email_address: customerInfo.email.toLowerCase().trim(),
        phone_number: formattedPhone,
        country_code: "KE",
        first_name: firstName.trim(),
        middle_name: "",
        last_name: lastName.trim(),
        line_1: formData.address?.trim() || "N/A",
        line_2: "",
        city: formData.city?.trim() || "Nairobi",
        state: "Kenya",
        postal_code: "00100",
        zip_code: "00100"
      }
    }

    console.log('Payment order data:', {
      id: paymentOrderData.id,
      amount: paymentOrderData.amount,
      currency: paymentOrderData.currency,
      email: paymentOrderData.billing_address.email_address,
      phone: paymentOrderData.billing_address.phone_number,
      url: paymentUrl
    });

    const paymentResponse = await fetch(paymentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentOrderData)
    })

    console.log(`Payment order response status: ${paymentResponse.status}`);

    const responseText = await paymentResponse.text();
    console.log('Raw payment response:', responseText);

    if (!paymentResponse.ok) {
      console.error(`Payment order creation failed with status ${paymentResponse.status}:`, responseText)
      throw new Error(`Payment order failed: ${paymentResponse.status} - ${responseText}`)
    }

    let paymentData: PesapalPaymentResponse;
    try {
      paymentData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse payment response:', parseError);
      throw new Error(`Invalid payment response format: ${responseText}`);
    }
    
    console.log('Payment order created:', {
      tracking_id: paymentData.order_tracking_id,
      merchant_ref: paymentData.merchant_reference,
      has_redirect_url: !!paymentData.redirect_url,
      status: paymentData.status,
      full_response: paymentData
    });

    if (!paymentData.redirect_url) {
      console.error('No redirect URL in payment response:', paymentData)
      
      // Check if there's an error in the response
      if (paymentData.error) {
        throw new Error(`Pesapal error: ${JSON.stringify(paymentData.error)}`)
      }
      
      throw new Error('No payment URL received from Pesapal - please check API credentials and request format')
    }

    console.log('✓ Payment order created successfully')
    return { paymentData, merchantReference }

  } catch (error) {
    console.error('❌ Payment order creation error:', error.message)
    throw new Error(`Payment order creation failed: ${error.message}`)
  }
}

// Enhanced payment intent storage with better error handling
async function storePaymentIntent(
  supabaseClient: any,
  requestData: PaymentRequest,
  paymentData: PesapalPaymentResponse,
  merchantReference: string
): Promise<void> {
  console.log('=== Storing payment intent in database ===')
  
  try {
    const { userId, amount, currency, cartItems, prescriptionId, formData, customerInfo } = requestData

    const paymentRecord = {
      user_id: userId,
      order_id: null, // No order created yet for prescription orders
      amount: Number(amount),
      currency: currency.toUpperCase(),
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
        },
        environment: isProdEnvironment() ? 'production' : 'sandbox'
      }
    }

    console.log('Storing payment record:', {
      user_id: paymentRecord.user_id,
      amount: paymentRecord.amount,
      currency: paymentRecord.currency,
      tracking_id: paymentRecord.pesapal_tracking_id
    });

    const { error: paymentError } = await supabaseClient
      .from('payments')
      .insert(paymentRecord)

    if (paymentError) {
      console.error('Database insert error:', paymentError)
      throw new Error(`Database error: ${paymentError.message}`)
    }

    console.log('✓ Payment intent stored successfully')

  } catch (error) {
    console.error('❌ Payment storage error:', error.message)
    throw new Error(`Payment storage failed: ${error.message}`)
  }
}

// Enhanced request validation
function validatePaymentRequest(requestData: any): PaymentRequest {
  const required = ['userId', 'amount', 'currency', 'customerInfo', 'formData', 'cartItems'];
  const missing = required.filter(field => !requestData[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  if (!requestData.customerInfo.email || !requestData.customerInfo.phone || !requestData.customerInfo.name) {
    throw new Error('Missing customer information (email, phone, name)');
  }

  if (!Array.isArray(requestData.cartItems) || requestData.cartItems.length === 0) {
    throw new Error('Cart items must be a non-empty array');
  }

  if (typeof requestData.amount !== 'number' || requestData.amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  return requestData as PaymentRequest;
}

serve(async (req) => {
  console.log('=== Pesapal Payment Function Called ===')
  console.log(`Method: ${req.method}`)
  console.log(`URL: ${req.url}`)
  console.log(`Environment: ${isProdEnvironment() ? 'Production' : 'Sandbox'}`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    console.log('=== Initializing Supabase client ===')
    const supabaseUrl = getRequiredEnvVar('SUPABASE_URL');
    const serviceKey = getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabaseClient = createClient(supabaseUrl, serviceKey)
    console.log('✓ Supabase client initialized successfully')

    if (req.method === 'POST') {
      console.log('=== Processing POST request ===')
      
      // Parse and validate request
      let requestData: PaymentRequest
      try {
        const rawBody = await req.text()
        console.log(`Raw request body length: ${rawBody.length}`)
        
        const parsedData = JSON.parse(rawBody)
        requestData = validatePaymentRequest(parsedData);
        
        console.log('✓ Request data validated:', {
          userId: requestData.userId,
          amount: requestData.amount,
          currency: requestData.currency,
          cartItemsCount: requestData.cartItems.length,
          hasCustomerInfo: !!requestData.customerInfo,
          hasFormData: !!requestData.formData,
          prescriptionId: requestData.prescriptionId || 'none'
        })
      } catch (error) {
        console.error('❌ Request parsing/validation failed:', error.message)
        throw new Error(`Invalid request: ${error.message}`)
      }

      // Step 1: Authenticate with Pesapal
      console.log('=== Step 1: Authenticating with Pesapal ===')
      const token = await authenticateWithPesapal()

      // Step 2: Create payment order
      console.log('=== Step 2: Creating payment order ===')
      const { paymentData, merchantReference } = await createPesapalPaymentOrder(token, requestData)

      // Step 3: Store payment intent in database
      console.log('=== Step 3: Storing payment intent ===')
      await storePaymentIntent(supabaseClient, requestData, paymentData, merchantReference)

      console.log('=== ✓ Payment process completed successfully ===')
      
      return new Response(
        JSON.stringify({
          success: true,
          redirect_url: paymentData.redirect_url,
          order_tracking_id: paymentData.order_tracking_id,
          merchant_reference: merchantReference,
          environment: isProdEnvironment() ? 'production' : 'sandbox'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('❌ Method not allowed:', req.method)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('=== ❌ Pesapal Payment Error ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Error type:', error.constructor.name)
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('credentials') || error.message.includes('authentication')) {
      statusCode = 401;
    } else if (error.message.includes('validation') || error.message.includes('Invalid')) {
      statusCode = 400;
    }
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Payment processing failed',
        success: false,
        environment: isProdEnvironment() ? 'production' : 'sandbox'
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
