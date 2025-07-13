
import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhatsAppFloatProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

const WhatsAppFloat: React.FC<WhatsAppFloatProps> = ({ 
  phoneNumber = "254718925368", // Default Sukhiba WhatsApp number - replace with yours
  defaultMessage = "Hi SiletoExpress, I'd like to order medicine or talk to a pharmacist." 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(defaultMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        {/* Tooltip/Preview */}
        {isHovered && (
          <div className="absolute bottom-16 right-0 bg-card border border-border rounded-lg p-3 shadow-lg max-w-xs animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm text-foreground">Chat with Us</h4>
              <X 
                size={14} 
                className="text-muted-foreground cursor-pointer hover:text-foreground" 
                onClick={() => setIsHovered(false)}
              />
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Order medicine, upload prescriptions, or get expert pharmacy advice via WhatsApp
            </p>
            <div className="text-xs text-muted-foreground">
              ✅ Instant responses<br/>
              ✅ Prescription support<br/>
              ✅ Order tracking<br/>
              ✅ Expert pharmacist advice
            </div>
          </div>
        )}

        {/* Pulse animation ring - positioned behind the button */}
        <div className="absolute inset-0 rounded-full bg-green-500 opacity-30 animate-ping -z-10"></div>

        {/* Main WhatsApp Button */}
        <Button
          onClick={handleWhatsAppClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-10"
          aria-label="Chat with us on WhatsApp"
        >
          <MessageCircle size={24} />
        </Button>
      </div>
    </div>
  );
};

export default WhatsAppFloat;
