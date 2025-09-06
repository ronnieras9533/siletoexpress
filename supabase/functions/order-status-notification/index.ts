
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

interface BrevoEmailTemplate {
  templateId?: number;
  params: Record<string, any>;
}

interface NotificationConfig {
  email: {
    subject: string;
    templateId?: number;
    htmlContent?: string;
  };
  sms: {
    message: string;
  };
}

// Modular notification configurations
const getNotificationConfig = (
  status: string,
  orderId: string,
  name: string,
  items: string,
  county: string,
  totalAmount: number
): NotificationConfig | null => {
  const baseParams = {
    orderNumber: orderId,
    customerName: name,
    items: items || 'Not specified',
    county: county || 'Not specified',
    totalAmount: totalAmount?.toLocaleString() || '0',
  };

  switch (status) {
    case 'confirmed':
      return {
        email: {
          subject: `Order #${orderId} Confirmed - Sileto Pharmaceuticals`,
          // You can add templateId: 4 if you have a Brevo template
          htmlContent: generateEmailHTML('confirmed', baseParams)
        },
        sms: {
          message: `Hello ${name}, your Sileto Pharmaceuticals order #${orderId} has been confirmed. Total: KES ${totalAmount?.toLocaleString() || '0'}. Expected delivery in 2-3 days. Thank you!`
        }
      };

    case 'delivered':
      return {
        email: {
          subject: `Order #${orderId} Delivered - Sileto Pharmaceuticals`,
          // You can add templateId: 5 if you have a Brevo template
          htmlContent: generateEmailHTML('delivered', baseParams)
        },
        sms: {
          message: `Hello ${name}, your Sileto Pharmaceuticals order #${orderId} has been delivered successfully. Total: KES ${totalAmount?.toLocaleString() || '0'}. Thank you for choosing us!`
        }
      };

    default:
      console.log(`No notification config for status: ${status}`);
      return null;
  }
};

const generateEmailHTML = (status: string, params: any): string => {
  const { orderNumber, customerName, items, county, totalAmount } = params;
  
  const baseContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">Sileto Pharmaceuticals</h1>
        <p style="color: #666; margin: 5px 0;">Your trusted pharmacy delivery service</p>
      </div>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #1f2937; margin-top: 0;">Hello ${customerName},</h2>
        <p style="font-size: 16px; color: #374151;">
          Your order <strong>#${orderNumber}</strong> has been <strong>${status}</strong>.
        </p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Order Details</h3>
        <p><strong>Items:</strong> ${items}</p>
        <p><strong>County:</strong> ${county}</p>
        <p><strong>Total Amount:</strong> KES ${totalAmount}</p>
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
            Thank you for choosing Sileto Pharmaceuticals. We hope you're satisfied with your order.
          </p>
        </div>
      `;
      break;
  }

  return baseContent + statusMessage + `
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          Thank you for choosing Sileto Pharmaceuticals!<br>
          For support, contact us at +254 718 925 368
        </p>
      </div>
    </div>
  `;
};

const formatKenyanPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  let formattedPhone = phone.replace(/\s/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+254' + formattedPhone.substring(1);
  } else if (formattedPhone.startsWith('254')) {
    formattedPhone = '+' + formattedPhone;
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+254' + formattedPhone;
  }
  return formattedPhone;
};

const sendBrevoEmail = async (
  brevoApiKey: string,
  email: string,
  name: string,
  config: NotificationConfig['email']
): Promise<void> => {
  const emailPayload: any = {
    sender: {
      name: 'Sileto Pharmaceuticals',
      email: 'orders@sileto-pharmaceuticals.com'
    },
    to: [{ email, name }],
    subject: config.subject
  };

  // Use template if provided, otherwise use HTML content
  if (config.templateId) {
    emailPayload.templateId = config.templateId;
    // Add template params here if using templates
  } else {
    emailPayload.htmlContent = config.htmlContent;
  }

  const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': brevoApiKey,
    },
    body: JSON.stringify(emailPayload),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    throw new Error(`Email sending failed: ${emailResponse.status} ${errorText}`);
  }

  const emailResult = await emailResponse.json();
  console.log('Email sent successfully:', emailResult);
};

const sendBrevoSMS = async (
  brevoApiKey: string,
  phone: string,
  message: string
): Promise<void> => {
  const formattedPhone = formatKenyanPhoneNumber(phone);
  if (!formattedPhone) {
    console.log('No valid phone number provided, skipping SMS');
    return;
  }

  const smsResponse = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': brevoApiKey,
    },
    body: JSON.stringify({
      sender: 'Sileto Pharmaceuticals',
      recipient: formattedPhone,
      content: message.substring(0, 160) // SMS length limit
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
};

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

    // Get notification configuration for this status
    const config = getNotificationConfig(status, orderId, name, items, county, totalAmount);
    if (!config) {
      console.log(`No notifications configured for status: ${status}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `No notifications configured for status: ${status}`,
          emailSent: false,
          smsSent: false
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let emailSent = false;
    let smsSent = false;

    // Send email notification
    if (email && email.trim()) {
      try {
        console.log('Sending email notification to:', email);
        await sendBrevoEmail(brevoApiKey, email, name, config.email);
        emailSent = true;
      } catch (error) {
        console.error('Email sending failed:', error);
        // Continue with SMS even if email fails
      }
    }

    // Send SMS notification
    if (phone && phone.trim()) {
      try {
        console.log('Sending SMS notification to:', phone);
        await sendBrevoSMS(brevoApiKey, phone, config.sms.message);
        smsSent = true;
      } catch (error) {
        console.error('SMS sending failed:', error);
        // Don't fail the whole request if SMS fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent,
        smsSent,
        status: status
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
