/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 requirementDb — port of `diagrams/requirement/requirementDb.ts` (validation-only).
 */

const { createCommonDb } = require('./commonDb');

const RequirementType = {
  REQUIREMENT: 'Requirement',
  FUNCTIONAL_REQUIREMENT: 'FunctionalRequirement',
  INTERFACE_REQUIREMENT: 'InterfaceRequirement',
  PERFORMANCE_REQUIREMENT: 'PerformanceRequirement',
  PHYSICAL_REQUIREMENT: 'PhysicalRequirement',
  DESIGN_CONSTRAINT: 'DesignConstraint'
};
const RiskLevel = { LOW_RISK: 'Low', MED_RISK: 'Medium', HIGH_RISK: 'High' };
const VerifyType = { VERIFY_ANALYSIS: 'Analysis', VERIFY_DEMONSTRATION: 'Demonstration', VERIFY_INSPECTION: 'Inspection', VERIFY_TEST: 'Test' };
const Relationships = {
  CONTAINS: 'contains', COPIES: 'copies', DERIVES: 'derives', SATISFIES: 'satisfies',
  VERIFIES: 'verifies', REFINES: 'refines', TRACES: 'traces'
};

function createRequirementDb() {
  const common = createCommonDb();
  const requirements = new Map();
  const elements = new Map();
  const relations = [];
  let direction = 'TB';
  let latestRequirement = {};
  let latestElement = {};

  return {
    RequirementType, RiskLevel, VerifyType, Relationships,
    getDirection: () => direction,
    setDirection: (d) => { direction = d; },
    resetLatestRequirement() { latestRequirement = {}; },
    resetLatestElement() { latestElement = {}; },
    addRequirement(name, type) {
      if (!requirements.has(name)) {
        requirements.set(name, {
          requirementId: latestRequirement.requirementId,
          name, text: latestRequirement.text, risk: latestRequirement.risk,
          verifyMethod: latestRequirement.verifyMethod, type
        });
      }
      latestRequirement = {};
      return requirements.get(name);
    },
    getRequirements() { return requirements; },
    setNewReqId(id)            { if (latestRequirement) latestRequirement.requirementId = id; },
    setNewReqText(text)        { if (latestRequirement) latestRequirement.text = text; },
    setNewReqRisk(risk)        { if (latestRequirement) latestRequirement.risk = risk; },
    setNewReqVerifyMethod(v)   { if (latestRequirement) latestRequirement.verifyMethod = v; },
    addElement(name) {
      if (!elements.has(name)) {
        elements.set(name, {
          name,
          type: latestElement.type, docRef: latestElement.docRef
        });
      }
      latestElement = {};
      return elements.get(name);
    },
    getElements() { return elements; },
    setNewElementType(t)       { if (latestElement) latestElement.type = t; },
    setNewElementDocRef(d)     { if (latestElement) latestElement.docRef = d; },
    addRelationship(type, src, dst) { relations.push({ type, src, dst }); },
    getRelationships() { return relations; },
    addClass() {}, setClass() {}, addCssStyles() {},
    getCommonDb: () => common,
    clear() { requirements.clear(); elements.clear(); relations.length = 0; latestRequirement = {}; latestElement = {}; direction = 'TB'; common.clear(); },
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle()
  };
}

module.exports = { createRequirementDb };
