
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import Index from '@/pages/Index';
import Products from '@/pages/Products';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import PaymentSuccess from '@/pages/PaymentSuccess';
import TrackOrder from '@/pages/TrackOrder';
import NotFound from '@/pages/NotFound';
import SellerDashboard from '@/pages/SellerDashboard';
import PrescriptionUpload from '@/pages/PrescriptionUpload';
import AdminDashboard from '@/pages/AdminDashboard';
import Auth from '@/pages/Auth';
import ErrorBoundary from '@/components/ErrorBoundary';
import PesapalCallback from '@/pages/PesapalCallback';
import MpesaCallback from '@/pages/MpesaCallback';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import WhyChooseUs from '@/pages/WhyChooseUs';
import Dashboard from '@/pages/Dashboard';
import MyOrdersAndPrescriptions from '@/pages/MyOrdersAndPrescriptions';

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
                  <Route path="/" element={<Index />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/track-order" element={<TrackOrder />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/seller-dashboard" element={<SellerDashboard />} />
                  <Route path="/prescription-upload" element={<PrescriptionUpload />} />
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/pesapal-callback" element={<PesapalCallback />} />
                  <Route path="/mpesa-callback" element={<MpesaCallback />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/why-choose-us" element={<WhyChooseUs />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/my-orders-prescriptions" element={<MyOrdersAndPrescriptions />} />
                  <Route path="/my-orders" element={<MyOrdersAndPrescriptions />} />
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
