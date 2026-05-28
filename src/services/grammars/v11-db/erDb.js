/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *   https://github.com/mermaid-js/mermaid
 *
 * v11 erDb — port of `diagrams/er/erDb.ts` (validation-only).
 */

const { createCommonDb } = require('./commonDb');

function createErDb() {
  const common = createCommonDb();
  const entities = new Map();
  const relationships = [];
  const classes = new Map();
  let direction = 'TB';

  const db = {
    Cardinality: {
      ZERO_OR_ONE: 'ZERO_OR_ONE',
      ZERO_OR_MORE: 'ZERO_OR_MORE',
      ONE_OR_MORE: 'ONE_OR_MORE',
      ONLY_ONE: 'ONLY_ONE',
      MD_PARENT: 'MD_PARENT'
    },
    Identification: { NON_IDENTIFYING: 'NON_IDENTIFYING', IDENTIFYING: 'IDENTIFYING' },
    clear() {
      entities.clear(); relationships.length = 0; classes.clear(); direction = 'TB';
      common.clear();
    },
    addEntity(name, alias = '') {
      if (!entities.has(name)) entities.set(name, { id: `entity-${name}-${entities.size}`, label: name, attributes: [], alias });
      return entities.get(name);
    },
    addAttributes(name, attribs) {
      const e = db.addEntity(name);
      e.attributes.push(...(attribs || []));
    },
    addRelationship(entA, rolA, entB, rSpec) {
      db.addEntity(entA); db.addEntity(entB);
      relationships.push({ entityA: entA, roleA: rolA, entityB: entB, relSpec: rSpec });
    },
    setDirection(d) { direction = d; },
    getDirection() { return direction; },
    addCssStyles() {},
    addClass(name, styles) { classes.set(name, { styles: styles || [] }); },
    setClass() {},
    getEntities() { return entities; },
    getRelationships() { return relationships; },
    getClasses() { return classes; },
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle(),
    getCommonDb:       () => common
  };
  db.clear();
  return db;
}

module.exports = { createErDb };
