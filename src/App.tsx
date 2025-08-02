import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import Products from '@/pages/Products';
import ProductDetails from '@/pages/ProductDetails';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentFailed from '@/pages/PaymentFailed';
import TrackOrder from '@/pages/TrackOrder';
import ContactUs from '@/pages/ContactUs';
import AboutUs from '@/pages/AboutUs';
import NotFound from '@/pages/NotFound';
import SellerDashboard from '@/pages/SellerDashboard';
import PrescriptionUpload from '@/pages/PrescriptionUpload';
import AdminDashboard from '@/pages/AdminDashboard';
import Auth from '@/pages/Auth';
import ErrorBoundary from '@/components/ErrorBoundary';
import PesapalCallback from '@/pages/PesapalCallback';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';

function App() {
  const queryClient = new QueryClient();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <CartProvider>
                <Routes>
                  <Route path="/" element={<Products />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:id" element={<ProductDetails />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/payment-failed" element={<PaymentFailed />} />
                  <Route path="/track-order" element={<TrackOrder />} />
                  <Route path="/contact-us" element={<ContactUs />} />
                  <Route path="/about-us" element={<AboutUs />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/seller-dashboard" element={<SellerDashboard />} />
                  <Route path="/prescription-upload" element={<PrescriptionUpload />} />
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />
                  <Route path="/pesapal-callback" element={<PesapalCallback />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </CartProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
