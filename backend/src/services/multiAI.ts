// Multi-AI Provider Integration System
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

// AI Provider Types
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'ollama' | 'huggingface' | 'cohere' | 'custom';

export interface AIProviderConfig {
  name: string;
  apiKey?: string;
  baseURL?: string;
  models: string[];
  pricing: {
    inputTokens: number;  // Cost per 1M input tokens
    outputTokens: number; // Cost per 1M output tokens
  };
  capabilities: {
    chat: boolean;
    completion: boolean;
    embeddings: boolean;
    vision: boolean;
    functionCalling: boolean;
    streaming: boolean;
  };
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface AIRequest {
  provider?: AIProvider;
  model?: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  functions?: any[];
  costPriority?: 'lowest' | 'balanced' | 'performance';
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
  responseTime: number;
}

class MultiAIManager {
  private providers: Map<AIProvider, AIProviderConfig> = new Map();
  private clients: Map<AIProvider, any> = new Map();
  private fallbackOrder: AIProvider[] = ['openai', 'anthropic', 'google', 'ollama'];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // OpenAI Configuration
    this.providers.set('openai', {
      name: 'OpenAI',
      apiKey: process.env.OPENAI_API_KEY,
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4-vision'],
      pricing: {
        inputTokens: 10.00,   // $10 per 1M input tokens for GPT-4
        outputTokens: 30.00   // $30 per 1M output tokens for GPT-4
      },
      capabilities: {
        chat: true,
        completion: true,
        embeddings: true,
        vision: true,
        functionCalling: true,
        streaming: true
      },
      rateLimits: {
        requestsPerMinute: 500,
        tokensPerMinute: 80000
      }
    });

    // Anthropic Configuration
    this.providers.set('anthropic', {
      name: 'Anthropic Claude',
      apiKey: process.env.ANTHROPIC_API_KEY,
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      pricing: {
        inputTokens: 15.00,   // $15 per 1M input tokens for Claude-3 Opus
        outputTokens: 75.00   // $75 per 1M output tokens for Claude-3 Opus
      },
      capabilities: {
        chat: true,
        completion: true,
        embeddings: false,
        vision: true,
        functionCalling: true,
        streaming: true
      },
      rateLimits: {
        requestsPerMinute: 1000,
        tokensPerMinute: 200000
      }
    });

    // Google AI Configuration
    this.providers.set('google', {
      name: 'Google Gemini',
      apiKey: process.env.GOOGLE_AI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1',
      models: ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'],
      pricing: {
        inputTokens: 0.50,    // $0.50 per 1M input tokens for Gemini Pro
        outputTokens: 1.50    // $1.50 per 1M output tokens for Gemini Pro
      },
      capabilities: {
        chat: true,
        completion: true,
        embeddings: true,
        vision: true,
        functionCalling: true,
        streaming: true
      },
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 32000
      }
    });

    // Ollama (Local AI) Configuration
    this.providers.set('ollama', {
      name: 'Ollama Local',
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      models: ['llama2', 'codellama', 'mistral', 'neural-chat', 'dolphin-phi'],
      pricing: {
        inputTokens: 0.00,    // Free for local models
        outputTokens: 0.00
      },
      capabilities: {
        chat: true,
        completion: true,
        embeddings: true,
        vision: false,
        functionCalling: false,
        streaming: true
      },
      rateLimits: {
        requestsPerMinute: 1000,
        tokensPerMinute: 50000
      }
    });

    // Hugging Face Configuration
    this.providers.set('huggingface', {
      name: 'Hugging Face',
      apiKey: process.env.HUGGINGFACE_API_KEY,
      baseURL: 'https://api-inference.huggingface.co',
      models: ['microsoft/DialoGPT-large', 'facebook/blenderbot-400M-distill', 'EleutherAI/gpt-j-6B'],
      pricing: {
        inputTokens: 0.02,    // $0.02 per 1M input tokens
        outputTokens: 0.02    // $0.02 per 1M output tokens
      },
      capabilities: {
        chat: true,
        completion: true,
        embeddings: true,
        vision: false,
        functionCalling: false,
        streaming: false
      },
      rateLimits: {
        requestsPerMinute: 1000,
        tokensPerMinute: 100000
      }
    });

