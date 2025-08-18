import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Shield, Truck, Clock, Award, CheckCircle, Search } from "lucide-react";
import { useState } from "react";

const Hero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black bg-opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent"></div>
      </div>

      <div className="relative container mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-20">
        <div className="max-w-4xl mx-auto">
          {/* Search Bar */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-1 max-w-2xl mx-auto mb-12 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search for medicines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 text-lg pl-4 pr-12 border-0 bg-white/90 text-gray-800"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                className="h-14 px-6 text-lg bg-white text-blue-700 hover:bg-blue-50 flex-shrink-0"
              >
                Search
              </Button>
            </div>
          </div>

          <div className="text-center">
            {/* Trust Badge */}
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Shield className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                Licensed by Pharmacy & Poisons Board
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6">
              Your Trusted Online <br className="hidden sm:block" />
              <span className="text-blue-200">Pharmacy in Kenya</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Get authentic medicines delivered to your doorstep. From prescription
              drugs to wellness products, we ensure quality healthcare for everyone.
            </p>

            {/* CTA Button */}
            <div className="mb-12">
              <Button
                onClick={() => navigate("/products")}
                size="lg"
                className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-4 text-lg font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Browse Products
              </Button>
            </div>

            {/* Trust Indicators - Updated to 2 columns on mobile */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-12">
              <div className="flex flex-col items-center text-center p-3">
                <CheckCircle className="h-8 w-8 md:h-10 md:w-10 text-blue-200 mb-2" />
                <h3 className="font-semibold text-sm md:text-base mb-1">
                  Verified Products
                </h3>
                <p className="text-blue-200 text-xs md:text-sm">
                  Authentic medicines only
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-3">
                <Truck className="h-8 w-8 md:h-10 md:w-10 text-blue-200 mb-2" />
                <h3 className="font-semibold text-sm md:text-base mb-1">
                  Fast Delivery
                </h3>
                <p className="text-blue-200 text-xs md:text-sm">
                  Quick & reliable service
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-3">
                <Clock className="h-8 w-8 md:h-10 md:w-10 text-blue-200 mb-2" />
                <h3 className="font-semibold text-sm md:text-base mb-1">
                  24/7 Support
                </h3>
                <p className="text-blue-200 text-xs md:text-sm">
                  Always here to help
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-3">
                <Award className="h-8 w-8 md:h-10 md:w-10 text-blue-200 mb-2" />
                <h3 className="font-semibold text-sm md:text-base mb-1">
                  Licensed Pharmacy
                </h3>
                <p className="text-blue-200 text-xs md:text-sm">
                  Fully regulated & certified
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
