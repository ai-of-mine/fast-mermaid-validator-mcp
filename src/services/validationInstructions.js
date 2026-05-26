/**
 * Validation Instructions Service
 * Provides LLM-friendly error messages and fix instructions for invalid Mermaid diagrams
 * Author: Gregorio Elias Roecker Momm
 */

const SyntaxRuleLoader = require('./syntaxRuleLoader');

class ValidationInstructions {
  constructor() {
    this.syntaxRuleLoader = new SyntaxRuleLoader();
    this.generalInstructions = this.getGeneralInstructions();
    this.diagramTypeInstructions = this.getDiagramTypeInstructions();
  }

  /**
   * Generate applicable syntax rules as plain text for LLM prompts
   * @param {string} diagramType - Type of diagram
   * @param {Array} errors - Validation errors
   * @param {string} content - Original diagram content
   * @returns {string} Plain text syntax rules for LLM prompts
   */
  generateApplicableSyntax(diagramType, errors, content) {
    // Load rules from external files
    const syntaxRules = this.syntaxRuleLoader.getRules(diagramType);

    // Analyze common issues in the provided content
    const commonIssues = this.analyzeCommonErrors(errors, content);

    let syntaxText = syntaxRules;

    // Add detected issues if any
    if (commonIssues.length > 0) {
      syntaxText += '\n\nDETECTED ISSUES IN YOUR DIAGRAM:\n';
      commonIssues.forEach(issue => {
        syntaxText += `- ${issue.description}: ${issue.fix}\n`;
      });
    }

    return syntaxText.trim();
  }

  /**
   * General Mermaid syntax instructions
   */
  getGeneralInstructions() {
    return {
      title: 'Mermaid Diagram Syntax Guidelines',
      rules: [
        {
          category: 'Node Identifiers',
          rules: [
            'MUST start with a letter (A-Z, a-z)',
            'CAN contain letters, numbers, and underscores only',
            'CANNOT contain spaces, hyphens, periods, or special characters',
            'ARE case-sensitive (A and a are different)',
            'Examples: \'A\', \'Node1\', \'Process_2\', \'START\''
          ],
          invalid: ['\'1Node\'', '\'Node-1\'', '\'Node.1\'', '\'Node 1\'', '\'A-B\'']
        },
        {
          category: 'Text Content',
          rules: [
            'ALWAYS use quotes for text with spaces or special characters',
            'USE ["text"] format for complex strings',
            'ESCAPE quotes inside text with backslash',
            'USE <br/> for line breaks, never \\n',
            'SUPPORT HTML entities: &lt;, &gt;, &amp;'
          ],
          examples: [
            'A["Process with $100 value"]',
            'B["Line 1<br/>Line 2<br/>Line 3"]',
            'C["Text with \\"quotes\\""]'
          ]
        },
        {
          category: 'Connections',
          rules: [
            'Use standard arrow syntax for connections',
            'Label decision branches clearly',
            'Ensure all nodes are properly connected',
            'No orphaned or unreachable nodes'
          ]
        }
      ]
    };
  }

  /**
   * Diagram-type-specific instructions
   */
  getDiagramTypeInstructions() {
    return {
      flowchart: {
        title: 'Flowchart Syntax',
        syntax: 'flowchart TD',
        elements: {
          shapes: {
            '[Rectangle]': 'Default process step',
            '([Stadium])': 'Start/End points',
            '{Diamond}': 'Decision points',
            '[(Database)]': 'Data storage',
            '[[Subroutine]]': 'Function/method calls',
            '((Circle))': 'Connectors',
            '[/Parallelogram/]': 'Input/Output operations'
          },
          arrows: {
            '-->': 'Standard flow',
            '-.->': 'Dotted flow',
            '==>': 'Thick flow',
            '--x': 'Flow with cross',
            '-->|text|': 'Labeled flow'
          }
        },
        example: `flowchart TD
    A([Start]) --> B{Check Input}
    B -->|Valid| C[Process Data]
    B -->|Invalid| D[Show Error]
    C --> E[(Save to DB)]
    E --> F([End])
    D --> F`
      },

      sequenceDiagram: {
        title: 'Sequence Diagram Syntax',
        syntax: 'sequenceDiagram',
        elements: {
          participants: 'Define with: participant A as Actor',
          arrows: {
            '->>': 'Synchronous message',
            '-->>': 'Return/Response',
            '-x': 'Lost message',
            '-)': 'Async message',
            '->>+': 'Activate lifeline',
            '->>-': 'Deactivate lifeline'
          },
          features: [
            'Note over A: Comment text',
            'Note left of A: Left note',
            'Note right of A: Right note',
            'alt/else/end blocks for conditions',
            'loop/end blocks for iterations'
          ]
        }
      },

      classDiagram: {
        title: 'Class Diagram Syntax',
        syntax: 'classDiagram',
        elements: {
          visibility: {
            '+': 'Public',
            '-': 'Private',
            '#': 'Protected',
            '~': 'Package/Internal'
          },
          relationships: {
            '<|--': 'Inheritance',
            '*--': 'Composition',
            'o--': 'Aggregation',
            '-->': 'Association',
            '--': 'Link (no arrow)',
            '..>': 'Dependency',
            '..|>': 'Realization'
          },
          methods: 'method(param: type): returnType'
        }
      },

      erDiagram: {
        title: 'Entity Relationship Diagram Syntax',
        syntax: 'erDiagram',
        elements: {
          relationships: {
            '||--||': 'One to one',
            '||--o{': 'One to many',
            'o{--o{': 'Many to many',
            '||--o|': 'One to zero or one',
            '}o--||': 'Zero or more to one'
          },
          attributes: {
            'PK': 'Primary Key',
            'FK': 'Foreign Key',
            'UK': 'Unique Key'
          },
          types: 'string, int, boolean, date, decimal, etc.'
        }
      },

      default: {
        title: 'General Mermaid Syntax',
        instructions: [
          'Declare diagram type at the top',
          'Use valid node identifiers (letters, numbers, underscores)',
          'Quote text with spaces or special characters',
          'Use proper arrow syntax for connections',
          'Include meaningful labels and descriptions'
        ]
      }
    };
  }

