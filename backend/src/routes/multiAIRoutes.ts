import express from 'express';
import { multiAIManager } from '../services/multiAI';
import { authMiddleware } from '../middleware/authMiddleware';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per windowMs
  message: 'Too many AI requests, please try again later.'
});

// Chat endpoint with multi-AI support
router.post('/chat', authMiddleware, aiRateLimit, async (req, res) => {
  try {
    const { 
      message, 
      conversation = [], 
      provider, 
      model, 
      costPriority = 'balanced',
      temperature = 0.7,
      maxTokens = 1000 
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build messages array
    const messages = [
      { role: 'system' as const, content: 'You are a helpful AI assistant.' },
      ...conversation,
      { role: 'user' as const, content: message }
    ];

    // Use multi-AI manager for enhanced capabilities
    const response = await multiAIManager.generateResponse({
      messages,
      provider,
      model,
      costPriority,
      temperature,
      maxTokens
    });

    res.json({
      response: response.content,
      provider: response.provider,
      model: response.model,
      usage: response.usage,
      responseTime: response.responseTime
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available AI providers
router.get('/providers', authMiddleware, async (req, res) => {
  try {
    const providers = multiAIManager.getProviderStatus();
    res.json(providers);
  } catch (error) {
    console.error('Providers error:', error);
    res.status(500).json({ error: 'Failed to get providers' });
  }
});

// Estimate costs for different providers
router.post('/estimate-cost', authMiddleware, async (req, res) => {
  try {
    const { message, conversation = [], maxTokens = 1000 } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messages = [
      { role: 'system' as const, content: 'You are a helpful AI assistant.' },
      ...conversation,
      { role: 'user' as const, content: message }
    ];

    const estimates = multiAIManager.estimateCost({
      messages,
      maxTokens
    });

    res.json(estimates);
  } catch (error) {
    console.error('Cost estimation error:', error);
    res.status(500).json({ error: 'Failed to estimate costs' });
  }
});

// Stream chat endpoint for real-time responses
router.post('/chat/stream', authMiddleware, aiRateLimit, async (req, res) => {
  try {
    const { 
      message, 
      conversation = [], 
      provider, 
      model, 
      costPriority = 'balanced',
      temperature = 0.7,
      maxTokens = 1000 
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const messages = [
      { role: 'system' as const, content: 'You are a helpful AI assistant.' },
      ...conversation,
      { role: 'user' as const, content: message }
    ];

    try {
      const response = await multiAIManager.generateResponse({
        messages,
        provider,
        model,
        costPriority,
        temperature,
        maxTokens,
        stream: true
      });

      // Send the complete response
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        content: response.content,
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        responseTime: response.responseTime
      })}\n\n`);

      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('Stream chat error:', error);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

// Batch processing endpoint
router.post('/batch', authMiddleware, async (req, res) => {
  try {
    const { requests } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: 'Requests array is required' });
    }

    if (requests.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 requests per batch' });
    }

    const results = await Promise.allSettled(
      requests.map(async (request: any) => {
        const messages = [
          { role: 'system' as const, content: 'You are a helpful AI assistant.' },
          ...(request.conversation || []),
          { role: 'user' as const, content: request.message }
        ];

        return multiAIManager.generateResponse({
          messages,
          provider: request.provider,
          model: request.model,
          costPriority: request.costPriority || 'balanced',
          temperature: request.temperature || 0.7,
          maxTokens: request.maxTokens || 1000
        });
      })
    );

    const responses = results.map((result, index) => ({
      index,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason?.message : null
    }));

    res.json({ responses });

  } catch (error) {
    console.error('Batch processing error:', error);
    res.status(500).json({ error: 'Failed to process batch' });
  }
});

// Health check for AI services
router.get('/health', async (req, res) => {
  try {
    const providers = multiAIManager.getProviderStatus();
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      providers: providers.map(p => ({
        name: p.provider,
        available: p.available,
        models: p.config.models.length
      }))
    };

    res.json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;