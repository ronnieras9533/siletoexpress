
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get OAuth token from Safaricom
async function getOAuthToken(): Promise<string> {
  const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
  const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
  
  if (!consumerKey || !consumerSecret) {
    throw new Error('M-PESA credentials not configured');
  }

  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  
  const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    }
  });

  if (!response.ok) {
    throw new Error(`OAuth request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Helper function to generate password
function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  const data = shortcode + passkey + timestamp;
  return btoa(data);
}

// Helper function to format phone number
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 0, replace with 254
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  
  // If it doesn't start with 254, add it
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phoneNumber, amount, orderId, accountReference, transactionDesc } = await req.json();

    console.log('M-PESA STK Push request:', { phoneNumber, amount, orderId });

    // Get environment variables
    const shortcode = Deno.env.get('MPESA_SHORTCODE') || '174379';
    const passkey = Deno.env.get('MPESA_PASSKEY') || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get OAuth token
    const accessToken = await getOAuthToken();
    console.log('OAuth token obtained successfully');

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = generatePassword(shortcode, passkey, timestamp);

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('Formatted phone:', formattedPhone);

    // Prepare STK Push request
    const stkPushData = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: "https://siletoexpress.netlify.app/mpesa-callback",
      AccountReference: accountReference || orderId,
      TransactionDesc: transactionDesc || `Payment for order ${orderId}`
    };

    console.log('STK Push data:', { ...stkPushData, Password: '[HIDDEN]' });

    // Send STK Push request
    const stkResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPushData)
    });

    const stkResult = await stkResponse.json();
    console.log('STK Push response:', stkResult);

    if (stkResult.ResponseCode === '0') {
      // Store payment record for tracking
      const { error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          order_id: orderId,
          amount: amount,
          currency: 'KES',
          method: 'mpesa',
          gateway: 'mpesa',
          status: 'pending',
          transaction_id: stkResult.CheckoutRequestID,
          metadata: stkResult
        });

      if (paymentError) {
        console.error('Error storing payment record:', paymentError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: stkResult.CustomerMessage || 'STK Push sent successfully',
          checkoutRequestID: stkResult.CheckoutRequestID,
          merchantRequestID: stkResult.MerchantRequestID,
          responseCode: stkResult.ResponseCode,
          responseDescription: stkResult.ResponseDescription
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      throw new Error(stkResult.errorMessage || 'STK Push failed');
    }

  } catch (error) {
    console.error('M-PESA STK Push error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
