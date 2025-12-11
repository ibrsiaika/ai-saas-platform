import express from 'express';
import rateLimit from 'express-rate-limit';
import { AIService } from '../services/aiService';
import { AIRequest, ChatMessage } from '../../../shared/types';

const router = express.Router();

// Rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many AI requests from this IP, please try again later.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      type: 'rate_limit_error'
    }
  }
});

// Apply rate limiting to all AI routes
router.use(aiRateLimit);

/**
 * @route POST /api/ai/generate
 * @desc Generate AI content based on prompt and type
 * @access Public (will add auth later)
 */
router.post('/generate', async (req, res) => {
  try {
    const aiRequest: AIRequest = req.body;

    // Validate request
    const validation = AIService.validateRequest(aiRequest);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters',
        errors: validation.errors
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI service is not configured',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          type: 'configuration_error'
        }
      });
    }

    // Generate AI content
    const result = await AIService.generateContent(aiRequest);

    // Log usage for analytics (in production, store in database)
    console.log(`AI Generation - Type: ${aiRequest.type}, Tokens: ${result.usage?.totalTokens || 0}`);

    res.json(result);

  } catch (error: any) {
    console.error('AI Generation Route Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during AI generation',
      error: {
        code: 'INTERNAL_ERROR',
        type: 'server_error'
      }
    });
  }
});

/**
 * @route POST /api/ai/chat
 * @desc Process chat conversation with AI
 * @access Public (will add auth later)
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, options } = req.body;

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Messages array is required and cannot be empty'
      });
    }

    // Validate message format
    const invalidMessages = messages.filter((msg: any) => 
      !msg.role || !msg.content || !['user', 'assistant', 'system'].includes(msg.role)
    );

    if (invalidMessages.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message format. Each message must have role and content fields.'
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI service is not configured',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          type: 'configuration_error'
        }
      });
    }

    // Process chat
    const result = await AIService.processChat(messages as ChatMessage[], options);

    // Log usage for analytics
    console.log(`AI Chat - Messages: ${messages.length}, Tokens: ${result.usage?.totalTokens || 0}`);

    res.json(result);

  } catch (error: any) {
    console.error('AI Chat Route Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during chat processing',
      error: {
        code: 'INTERNAL_ERROR',
        type: 'server_error'
      }
    });
  }
});

/**
 * @route POST /api/ai/embeddings
 * @desc Generate embeddings for text content
 * @access Public (will add auth later)
 */
router.post('/embeddings', async (req, res) => {
  try {
    const { text } = req.body;

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text is required and must be a non-empty string'
      });
    }

    if (text.length > 8000) {
      return res.status(400).json({
        success: false,
        message: 'Text cannot exceed 8000 characters for embeddings'
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI service is not configured',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          type: 'configuration_error'
        }
      });
    }

    // Generate embeddings
    const embeddings = await AIService.generateEmbeddings(text);

    res.json({
      success: true,
      embeddings,
      dimensions: embeddings.length,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Embeddings Route Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during embeddings generation',
      error: {
        code: 'INTERNAL_ERROR',
        type: 'server_error',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/ai/models
 * @desc Get available AI models and their capabilities
 * @access Public
 */
router.get('/models', (req, res) => {
  const models = [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      description: 'Most capable model, best for complex tasks',
      maxTokens: 8192,
      features: ['chat', 'content', 'code', 'business'],
      pricing: 'premium'
    },
    {
      id: 'gpt-4-turbo-preview',
      name: 'GPT-4 Turbo',
      description: 'Faster GPT-4 with updated knowledge',
      maxTokens: 128000,
      features: ['chat', 'content', 'code', 'business'],
      pricing: 'premium'
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'Fast and efficient for most tasks',
      maxTokens: 4096,
      features: ['chat', 'content', 'code'],
      pricing: 'standard'
    }
  ];

  res.json({
    success: true,
    models,
    timestamp: new Date().toISOString()
  });
});

/**
 * @route GET /api/ai/health
 * @desc Check AI service health and configuration
 * @access Public
 */
router.get('/health', (req, res) => {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasPineconeKey = !!process.env.PINECONE_API_KEY;

  res.json({
    success: true,
    status: 'healthy',
    services: {
      openai: {
        configured: hasOpenAIKey,
        status: hasOpenAIKey ? 'ready' : 'not_configured'
      },
      pinecone: {
        configured: hasPineconeKey,
        status: hasPineconeKey ? 'ready' : 'not_configured'
      },
      embeddings: {
        configured: hasOpenAIKey,
        status: hasOpenAIKey ? 'ready' : 'not_configured'
      }
    },
    timestamp: new Date().toISOString()
  });
});

export default router;