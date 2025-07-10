import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button";
import { LogOut, Package, Pill, Settings, ShoppingCart, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

const Header = () => {
  const { user, signOut, isAdmin, isSeller } = useAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <Pill className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">SiletoExpress</span>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors">
                Home
              </Link>
              <Link to="/products" className="text-gray-700 hover:text-blue-600 transition-colors">
                Products
              </Link>
              {user && (
                <>
                  <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 transition-colors">
                    My Orders
                  </Link>
                  {isSeller && (
                    <Link to="/seller-dashboard" className="text-gray-700 hover:text-blue-600 transition-colors">
                      Seller Dashboard
                    </Link>
                  )}
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/cart" className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <ShoppingCart className="h-6 w-6" />
                  {getTotalItems() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getTotalItems()}
                    </span>
                  )}
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="p-2">
                      <User className="h-6 w-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    {isSeller && (
                      <DropdownMenuItem onClick={() => navigate('/seller-dashboard')}>
                        <Package className="mr-2 h-4 w-4" />
                        Seller Dashboard
                      </DropdownMenuItem>
                    )}
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => navigate('/admin')}>
                          <Settings className="mr-2 h-4 w-4" />
                          Admin Panel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin-dashboard')}>
                          <Settings className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
