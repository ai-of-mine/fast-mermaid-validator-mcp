/**
 * v11 DB factory.
 *
 * Maps diagram type → factory for the corresponding DB module ported from
 * upstream Mermaid 11.x. The caller (grammarCompiler when version='11')
 * calls `createV11Db(type)` to get a fresh DB instance and assigns it to
 * `parser.yy` before parsing.
 *
 * Each createXxxDb() returns a NEW instance so per-request state is isolated;
 * sharing a single DB instance across requests would leak state.
 */

const { createCommonDb }       = require('./commonDb');
const { createBlockDb }        = require('./blockDb');
const { createC4Db }           = require('./c4Db');
const { createClassDb }        = require('./classDb');
const { createErDb }           = require('./erDb');
const { createFlowDb }         = require('./flowDb');
const { createGanttDb }        = require('./ganttDb');
const { createIshikawaDb }     = require('./ishikawaDb');
const { createJourneyDb }      = require('./journeyDb');
const { createKanbanDb }       = require('./kanbanDb');
const { createMindmapDb }      = require('./mindmapDb');
const { createQuadrantDb }     = require('./quadrantDb');
const { createRequirementDb }  = require('./requirementDb');
const { createSankeyDb }       = require('./sankeyDb');
const { createSequenceDb }     = require('./sequenceDb');
const { createStateDb }        = require('./stateDb');
const { createTimelineDb }     = require('./timelineDb');
const { createXychartDb }      = require('./xychartDb');
const { createVennDb }         = require('./vennDb');

const factories = {
  // Each entry maps the canonical diagram type (and any aliases) to the factory.
  'flowchart':         createFlowDb,
  'graph':             createFlowDb,
  'sequenceDiagram':   createSequenceDb,
  'classDiagram':      createClassDb,
  'stateDiagram':      createStateDb,
  'stateDiagram-v2':   createStateDb,
  'erDiagram':         createErDb,
  'gantt':             createGanttDb,
  'journey':           createJourneyDb,
  'requirement':       createRequirementDb,
  'requirementDiagram':createRequirementDb,
  'sankey-beta':       createSankeyDb,
  'xychart-beta':      createXychartDb,
  'kanban':            createKanbanDb,
  'block':             createBlockDb,
  'block-beta':        createBlockDb,
  'c4':                createC4Db,
  'C4Context':         createC4Db,
  'mindmap':           createMindmapDb,
  'quadrant':          createQuadrantDb,
  'quadrantChart':     createQuadrantDb,
  'timeline':          createTimelineDb,
  'ishikawa':          createIshikawaDb,
  'venn':              createVennDb,
};

/** Returns a fresh DB instance for the given diagram type, or `null` if no DB is registered for that type. */
function createV11Db(diagramType) {
  const factory = factories[diagramType];
  return factory ? factory() : null;
}

module.exports = { createV11Db, createCommonDb };
