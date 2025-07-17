
// @deno-types="https://deno.land/std@0.190.0/http/server.ts"
// @deno-types="https://deno.land/std@0.190.0/http/server.d.ts"
// If running in Deno, ensure your editor supports remote imports and Deno types.
// If running in Node.js, use a Node.js HTTP server instead:
import { createServer } from "http";
// import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Replace Deno's serve usage with Node.js createServer below if needed.
//import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
// ...existing code...
import { createClient } from '@supabase/supabase-js';
// ...existing code...

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

// Node.js HTTP server implementation
createServer(async (req, res) => {
  // Enable CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', async () => {
      const supabase = createClient(
        process.env.SUPABASE_URL ?? '',
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
      );

      const { order_id, user_id, phone_number, total_amount, county, delivery_address }: DeliveryNotificationRequest = JSON.parse(body);

      console.log('Processing delivery notification for order:', order_id);

      // Get user profile for full name and email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user_id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to fetch user profile' }));
        return;
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

      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Delivery notification processed' }));
    });

  } catch (error: any) {
    console.error('Error in delivery notification:', error);
    res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}).listen(process.env.PORT || 3000, () => {
  console.log('Server running on port', process.env.PORT || 3000);
});
