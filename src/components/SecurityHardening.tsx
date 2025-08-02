
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Security hardening component to be used across the app
export const useSecurityHardening = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Clear sensitive data from localStorage on page unload
    const handleBeforeUnload = () => {
      // Clear expired payment data
      const paymentData = localStorage.getItem('pesapal_payment');
      if (paymentData) {
        try {
          const parsed = JSON.parse(paymentData);
          if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            localStorage.removeItem('pesapal_payment');
          }
        } catch (error) {
          console.error('Error parsing payment data:', error);
          localStorage.removeItem('pesapal_payment');
        }
      }
    };

    // Security headers check (for development)
    const checkSecurityHeaders = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Security hardening active');
        
        // Log security warnings in development
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          console.warn('SECURITY WARNING: Application should use HTTPS in production');
        }
      }
    };

    // CSP violation handler
    const handleCSPViolation = async (event: SecurityPolicyViolationEvent) => {
      console.warn('CSP Violation:', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        originalPolicy: event.originalPolicy
      });
      
      // Log CSP violations to monitoring service
      if (user) {
        try {
          const { error } = await supabase
            .from('debug_log')
            .insert({
              message: `CSP Violation: ${event.violatedDirective} - ${event.blockedURI}`
            });
          
          if (error) {
            console.error('Failed to log CSP violation:', error);
          }
        } catch (error) {
          console.error('Failed to log CSP violation:', error);
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('securitypolicyviolation', handleCSPViolation);
    
    // Initial security check
    checkSecurityHeaders();

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
    };
  }, [user]);

  // Return security utilities
  return {
    sanitizeInput: (input: string): string => {
      return input.replace(/[<>\"'&]/g, '').trim();
    },
    
    validateEmail: (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email) && email.length <= 254;
    },
    
    validatePhone: (phone: string): boolean => {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return phoneRegex.test(phone.replace(/\s/g, ''));
    },
    
    validateAmount: (amount: number): boolean => {
      return amount > 0 && amount <= 1000000 && Number.isFinite(amount);
    },
    
    // Rate limiting helper
    isRateLimited: (key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
      const now = Date.now();
      const attempts = JSON.parse(localStorage.getItem(`rate_limit_${key}`) || '[]');
      
      // Clean old attempts
      const validAttempts = attempts.filter((timestamp: number) => now - timestamp < windowMs);
      
      if (validAttempts.length >= maxAttempts) {
        return true;
      }
      
      // Add current attempt
      validAttempts.push(now);
      localStorage.setItem(`rate_limit_${key}`, JSON.stringify(validAttempts));
      
      return false;
    }
  };
};

export default useSecurityHardening;
