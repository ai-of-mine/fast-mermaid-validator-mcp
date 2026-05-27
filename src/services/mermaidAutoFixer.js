/**
 * Mermaid Auto-Fixer Service
 * Automatically fixes common Mermaid syntax errors
 * Author: Gregorio Elias Roecker Momm
 */

const logger = require('../utils/logger');

class MermaidAutoFixer {
  constructor() {
    this.fixStats = {
      totalAttempts: 0,
      successfulFixes: 0,
      failedFixes: 0
    };
  }

  /**
   * Attempt to automatically fix common Mermaid syntax errors
   * @param {string} content - Original diagram content
   * @param {string} diagramType - Type of diagram
   * @param {Array} errors - Validation errors
   * @returns {Object} Fix result with fixed content and applied fixes
   */
  autoFix(content, diagramType, errors = []) {
    this.fixStats.totalAttempts++;
    
    const result = {
      originalContent: content,
      fixedContent: content,
      appliedFixes: [],
      fixable: false,
      confidence: 0
    };

    try {
      let fixedContent = content;
      const appliedFixes = [];

      // Apply fixes in order of priority
      const fixes = [
        { name: 'Missing Quotes', fn: this.fixMissingQuotes.bind(this) },
        { name: 'Invalid Node IDs', fn: this.fixInvalidNodeIds.bind(this) },
        { name: 'Line Breaks', fn: this.fixLineBreaks.bind(this) },
        { name: 'Arrow Syntax', fn: this.fixArrowSyntax.bind(this) },
        { name: 'Whitespace Issues', fn: this.fixWhitespaceIssues.bind(this) },
        { name: 'Special Characters', fn: this.fixSpecialCharacters.bind(this) },
        { name: 'Unclosed Brackets', fn: this.fixUnclosedBrackets.bind(this) },
        { name: 'Invalid Connections', fn: this.fixInvalidConnections.bind(this) },
        { name: 'Subgraph Syntax', fn: this.fixSubgraphSyntax.bind(this) },
        { name: 'Class Definitions', fn: this.fixClassDefinitions.bind(this) },
        { name: 'Style Definitions', fn: this.fixStyleDefinitions.bind(this) },
        { name: 'Link Syntax', fn: this.fixLinkSyntax.bind(this) },
        { name: 'Comment Syntax', fn: this.fixCommentSyntax.bind(this) }
      ];

      for (const fix of fixes) {
        const fixResult = fix.fn(fixedContent, diagramType, errors);
        if (fixResult.modified) {
          fixedContent = fixResult.content;
          appliedFixes.push({
            name: fix.name,
            description: fixResult.description,
            changes: fixResult.changes
          });
        }
      }

      result.fixedContent = fixedContent;
      result.appliedFixes = appliedFixes;
      result.fixable = appliedFixes.length > 0;
      result.confidence = this.calculateConfidence(appliedFixes, content, fixedContent);

      if (result.fixable) {
        this.fixStats.successfulFixes++;
        logger.info('Auto-fix applied', {
          diagramType,
          appliedFixes: appliedFixes.length,
          confidence: result.confidence
        });
      }

    } catch (error) {
      this.fixStats.failedFixes++;
      logger.error('Auto-fix failed:', error);
      result.error = error.message;
    }

    return result;
  }

