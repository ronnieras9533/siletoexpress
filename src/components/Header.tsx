
import { useState } from "react";
import { Search, ShoppingCart, User, Menu, X, Heart, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b">
      {/* Top bar */}
      <div className="bg-blue-600 text-white py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone size={14} />
              +254 700 123 456
            </span>
            <span>Free delivery above KES 2,000</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span>Licensed by Pharmacy & Poisons Board</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600">SiletoRx</h1>
            <span className="ml-2 text-sm text-gray-500 hidden md:block">
              Your Trusted Online Pharmacy
            </span>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search medicines, symptoms, or brands..."
                className="pl-10 pr-4 py-2 w-full border-2 border-blue-100 focus:border-blue-300 rounded-lg"
              />
            </div>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2">
              <Heart size={20} />
              Wishlist
            </Button>
            
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ShoppingCart size={20} />
              <span className="hidden md:block">Cart</span>
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                0
              </span>
            </Button>

            <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2">
              <User size={20} />
              Account
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search medicines..."
              className="pl-10 pr-4 py-2 w-full border-2 border-blue-100 focus:border-blue-300 rounded-lg"
            />
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t">
            <nav className="flex flex-col gap-2 mt-4">
              <Button variant="ghost" className="justify-start">Categories</Button>
              <Button variant="ghost" className="justify-start">Prescription Upload</Button>
              <Button variant="ghost" className="justify-start">Track Order</Button>
              <Button variant="ghost" className="justify-start">Contact Us</Button>
              <Button variant="ghost" className="justify-start">Account</Button>
            </nav>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="hidden md:block bg-gray-50 border-t">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-8">
            <Button variant="ghost" size="sm">All Categories</Button>
            <Button variant="ghost" size="sm">Prescription Drugs</Button>
            <Button variant="ghost" size="sm">Over-the-Counter</Button>
            <Button variant="ghost" size="sm">Chronic Care</Button>
            <Button variant="ghost" size="sm">Baby & Mother</Button>
            <Button variant="ghost" size="sm">First Aid</Button>
            <Button variant="ghost" size="sm" className="text-blue-600 font-medium">
              Upload Prescription
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
