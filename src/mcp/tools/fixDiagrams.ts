/**
 * Fix Diagrams MCP Tool
 * Iteratively auto-fixes invalid Mermaid diagrams using MermaidAutoFixer,
 * re-validating after each pass until valid, no further progress is possible,
 * or maxIterations is reached.
 */

import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { DiagramSchema } from "../schemas/common.js";

const MermaidAutoFixer = require("../../../src/services/mermaidAutoFixer");
const logger = require("../../../src/utils/logger");
const config = require("../../../src/config/config");

const FixOptionsSchema = z.object({
  maxIterations: z.number().int().min(1).max(10).default(5).optional(),
  includeHistory: z.boolean().default(false).optional(),
  includeOriginal: z.boolean().default(true).optional()
});

export const fixDiagramsToolSchema = z.object({
  diagrams: z.array(DiagramSchema)
    .min(1, "At least one diagram is required")
    .max(config.validation?.maxTotalDiagrams || 100,
         `Maximum ${config.validation?.maxTotalDiagrams || 100} diagrams allowed`),
  options: FixOptionsSchema.optional()
});

export type FixDiagramsInput = z.infer<typeof fixDiagramsToolSchema>;

interface IterationRecord {
  iteration: number;
  valid: boolean;
  errorCount: number;
  fixCount: number;
  fixesApplied: string[];
}

export async function handleFixDiagrams(
  params: FixDiagramsInput,
  validator: any
) {
  const requestId = uuidv4();
  const startTime = Date.now();
  const autoFixer = new MermaidAutoFixer();
  const { diagrams, options = {} } = params;
  const maxIter = options.maxIterations ?? 5;
  const includeHistory = options.includeHistory ?? false;
  const includeOriginal = options.includeOriginal !== false;

  const results = await Promise.all(diagrams.map(async (d, idx) => {
    const id = d.id || `diagram_${idx + 1}`;
    const originalContent = d.content;
    let content = originalContent;
    const detectedType: string = d.type || validator.detectDiagramType(content);
    let iteration = 0;
    let isValid = false;
    let wasFixed = false;
    const allAppliedFixes: any[] = [];
    const history: IterationRecord[] = [];
    let lastErrors: any[] = [];

    while (iteration < maxIter && !isValid) {
      iteration++;
      const v = await validator.validateDiagram({ id, content, type: detectedType });
      lastErrors = v.errors || [];

      if (v.valid) {
        isValid = true;
        history.push({ iteration, valid: true, errorCount: 0, fixCount: 0, fixesApplied: [] });
        break;
      }

      const fix = autoFixer.autoFix(content, detectedType, lastErrors);
      const fixNames = (fix.appliedFixes || []).map((f: any) => f.name);
      history.push({
        iteration,
        valid: false,
        errorCount: lastErrors.length,
        fixCount: fixNames.length,
        fixesApplied: fixNames
      });

      // No applicable fix or fixer made no real change -> stop iterating.
      if (!fix.fixable || fix.fixedContent === content) break;

      content = fix.fixedContent;
      wasFixed = true;
      allAppliedFixes.push(...(fix.appliedFixes || []));
    }

    return {
      id,
      success: isValid,
      wasFixed,
      diagramType: detectedType,
      originalContent: includeOriginal ? originalContent : undefined,
      fixedContent: content,
      iterations: iteration,
      appliedFixes: allAppliedFixes,
      remainingErrors: isValid ? [] : lastErrors,
      history: includeHistory ? history : undefined
    };
  }));

  return {
    requestId,
    timestamp: new Date().toISOString(),
    processingTime: Date.now() - startTime,
    fixer: "mermaid_auto_fixer",
    totalDiagrams: diagrams.length,
    validAfterFix: results.filter(r => r.success).length,
    stillInvalid: results.filter(r => !r.success).length,
    fixedDiagrams: results.filter(r => r.wasFixed).length,
    results,
    fixOptions: {
      maxIterations: maxIter,
      includeHistory,
      includeOriginal
    }
  };
}
