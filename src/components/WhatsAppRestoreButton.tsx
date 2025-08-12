
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface WhatsAppRestoreButtonProps {
  productName: string;
  productId: string;
  className?: string;
}

const WhatsAppRestoreButton: React.FC<WhatsAppRestoreButtonProps> = ({ 
  productName, 
  productId, 
  className = "" 
}) => {
  const handleWhatsAppRestore = () => {
    const productUrl = `${window.location.origin}/products/${productId}`;
    const message = `Hi! I'm interested in ordering ${productName}. Product link: ${productUrl}`;
    const whatsappUrl = `https://wa.me/254707779831?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Button
      onClick={handleWhatsAppRestore}
      variant="outline"
      size="sm"
      className={`bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800 ${className}`}
    >
      <MessageCircle className="mr-2 h-4 w-4" />
      🟢 Restore Order via WhatsApp
    </Button>
  );
};

export default WhatsAppRestoreButton;
