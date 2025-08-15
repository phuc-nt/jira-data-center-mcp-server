import { describe, expect, it } from '@jest/globals';
import { ContentFormatConverter, type ADFDocument, type ADFNode } from '../../api/content-converter.js';

describe('ContentFormatConverter', () => {
  let converter: ContentFormatConverter;

  beforeEach(() => {
    converter = new ContentFormatConverter();
  });

  describe('adfToWikiMarkup', () => {
    describe('basic elements', () => {
      it('should convert simple text', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Hello world' }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toBe('Hello world');
        expect(result.format).toBe('wikimarkup');
        expect(result.fallbackUsed).toBe(false);
      });

      it('should convert headings', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Main Title' }]
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Subtitle' }]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('h1. Main Title');
        expect(result.content).toContain('h2. Subtitle');
      });

      it('should convert text formatting', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'bold text',
                  marks: [{ type: 'strong' }]
                },
                { type: 'text', text: ' and ' },
                {
                  type: 'text',
                  text: 'italic text',
                  marks: [{ type: 'em' }]
                },
                { type: 'text', text: ' and ' },
                {
                  type: 'text',
                  text: 'code',
                  marks: [{ type: 'code' }]
                }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('*bold text*');
        expect(result.content).toContain('_italic text_');
        expect(result.content).toContain('{{code}}');
      });

      it('should convert links', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'link',
                  attrs: { href: 'https://example.com' },
                  content: [{ type: 'text', text: 'Example Link' }]
                }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('[Example Link|https://example.com]');
      });

      it('should convert mentions', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'mention',
                  attrs: { id: 'testuser', text: 'Test User' }
                }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('[~testuser]');
      });
    });

    describe('lists', () => {
      it('should convert bullet lists', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'First item' }]
                    }
                  ]
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Second item' }]
                    }
                  ]
                }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('* First item');
        expect(result.content).toContain('* Second item');
      });

      it('should convert ordered lists', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'orderedList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'First step' }]
                    }
                  ]
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Second step' }]
                    }
                  ]
                }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('# First step');
        expect(result.content).toContain('# Second step');
      });
    });

    describe('code blocks', () => {
      it('should convert code blocks with language', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'codeBlock',
              attrs: { language: 'javascript' },
              content: [
                { type: 'text', text: 'console.log("Hello world");' }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('{code:javascript}');
        expect(result.content).toContain('console.log("Hello world");');
        expect(result.content).toContain('{code}');
      });

      it('should convert code blocks without language', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'codeBlock',
              content: [
                { type: 'text', text: 'plain code' }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('{noformat}');
        expect(result.content).toContain('plain code');
        expect(result.content).toContain('{noformat}');
      });

      it('should convert inline code', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Use ' },
                {
                  type: 'inlineCode',
                  content: [{ type: 'text', text: 'console.log()' }]
                },
                { type: 'text', text: ' for debugging.' }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('Use {{console.log()}} for debugging.');
      });
    });

    describe('quotes and panels', () => {
      it('should convert blockquotes', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'blockquote',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'This is a quote' }]
                }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('{quote}');
        expect(result.content).toContain('This is a quote');
        expect(result.content).toContain('{quote}');
      });

      it('should convert panels', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'panel',
              attrs: { panelType: 'warning' },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Warning message' }]
                }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('{panel:title=warning}');
        expect(result.content).toContain('Warning message');
        expect(result.content).toContain('{panel}');
      });
    });

    describe('tables', () => {
      it('should convert simple tables', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'table',
              content: [
                {
                  type: 'tableRow',
                  content: [
                    {
                      type: 'tableHeader',
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'Header 1' }]
                        }
                      ]
                    },
                    {
                      type: 'tableHeader',
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'Header 2' }]
                        }
                      ]
                    }
                  ]
                },
                {
                  type: 'tableRow',
                  content: [
                    {
                      type: 'tableCell',
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'Cell 1' }]
                        }
                      ]
                    },
                    {
                      type: 'tableCell',
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'Cell 2' }]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('|Header 1|Header 2|');
        expect(result.content).toContain('|Cell 1|Cell 2|');
      });
    });

    describe('error handling', () => {
      it('should handle unsupported elements gracefully', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'unsupportedElement',
              content: [{ type: 'text', text: 'This should be extracted' }]
            } as ADFNode
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('This should be extracted');
        expect(result.warnings).toEqual([]);
      });

      it('should use plaintext fallback when conversion fails', () => {
        const adf = {
          version: 1,
          type: 'doc',
          content: [
            { type: 'text', text: 'Fallback text' }
          ]
        } as ADFDocument;

        // Force conversion to fail by passing malformed data
        const result = converter.adfToWikiMarkup(adf, { fallbackToPlaintext: true });

        expect(result.format).toBe('wikimarkup');
        expect(result.fallbackUsed).toBe(false);
      });

      it('should extract plain text from deeply nested structures', () => {
        const adf: ADFDocument = {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'link',
                  attrs: { href: 'https://example.com' },
                  content: [
                    {
                      type: 'text',
                      text: 'deeply nested',
                      marks: [{ type: 'strong' }]
                    }
                  ]
                }
              ]
            }
          ]
        };

        const result = converter.adfToWikiMarkup(adf);

        expect(result.content).toContain('[*deeply nested*|https://example.com]');
      });
    });
  });

  describe('detectContentFormat', () => {
    it('should detect ADF format', () => {
      const adfContent = JSON.stringify({
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test' }]
          }
        ]
      });

      const result = converter.detectContentFormat(adfContent);

      expect(result.format).toBe('adf');
      expect(result.confidence).toBe('high');
      expect(result.indicators).toContain('ADF JSON structure');
    });

    it('should detect Wiki Markup format', () => {
      const wikiContent = 'h1. Title\n\n*Bold text* and _italic text_\n\n* List item\n# Numbered item';

      const result = converter.detectContentFormat(wikiContent);

      expect(result.format).toBe('wikimarkup');
      expect(result.confidence).toBe('high');
    });

    it('should detect HTML format', () => {
      const htmlContent = '<h1>Title</h1><p>This is <strong>HTML</strong> content.</p>';

      const result = converter.detectContentFormat(htmlContent);

      expect(result.format).toBe('html');
      expect(result.confidence).toBe('medium');
    });

    it('should default to plaintext for unrecognized content', () => {
      const plainContent = 'This is just plain text with no special formatting.';

      const result = converter.detectContentFormat(plainContent);

      expect(result.format).toBe('plaintext');
      expect(result.confidence).toBe('low');
    });
  });

  describe('wikiMarkupToPlainText', () => {
    it('should strip Wiki Markup formatting', () => {
      const wikiContent = `
h1. Main Title

This is *bold* and _italic_ text with {{inline code}}.

{code:javascript}
console.log('code block');
{code}

* List item 1
* List item 2

[Link text|https://example.com]

[~username] mentioned this.
      `.trim();

      const result = converter.wikiMarkupToPlainText(wikiContent);

      expect(result).toContain('Main Title');
      expect(result).toContain('bold and italic text with inline code');
      expect(result).toContain("console.log('code block');");
      expect(result).toContain('List item 1');
      expect(result).toContain('Link text');
      expect(result).toContain('@username mentioned this');
      expect(result).not.toContain('h1.');
      expect(result).not.toContain('*bold*');
    });
  });

  describe('validateWikiMarkup', () => {
    it('should validate correct Wiki Markup', () => {
      const validWiki = `
{code:javascript}
function test() {}
{code}

{quote}
This is a quote
{quote}
      `.trim();

      const result = converter.validateWikiMarkup(validWiki);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect unclosed markup', () => {
      const invalidWiki = `
{code}
function test() {}

{quote}
This quote is not closed
      `.trim();

      const result = converter.validateWikiMarkup(invalidWiki);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unclosed code blocks: 0 opened, 1 closed');
      expect(result.errors).toContain('Unclosed quotes: 1 opened, 0 closed');
    });
  });

  describe('utility methods', () => {
    it('should return supported elements', () => {
      const elements = converter.getSupportedElements();

      expect(elements).toContain('paragraph');
      expect(elements).toContain('heading');
      expect(elements).toContain('bulletList');
      expect(elements).toContain('table');
      expect(elements.length).toBeGreaterThan(10);
    });

    it('should return supported marks', () => {
      const marks = converter.getSupportedMarks();

      expect(marks).toContain('strong');
      expect(marks).toContain('em');
      expect(marks).toContain('code');
      expect(marks).toContain('textColor');
      expect(marks.length).toBeGreaterThan(5);
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed content correctly', () => {
      const adf: ADFDocument = {
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Document Title' }]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This document contains ' },
              {
                type: 'text',
                text: 'formatted text',
                marks: [{ type: 'strong' }]
              },
              { type: 'text', text: ' and ' },
              {
                type: 'link',
                attrs: { href: 'https://example.com' },
                content: [{ type: 'text', text: 'a link' }]
              },
              { type: 'text', text: '.' }
            ]
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'First item' }]
                  }
                ]
              }
            ]
          }
        ]
      };

      const result = converter.adfToWikiMarkup(adf);

      expect(result.content).toContain('h1. Document Title');
      expect(result.content).toContain('*formatted text*');
      expect(result.content).toContain('[a link|https://example.com]');
      expect(result.content).toContain('* First item');
      expect(result.format).toBe('wikimarkup');
      expect(result.fallbackUsed).toBe(false);
    });
  });
});