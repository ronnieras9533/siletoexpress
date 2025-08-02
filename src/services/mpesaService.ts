
import { supabase } from '@/integrations/supabase/client';

export interface MPESAPaymentData {
  amount: number;
  phoneNumber: string;
  orderId: string;
  accountReference?: string;
  transactionDesc?: string;
}

export interface MPESAResponse {
  success: boolean;
  checkoutRequestID?: string;
  merchantRequestID?: string;
  responseCode?: string;
  responseDescription?: string;
  message?: string;
  error?: string;
}

class MPESAService {
  private baseUrl = 'https://hevbjzdahldvijwqtqcx.supabase.co/functions/v1';

  async initiateSTKPush(paymentData: MPESAPaymentData): Promise<MPESAResponse> {
    try {
      console.log('Initiating M-PESA STK Push:', paymentData);
      
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.baseUrl}/mpesa-stk-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          ...paymentData,
          phoneNumber: this.formatPhoneNumber(paymentData.phoneNumber),
          accountReference: paymentData.accountReference || paymentData.orderId,
          transactionDesc: paymentData.transactionDesc || `Payment for order ${paymentData.orderId}`
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('M-PESA API Error:', errorText);
        throw new Error(`Payment service error: ${response.status}`);
      }

      const result = await response.json();
      console.log('M-PESA STK Response:', result);
      
      return result;
    } catch (error) {
      console.error('M-PESA STK Push error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  async checkPaymentStatus(checkoutRequestID: string): Promise<any> {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_id', checkoutRequestID)
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        payment
      };
    } catch (error) {
      console.error('M-PESA status check error:', error);
      throw error;
    }
  }

  formatPhoneNumber(phone: string): string {
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

  validatePhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone);
    return /^254[0-9]{9}$/.test(formatted);
  }
}

export const mpesaService = new MPESAService();
