/**
 * Custom Mermaid Diagram Validation Service
 * Uses REAL compiled Jison grammar parsers for actual syntax validation
 * Author: Gregorio Elias Roecker Momm
 */

const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const logger = require('../utils/logger');
const GrammarCompiler = require('./grammarCompiler');
const LangiumValidator = require('./langiumValidator');
const ValidationInstructions = require('./validationInstructions');
const MermaidAutoFixer = require('./mermaidAutoFixer');

class CustomMermaidValidator {
  constructor() {
    this.grammarCompiler = new GrammarCompiler();
    this.langiumValidator = new LangiumValidator();
    this.validationInstructions = new ValidationInstructions();
    this.autoFixer = new MermaidAutoFixer();
    this.initializeGrammarParsers();
  }

  /**
   * Initialize grammar parsers by compiling real Jison grammars
   */
  async initializeGrammarParsers() {
    try {
      // Compile all available grammar files
      await this.grammarCompiler.compileAllGrammars();
      
      const status = this.grammarCompiler.getStatus();
      logger.info('Real grammar parsers initialized', {
        compiledParsers: status.compiledParsers,
        totalGrammars: status.totalGrammars,
        availableTypes: status.availableTypes,
        missingParsers: status.missingParsers
      });

    } catch (error) {
      logger.error('Grammar initialization failed:', error);
      throw error;
    }
  }

  /**
   * Extract Mermaid diagrams from markdown content
   * @param {string} content - Markdown content
   * @returns {Array} Array of diagram objects
   */
  extractDiagrams(content) {
    const diagrams = [];
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/g;
    let match;
    let index = 0;

    while ((match = mermaidRegex.exec(content)) !== null) {
      const diagramContent = match[1].trim();
      if (diagramContent) {
        diagrams.push({
          id: `diagram_${++index}`,
          content: diagramContent,
          startLine: this.getLineNumber(content, match.index),
          endLine: this.getLineNumber(content, match.index + match[0].length)
        });
      }
    }

    return diagrams;
  }

  /**
   * Get line number for a given position in text
   * @param {string} text - Full text content
   * @param {number} position - Character position
   * @returns {number} Line number
   */
  getLineNumber(text, position) {
    return text.substring(0, position).split('\n').length;
  }

  /**
   * Detect diagram type by trying to parse with each available grammar
   * @param {string} content - Diagram content
   * @returns {string} Detected diagram type
   */
  detectDiagramType(content) {
    // First check for explicit diagram type declarations
    const firstLine = content.split('\n')[0].trim().toLowerCase();
    
    const explicitTypes = {
      'sequencediagram': 'sequenceDiagram',
      'classdiagram': 'classDiagram',
      'statediagram': 'stateDiagram',
      'statediagram-v2': 'stateDiagram-v2',
      'erdiagram': 'erDiagram',
      'gantt': 'gantt',
      'journey': 'journey',
      'pie': 'pie',
      'requirementdiagram': 'requirementDiagram',
      'requirement': 'requirementDiagram',
      'mindmap': 'mindmap',
      'timeline': 'timeline',
      'sankey-beta': 'sankey-beta',
      'xychart-beta': 'xychart-beta',
      'kanban': 'kanban',
      'gitgraph': 'gitGraph',
      'info': 'info',
      'architecture-beta': 'architecture',
      'architecture': 'architecture',
      'radar': 'radar',
      'packet-beta': 'packet',
      'packet': 'packet',
      'treemap-beta': 'treemap',
      'treemap': 'treemap',
      'zenuml': 'zenuml',
      'c4context': 'C4Context',
      'c4container': 'c4',
      'c4component': 'c4',
      'c4dynamic': 'c4',
      'c4deployment': 'c4',
      'examplediagram': 'exampleDiagram',
      'example-diagram': 'exampleDiagram',
      'quadrantchart': 'quadrantChart',
      'quadrant': 'quadrantChart',
      'block-beta': 'block-beta',
      'block': 'block-beta'
    };

    // Check for explicit type declaration
    for (const [keyword, type] of Object.entries(explicitTypes)) {
      if (firstLine.startsWith(keyword)) {
        return type;
      }
    }

    // Check for graph/flowchart
    if (firstLine.startsWith('graph ') || firstLine.startsWith('flowchart ')) {
      return 'flowchart';
    }

    // Try parsing with each available grammar to detect type
    const availableTypes = this.grammarCompiler.getAvailableTypes();
    
    for (const diagramType of availableTypes) {
      try {
        const parser = this.grammarCompiler.getParser(diagramType);
        if (parser) {
          parser.parse(content);
          // If parsing succeeds, this is likely the correct type
          return diagramType;
        }
      } catch (error) {
        // Parsing failed, continue to next type
        continue;
      }
    }

    // Default to flowchart if no type can be determined
    return 'flowchart';
  }

