
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Shield, Truck, Clock, Award } from "lucide-react";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-6">
            <Badge className="bg-blue-500 text-white border-none">
              Licensed by Pharmacy & Poisons Board
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Your Trusted Online Pharmacy in Kenya
            </h1>
            
            <p className="text-xl text-blue-100 leading-relaxed">
              Get authentic medicines delivered to your doorstep. From prescription drugs to wellness products, we ensure quality healthcare for everyone.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
                onClick={() => navigate('/products')}
              >
                Browse Products
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-300" />
                <span className="text-sm">Verified Products</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-300" />
                <span className="text-sm">Fast Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-300" />
                <span className="text-sm">24/7 Support</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-300" />
                <span className="text-sm">Licensed Pharmacy</span>
              </div>
            </div>
          </div>

          {/* Right content - Feature highlights */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Why Choose SiletoExpress?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mt-2"></div>
                  <span>Licensed pharmacy with certified pharmacists</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mt-2"></div>
                  <span>Prescription verification by qualified professionals</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mt-2"></div>
                  <span>Secure M-PESA payments and fast delivery</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mt-2"></div>
                  <span>Comprehensive chronic care management</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">Emergency Services</h3>
              <p className="text-blue-100 mb-3">
                Need urgent medication? Contact our emergency line for immediate assistance.
              </p>
              <p className="text-lg font-semibold">+254 700 123 456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
