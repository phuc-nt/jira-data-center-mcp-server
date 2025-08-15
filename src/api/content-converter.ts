/**
 * Content Format Converter for ADF ↔ Wiki Markup
 * Handles conversion between Atlassian Document Format and Wiki Markup for Data Center
 */

import { logger } from '../utils/logger.js';

/**
 * Atlassian Document Format (ADF) node types
 */
export interface ADFNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ADFNode[];
  text?: string;
  marks?: ADFMark[];
}

/**
 * ADF mark (formatting) types
 */
export interface ADFMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/**
 * ADF document structure
 */
export interface ADFDocument {
  version: number;
  type: 'doc';
  content: ADFNode[];
}

/**
 * Content format detection result
 */
export interface FormatDetectionResult {
  format: 'adf' | 'wikimarkup' | 'plaintext' | 'html';
  confidence: 'high' | 'medium' | 'low';
  indicators: string[];
}

/**
 * Conversion result with metadata
 */
export interface ConversionResult {
  content: string;
  format: 'wikimarkup' | 'plaintext';
  warnings: string[];
  unsupportedElements: string[];
  fallbackUsed: boolean;
}

/**
 * Content format conversion options
 */
export interface ConversionOptions {
  preserveStructure: boolean;
  fallbackToPlaintext: boolean;
  includeUnsupportedAsComment: boolean;
  maxDepth: number;
}

/**
 * Content Format Converter
 * Handles ADF to Wiki Markup conversion with graceful degradation
 */
export class ContentFormatConverter {
  private readonly logger = logger.child('ContentConverter');
  
  private readonly defaultOptions: ConversionOptions = {
    preserveStructure: true,
    fallbackToPlaintext: true,
    includeUnsupportedAsComment: false,
    maxDepth: 10
  };

  /**
   * ADF to Wiki Markup element mappings
   */
  private readonly elementMappings: Record<string, (node: ADFNode, options: ConversionOptions) => string> = {
    // Document structure
    doc: (node) => this.convertContent(node.content || [], this.defaultOptions),
    paragraph: (node) => this.convertContent(node.content || [], this.defaultOptions) + '\n\n',
    
    // Headings
    heading: (node) => {
      const level = (node.attrs?.level as number) || 1;
      const prefix = 'h' + Math.min(level, 6) + '. ';
      const content = this.convertContent(node.content || [], this.defaultOptions);
      return prefix + content + '\n\n';
    },
    
    // Text formatting
    text: (node) => {
      let text = node.text || '';
      if (node.marks) {
        text = this.applyMarks(text, node.marks);
      }
      return text;
    },
    
    // Lists
    bulletList: (node) => {
      return this.convertList(node.content || [], '*') + '\n';
    },
    orderedList: (node) => {
      return this.convertList(node.content || [], '#') + '\n';
    },
    listItem: (node) => {
      return this.convertContent(node.content || [], this.defaultOptions);
    },
    
    // Links
    link: (node) => {
      const href = node.attrs?.href as string;
      const content = this.convertContent(node.content || [], this.defaultOptions);
      return href ? `[${content}|${href}]` : content;
    },
    
    // Code
    codeBlock: (node) => {
      const language = node.attrs?.language as string;
      const content = this.convertContent(node.content || [], this.defaultOptions);
      return language 
        ? `{code:${language}}\n${content}\n{code}\n\n`
        : `{noformat}\n${content}\n{noformat}\n\n`;
    },
    inlineCode: (node) => {
      const content = this.convertContent(node.content || [], this.defaultOptions);
      return `{{${content}}}`;
    },
    
    // Quotes
    blockquote: (node) => {
      const content = this.convertContent(node.content || [], this.defaultOptions);
      return `{quote}\n${content}\n{quote}\n\n`;
    },
    
    // Tables
    table: (node) => {
      return this.convertTable(node.content || []) + '\n\n';
    },
    tableRow: (node) => {
      const cells = (node.content || []).map(cell => 
        this.convertTableCell(cell)
      ).join('|');
      return `|${cells}|\n`;
    },
    tableCell: (node) => {
      return this.convertContent(node.content || [], this.defaultOptions);
    },
    tableHeader: (node) => {
      return this.convertContent(node.content || [], this.defaultOptions);
    },
    
    // Line breaks
    hardBreak: () => '\n',
    
    // Rules
    rule: () => '----\n\n',
    
    // Mentions and references
    mention: (node) => {
      const id = node.attrs?.id as string;
      const text = node.attrs?.text as string;
      return `[~${id || text || 'user'}]`;
    },
    
    // Media (simplified - DC has limited support)
    media: (node) => {
      const alt = node.attrs?.alt as string || 'image';
      return `[${alt}]`;
    },
    
    // Panels
    panel: (node) => {
      const panelType = node.attrs?.panelType as string || 'info';
      const content = this.convertContent(node.content || [], this.defaultOptions);
      return `{panel:title=${panelType}}\n${content}\n{panel}\n\n`;
    }
  };

