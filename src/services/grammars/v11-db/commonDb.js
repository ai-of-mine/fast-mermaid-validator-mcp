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
 * v11 commonDb — ported from upstream mermaid-js/mermaid `diagrams/common/commonDb.ts`.
 *
 * Used by ~12 v11 jison grammars for accessibility-title, accessibility-description,
 * and diagram-title management. Each call to `createCommonDb()` returns a fresh
 * instance so per-request state stays isolated.
 *
 * For validation purposes we strip the `sanitizeText` step (which depends on
 * the renderer's config); our copy just trims leading whitespace from titles.
 */

function createCommonDb() {
  let accTitle = '';
  let diagramTitle = '';
  let accDescription = '';

  // Lightweight sanitizer — upstream uses getConfig()-driven HTML escaping
  // which is renderer-relevant; for parsing we just normalize whitespace.
  const sanitize = (txt) => String(txt || '').replace(/^\s+/g, '');

  return {
    clear() { accTitle = ''; accDescription = ''; diagramTitle = ''; },
    setAccTitle(txt)        { accTitle = sanitize(txt); },
    getAccTitle()           { return accTitle; },
    setAccDescription(txt)  { accDescription = String(txt || '').replace(/\n\s+/g, '\n'); },
    getAccDescription()     { return accDescription; },
    setDiagramTitle(txt)    { diagramTitle = sanitize(txt); },
    getDiagramTitle()       { return diagramTitle; }
  };
}

module.exports = { createCommonDb };
