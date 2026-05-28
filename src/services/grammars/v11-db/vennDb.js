/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 vennDb — port of `diagrams/venn/vennDb.ts` (validation-only). New diagram type in v11.
 */

const { createCommonDb } = require('./commonDb');

function createVennDb() {
  const common = createCommonDb();
  const subsets = [];
  const textNodes = [];
  const styleEntries = [];
  const knownSets = new Set();
  let currentSets;
  let indentMode = false;

  const normalizeText = (t) => {
    const s = String(t || '').trim();
    if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
    return s;
  };
  const normalizeIdentifierList = (ids) => Array.from(new Set((ids || []).map((x) => String(x).trim())));

  return {
    clear() { subsets.length = 0; textNodes.length = 0; styleEntries.length = 0; knownSets.clear(); currentSets = undefined; indentMode = false; common.clear(); },
    addSubsetData(identifierList, label, size) {
      const sets = normalizeIdentifierList(identifierList).sort();
      const s = size != null ? size : 10 / Math.pow((identifierList || []).length || 1, 2);
      currentSets = sets;
      if (sets.length === 1) knownSets.add(sets[0]);
      subsets.push({ sets, size: s, label: label ? normalizeText(label) : undefined });
    },
    getSubsetData()   { return subsets; },
    getTextNodes()    { return textNodes; },
    getStyleEntries() { return styleEntries; },
    getKnownSets()    { return knownSets; },
    addTextNode(label, position) { textNodes.push({ label: normalizeText(label), position }); },
    addStyleEntry(set, style) { styleEntries.push({ set, style }); },
    setIndentMode(m)  { indentMode = !!m; },
    isIndentMode()    { return indentMode; },
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle(),
    getCommonDb:       () => common
  };
}

module.exports = { createVennDb };
