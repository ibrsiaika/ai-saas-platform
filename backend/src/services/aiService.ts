import OpenAI from 'openai';
import { AIRequest, AIResponse, ChatMessage } from '../../../shared/types';

// Lazy-loaded OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// Prompt templates for different AI features
const PROMPT_TEMPLATES = {
  CONTENT_GENERATOR: `You are an expert content creator. Generate high-quality, engaging content based on the user's requirements. Be creative, informative, and match the requested tone and style.

User Request: {prompt}
Content Type: {contentType}
Tone: {tone}
Target Audience: {audience}

Please generate content that meets these specifications:`,

  CHAT_ASSISTANT: `You are a helpful AI assistant for a SaaS platform. Provide accurate, helpful responses while being professional and friendly. Always aim to assist users in achieving their goals.

Previous context: {context}
User message: {message}

Please respond helpfully:`,

  CODE_HELPER: `You are an expert software developer. Help users with coding questions, provide clean code examples, and explain technical concepts clearly.

Programming Language: {language}
User Question: {question}
Context: {context}

Please provide a helpful coding solution:`,

  BUSINESS_ADVISOR: `You are a business strategy expert. Provide actionable business advice, market insights, and strategic recommendations.

Business Context: {context}
User Question: {question}
Industry: {industry}

Please provide strategic business guidance:`
};

export class AIService {
  /**
   * Generate AI content based on user prompt and parameters
   */
  static async generateContent(request: AIRequest): Promise<AIResponse> {
    try {
      const { prompt, type, options = {} } = request;
      
      // Select appropriate prompt template
      let systemPrompt = PROMPT_TEMPLATES.CONTENT_GENERATOR;
      
      switch (type) {
        case 'chat':
          systemPrompt = PROMPT_TEMPLATES.CHAT_ASSISTANT;
          break;
        case 'code':
          systemPrompt = PROMPT_TEMPLATES.CODE_HELPER;
          break;
        case 'business':
          systemPrompt = PROMPT_TEMPLATES.BUSINESS_ADVISOR;
          break;
        default:
          systemPrompt = PROMPT_TEMPLATES.CONTENT_GENERATOR;
      }

      // Format the prompt with user parameters
      const formattedPrompt = this.formatPrompt(systemPrompt, {
        prompt,
        contentType: options.contentType || 'general',
        tone: options.tone || 'professional',
        audience: options.audience || 'general',
        context: options.context || '',
        message: prompt,
        question: prompt,
        language: options.language || '',
        industry: options.industry || ''
      });

      // Call OpenAI API
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: options.model || 'gpt-4',
        messages: [
          { role: 'system', content: formattedPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        stream: false
      });

      const content = completion.choices[0]?.message?.content || '';
      
      return {
        success: true,
        content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        },
        model: completion.model,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('AI Service Error:', error);
      
      return {
        success: false,
        content: '',
        error: {
          message: error.message || 'AI generation failed',
          code: error.code || 'AI_ERROR',
          type: 'ai_generation_error'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Process chat conversation with context
   */
  static async processChat(
    messages: ChatMessage[], 
    options: { model?: string; maxTokens?: number } = {}
  ): Promise<AIResponse> {
    try {
      // Convert chat messages to OpenAI format
      const openaiMessages = messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      }));

      // Add system message if not present
      if (!openaiMessages.some(msg => msg.role === 'system')) {
        openaiMessages.unshift({
          role: 'system',
          content: PROMPT_TEMPLATES.CHAT_ASSISTANT.replace('{context}', '').replace('{message}', '')
        });
      }

      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: options.model || 'gpt-4',
        messages: openaiMessages,
        max_tokens: options.maxTokens || 1000,
        temperature: 0.7,
        stream: false
      });

      const content = completion.choices[0]?.message?.content || '';
      
      return {
        success: true,
        content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        },
        model: completion.model,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('Chat Processing Error:', error);
      
      return {
        success: false,
        content: '',
        error: {
          message: error.message || 'Chat processing failed',
          code: error.code || 'CHAT_ERROR',
          type: 'chat_processing_error'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate embeddings for text content
   */
  static async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const openai = getOpenAIClient();
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      console.error('Embeddings Generation Error:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Format prompt template with variables
   */
  private static formatPrompt(template: string, variables: Record<string, string>): string {
    let formatted = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      formatted = formatted.replace(regex, value);
    });
    
    return formatted;
  }

  /**
   * Validate AI request parameters
   */
  static validateRequest(request: AIRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.prompt || request.prompt.trim().length === 0) {
      errors.push('Prompt is required and cannot be empty');
    }

    if (request.prompt && request.prompt.length > 10000) {
      errors.push('Prompt cannot exceed 10,000 characters');
    }

    if (!request.type || !['content', 'chat', 'code', 'business'].includes(request.type)) {
      errors.push('Type must be one of: content, chat, code, business');
    }

    if (request.options?.maxTokens && (request.options.maxTokens < 1 || request.options.maxTokens > 4000)) {
      errors.push('Max tokens must be between 1 and 4000');
    }

    if (request.options?.temperature && (request.options.temperature < 0 || request.options.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default AIService;