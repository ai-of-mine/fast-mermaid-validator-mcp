/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 ganttDb — minimal stub port for `diagrams/gantt/ganttDb.js`.
 */

const { createCommonDb } = require('./commonDb');

function createGanttDb() {
  const common = createCommonDb();
  const sections = [];
  const tasks = [];
  const rawTasks = [];
  let dateFormat = '';
  let axisFormat = '';
  let tickInterval = '';
  let topAxis = false;
  let displayMode = '';
  let inclusiveEndDates = false;
  let excludes = [];
  let includes = [];
  let weekday = 'sunday';
  let weekend = ['saturday', 'sunday'];
  let titleText = '';
  let currentSection = '';
  const links = {};

  const noop = () => {};

  return {
    clear() {
      sections.length = 0; tasks.length = 0; rawTasks.length = 0;
      dateFormat = ''; axisFormat = ''; tickInterval = ''; topAxis = false; displayMode = '';
      inclusiveEndDates = false; excludes = []; includes = []; weekday = 'sunday'; weekend = ['saturday', 'sunday'];
      titleText = ''; currentSection = '';
      common.clear();
    },
    setDateFormat(f)      { dateFormat = f; },
    getDateFormat()       { return dateFormat; },
    enableInclusiveEndDates() { inclusiveEndDates = true; },
    endDatesAreInclusive() { return inclusiveEndDates; },
    enableTopAxis()       { topAxis = true; },
    topAxisEnabled()      { return topAxis; },
    setAxisFormat(f)      { axisFormat = f; },
    getAxisFormat()       { return axisFormat; },
    setTickInterval(t)    { tickInterval = t; },
    getTickInterval()     { return tickInterval; },
    setTodayMarker:       noop, getTodayMarker: () => '',
    setIncludes(s) { includes = s ? String(s).split(' ').map((d) => d.trim()) : []; },
    getIncludes()         { return includes; },
    setExcludes(s) { excludes = s ? String(s).split(' ').map((d) => d.trim()) : []; },
    getExcludes()         { return excludes; },
    setWeekday(d)         { weekday = d; },
    getWeekday()          { return weekday; },
    setWeekend(d)         { weekend = d; },
    addSection(txt)       { currentSection = txt; sections.push(txt); },
    getSections()         { return sections; },
    getTasks()            { return tasks; },
    addTask(taskName, taskData) {
      rawTasks.push({ section: currentSection, type: currentSection, processed: false, task: taskName, raw: taskData });
    },
    addTaskOrg(descr) {
      tasks.push({ section: currentSection, description: descr, task: descr });
    },
    setLink(ids, link) { for (const id of (ids || '').split(',')) links[id.trim()] = link; },
    getLinks()            { return links; },
    bindFunctions()       {},
    setClass:             noop,
    setClickEvent:        noop,
    addLinks:             noop,
    addClass:             noop,
    setLinks:             noop,
    setClickFun:          noop,

    // Title alias methods used by grammar
    setTitle(t)           { titleText = t; common.setDiagramTitle(t); },
    getTitle()            { return titleText; },

    findTaskById(id) { return tasks.find((t) => t.id === id); },

    getCommonDb: () => common,
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle()
  };
}

module.exports = { createGanttDb };
