/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 kanbanDb — port of `diagrams/kanban/kanbanDb.ts` (validation-only).
 */

const { createCommonDb } = require('./commonDb');

function createKanbanDb() {
  const common = createCommonDb();
  let nodes = [];
  let sections = [];
  let cnt = 0;

  const getSection = (level) => {
    if (nodes.length === 0) return null;
    const sectionLevel = nodes[0].level;
    let last = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].level === sectionLevel && !last) last = nodes[i];
      if (nodes[i].level < sectionLevel) {
        throw new Error('Items without section detected, found section ("' + nodes[i].label + '")');
      }
    }
    if (last && level === last.level) return null;
    return last;
  };

  const noop = () => {};
  const logger = { trace: noop, debug: noop, info: noop, warn: noop, error: noop };

  return {
    clear() { nodes = []; sections = []; cnt = 0; common.clear(); },
    addNode(level, id, descr, type = 'kanbanItem', shape = 'kanbanItem') {
      const section = getSection(level);
      const node = { id: id || `kanban-${cnt++}`, label: descr || id, level, parentId: section ? section.id : null, type, shape };
      if (!section) sections.push(node);
      nodes.push(node);
    },
    getSections() { return sections; },
    getData() { return { nodes, edges: [] }; },
    getLogger() { return logger; },
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle(),
    getCommonDb:       () => common
  };
}

module.exports = { createKanbanDb };
