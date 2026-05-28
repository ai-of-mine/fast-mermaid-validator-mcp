/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 classDb — minimal stub port for `diagrams/class/classDb.ts`.
 */

const { createCommonDb } = require('./commonDb');

function createClassDb() {
  const common = createCommonDb();
  const classes = new Map();
  const relations = [];
  const interfaces = [];
  const notes = [];
  const namespaces = new Map();
  let direction = 'TB';
  const classCounter = { n: 0 };
  const styleClasses = new Map();
  let classLabel = '';

  const noop = () => {};
  const addClass = (id, type) => {
    if (!classes.has(id)) {
      classes.set(id, { id, type: type || 'class', label: id, cssClasses: [], methods: [], members: [], annotations: [] });
    }
    return classes.get(id);
  };

  return {
    relationType: { AGGREGATION: 0, EXTENSION: 1, COMPOSITION: 2, DEPENDENCY: 3, LOLLIPOP: 4 },
    lineType: { LINE: 0, DOTTED_LINE: 1 },
    clear() {
      classes.clear(); relations.length = 0; interfaces.length = 0; notes.length = 0; namespaces.clear();
      direction = 'TB'; styleClasses.clear(); classLabel = '';
      common.clear();
    },
    setDirection(d) { direction = d; },
    getDirection() { return direction; },

    addClass,
    setClassLabel(id, label) { const c = addClass(id); c.label = label; },
    lookUpDomId(id) { return id; },
    addMember(className, member) { const c = addClass(className); c.members.push(member); },
    addMembers(className, members) { const c = addClass(className); c.members.push(...(members || [])); },
    addAnnotation(className, annot) { const c = addClass(className); c.annotations.push(annot); },
    addRelation(rel) { relations.push(rel); },
    addNote(text, classRef) { notes.push({ text, classRef }); },
    addInterface(name) { interfaces.push({ name }); },
    addNamespace(name) { if (!namespaces.has(name)) namespaces.set(name, { name, classes: new Set() }); return namespaces.get(name); },
    addClassesToNamespace(ns, classIds) { const n = this.addNamespace(ns); for (const id of classIds || []) n.classes.add(id); },
    setLink(id, link)              { const c = classes.get(id); if (c) c.link = link; },
    setTooltip(id, tooltip)        { const c = classes.get(id); if (c) c.tooltip = tooltip; },
    setClickEvent: noop, bindFunctions: noop,
    setCssStyle(ids, styles) { for (const id of (ids || '').split(',')) { const c = classes.get(id.trim()); if (c) c.styles = styles; } },
    setCssClass(ids, name)   { for (const id of (ids || '').split(',')) { const c = classes.get(id.trim()); if (c) c.cssClasses.push(name); } },
    addCssStyles: noop,
    defineClass(id, styles)  { styleClasses.set(id, styles); },

    getClasses()       { return classes; },
    getRelations()     { return relations; },
    getNotes()         { return notes; },
    getNamespaces()    { return namespaces; },
    getInterfaces()    { return interfaces; },
    getStyleClasses()  { return styleClasses; },

    getCommonDb: () => common,
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle()
  };
}

module.exports = { createClassDb };
