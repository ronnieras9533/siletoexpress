import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import PaymentSuccess from "./pages/PaymentSuccess";
import PrescriptionUpload from "./pages/PrescriptionUpload";
import Dashboard from "./pages/Dashboard";
import SellerDashboard from "./pages/SellerDashboard";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import WhyChooseUs from "./pages/WhyChooseUs";
import NotFound from "./pages/NotFound";
import PesapalCallback from "./pages/PesapalCallback";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Component to handle scroll to top on route change
const ScrollToTop = () => {
  const location = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return null;
};

const App = () => {
  console.log('App: Component rendering');
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <AuthProvider>
            <BrowserRouter>
              <ScrollToTop />
              <ErrorBoundary>
                <CartProvider>
                  <Toaster />
                  <Sonner />
                  <WhatsAppFloat />
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/product/:id" element={<ProductDetail />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/order-success" element={<OrderSuccess />} />
                      <Route path="/payment-success" element={<PaymentSuccess />} />
                      <Route path="/pesapal-callback" element={<PesapalCallback />} />
                      <Route path="/prescription-upload" element={<PrescriptionUpload />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/seller-dashboard" element={<SellerDashboard />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/admin-dashboard" element={<AdminDashboard />} />
                      <Route path="/why-choose-us" element={<WhyChooseUs />} />
                      {/* Catch all route for 404 */}
                      <Route path="/404" element={<NotFound />} />
                      <Route path="*" element={<Navigate to="/404" replace />} />
                    </Routes>
                  </ErrorBoundary>
                </CartProvider>
              </ErrorBoundary>
            </BrowserRouter>
          </AuthProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
