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
 * v11 timelineDb — ported from upstream mermaid-js/mermaid `diagrams/timeline/timelineDb.js`.
 * Validation-only port.
 */

const { createCommonDb } = require('./commonDb');

function createTimelineDb() {
  const commonDb = createCommonDb();
  let currentSection = '';
  let currentTaskId = 0;
  let direction = 'LR';
  const sections = [];
  const tasks = [];
  const rawTasks = [];

  return {
    getCommonDb: () => commonDb,
    clear() {
      sections.length = 0;
      tasks.length = 0;
      currentSection = '';
      rawTasks.length = 0;
      direction = 'LR';
      commonDb.clear();
    },
    setDirection(dir) { direction = dir; },
    getDirection() { return direction; },
    addSection(txt) { currentSection = txt; sections.push(txt); },
    getSections() { return sections; },
    getTasks() { return tasks.concat(rawTasks); },
    addTask(period, length, event) {
      rawTasks.push({
        id: currentTaskId++,
        section: currentSection,
        type: currentSection,
        task: period,
        score: length || 0,
        events: event ? [event] : []
      });
    },
    addEvent(event) {
      const t = rawTasks.find((x) => x.id === currentTaskId - 1);
      if (t) t.events.push(event);
    },
    addTaskOrg(descr) {
      tasks.push({ section: currentSection, type: currentSection, description: descr, task: descr, classes: [] });
    },
    // common methods proxied (timeline grammar may call them directly)
    getAccTitle:       () => commonDb.getAccTitle(),
    setAccTitle:       (t) => commonDb.setAccTitle(t),
    getAccDescription: () => commonDb.getAccDescription(),
    setAccDescription: (t) => commonDb.setAccDescription(t),
    getDiagramTitle:   () => commonDb.getDiagramTitle(),
    setDiagramTitle:   (t) => commonDb.setDiagramTitle(t)
  };
}

module.exports = { createTimelineDb };
