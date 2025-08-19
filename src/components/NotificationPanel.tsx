import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Bell, 
  X, 
  Package, 
  FileText, 
  CreditCard, 
  ExternalLink, 
  Clock,
  CheckCircle,
  Truck,
  CheckCheck,
  XCircle,
  Clock4,
  PackageCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  metadata?: any;
  reference_id?: string;
}

const NotificationPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['userNotifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['userNotifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string, status?: string) => {
    // Handle order status icons specifically
    if (type === 'order_status' && status) {
      switch (status.toLowerCase()) {
        case 'confirmed':
          return <CheckCircle className="h-4 w-4" />;
        case 'processing':
          return <Package className="h-4 w-4" />;
        case 'shipped':
          return <Truck className="h-4 w-4" />;
        case 'out_for_delivery':
          return <PackageCheck className="h-4 w-4" />;
        case 'delivered':
          return <CheckCheck className="h-4 w-4" />;
        case 'cancelled':
          return <XCircle className="h-4 w-4" />;
        case 'pending':
          return <Clock4 className="h-4 w-4" />;
        default:
          return <Package className="h-4 w-4" />;
      }
    }
    
    // Handle other notification types
    switch (type) {
      case 'order_status':
        return <Package className="h-4 w-4" />;
      case 'prescription_update':
        return <FileText className="h-4 w-4" />;
      case 'payment_required':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string, status?: string) => {
    // Handle order status colors specifically
    if (type === 'order_status' && status) {
      switch (status.toLowerCase()) {
        case 'confirmed':
          return 'text-green-600 bg-green-50';
        case 'processing':
          return 'text-blue-600 bg-blue-50';
        case 'shipped':
          return 'text-indigo-600 bg-indigo-50';
        case 'out_for_delivery':
          return 'text-teal-600 bg-teal-50';
        case 'delivered':
          return 'text-purple-600 bg-purple-50';
        case 'cancelled':
          return 'text-red-600 bg-red-50';
        case 'pending':
          return 'text-yellow-600 bg-yellow-50';
        default:
          return 'text-gray-600 bg-gray-50';
      }
    }
    
    // Handle other notification types
    switch (type) {
      case 'order_status':
        return 'text-blue-600 bg-blue-50';
      case 'prescription_update':
        return 'text-green-600 bg-green-50';
      case 'payment_required':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Set selected notification for detail view
    setSelectedNotification(notification);
  };

  const handleActionClick = (notification: Notification) => {
    // Mark as read first
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'order_status':
        if (notification.reference_id) {
          navigate(`/track-order?order_id=${notification.reference_id}`);
        } else {
          navigate('/my-orders-prescriptions');
        }
        break;
      case 'prescription_update':
        navigate('/my-orders-prescriptions?tab=prescriptions');
        break;
      case 'payment_required':
        if (notification.reference_id) {
          navigate(`/payment/${notification.reference_id}`);
        }
        break;
      default:
        break;
    }
    
    // Close the panel
    setIsOpen(false);
  };

  const getActionButtonText = (type: string) => {
    switch (type) {
      case 'order_status':
        return 'View Order';
      case 'prescription_update':
        return 'View Prescriptions';
      case 'payment_required':
        return 'Make Payment';
      default:
        return 'View Details';
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border z-50">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllAsReadMutation.mutate()}
                      className="text-xs"
                      disabled={markAllAsReadMutation.isPending}
                    >
                      {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all read'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close notifications"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="max-h-96">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-pulse flex justify-center">
                    <div className="h-2 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p>No notifications yet</p>
                  <p className="text-sm mt-1">We'll notify you when something arrives</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    // Extract status from metadata for order_status notifications
                    const status = notification.type === 'order_status' && notification.metadata?.status 
                      ? notification.metadata.status 
                      : null;
                      
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 cursor-pointer ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${getNotificationColor(notification.type, status)}`}>
                            {getNotificationIcon(notification.type, status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm text-gray-900">
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <div 
                                  className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"
                                  aria-label="Unread notification"
                                />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            {status && (
                              <div className="mt-2">
                                <Badge variant="outline" className={getNotificationColor(notification.type, status)}>
                                  {getStatusText(status)}
                                </Badge>
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActionClick(notification);
                                }}
                              >
                                {getActionButtonText(notification.type)}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}

      {/* Notification Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && (
                <>
                  <div className={`p-2 rounded-full ${getNotificationColor(
                    selectedNotification.type, 
                    selectedNotification.metadata?.status
                  )}`}>
                    {getNotificationIcon(
                      selectedNotification.type, 
                      selectedNotification.metadata?.status
                    )}
                  </div>
                  {selectedNotification.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <p className="text-gray-700">{selectedNotification.message}</p>
              
              {selectedNotification.metadata?.status && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className={getNotificationColor(selectedNotification.type, selectedNotification.metadata.status)}>
                    {getStatusText(selectedNotification.metadata.status)}
                  </Badge>
                </div>
              )}
              
              <div className="flex items-center text-sm text-gray-500 gap-1">
                <Clock className="h-4 w-4" />
                {new Date(selectedNotification.created_at).toLocaleString()}
              </div>
              
              {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <h4 className="font-medium mb-2">Details:</h4>
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(selectedNotification.metadata, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedNotification(null)}
                >
                  Close
                </Button>
                {selectedNotification.reference_id && (
                  <Button
                    onClick={() => {
                      handleActionClick(selectedNotification);
                      setSelectedNotification(null);
                    }}
                  >
                    {getActionButtonText(selectedNotification.type)}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationPanel;
