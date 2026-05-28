/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 mindmapDb — port of `diagrams/mindmap/mindmapDb.ts` (validation-only).
 */

const { createCommonDb } = require('./commonDb');

function createMindmapDb() {
  const common = createCommonDb();
  // Node type enum matches upstream
  const nodeType = { DEFAULT: 0, NO_BORDER: 0, ROUNDED_SQUARE: 1, SQUARE: 2, CIRCLE: 3, CLOUD: 4, BANG: 5, HEXAGON: 6 };
  const nodes = [];
  const elements = {};

  const getParent = (level) => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].level < level) return nodes[i];
    }
    return null;
  };

  return {
    nodeType,
    clear() { nodes.length = 0; common.clear(); },
    getParent,
    getMindmap() { return nodes.length ? nodes[0] : null; },
    addNode(level, id, descr, type) {
      const parent = getParent(level);
      const node = { id: nodes.length, nodeId: id, level, descr, type, children: [] };
      if (parent) parent.children.push(node);
      nodes.push(node);
    },
    getType(start, end) {
      // mirrors upstream's start/end character → type mapping
      switch ((start || '').trim()) {
        case '[': return nodeType.SQUARE;
        case '(': return /^\(\(/.test(start) ? nodeType.CIRCLE : nodeType.ROUNDED_SQUARE;
        case ')': return nodeType.CLOUD;
        case '))': return nodeType.BANG;
        case '{{': return nodeType.HEXAGON;
        default:  return nodeType.DEFAULT;
      }
    },
    setElementForId(id, el) { elements[id] = el; },
    getElementById(id) { return elements[id]; },
    decorateNode(_decoration) { /* no-op for validation */ },
    type(t) { return t; },
    assignSections() { /* no-op */ },
    flattenNodes() { /* no-op */ },
    getLogger() { return { trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }; },
    sanitizeText(t) { return String(t || ''); },
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle(),
    getCommonDb:       () => common
  };
}

module.exports = { createMindmapDb };