    this.initializeClients();
  }

  private initializeClients() {
    // Initialize OpenAI client
    if (this.providers.get('openai')?.apiKey) {
      this.clients.set('openai', new OpenAI({
        apiKey: this.providers.get('openai')!.apiKey
      }));
    }

    // Initialize Anthropic client
    if (this.providers.get('anthropic')?.apiKey) {
      this.clients.set('anthropic', new Anthropic({
        apiKey: this.providers.get('anthropic')!.apiKey
      }));
    }

    // Initialize Google client (custom implementation)
    if (this.providers.get('google')?.apiKey) {
      this.clients.set('google', {
        apiKey: this.providers.get('google')!.apiKey,
        baseURL: this.providers.get('google')!.baseURL
      });
    }

    // Initialize Ollama client
    this.clients.set('ollama', {
      baseURL: this.providers.get('ollama')!.baseURL
    });
  }

  // Intelligent provider selection based on cost, performance, and availability
  private selectOptimalProvider(request: AIRequest): { provider: AIProvider; model: string } {
    const availableProviders = Array.from(this.providers.keys()).filter(provider => {
      const config = this.providers.get(provider)!;
      return this.clients.has(provider) && config.models.length > 0;
    });

    if (request.provider && availableProviders.includes(request.provider)) {
      const config = this.providers.get(request.provider)!;
      const model = request.model || config.models[0];
      return { provider: request.provider, model };
    }

    // Sort providers by cost-effectiveness
    const sortedProviders = availableProviders.sort((a, b) => {
      const configA = this.providers.get(a)!;
      const configB = this.providers.get(b)!;
      
      if (request.costPriority === 'lowest') {
        const costA = configA.pricing.inputTokens + configA.pricing.outputTokens;
        const costB = configB.pricing.inputTokens + configB.pricing.outputTokens;
        return costA - costB;
      }
      
      if (request.costPriority === 'performance') {
        // Prefer OpenAI for performance
        if (a === 'openai') return -1;
        if (b === 'openai') return 1;
        return 0;
      }
      
      // Balanced approach - consider both cost and performance
      const scoreA = this.calculateProviderScore(a);
      const scoreB = this.calculateProviderScore(b);
      return scoreB - scoreA;
    });

    const selectedProvider = sortedProviders[0];
    const config = this.providers.get(selectedProvider)!;
    const model = request.model || config.models[0];

    return { provider: selectedProvider, model };
  }

  private calculateProviderScore(provider: AIProvider): number {
    const config = this.providers.get(provider)!;
    const avgCost = (config.pricing.inputTokens + config.pricing.outputTokens) / 2;
    
    // Score based on capabilities and cost (lower cost = higher score)
    let score = 100;
    
    // Reduce score for higher costs
    score -= avgCost * 2;
    
    // Increase score for capabilities
    if (config.capabilities.functionCalling) score += 10;
    if (config.capabilities.vision) score += 10;
    if (config.capabilities.streaming) score += 5;
    
    // Bonus for local models (zero cost)
    if (provider === 'ollama') score += 50;
    
    return score;
  }

  // Generate AI response with automatic fallback
  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    const { provider, model } = this.selectOptimalProvider(request);
    const providersToTry = [provider, ...this.fallbackOrder.filter(p => p !== provider)];

    for (const currentProvider of providersToTry) {
      try {
        if (!this.clients.has(currentProvider)) continue;

        const response = await this.callProvider(currentProvider, model, request);
        const responseTime = Date.now() - startTime;

        return {
          ...response,
          provider: currentProvider,
          model,
          responseTime
        };
      } catch (error) {
        console.warn(`Provider ${currentProvider} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
  }

  private async callProvider(provider: AIProvider, model: string, request: AIRequest): Promise<Omit<AIResponse, 'provider' | 'model' | 'responseTime'>> {
    switch (provider) {
      case 'openai':
        return this.callOpenAI(model, request);
      case 'anthropic':
        return this.callAnthropic(model, request);
      case 'google':
        return this.callGoogle(model, request);
      case 'ollama':
        return this.callOllama(model, request);
      case 'huggingface':
        return this.callHuggingFace(model, request);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async callOpenAI(model: string, request: AIRequest): Promise<Omit<AIResponse, 'provider' | 'model' | 'responseTime'>> {
    const client = this.clients.get('openai') as OpenAI;
    const config = this.providers.get('openai')!;

    const response = await client.chat.completions.create({
      model,
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: false
    });

    const usage = response.usage!;
    const totalCost = (usage.prompt_tokens * config.pricing.inputTokens + 
                      usage.completion_tokens * config.pricing.outputTokens) / 1000000;

    return {
      content: response.choices[0].message.content || '',
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalCost
      }
    };
  }

  private async callAnthropic(model: string, request: AIRequest): Promise<Omit<AIResponse, 'provider' | 'model' | 'responseTime'>> {
    const client = this.clients.get('anthropic') as any;
    const config = this.providers.get('anthropic')!;

    const response = await client.messages.create({
      model,
      max_tokens: request.maxTokens || 1000,
      messages: request.messages.filter(m => m.role !== 'system'),
      system: request.messages.find(m => m.role === 'system')?.content
    });

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const totalCost = (inputTokens * config.pricing.inputTokens + 
                      outputTokens * config.pricing.outputTokens) / 1000000;

    return {
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      usage: {
        inputTokens,
        outputTokens,
        totalCost
      }
    };
  }

  private async callGoogle(model: string, request: AIRequest): Promise<Omit<AIResponse, 'provider' | 'model' | 'responseTime'>> {
    const client = this.clients.get('google');
    const config = this.providers.get('google')!;

    const response = await fetch(`${client.baseURL}/models/${model}:generateContent?key=${client.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: request.messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens
        }
      })
    });

    const data = await response.json() as any;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Estimate token usage (Google doesn't always provide exact counts)
    const inputTokens = Math.ceil(request.messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
    const outputTokens = Math.ceil(content.length / 4);
    const totalCost = (inputTokens * config.pricing.inputTokens + 
                      outputTokens * config.pricing.outputTokens) / 1000000;

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        totalCost
      }
    };
  }

  private async callOllama(model: string, request: AIRequest): Promise<Omit<AIResponse, 'provider' | 'model' | 'responseTime'>> {
    const client = this.clients.get('ollama');
    
    const response = await fetch(`${client.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens
        }
      })
    });

    const data = await response.json() as any;
    const content = data.message?.content || '';
    
    // Ollama is free, so no cost calculation needed
    const inputTokens = Math.ceil(request.messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
    const outputTokens = Math.ceil(content.length / 4);

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        totalCost: 0 // Local models are free
      }
    };
  }

  private async callHuggingFace(model: string, request: AIRequest): Promise<Omit<AIResponse, 'provider' | 'model' | 'responseTime'>> {
    const client = this.clients.get('huggingface');
    const config = this.providers.get('huggingface')!;

    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: request.messages.map(m => m.content).join('\n'),
        parameters: {
          temperature: request.temperature,
          max_new_tokens: request.maxTokens
        }
      })
    });

    const data = await response.json() as any;
    const content = Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';
    
    const inputTokens = Math.ceil(request.messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
    const outputTokens = Math.ceil(content.length / 4);
    const totalCost = (inputTokens * config.pricing.inputTokens + 
                      outputTokens * config.pricing.outputTokens) / 1000000;

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        totalCost
      }
    };
  }

  // Get available providers and their status
  getProviderStatus(): Array<{ provider: AIProvider; config: AIProviderConfig; available: boolean }> {
    return Array.from(this.providers.entries()).map(([provider, config]) => ({
      provider,
      config,
      available: this.clients.has(provider)
    }));
  }

  // Get cost estimation for a request
  estimateCost(request: AIRequest): Array<{ provider: AIProvider; estimatedCost: number }> {
    const estimatedInputTokens = Math.ceil(
      request.messages.reduce((acc, m) => acc + m.content.length, 0) / 4
    );
    const estimatedOutputTokens = request.maxTokens || 500;

    return Array.from(this.providers.entries()).map(([provider, config]) => ({
      provider,
      estimatedCost: (estimatedInputTokens * config.pricing.inputTokens + 
                     estimatedOutputTokens * config.pricing.outputTokens) / 1000000
    }));
  }
}

export const multiAIManager = new MultiAIManager();