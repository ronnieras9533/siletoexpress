
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { Search, ShoppingCart, Menu, User, LogOut, Package, FileText, Users, BarChart3 } from 'lucide-react';
import LoginModal from '@/components/LoginModal';
import NotificationPanel from '@/components/NotificationPanel';
import { useToast } from '@/hooks/use-toast';

const Header = () => {
  const { user, signOut, isAdmin } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);

  const cartItemsCount = items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast({
        title: "Success",
        description: "Signed out successfully",
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-xl text-blue-600 hidden sm:block">SiletoExpress</span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4"
              />
            </div>
          </form>

          {/* Navigation Links & Actions */}
          <div className="flex items-center space-x-4">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                to="/products"
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  isActive('/products') ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                Products
              </Link>
              <Link
                to="/why-choose-us"
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  isActive('/why-choose-us') ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                Why Choose Us
              </Link>
              {!user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLoginModal(true)}
                  className="text-sm font-medium"
                >
                  Sign In
                </Button>
              )}
            </nav>

            {/* User Actions */}
            {user && (
              <div className="flex items-center space-x-2">
                {/* Notifications */}
                <NotificationPanel />

                {/* User Menu - Desktop */}
                <div className="hidden md:flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Hi, {userProfile?.full_name?.split(' ')[0] || 'User'}
                    </span>
                  </div>
                  
                  {isAdmin && (
                    <Link to="/admin">
                      <Button variant="outline" size="sm">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  
                  <Link to="/dashboard">
                    <Button variant="outline" size="sm">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Cart */}
            <Link to="/cart">
              <Button variant="ghost" size="sm" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-blue-600 text-white text-xs">
                    {cartItemsCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                {/* Mobile menu content */}
                <div className="flex flex-col space-y-4 mt-8">
                  {/* Mobile Search */}
                  <form onSubmit={handleSearch} className="md:hidden">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4"
                      />
                    </div>
                  </form>

                  {/* Mobile Navigation Links */}
                  <Link to="/products" className="text-lg font-medium">Products</Link>
                  <Link to="/why-choose-us" className="text-lg font-medium">Why Choose Us</Link>
                  
                  {user ? (
                    <>
                      <div className="border-t pt-4">
                        <p className="font-medium mb-2">
                          Hi, {userProfile?.full_name?.split(' ')[0] || 'User'}
                        </p>
                      </div>
                      
                      <Link to="/dashboard" className="text-lg font-medium flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                      
                      {isAdmin && (
                        <Link to="/admin" className="text-lg font-medium flex items-center">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Admin Panel
                        </Link>
                      )}
                      
                      <Button variant="ghost" onClick={handleSignOut} className="justify-start p-0 text-lg font-medium">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setShowLoginModal(true)}
                      className="justify-start"
                    >
                      Sign In
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </header>
  );
};

export default Header;
