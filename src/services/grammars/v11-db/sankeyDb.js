/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 sankeyDb — port of `diagrams/sankey/sankeyDB.ts` (validation-only).
 */

const { createCommonDb } = require('./commonDb');

function createSankeyDb() {
  const common = createCommonDb();
  let links = [];
  let nodes = [];
  let nodesMap = new Map();

  const findOrCreateNode = (ID) => {
    const id = String(ID || '').trim();
    if (!nodesMap.has(id)) {
      const node = { ID: id };
      nodes.push(node);
      nodesMap.set(id, node);
    }
    return nodesMap.get(id);
  };

  return {
    clear() { links = []; nodes = []; nodesMap = new Map(); common.clear(); },
    findOrCreateNode,
    addLink(source, target, value) { links.push({ source, target, value: Number(value) || 0 }); },
    getNodes() { return nodes; },
    getLinks() { return links; },
    getGraph() { return { nodes, links }; },
    getCommonDb: () => common,
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle()
  };
}

module.exports = { createSankeyDb };
