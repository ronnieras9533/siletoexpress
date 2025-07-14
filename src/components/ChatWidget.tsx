
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Send, X, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chatMessages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && isOpen,
    refetchInterval: 5000, // Poll every 5 seconds when chat is open
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: null, // Admin will be determined on backend
          message: messageText,
          is_admin_message: false,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      setMessage('');
    },
  });

  const markMessagesAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('receiver_id', user.id)
        .eq('read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      markMessagesAsRead.mutate();
    }
  }, [isOpen, isMinimized, messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const unreadCount = messages.filter(m => 
    m.receiver_id === user?.id && !m.read
  ).length;

  if (!user) return null;

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg relative"
          >
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className={`fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg shadow-xl border transition-all duration-200 ${
          isMinimized ? 'h-12' : 'h-96'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium">Chat Support</span>
              {unreadCount > 0 && !isMinimized && (
                <Badge className="bg-red-500 text-white text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-blue-700 h-6 w-6 p-0"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-blue-700 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 p-3 h-64">
                {isLoading ? (
                  <div className="text-center text-gray-500 text-sm">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Start a conversation with our support team!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender_id === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                            msg.sender_id === user?.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p>{msg.message}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!message.trim() || sendMessageMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