  /**
   * Validate a single Mermaid diagram using REAL grammar parsing
   * @param {Object} diagram - Diagram object with id and content
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  async validateDiagram(diagram, options = {}) {
    const startTime = Date.now();
    // Use provided type if available, otherwise detect from content
    const diagramType = diagram.type || this.detectDiagramType(diagram.content);
    
    const result = {
      diagramId: diagram.id,
      valid: false,
      errors: [],
      warnings: [],
      svgGenerated: false,
      metadata: {
        diagramType,
        validationMethod: 'real_jison_grammar',
        contentLength: diagram.content.length,
        lineCount: diagram.content.split('\n').length,
        customValidator: true
      }
    };

    try {
      // Validate using REAL compiled Jison grammar
      const validationResult = await this.validateWithRealGrammar(diagram.content, diagramType, result);
      
      if (validationResult.valid) {
        result.valid = true;
        
        // SVG generation disabled for now
        result.svgGenerated = false;
      }

      // Add processing time
      result.metadata.processingTime = Date.now() - startTime;

    } catch (error) {
      result.errors.push({
        type: 'validation_error',
        message: error.message,
        line: null
      });
      logger.error('Validation error:', { error: error.message, diagramId: diagram.id, diagramType });
    }

    // Optional auto-fix pass: when caller asked for it and the diagram is invalid,
    // run the autofixer and re-validate the fixed content. We expose:
    //   - result.autoFixed     true iff the fixer changed the content
    //   - result.fixedContent  the post-fix content (only when autoFixed)
    //   - result.appliedFixes  list of fixes the autofixer applied
    // Callers (MarkdownMermaidFixer.fixDiagramIteratively) iterate by re-calling
    // validateDiagram on the returned fixedContent until valid or no more progress.
    if (!result.valid && options.autoFix === true && result.errors.length > 0) {
      try {
        const fix = this.autoFixer.autoFix(diagram.content, diagramType, result.errors);
        if (fix && fix.fixable && fix.fixedContent && fix.fixedContent !== diagram.content) {
          result.autoFixed = true;
          result.fixedContent = fix.fixedContent;
          result.appliedFixes = fix.appliedFixes || [];

          // Re-validate the fixed content; if it now parses, mark valid and
          // clear the stale error list so callers see a clean success.
          const reValid = { errors: [], warnings: [] };
          const reCheck = await this.validateWithRealGrammar(fix.fixedContent, diagramType, reValid);
          if (reCheck && reCheck.valid) {
            result.valid = true;
            result.errors = [];
          }
        } else {
          result.autoFixed = false;
        }
      } catch (fixError) {
        logger.error('Auto-fix attempt failed:', { error: fixError.message, diagramId: diagram.id, diagramType });
        result.autoFixed = false;
      }
    }

    // Add applicable syntax rules for invalid diagrams
    if (!result.valid && result.errors.length > 0) {
      result.applicableSyntax = this.validationInstructions.generateApplicableSyntax(
        diagramType,
        result.errors,
        diagram.content
      );
    }

    return result;
  }

  /**
   * Validate diagram using REAL compiled Jison grammar parser or Langium parser
   * @param {string} content - Diagram content
   * @param {string} diagramType - Detected diagram type
   * @param {Object} result - Result object to update
   * @returns {Object} Validation result
   */
  async validateWithRealGrammar(content, diagramType, result) {
    try {
      // Check if this is a Langium-based diagram type
      if (this.langiumValidator.isLangiumDiagram(diagramType)) {
        return await this.langiumValidator.validateWithLangiumGrammar(content, diagramType, result);
      }
      
      // Use Jison grammar parser for traditional diagram types
      const parser = this.grammarCompiler.getParser(diagramType);
      
      if (!parser) {
        result.errors.push({
          type: 'no_parser',
          message: `No compiled parser available for diagram type: ${diagramType}`,
          line: 1
        });
        return { valid: false };
      }

      // Set up parser context like Mermaid does: parser.yy = new DiagramDB()
      parser.yy = this.grammarCompiler.createParserContext(diagramType);
      
      // Clear any previous state (important for subsequent parses)
      if (parser.yy.clear) {
        parser.yy.clear();
      }
      
      // REAL GRAMMAR PARSING - This will throw if syntax is invalid
      const parseResult = parser.parse(content);
      
      // If we get here, parsing succeeded
      logger.info(`Grammar validation passed for ${diagramType}`, {
        diagramType,
        contentLength: content.length,
        parseResult: typeof parseResult
      });
      
      return { valid: true };
      
    } catch (parseError) {
      // Real parsing error from Jison grammar
      const errorDetails = this.parseJisonError(parseError, content);
      
      result.errors.push({
        type: 'syntax_error',
        message: errorDetails.message,
        line: errorDetails.line,
        column: errorDetails.column,
        expected: errorDetails.expected,
        found: errorDetails.found
      });
      
      logger.warn(`Grammar validation failed for ${diagramType}`, {
        diagramType,
        error: parseError.message,
        errorDetails
      });
      
      return { valid: false };
    }
  }

