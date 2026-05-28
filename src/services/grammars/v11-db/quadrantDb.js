/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *   https://github.com/mermaid-js/mermaid
 *
 * This file is a port of the corresponding DB module from upstream
 * Mermaid, adapted for validation-only use (renderer/layout code stripped).
 * Combined work distributed under Apache-2.0; the original MIT terms apply
 * to the upstream-derived portions. See LICENSE and NOTICE in repo root.
 */

/**
 * v11 quadrantDb — ported from upstream `diagrams/quadrant-chart/quadrantDb.ts`.
 * Validation-only: skip QuadrantBuilder / theme integration. Style validators
 * still throw on truly invalid input (radius isn't a number, etc.) so parser
 * errors for those are reported through the validator's tri-state mechanism.
 */

const { createCommonDb } = require('./commonDb');

class InvalidStyleError extends Error {
  constructor(key, value, expected) { super(`style "${key}=${value}" must be ${expected}`); }
}
const isNumber = (s) => /^-?\d+(\.\d+)?$/.test(String(s).trim());
const isHex = (s) => /^#([0-9a-f]{3}){1,2}$/i.test(String(s).trim());
const isPixels = (s) => /^\d+px$/i.test(String(s).trim());

function createQuadrantDb() {
  const common = createCommonDb();
  const state = { points: [], classes: new Map(), config: {} };

  const parseStyles = (styles) => {
    const out = {};
    for (const s of styles || []) {
      const [k, v] = s.trim().split(/\s*:\s*/);
      if (k === 'radius') { if (!isNumber(v)) throw new InvalidStyleError(k, v, 'number'); out.radius = parseInt(v, 10); }
      else if (k === 'color') { if (!isHex(v)) throw new InvalidStyleError(k, v, 'hex code'); out.color = v; }
      else if (k === 'stroke-color') { if (!isHex(v)) throw new InvalidStyleError(k, v, 'hex code'); out.strokeColor = v; }
      else if (k === 'stroke-width') { if (!isPixels(v)) throw new InvalidStyleError(k, v, 'pixels (eg. 10px)'); out.strokeWidth = v; }
      else throw new Error(`style named ${k} is not supported.`);
    }
    return out;
  };

  return {
    setWidth(w)             { state.config.chartWidth = w; },
    setHeight(h)            { state.config.chartHeight = h; },
    setQuadrant1Text(o)     { /* no-op */ void o; },
    setQuadrant2Text(o)     { /* no-op */ void o; },
    setQuadrant3Text(o)     { /* no-op */ void o; },
    setQuadrant4Text(o)     { /* no-op */ void o; },
    setXAxisLeftText(o)     { /* no-op */ void o; },
    setXAxisRightText(o)    { /* no-op */ void o; },
    setYAxisTopText(o)      { /* no-op */ void o; },
    setYAxisBottomText(o)   { /* no-op */ void o; },
    parseStyles,
    addPoint(textObj, className, x, y, styles) {
      state.points.push({ x, y, text: String(textObj && textObj.text || ''), className, ...parseStyles(styles) });
    },
    addClass(name, styles) { state.classes.set(name, parseStyles(styles)); },
    getQuadrantData()      { return { points: state.points, title: common.getDiagramTitle() }; },
    clear() { state.points.length = 0; state.classes.clear(); state.config = {}; common.clear(); },
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle()
  };
}

module.exports = { createQuadrantDb };
