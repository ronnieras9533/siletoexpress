
import { supabase } from '@/integrations/supabase/client';

export interface FlutterwavePaymentData {
  amount: number;
  currency: string;
  email: string;
  phone_number: string;
  name: string;
  tx_ref: string;
  redirect_url: string;
  order_id?: string;
  customer: {
    email: string;
    phone_number: string;
    name: string;
  };
  customizations: {
    title: string;
    description: string;
    logo: string;
  };
}

export interface FlutterwaveResponse {
  status: string;
  message: string;
  data?: {
    link: string;
    access_code?: string;
  };
}

class FlutterwaveService {
  private baseUrl = 'https://hevbjzdahldvijwqtqcx.supabase.co/functions/v1';

  async initiatePayment(paymentData: FlutterwavePaymentData): Promise<FlutterwaveResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/flutterwave-payment`, {
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
      console.error('Flutterwave payment initiation error:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async verifyPayment(transactionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/flutterwave-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ transaction_id: transactionId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Flutterwave verification error:', error);
      throw error;
    }
  }

  generateTransactionRef(): string {
    return `SRX_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

export const flutterwaveService = new FlutterwaveService();
