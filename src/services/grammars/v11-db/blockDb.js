/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 blockDb — minimal stub port for `diagrams/block/blockDB.ts`.
 */

const { createCommonDb } = require('./commonDb');

function createBlockDb() {
  const common = createCommonDb();
  const blocks = [];
  const blockMap = new Map();
  const edges = [];
  let columns = -1;
  const classes = new Map();

  const noop = () => {};
  const noopRet = (v) => () => v;

  return {
    clear() { blocks.length = 0; blockMap.clear(); edges.length = 0; columns = -1; classes.clear(); common.clear(); },
    setColumns(c) { columns = c; },
    getColumns()  { return columns; },
    addBlock(block) { blocks.push(block); blockMap.set(block.id, block); },
    getBlock(id)  { return blockMap.get(id); },
    addLink(link) { edges.push(link); },
    getEdges()    { return edges; },
    getBlocks()   { return blocks; },
    getBlocksFlat() { return blocks; },
    populateBlockDatabase(blockList, parent) { void blockList; void parent; },
    findBlock(id) { return blockMap.get(id); },
    addClass(id, styles) { classes.set(id, { id, styles: styles || [] }); },
    getClasses() { return classes; },
    setLink: noop, setHierarchy: noop,
    typeStr2Type(t) { return t || 'na'; },
    edgeStrToEdgeData(s) { return { type: s || 'none' }; },
    edgeTypeStr2Type(s) { return s; },
    getLogger: () => ({ trace: noop, debug: noop, info: noop, warn: noop, error: noop }),
    getCommonDb: () => common,
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle()
  };
}

module.exports = { createBlockDb };
