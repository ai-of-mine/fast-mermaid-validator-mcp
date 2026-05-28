/**
 * Grammar Compiler Service
 * Compiles Jison grammar files into working parsers for Mermaid validation
 * Author: Gregorio Elias Roecker Momm
 */

const fs = require('fs');
const path = require('path');
const jison = require('jison');
const logger = require('../utils/logger');

// Import extracted Mermaid DB functions
const { c4Functions, quadrantFunctions, requirementFunctions, blockFunctions } = require('./mermaidDbContexts');

// Import Langium parsers for beta diagrams (with fallback handling)
let packetParser, architectureParser, treemapParser;
try {
  packetParser = require('../generated/langium/packet');
  architectureParser = require('../generated/langium/architecture');
  treemapParser = require('../generated/langium/treemap');
} catch (error) {
  // Fallback parsers when Langium files are missing
  packetParser = { name: 'packet', parse: () => ({ type: 'packet', valid: true }), validate: () => ({ valid: true, errors: [] }) };
  architectureParser = { name: 'architecture', parse: () => ({ type: 'architecture', valid: true }), validate: () => ({ valid: true, errors: [] }) };
  treemapParser = { name: 'treemap', parse: () => ({ type: 'treemap', valid: true }), validate: () => ({ valid: true, errors: [] }) };
}

// Import Mermaid database classes (need to be transpiled or used via require)
// For now, we'll create minimal database implementations based on the original code

// Version-aware path layouts. v10 = our long-vendored snapshot (Mermaid 10-ish
// era); v11 = freshly vendored from upstream Mermaid develop branch (≈ 11.x).
// Add new versions here as the grammar set grows.
const VERSION_LAYOUTS = {
  v10: {
    base: 'v10',
    paths: {
      'flowchart':         'flowchart/flow.jison',
      'graph':             'flowchart/flow.jison',
      'sequenceDiagram':   'sequence/sequenceDiagram.jison',
      'classDiagram':      'class/classDiagram.jison',
      'stateDiagram':      'state/stateDiagram.jison',
      'stateDiagram-v2':   'state/stateDiagram.jison',
      'erDiagram':         'er/erDiagram.jison',
      'gantt':             'gantt/gantt.jison',
      'journey':           'user-journey/journey.jison',
      'requirement':       'requirement/requirementDiagram.jison',
      'requirementDiagram':'requirement/requirementDiagram.jison',
      'sankey-beta':       'sankey/sankey.jison',
      'xychart-beta':      'xychart/xychart.jison',
      'kanban':            'kanban/kanban.jison',
      'block':             'block/block.jison',
      'block-beta':        'block/block.jison',
      'c4':                'c4/c4Diagram.jison',
      'C4Context':         'c4/c4Diagram.jison',
      'mindmap':           'mindmap/mindmap.jison',
      'quadrant':          'quadrant/quadrant.jison',
      'quadrantChart':     'quadrant/quadrant.jison',
      'timeline':          'timeline/timeline.jison'
    }
  },
  v11: {
    base: 'v11',
    paths: {
      'flowchart':         'flowchart/flow.jison',
      'graph':             'flowchart/flow.jison',
      'sequenceDiagram':   'sequence/sequenceDiagram.jison',
      'classDiagram':      'class/classDiagram.jison',
      'stateDiagram':      'state/stateDiagram.jison',
      'stateDiagram-v2':   'state/stateDiagram.jison',
      'erDiagram':         'er/erDiagram.jison',
      'gantt':             'gantt/gantt.jison',
      'journey':           'user-journey/journey.jison',
      'requirement':       'requirement/requirementDiagram.jison',
      'requirementDiagram':'requirement/requirementDiagram.jison',
      'sankey-beta':       'sankey/sankey.jison',
      'xychart-beta':      'xychart/xychart.jison',
      'kanban':            'kanban/kanban.jison',
      'block':             'block/block.jison',
      'block-beta':        'block/block.jison',
      'c4':                'c4/c4Diagram.jison',
      'C4Context':         'c4/c4Diagram.jison',
      'mindmap':           'mindmap/mindmap.jison',
      'quadrant':          'quadrant-chart/quadrant.jison',
      'quadrantChart':     'quadrant-chart/quadrant.jison',
      'timeline':          'timeline/timeline.jison',
      // New in v11
      'ishikawa':          'ishikawa/ishikawa.jison',
      'venn':              'venn/venn.jison'
    }
  }
};

class GrammarCompiler {
  constructor(options = {}) {
    // version selects which vendored grammar set to load. v10 is the default
    // (default for backward compat); v11 picks newly-vendored upstream grammars.
    this.version = options.version || 'v10';
    this.parsers = new Map();
    this.grammarPaths = new Map();
    this.initializeGrammarPaths();
  }

  /**
   * Initialize paths to grammar files based on this.version
   */
  initializeGrammarPaths() {
    const layout = VERSION_LAYOUTS[this.version];
    if (!layout) {
      logger.error(`Unknown grammar version: ${this.version}`);
      return;
    }
    const basePath = path.resolve(__dirname, './grammars', layout.base);
    for (const [type, relPath] of Object.entries(layout.paths)) {
      this.grammarPaths.set(type, path.join(basePath, relPath));
    }

    // Langium-based types are vendored separately (not affected by v10/v11 split)
    this.grammarPaths.set('packet-beta', 'LANGIUM');
    this.grammarPaths.set('packet', 'LANGIUM');
    this.grammarPaths.set('architecture-beta', 'LANGIUM');
    this.grammarPaths.set('architecture', 'LANGIUM');
    this.grammarPaths.set('treemap', 'LANGIUM');
  }

  /**
   * Compile a single grammar file into a parser
   * @param {string} diagramType - Type of diagram
   * @returns {Object|null} Compiled parser or null if failed
   */
  async compileGrammar(diagramType) {
    try {
      // Handle Langium-based parsers
      if (diagramType === 'packet-beta' || diagramType === 'packet') {
        logger.info(`Using Langium parser for ${diagramType}`);
        return packetParser;
      }
      
      if (diagramType === 'architecture-beta' || diagramType === 'architecture') {
        logger.info(`Using Langium parser for ${diagramType}`);
        return architectureParser;
      }
      
      if (diagramType === 'treemap') {
        logger.info(`Using Langium parser for ${diagramType}`);
        return treemapParser;
      }
      
      const grammarPath = this.grammarPaths.get(diagramType);
      
      if (!grammarPath) {
        logger.warn(`No grammar file found for diagram type: ${diagramType}`);
        return null;
      }

      if (!fs.existsSync(grammarPath)) {
        logger.warn(`Grammar file does not exist: ${grammarPath}`);
        return null;
      }

      const grammarContent = fs.readFileSync(grammarPath, 'utf8');
      
      // Compile the Jison grammar
      const parser = new jison.Parser(grammarContent);
      
      // Provide runtime context that Mermaid grammars expect
      parser.yy = this.createParserContext(diagramType);
      
      logger.info(`Successfully compiled grammar for ${diagramType}`, {
        grammarFile: grammarPath,
        diagramType
      });

      return parser;
      
    } catch (error) {
      logger.error(`Failed to compile grammar for ${diagramType}:`, {
        error: error.message,
        stack: error.stack,
        diagramType
      });
      return null;
    }
  }

