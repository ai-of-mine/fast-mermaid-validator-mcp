/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 stateDb — minimal stub port for `diagrams/state/stateDb.ts`.
 * Records state transitions; rendering layout dropped.
 */

const { createCommonDb } = require('./commonDb');

const STMT_STATE = 'state';
const STMT_RELATION = 'relation';
const STMT_CLASSDEF = 'classDef';
const STMT_STYLEDEF = 'style';
const STMT_APPLYCLASS = 'applyClass';

const DEFAULT_DIAGRAM_DIRECTION = 'TB';
const DEFAULT_NESTED_DOC_DIR = 'TB';
const STATE_TYPE = { DEFAULT: 'default', DIVIDER: 'divider', SQUARE: 'square', ROUND: 'round', CHOICE: 'choice', FORK: 'fork', JOIN: 'join', NOTE: 'note' };

function createStateDb() {
  const common = createCommonDb();
  let nodes = [];
  let edges = [];
  let direction = DEFAULT_DIAGRAM_DIRECTION;
  let rootDoc = [];
  const classes = new Map();
  const styles = new Map();
  const stateMap = new Map();

  return {
    STMT_STATE, STMT_RELATION, STMT_CLASSDEF, STMT_STYLEDEF, STMT_APPLYCLASS,
    STATE_TYPE,
    DEFAULT_DIAGRAM_DIRECTION, DEFAULT_NESTED_DOC_DIR,
    clear() { nodes = []; edges = []; rootDoc = []; classes.clear(); styles.clear(); stateMap.clear(); direction = DEFAULT_DIAGRAM_DIRECTION; common.clear(); },
    setRootDoc(doc) { rootDoc = doc || []; },
    getRootDoc() { return rootDoc; },
    addState(id, type, doc, descr, note, classes, styles, textStyles) {
      const node = { id, type: type || STATE_TYPE.DEFAULT, descr, doc, note, classes: classes || [], styles: styles || [], textStyles: textStyles || [] };
      nodes.push(node); stateMap.set(id, node); return node;
    },
    addRelation(s1, s2, title) { edges.push({ id1: s1, id2: s2, title }); },
    addDescription(id, descr) { const n = stateMap.get(id); if (n) n.descr = (n.descr ? n.descr + '<br>' : '') + descr; },
    addNote(id, note) { const n = stateMap.get(id); if (n) n.note = note; },
    addStyleClass(name, styleAttrs) { classes.set(name, { id: name, styles: styleAttrs || [], textStyles: [] }); },
    setCssClass(ids, cls) { for (const id of (ids || '').split(',')) { const n = stateMap.get(id.trim()); if (n) n.classes.push(cls); } },
    setStyle(id, styleAttrs) { styles.set(id, styleAttrs); },
    cleanupLabel(label) { return label && label.startsWith(':') ? label.slice(1).trim() : (label || ''); },
    lineType: { LINE: 0, DOTTED_LINE: 1 },
    relationType: { AGGREGATION: 0, EXTENSION: 1, COMPOSITION: 2, DEPENDENCY: 3 },
    getStates()    { return nodes; },
    getRelations() { return edges; },
    getClasses()   { return classes; },
    getDirection() { return direction; },
    setDirection(d) { direction = d || DEFAULT_DIAGRAM_DIRECTION; },
    extract() {}, trimColon(s) { return s; },
    getCommonDb:       () => common,
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle()
  };
}

module.exports = { createStateDb };