  /**
   * Text mark mappings (bold, italic, etc.)
   */
  private readonly markMappings: Record<string, (text: string, attrs?: Record<string, unknown>) => string> = {
    strong: (text) => `*${text}*`,
    em: (text) => `_${text}_`,
    code: (text) => `{{${text}}}`,
    strike: (text) => `-${text}-`,
    underline: (text) => `+${text}+`,
    subsup: (text, attrs) => {
      const type = attrs?.type as string;
      return type === 'sup' ? `^${text}^` : `~${text}~`;
    },
    textColor: (text, attrs) => {
      const color = attrs?.color as string;
      return color ? `{color:${color}}${text}{color}` : text;
    }
  };

  /**
   * Convert ADF document to Wiki Markup
   */
  adfToWikiMarkup(adf: ADFDocument | ADFNode, options?: Partial<ConversionOptions>): ConversionResult {
    const opts = { ...this.defaultOptions, ...options };
    const warnings: string[] = [];
    const unsupportedElements: string[] = [];
    
    this.logger.debug('Converting ADF to Wiki Markup', {
      adfType: adf.type,
      hasContent: !!(adf as ADFDocument).content || !!(adf as ADFNode).content
    });

    try {
      let content: string;
      
      if (adf.type === 'doc') {
        content = this.convertContent((adf as ADFDocument).content, opts);
      } else {
        content = this.convertNode(adf as ADFNode, opts);
      }

      // Clean up extra whitespace
      content = this.cleanupContent(content);

      return {
        content,
        format: 'wikimarkup',
        warnings,
        unsupportedElements: Array.from(new Set(unsupportedElements)),
        fallbackUsed: false
      };
    } catch (error) {
      this.logger.warn('ADF conversion failed, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (opts.fallbackToPlaintext) {
        const plaintext = this.extractPlainText(adf);
        return {
          content: plaintext,
          format: 'plaintext',
          warnings: ['Conversion failed, extracted plain text only'],
          unsupportedElements,
          fallbackUsed: true
        };
      }

      throw error;
    }
  }

  /**
   * Convert ADF content array to Wiki Markup
   */
  private convertContent(content: ADFNode[], options: ConversionOptions, depth = 0): string {
    if (depth > options.maxDepth) {
      return '[Content too deeply nested]';
    }

    return content.map(node => this.convertNode(node, options, depth + 1)).join('');
  }

