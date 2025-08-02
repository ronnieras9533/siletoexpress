
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import SellerDashboard from "./pages/SellerDashboard";
import PrescriptionUpload from "./pages/PrescriptionUpload";
import WhyChooseUs from "./pages/WhyChooseUs";
import MpesaCallback from "./pages/MpesaCallback";
import PaymentSuccess from "./pages/PaymentSuccess";
import PesapalCallback from "./pages/PesapalCallback";
import OrderSuccess from "./pages/OrderSuccess";
import TrackOrder from "./pages/TrackOrder";
import NotFound from "./pages/NotFound";
import WhatsAppFloat from "./components/WhatsAppFloat";
import ErrorBoundary from "./components/ErrorBoundary";
import MyOrdersAndPrescriptions from "./pages/MyOrdersAndPrescriptions";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
    },
  },
});

// Component to handle route persistence
function RouteHandler() {
  const location = useLocation();

  useEffect(() => {
    // Store current route in sessionStorage
    sessionStorage.setItem('lastRoute', location.pathname + location.search);
  }, [location]);

  return null;
}

// Component to restore route on app startup
function RouteRestorer() {
  const location = useLocation();

  useEffect(() => {
    // Only restore route if we're on the homepage and there's a stored route
    if (location.pathname === '/') {
      const lastRoute = sessionStorage.getItem('lastRoute');
      if (lastRoute && lastRoute !== '/' && lastRoute !== location.pathname) {
        window.history.replaceState(null, '', lastRoute);
      }
    }
  }, []);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteHandler />
            <RouteRestorer />
            <AuthProvider>
              <CartProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/my-orders-prescriptions" element={<MyOrdersAndPrescriptions />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/seller-dashboard" element={<SellerDashboard />} />
                  <Route path="/prescription-upload" element={<PrescriptionUpload />} />
                  <Route path="/why-choose-us" element={<WhyChooseUs />} />
                  <Route path="/mpesa-callback" element={<MpesaCallback />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/pesapal-callback" element={<PesapalCallback />} />
                  <Route path="/order-success" element={<OrderSuccess />} />
                  <Route path="/track-order" element={<TrackOrder />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <WhatsAppFloat />
              </CartProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
