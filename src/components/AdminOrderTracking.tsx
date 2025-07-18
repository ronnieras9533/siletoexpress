import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Truck, MapPin } from 'lucide-react';

interface AdminOrderTrackingProps {
  orderId: string;
  currentStatus: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const AdminOrderTracking: React.FC<AdminOrderTrackingProps> = ({
  orderId,
  currentStatus,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateOrderMutation = useMutation({
    mutationFn: async () => {
      if (!status) throw new Error('Status is required');

      // 1. Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // 2. Add tracking entry
      const { error: trackingError } = await supabase.from('order_tracking').insert({
        order_id: orderId,
        status,
        note: note || 'Status updated by admin',
        location: location || null,
        // updated_by: currentUser.email, // optional: track who updated
      });

      if (trackingError) throw trackingError;

      // 3. Optional: Trigger email/SMS notification
      if (['confirmed', 'shipped'].includes(status)) {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status }),
        });
      }
    },
    onSuccess: () => {
      toast({
        title: 'Order Updated',
        description: 'Order status updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['trackOrder'] });
      setIsOpen(false);
      setNote('');
      setLocation('');
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description:
          error instanceof Error ? error.message : 'Could not update order',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Truck className="h-4 w-4 mr-2" />
          Update Status
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Select */}
          <div>
            <Label htmlFor="status">Order Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location Input */}
          <div>
            <Label htmlFor="location">Location (Optional)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Current package location"
                className="pl-10"
              />
            </div>
          </div>

          {/* Note Input */}
          <div>
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={updateOrderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateOrderMutation.mutate()}
              disabled={updateOrderMutation.isPending}
            >
              {updateOrderMutation.isPending ? 'Updating...' : 'Update Order'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminOrderTracking;
