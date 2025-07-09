
import { supabase } from '@/integrations/supabase/client';

export interface MPESAPaymentData {
  amount: number;
  phoneNumber: string;
  orderId: string;
  accountReference: string;
  transactionDesc: string;
}

export interface MPESAResponse {
  success: boolean;
  checkoutRequestID?: string;
  responseCode?: string;
  responseDescription?: string;
  customerMessage?: string;
  error?: string;
}

class MPESAService {
  private baseUrl = 'https://hevbjzdahldvijwqtqcx.supabase.co/functions/v1';

  async initiateSTKPush(paymentData: MPESAPaymentData): Promise<MPESAResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/mpesa-stk-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('M-PESA STK Push error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async checkPaymentStatus(checkoutRequestID: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/mpesa-status-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ checkoutRequestID })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
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
