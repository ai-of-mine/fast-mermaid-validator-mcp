/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 flowDb — minimal stub port for `diagrams/flowchart/flowDb.ts`.
 * Records vertices/edges/subgraphs without rendering. The 1200-line upstream
 * version handles layout, classes, click handlers, link styles, etc.; for
 * validation we just need the parser to see methods that don't throw.
 */

const { createCommonDb } = require('./commonDb');

function createFlowDb() {
  const common = createCommonDb();
  const vertices = new Map();
  const edges = [];
  const classes = new Map();
  const subGraphs = [];
  const subGraphLookup = new Map();
  const tooltips = new Map();
  let direction = 'TB';
  let subCount = 0;
  const noop = () => {};
  const noopRet = (v) => () => v;

  // upstream "lex" object has `firstGraph()` invoked from parser to detect
  // graph/flowchart on the first line — return null so the lexer just sees
  // it as data.
  const lex = { firstGraph: () => null, rules: [], conditions: {} };

  const addVertex = (id, textOrObj, type, style, classes_, dir, props, metadata) => {
    const node = vertices.get(id) || {
      id, domId: 'flowchart-' + id + '-' + vertices.size,
      label: id, text: typeof textOrObj === 'string' ? textOrObj : (textOrObj && textOrObj.text) || id,
      type: type || undefined, styles: [], classes: [], dir, props: props || {}
    };
    if (style) node.styles.push(...(Array.isArray(style) ? style : [style]));
    if (classes_) node.classes.push(...(Array.isArray(classes_) ? classes_ : [classes_]));
    if (metadata) node.metadata = metadata;
    vertices.set(id, node);
    return node;
  };

  return {
    lex,
    clear() {
      vertices.clear(); edges.length = 0; classes.clear(); subGraphs.length = 0;
      subGraphLookup.clear(); tooltips.clear();
      direction = 'TB'; subCount = 0;
      common.clear();
    },

    // Directive / graph type
    setGen(_)        {},
    setDirection(d)  { direction = d; },
    getDirection()   { return direction; },

    // Vertex
    addVertex,
    addLink(start, end, type) {
      for (const s of (Array.isArray(start) ? start : [start])) {
        for (const e of (Array.isArray(end) ? end : [end])) {
          edges.push({ start: s, end: e, type });
        }
      }
    },
    addSingleLink(start, end, type) { edges.push({ start, end, type }); },
    updateLink(positions, style)  { void positions; void style; },
    updateLinkInterpolate(positions, interp) { void positions; void interp; },
    addClass(ids, style) {
      for (const id of (typeof ids === 'string' ? ids.split(',') : ids || [])) {
        const c = { id: id.trim(), styles: Array.isArray(style) ? style : [style] };
        classes.set(c.id, c);
      }
    },
    setClass(ids, cssClassName) {
      for (const id of (ids || '').split(',')) {
        const v = vertices.get(id.trim());
        if (v) v.classes.push(cssClassName);
      }
    },
    setLink(ids, linkStr, target) {
      for (const id of (ids || '').split(',')) {
        const v = vertices.get(id.trim());
        if (v) { v.link = linkStr; v.linkTarget = target; }
      }
    },
    setTooltip(ids, tooltip) {
      for (const id of (ids || '').split(',')) tooltips.set(id.trim(), tooltip);
    },
    setClickEvent(ids, fnName, fnArgs) { void ids; void fnName; void fnArgs; },
    setClickFun(ids, fn) { void ids; void fn; },
    bindFunctions() {},

    // Subgraph
    addSubGraph(_id, list, title) {
      const id = (_id && (_id.text || _id)) || 'subGraph' + subCount++;
      const sg = { id, nodes: list || [], title: (title && (title.text || title)) || id };
      subGraphs.push(sg); subGraphLookup.set(sg.id, sg);
      return sg.id;
    },
    getSubGraphs()      { return subGraphs; },
    getSubGraphTitleId(...args) { return args[0]; },

    // Styles
    addStyle(id, styles) { const v = vertices.get(id); if (v) v.styles.push(...(Array.isArray(styles) ? styles : [styles])); },
    addCssStyles(ids, styles) { for (const id of ids || []) { const v = vertices.get(id); if (v) v.styles.push(...(styles || [])); } },
    addLink_(start, end, type) { edges.push({ start, end, type }); },

    // Shape data (v11 added @{shape: ...})
    setShapeData(id, data) { const v = vertices.get(id); if (v) v.shapeData = data; },

    // Accessors used downstream
    getVertices() { return vertices; },
    getEdges()    { return edges; },
    getClasses()  { return classes; },
    getTooltip(id) { return tooltips.get(id); },
    getData() { return { nodes: [...vertices.values()], edges }; },

    defaultStyle()  { return 'fill:#fff'; },
    firstGraph()    { return false; },

    // Common
    getCommonDb: () => common,
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle()
  };
}

module.exports = { createFlowDb };