  /**
   * Fix missing quotes around text with spaces or special characters
   */
  fixMissingQuotes(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    // Pattern: Node shapes with unquoted text containing spaces or special chars
    const patterns = [
      // Flowchart/Graph nodes: A[text with spaces] -> A["text with spaces"]
      {
        regex: /(\w+)\[([^\]"]+(?:\s+|[(){}$%@#&*+\-.,;:!?\/\\])[^\]"]*)\]/g,
        replacement: (match, id, text) => {
          // Don't quote if already has quotes or is a shape modifier
          if (text.includes('"') || text.match(/^[(\[{]/)) return match;
          result.changes.push(`Quoted text in node ${id}: "${text.trim()}"`);
          return `${id}["${text.trim()}"]`;
        }
      },
      // Sequence diagram messages: A->>B: text with spaces -> A->>B: "text with spaces"
      {
        regex: /(->>|-->>|-x|-\))\s*([A-Za-z_]\w*)\s*:\s*([^"\n]+(?:\s+|[(){}$%@#&*+\-.,;:!?\/\\])[^"\n]*?)(?=\n|$)/g,
        replacement: (match, arrow, target, text) => {
          if (text.includes('"')) return match;
          const trimmed = text.trim();
          if (trimmed && !trimmed.startsWith('"')) {
            result.changes.push(`Quoted message text: "${trimmed}"`);
            return `${arrow} ${target}: "${trimmed}"`;
          }
          return match;
        }
      },
      // Arrow labels: -->|text with spaces| -> -->|"text with spaces"|
      {
        regex: /(-->|\.\.>|==>)\s*\|([^|"]+(?:\s+|[(){}$%@#&*+\-.,;:!?\/\\])[^|"]*)\|/g,
        replacement: (match, arrow, text) => {
          if (text.includes('"')) return match;
          result.changes.push(`Quoted arrow label: "${text.trim()}"`);
          return `${arrow}|"${text.trim()}"|`;
        }
      }
    ];

    patterns.forEach(pattern => {
      modified = modified.replace(pattern.regex, pattern.replacement);
    });

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Added quotes around text with spaces or special characters';

    return result;
  }

  /**
   * Fix invalid node identifiers
   */
  fixInvalidNodeIds(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    // Fix node IDs that start with numbers or contain invalid characters
    const invalidIdPattern = /\b(\d+\w+|[\w-]+[-.][\w-]+)\b(?=\s*[\[\({])/g;
    
    modified = modified.replace(invalidIdPattern, (match) => {
      // Generate valid ID
      let validId = match.replace(/^(\d+)/, 'Node$1')  // Prefix numbers
                         .replace(/[-.\s]/g, '_');      // Replace invalid chars
      
      if (validId !== match) {
        result.changes.push(`Renamed invalid ID "${match}" to "${validId}"`);
        return validId;
      }
      return match;
    });

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Fixed invalid node identifiers';

    return result;
  }

  /**
   * Fix line break issues
   */
  fixLineBreaks(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    // Replace literal \n with <br/>
    if (modified.includes('\\n')) {
      modified = modified.replace(/\\n/g, '<br/>');
      result.changes.push('Replaced \\n with <br/>');
    }

    // Fix multiple consecutive line breaks in text
    const multiBreakPattern = /(<br\/>){3,}/g;
    if (multiBreakPattern.test(modified)) {
      modified = modified.replace(multiBreakPattern, '<br/><br/>');
      result.changes.push('Reduced excessive line breaks');
    }

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Fixed line break syntax';

    return result;
  }

  /**
   * Fix arrow syntax issues
   */
  fixArrowSyntax(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    if (diagramType === 'sequenceDiagram') {
      // Fix single dash arrows to double dash
      const singleDashPattern = /(\w+)\s*->\s*(\w+)/g;
      modified = modified.replace(singleDashPattern, (match, from, to) => {
        result.changes.push(`Fixed arrow syntax: ${from} -> ${to} to ${from} ->> ${to}`);
        return `${from} ->> ${to}`;
      });

      // Fix wrong direction arrows
      const wrongDirectionPattern = /(\w+)\s*<<--\s*(\w+)/g;
      modified = modified.replace(wrongDirectionPattern, (match, from, to) => {
        result.changes.push(`Fixed arrow direction: ${from} <<-- ${to} to ${to} -->> ${from}`);
        return `${to} -->> ${from}`;
      });

      // Fix triple arrows
      const tripleArrowPattern = /(\w+)\s*->>>+\s*(\w+)/g;
      modified = modified.replace(tripleArrowPattern, (match, from, to) => {
        result.changes.push(`Fixed triple arrow: ${from} ->>> ${to} to ${from} ->> ${to}`);
        return `${from} ->> ${to}`;
      });
    }

    // Fix invalid arrow syntax in flowcharts
    if (diagramType === 'flowchart' || diagramType === 'graph') {
      // Fix ~~> to -->
      modified = modified.replace(/~~>/g, () => {
        result.changes.push('Fixed invalid arrow ~~> to -->');
        return '-->';
      });

      // Fix incomplete arrows
      const incompletePattern = /(\w+)\s*-->\s*$/gm;
      modified = modified.replace(incompletePattern, (match, from) => {
        result.changes.push(`Removed incomplete arrow from ${from}`);
        return from;
      });
    }

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Fixed arrow syntax';

    return result;
  }

  /**
   * Fix whitespace issues
   */
  fixWhitespaceIssues(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    // Remove trailing whitespace
    const lines = modified.split('\n');
    const trimmedLines = lines.map(line => line.trimEnd());
    
    if (trimmedLines.some((line, i) => line !== lines[i])) {
      result.changes.push('Removed trailing whitespace');
    }

    // Remove excessive blank lines (more than 2 consecutive)
    modified = trimmedLines.join('\n').replace(/\n{4,}/g, '\n\n\n');
    
    // Ensure single space around arrows
    modified = modified.replace(/\s*(-->|\.\.>|==>|->>|-->>)\s*/g, ' $1 ');

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Fixed whitespace issues';

    return result;
  }

  /**
   * Fix special character issues
   */
  fixSpecialCharacters(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    // Escape unescaped quotes inside quoted text
    const quotedTextPattern = /\["([^"\\]*(?:\\.[^"\\]*)*)"\]/g;
    modified = modified.replace(quotedTextPattern, (match, text) => {
      // Check if there are unescaped quotes
      const hasUnescapedQuotes = /(?<!\\)"/.test(text);
      if (hasUnescapedQuotes) {
        const escaped = text.replace(/(?<!\\)"/g, '\\"');
        result.changes.push('Escaped quotes in text');
        return `["${escaped}"]`;
      }
      return match;
    });

    // Fix HTML entities that should be escaped
    const htmlEntityPattern = /\[([^\]]*[<>&][^\]]*)\]/g;
    modified = modified.replace(htmlEntityPattern, (match, text) => {
      if (!text.includes('"') && !text.includes('<br/>')) {
        let fixed = text.replace(/</g, '<')
                        .replace(/>/g, '>')
                        .replace(/&(?!lt;|gt;|amp;)/g, '&');
        if (fixed !== text) {
          result.changes.push('Escaped HTML entities');
          return `["${fixed}"]`;
        }
      }
      return match;
    });

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Fixed special character issues';

    return result;
  }

  /**
   * Fix unclosed brackets and parentheses
   */
  fixUnclosedBrackets(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    const lines = modified.split('\n');
    const fixedLines = lines.map(line => {
      let fixed = line;
      
      // Count brackets
      const openSquare = (line.match(/\[/g) || []).length;
      const closeSquare = (line.match(/\]/g) || []).length;
      const openCurly = (line.match(/\{/g) || []).length;
      const closeCurly = (line.match(/\}/g) || []).length;
      const openParen = (line.match(/\(/g) || []).length;
      const closeParen = (line.match(/\)/g) || []).length;

      // Fix unclosed brackets
      if (openSquare > closeSquare) {
        fixed += ']'.repeat(openSquare - closeSquare);
        result.changes.push('Added missing closing square bracket');
      }
      if (openCurly > closeCurly) {
        fixed += '}'.repeat(openCurly - closeCurly);
        result.changes.push('Added missing closing curly bracket');
      }
      if (openParen > closeParen) {
        fixed += ')'.repeat(openParen - closeParen);
        result.changes.push('Added missing closing parenthesis');
      }

      return fixed;
    });

    modified = fixedLines.join('\n');

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Fixed unclosed brackets';

    return result;
  }

  /**
   * Fix invalid connection syntax
   */
  fixInvalidConnections(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    // Remove lines that start with arrows (invalid syntax)
    const lines = modified.split('\n');
    const fixedLines = lines.filter(line => {
      const trimmed = line.trim();
      if (trimmed.match(/^(-->|\.\.>|==>|->>|-->>)/)) {
        result.changes.push(`Removed invalid line starting with arrow: ${trimmed.substring(0, 30)}...`);
        return false;
      }
      return true;
    });

    modified = fixedLines.join('\n');

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Fixed invalid connections';

    return result;
  }

  /**
   * Fix subgraph syntax issues
   */
  fixSubgraphSyntax(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    if (diagramType === 'flowchart' || diagramType === 'graph') {
      // Fix subgraph without proper end
      const subgraphPattern = /subgraph\s+([^\n]+)/g;
      const endPattern = /\bend\b/g;
      
      const subgraphCount = (modified.match(subgraphPattern) || []).length;
      const endCount = (modified.match(endPattern) || []).length;
      
      if (subgraphCount > endCount) {
        const missing = subgraphCount - endCount;
        modified += '\n' + 'end\n'.repeat(missing);
        result.changes.push(`Added ${missing} missing 'end' statement(s) for subgraph(s)`);
      }

      // Fix subgraph with invalid ID
      modified = modified.replace(/subgraph\s+(\d+\w*|\w*[-.\s]\w*)/g, (match, id) => {
        const validId = id.replace(/^(\d+)/, 'Sub$1').replace(/[-.\s]/g, '_');
        if (validId !== id) {
          result.changes.push(`Fixed subgraph ID: "${id}" to "${validId}"`);
          return `subgraph ${validId}`;
        }
        return match;
      });
    }

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Fixed subgraph syntax';

    return result;
  }

  /**
   * Fix class definition syntax
   */
  fixClassDefinitions(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    if (diagramType === 'flowchart' || diagramType === 'graph') {
      // Fix class definitions with invalid names
      modified = modified.replace(/class\s+([^\s,]+)\s+(\d+\w*|\w*[-.\s]\w*)/g, (match, nodes, className) => {
        const validClassName = className.replace(/^(\d+)/, 'Class$1').replace(/[-.\s]/g, '_');
        if (validClassName !== className) {
          result.changes.push(`Fixed class name: "${className}" to "${validClassName}"`);
          return `class ${nodes} ${validClassName}`;
        }
        return match;
      });

      // Fix classDef with missing properties
      modified = modified.replace(/classDef\s+(\w+)\s*$/gm, (match, className) => {
        result.changes.push(`Added default style to classDef ${className}`);
        return `classDef ${className} fill:#f9f,stroke:#333,stroke-width:2px`;
      });
    }

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Fixed class definitions';

    return result;
  }

  /**
   * Fix style definition syntax
   */
  fixStyleDefinitions(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    if (diagramType === 'flowchart' || diagramType === 'graph') {
      // Fix style with missing properties
      modified = modified.replace(/style\s+(\w+)\s*$/gm, (match, nodeId) => {
        result.changes.push(`Added default style to node ${nodeId}`);
        return `style ${nodeId} fill:#f9f,stroke:#333,stroke-width:2px`;
      });

      // Fix style with invalid CSS
      modified = modified.replace(/style\s+(\w+)\s+([^,\n]+)(?!,)/g, (match, nodeId, props) => {
        if (!props.includes(':')) {
          result.changes.push(`Fixed style syntax for node ${nodeId}`);
          return `style ${nodeId} fill:${props}`;
        }
        return match;
      });
    }

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Fixed style definitions';

    return result;
  }

  /**
   * Fix link/click syntax
   */
  fixLinkSyntax(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    if (diagramType === 'flowchart' || diagramType === 'graph') {
      // Fix click without proper callback
      modified = modified.replace(/click\s+(\w+)\s*$/gm, (match, nodeId) => {
        result.changes.push(`Removed incomplete click definition for ${nodeId}`);
        return '';
      });

      // Fix link without proper URL
      modified = modified.replace(/link\s+(\w+)\s+"([^"]+)"\s*$/gm, (match, nodeId, text) => {
        if (!text.startsWith('http')) {
          result.changes.push(`Fixed link for ${nodeId} - added https://`);
          return `link ${nodeId} "https://${text}"`;
        }
        return match;
      });
    }

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Fixed link/click syntax';

    return result;
  }

  /**
   * Fix comment syntax
   */
  fixCommentSyntax(content, diagramType, errors) {
    const result = { modified: false, content, changes: [] };
    let modified = content;

    // Fix single-line comments that should be %% not #
    const lines = modified.split('\n');
    const fixedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') && !trimmed.startsWith('##')) {
        result.changes.push(`Fixed comment syntax: # to %%`);
        return line.replace(/^\s*#/, '%%');
      }
      return line;
    });

