import { DocumentChunk } from '../../../shared/types';

export class DocumentProcessor {
  /**
   * Split text into chunks for vector storage
   */
  static chunkText(
    text: string,
    options: {
      chunkSize?: number;
      overlap?: number;
      preserveParagraphs?: boolean;
    } = {}
  ): string[] {
    const {
      chunkSize = 1000,
      overlap = 100,
      preserveParagraphs = true
    } = options;

    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    
    if (preserveParagraphs) {
      // Split by paragraphs first
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      let currentChunk = '';
      
      for (const paragraph of paragraphs) {
        // If adding this paragraph would exceed chunk size
        if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          
          // Start new chunk with overlap from previous chunk
          const overlapText = this.getOverlapText(currentChunk, overlap);
          currentChunk = overlapText + paragraph;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }
      
      // Add the last chunk
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
    } else {
      // Simple character-based chunking
      let start = 0;
      
      while (start < text.length) {
        let end = start + chunkSize;
        
        // Try to break at word boundary
        if (end < text.length) {
          const lastSpace = text.lastIndexOf(' ', end);
          if (lastSpace > start + chunkSize * 0.8) {
            end = lastSpace;
          }
        }
        
        chunks.push(text.slice(start, end).trim());
        start = Math.max(start + chunkSize - overlap, end);
      }
    }

    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private static getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text + '\n\n';
    }

    const overlapText = text.slice(-overlapSize);
    
    // Try to start at a sentence boundary
    const sentenceEnd = overlapText.search(/[.!?]\s+/);
    if (sentenceEnd > overlapSize * 0.5) {
      return overlapText.slice(sentenceEnd + 2) + '\n\n';
    }

    // Try to start at a word boundary
    const spaceIndex = overlapText.indexOf(' ');
    if (spaceIndex > 0) {
      return overlapText.slice(spaceIndex + 1) + '\n\n';
    }

    return overlapText + '\n\n';
  }

  /**
   * Create DocumentChunk objects from text
   */
  static createDocumentChunks(
    text: string,
    options: {
      source?: string;
      type?: string;
      userId?: string;
      tags?: string[];
      chunkSize?: number;
      overlap?: number;
      preserveParagraphs?: boolean;
    } = {}
  ): DocumentChunk[] {
    const {
      source = 'unknown',
      type = 'text',
      userId = 'system',
      tags = [],
      ...chunkOptions
    } = options;

    const textChunks = this.chunkText(text, chunkOptions);

    return textChunks.map((chunk, index) => ({
      id: `${source.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${index}`,
      content: chunk,
      source,
      type,
      userId,
      tags,
      metadata: {
        source,
        type,
        userId,
        timestamp: new Date(),
        chunkIndex: index,
        totalChunks: textChunks.length
      }
    }));
  }

  /**
   * Process different file formats
   */
  static processFile(
    content: string,
    filename: string,
    options: {
      userId?: string;
      tags?: string[];
      chunkSize?: number;
      overlap?: number;
    } = {}
  ): DocumentChunk[] {
    const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
    const fileType = this.getFileType(fileExtension);

    let processedContent = content;

    // Basic preprocessing based on file type
    switch (fileType) {
      case 'markdown':
        processedContent = this.preprocessMarkdown(content);
        break;
      case 'html':
        processedContent = this.preprocessHTML(content);
        break;
      case 'code':
        processedContent = this.preprocessCode(content, fileExtension);
        break;
      default:
        processedContent = content;
    }

    return this.createDocumentChunks(processedContent, {
      source: filename,
      type: fileType,
      ...options
    });
  }

  /**
   * Determine file type from extension
   */
  private static getFileType(extension: string): string {
    const typeMap: { [key: string]: string } = {
      'md': 'markdown',
      'markdown': 'markdown',
      'txt': 'text',
      'html': 'html',
      'htm': 'html',
      'js': 'code',
      'ts': 'code',
      'py': 'code',
      'java': 'code',
      'cpp': 'code',
      'c': 'code',
      'cs': 'code',
      'php': 'code',
      'rb': 'code',
      'go': 'code',
      'rs': 'code',
      'json': 'data',
      'xml': 'data',
      'csv': 'data',
      'pdf': 'document',
      'doc': 'document',
      'docx': 'document'
    };

    return typeMap[extension] || 'text';
  }

  /**
   * Preprocess markdown content
   */
  private static preprocessMarkdown(content: string): string {
    // Remove markdown syntax but preserve structure
    return content
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`{3}[\s\S]*?`{3}/g, '') // Remove code blocks
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Remove images, keep alt text
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .trim();
  }

  /**
   * Preprocess HTML content
   */
  private static preprocessHTML(content: string): string {
    // Basic HTML tag removal - in production, use a proper HTML parser
    return content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Preprocess code content
   */
  private static preprocessCode(content: string, language: string): string {
    // Add language context to code content
    const languageNames: { [key: string]: string } = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust'
    };

    const languageName = languageNames[language] || language.toUpperCase();
    return `${languageName} Code:\n\n${content}`;
  }

  /**
   * Extract metadata from text content
   */
  static extractMetadata(text: string): {
    wordCount: number;
    estimatedReadingTime: number;
    language?: string;
    topics?: string[];
  } {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // 200 words per minute

    return {
      wordCount,
      estimatedReadingTime,
      // Add more sophisticated analysis here if needed
    };
  }

  /**
   * Validate document content
   */
  static validateDocument(doc: Partial<DocumentChunk>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!doc.id || typeof doc.id !== 'string') {
      errors.push('Document ID is required and must be a string');
    }

    if (!doc.content || typeof doc.content !== 'string') {
      errors.push('Document content is required and must be a string');
    }

    if (doc.content && doc.content.length < 10) {
      errors.push('Document content must be at least 10 characters long');
    }

    if (doc.content && doc.content.length > 50000) {
      errors.push('Document content must be less than 50,000 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default DocumentProcessor;