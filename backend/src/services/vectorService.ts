import { Pinecone } from '@pinecone-database/pinecone';
import { AIService } from './aiService';
import { VectorSearchResult, DocumentChunk } from '../../../shared/types';

// Lazy-loaded Pinecone client
let pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('Pinecone API key is not configured');
    }
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeClient;
}

export class VectorService {
  private static readonly INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'ai-saas-embeddings';
  private static readonly VECTOR_DIMENSION = 1536; // OpenAI embedding dimension
  private static readonly TOP_K = 5; // Default number of results to return

  /**
   * Initialize Pinecone index if it doesn't exist
   */
  static async initializeIndex(): Promise<void> {
    try {
      const pinecone = getPineconeClient();
      
      // Check if index exists
      const indexList = await pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(index => index.name === this.INDEX_NAME);

      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.INDEX_NAME}`);
        
        await pinecone.createIndex({
          name: this.INDEX_NAME,
          dimension: this.VECTOR_DIMENSION,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });

        // Wait for index to be ready
        console.log('Waiting for index to be ready...');
        await this.waitForIndexReady();
      }

      console.log(`Pinecone index ${this.INDEX_NAME} is ready`);
    } catch (error: any) {
      console.error('Failed to initialize Pinecone index:', error);
      throw new Error(`Vector database initialization failed: ${error.message}`);
    }
  }

  /**
   * Wait for index to be ready
   */
  private static async waitForIndexReady(): Promise<void> {
    const pinecone = getPineconeClient();
    const maxAttempts = 60; // 5 minutes
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const indexDescription = await pinecone.describeIndex(this.INDEX_NAME);
        if (indexDescription.status?.ready) {
          return;
        }
      } catch (error) {
        // Index might not be ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }
    
    throw new Error('Index creation timeout');
  }

  /**
   * Store document chunks in vector database
   */
  static async storeDocuments(documents: DocumentChunk[]): Promise<void> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(this.INDEX_NAME);

      // Generate embeddings for each document
      const vectors = await Promise.all(
        documents.map(async (doc) => {
          const embedding = await AIService.generateEmbeddings(doc.content);
          
          return {
            id: doc.id,
            values: embedding,
            metadata: {
              content: doc.content,
              source: doc.source || 'unknown',
              type: doc.type || 'text',
              timestamp: new Date().toISOString(),
              userId: doc.userId || 'system',
              tags: doc.tags || []
            }
          };
        })
      );

      // Upsert vectors in batches
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.upsert(batch);
      }

      console.log(`Stored ${vectors.length} document chunks in vector database`);
    } catch (error: any) {
      console.error('Failed to store documents:', error);
      throw new Error(`Document storage failed: ${error.message}`);
    }
  }

  /**
   * Search for similar documents using vector similarity
   */
  static async searchSimilar(
    query: string,
    options: {
      topK?: number;
      userId?: string;
      type?: string;
      includeMetadata?: boolean;
    } = {}
  ): Promise<VectorSearchResult[]> {
    try {
      const {
        topK = this.TOP_K,
        userId,
        type,
        includeMetadata = true
      } = options;

      // Generate embedding for the query
      const queryEmbedding = await AIService.generateEmbeddings(query);

      const pinecone = getPineconeClient();
      const index = pinecone.index(this.INDEX_NAME);

      // Build filter for metadata
      const filter: any = {};
      if (userId) filter.userId = userId;
      if (type) filter.type = type;

      // Perform vector search
      const searchResponse = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });

      // Format results
      const results: VectorSearchResult[] = searchResponse.matches?.map(match => ({
        id: match.id || '',
        score: match.score || 0,
        content: match.metadata?.content as string || '',
        source: match.metadata?.source as string || 'unknown',
        type: match.metadata?.type as string || 'text',
        metadata: match.metadata || {}
      })) || [];

      return results;
    } catch (error: any) {
      console.error('Vector search failed:', error);
      throw new Error(`Vector search failed: ${error.message}`);
    }
  }

  /**
   * Perform RAG (Retrieval Augmented Generation)
   */
  static async performRAG(
    query: string,
    options: {
      maxContextLength?: number;
      topK?: number;
      userId?: string;
      model?: string;
    } = {}
  ): Promise<{
    answer: string;
    sources: VectorSearchResult[];
    usage?: any;
  }> {
    try {
      const {
        maxContextLength = 4000,
        topK = 5,
        userId,
        model = 'gpt-4'
      } = options;

      // Search for relevant documents
      const searchResults = await this.searchSimilar(query, {
        topK,
        userId,
        includeMetadata: true
      });

      if (searchResults.length === 0) {
        throw new Error('No relevant documents found for the query');
      }

      // Build context from search results
      let context = '';
      let contextLength = 0;

      for (const result of searchResults) {
        const addition = `Source: ${result.source}\nContent: ${result.content}\n\n`;
        if (contextLength + addition.length > maxContextLength) {
          break;
        }
        context += addition;
        contextLength += addition.length;
      }

      // Generate response using retrieved context
      const ragPrompt = `You are a helpful AI assistant. Answer the user's question based on the provided context. If the context doesn't contain relevant information, acknowledge this limitation.

Context:
${context}

User Question: ${query}

Please provide a comprehensive answer based on the context above:`;

      const aiResponse = await AIService.generateContent({
        prompt: ragPrompt,
        type: 'content',
        options: {
          model,
          maxTokens: 1000,
          temperature: 0.7
        }
      });

      if (!aiResponse.success) {
        throw new Error(aiResponse.error?.message || 'AI generation failed');
      }

      return {
        answer: aiResponse.content,
        sources: searchResults,
        usage: aiResponse.usage
      };

    } catch (error: any) {
      console.error('RAG operation failed:', error);
      throw new Error(`RAG operation failed: ${error.message}`);
    }
  }

  /**
   * Delete documents by IDs
   */
  static async deleteDocuments(documentIds: string[]): Promise<void> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(this.INDEX_NAME);

      await index.deleteMany(documentIds);
      console.log(`Deleted ${documentIds.length} documents from vector database`);
    } catch (error: any) {
      console.error('Failed to delete documents:', error);
      throw new Error(`Document deletion failed: ${error.message}`);
    }
  }

  /**
   * Get index statistics
   */
  static async getIndexStats(): Promise<any> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(this.INDEX_NAME);

      const stats = await index.describeIndexStats();
      return stats;
    } catch (error: any) {
      console.error('Failed to get index stats:', error);
      throw new Error(`Failed to get index statistics: ${error.message}`);
    }
  }

  /**
   * Check if vector service is properly configured
   */
  static isConfigured(): boolean {
    return !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME);
  }

  /**
   * Get service health status
   */
  static async getHealthStatus(): Promise<{
    configured: boolean;
    indexExists: boolean;
    indexReady: boolean;
    stats?: any;
  }> {
    try {
      const configured = this.isConfigured();
      if (!configured) {
        return {
          configured: false,
          indexExists: false,
          indexReady: false
        };
      }

      const pinecone = getPineconeClient();
      
      // Check if index exists
      const indexList = await pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(index => index.name === this.INDEX_NAME) || false;

      if (!indexExists) {
        return {
          configured: true,
          indexExists: false,
          indexReady: false
        };
      }

      // Check if index is ready
      const indexDescription = await pinecone.describeIndex(this.INDEX_NAME);
      const indexReady = indexDescription.status?.ready || false;

      const stats = indexReady ? await this.getIndexStats() : undefined;

      return {
        configured: true,
        indexExists: true,
        indexReady,
        stats
      };

    } catch (error: any) {
      console.error('Health check failed:', error);
      return {
        configured: this.isConfigured(),
        indexExists: false,
        indexReady: false
      };
    }
  }
}

export default VectorService;