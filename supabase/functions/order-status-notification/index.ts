
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  orderId: string;
  status: string;
  email: string;
  name: string;
  phone: string;
  items: string;
  county: string;
  totalAmount: number;
}

serve(async (req) => {
  console.log('Order status notification function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: NotificationRequest = await req.json();
    console.log('Notification data received:', data);

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      console.error('BREVO_API_KEY not configured');
      throw new Error('Brevo API key not configured');
    }

    const { orderId, status, email, name, phone, items, county, totalAmount } = data;

    // Prepare email content based on status
    const getEmailSubject = (status: string) => {
      switch (status) {
        case 'confirmed':
          return `Order #${orderId} Confirmed - SiletoExpress`;
        case 'delivered':
          return `Order #${orderId} Delivered - SiletoExpress`;
        case 'paid':
          return `Payment Received for Order #${orderId} - SiletoExpress`;
        default:
          return `Order #${orderId} Update - SiletoExpress`;
      }
    };

    const getEmailContent = (status: string) => {
      const baseContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">SiletoExpress</h1>
            <p style="color: #666; margin: 5px 0;">Your trusted pharmacy delivery service</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${name},</h2>
            <p style="font-size: 16px; color: #374151;">
              Your order <strong>#${orderId}</strong> has been <strong>${status}</strong>.
            </p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Order Details</h3>
            <p><strong>Items:</strong> ${items || 'Not specified'}</p>
            <p><strong>County:</strong> ${county || 'Not specified'}</p>
            <p><strong>Total Amount:</strong> KES ${totalAmount?.toLocaleString() || '0'}</p>
          </div>
      `;

      let statusMessage = '';
      switch (status) {
        case 'confirmed':
          statusMessage = `
            <div style="background: #dbeafe; border: 1px solid #93c5fd; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0; color: #1e40af;">
                <strong>What's next?</strong><br>
                • Your order is being prepared by our pharmacy team<br>
                • You'll receive another notification when your order is out for delivery<br>
                • Expected delivery within 2-3 business days
              </p>
            </div>
          `;
          break;
        case 'delivered':
          statusMessage = `
            <div style="background: #dcfce7; border: 1px solid #86efac; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0; color: #166534;">
                <strong>Order Delivered Successfully!</strong><br>
                Thank you for choosing SiletoExpress. We hope you're satisfied with your order.
              </p>
            </div>
          `;
          break;
        case 'paid':
          statusMessage = `
            <div style="background: #dbeafe; border: 1px solid #93c5fd; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0; color: #1e40af;">
                <strong>Payment Received!</strong><br>
                Your payment has been processed successfully. Your order will be confirmed shortly.
              </p>
            </div>
          `;
          break;
      }

      return baseContent + statusMessage + `
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Thank you for choosing SiletoExpress!<br>
              For support, contact us at +254 718 925 368
            </p>
          </div>
        </div>
      `;
    };

    // Send email notification
    console.log('Sending email notification to:', email);
    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: 'SiletoExpress',
          email: 'noreply@siletoexpress.com'
        },
        to: [{ email: email, name: name }],
        subject: getEmailSubject(status),
        htmlContent: getEmailContent(status)
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Email sending failed:', errorText);
      throw new Error(`Email sending failed: ${emailResponse.status} ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    // Send SMS notification if phone number is provided
    if (phone && phone.trim()) {
      console.log('Sending SMS notification to:', phone);
      
      // Format phone number for Kenya
      let formattedPhone = phone.replace(/\s/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+254' + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith('254')) {
        formattedPhone = '+' + formattedPhone;
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+254' + formattedPhone;
      }

      const smsContent = `Hello ${name}, your SiletoExpress order #${orderId} has been ${status}. Total: KES ${totalAmount?.toLocaleString() || '0'}. Thank you!`;

      const smsResponse = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoApiKey,
        },
        body: JSON.stringify({
          sender: 'SiletoExpress',
          recipient: formattedPhone,
          content: smsContent.substring(0, 160) // SMS length limit
        }),
      });

      if (!smsResponse.ok) {
        const smsErrorText = await smsResponse.text();
        console.error('SMS sending failed:', smsErrorText);
        // Don't throw error for SMS failure, just log it
      } else {
        const smsResult = await smsResponse.json();
        console.log('SMS sent successfully:', smsResult);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent: true,
        smsSent: phone ? true : false
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send notification',
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
