// Ollama Local AI Integration Service
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaModelInfo {
  modelfile: string;
  parameters: string;
  template: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    seed?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    seed?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface ModelDownloadProgress {
  status: 'downloading' | 'verifying' | 'writing' | 'success' | 'error';
  digest: string;
  total: number;
  completed: number;
  percent: number;
}

class OllamaService {
  private baseURL: string;
  private healthCheckInterval?: NodeJS.Timeout;
  private isHealthy = false;

  constructor(baseURL: string = 'http://localhost:11434') {
    this.baseURL = baseURL;
    this.startHealthCheck();
  }

  // Health check to ensure Ollama is running
  private async startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(`${this.baseURL}/api/version`);
        this.isHealthy = response.ok;
      } catch {
        this.isHealthy = false;
      }
    }, 30000); // Check every 30 seconds

    // Initial health check
    try {
      const response = await fetch(`${this.baseURL}/api/version`);
      this.isHealthy = response.ok;
    } catch {
      this.isHealthy = false;
    }
  }

  // Check if Ollama service is available
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/version`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get Ollama version information
  async getVersion(): Promise<{ version: string } | null> {
    try {
      const response = await fetch(`${this.baseURL}/api/version`);
      if (!response.ok) return null;
      return await response.json() as { version: string };
    } catch {
      return null;
    }
  }

  // List available models
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      if (!response.ok) throw new Error('Failed to fetch models');
      
      const data = await response.json() as any;
      return data.models || [];
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      return [];
    }
  }

  // Get model information
  async getModelInfo(modelName: string): Promise<OllamaModelInfo | null> {
    try {
      const response = await fetch(`${this.baseURL}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });
      
      if (!response.ok) return null;
      return await response.json() as OllamaModelInfo;
    } catch (error) {
      console.error('Error getting model info:', error);
      return null;
    }
  }

  // Download a model
  async downloadModel(modelName: string, onProgress?: (progress: ModelDownloadProgress) => void): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true })
      });

      if (!response.ok) throw new Error('Failed to start model download');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const progress = JSON.parse(line);
              if (onProgress && progress.status) {
                const progressData: ModelDownloadProgress = {
                  status: progress.status,
                  digest: progress.digest || '',
                  total: progress.total || 0,
                  completed: progress.completed || 0,
                  percent: progress.total ? (progress.completed / progress.total) * 100 : 0
                };
                onProgress(progressData);
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error downloading model:', error);
      return false;
    }
  }

  // Delete a model
  async deleteModel(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting model:', error);
      return false;
    }
  }

  // Generate text completion
  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse | null> {
    try {
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: false })
      });

      if (!response.ok) throw new Error('Failed to generate response');
      return await response.json() as OllamaGenerateResponse;
    } catch (error) {
      console.error('Error generating with Ollama:', error);
      return null;
    }
  }

  // Chat with model
  async chat(request: OllamaChatRequest): Promise<OllamaGenerateResponse | null> {
    try {
      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: false })
      });

      if (!response.ok) throw new Error('Failed to chat with model');
      return await response.json() as OllamaGenerateResponse;
    } catch (error) {
      console.error('Error chatting with Ollama:', error);
      return null;
    }
  }

  // Stream generate text
  async *generateStream(request: OllamaGenerateRequest): AsyncGenerator<OllamaGenerateResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: true })
      });

      if (!response.ok) throw new Error('Failed to start stream');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line);
              yield chunk;
              if (chunk.done) return;
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming from Ollama:', error);
    }
  }

  // Stream chat
  async *chatStream(request: OllamaChatRequest): AsyncGenerator<OllamaGenerateResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: true })
      });

      if (!response.ok) throw new Error('Failed to start chat stream');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line);
              yield chunk;
              if (chunk.done) return;
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming chat from Ollama:', error);
    }
  }

  // Generate embeddings
  async generateEmbeddings(model: string, prompt: string): Promise<number[] | null> {
    try {
      const response = await fetch(`${this.baseURL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt })
      });

      if (!response.ok) throw new Error('Failed to generate embeddings');
      
      const data = await response.json() as any;
      return data.embedding || null;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      return null;
    }
  }

  // Get recommended models for different use cases
  getRecommendedModels() {
    return {
      chat: [
        { name: 'llama2:7b', description: 'Fast and efficient for chat', size: '3.8GB' },
        { name: 'llama2:13b', description: 'Better quality responses', size: '7.3GB' },
        { name: 'mistral:7b', description: 'High quality instruction following', size: '4.1GB' },
        { name: 'neural-chat:7b', description: 'Optimized for conversations', size: '4.1GB' }
      ],
      code: [
        { name: 'codellama:7b', description: 'Code generation and completion', size: '3.8GB' },
        { name: 'codellama:13b', description: 'Advanced code assistance', size: '7.3GB' },
        { name: 'deepseek-coder:6.7b', description: 'Specialized coding model', size: '3.8GB' }
      ],
      analysis: [
        { name: 'llama2:70b', description: 'Best quality for analysis (requires GPU)', size: '39GB' },
        { name: 'mistral:7b', description: 'Good balance of speed and quality', size: '4.1GB' },
        { name: 'dolphin-phi:2.7b', description: 'Fast analysis for simple tasks', size: '1.6GB' }
      ],
      embedding: [
        { name: 'nomic-embed-text', description: 'High-quality text embeddings', size: '274MB' },
        { name: 'all-minilm', description: 'Fast embedding generation', size: '45MB' }
      ]
    };
  }

  // Check system requirements for models
  checkSystemRequirements(modelName: string) {
    const requirements = {
      'llama2:7b': { ram: '8GB', vram: '4GB', disk: '4GB' },
      'llama2:13b': { ram: '16GB', vram: '8GB', disk: '8GB' },
      'llama2:70b': { ram: '64GB', vram: '40GB', disk: '40GB' },
      'mistral:7b': { ram: '8GB', vram: '4GB', disk: '4GB' },
      'codellama:7b': { ram: '8GB', vram: '4GB', disk: '4GB' },
      'codellama:13b': { ram: '16GB', vram: '8GB', disk: '8GB' },
      'neural-chat:7b': { ram: '8GB', vram: '4GB', disk: '4GB' },
      'dolphin-phi:2.7b': { ram: '4GB', vram: '2GB', disk: '2GB' }
    };

    return requirements[modelName as keyof typeof requirements] || { 
      ram: '8GB', 
      vram: '4GB', 
      disk: '4GB' 
    };
  }

  // Get model performance metrics
  async benchmarkModel(modelName: string): Promise<{
    latency: number;
    throughput: number;
    memoryUsage: number;
  } | null> {
    try {
      const testPrompt = "Hello, how are you today?";
      const startTime = Date.now();
      
      const response = await this.generate({
        model: modelName,
        prompt: testPrompt,
        options: { num_predict: 50 }
      });

      if (!response) return null;

      const endTime = Date.now();
      const latency = endTime - startTime;
      const tokensGenerated = response.eval_count || 50;
      const throughput = tokensGenerated / (latency / 1000); // tokens per second

      return {
        latency,
        throughput,
        memoryUsage: 0 // Would need system integration to get actual memory usage
      };
    } catch (error) {
      console.error('Error benchmarking model:', error);
      return null;
    }
  }

  // Cleanup
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export const ollamaService = new OllamaService();