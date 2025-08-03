import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@/integrations/supabase/auth';
import { mpesaService } from '@/services/mpesaService';
import { toast } from 'react-hot-toast';

export default function Checkout() {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    // Optional: Auto-set orderId or get from cart
    setOrderId(`ORDER-${Date.now()}`);
  }, []);

  const handleMpesaPayment = async () => {
    if (!phoneNumber || amount <= 0) {
      toast.error('Please enter a valid phone number and amount.');
      return;
    }

    setLoading(true);
    const response = await mpesaService.initiateSTKPush({
      amount,
      phoneNumber,
      orderId,
    });
    setLoading(false);

    if (response.success) {
      toast.success('M-PESA prompt sent to your phone. Complete the payment.');
    } else {
      toast.error(`Payment failed: ${response.error}`);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Checkout</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Amount (KES)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          className="w-full border px-3 py-2 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Phone Number</label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          placeholder="e.g. 07xxxxxxxx"
        />
      </div>
      <button
        onClick={handleMpesaPayment}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Pay with M-PESA'}
      </button>
    </div>
  );
}