    modified = fixedLines.join('\n');

    result.modified = modified !== content;
    result.content = modified;
    result.description = 'Fixed comment syntax';

    return result;
  }

  /**
   * Calculate confidence score for the fixes
   */
  calculateConfidence(appliedFixes, originalContent, fixedContent) {
    if (appliedFixes.length === 0) return 0;

    let confidence = 0;
    const totalChanges = appliedFixes.reduce((sum, fix) => sum + (fix.changes?.length || 1), 0);

    // Base confidence on number and type of fixes
    if (totalChanges <= 3) {
      confidence = 0.9; // High confidence for few simple fixes
    } else if (totalChanges <= 7) {
      confidence = 0.7; // Medium confidence
    } else {
      confidence = 0.5; // Lower confidence for many changes
    }

    // Adjust based on content change ratio
    const changeRatio = Math.abs(fixedContent.length - originalContent.length) / originalContent.length;
    if (changeRatio > 0.3) {
      confidence *= 0.8; // Reduce confidence if content changed significantly
    }

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Get fix statistics
   */
  getStats() {
    return {
      ...this.fixStats,
      successRate: this.fixStats.totalAttempts > 0 
        ? Math.round((this.fixStats.successfulFixes / this.fixStats.totalAttempts) * 100) 
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.fixStats = {
      totalAttempts: 0,
      successfulFixes: 0,
      failedFixes: 0
    };
  }

  /**
   * Generate fix report
   */
  generateFixReport(fixResult) {
    if (!fixResult.fixable) {
      return 'No automatic fixes could be applied.';
    }

    let report = `Applied ${fixResult.appliedFixes.length} automatic fix(es) with ${fixResult.confidence * 100}% confidence:\n\n`;
    
    fixResult.appliedFixes.forEach((fix, index) => {
      report += `${index + 1}. ${fix.name}\n`;
      report += `   ${fix.description}\n`;
      if (fix.changes && fix.changes.length > 0) {
        fix.changes.forEach(change => {
          report += `   - ${change}\n`;
        });
      }
      report += '\n';
    });

    return report;
  }
}

module.exports = MermaidAutoFixer;

// Made with Bob
