
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeliveryNotificationRequest {
  order_id: string;
  user_id: string;
  phone_number: string;
  total_amount: number;
  county: string;
  delivery_address: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { order_id, user_id, phone_number, total_amount, county, delivery_address }: DeliveryNotificationRequest = await req.json();

    console.log('Processing delivery notification for order:', order_id);

    // Get user profile for full name and email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    const userName = profile.full_name || 'Customer';
    const userEmail = profile.email;

    // Create notification in database
    await supabase
      .from('notifications')
      .insert({
        user_id,
        title: 'Order Delivered Successfully',
        message: `Your order #${order_id} has been successfully delivered to ${delivery_address}, ${county}. Thank you for shopping with SiletoExpress!`,
        type: 'order_status',
        order_id
      });

    // Send SMS if phone number exists
    if (phone_number) {
      const smsMessage = `Hello ${userName}, your order #${order_id} has been successfully delivered. Thank you for shopping with SiletoExpress!`;
      
      // Note: SMS integration would require Africa's Talking or Twilio API
      // For now, we'll log the SMS that would be sent
      console.log('SMS to send:', {
        to: phone_number,
        message: smsMessage
      });
    }

    // Send email if email exists
    if (userEmail) {
      const emailSubject = 'Order Delivered Successfully - SiletoExpress';
      const emailBody = `
        <h2>Order Delivered Successfully!</h2>
        <p>Dear ${userName},</p>
        <p>Your order #${order_id} has been successfully delivered to:</p>
        <p><strong>${delivery_address}, ${county}</strong></p>
        <p>Order Total: KES ${total_amount.toLocaleString()}</p>
        <p>Thank you for shopping with SiletoExpress!</p>
        <p>Best regards,<br>The SiletoExpress Team</p>
      `;

      // Note: Email integration would require Resend or similar service
      // For now, we'll log the email that would be sent
      console.log('Email to send:', {
        to: userEmail,
        subject: emailSubject,
        html: emailBody
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Delivery notification processed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in delivery notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
