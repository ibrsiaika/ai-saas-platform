import express from 'express';
import rateLimit from 'express-rate-limit';
import { VectorService } from '../services/vectorService';
import { DocumentChunk } from '../../../shared/types';

const router = express.Router();

// Rate limiting for vector operations
const vectorRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    success: false,
    message: 'Too many vector requests from this IP, please try again later.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      type: 'rate_limit_error'
    }
  }
});

// Apply rate limiting to all vector routes
router.use(vectorRateLimit);

/**
 * @route POST /api/vectors/store
 * @desc Store documents in vector database
 * @access Public (will add auth later)
 */
router.post('/store', async (req, res) => {
  try {
    const { documents } = req.body;

    // Validate input
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Documents array is required and cannot be empty'
      });
    }

    // Validate document format
    const invalidDocs = documents.filter((doc: any) => 
      !doc.id || !doc.content || typeof doc.content !== 'string'
    );

    if (invalidDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document format. Each document must have id and content fields.'
      });
    }

    // Check if vector service is configured
    if (!VectorService.isConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Vector database is not configured',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          type: 'configuration_error'
        }
      });
    }

    // Store documents
    await VectorService.storeDocuments(documents as DocumentChunk[]);

    res.json({
      success: true,
      message: `Successfully stored ${documents.length} documents`,
      documentsCount: documents.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Document Storage Route Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during document storage',
      error: {
        code: 'INTERNAL_ERROR',
        type: 'server_error',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/vectors/search
 * @desc Search for similar documents
 * @access Public (will add auth later)
 */
router.post('/search', async (req, res) => {
  try {
    const { query, topK, userId, type } = req.body;

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be a non-empty string'
      });
    }

    if (topK && (typeof topK !== 'number' || topK < 1 || topK > 50)) {
      return res.status(400).json({
        success: false,
        message: 'topK must be a number between 1 and 50'
      });
    }

    // Check if vector service is configured
    if (!VectorService.isConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Vector database is not configured',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          type: 'configuration_error'
        }
      });
    }

    // Perform vector search
    const results = await VectorService.searchSimilar(query, {
      topK: topK || 5,
      userId,
      type,
      includeMetadata: true
    });

    res.json({
      success: true,
      query,
      results,
      resultsCount: results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Vector Search Route Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during vector search',
      error: {
        code: 'INTERNAL_ERROR',
        type: 'server_error',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/vectors/rag
 * @desc Perform RAG (Retrieval Augmented Generation)
 * @access Public (will add auth later)
 */
router.post('/rag', async (req, res) => {
  try {
    const { query, maxContextLength, topK, userId, model } = req.body;

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be a non-empty string'
      });
    }

    if (maxContextLength && (typeof maxContextLength !== 'number' || maxContextLength < 100 || maxContextLength > 8000)) {
      return res.status(400).json({
        success: false,
        message: 'maxContextLength must be a number between 100 and 8000'
      });
    }

    if (topK && (typeof topK !== 'number' || topK < 1 || topK > 20)) {
      return res.status(400).json({
        success: false,
        message: 'topK must be a number between 1 and 20'
      });
    }

    // Check if services are configured
    if (!VectorService.isConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Vector database is not configured',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          type: 'configuration_error'
        }
      });
    }

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

    // Perform RAG
    const result = await VectorService.performRAG(query, {
      maxContextLength: maxContextLength || 4000,
      topK: topK || 5,
      userId,
      model: model || 'gpt-4'
    });

    // Log usage for analytics
    console.log(`RAG Query - Sources: ${result.sources.length}, Tokens: ${result.usage?.totalTokens || 0}`);

    res.json({
      success: true,
      query,
      answer: result.answer,
      sources: result.sources,
      usage: result.usage,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('RAG Route Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during RAG operation',
      error: {
        code: 'INTERNAL_ERROR',
        type: 'server_error',
        details: error.message
      }
    });
  }
});

/**
 * @route DELETE /api/vectors/documents
 * @desc Delete documents from vector database
 * @access Public (will add auth later)
 */
router.delete('/documents', async (req, res) => {
  try {
    const { documentIds } = req.body;

    // Validate input
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'documentIds array is required and cannot be empty'
      });
    }

    // Check if vector service is configured
    if (!VectorService.isConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Vector database is not configured',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          type: 'configuration_error'
        }
      });
    }

    // Delete documents
    await VectorService.deleteDocuments(documentIds);

    res.json({
      success: true,
      message: `Successfully deleted ${documentIds.length} documents`,
      deletedCount: documentIds.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Document Deletion Route Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during document deletion',
      error: {
        code: 'INTERNAL_ERROR',
        type: 'server_error',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/vectors/stats
 * @desc Get vector database statistics
 * @access Public (will add auth later)
 */
router.get('/stats', async (req, res) => {
  try {
    // Check if vector service is configured
    if (!VectorService.isConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Vector database is not configured',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          type: 'configuration_error'
        }
      });
    }

    // Get index statistics
    const stats = await VectorService.getIndexStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Vector Stats Route Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving statistics',
      error: {
        code: 'INTERNAL_ERROR',
        type: 'server_error',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/vectors/health
 * @desc Check vector database health
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const health = await VectorService.getHealthStatus();

    res.json({
      success: true,
      health,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Vector Health Route Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during health check',
      error: {
        code: 'INTERNAL_ERROR',
        type: 'server_error',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/vectors/initialize
 * @desc Initialize vector database index
 * @access Public (will add auth later)
 */
router.post('/initialize', async (req, res) => {
  try {
    // Check if vector service is configured
    if (!VectorService.isConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Vector database is not configured',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          type: 'configuration_error'
        }
      });
    }

    // Initialize index
    await VectorService.initializeIndex();

    res.json({
      success: true,
      message: 'Vector database index initialized successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Vector Initialize Route Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during initialization',
      error: {
        code: 'INTERNAL_ERROR',
        type: 'server_error',
        details: error.message
      }
    });
  }
});

export default router;