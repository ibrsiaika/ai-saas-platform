'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, 
  Bot, 
  Users, 
  Wifi, 
  WifiOff,
  MessageSquare,
  Search,
  FileText,
  Loader2
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  userId?: string;
  username?: string;
  avatar?: string;
  tokens?: number;
}

interface User {
  userId: string;
  username: string;
  isTyping?: boolean;
  status?: string;
}

interface RealtimeChatProps {
  userToken?: string;
  initialRoomId?: string;
  className?: string;
}

export default function RealtimeChat({ 
  userToken, 
  initialRoomId = 'general',
  className = '' 
}: RealtimeChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(initialRoomId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isRagProcessing, setIsRagProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [ragQuery, setRagQuery] = useState('');
  const [showRagInput, setShowRagInput] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize Socket.io connection
  useEffect(() => {
    if (!userToken) return;

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('🔗 Connected to server');
      setIsConnected(true);
      
      // Authenticate with token
      newSocket.emit('authenticate', { token: userToken });
    });

    newSocket.on('disconnect', () => {
      console.log('📴 Disconnected from server');
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    newSocket.on('authenticated', (data) => {
      console.log('✅ Authenticated:', data);
      setIsAuthenticated(true);
      
      // Join initial room
      newSocket.emit('join-room', { 
        roomId: currentRoom, 
        roomType: 'ai-chat' 
      });
    });

    newSocket.on('auth-error', (data) => {
      console.error('❌ Authentication failed:', data);
      setIsAuthenticated(false);
    });

    newSocket.on('room-joined', (data) => {
      console.log('🏠 Joined room:', data);
      setMessages(data.room.messages || []);
    });

    newSocket.on('new-message', (data) => {
      console.log('💬 New message:', data);
      setMessages(prev => [...prev, {
        ...data.message,
        timestamp: new Date(data.message.timestamp)
      }]);
    });

    newSocket.on('ai-response', (data) => {
      console.log('🤖 AI response:', data);
      setMessages(prev => [...prev, {
        ...data.message,
        timestamp: new Date(data.message.timestamp)
      }]);
      setIsAiTyping(false);
    });

    newSocket.on('ai-typing', (data) => {
      setIsAiTyping(data.isTyping);
    });

    newSocket.on('rag-response', (data) => {
      console.log('🔍 RAG response:', data);
      const ragMessage: Message = {
        id: `rag_${Date.now()}`,
        role: 'assistant',
        content: `**RAG Query:** ${data.query}\n\n**Answer:** ${data.answer}\n\n**Sources:** ${data.sources?.length || 0} documents`,
        timestamp: new Date(),
        tokens: data.usage?.totalTokens || 0
      };
      setMessages(prev => [...prev, ragMessage]);
      setIsRagProcessing(false);
      setShowRagInput(false);
      setRagQuery('');
    });

    newSocket.on('rag-processing', (data) => {
      setIsRagProcessing(data.isProcessing);
    });

    newSocket.on('user-typing', (data) => {
      if (data.isTyping) {
        setTypingUsers(prev => new Set([...prev, data.username]));
      } else {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.username);
          return newSet;
        });
      }
    });

    newSocket.on('user-joined-room', (data) => {
      console.log('👤 User joined:', data);
    });

    newSocket.on('user-left-room', (data) => {
      console.log('👋 User left:', data);
    });

    newSocket.on('error', (data) => {
      console.error('🚨 Socket error:', data);
    });

    setSocket(newSocket);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      newSocket.close();
    };
  }, [userToken, currentRoom]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!socket || !newMessage.trim() || isSending) return;

    setIsSending(true);
    
    const messageContent = newMessage.trim();
    setNewMessage('');

    // Stop typing indicator
    socket.emit('typing-stop', { roomId: currentRoom });

    // Check if this is an AI request (starts with @ai)
    if (messageContent.startsWith('@ai ')) {
      const aiPrompt = messageContent.substring(4);
      
      // Add user message
      const userMessage: Message = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: aiPrompt,
        timestamp: new Date(),
        tokens: aiPrompt.length
      };

      setMessages(prev => [...prev, userMessage]);

      // Send AI chat request
      socket.emit('ai-chat-request', {
        roomId: currentRoom,
        messages: [...messages, userMessage].slice(-10), // Last 10 messages for context
        options: {
          temperature: 0.7,
          maxTokens: 1000
        }
      });

      setIsAiTyping(true);
    } else {
      // Regular chat message
      socket.emit('chat-message', {
        roomId: currentRoom,
        content: messageContent,
        type: 'text'
      });
    }

    setIsSending(false);
  };

  const handleSendRagQuery = () => {
    if (!socket || !ragQuery.trim() || isRagProcessing) return;

    setIsRagProcessing(true);
    
    socket.emit('rag-query', {
      query: ragQuery,
      roomId: currentRoom,
      options: {
        topK: 5,
        threshold: 0.7
      }
    });
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    if (!socket) return;

    // Send typing start
    socket.emit('typing-start', { roomId: currentRoom });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', { roomId: currentRoom });
    }, 2000);
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
  };

  const getConnectionStatus = () => {
    if (!isConnected) return { icon: WifiOff, color: 'text-red-500', label: 'Disconnected' };
    if (!isAuthenticated) return { icon: Wifi, color: 'text-yellow-500', label: 'Connecting...' };
    return { icon: Wifi, color: 'text-green-500', label: 'Connected' };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Card className={`flex flex-col h-[600px] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">AI Chat Room: {currentRoom}</h3>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {connectedUsers.length}
          </Badge>
          <div className="flex items-center gap-1">
            <connectionStatus.icon className={`h-4 w-4 ${connectionStatus.color}`} />
            <span className={`text-xs ${connectionStatus.color}`}>
              {connectionStatus.label}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'assistant' ? 'justify-start' : 'justify-end'
              }`}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.role === 'assistant'
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {message.username && (
                  <div className="text-xs opacity-70 mb-1">
                    {message.username}
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
                <div className="text-xs opacity-50 mt-1 flex items-center gap-2">
                  <span>{formatTimestamp(message.timestamp)}</span>
                  {message.tokens && (
                    <span>• {message.tokens} tokens</span>
                  )}
                </div>
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {message.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Typing indicators */}
          {(typingUsers.size > 0 || isAiTyping) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-200" />
              </div>
              {isAiTyping ? (
                <span>AI is typing...</span>
              ) : (
                <span>
                  {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </span>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* RAG Query Input */}
      {showRagInput && (
        <div className="p-4 border-t bg-muted/50">
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question about your documents..."
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendRagQuery();
                }
              }}
              disabled={isRagProcessing}
            />
            <Button
              onClick={handleSendRagQuery}
              disabled={!ragQuery.trim() || isRagProcessing}
              size="sm"
            >
              {isRagProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={() => setShowRagInput(false)}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2 mb-2">
          <Button
            onClick={() => setShowRagInput(!showRagInput)}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <FileText className="h-3 w-3" />
            RAG Query
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Type a message... (Use @ai for AI assistance)"
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={!isAuthenticated || isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isAuthenticated || isSending}
            size="sm"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground mt-2">
          💡 Tips: Use <code>@ai your question</code> for AI assistance, or click "RAG Query" to search documents
        </div>
      </div>
    </Card>
  );
}