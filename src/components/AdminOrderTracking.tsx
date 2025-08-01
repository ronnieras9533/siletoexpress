import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, Clock, User } from 'lucide-react';

interface OrderTracking {
  id: string;
  order_id: string;
  status: 'pending' | 'approved' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  location: string | null;
  note: string | null;
  created_at: string;
  updated_by: string | null;
}

interface AdminOrderTrackingProps {
  orderId: string;
}

const AdminOrderTracking: React.FC<AdminOrderTrackingProps> = ({ orderId }) => {
  const [tracking, setTracking] = useState<OrderTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newStatus, setNewStatus] = useState<'pending' | 'approved' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'>('pending');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const { toast } = useToast();

  const statusOptions: Array<{value: 'pending' | 'approved' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled', label: string}> = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  useEffect(() => {
    fetchTracking();
  }, [orderId]);

  const fetchTracking = async () => {
    try {
      const { data, error } = await supabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTracking(data || []);
    } catch (error) {
      console.error('Error fetching tracking:', error);
      toast({
        title: "Error",
        description: "Failed to load tracking information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Insert new tracking entry
      const { error: trackingError } = await supabase
        .from('order_tracking')
        .insert({
          order_id: orderId,
          status: newStatus,
          location: location || null,
          note: note || null,
          updated_by: userData.user?.id || null
        });

      if (trackingError) throw trackingError;

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast({
        title: "Success",
        description: "Tracking updated successfully"
      });

      // Reset form
      setLocation('');
      setNote('');
      setNewStatus('pending');
      
      // Refresh tracking data
      fetchTracking();
    } catch (error) {
      console.error('Error adding tracking:', error);
      toast({
        title: "Error",
        description: "Failed to update tracking",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Tracking Update</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTracking} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={newStatus} onValueChange={(value: 'pending' | 'approved' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled') => setNewStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location (Optional)</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Nairobi Sorting Facility"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Note (Optional)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Additional information about this update"
                rows={3}
              />
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Update'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracking History</CardTitle>
        </CardHeader>
        <CardContent>
          {tracking.length === 0 ? (
            <p className="text-gray-500">No tracking updates yet.</p>
          ) : (
            <div className="space-y-4">
              {tracking.map((item) => (
                <div key={item.id} className="border-l-4 border-blue-200 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getStatusColor(item.status)}>
                      {statusOptions.find(opt => opt.value === item.status)?.label || item.status}
                    </Badge>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  {item.location && (
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {item.location}
                    </div>
                  )}
                  
                  {item.note && (
                    <p className="text-sm text-gray-700">{item.note}</p>
                  )}
                  
                  {item.updated_by && (
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <User className="h-3 w-3 mr-1" />
                      Updated by admin
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrderTracking;
