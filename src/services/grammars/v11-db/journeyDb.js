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
 * v11 journeyDb — ported from upstream `diagrams/user-journey/journeyDb.js`.
 * Validation-only port.
 */

const { createCommonDb } = require('./commonDb');

function createJourneyDb() {
  const common = createCommonDb();
  let currentSection = '';
  const sections = [];
  const tasks = [];
  const rawTasks = [];

  return {
    clear() {
      sections.length = 0;
      tasks.length = 0;
      currentSection = '';
      rawTasks.length = 0;
      common.clear();
    },
    addSection(txt) { currentSection = txt; sections.push(txt); },
    getSections() { return sections; },
    getTasks() { return tasks.concat(rawTasks); },
    addTask(descr, taskData) {
      const pieces = String(taskData || '').substr(1).split(':');
      const score = Number(pieces[0]) || 0;
      const peeps = pieces.length > 1 ? pieces[1].split(',').map((s) => s.trim()) : [];
      rawTasks.push({ section: currentSection, type: currentSection, people: peeps, task: descr, score });
    },
    addTaskOrg(descr) {
      tasks.push({ section: currentSection, type: currentSection, description: descr, task: descr, classes: [] });
    },
    getActors() {
      const acc = [];
      for (const t of tasks) if (t.people) acc.push(...t.people);
      return [...new Set(acc)].sort();
    },
    getConfig: () => ({}),
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle()
  };
}

module.exports = { createJourneyDb };
