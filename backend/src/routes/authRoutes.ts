import express from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/authService';
import { User } from '../../../shared/types';

const router = express.Router();

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs (increased for development)
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      type: 'rate_limit_error'
    }
  }
});

// In-memory user storage (In production, use a proper database)
const users: User[] = [];
const userSessions: Map<string, string> = new Map(); // userId -> token

// Initialize with some test users for development
const initializeTestUsers = async () => {
  if (users.length === 0) {
    try {
      // Create test users for different plans
      await createUser({
        email: 'test@example.com',
        name: 'Test User',
        password: 'Test123!@#',
        plan: 'free'
      });
      
      await createUser({
        email: 'pro@example.com', 
        name: 'Pro User',
        password: 'Test123!@#',
        plan: 'pro'
      });
      
      await createUser({
        email: 'admin@example.com',
        name: 'Admin User', 
        password: 'Test123!@#',
        plan: 'enterprise'
      });
      
      console.log('✅ Test users initialized successfully');
      console.log('📧 Available test accounts:');
      console.log('   - test@example.com (Free Plan)');
      console.log('   - pro@example.com (Pro Plan)');
      console.log('   - admin@example.com (Enterprise Plan)');
      console.log('   Password for all: Test123!@#');
    } catch (error) {
      console.error('❌ Error initializing test users:', error);
    }
  }
};

/**
 * Helper function to find user by email
 */
const findUserByEmail = (email: string): User | undefined => {
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
};

/**
 * Helper function to find user by ID
 */
const findUserById = (id: string): User | undefined => {
  return users.find(user => user.id === id);
};

/**
 * Helper function to create a new user
 */
const createUser = async (userData: {
  email: string;
  name?: string;
  password: string;
  plan?: 'free' | 'pro' | 'enterprise';
}): Promise<User> => {
  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const passwordHash = await AuthService.hashPassword(userData.password);
  const plan = userData.plan || 'free';
  const name = userData.name || userData.email.split('@')[0];

  const newUser: User = {
    id: userId,
    email: userData.email.toLowerCase(),
    name,
    plan,
    tokensUsed: 0,
    tokensLimit: AuthService.getTokenLimits(plan),
    createdAt: new Date(),
    updatedAt: new Date(),
    passwordHash,
    emailVerified: false,
    apiKey: AuthService.generateApiKey(userId)
  };

  users.push(newUser);
  return newUser;
};

// Initialize test users on module load
initializeTestUsers();

// Apply rate limiting to auth routes
router.use(authRateLimit);

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;

    // Validate input - name is optional, will use email username if not provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Generate name from email if not provided
    const userName = name || email.split('@')[0];

    // Validate email format
    if (!AuthService.validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    const passwordValidation = AuthService.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const newUser = await createUser({
      email: AuthService.sanitizeInput(email),
      name: AuthService.sanitizeInput(userName),
      password
    });

    // Create session
    const session = AuthService.createUserSession(newUser);
    userSessions.set(newUser.id, session.token);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: session.user,
      token: session.token
    });

  } catch (error: any) {
    console.error('Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: {
        code: 'INTERNAL_ERROR',
        type: 'server_error'
      }
    });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Authenticate user
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = findUserByEmail(email);
    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await AuthService.comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create session
    const session = AuthService.createUserSession(user);
    userSessions.set(user.id, session.token);

    res.json({
      success: true,
      message: 'Login successful',
      user: session.user,
      token: session.token
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: {
        code: 'INTERNAL_ERROR',
        type: 'server_error'
      }
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Protected
 */
router.post('/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = AuthService.verifyToken(token);
      userSessions.delete(payload.userId);
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (tokenError: any) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error: any) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user info
 * @access Protected
 */
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = AuthService.verifyToken(token);
      const user = findUserById(payload.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        user: userWithoutPassword
      });
    } catch (tokenError: any) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error: any) {
    console.error('Get User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route PUT /api/auth/update
 * @desc Update user profile
 * @access Protected
 */
router.put('/update', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = AuthService.verifyToken(token);
      const user = findUserById(payload.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const { name, avatar } = req.body;

      // Update user data
      if (name) {
        user.name = AuthService.sanitizeInput(name);
      }
      if (avatar) {
        user.avatar = AuthService.sanitizeInput(avatar);
      }
      user.updatedAt = new Date();

      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: userWithoutPassword
      });

    } catch (tokenError: any) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error: any) {
    console.error('Update User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during update'
    });
  }
});

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Protected
 */
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    try {
      const payload = AuthService.verifyToken(token);
      const user = findUserById(payload.userId);
      
      if (!user || !user.passwordHash) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await AuthService.comparePassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Validate new password
      const passwordValidation = AuthService.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'New password does not meet requirements',
          errors: passwordValidation.errors
        });
      }

      // Update password
      user.passwordHash = await AuthService.hashPassword(newPassword);
      user.updatedAt = new Date();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (tokenError: any) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error: any) {
    console.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password change'
    });
  }
});

/**
 * @route GET /api/auth/health
 * @desc Check authentication service health
 * @access Public
 */
router.get('/health', (req, res) => {
  const health = AuthService.getHealthStatus();
  
  res.json({
    success: true,
    health: {
      ...health,
      registeredUsers: users.length,
      activeSessions: userSessions.size
    },
    timestamp: new Date().toISOString()
  });
});

export default router;