  /**
   * Convert single ADF node to Wiki Markup
   */
  private convertNode(node: ADFNode, options: ConversionOptions, _depth = 0): string {
    const converter = this.elementMappings[node.type];
    
    if (converter) {
      try {
        return converter(node, options);
      } catch (error) {
        this.logger.warn('Node conversion failed', {
          nodeType: node.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        if (options.includeUnsupportedAsComment) {
          return `<!-- Unsupported ADF element: ${node.type} -->`;
        }
        
        return this.extractPlainTextFromNode(node);
      }
    }

    // Unsupported element
    this.logger.debug('Unsupported ADF element', { nodeType: node.type });
    
    if (options.includeUnsupportedAsComment) {
      return `<!-- Unsupported ADF element: ${node.type} -->`;
    }

    // Try to extract text content
    return this.extractPlainTextFromNode(node);
  }

  /**
   * Apply text marks (formatting) to text
   */
  private applyMarks(text: string, marks: ADFMark[]): string {
    return marks.reduce((result, mark) => {
      const markConverter = this.markMappings[mark.type];
      return markConverter ? markConverter(result, mark.attrs) : result;
    }, text);
  }

  /**
   * Convert list items with proper indentation
   */
  private convertList(items: ADFNode[], marker: string, depth = 0): string {
    const indent = '  '.repeat(depth);
    
    return items.map(item => {
      const content = this.convertContent(item.content || [], this.defaultOptions);
      const trimmed = content.trim();
      
      // Handle nested lists
      if (trimmed.includes('\n')) {
        const lines = trimmed.split('\n');
        const firstLine = lines[0];
        const rest = lines.slice(1).map(line => 
          line.startsWith('*') || line.startsWith('#') ? `  ${line}` : line
        ).join('\n');
        return `${indent}${marker} ${firstLine}\n${rest}`;
      }
      
      return `${indent}${marker} ${trimmed}`;
    }).join('\n');
  }

  /**
   * Convert table structure
   */
  private convertTable(rows: ADFNode[]): string {
    if (rows.length === 0) return '';
    
    return rows.map(row => {
      if (row.type === 'tableRow') {
        return this.convertTableRow(row);
      }
      return '';
    }).join('');
  }

  /**
   * Convert table row
   */
  private convertTableRow(row: ADFNode): string {
    const cells = (row.content || []).map(cell => {
      const content = this.convertContent(cell.content || [], this.defaultOptions);
      return content.trim().replace(/\n/g, ' '); // Tables don't support line breaks
    });
    
    return `|${cells.join('|')}|\n`;
  }

  /**
   * Convert table cell content
   */
  private convertTableCell(cell: ADFNode): string {
    const content = this.convertContent(cell.content || [], this.defaultOptions);
    return content.trim().replace(/\n/g, ' ');
  }

  /**
   * Clean up converted content
   */
  private cleanupContent(content: string): string {
    return content
      .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
      .replace(/^\s+|\s+$/g, '')   // Trim start and end
      .replace(/[ \t]+$/gm, '');   // Remove trailing spaces
  }

  /**
   * Extract plain text from ADF document/node
   */
  private extractPlainText(adf: ADFDocument | ADFNode): string {
    if ('content' in adf && adf.content) {
      return adf.content.map(node => this.extractPlainTextFromNode(node)).join('');
    }
    
    return this.extractPlainTextFromNode(adf as ADFNode);
  }

  /**
   * Extract plain text from single ADF node
   */
  private extractPlainTextFromNode(node: ADFNode): string {
    if (node.type === 'text') {
      return node.text || '';
    }
    
    if (node.content) {
      return node.content.map(child => this.extractPlainTextFromNode(child)).join('');
    }
    
    return '';
  }

  /**
   * Detect content format
   */
  detectContentFormat(content: string): FormatDetectionResult {
    const indicators: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'low';
    
    // Check for ADF JSON structure
    if (content.trim().startsWith('{') && content.includes('"type"') && content.includes('"content"')) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.type === 'doc' && parsed.content) {
          indicators.push('ADF JSON structure', 'doc type', 'content array');
          confidence = 'high';
          return { format: 'adf', confidence, indicators };
        }
      } catch {
        // Not valid JSON
      }
    }

