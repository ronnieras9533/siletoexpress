
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  prescription_required: boolean;
  image_url?: string;
  stock: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  hasPrescriptionItems: () => boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Load cart for authenticated user
      const savedCart = localStorage.getItem(`siletoRx-cart-${user.id}`);
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
    } else {
      // Clear cart when user logs out and remove from localStorage
      setItems([]);
      // Clear all cart data from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('siletoRx-cart-')) {
          localStorage.removeItem(key);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && items.length > 0) {
      localStorage.setItem(`siletoRx-cart-${user.id}`, JSON.stringify(items));
    }
  }, [items, user]);

  const addToCart = (product: Omit<CartItem, 'quantity'>) => {
    // Immediately redirect to auth page if user is not logged in
    if (!user) {
      navigate('/auth');
      toast({
        title: "Sign In Required",
        description: "Please sign in to add items to your cart",
        variant: "destructive"
      });
      return;
    }

    setItems(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity + 1 > product.stock) {
          toast({
            title: "Out of Stock",
            description: `Only ${product.stock} items available`,
            variant: "destructive"
          });
          return prev;
        }
        return prev.map(item =>
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    
    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  const removeFromCart = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    toast({
      title: "Removed from Cart",
      description: "Item has been removed from your cart",
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        if (quantity > item.stock) {
          toast({
            title: "Out of Stock",
            description: `Only ${item.stock} items available`,
            variant: "destructive"
          });
          return item;
        }
        return { ...item, quantity };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setItems([]);
    if (user) {
      localStorage.removeItem(`siletoRx-cart-${user.id}`);
    }
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const hasPrescriptionItems = () => {
    return items.some(item => item.prescription_required);
  };

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalItems,
      hasPrescriptionItems,
      showLoginModal,
      setShowLoginModal
    }}>
      {children}
    </CartContext.Provider>
  );
};
