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

      <div className="relative container mx-auto px-4 pt-6 pb-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            {/* Trust Badge - Reduced size */}
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 mb-3 text-xs">
              <Shield className="h-3 w-3 mr-1" />
              <span>Licensed by Pharmacy & Poisons Board</span>
            </div>

            {/* Main Headline - Reduced size */}
            <h1 className="text-xl sm:text-2xl font-bold leading-tight mb-3">
              Your Trusted Online <br className="hidden sm:block" />
              <span className="text-blue-200">Pharmacy in Kenya</span>
            </h1>

            {/* Subtitle - Reduced size */}
            <p className="text-sm text-blue-100 mb-4 max-w-2xl mx-auto leading-snug">
              Get authentic medicines delivered to your doorstep.
            </p>
          </div>
          
          {/* Compact Search Bar - Reduced by 80% */}
          <div className="bg-white rounded-full p-0.5 max-w-xs mx-auto mb-4 shadow">
            <div className="flex">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-sm pl-4 pr-8 border-0 bg-transparent text-gray-800 placeholder-gray-500 focus-visible:ring-0"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 h-3 w-3" />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                className="h-8 w-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 text-xs"
              >
                Search
              </Button>
            </div>
          </div>

          <div className="text-center">
            {/* CTA Button - Reduced size */}
            <div className="mb-4">
              <Button
                onClick={() => navigate("/products")}
                className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 text-sm font-semibold rounded-lg shadow"
              >
                Browse Products
              </Button>
            </div>

            {/* Trust Indicators - Reduced size */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div className="flex flex-col items-center text-center">
                <CheckCircle className="h-4 w-4 text-blue-200 mb-1" />
                <h3 className="font-semibold text-2xs mb-0.5">
                  Verified
                </h3>
              </div>
              <div className="flex flex-col items-center text-center">
                <Truck className="h-4 w-4 text-blue-200 mb-1" />
                <h3 className="font-semibold text-2xs mb-0.5">
                  Fast
                </h3>
              </div>
              <div className="flex flex-col items-center text-center">
                <Clock className="h-4 w-4 text-blue-200 mb-1" />
                <h3 className="font-semibold text-2xs mb-0.5">
                  24/7
                </h3>
              </div>
              <div className="flex flex-col items-center text-center">
                <Award className="h-4 w-4 text-blue-200 mb-1" />
                <h3 className="font-semibold text-2xs mb-0.5">
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
