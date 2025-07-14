
import React from 'react';
import { Check, Clock, Package, Truck, MapPin, Home } from 'lucide-react';

interface OrderStatusStepperProps {
  currentStatus: string;
  orderTracking?: Array<{
    status: string;
    created_at: string;
    note?: string;
    location?: string;
  }>;
}

const OrderStatusStepper: React.FC<OrderStatusStepperProps> = ({ currentStatus, orderTracking = [] }) => {
  const steps = [
    { key: 'pending', label: 'Order Placed', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: Check },
    { key: 'processing', label: 'Processing', icon: Package },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
    { key: 'delivered', label: 'Delivered', icon: Home },
  ];

  const getStepStatus = (stepKey: string) => {
    const stepIndex = steps.findIndex(step => step.key === stepKey);
    const currentIndex = steps.findIndex(step => step.key === currentStatus);
    
    if (currentStatus === 'cancelled') {
      return stepKey === 'pending' ? 'completed' : 'cancelled';
    }
    
    if (stepIndex <= currentIndex) {
      return 'completed';
    } else if (stepIndex === currentIndex + 1) {
      return 'current';
    } else {
      return 'pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'current':
        return 'bg-blue-500 text-white';
      case 'cancelled':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-200 text-gray-400';
    }
  };

  const getLineColor = (index: number) => {
    const stepIndex = steps.findIndex(step => step.key === currentStatus);
    return index < stepIndex ? 'bg-green-500' : 'bg-gray-200';
  };

  if (currentStatus === 'cancelled') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-sm">✕</span>
          </div>
          <div>
            <h3 className="font-medium text-red-800">Order Cancelled</h3>
            <p className="text-red-600">Your order has been cancelled.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="font-medium text-gray-900 mb-6">Order Progress</h3>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-4 left-4 w-0.5 h-full bg-gray-200"></div>
        
        {steps.map((step, index) => {
          const status = getStepStatus(step.key);
          const Icon = step.icon;
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.key} className="relative flex items-start gap-4 pb-8">
              {/* Step Circle */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${getStatusColor(status)}`}>
                {status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              
              {/* Progress Line Segment */}
              {!isLast && (
                <div className={`absolute top-8 left-4 w-0.5 h-8 ${getLineColor(index)}`}></div>
              )}
              
              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${status === 'completed' ? 'text-green-700' : status === 'current' ? 'text-blue-700' : 'text-gray-500'}`}>
                  {step.label}
                </p>
                
                {/* Show tracking info for this step */}
                {orderTracking
                  .filter(tracking => tracking.status === step.key)
                  .map((tracking, trackingIndex) => (
                    <div key={trackingIndex} className="mt-1 text-sm text-gray-600">
                      <p>{new Date(tracking.created_at).toLocaleString()}</p>
                      {tracking.note && <p className="italic">{tracking.note}</p>}
                      {tracking.location && <p>📍 {tracking.location}</p>}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStatusStepper;