    // Check for Wiki Markup patterns
    const wikiPatterns = [
      /^h[1-6]\./m,           // Headings
      /\*[^*]+\*/,            // Bold
      /_[^_]+_/,              // Italic
      /\{\{[^}]+\}\}/,        // Code
      /\{code[^}]*\}/,        // Code blocks
      /\{quote\}/,            // Quotes
      /^\* /m,                // Bullet lists
      /^# /m,                 // Numbered lists
      /\[~[^\]]+\]/,          // Mentions
      /\[[^\]]*\|[^\]]*\]/    // Links
    ];

    const wikiMatches = wikiPatterns.filter(pattern => pattern.test(content));
    if (wikiMatches.length > 0) {
      indicators.push(...wikiMatches.map(p => `Wiki pattern: ${p.source}`));
      confidence = wikiMatches.length >= 3 ? 'high' : wikiMatches.length >= 2 ? 'medium' : 'low';
      return { format: 'wikimarkup', confidence, indicators };
    }

    // Check for HTML
    if (content.includes('<') && content.includes('>')) {
      const htmlTags = content.match(/<[^>]+>/g);
      if (htmlTags && htmlTags.length > 0) {
        indicators.push('HTML tags detected');
        confidence = 'medium';
        return { format: 'html', confidence, indicators };
      }
    }

    // Default to plain text
    indicators.push('No specific format markers detected');
    return { format: 'plaintext', confidence, indicators };
  }

  /**
   * Convert Wiki Markup to plain text (fallback)
   */
  wikiMarkupToPlainText(wikiText: string): string {
    return wikiText
      // Remove Wiki Markup formatting
      .replace(/^h[1-6]\.\s*/gm, '')          // Headings
      .replace(/\*([^*]+)\*/g, '$1')          // Bold
      .replace(/_([^_]+)_/g, '$1')            // Italic
      .replace(/\{\{([^}]+)\}\}/g, '$1')      // Inline code
      .replace(/\{code[^}]*\}([\s\S]*?)\{code\}/g, '$1') // Code blocks
      .replace(/\{quote\}([\s\S]*?)\{quote\}/g, '$1')    // Quotes
      .replace(/\{panel[^}]*\}([\s\S]*?)\{panel\}/g, '$1') // Panels
      .replace(/^\s*\*\s*/gm, '• ')           // Bullet lists
      .replace(/^\s*#\s*/gm, '• ')            // Numbered lists
      .replace(/\[([^\]]*)\|[^\]]*\]/g, '$1') // Links
      .replace(/\[~([^\]]+)\]/g, '@$1')       // Mentions
      .replace(/^-{4,}/gm, '---')             // Rules
      .replace(/\n{3,}/g, '\n\n')             // Multiple newlines
      .trim();
  }

  /**
   * Validate Wiki Markup syntax
   */
  validateWikiMarkup(markup: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for unclosed code blocks
    const codeOpens = (markup.match(/\{code[^}]*\}/g) || []).filter(match => 
      match !== '{code}' // Don't count closing {code} as opening
    ).length;
    const codeCloses = (markup.match(/\{code\}/g) || []).length;
    
    if (codeOpens !== codeCloses) {
      errors.push(`Unclosed code blocks: ${codeOpens} opened, ${codeCloses} closed`);
    }
    
    // Check for unclosed quotes (quotes use same tag for open/close)
    const quoteMatches = (markup.match(/\{quote\}/g) || []).length;
    if (quoteMatches % 2 !== 0) {
      errors.push(`Unclosed quotes: ${Math.ceil(quoteMatches / 2)} opened, ${Math.floor(quoteMatches / 2)} closed`);
    }
    
    // Check for unclosed panels
    const panelOpens = (markup.match(/\{panel[^}]*\}/g) || []).filter(match => 
      match !== '{panel}' // Don't count closing {panel} as opening
    ).length;
    const panelCloses = (markup.match(/\{panel\}/g) || []).length;
    
    if (panelOpens !== panelCloses) {
      errors.push(`Unclosed panels: ${panelOpens} opened, ${panelCloses} closed`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get supported ADF elements
   */
  getSupportedElements(): string[] {
    return Object.keys(this.elementMappings);
  }

  /**
   * Get supported text marks
   */
  getSupportedMarks(): string[] {
    return Object.keys(this.markMappings);
  }
}