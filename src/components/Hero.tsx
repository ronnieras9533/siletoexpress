// Hero.tsx
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
    <div className="relative text-white overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-orange-500 animate-gradient-x">
      {/* Subtle overlay for readability */}
      <div className="absolute inset-0 bg-black/20"></div>

      <div className="relative container mx-auto px-4 pt-8 pb-6 sm:pt-12 sm:pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            {/* Trust Badge */}
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4 sm:mb-5 text-sm sm:text-xs">
              <Shield className="h-4 w-4 mr-1.5 sm:h-3 sm:w-3 sm:mr-1" />
              <span>Licensed by Pharmacy & Poisons Board</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-2xl md:text-3xl font-bold leading-tight mb-4 sm:mb-3">
              Your Trusted Online <br className="hidden sm:block" />
              <span className="text-blue-100">Pharmacy in Kenya</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-sm md:text-base text-blue-50 mb-6 sm:mb-4 max-w-2xl mx-auto leading-snug">
              Get authentic medicines delivered to your doorstep.
            </p>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-full p-1 max-w-md mx-auto mb-6 sm:mb-4 shadow-lg sm:shadow">
            <div className="flex">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 sm:h-8 text-base sm:text-sm pl-5 sm:pl-4 pr-10 sm:pr-8 border-0 bg-transparent text-gray-800 placeholder-gray-500 focus-visible:ring-0"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <Search className="absolute right-3 sm:right-2 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4 sm:h-3 sm:w-3" />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                className="h-10 sm:h-8 w-20 sm:w-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 text-sm sm:text-xs"
              >
                Search
              </Button>
            </div>
          </div>

          <div className="text-center">
            {/* CTA Button */}
            <div className="mb-6 sm:mb-4">
              <Button
                onClick={() => navigate("/products")}
                className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 sm:px-4 sm:py-2 text-base sm:text-sm font-semibold rounded-lg shadow"
              >
                Browse Products
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-4 gap-3 sm:gap-2 mt-6 sm:mt-4">
              <div className="flex flex-col items-center text-center">
                <CheckCircle className="h-5 w-5 sm:h-4 sm:w-4 text-blue-100 mb-1.5 sm:mb-1" />
                <h3 className="font-semibold text-xs sm:text-2xs mb-1 sm:mb-0.5">
                  Verified
                </h3>
              </div>
              <div className="flex flex-col items-center text-center">
                <Truck className="h-5 w-5 sm:h-4 sm:w-4 text-blue-100 mb-1.5 sm:mb-1" />
                <h3 className="font-semibold text-xs sm:text-2xs mb-1 sm:mb-0.5">
                  Fast
                </h3>
              </div>
              <div className="flex flex-col items-center text-center">
                <Clock className="h-5 w-5 sm:h-4 sm:w-4 text-blue-100 mb-1.5 sm:mb-1" />
                <h3 className="font-semibold text-xs sm:text-2xs mb-1 sm:mb-0.5">
                  24/7
                </h3>
              </div>
              <div className="flex flex-col items-center text-center">
                <Award className="h-5 w-5 sm:h-4 sm:w-4 text-blue-100 mb-1.5 sm:mb-1" />
                <h3 className="font-semibold text-xs sm:text-2xs mb-1 sm:mb-0.5">
                  Licensed
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
