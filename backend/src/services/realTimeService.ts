import { Server, Socket } from 'socket.io';
import { AuthService } from './authService';
import { AIService } from './aiService';
// import { VectorService } from './vectorService'; // Temporarily disabled
import { ChatMessage, User } from '../../../shared/types';

interface ConnectedUser {
  userId: string;
  socketId: string;
  user: User;
  rooms: Set<string>;
  lastActivity: Date;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'private' | 'group' | 'ai-chat';
  participants: Set<string>;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

interface TypingStatus {
  userId: string;
  username: string;
  roomId: string;
  timestamp: Date;
}

export class RealTimeService {
  private static io: Server;
  private static connectedUsers: Map<string, ConnectedUser> = new Map();
  private static chatRooms: Map<string, ChatRoom> = new Map();
  private static typingStatus: Map<string, TypingStatus> = new Map();

  /**
   * Initialize Socket.io server
   */
  static initialize(io: Server): void {
    this.io = io;
    this.setupSocketHandlers();
    this.startCleanupTasks();
    console.log('🔗 Real-time service initialized');
  }

  /**
   * Setup Socket.io event handlers
   */
  private static setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`👤 User connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data) => {
        await this.handleAuthentication(socket, data);
      });

      // Handle joining rooms
      socket.on('join-room', (data) => {
        this.handleJoinRoom(socket, data);
      });

      // Handle leaving rooms
      socket.on('leave-room', (data) => {
        this.handleLeaveRoom(socket, data);
      });

      // Handle chat messages
      socket.on('chat-message', async (data) => {
        await this.handleChatMessage(socket, data);
      });

      // Handle AI chat requests
      socket.on('ai-chat-request', async (data) => {
        await this.handleAIChatRequest(socket, data);
      });

      // Handle RAG queries
      socket.on('rag-query', async (data) => {
        await this.handleRAGQuery(socket, data);
      });

      // Handle typing indicators
      socket.on('typing-start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing-stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      // Handle document collaboration
      socket.on('document-edit', (data) => {
        this.handleDocumentEdit(socket, data);
      });

      // Handle presence updates
      socket.on('presence-update', (data) => {
        this.handlePresenceUpdate(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Handle user authentication
   */
  private static async handleAuthentication(socket: Socket, data: { token: string }): Promise<void> {
    try {
      if (!data.token) {
        socket.emit('auth-error', { message: 'Authentication token required' });
        return;
      }

      // Verify JWT token
      const payload = AuthService.verifyToken(data.token);
      
      // In a real app, you'd fetch user from database
      const user: User = {
        id: payload.userId,
        email: payload.email,
        name: 'User', // Would be fetched from DB
        plan: payload.plan as 'free' | 'pro' | 'enterprise',
        tokensUsed: 0,
        tokensLimit: AuthService.getTokenLimits(payload.plan as 'free' | 'pro' | 'enterprise'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store connected user
      const connectedUser: ConnectedUser = {
        userId: payload.userId,
        socketId: socket.id,
        user,
        rooms: new Set(),
        lastActivity: new Date()
      };

      this.connectedUsers.set(socket.id, connectedUser);

      // Join user to their personal room
      const personalRoom = `user:${payload.userId}`;
      socket.join(personalRoom);
      connectedUser.rooms.add(personalRoom);

      socket.emit('authenticated', {
        success: true,
        user: user,
        connectedUsers: this.getConnectedUsersCount(),
        timestamp: new Date().toISOString()
      });

      // Broadcast user online status
      socket.broadcast.emit('user-online', {
        userId: payload.userId,
        username: user.name
      });

      console.log(`✅ User authenticated: ${payload.userId} (${socket.id})`);

    } catch (error: any) {
      console.error('Authentication error:', error);
      socket.emit('auth-error', { 
        message: 'Authentication failed',
        error: error.message 
      });
    }
  }

  /**
   * Handle joining rooms
   */
  private static handleJoinRoom(socket: Socket, data: { roomId: string; roomType?: string }): void {
    const user = this.connectedUsers.get(socket.id);
    if (!user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { roomId, roomType = 'group' } = data;

    // Create room if it doesn't exist
    if (!this.chatRooms.has(roomId)) {
      const newRoom: ChatRoom = {
        id: roomId,
        name: `Room ${roomId}`,
        type: roomType as 'private' | 'group' | 'ai-chat',
        participants: new Set(),
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date()
      };
      this.chatRooms.set(roomId, newRoom);
    }

    const room = this.chatRooms.get(roomId)!;
    
    // Join socket room
    socket.join(roomId);
    user.rooms.add(roomId);
    room.participants.add(user.userId);
    room.lastActivity = new Date();

    // Send room info and recent messages
    socket.emit('room-joined', {
      roomId,
      room: {
        id: room.id,
        name: room.name,
        type: room.type,
        participantCount: room.participants.size,
        messages: room.messages.slice(-50) // Last 50 messages
      }
    });

    // Notify other participants
    socket.to(roomId).emit('user-joined-room', {
      roomId,
      userId: user.userId,
      username: user.user.name
    });

    console.log(`👥 User ${user.userId} joined room ${roomId}`);
  }

  /**
   * Handle leaving rooms
   */
  private static handleLeaveRoom(socket: Socket, data: { roomId: string }): void {
    const user = this.connectedUsers.get(socket.id);
    if (!user) return;

    const { roomId } = data;
    const room = this.chatRooms.get(roomId);

    if (room) {
      socket.leave(roomId);
      user.rooms.delete(roomId);
      room.participants.delete(user.userId);

      // Notify other participants
      socket.to(roomId).emit('user-left-room', {
        roomId,
        userId: user.userId,
        username: user.user.name
      });

      console.log(`👋 User ${user.userId} left room ${roomId}`);
    }
  }

  /**
   * Handle chat messages
   */
  private static async handleChatMessage(socket: Socket, data: {
    roomId: string;
    content: string;
    type?: string;
  }): Promise<void> {
    const user = this.connectedUsers.get(socket.id);
    if (!user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { roomId, content, type = 'text' } = data;
    const room = this.chatRooms.get(roomId);

    if (!room || !user.rooms.has(roomId)) {
      socket.emit('error', { message: 'Not in this room' });
      return;
    }

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      role: 'user',
      content,
      timestamp: new Date(),
      tokens: content.length // Rough token estimation
    };

    // Store message
    room.messages.push(message);
    room.lastActivity = new Date();

    // Broadcast to room participants
    this.io.to(roomId).emit('new-message', {
      roomId,
      message: {
        ...message,
        userId: user.userId,
        username: user.user.name,
        avatar: user.user.avatar
      }
    });

    console.log(`💬 Message in room ${roomId} from ${user.userId}: ${content.substring(0, 50)}...`);
  }

  /**
   * Handle AI chat requests
   */
  private static async handleAIChatRequest(socket: Socket, data: {
    roomId: string;
    messages: ChatMessage[];
    options?: any;
  }): Promise<void> {
    const user = this.connectedUsers.get(socket.id);
    if (!user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { roomId, messages, options = {} } = data;

    try {
      // Check token limits
      const estimatedTokens = messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0) + 500;
      if (!AuthService.hasEnoughTokens(user.user, estimatedTokens)) {
        socket.emit('ai-chat-error', {
          message: 'Insufficient tokens',
          tokensRequired: estimatedTokens,
          tokensAvailable: user.user.tokensLimit - user.user.tokensUsed
        });
        return;
      }

      // Send typing indicator
      socket.to(roomId).emit('ai-typing', { roomId, isTyping: true });

      // Process AI request
      const aiResponse = await AIService.processChat(messages, options);

      // Stop typing indicator
      socket.to(roomId).emit('ai-typing', { roomId, isTyping: false });

      if (aiResponse.success) {
        const aiMessage: ChatMessage = {
          id: `ai_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          tokens: aiResponse.usage?.totalTokens || 0
        };