  /**
   * Parse Jison error details for better error reporting
   * @param {Error} error - Jison parse error
   * @param {string} content - Original content
   * @returns {Object} Parsed error details
   */
  parseJisonError(error, content) {
    const defaultError = {
      message: error.message || 'Unknown syntax error',
      line: 1,
      column: 1,
      expected: null,
      found: null
    };

    try {
      // Try to extract line/column information from Jison error
      if (error.location) {
        defaultError.line = error.location.first_line || 1;
        defaultError.column = error.location.first_column || 1;
      }

      if (error.expected) {
        defaultError.expected = error.expected;
      }

      if (error.found !== undefined) {
        defaultError.found = error.found;
      }

      // Try to extract more details from error message
      const lineMatch = error.message.match(/line (\d+)/i);
      if (lineMatch) {
        defaultError.line = parseInt(lineMatch[1], 10);
      }

      const columnMatch = error.message.match(/column (\d+)/i);
      if (columnMatch) {
        defaultError.column = parseInt(columnMatch[1], 10);
      }

      return defaultError;
      
    } catch (parseErr) {
      logger.warn('Failed to parse Jison error details:', parseErr);
      return defaultError;
    }
  }

  /**
   * Validate multiple diagrams
   * @param {Array} diagrams - Array of diagram objects
   * @param {Object} options - Validation options
   * @returns {Object} Validation results summary
   */
  async validateMultipleDiagrams(diagrams, options = {}) {
    const startTime = Date.now();
    const results = [];

    // Validate each diagram
    for (const diagram of diagrams) {
      const result = await this.validateDiagram(diagram, options);
      results.push(result);
    }

    // Calculate summary
    const validDiagrams = results.filter(r => r.valid).length;
    const invalidDiagrams = results.length - validDiagrams;

    const summary = {
      totalDiagrams: results.length,
      validDiagrams,
      invalidDiagrams,
      results,
      processingTime: Date.now() - startTime,
      validator: 'real_jison_grammar_parsers'
    };

    logger.info('Real grammar validation completed', {
      totalDiagrams: summary.totalDiagrams,
      validDiagrams: summary.validDiagrams,
      invalidDiagrams: summary.invalidDiagrams,
      processingTime: summary.processingTime
    });

    return summary;
  }

  /**
   * Get supported diagram types
   * @returns {Array} List of supported diagram types
   */
  getSupportedTypes() {
    return this.grammarCompiler.getAvailableTypes();
  }

  /**
   * Get grammar compiler status
   * @returns {Object} Status information
   */
  getStatus() {
    return this.grammarCompiler.getStatus();
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.grammarCompiler.cleanup();
  }
}

module.exports = CustomMermaidValidator;