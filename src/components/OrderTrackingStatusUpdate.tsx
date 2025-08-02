
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Truck, Package, CheckCircle, Clock } from 'lucide-react';

interface OrderTrackingStatusUpdateProps {
  orderId: string;
  currentStatus: string;
  onUpdate: () => void;
}

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-600' },
  { value: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: 'text-blue-600' },
  { value: 'processing', label: 'Processing', icon: Package, color: 'text-orange-600' },
  { value: 'shipped', label: 'Shipped', icon: Truck, color: 'text-purple-600' },
  { value: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'text-green-600' },
];

const OrderTrackingStatusUpdate: React.FC<OrderTrackingStatusUpdateProps> = ({
  orderId,
  currentStatus,
  onUpdate
}) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleStatusUpdate = async () => {
    if (!selectedStatus) {
      toast({
        title: "Status required",
        description: "Please select a status to update.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: selectedStatus })
        .eq('id', orderId);

      if (orderError) {
        throw orderError;
      }

      // Add tracking entry
      const { error: trackingError } = await supabase
        .from('order_tracking')
        .insert({
          order_id: orderId,
          status: selectedStatus,
          note: note.trim() || null,
          location: location.trim() || null
        });

      if (trackingError) {
        console.error('Tracking entry error:', trackingError);
        // Don't fail the whole operation if tracking fails
      }

      toast({
        title: "Status updated successfully",
        description: `Order status has been updated to ${selectedStatus}.`,
      });

      // Reset form
      setNote('');
      setLocation('');
      onUpdate();

    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update order status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatusDisplay = () => {
    const status = statusOptions.find(s => s.value === currentStatus);
    if (!status) return { label: currentStatus, icon: Clock, color: 'text-gray-600' };
    return status;
  };

  const currentStatusDisplay = getCurrentStatusDisplay();
  const StatusIcon = currentStatusDisplay.icon;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 ${currentStatusDisplay.color}`} />
          Update Order Status
        </CardTitle>
        <p className="text-sm text-gray-600">
          Current status: <span className={`font-medium ${currentStatusDisplay.color}`}>
            {currentStatusDisplay.label}
          </span>
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="status">New Status</Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select new status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => {
                const Icon = status.icon;
                return (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${status.color}`} />
                      {status.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="location">Location (Optional)</Label>
          <input
            id="location"
            type="text"
            placeholder="e.g., Nairobi Distribution Center"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <Label htmlFor="note">Update Note (Optional)</Label>
          <Textarea
            id="note"
            placeholder="Add any relevant notes about this status update..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleStatusUpdate}
            disabled={loading || selectedStatus === currentStatus}
            className="flex-1"
          >
            {loading ? 'Updating...' : 'Update Status'}
          </Button>
        </div>

        {selectedStatus === currentStatus && (
          <p className="text-sm text-gray-500 text-center">
            Select a different status to update the order
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderTrackingStatusUpdate;
