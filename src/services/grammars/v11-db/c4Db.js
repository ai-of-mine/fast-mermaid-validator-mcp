/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 c4Db — minimal stub port for `diagrams/c4/c4Db.js`.
 */

const { createCommonDb } = require('./commonDb');

function createC4Db() {
  const common = createCommonDb();
  let direction = 'TB';
  const c4Type = '';
  const persons = [];
  const personExts = [];
  const systems = [];
  const systemExts = [];
  const containers = [];
  const components = [];
  const nodes = [];
  const rels = [];
  const boundaries = [];

  const passN = (n) => (...args) => { void args; void n; };

  return {
    clear() {
      persons.length = 0; personExts.length = 0; systems.length = 0; systemExts.length = 0;
      containers.length = 0; components.length = 0; nodes.length = 0; rels.length = 0; boundaries.length = 0;
      direction = 'TB'; common.clear();
    },
    // Direction
    setDirection(d) { direction = d; },
    getDirection() { return direction; },

    // Diagram-type setters (called by grammar at top-level)
    setC4Type(t)   { void t; },
    getC4Type()    { return c4Type; },

    // Title (note: c4 grammar uses setTitle, not setDiagramTitle)
    setTitle(t)    { common.setDiagramTitle(t); },
    getTitle()     { return common.getDiagramTitle(); },

    // Person / system / container / component / node creators (all no-ops collecting state)
    addPersonOrSystem(typeC4Shape, alias, label, descr, sprite, tags, link) {
      const e = { type: typeC4Shape, alias, label, descr, sprite, tags, link };
      if (typeC4Shape && typeC4Shape.toLowerCase().includes('person')) persons.push(e);
      else systems.push(e);
    },
    addContainer(...args) { containers.push(args); },
    addComponent(...args) { components.push(args); },
    addPerson:    passN('person'),
    addPersonExt: passN('personExt'),
    addSystem:    passN('system'),
    addSystemExt: passN('systemExt'),
    addContainerExt: passN('containerExt'),
    addComponentExt: passN('componentExt'),
    addDeploymentNode: passN('node'),
    addNode:      passN('node'),

    // Boundary stack
    addPersonOrSystemBoundary(...args) { boundaries.push(args); },
    addContainerBoundary(...args) { boundaries.push(args); },
    addDeploymentBoundary(...args) { boundaries.push(args); },
    popBoundaryParseStack() { boundaries.pop(); },

    // Relations
    addRel(type, from, to, label, ...rest) { rels.push({ type, from, to, label, rest }); },
    addBiRel(...args)    { rels.push({ kind: 'bi', args }); },
    addRelTechnology()   {},
    addRelIndex()        {},
    setTechnology()      {},

    // UpdateRelStyle / UpdateElementStyle (renderer concerns)
    updateElStyle() {},
    updateRelStyle() {},
    autoWrap() { return false; },

    // Per-type element accessors used by templates
    getC4ShapeArray()       { return [...persons, ...systems, ...containers, ...components, ...nodes]; },
    getRels()               { return rels; },
    getBoundaries()         { return boundaries; },
    getC4ShapeInRow()       { return 4; },
    getC4BoundaryInRow()    { return 2; },
    getC4ShapeKeys() { return ['type', 'alias', 'label', 'descr', 'sprite', 'tags', 'link']; },

    getCommonDb: () => common,
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle()
  };
}

module.exports = { createC4Db };