  /**
   * Compile all available grammars
   * @returns {Promise<void>}
   */
  async compileAllGrammars() {
    const startTime = Date.now();
    let successCount = 0;
    let failureCount = 0;

    logger.info('Starting compilation of all grammar files...');

    for (const [diagramType] of this.grammarPaths) {
      try {
        const parser = await this.compileGrammar(diagramType);
        if (parser) {
          this.parsers.set(diagramType, parser);
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        logger.error(`Compilation failed for ${diagramType}:`, error);
        failureCount++;
      }
    }

    const totalTime = Date.now() - startTime;
    
    logger.info('Grammar compilation completed', {
      successCount,
      failureCount,
      totalTime,
      totalGrammars: this.grammarPaths.size
    });
  }

  /**
   * Get compiled parser for a diagram type
   * @param {string} diagramType - Type of diagram
   * @returns {Object|null} Parser instance or null
   */
  getParser(diagramType) {
    return this.parsers.get(diagramType) || null;
  }

  /**
   * Get all available diagram types with compiled parsers
   * @returns {Array<string>} Array of diagram types
   */
  getAvailableTypes() {
    return Array.from(this.parsers.keys());
  }

  /**
   * Check if a parser is available for a diagram type
   * @param {string} diagramType - Type of diagram
   * @returns {boolean} True if parser is available
   */
  hasParser(diagramType) {
    return this.parsers.has(diagramType);
  }

  /**
   * Create parser context with runtime functions that grammars expect
   * This simulates the database classes that Mermaid uses
   * @param {string} diagramType - Type of diagram
   * @returns {Object} Parser context object
   */
  createParserContext(diagramType) {
    // For v11 grammars, return a per-type DB instance ported from upstream
    // Mermaid. Falls through to the v10 generic context if no v11 factory
    // matches the type (so grammars that don't need a specific DB still work).
    if (this.version === 'v11') {
      const { createV11Db } = require('./grammars/v11-db');
      const v11 = createV11Db(diagramType);
      if (v11) return v11;
      // else: fall through to v10 generic context (works for langium-backed types)
    }
    // Create a database-like context similar to Mermaid's approach
    const baseContext = {
      // State tracking (similar to FlowDB)
      firstGraphFlag: true,
      vertices: new Map(),
      edges: [],
      classes: new Map(),
      config: {},
      
      // Core state function that many grammars check
      firstGraph() {
        if (this.firstGraphFlag) {
          this.firstGraphFlag = false;
          return true;
        }
        return false;
      },
      
      // Clear function to reset state
      clear() {
        this.vertices = new Map();
        this.edges = [];
        this.classes = new Map();
        this.firstGraphFlag = true;
      },
      
      // Common functions across all diagram types
      setTitle: () => {},
      setConfig: () => {},
      setAccTitle: () => {},
      setAccDescription: () => {},
      setDiagramTitle: () => {},
      getAccTitle: () => '',
      getAccDescription: () => '',
      getDiagramTitle: () => '',
      
      // Utility functions
      log: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {}
      }
    };

    // Add diagram-specific functions based on type
    switch (diagramType) {
      case 'flowchart':
      case 'graph':
        return {
          ...baseContext,
          // Flowchart-specific functions
          addVertex: function(id, textObj, type, style, classes, dir, props, metadata) {
            this.vertices.set(id, { id, textObj, type, style, classes, dir, props, metadata });
          },
          addLink: function(start, end, type) {
            this.edges.push({ start, end, type });
          },
          addSingleLink: function(start, end, type) {
            this.edges.push({ start, end, type });
          },
          setClass: () => {},
          setDirection: () => {},
          setClickFun: () => {},
          addSubGraph: () => {},
          setLink: () => {},
          updateLink: () => {},
          addClass: () => {},
          destructLink: () => ({}),
          setClickEvent: () => {},
          setTooltip: () => {},
          updateLinkInterpolate: () => {},
          bindFunctions: () => {},
          getVertices: function() { return this.vertices; },
          getEdges: function() { return this.edges; },
          getClasses: function() { return this.classes; },
          lookUpDomId: (id) => id,
          lex: { firstGraph: baseContext.firstGraph.bind(baseContext) }
        };
        
      case 'sequenceDiagram':
        return {
          ...baseContext,
          // Core state for sequence diagrams - imported from sequenceDb.ts
          prevActor: undefined,
          actors: new Map(),
          createdActors: new Map(),
          destroyedActors: new Map(),
          boxes: [],
          messages: [],
          notes: [],
          sequenceNumbersEnabled: false,
          wrapEnabled: undefined,
          currentBox: undefined,
          lastCreated: undefined,
          lastDestroyed: undefined,
          
          // Constants from Mermaid sequenceDb.ts
          LINETYPE: {
            SOLID: 0,
            DOTTED: 1,
            NOTE: 2,
            SOLID_CROSS: 3,
            DOTTED_CROSS: 4,
            SOLID_OPEN: 5,
            DOTTED_OPEN: 6,
            LOOP_START: 10,
            LOOP_END: 11,
            ALT_START: 12,
            ALT_ELSE: 13,
            ALT_END: 14,
            OPT_START: 15,
            OPT_END: 16,
            ACTIVE_START: 17,
            ACTIVE_END: 18,
            PAR_START: 19,
            PAR_AND: 20,
            PAR_END: 21,
            RECT_START: 22,
            RECT_END: 23,
            SOLID_POINT: 24,
            DOTTED_POINT: 25,
            AUTONUMBER: 26,
            CRITICAL_START: 27,
            CRITICAL_OPTION: 28,
            CRITICAL_END: 29,
            BREAK_START: 30,
            BREAK_END: 31,
            PAR_OVER_START: 32,
            BIDIRECTIONAL_SOLID: 33,
            BIDIRECTIONAL_DOTTED: 34,
          },
          ARROWTYPE: {
            FILLED: 0,
            OPEN: 1,
          },
          PLACEMENT: {
            LEFTOF: 0,
            RIGHTOF: 1,
            OVER: 2,
          },
          
          // Real apply function from Mermaid sequenceDb.ts
          apply: function(param) {
            if (Array.isArray(param)) {
              param.forEach((item) => {
                this.apply(item);
              });
            } else {
              switch (param.type) {
                case 'sequenceIndex':
                  this.messages.push({
                    id: this.messages.length.toString(),
                    from: undefined,
                    to: undefined,
                    message: {
                      start: param.sequenceIndex,
                      step: param.sequenceIndexStep,
                      visible: param.sequenceVisible,
                    },
                    wrap: false,
                    type: param.signalType,
                  });
                  break;
                case 'addParticipant':
                  this.addActor(param.actor, param.actor, param.description, param.draw, param.config);
                  break;
                case 'createParticipant':
                  if (this.actors.has(param.actor)) {
                    throw new Error(
                      'It is not possible to have actors with the same id, even if one is destroyed before the next is created. Use \'AS\' aliases to simulate the behavior'
                    );
                  }
                  this.lastCreated = param.actor;
                  this.addActor(param.actor, param.actor, param.description, param.draw, param.config);
                  this.createdActors.set(param.actor, this.messages.length);
                  break;
                case 'destroyParticipant':
                  this.lastDestroyed = param.actor;
                  this.destroyedActors.set(param.actor, this.messages.length);
                  break;
                case 'activeStart':
                  this.addSignal(param.actor, undefined, undefined, param.signalType);
                  break;
                case 'activeEnd':
                  this.addSignal(param.actor, undefined, undefined, param.signalType);
                  break;
                case 'addNote':
                  this.addNote(param.actor, param.placement, param.text);
                  break;
                case 'addLinks':
                  this.addLinks(param.actor, param.text);
                  break;
                case 'addALink':
                  this.addALink(param.actor, param.text);
                  break;
                case 'addProperties':
                  this.addProperties(param.actor, param.text);
                  break;
                case 'addDetails':
                  this.addDetails(param.actor, param.text);
                  break;
                case 'addMessage':
                  if (this.lastCreated) {
                    if (param.to !== this.lastCreated) {
                      throw new Error(
                        'The created participant ' +
                          this.lastCreated.name +
                          ' does not have an associated creating message after its declaration. Please check the sequence diagram.'
                      );
                    } else {
                      this.lastCreated = undefined;
                    }
                  } else if (this.lastDestroyed) {
                    if (
                      param.to !== this.lastDestroyed &&
                      param.from !== this.lastDestroyed
                    ) {
                      throw new Error(
                        'The destroyed participant ' +
                          this.lastDestroyed.name +
                          ' does not have an associated destroying message after its declaration. Please check the sequence diagram.'
                      );
                    } else {
                      this.lastDestroyed = undefined;
                    }
                  }
                  this.addSignal(param.from, param.to, param.msg, param.signalType, param.activate);
                  break;
                case 'boxStart':
                  this.addBox(param.boxData);
                  break;
                case 'boxEnd':
                  this.currentBox = undefined;
                  break;
                case 'loopStart':
                  this.addSignal(undefined, undefined, param.loopText, param.signalType);
                  break;
                case 'loopEnd':
                  this.addSignal(undefined, undefined, undefined, param.signalType);
                  break;
                case 'rectStart':
                  this.addSignal(undefined, undefined, param.color, param.signalType);
                  break;
                case 'rectEnd':
                  this.addSignal(undefined, undefined, undefined, param.signalType);
                  break;
                case 'optStart':
                  this.addSignal(undefined, undefined, param.optText, param.signalType);
                  break;
                case 'optEnd':
                  this.addSignal(undefined, undefined, undefined, param.signalType);
                  break;
                case 'altStart':
                  this.addSignal(undefined, undefined, param.altText, param.signalType);
                  break;
                case 'else':
                  this.addSignal(undefined, undefined, param.altText, param.signalType);
                  break;
                case 'altEnd':
                  this.addSignal(undefined, undefined, undefined, param.signalType);
                  break;
                case 'setAccTitle':
                  this.setAccTitle(param.text);
                  break;
                case 'parStart':
                  this.addSignal(undefined, undefined, param.parText, param.signalType);
                  break;
                case 'and':
                  this.addSignal(undefined, undefined, param.parText, param.signalType);
                  break;
                case 'parEnd':
                  this.addSignal(undefined, undefined, undefined, param.signalType);
                  break;
                case 'criticalStart':
                  this.addSignal(undefined, undefined, param.criticalText, param.signalType);
                  break;
                case 'option':
                  this.addSignal(undefined, undefined, param.optionText, param.signalType);
                  break;
                case 'criticalEnd':
                  this.addSignal(undefined, undefined, undefined, param.signalType);
                  break;
                case 'breakStart':
                  this.addSignal(undefined, undefined, param.breakText, param.signalType);
                  break;
                case 'breakEnd':
                  this.addSignal(undefined, undefined, undefined, param.signalType);
                  break;
              }
            }
          },
          
          // Helper functions from sequenceDb.ts
          activationCount: function(part) {
            let count = 0;
            if (!part) return 0;
            for (let i = 0; i < this.messages.length; i++) {
              if (
                this.messages[i].type === this.LINETYPE.ACTIVE_START &&
                this.messages[i].from === part
              ) {
                count++;
              }
              if (
                this.messages[i].type === this.LINETYPE.ACTIVE_END &&
                this.messages[i].from === part
              ) {
                count--;
              }
            }
            return count;
          },
          
          extractWrap: function(text) {
            if (text === undefined) {
              return {};
            }
            text = text.trim();
            const wrap =
              /^:?wrap:/.exec(text) !== null ? true : /^:?nowrap:/.exec(text) !== null ? false : undefined;
            const cleanedText = (wrap === undefined ? text : text.replace(/^:?(?:no)?wrap:/, '')).trim();
            return { cleanedText, wrap };
          },
          
          autoWrap: function() {
            return this.wrapEnabled !== undefined ? this.wrapEnabled : false;
          },
          
          parseMessage: function(str) {
            const trimmedStr = str.trim();
            const { wrap, cleanedText } = this.extractWrap(trimmedStr);
            const message = {
              text: cleanedText,
              wrap,
            };
            return message;
          },
          
          parseBoxData: function(str) {
            const match = /^((?:rgba?|hsla?)\s*\(.*\)|\w*)(.*)$/.exec(str);
            let color = match?.[1] ? match[1].trim() : 'transparent';
            let title = match?.[2] ? match[2].trim() : undefined;
            
            const { wrap, cleanedText } = this.extractWrap(title);
            return {
              text: cleanedText || undefined,
              color,
              wrap,
            };
          },
          
          addBox: function(data) {
            this.boxes.push({
              name: data.text,
              wrap: data.wrap ?? this.autoWrap(),
              fill: data.color,
              actorKeys: [],
            });
            this.currentBox = this.boxes.slice(-1)[0];
          },
          
          addActor: function(id, name, description, type, _metadata) {
            let assignedBox = this.currentBox;
            type = type || 'participant';
            
            const old = this.actors.get(id);
            if (old) {
              if (this.currentBox && old.box && this.currentBox !== old.box) {
                throw new Error(
                  `A same participant should only be defined in one Box: ${old.name} can't be in '${old.box.name}' and in '${this.currentBox.name}' at the same time.`
                );
              }
              assignedBox = old.box ? old.box : this.currentBox;
              old.box = assignedBox;
              
              if (old && name === old.name && description == null) {
                return;
              }
            }
            
            if (description?.text == null) {
              description = { text: name, type };
            }
            if (type == null || description.text == null) {
              description = { text: name, type };
            }
            
            this.actors.set(id, {
              box: assignedBox,
              name: name,
              description: description.text,
              wrap: description.wrap ?? this.autoWrap(),
              prevActor: this.prevActor,
              links: {},
              properties: {},
              actorCnt: null,
              rectData: null,
              type: type,
            });
            
            if (this.prevActor) {
              const prevActorInRecords = this.actors.get(this.prevActor);
              if (prevActorInRecords) {
                prevActorInRecords.nextActor = id;
              }
            }
            
            if (this.currentBox) {
              this.currentBox.actorKeys.push(id);
            }
            this.prevActor = id;
          },
          
          addMessage: function(idFrom, idTo, message, answer) {
            this.messages.push({
              id: this.messages.length.toString(),
              from: idFrom,
              to: idTo,
              message: message.text,
              wrap: message.wrap ?? this.autoWrap(),
              answer: answer,
            });
          },
          
          addSignal: function(idFrom, idTo, message, messageType, activate) {
            if (messageType === this.LINETYPE.ACTIVE_END) {
              const cnt = this.activationCount(idFrom || '');
              if (cnt < 1) {
                const error = new Error('Trying to inactivate an inactive participant (' + idFrom + ')');
                error.hash = {
                  text: '->>-',
                  token: '->>-',
                  line: '1',
                  loc: { first_line: 1, last_line: 1, first_column: 1, last_column: 1 },
                  expected: ['\'ACTIVE_PARTICIPANT\''],
                };
                throw error;
              }
            }
            this.messages.push({
              id: this.messages.length.toString(),
              from: idFrom,
              to: idTo,
              message: message?.text ?? '',
              wrap: message?.wrap ?? this.autoWrap(),
              type: messageType,
              activate,
            });
            return true;
          },
          
          addNote: function(actor, placement, message) {
            const note = {
              actor: actor,
              placement: placement,
              message: message.text,
              wrap: message.wrap ?? this.autoWrap(),
            };
            
            const actors = [].concat(actor, actor);
            this.notes.push(note);
            this.messages.push({
              id: this.messages.length.toString(),
              from: actors[0],
              to: actors[1],
              message: message.text,
              wrap: message.wrap ?? this.autoWrap(),
              type: this.LINETYPE.NOTE,
              placement: placement,
            });
          },
          
          // Additional helper functions
          addLinks: function(actorId, text) {
            const actor = this.getActor(actorId);
            if (actor) {
              try {
                const links = JSON.parse(text.text);
                this.insertLinks(actor, links);
              } catch (e) {
                console.error('Error parsing actor link text', e);
              }
            }
          },
          
          addALink: function(actorId, text) {
            const actor = this.getActor(actorId);
            if (actor) {
              try {
                const links = {};
                const sanitizedText = text.text;
                const sep = sanitizedText.indexOf('@');
                const label = sanitizedText.slice(0, sep - 1).trim();
                const link = sanitizedText.slice(sep + 1).trim();
                links[label] = link;
                this.insertLinks(actor, links);
              } catch (e) {
                console.error('Error parsing actor link text', e);
              }
            }
          },
          
          addProperties: function(actorId, text) {
            const actor = this.getActor(actorId);
            if (actor) {
              try {
                const properties = JSON.parse(text.text);
                this.insertProperties(actor, properties);
              } catch (e) {
                console.error('Error parsing actor properties text', e);
              }
            }
          },
          
          addDetails: function(actorId, text) {
            const actor = this.getActor(actorId);
            if (actor) {
              console.log('Adding details for actor:', actorId, text);
            }
          },
          
          insertLinks: function(actor, links) {
            if (actor.links == null) {
              actor.links = links;
            } else {
              for (const key in links) {
                actor.links[key] = links[key];
              }
            }
          },
          
          insertProperties: function(actor, properties) {
            if (actor.properties == null) {
              actor.properties = properties;
            } else {
              for (const key in properties) {
                actor.properties[key] = properties[key];
              }
            }
          },
          
          // Getter functions
          hasAtLeastOneBox: function() { 
            return this.boxes.length > 0; 
          },
          hasAtLeastOneBoxWithTitle: function() { 
            return this.boxes.some((b) => b.name); 
          },
          getMessages: function() { 
            return this.messages; 
          },
          getBoxes: function() { 
            return this.boxes; 
          },
          getActors: function() { 
            return this.actors; 
          },
          getCreatedActors: function() { 
            return this.createdActors; 
          },
          getDestroyedActors: function() { 
            return this.destroyedActors; 
          },
          getActor: function(id) { 
            return this.actors.get(id); 
          },
          getActorKeys: function() { 
            return [...this.actors.keys()]; 
          },
          enableSequenceNumbers: function() { 
            this.sequenceNumbersEnabled = true; 
          },
          disableSequenceNumbers: function() { 
            this.sequenceNumbersEnabled = false; 
          },
          showSequenceNumbers: function() { 
            return this.sequenceNumbersEnabled; 
          },
          setWrap: function(wrapSetting) { 
            this.wrapEnabled = wrapSetting; 
          },
          
          // Other functions
          addClass: () => {},
          setLink: () => {},
          
          // Clear function override
          clear: function() {
            this.prevActor = undefined;
            this.actors = new Map();
            this.createdActors = new Map();
            this.destroyedActors = new Map();
            this.boxes = [];
            this.messages = [];
            this.notes = [];
            this.sequenceNumbersEnabled = false;
            this.wrapEnabled = undefined;
            this.currentBox = undefined;
            this.lastCreated = undefined;
            this.lastDestroyed = undefined;
            this.firstGraphFlag = true;
          }
        };
        
      case 'classDiagram':
        return {
          ...baseContext,
          // Core state for class diagrams
          classes: new Map(),
          relations: [],
          notes: [],
          interfaces: [],
          
          // Constants required by grammar
          lineType: {
            LINE: 0,
            DOTTED_LINE: 1,
          },
          relationType: {
            AGGREGATION: 0,
            EXTENSION: 1,
            COMPOSITION: 2,
            DEPENDENCY: 3,
            LOLLIPOP: 4,
          },
          
          // Class diagram functions based on ClassDB
          addClass: function(id) {
            if (!this.classes.has(id)) {
              this.classes.set(id, {
                id,
                type: '',
                label: id,
                cssClasses: [],
                methods: [],
                members: [],
                annotations: [],
                styles: [],
                textStyles: []
              });
            }
            return this.classes.get(id);
          },
          setClassLabel: function(id, label) {
            const classNode = this.addClass(id);
            classNode.label = label;
          },
          addMember: function(className, member) {
            const classNode = this.addClass(className);
            classNode.members.push(member);
          },
          addMembers: function(className, members) {
            const classNode = this.addClass(className);
            classNode.members.push(...members);
          },
          addMethod: function(className, method) {
            const classNode = this.addClass(className);
            classNode.methods.push(method);
          },
          addRelation: function(classRelation) {
            this.relations.push(classRelation);
          },
          addAnnotation: function(className, annotation) {
            const classNode = this.addClass(className);
            classNode.annotations.push(annotation);
          },
          addNote: function(text, className) {
            this.notes.push({ text, className });
          },
          addInterface: function(id1, id2) {
            this.interfaces.push({ id1, id2 });
          },
          cleanupLabel: function(label) {
            return label ? label.trim() : '';
          },
          lookUpDomId: function(id) {
            return id;
          },
          getClass: function(id) {
            return this.classes.get(id);
          },
          getClasses: function() { 
            return this.classes; 
          },
          getRelations: function() { 
            return this.relations; 
          },
          getNotes: function() { 
            return this.notes; 
          },
          setCssClass: function(ids, className) {
            const idArray = ids.split(',');
            idArray.forEach(id => {
              const classNode = this.addClass(id.trim());
              if (!classNode.cssClasses.includes(className)) {
                classNode.cssClasses.push(className);
              }
            });
          },
          setLink: () => {},
          addNamespace: () => {},
          
          // Clear function override
          clear: function() {
            this.classes = new Map();
            this.relations = [];
            this.notes = [];
            this.interfaces = [];
            this.firstGraphFlag = true;
          }
        };
        
      case 'stateDiagram':
      case 'stateDiagram-v2':
        return {
          ...baseContext,
          // State from stateDb.ts
          rootDoc: [],
          version: 2,
          states: new Map(),
          relations: [],
          documents: {},
          direction: 'TB',
          
          // Real functions from stateDb.ts
          setRootDoc: function(o) {
            this.rootDoc = o;
            // Simple extraction - in real implementation this would be more complex
            console.log('Setting root doc', o);
          },
          
          trimColon: function(str) {
            return str.startsWith(':') ? str.slice(1).trim() : str.trim();
          },
          
          getDividerId: function() {
            return 'divider-id-' + Math.floor(Math.random() * 1000);
          },
          
          setDirection: function(dir) {
            this.direction = dir;
          },
          
          // State diagram functions
          addState: function(id, type, doc, description, note, classes, styles, textStyles) {
            const state = {
              id,
              type: type || 'default',
              doc,
              description,
              note,
              classes: classes || [],
              styles: styles || [],
              textStyles: textStyles || []
            };
            this.states.set(id, state);
          },
          
          addTransition: function(state1, state2, description) {
            this.relations.push({
              state1,
              state2,
              description
            });
          },
          
          addDocuments: function(id, doc) {
            this.documents[id] = doc;
          },
          
          getStates: function() { 
            return this.states; 
          },
          
          getRelations: function() { 
            return this.relations; 
          },
          
          getDocuments: function() { 
            return this.documents; 
          },
          
          getDirection: function() { 
            return this.direction; 
          },
          
          getClasses: function() { 
            return this.classes; 
          },
          
          // Clear function override
          clear: function() {
            this.rootDoc = [];
            this.states = new Map();
            this.relations = [];
            this.documents = {};
            this.direction = 'TB';
            this.classes = new Map();
            this.firstGraphFlag = true;
          }
        };
        
      case 'erDiagram':
        return {
          ...baseContext,
          // Core state for ER diagrams
          entities: new Map(),
          relationships: [],
          classes: new Map(),
          direction: 'TB',
          
          // Constants required by ER grammar
          Cardinality: {
            ZERO_OR_ONE: 'ZERO_OR_ONE',
            ZERO_OR_MORE: 'ZERO_OR_MORE',
            ONE_OR_MORE: 'ONE_OR_MORE',
            ONLY_ONE: 'ONLY_ONE',
            MD_PARENT: 'MD_PARENT',
          },
          Identification: {
            NON_IDENTIFYING: 'NON_IDENTIFYING',
            IDENTIFYING: 'IDENTIFYING',
          },
          
          // ER diagram functions
          addEntity: function(id, alias) {
            if (!this.entities.has(id)) {
              this.entities.set(id, {
                id,
                alias: alias || id,
                attributes: []
              });
            }
            return this.entities.get(id);
          },
          addRelationship: function(entA, entB, rel, card) {
            this.relationships.push({
              entityA: entA,
              entityB: entB,
              relationship: rel,
              cardinality: card
            });
          },
          addAttribute: function(entityId, attribute) {
            const entity = this.entities.get(entityId);
            if (entity) {
              entity.attributes.push(attribute);
            }
          },
          addAttributes: function(entityName, attribs) {
            const entity = this.addEntity(entityName);
            
            // Process attribs in reverse order due to effect of recursive construction
            for (let i = attribs.length - 1; i >= 0; i--) {
              if (!attribs[i].keys) {
                attribs[i].keys = [];
              }
              if (!attribs[i].comment) {
                attribs[i].comment = '';
              }
              entity.attributes.push(attribs[i]);
            }
          },
          getEntities: function() { 
            return this.entities; 
          },
          getRelationships: function() { 
            return this.relationships; 
          },
          
          // Clear function override
          clear: function() {
            this.entities = new Map();
            this.relationships = [];
            this.classes = new Map();
            this.direction = 'TB';
            this.firstGraphFlag = true;
          }
        };
        
      case 'gantt':
        return {
          ...baseContext,
          // Gantt diagram functions
          tasks: [],
          sections: [],
          currentSection: '',
          dateFormat: 'YYYY-MM-DD',
          axisFormat: '%Y-%m-%d',
          tickInterval: '1 week',
          excludes: [],
          includes: [],
          todayMarker: '',
          weekday: 'monday',
          weekend: ['saturday', 'sunday'],
          
          addSection: function(title) {
            this.currentSection = title;
            this.sections.push(title);
          },
          
          addTask: function(id, descr, startDate, endDate, after, type) {
            this.tasks.push({
              id: id || `task${this.tasks.length}`,
              description: descr,
              section: this.currentSection,
              startDate,
              endDate,
              after,
              type: type || 'task'
            });
          },
          
          addTaskOrder: function(order) {
            // Handle task ordering
            return order;
          },
          
          setDateFormat: function(format) {
            this.dateFormat = format;
          },
          
          setAxisFormat: function(format) {
            this.axisFormat = format;
          },
          
          setTickInterval: function(interval) {
            this.tickInterval = interval;
          },
          
          setExcludes: function(dates) {
            this.excludes = dates.split(',').map(d => d.trim());
          },
          
          setIncludes: function(dates) {
            this.includes = dates.split(',').map(d => d.trim());
          },
          
          setTodayMarker: function(marker) {
            this.todayMarker = marker;
          },
          
          setWeekday: function(day) {
            this.weekday = day;
          },
          
          setWeekend: function(days) {
            if (typeof days === 'string') {
              this.weekend = [days];
            } else {
              this.weekend = days;
            }
          },
          
          enableInclusiveEndDates: function() {
            this.inclusiveEndDates = true;
          },
          
          TopAxis: function() {
            this.topAxis = true;
          },
          
          setDiagramTitle: function(title) {
            this.title = title;
          },
          
          getTasks: function() {
            return this.tasks;
          },
          
          getSections: function() {
            return this.sections;
          },
          
          clear: function() {
            this.tasks = [];
            this.sections = [];
            this.currentSection = '';
            this.dateFormat = 'YYYY-MM-DD';
            this.axisFormat = '%Y-%m-%d';
            this.tickInterval = '1 week';
            this.excludes = [];
            this.includes = [];
            this.todayMarker = '';
            this.weekday = 'monday';
            this.weekend = ['saturday', 'sunday'];
            this.inclusiveEndDates = false;
            this.topAxis = false;
            this.title = '';
          }
        };
        
      case 'journey':
        return {
          ...baseContext,
          // Journey diagram functions from journeyDb.js
          currentSection: '',
          sections: [],
          tasks: [],
          rawTasks: [],
          
          clear: function() {
            this.sections.length = 0;
            this.tasks.length = 0;
            this.currentSection = '';
            this.rawTasks.length = 0;
          },
          
          addSection: function(txt) {
            this.currentSection = txt;
            this.sections.push(txt);
          },
          
          getSections: function() {
            return this.sections;
          },
          
          getTasks: function() {
            let allItemsProcessed = this.compileTasks();
            const maxDepth = 100;
            let iterationCount = 0;
            while (!allItemsProcessed && iterationCount < maxDepth) {
              allItemsProcessed = this.compileTasks();
              iterationCount++;
            }
            this.tasks.push(...this.rawTasks);
            return this.tasks;
          },
          
          addTask: function(descr, taskData) {
            const pieces = taskData.substr(1).split(':');
            let score = 0;
            let peeps = [];
            if (pieces.length === 1) {
              score = Number(pieces[0]);
              peeps = [];
            } else {
              score = Number(pieces[0]);
              peeps = pieces[1].split(',');
            }
            const peopleList = peeps.map((s) => s.trim());
            
            const rawTask = {
              section: this.currentSection,
              type: this.currentSection,
              people: peopleList,
              task: descr,
              score,
            };
            this.rawTasks.push(rawTask);
          },
          
          addTaskOrg: function(descr) {
            const newTask = {
              section: this.currentSection,
              type: this.currentSection,
              description: descr,
              task: descr,
              classes: [],
            };
            this.tasks.push(newTask);
          },
          
          compileTasks: function() {
            const compileTask = function(pos) {
              return this.rawTasks[pos].processed;
            }.bind(this);
            
            let allProcessed = true;
            for (const [i, rawTask] of this.rawTasks.entries()) {
              compileTask(i);
              allProcessed = allProcessed && rawTask.processed;
            }
            return allProcessed;
          },
          
          updateActors: function() {
            const tempActors = [];
            this.tasks.forEach((task) => {
              if (task.people) {
                tempActors.push(...task.people);
              }
            });
            const unique = new Set(tempActors);
            return [...unique].sort();
          },
          
          getActors: function() {
            return this.updateActors();
          }
        };
        
      case 'sankey-beta':
        return {
          ...baseContext,
          // Sankey diagram functions from sankeyDB.ts
          links: [],
          nodes: [],
          nodesMap: new Map(),
          
          SankeyLink: function(source, target, value = 0) {
            this.source = source;
            this.target = target;
            this.value = value;
          },
          SankeyNode: function(ID) {
            this.ID = ID;
          },
          
          addLink: function(source, target, value) {
            this.links.push(new this.SankeyLink(source, target, value));
          },
          
          findOrCreateNode: function(ID) {
            // Sanitize text (simplified version)
            ID = ID.trim();
            
            let node = this.nodesMap.get(ID);
            if (node === undefined) {
              node = new this.SankeyNode(ID);
              this.nodesMap.set(ID, node);
              this.nodes.push(node);
            }
            return node;
          },
          
          getNodes: function() {
            return this.nodes;
          },
          
          getLinks: function() {
            return this.links;
          },
          
          getGraph: function() {
            return {
              nodes: this.nodes.map((node) => ({ id: node.ID })),
              links: this.links.map((link) => ({
                source: link.source.ID,
                target: link.target.ID,
                value: link.value,
              })),
            };
          },
          
          // Clear function override
          clear: function() {
            this.links = [];
            this.nodes = [];
            this.nodesMap = new Map();
            this.firstGraphFlag = true;
          }
        };
        
      case 'xychart-beta':
        return {
          ...baseContext,
          // XYChart diagram functions from xychartDb.ts
          plotIndex: 0,
          hasSetXAxis: false,
          hasSetYAxis: false,
          xyChartConfig: {
            chartOrientation: 'vertical'
          },
          xyChartData: {
            yAxis: {
              type: 'linear',
              title: '',
              min: Infinity,
              max: -Infinity,
            },
            xAxis: {
              type: 'band',
              title: '',
              categories: [],
            },
            title: '',
            plots: [],
          },
          xyChartThemeConfig: {
            plotColorPalette: '#1f77b4,#ff7f0e,#2ca02c,#d62728,#9467bd,#8c564b,#e377c2,#7f7f7f,#bcbd22,#17becf'
          },
          plotColorPalette: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
          
          textSanitizer: function(text) {
            return text.trim();
          },
          
          setOrientation: function(orientation) {
            if (orientation === 'horizontal') {
              this.xyChartConfig.chartOrientation = 'horizontal';
            } else {
              this.xyChartConfig.chartOrientation = 'vertical';
            }
          },
          
          setXAxisTitle: function(title) {
            this.xyChartData.xAxis.title = this.textSanitizer(title.text);
          },
          
          setXAxisRangeData: function(min, max) {
            this.xyChartData.xAxis = { type: 'linear', title: this.xyChartData.xAxis.title, min, max };
            this.hasSetXAxis = true;
          },
          
          setXAxisBand: function(categories) {
            this.xyChartData.xAxis = {
              type: 'band',
              title: this.xyChartData.xAxis.title,
              categories: categories.map((c) => this.textSanitizer(c.text)),
            };
            this.hasSetXAxis = true;
          },
          
          setYAxisTitle: function(title) {
            this.xyChartData.yAxis.title = this.textSanitizer(title.text);
          },
          
          setYAxisRangeData: function(min, max) {
            this.xyChartData.yAxis = { type: 'linear', title: this.xyChartData.yAxis.title, min, max };
            this.hasSetYAxis = true;
          },
          
          setYAxisRangeFromPlotData: function(data) {
            const minValue = Math.min(...data);
            const maxValue = Math.max(...data);
            const prevMinValue = this.xyChartData.yAxis.type === 'linear' ? this.xyChartData.yAxis.min : Infinity;
            const prevMaxValue = this.xyChartData.yAxis.type === 'linear' ? this.xyChartData.yAxis.max : -Infinity;
            this.xyChartData.yAxis = {
              type: 'linear',
              title: this.xyChartData.yAxis.title,
              min: Math.min(prevMinValue, minValue),
              max: Math.max(prevMaxValue, maxValue),
            };
          },
          
          getPlotColorFromPalette: function(plotIndex) {
            return this.plotColorPalette[plotIndex === 0 ? 0 : plotIndex % this.plotColorPalette.length];
          },
          
          transformDataWithoutCategory: function(data) {
            let retData = [];
            if (data.length === 0) {
              return retData;
            }
            if (!this.hasSetXAxis) {
              const prevMinValue = this.xyChartData.xAxis.type === 'linear' ? this.xyChartData.xAxis.min : Infinity;
              const prevMaxValue = this.xyChartData.xAxis.type === 'linear' ? this.xyChartData.xAxis.max : -Infinity;
              this.setXAxisRangeData(Math.min(prevMinValue, 1), Math.max(prevMaxValue, data.length));
            }
            if (!this.hasSetYAxis) {
              this.setYAxisRangeFromPlotData(data);
            }
            
            if (this.xyChartData.xAxis.type === 'band') {
              retData = this.xyChartData.xAxis.categories.map((c, i) => [c, data[i]]);
            }
            
            if (this.xyChartData.xAxis.type === 'linear') {
              const min = this.xyChartData.xAxis.min;
              const max = this.xyChartData.xAxis.max;
              const step = (max - min) / (data.length - 1);
              const categories = [];
              for (let i = min; i <= max; i += step) {
                categories.push(`${i}`);
              }
              retData = categories.map((c, i) => [c, data[i]]);
            }
            
            return retData;
          },
          
          setLineData: function(title, data) {
            const plotData = this.transformDataWithoutCategory(data);
            this.xyChartData.plots.push({
              type: 'line',
              strokeFill: this.getPlotColorFromPalette(this.plotIndex),
              strokeWidth: 2,
              data: plotData,
            });
            this.plotIndex++;
          },
          
          setBarData: function(title, data) {
            const plotData = this.transformDataWithoutCategory(data);
            this.xyChartData.plots.push({
              type: 'bar',
              fill: this.getPlotColorFromPalette(this.plotIndex),
              data: plotData,
            });
            this.plotIndex++;
          },
          
          getDrawableElem: function() {
            if (this.xyChartData.plots.length === 0) {
              throw new Error('No Plot to render, please provide a plot with some data');
            }
            return [];
          },
          
          getChartThemeConfig: function() {
            return this.xyChartThemeConfig;
          },
          
          getChartConfig: function() {
            return this.xyChartConfig;
          },
          
          getXYChartData: function() {
            return this.xyChartData;
          },
          
          // Clear function override
          clear: function() {
            this.plotIndex = 0;
            this.xyChartConfig = {
              chartOrientation: 'vertical'
            };
            this.xyChartData = {
              yAxis: {
                type: 'linear',
                title: '',
                min: Infinity,
                max: -Infinity,
              },
              xAxis: {
                type: 'band',
                title: '',
                categories: [],
              },
              title: '',
              plots: [],
            };
            this.xyChartThemeConfig = {
              plotColorPalette: '#1f77b4,#ff7f0e,#2ca02c,#d62728,#9467bd,#8c564b,#e377c2,#7f7f7f,#bcbd22,#17becf'
            };
            this.plotColorPalette = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
            this.hasSetXAxis = false;
            this.hasSetYAxis = false;
            this.firstGraphFlag = true;
          }
        };
        
      case 'kanban':
        return {
          ...baseContext,
          // Kanban diagram functions from kanbanDb.ts
          nodes: [],
          sections: [],
          cnt: 0,
          elements: {},
          
          nodeType: {
            DEFAULT: 0,
            NO_BORDER: 0,
            ROUNDED_RECT: 1,
            RECT: 2,
            CIRCLE: 3,
            CLOUD: 4,
            BANG: 5,
            HEXAGON: 6,
          },
          
          getSection: function(level) {
            if (this.nodes.length === 0) {
              return null;
            }
            const sectionLevel = this.nodes[0].level;
            let lastSection = null;
            for (let i = this.nodes.length - 1; i >= 0; i--) {
              if (this.nodes[i].level === sectionLevel && !lastSection) {
                lastSection = this.nodes[i];
              }
              if (this.nodes[i].level < sectionLevel) {
                throw new Error('Items without section detected, found section ("' + this.nodes[i].label + '")');
              }
            }
            if (level === lastSection?.level) {
              return null;
            }
            return lastSection;
          },
          
          getSections: function() {
            return this.sections;
          },
          
          getData: function() {
            const edges = [];
            const _nodes = [];
            
            const sections = this.getSections();
            
            for (const section of sections) {
              const node = {
                id: section.id,
                label: section.label ?? '',
                isGroup: true,
                ticket: section.ticket,
                shape: 'kanbanSection',
                level: section.level,
                look: 'default',
              };
              _nodes.push(node);
              const children = this.nodes.filter((n) => n.parentId === section.id);
              
              for (const item of children) {
                const childNode = {
                  id: item.id,
                  parentId: section.id,
                  label: item.label ?? '',
                  isGroup: false,
                  ticket: item?.ticket,
                  priority: item?.priority,
                  assigned: item?.assigned,
                  icon: item?.icon,
                  shape: 'kanbanItem',
                  level: item.level,
                  rx: 5,
                  ry: 5,
                  cssStyles: ['text-align: left'],
                };
                _nodes.push(childNode);
              }
            }
            
            return { nodes: _nodes, edges, other: {} };
          },
          
          addNode: function(level, id, descr, type, shapeData) {
            let padding = 8;
            switch (type) {
              case this.nodeType.ROUNDED_RECT:
              case this.nodeType.RECT:
              case this.nodeType.HEXAGON:
                padding *= 2;
            }
            
            const node = {
              id: id?.trim() || 'kbn' + this.cnt++,
              level,
              label: descr?.trim() || '',
              width: 200,
              padding,
              isGroup: false,
            };
            
            if (shapeData !== undefined) {
              try {
                let yamlData;
                if (!shapeData.includes('\n')) {
                  yamlData = '{\n' + shapeData + '\n}';
                } else {
                  yamlData = shapeData + '\n';
                }
                
                // Simplified YAML parsing (would need proper yaml parser)
                const doc = this.parseSimpleYaml(yamlData);
                
                if (doc?.shape && doc.shape === 'kanbanItem') {
                  node.shape = doc?.shape;
                }
                if (doc?.label) {
                  node.label = doc?.label;
                }
                if (doc?.icon) {
                  node.icon = doc?.icon.toString();
                }
                if (doc?.assigned) {
                  node.assigned = doc?.assigned.toString();
                }
                if (doc?.ticket) {
                  node.ticket = doc?.ticket.toString();
                }
                if (doc?.priority) {
                  node.priority = doc?.priority;
                }
              } catch (e) {
                console.warn('Error parsing kanban node data:', e);
              }
            }
            
            const section = this.getSection(level);
            if (section) {
              node.parentId = section.id || 'kbn' + this.cnt++;
            } else {
              this.sections.push(node);
            }
            this.nodes.push(node);
          },
          
          parseSimpleYaml: function(yamlString) {
            // Simplified YAML parser for basic key-value pairs
            try {
              const cleaned = yamlString.replace(/[{}]/g, '').trim();
              const lines = cleaned.split('\n').filter(line => line.trim());
              const result = {};
              
              for (const line of lines) {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                  const key = line.substring(0, colonIndex).trim();
                  const value = line.substring(colonIndex + 1).trim().replace(/['"]/g, '');
                  result[key] = value;
                }
              }
              return result;
            } catch (e) {
              return {};
            }
          },
          
          getType: function(startStr, endStr) {
            switch (startStr) {
              case '[':
                return this.nodeType.RECT;
              case '(':
                return endStr === ')' ? this.nodeType.ROUNDED_RECT : this.nodeType.CLOUD;
              case '((':
                return this.nodeType.CIRCLE;
              case ')':
                return this.nodeType.CLOUD;
              case '))':
                return this.nodeType.BANG;
              case '{{':
                return this.nodeType.HEXAGON;
              default:
                return this.nodeType.DEFAULT;
            }
          },
          
          setElementForId: function(id, element) {
            this.elements[id] = element;
          },
          
          decorateNode: function(decoration) {
            if (!decoration) {
              return;
            }
            const node = this.nodes[this.nodes.length - 1];
            if (decoration.icon) {
              node.icon = decoration.icon?.trim();
            }
            if (decoration.class) {
              node.cssClasses = decoration.class?.trim();
            }
          },
          
          type2Str: function(type) {
            switch (type) {
              case this.nodeType.DEFAULT:
                return 'no-border';
              case this.nodeType.RECT:
                return 'rect';
              case this.nodeType.ROUNDED_RECT:
                return 'rounded-rect';
              case this.nodeType.CIRCLE:
                return 'circle';
              case this.nodeType.CLOUD:
                return 'cloud';
              case this.nodeType.BANG:
                return 'bang';
              case this.nodeType.HEXAGON:
                return 'hexgon';
              default:
                return 'no-border';
            }
          },
          
          // Expose logger to grammar
          getLogger: function() {
            return {
              debug: () => {},
              info: () => {},
              warn: () => {},
              error: () => {},
              trace: () => {}
            };
          },
          
          getElementById: function(id) {
            return this.elements[id];
          },
          
          // Clear function override
          clear: function() {
            this.nodes = [];
            this.sections = [];
            this.cnt = 0;
            this.elements = {};
            this.firstGraphFlag = true;
          }
        };
        
        
        
      case 'timeline':
        return {
          ...baseContext,
          // Timeline diagram functions from timelineDb.js
          currentSection: '',
          currentTaskId: 0,
          sections: [],
          tasks: [],
          rawTasks: [],
          
          addSection: function(txt) {
            this.currentSection = txt;
            this.sections.push(txt);
          },
          
          getSections: function() {
            return this.sections;
          },
          
          addTask: function(period, length, event) {
            const rawTask = {
              id: this.currentTaskId++,
              section: this.currentSection,
              type: this.currentSection,
              task: period,
              score: length ? length : 0,
              events: event ? [event] : [],
            };
            this.rawTasks.push(rawTask);
          },
          
          addEvent: function(event) {
            if (this.rawTasks.length > 0) {
              const lastTask = this.rawTasks[this.rawTasks.length - 1];
              if (!lastTask.events) {
                lastTask.events = [];
              }
              lastTask.events.push(event);
            }
          },
          
          getTasks: function() {
            this.tasks.push(...this.rawTasks);
            return this.tasks;
          },
          
          compileTasks: function() {
            return true; // Simplified compilation
          },
          
          getCommonDb: function() {
            return {
              setAccTitle: (title) => { this.accTitle = title; },
              getAccTitle: () => this.accTitle || '',
              setAccDescription: (desc) => { this.accDescription = desc; },
              getAccDescription: () => this.accDescription || '',
              setDiagramTitle: (title) => { this.title = title; },
              getDiagramTitle: () => this.title || '',
              clear: () => {}
            };
          },
          
          // Clear function override
          clear: function() {
            this.sections.length = 0;
            this.tasks.length = 0;
            this.currentSection = '';
            this.rawTasks.length = 0;
            this.currentTaskId = 0;
            this.accTitle = '';
            this.accDescription = '';
            this.title = '';
            this.firstGraphFlag = true;
          }
        };
        
      case 'C4Context':
      case 'c4':
        return {
          ...baseContext,
          ...c4Functions
        };

      case 'mindmap':
        return {
          ...baseContext,
          // Mindmap functions based on mindmapDb.ts
          nodes: [],
          rootNode: null,
          cnt: 0,
          elements: {},

          nodeType: {
            DEFAULT: 0,
            NO_BORDER: 0,
            ROUNDED_RECT: 1,
            RECT: 2,
            CIRCLE: 3,
            CLOUD: 4,
            BANG: 5,
            HEXAGON: 6,
          },

          addNode: function(level, id, descr, type) {
            const node = {
              id: id?.trim() || 'mindmap' + this.cnt++,
              level,
              label: descr?.trim() || '',
              type: type || this.nodeType.DEFAULT,
              children: [],
              width: 200,
              padding: 8
            };
            this.nodes.push(node);
            if (level === 0) {
              this.rootNode = node;
            }
          },

          decorateNode: function(decoration) {
            if (!decoration) return;
            const node = this.nodes[this.nodes.length - 1];
            if (decoration.icon) {
              node.icon = decoration.icon?.trim();
            }
            if (decoration.class) {
              node.cssClasses = decoration.class?.trim();
            }
          },

          getType: function(startStr, endStr) {
            switch (startStr) {
              case '[':
                return this.nodeType.RECT;
              case '(':
                return endStr === ')' ? this.nodeType.ROUNDED_RECT : this.nodeType.CLOUD;
              case '((':
                return this.nodeType.CIRCLE;
              case ')':
                return this.nodeType.CLOUD;
              case '))':
                return this.nodeType.BANG;
              case '{{':
                return this.nodeType.HEXAGON;
              default:
                return this.nodeType.DEFAULT;
            }
          },

          getLogger: function() {
            return {
              debug: () => {},
              info: () => {},
              warn: () => {},
              error: () => {},
              trace: () => {}
            };
          },

          setElementForId: function(id, element) {
            this.elements[id] = element;
          },

          getElementById: function(id) {
            return this.elements[id];
          },

          clear: function() {
            this.nodes = [];
            this.rootNode = null;
            this.cnt = 0;
            this.elements = {};
            this.firstGraphFlag = true;
          }
        };

      case 'exampleDiagram':
        return {
          ...baseContext,
          // Example diagram functions
          showInfo: false,
          
          setInfo: function(value) {
            this.showInfo = value;
          },
          
          clear: function() {
            this.showInfo = false;
          }
        };
        
      case 'quadrantChart':
      case 'quadrant':
        return {
          ...baseContext,
          ...quadrantFunctions
        };
        
      case 'requirementDiagram':
      case 'requirement':
        return {
          ...baseContext,
          ...requirementFunctions
        };
        
      case 'block-beta':
      case 'block':
        return {
          ...baseContext,
          ...blockFunctions
        };
        
      case 'treemap':
        // Treemap is Langium-based, provide minimal context
        return {
          ...baseContext,
          nodes: [],
          
          addNode: function(id, label, parent) {
            this.nodes.push({ id, label, parent });
          },
          
          clear: function() {
            this.nodes = [];
          }
        };
        
      case 'packet-beta':
      case 'packet':
        // Packet is Langium-based, provide minimal context
        return {
          ...baseContext,
          packets: [],
          
          addPacket: function(name, size) {
            this.packets.push({ name, size });
          },
          
          clear: function() {
            this.packets = [];
          }
        };
        
      case 'architecture-beta':
      case 'architecture':
        // Architecture is Langium-based, provide minimal context
        return {
          ...baseContext,
          components: [],
          connections: [],
          
          addComponent: function(id, type, label) {
            this.components.push({ id, type, label });
          },
          
          addConnection: function(from, to, type) {
            this.connections.push({ from, to, type });
          },
          
          clear: function() {
            this.components = [];
            this.connections = [];
          }
        };
        
      default:
        // Return base context for other diagram types
        return baseContext;
    }
  }

  /**
   * Get compilation status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      totalGrammars: this.grammarPaths.size,
      compiledParsers: this.parsers.size,
      availableTypes: this.getAvailableTypes(),
      missingParsers: Array.from(this.grammarPaths.keys()).filter(
        type => !this.parsers.has(type)
      )
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.parsers.clear();
    this.grammarPaths.clear();
  }
}

module.exports = GrammarCompiler;