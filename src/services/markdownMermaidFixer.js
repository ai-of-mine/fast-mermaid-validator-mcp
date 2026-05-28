/**
 * Markdown Mermaid Fixer Service
 * Processes entire markdown files, fixes all Mermaid diagrams, and returns complete fixed markdown
 * Follows comprehensive Mermaid best practices and rules
 * Author: Gregorio Elias Roecker Momm
 */

const MermaidAutoFixer = require('./mermaidAutoFixer');
const CustomMermaidValidator = require('./customMermaidValidator');
const logger = require('../utils/logger');

class MarkdownMermaidFixer {
  constructor() {
    this.autoFixer = new MermaidAutoFixer();
    this.validator = new CustomMermaidValidator();
    this.maxIterations = 5;
  }

  /**
   * Process markdown content and fix all Mermaid diagrams
   * @param {string} markdownContent - Original markdown content
   * @param {Object} options - Processing options
   * @returns {Object} Result with fixed markdown and statistics
   */
  async processMarkdown(markdownContent, options = {}) {
    const startTime = Date.now();
    const result = {
      originalContent: markdownContent,
      fixedContent: markdownContent,
      diagrams: [],
      totalDiagrams: 0,
      fixedDiagrams: 0,
      failedDiagrams: 0,
      totalIterations: 0,
      processingTime: 0,
      success: true
    };

    try {
      // Extract all Mermaid diagrams from markdown
      const diagrams = this.extractMermaidDiagrams(markdownContent);
      result.totalDiagrams = diagrams.length;

      if (diagrams.length === 0) {
        logger.info('No Mermaid diagrams found in markdown');
        return result;
      }

      logger.info(`Found ${diagrams.length} Mermaid diagram(s) to process`);

      // Process each diagram
      let fixedMarkdown = markdownContent;
      
      for (const diagram of diagrams) {
        const diagramResult = await this.fixDiagramIteratively(diagram, options);
        result.diagrams.push(diagramResult);
        result.totalIterations += diagramResult.iterations;

        if (diagramResult.success) {
          result.fixedDiagrams++;
          
          // Replace original diagram with fixed version in markdown
          if (diagramResult.wasFixed) {
            fixedMarkdown = this.replaceDiagramInMarkdown(
              fixedMarkdown,
              diagram.originalContent,
              diagramResult.fixedContent
            );
          }
        } else {
          result.failedDiagrams++;
          result.success = false;
        }
      }

      result.fixedContent = fixedMarkdown;
      result.processingTime = Date.now() - startTime;

      logger.info('Markdown processing complete', {
        totalDiagrams: result.totalDiagrams,
        fixedDiagrams: result.fixedDiagrams,
        failedDiagrams: result.failedDiagrams,
        processingTime: result.processingTime
      });

    } catch (error) {
      logger.error('Markdown processing failed:', error);
      result.success = false;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Extract all Mermaid diagrams from markdown
   * @param {string} content - Markdown content
   * @returns {Array} Array of diagram objects
   */
  extractMermaidDiagrams(content) {
    const diagrams = [];
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/g;
    let match;
    let index = 0;

    while ((match = mermaidRegex.exec(content)) !== null) {
      const diagramContent = match[1].trim();
      if (diagramContent) {
        diagrams.push({
          id: `diagram_${++index}`,
          originalContent: diagramContent,
          fullMatch: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }

    return diagrams;
  }

  /**
   * Fix a diagram iteratively until valid or max iterations reached
   * @param {Object} diagram - Diagram object
   * @param {Object} options - Fix options
   * @returns {Object} Fix result
   */
  async fixDiagramIteratively(diagram, options = {}) {
    const maxIter = options.maxIterations || this.maxIterations;
    let content = diagram.originalContent;
    let iteration = 0;
    let isValid = false;
    let wasFixed = false;
    const history = [];

    logger.info(`Processing diagram ${diagram.id}`);

    while (iteration < maxIter && !isValid) {
      iteration++;

      // Validate current content
      const validationResult = await this.validator.validateDiagram({
        id: diagram.id,
        content: content,
        type: this.detectDiagramType(content)
      }, { autoFix: true });

      history.push({
        iteration,
        valid: validationResult.valid,
        autoFixed: validationResult.autoFixed || false,
        errorCount: validationResult.errors.length,
        fixCount: validationResult.appliedFixes ? validationResult.appliedFixes.length : 0
      });

      if (validationResult.valid) {
        isValid = true;
        if (validationResult.autoFixed) {
          wasFixed = true;
          content = validationResult.fixedContent;
        }
      } else if (validationResult.autoFixed) {
        wasFixed = true;
        content = validationResult.fixedContent;
      } else {
        // No more fixes available
        break;
      }
    }

    return {
      id: diagram.id,
      success: isValid,
      wasFixed: wasFixed,
      originalContent: diagram.originalContent,
      fixedContent: content,
      iterations: iteration,
      history: history
    };
  }

  /**
   * Detect diagram type from content
   * @param {string} content - Diagram content
   * @returns {string} Diagram type
   */
  detectDiagramType(content) {
    // Delegate to the validator's detector — it knows all 36 diagram-type
    // keywords (mindmap, c4, quadrant, requirement, kanban, sankey, etc.),
    // not just the 10 this method used to cover. Without delegation the
    // unknown types silently fell through to 'flowchart' and got rejected
    // by the wrong parser (false-positive for valid mindmap/c4/quadrant docs).
    return this.validator.detectDiagramType(content);
  }

  /**
   * Replace diagram in markdown with fixed version
   * @param {string} markdown - Full markdown content
   * @param {string} originalDiagram - Original diagram content
   * @param {string} fixedDiagram - Fixed diagram content
   * @returns {string} Updated markdown
   */
  replaceDiagramInMarkdown(markdown, originalDiagram, fixedDiagram) {
    // Create the full code block patterns
    const originalBlock = '```mermaid\n' + originalDiagram + '\n```';
    const fixedBlock = '```mermaid\n' + fixedDiagram + '\n```';
    
    // Replace the first occurrence
    return markdown.replace(originalBlock, fixedBlock);
  }

  /**
   * Generate detailed report of fixes
   * @param {Object} result - Processing result
   * @returns {string} Formatted report
   */
  generateReport(result) {
    let report = '# Mermaid Diagram Fix Report\n\n';
    
    report += `## Summary\n`;
    report += `- Total Diagrams: ${result.totalDiagrams}\n`;
    report += `- Fixed Successfully: ${result.fixedDiagrams}\n`;
    report += `- Failed to Fix: ${result.failedDiagrams}\n`;
    report += `- Total Iterations: ${result.totalIterations}\n`;
    report += `- Processing Time: ${result.processingTime}ms\n`;
    report += `- Overall Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}\n\n`;

    if (result.diagrams.length > 0) {
      report += `## Diagram Details\n\n`;
      
      result.diagrams.forEach((diagram, index) => {
        report += `### Diagram ${index + 1} (${diagram.id})\n`;
        report += `- Status: ${diagram.success ? '✓ Valid' : '✗ Invalid'}\n`;
        report += `- Was Fixed: ${diagram.wasFixed ? 'Yes' : 'No'}\n`;
        report += `- Iterations: ${diagram.iterations}\n`;
        
        if (diagram.history.length > 0) {
          report += `- Fix History:\n`;
          diagram.history.forEach(h => {
            report += `  - Iteration ${h.iteration}: `;
            report += `${h.valid ? 'Valid' : 'Invalid'}, `;
            report += `${h.fixCount} fixes applied, `;
            report += `${h.errorCount} errors remaining\n`;
          });
        }
        
        report += '\n';
      });
    }

    return report;
  }

  /**
   * Validate markdown without fixing
   * @param {string} markdownContent - Markdown content
   * @returns {Object} Validation result
   */
  async validateMarkdown(markdownContent) {
    const diagrams = this.extractMermaidDiagrams(markdownContent);
    const results = [];

    for (const diagram of diagrams) {
      const validationResult = await this.validator.validateDiagram({
        id: diagram.id,
        content: diagram.originalContent,
        type: this.detectDiagramType(diagram.originalContent)
      }, { autoFix: false });

      results.push({
        id: diagram.id,
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings
      });
    }

    return {
      totalDiagrams: diagrams.length,
      validDiagrams: results.filter(r => r.valid).length,
      invalidDiagrams: results.filter(r => !r.valid).length,
      results: results
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.validator) {
      this.validator.cleanup();
    }
  }
}

module.exports = MarkdownMermaidFixer;

// Made with Bob
