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
 * v11 ishikawaDb — ported from upstream mermaid-js/mermaid `diagrams/ishikawa/ishikawaDb.ts`.
 * Validation-only port: keeps the parser-facing methods, drops sanitizeText config.
 */

const { createCommonDb } = require('./commonDb');

function createIshikawaDb() {
  const common = createCommonDb();
  let root;
  let stack = [];
  let baseLevel;

  const db = {
    clear() {
      root = undefined;
      stack = [];
      baseLevel = undefined;
      common.clear();
    },
    getRoot() { return root; },
    addNode(rawLevel, text) {
      const label = String(text || '').trim();
      if (!root) {
        root = { text: label, children: [] };
        stack = [{ level: 0, node: root }];
        common.setDiagramTitle(label);
        return;
      }
      if (baseLevel === undefined) baseLevel = rawLevel;
      let level = rawLevel - baseLevel + 1;
      if (level <= 0) level = 1;
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      const parent = stack[stack.length - 1].node;
      const node = { text: label, children: [] };
      parent.children.push(node);
      stack.push({ level, node });
    },
    getAccTitle:       () => common.getAccTitle(),
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccDescription: () => common.getAccDescription(),
    setAccDescription: (t) => common.setAccDescription(t),
    getDiagramTitle:   () => common.getDiagramTitle(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t)
  };
  return db;
}

module.exports = { createIshikawaDb };
