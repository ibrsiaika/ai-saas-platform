'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import RealtimeChat from '@/components/RealtimeChat';
import { 
  MessageSquare, 
  Users, 
  Bot, 
  FileText, 
  Activity,
  Zap,
  Globe,
  Shield
} from 'lucide-react';

// Mock user token - in real app, this would come from authentication
const MOCK_USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMyIsImVtYWlsIjoiZGVtb0BleGFtcGxlLmNvbSIsInBsYW4iOiJwcm8iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMzYwMH0.demo_token';

export default function RealTimeChatPage() {
  const [stats, setStats] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState('general');
  const [customRoom, setCustomRoom] = useState('');

  // Fetch real-time stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/realtime/stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const rooms = [
    { id: 'general', name: 'General Chat', type: 'group' },
    { id: 'ai-help', name: 'AI Assistance', type: 'ai-chat' },
    { id: 'tech-discussion', name: 'Tech Discussion', type: 'group' },
    { id: 'announcements', name: 'Announcements', type: 'group' }
  ];

  const handleJoinCustomRoom = () => {
    if (customRoom.trim()) {
      setSelectedRoom(customRoom.trim().toLowerCase().replace(/\s+/g, '-'));
      setCustomRoom('');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Real-Time AI Chat</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Experience live AI-powered conversations with real-time collaboration features
        </p>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <h3 className="font-semibold mb-1">Live Chat</h3>
            <p className="text-sm text-muted-foreground">Real-time messaging with typing indicators</p>
          </Card>
          
          <Card className="p-4 text-center">
            <Bot className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <h3 className="font-semibold mb-1">AI Integration</h3>
            <p className="text-sm text-muted-foreground">Chat with GPT-4 using @ai commands</p>
          </Card>
          
          <Card className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <h3 className="font-semibold mb-1">RAG Queries</h3>
            <p className="text-sm text-muted-foreground">Search and query your documents</p>
          </Card>
          
          <Card className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <h3 className="font-semibold mb-1">Collaboration</h3>
            <p className="text-sm text-muted-foreground">Multi-user rooms with presence</p>
          </Card>
        </div>

        {/* Real-time statistics */}
        {stats && (
          <Card className="p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-semibold">Live Statistics</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{stats.connectedUsers}</div>
                <div className="text-sm text-muted-foreground">Connected Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{stats.activeRooms}</div>
                <div className="text-sm text-muted-foreground">Active Rooms</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{stats.activeTyping}</div>
                <div className="text-sm text-muted-foreground">Users Typing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.totalMessages}</div>
                <div className="text-sm text-muted-foreground">Total Messages</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Room Selection Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Chat Rooms
            </h3>
            
            <div className="space-y-2 mb-4">
              {rooms.map((room) => (
                <Button
                  key={room.id}
                  variant={selectedRoom === room.id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedRoom(room.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {room.name}
                  {room.type === 'ai-chat' && (
                    <Bot className="h-3 w-3 ml-auto text-green-500" />
                  )}
                </Button>
              ))}
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Join Custom Room</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Room name..."
                  value={customRoom}
                  onChange={(e) => setCustomRoom(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinCustomRoom();
                    }
                  }}
                  className="text-sm"
                />
                <Button
                  onClick={handleJoinCustomRoom}
                  disabled={!customRoom.trim()}
                  size="sm"
                >
                  Join
                </Button>
              </div>
            </div>

            <div className="mt-6 p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Quick Tips
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Use <code>@ai your question</code> for AI help</li>
                <li>• Click "RAG Query" to search documents</li>
                <li>• See typing indicators in real-time</li>
                <li>• Switch rooms to join different conversations</li>
              </ul>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Shield className="h-3 w-3 text-blue-500" />
                Demo Mode
              </h4>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                This is a demonstration using a mock token. In production, you would authenticate with your real credentials.
              </p>
            </div>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <RealtimeChat
            userToken={MOCK_USER_TOKEN}
            initialRoomId={selectedRoom}
            key={selectedRoom} // Force re-render when room changes
          />
        </div>
      </div>

      {/* Usage Instructions */}
      <Card className="mt-8 p-6">
        <h3 className="text-lg font-semibold mb-4">How to Use Real-Time Features</h3>
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat">Basic Chat</TabsTrigger>
            <TabsTrigger value="ai">AI Assistance</TabsTrigger>
            <TabsTrigger value="rag">RAG Queries</TabsTrigger>
            <TabsTrigger value="collab">Collaboration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-medium">Basic Chat Features</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Type messages and press Enter to send</li>
                <li>See real-time typing indicators when others are typing</li>
                <li>Join different rooms to participate in various conversations</li>
                <li>View timestamps and message metadata</li>
                <li>See user presence and online status</li>
              </ul>
            </div>
          </TabsContent>
          
          <TabsContent value="ai" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-medium">AI-Powered Chat</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Use <code>@ai your question</code> to chat with GPT-4</li>
                <li>AI responses appear with a bot avatar</li>
                <li>Context is maintained across conversations</li>
                <li>Token usage is tracked and displayed</li>
                <li>Support for complex reasoning and code generation</li>
              </ul>
              <div className="bg-muted p-3 rounded text-sm">
                <strong>Example:</strong> <code>@ai Explain quantum computing in simple terms</code>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="rag" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-medium">RAG Document Queries</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Click "RAG Query" button to search your documents</li>
                <li>Ask questions about uploaded content</li>
                <li>Receive answers with source citations</li>
                <li>Vector similarity search for relevant content</li>
                <li>Share results with other users in the room</li>
              </ul>
              <div className="bg-muted p-3 rounded text-sm">
                <strong>Example:</strong> "What are the key findings from the research paper about AI safety?"
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="collab" className="mt-4">
            <div className="space-y-3">
              <h4 className="font-medium">Collaboration Features</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Real-time presence indicators show who's online</li>
                <li>See typing indicators when users are composing messages</li>
                <li>Join multiple rooms for different topics</li>
                <li>Share AI responses and RAG results with the team</li>
                <li>Document editing synchronization (coming soon)</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}