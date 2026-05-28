/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 sequenceDb — minimal stub port of `diagrams/sequence/sequenceDb.ts` for
 * validation-only use. Records actors/messages/notes; skips layout & rendering.
 */

const { createCommonDb } = require('./commonDb');

const LINETYPE = {
  SOLID: 'SOLID', DOTTED: 'DOTTED', SOLID_CROSS: 'SOLID_CROSS', DOTTED_CROSS: 'DOTTED_CROSS',
  SOLID_OPEN: 'SOLID_OPEN', DOTTED_OPEN: 'DOTTED_OPEN',
  LOOP_START: 'LOOP_START', LOOP_END: 'LOOP_END',
  ALT_START: 'ALT_START', ALT_ELSE: 'ALT_ELSE', ALT_END: 'ALT_END',
  OPT_START: 'OPT_START', OPT_END: 'OPT_END',
  ACTIVE_START: 'ACTIVE_START', ACTIVE_END: 'ACTIVE_END',
  PAR_START: 'PAR_START', PAR_AND: 'PAR_AND', PAR_END: 'PAR_END',
  RECT_START: 'RECT_START', RECT_END: 'RECT_END',
  SOLID_POINT: 'SOLID_POINT', DOTTED_POINT: 'DOTTED_POINT',
  AUTONUMBER: 'AUTONUMBER',
  CRITICAL_START: 'CRITICAL_START', CRITICAL_OPTION: 'CRITICAL_OPTION', CRITICAL_END: 'CRITICAL_END',
  BREAK_START: 'BREAK_START', BREAK_END: 'BREAK_END',
  PAR_OVER_START: 'PAR_OVER_START',
  NOTE: 'NOTE'
};
const ARROWTYPE = { FILLED: 'FILLED', OPEN: 'OPEN', CROSS: 'CROSS' };
const PLACEMENT = { LEFTOF: 'LEFTOF', RIGHTOF: 'RIGHTOF', OVER: 'OVER' };

function createSequenceDb() {
  const common = createCommonDb();
  let prevActor;
  let prevBoxId;
  const actors = new Map();
  const messages = [];
  const notes = [];
  const links = [];
  const boxes = [];
  let sequenceNumbersEnabled = false;
  let wrap = false;

  const parseMessage = (str) => ({ text: String(str || '').trim().replace(/^:?\s*/, ''), wrap });
  const parseBoxData = (str) => ({ text: String(str || '').trim(), color: null, wrap });

  return {
    LINETYPE, ARROWTYPE, PLACEMENT,
    clear() {
      actors.clear(); messages.length = 0; notes.length = 0; links.length = 0; boxes.length = 0;
      prevActor = undefined; prevBoxId = undefined; sequenceNumbersEnabled = false; wrap = false;
      common.clear();
    },
    addActor(name, description, link, type) {
      const existing = actors.get(name);
      if (existing) { if (description) existing.description = description; return; }
      actors.set(name, { name, description: description || name, type: type || 'participant', wrap });
      prevActor = name;
    },
    getActor(id) { return actors.get(id); },
    getActors() { return actors; },
    getActorKeys() { return [...actors.keys()]; },
    addMessage(idFrom, idTo, message, answer) {
      messages.push({ from: idFrom, to: idTo, message: message && message.text || '', wrap: message && message.wrap, answer });
    },
    addSignal(idFrom, idTo, message, messageType, activate) {
      messages.push({ from: idFrom, to: idTo, message: message && message.text || '', type: messageType, activate });
    },
    addNote(actor, placement, message) {
      notes.push({ actor, placement, message: message && message.text || message });
    },
    addLinks(actor, link) { links.push({ actor, link }); },
    addLink(actor, link)  { links.push({ actor, link }); },
    addProperties(actor, props) { void actor; void props; },
    addDetails(actor, text) { void actor; void text; },
    addBox(data) { const b = { id: `box-${boxes.length}`, name: data && data.text || '', wrap }; boxes.push(b); prevBoxId = b.id; },
    boxEnd() { prevBoxId = undefined; },
    apply() {},
    addParticipant(name, desc, type) { return this.addActor(name, desc, undefined, type); },
    parseMessage, parseBoxData,
    getMessages() { return messages; },
    getNotes() { return notes; },
    getLinks() { return links; },
    getBoxes() { return boxes; },
    enableSequenceNumbers() { sequenceNumbersEnabled = true; },
    disableSequenceNumbers() { sequenceNumbersEnabled = false; },
    showSequenceNumbers() { return sequenceNumbersEnabled; },
    setWrap(w) { wrap = !!w; },
    autoWrap() { return wrap; },
    setActorProperty() {}, addActorIcon() {},
    getDirection: () => 'TB',
    setDirection() {},
    getCommonDb: () => common,
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle()
  };
}

module.exports = { createSequenceDb };
