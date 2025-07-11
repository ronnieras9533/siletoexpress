
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

          {/* Right content - Simple call to action */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Get Started Today</h3>
              <p className="text-blue-100 mb-4">
                Experience the convenience of online pharmacy services with professional care and reliable delivery.
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  variant="secondary" 
                  className="bg-white text-blue-600 hover:bg-blue-50"
                  onClick={() => navigate('/why-choose-us')}
                >
                  Why Choose Us?
                </Button>
                <Button 
                  variant="outline" 
                  className="border-white text-white hover:bg-white hover:text-blue-600"
                  onClick={() => navigate('/auth')}
                >
                  Create Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
