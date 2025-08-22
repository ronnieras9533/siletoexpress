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
      const token = session?.session?.access_token;
      if (!token) {
        throw new Error('User not authenticated');
      }

      const formattedPhone = this.formatPhoneNumber(paymentData.phoneNumber);
      const payload = {
        ...paymentData,
        phoneNumber: formattedPhone,
        accountReference: paymentData.accountReference || paymentData.orderId,
        transactionDesc: paymentData.transactionDesc || `Payment for order ${paymentData.orderId}`
      };

      const response = await fetch(`${this.baseUrl}/mpesa-stk-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let result: any;

      try {
        result = JSON.parse(text);
      } catch {
        console.error('Invalid JSON from M-PESA STK Push:', text);
        return {
          success: false,
          error: 'Unexpected server response',
        };
      }

      if (!response.ok || !result.success) {
        console.error('M-PESA STK Push failed:', result);
        return {
          success: false,
          error: result.error || `Payment failed (${response.status})`,
        };
      }

      console.log('M-PESA STK Push Success:', result);
      return result;
    } catch (error) {
      console.error('M-PESA STK Push error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error occurred',
      };
    }
  }

  async waitForPaymentConfirmation(checkoutRequestID: string, timeoutMs: number = 120000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 3000; // Poll every 3 seconds

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const { data: payment, error } = await supabase
            .from('payments')
            .select('*')
            .eq('transaction_id', checkoutRequestID)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('Error checking payment status:', error);
            reject(new Error('Failed to check payment status'));
            return;
          }

          if (payment) {
            if (payment.status === 'success') {
              console.log('Payment confirmed as success:', payment);
              resolve({ success: true, payment });
              return;
            } else if (payment.status === 'failed') {
              console.log('Payment confirmed as failed:', payment);
              resolve({ success: false, payment, error: 'Payment failed' });
              return;
            } else if (payment.status === 'cancelled') {
              console.log('Payment was cancelled:', payment);
              resolve({ success: false, payment, error: 'Payment was cancelled' });
              return;
            }
          }

          // Check timeout
          if (Date.now() - startTime >= timeoutMs) {
            console.log('Payment confirmation timeout');
            resolve({ 
              success: false, 
              error: 'Payment verification timed out. Please check your M-PESA messages.',
              timeout: true 
            });
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);
        } catch (error) {
          console.error('Error in payment polling:', error);
          reject(error);
        }
      };

      // Start polling
      poll();
    });
  }

  async checkPaymentStatus(checkoutRequestID: string): Promise<any> {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_id', checkoutRequestID)
        .single();

      if (error) throw error;

      return { success: true, payment };
    } catch (error) {
      console.error('M-PESA status check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed',
      };
    }
  }

  formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
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
