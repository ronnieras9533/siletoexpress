
import { useState } from "react";
import { Search, ShoppingCart, User, Menu, X, Heart, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    navigate('/products');
                  }
                }}
              />
            </div>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden md:flex items-center gap-2"
              onClick={() => navigate('/products')}
            >
              <Heart size={20} />
              Wishlist
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart size={20} />
              <span className="hidden md:block">Cart</span>
              {getTotalItems() > 0 && (
                <Badge className="bg-blue-600 text-white">
                  {getTotalItems()}
                </Badge>
              )}
            </Button>

            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2"
                >
                  <User size={20} />
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-red-600 hover:text-red-800"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                className="hidden md:flex items-center gap-2"
                onClick={() => navigate('/auth')}
              >
                <User size={20} />
                Sign In
              </Button>
            )}

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
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  navigate('/products');
                }
              }}
            />
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t">
            <nav className="flex flex-col gap-2 mt-4">
              <Button variant="ghost" className="justify-start" onClick={() => navigate('/products')}>
                All Products
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => navigate('/prescription-upload')}>
                Upload Prescription
              </Button>
              {user ? (
                <>
                  <Button variant="ghost" className="justify-start" onClick={() => navigate('/dashboard')}>
                    Dashboard
                  </Button>
                  <Button variant="ghost" className="justify-start text-red-600" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button variant="ghost" className="justify-start" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="hidden md:block bg-gray-50 border-t">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-8">
            <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
              All Products
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/products?category=General Medicine')}>
              Prescription Drugs
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/products?category=Pain Relief')}>
              Over-the-Counter
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/products?category=Chronic Care')}>
              Chronic Care
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/products?category=Supplements')}>
              Supplements
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-600 font-medium"
              onClick={() => navigate('/prescription-upload')}
            >
              Upload Prescription
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
