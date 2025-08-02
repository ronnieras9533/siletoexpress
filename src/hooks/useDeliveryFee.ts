
import { useState, useEffect } from 'react';

interface UseDeliveryFeeProps {
  county: string;
  orderTotal: number;
}

export const useDeliveryFee = ({ county, orderTotal }: UseDeliveryFeeProps) => {
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  useEffect(() => {
    const calculateDeliveryFee = async () => {
      if (!county || !orderTotal || orderTotal < 0) {
        setDeliveryFee(300); // Default fee
        return;
      }

      setIsCalculating(true);

      try {
        // Free delivery for orders over 2000 KES
        if (orderTotal >= 2000) {
          setDeliveryFee(0);
          setIsCalculating(false);
          return;
        }

        // County-based delivery fees (case insensitive)
        const normalizedCounty = county.toLowerCase().trim();
        
        let fee = 300; // Default fee

        switch (normalizedCounty) {
          case 'nairobi':
            fee = 0;
            break;
          case 'kiambu':
          case 'kajiado':
          case 'machakos':
            fee = 200;
            break;
          default:
            fee = 300;
            break;
        }

        setDeliveryFee(fee);
      } catch (error) {
        console.error('Error calculating delivery fee:', error);
        setDeliveryFee(300); // Fallback to default fee
      } finally {
        setIsCalculating(false);
      }
    };

    calculateDeliveryFee();
  }, [county, orderTotal]);

  return {
    deliveryFee,
    isCalculating,
    freeDeliveryThreshold: 2000
  };
};
