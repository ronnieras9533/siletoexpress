
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  Truck, 
  Clock, 
  Award,
  CheckCircle
} from "lucide-react";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black bg-opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent"></div>
      </div>
      
      <div className="relative container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Shield className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Licensed by Pharmacy & Poisons Board</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Your Trusted Online
            <br />
            <span className="text-blue-200">Pharmacy in Kenya</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
            Get authentic medicines delivered to your doorstep. From prescription drugs to wellness products, we ensure quality healthcare for everyone.
          </p>

          {/* CTA Button */}
          <div className="mb-12">
            <Button 
              onClick={() => navigate('/products')}
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-4 text-lg font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Browse Products
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 mt-12">
            <div className="flex flex-col items-center text-center p-4">
              <CheckCircle className="h-8 w-8 md:h-12 md:w-12 text-blue-200 mb-2" />
              <h3 className="font-semibold text-sm md:text-base mb-1">Verified Products</h3>
              <p className="text-blue-200 text-xs md:text-sm">Authentic medicines only</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <Truck className="h-8 w-8 md:h-12 md:w-12 text-blue-200 mb-2" />
              <h3 className="font-semibold text-sm md:text-base mb-1">Fast Delivery</h3>
              <p className="text-blue-200 text-xs md:text-sm">Quick & reliable service</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <Clock className="h-8 w-8 md:h-12 md:w-12 text-blue-200 mb-2" />
              <h3 className="font-semibold text-sm md:text-base mb-1">24/7 Support</h3>
              <p className="text-blue-200 text-xs md:text-sm">Always here to help</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <Award className="h-8 w-8 md:h-12 md:w-12 text-blue-200 mb-2" />
              <h3 className="font-semibold text-sm md:text-base mb-1">Licensed Pharmacy</h3>
              <p className="text-blue-200 text-xs md:text-sm">Fully regulated & certified</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