        // Store message in room
        const room = this.chatRooms.get(roomId);
        if (room) {
          room.messages.push(aiMessage);
          room.lastActivity = new Date();
        }

        // Update user token usage
        user.user.tokensUsed += aiResponse.usage?.totalTokens || 0;

        // Broadcast AI response
        this.io.to(roomId).emit('ai-response', {
          roomId,
          message: aiMessage,
          usage: aiResponse.usage
        });

        console.log(`🤖 AI response in room ${roomId}: ${aiResponse.content.substring(0, 50)}...`);
      } else {
        socket.emit('ai-chat-error', {
          message: 'AI generation failed',
          error: aiResponse.error
        });
      }

    } catch (error: any) {
      console.error('AI chat error:', error);
      socket.to(roomId).emit('ai-typing', { roomId, isTyping: false });
      socket.emit('ai-chat-error', {
        message: 'AI chat request failed',
        error: error.message
      });
    }
  }

  /**
   * Handle RAG queries
   */
  private static async handleRAGQuery(socket: Socket, data: {
    query: string;
    roomId?: string;
    options?: any;
  }): Promise<void> {
    const user = this.connectedUsers.get(socket.id);
    if (!user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { query, roomId, options = {} } = data;

    try {
      // Temporarily disable vector service for demo
      socket.emit('rag-error', { message: 'Vector database not configured in demo mode' });
      return;

      /*
      if (!VectorService.isConfigured()) {
        socket.emit('rag-error', { message: 'Vector database not configured' });
        return;
      }

      // Send processing indicator
      if (roomId) {
        socket.to(roomId).emit('rag-processing', { roomId, isProcessing: true });
      }

      // Perform RAG query
      const ragResult = await VectorService.performRAG(query, {
        userId: user.userId,
        ...options
      });

      // Stop processing indicator
      if (roomId) {
        socket.to(roomId).emit('rag-processing', { roomId, isProcessing: false });
      }

      // Send result
      socket.emit('rag-response', {
        query,
        answer: ragResult.answer,
        sources: ragResult.sources,
        usage: ragResult.usage,
        timestamp: new Date().toISOString()
      });

      // If in a room, broadcast to participants
      if (roomId) {
        socket.to(roomId).emit('rag-shared', {
          roomId,
          userId: user.userId,
          username: user.user.name,
          query,
          answer: ragResult.answer,
          sources: ragResult.sources
        });
      }

      console.log(`🔍 RAG query from ${user.userId}: ${query}`);
      */

    } catch (error: any) {
      console.error('RAG query error:', error);
      if (roomId) {
        socket.to(roomId).emit('rag-processing', { roomId, isProcessing: false });
      }
      socket.emit('rag-error', {
        message: 'RAG query failed',
        error: error.message
      });
    }
  }

  /**
   * Handle typing indicators
   */
  private static handleTypingStart(socket: Socket, data: { roomId: string }): void {
    const user = this.connectedUsers.get(socket.id);
    if (!user || !user.rooms.has(data.roomId)) return;

    const typingKey = `${data.roomId}:${user.userId}`;
    this.typingStatus.set(typingKey, {
      userId: user.userId,
      username: user.user.name,
      roomId: data.roomId,
      timestamp: new Date()
    });

    socket.to(data.roomId).emit('user-typing', {
      roomId: data.roomId,
      userId: user.userId,
      username: user.user.name,
      isTyping: true
    });
  }

  /**
   * Handle typing stop
   */
  private static handleTypingStop(socket: Socket, data: { roomId: string }): void {
    const user = this.connectedUsers.get(socket.id);
    if (!user) return;

    const typingKey = `${data.roomId}:${user.userId}`;
    this.typingStatus.delete(typingKey);

    socket.to(data.roomId).emit('user-typing', {
      roomId: data.roomId,
      userId: user.userId,
      username: user.user.name,
      isTyping: false
    });
  }

  /**
   * Handle document editing
   */
  private static handleDocumentEdit(socket: Socket, data: {
    documentId: string;
    operation: string;
    content: any;
    position?: number;
  }): void {
    const user = this.connectedUsers.get(socket.id);
    if (!user) return;

    // Broadcast document changes to all participants
    socket.broadcast.emit('document-updated', {
      documentId: data.documentId,
      operation: data.operation,
      content: data.content,
      position: data.position,
      userId: user.userId,
      username: user.user.name,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle presence updates
   */
  private static handlePresenceUpdate(socket: Socket, data: { status: string; activity?: string }): void {
    const user = this.connectedUsers.get(socket.id);
    if (!user) return;

    user.lastActivity = new Date();

    // Broadcast presence to all user's rooms
    user.rooms.forEach(roomId => {
      socket.to(roomId).emit('presence-update', {
        userId: user.userId,
        username: user.user.name,
        status: data.status,
        activity: data.activity,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Handle user disconnection
   */
  private static handleDisconnection(socket: Socket): void {
    const user = this.connectedUsers.get(socket.id);
    if (!user) return;

    // Clean up typing status
    Array.from(this.typingStatus.keys())
      .filter(key => key.endsWith(`:${user.userId}`))
      .forEach(key => this.typingStatus.delete(key));

    // Notify rooms about user leaving
    user.rooms.forEach(roomId => {
      socket.to(roomId).emit('user-offline', {
        userId: user.userId,
        username: user.user.name
      });

      // Remove from room participants
      const room = this.chatRooms.get(roomId);
      if (room) {
        room.participants.delete(user.userId);
      }
    });

    // Remove user
    this.connectedUsers.delete(socket.id);

    console.log(`👋 User disconnected: ${user.userId} (${socket.id})`);
  }

  /**
   * Get connected users count
   */
  private static getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Start cleanup tasks
   */
  private static startCleanupTasks(): void {
    // Clean up old typing indicators
    setInterval(() => {
      const now = new Date();
      Array.from(this.typingStatus.entries()).forEach(([key, status]) => {
        if (now.getTime() - status.timestamp.getTime() > 30000) { // 30 seconds
          this.typingStatus.delete(key);
        }
      });
    }, 10000); // Every 10 seconds

    // Clean up inactive rooms
    setInterval(() => {
      const now = new Date();
      Array.from(this.chatRooms.entries()).forEach(([roomId, room]) => {
        if (room.participants.size === 0 && 
            now.getTime() - room.lastActivity.getTime() > 3600000) { // 1 hour
          this.chatRooms.delete(roomId);
          console.log(`🗑️ Cleaned up inactive room: ${roomId}`);
        }
      });
    }, 300000); // Every 5 minutes
  }

  /**
   * Get service statistics
   */
  static getStats(): {
    connectedUsers: number;
    activeRooms: number;
    activeTyping: number;
    totalMessages: number;
  } {
    const totalMessages = Array.from(this.chatRooms.values())
      .reduce((sum, room) => sum + room.messages.length, 0);

    return {
      connectedUsers: this.connectedUsers.size,
      activeRooms: this.chatRooms.size,
      activeTyping: this.typingStatus.size,
      totalMessages
    };
  }
}

export default RealTimeService;