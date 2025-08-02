
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, User, Menu, X, LogOut, Package, FileText } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import ProductSearch from './ProductSearch';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsUserMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SE</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">SiletoExpress</span>
            <span className="text-lg font-bold text-gray-900 sm:hidden">SE</span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <ProductSearch />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/products" className="text-gray-700 hover:text-blue-600 transition-colors">
              Products
            </Link>
            <Link to="/prescription-upload" className="text-gray-700 hover:text-blue-600 transition-colors">
              Upload Prescription
            </Link>
            <Link to="/why-choose-us" className="text-gray-700 hover:text-blue-600 transition-colors">
              Why Choose Us
            </Link>
            
            {/* Cart */}
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="sm">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden lg:block">{user.email?.split('@')[0]}</span>
                </Button>
                
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      to="/dashboard"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                    <Link
                      to="/my-orders-prescriptions"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      My Orders
                    </Link>
                    <Link
                      to="/track-order"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Track Order
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth">
                <Button size="sm">Sign In</Button>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-2 md:hidden">
            {/* Mobile Cart */}
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="sm">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="p-2"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-4 bg-white">
            {/* Mobile Search */}
            <div className="px-2">
              <ProductSearch />
            </div>
            
            <nav className="space-y-2">
              <Link
                to="/products"
                className="block px-2 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                onClick={closeMobileMenu}
              >
                Products
              </Link>
              <Link
                to="/prescription-upload"
                className="block px-2 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                onClick={closeMobileMenu}
              >
                Upload Prescription
              </Link>
              <Link
                to="/why-choose-us"
                className="block px-2 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                onClick={closeMobileMenu}
              >
                Why Choose Us
              </Link>
              
              {user ? (
                <div className="space-y-2 border-t border-gray-200 pt-2 mt-2">
                  <Link
                    to="/dashboard"
                    className="flex items-center px-2 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Link>
                  <Link
                    to="/my-orders-prescriptions"
                    className="flex items-center px-2 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    My Orders
                  </Link>
                  <Link
                    to="/track-order"
                    className="flex items-center px-2 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Track Order
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      closeMobileMenu();
                    }}
                    className="flex items-center w-full px-2 py-2 text-red-600 hover:text-red-700 transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <Link to="/auth" onClick={closeMobileMenu}>
                    <Button size="sm" className="w-full">Sign In</Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Desktop user menu overlay */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-40 hidden md:block"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;