  /**
   * Analyze common error patterns
   */
  analyzeCommonErrors(errors, content) {
    const commonIssues = [];

    // Check for invalid node IDs
    const invalidIds = content.match(/\b\d+\w*|\w*[-.\s]\w*/g);
    if (invalidIds) {
      commonIssues.push({
        type: 'invalid_node_ids',
        description: 'Node IDs contain invalid characters',
        examples: invalidIds.slice(0, 3),
        fix: 'Replace with valid identifiers (letters, numbers, underscores only)'
      });
    }

    // Check for unquoted special text
    const unquotedSpecial = content.match(/\[[^"\]]*[(){}$%@#&*+\-.,;:!?\/\\][^"\]]*\]/g);
    if (unquotedSpecial) {
      commonIssues.push({
        type: 'unquoted_special_text',
        description: 'Text with special characters not properly quoted',
        examples: unquotedSpecial.slice(0, 3),
        fix: 'Wrap text in quotes: ["text with special chars"]'
      });
    }

    // Check for literal line breaks
    if (content.includes('\\n') || content.split('\n').length > content.split('<br/>').length + 5) {
      commonIssues.push({
        type: 'literal_line_breaks',
        description: 'Literal line breaks used instead of <br/>',
        fix: 'Replace \\n or literal breaks with <br/> tags'
      });
    }

    return commonIssues;
  }

  /**
   * Generate specific fix suggestions based on errors
   */
  generateFixSuggestions(diagramType, errors, content) {
    const suggestions = [];

    // Type-specific suggestions
    switch (diagramType) {
      case 'flowchart':
      case 'graph':
        if (!content.includes('([') && !content.includes('{')) {
          suggestions.push('Consider using different node shapes: ([Start]), {Decision}, [(Database)]');
        }
        break;

      case 'sequenceDiagram':
        if (!content.includes('participant')) {
          suggestions.push('Define participants: participant A as Actor');
        }
        break;

      case 'erDiagram':
        if (!content.includes('PK') && !content.includes('FK')) {
          suggestions.push('Add key constraints: column_name datatype PK/FK');
        }
        break;
    }

    // General syntax fixes
    if (errors.some(e => e.message && e.message.includes('unexpected'))) {
      suggestions.push('Check for syntax errors: invalid characters, missing quotes, or malformed connections');
    }

    return suggestions;
  }

  /**
   * Extract rules-only content from general instructions
   */
  extractRulesOnly(generalInstructions) {
    return generalInstructions.rules.map(category => ({
      category: category.category,
      rules: category.rules
    }));
  }

  /**
   * Extract type-specific rules without examples
   */
  extractTypeRules(typeInstructions) {
    if (typeInstructions.elements) {
      return {
        title: typeInstructions.title,
        syntax: typeInstructions.syntax,
        elements: typeInstructions.elements,
        features: typeInstructions.features
      };
    }
    return {
      title: typeInstructions.title,
      instructions: typeInstructions.instructions
    };
  }

  /**
   * Get concise syntax reference for diagram type
   */
  getSyntaxReference(diagramType) {
    const references = {
      flowchart: {
        declaration: 'flowchart TD (or LR, BT, RL)',
        nodeShapes: {
          '[text]': 'Rectangle',
          '([text])': 'Stadium/Pill',
          '{text}': 'Rhombus/Diamond',
          '[(text)]': 'Database',
          '[[text]]': 'Subroutine',
          '((text))': 'Circle'
        },
        arrows: {
          '-->': 'Standard arrow',
          '-.->': 'Dotted arrow',
          '==>': 'Thick arrow',
          '-->|text|': 'Labeled arrow'
        }
      },
      sequenceDiagram: {
        declaration: 'sequenceDiagram',
        participants: 'participant A as Actor',
        arrows: {
          '->>': 'Synchronous message',
          '-->>': 'Return message',
          '-x': 'Lost message',
          '-)': 'Async message'
        }
      },
      erDiagram: {
        declaration: 'erDiagram',
        entitySyntax: 'ENTITY_NAME { datatype column_name constraints }',
        relationships: {
          '||--||': 'One to one',
          '||--o{': 'One to many',
          'o{--o{': 'Many to many'
        },
        constraints: ['PK', 'FK', 'UK']
      },
      classDiagram: {
        declaration: 'classDiagram',
        visibility: {'+': 'public', '-': 'private', '#': 'protected'},
        relationships: {
          '<|--': 'Inheritance',
          '*--': 'Composition',
          'o--': 'Aggregation',
          '-->': 'Association'
        }
      }
    };

    return references[diagramType] || {
      declaration: diagramType,
      note: 'Refer to Mermaid documentation for specific syntax'
    };
  }
}

module.exports = ValidationInstructions;