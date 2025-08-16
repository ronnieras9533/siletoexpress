// src/services/ordersService.ts
import { supabase } from '@/integrations/supabase/client';

export const updatePaymentStatus = async (orderId: string, status: 'pending' | 'paid' | 'failed') => {
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: status })
    .eq('id', orderId);

  if (error) throw error;
  return true;
};

export const updateOrderStatus = async (orderId: string, status: 'pending' | 'confirmed' | 'delivered') => {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) throw error;
  return true;
};
