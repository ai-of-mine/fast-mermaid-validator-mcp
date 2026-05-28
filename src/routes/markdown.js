/**
 * Markdown Processing Routes
 * API endpoints for processing markdown files with Mermaid diagrams
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
// Shared singleton — see src/services/fixerInstance.js. Reuses one
// MarkdownMermaidFixer (and its compiled grammar parsers) across all routes
// that need it (the markdown/* routes here and the /upload/fix route in
// validation.js), so we don't pay the ~4-5s jison-compile cost per request.
const fixer = require('../services/fixerInstance');

/**
 * @swagger
 * /markdown/fix:
 *   post:
 *     tags: [markdown]
 *     summary: "[BETA] Auto-fix all Mermaid diagrams inside a markdown document"
 *     description: |
 *       **BETA — heuristic auto-fixer.** Extracts every fenced ```mermaid block, attempts iterative auto-fix (up to 5 passes per diagram), and returns the rewritten markdown plus statistics.
 *
 *       The fixer applies pattern-based corrections (common arrow typos, missing keywords, malformed brackets). It is **not** a semantic rewriter — it can change diagrams in subtle ways and does NOT guarantee the fixed output matches your intent. Treat as a best-effort transform and review the diff before accepting.
 *
 *       Stability: experimental. The fix patterns and response shape may change between minor versions.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, description: Full markdown body }
 *               options: { type: object, description: Optional fixer overrides, additionalProperties: true }
 *     responses:
 *       200:
 *         description: Markdown processed (success may be false if some diagrams could not be fixed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 fixedContent: { type: string }
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     totalDiagrams: { type: integer }
 *                     fixedDiagrams: { type: integer }
 *                     failedDiagrams: { type: integer }
 *                     totalIterations: { type: integer }
 *                     processingTime: { type: integer }
 *                 diagrams:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       success: { type: boolean }
 *                       wasFixed: { type: boolean }
 *                       iterations: { type: integer }
 *                 report: { type: string }
 *       400: { description: Missing content, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       500: { description: Server error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/fix', async (req, res) => {
  try {
    const { content, options } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Missing required field: content',
        message: 'Please provide markdown content to process'
      });
    }

    const result = await fixer.processMarkdown(content, options || {});

    res.json({
      success: result.success,
      fixedContent: result.fixedContent,
      statistics: {
        totalDiagrams: result.totalDiagrams,
        fixedDiagrams: result.fixedDiagrams,
        failedDiagrams: result.failedDiagrams,
        totalIterations: result.totalIterations,
        processingTime: result.processingTime
      },
      diagrams: result.diagrams.map(d => ({
        id: d.id,
        success: d.success,
        wasFixed: d.wasFixed,
        iterations: d.iterations
      })),
      report: fixer.generateReport(result)
    });

  } catch (error) {
    logger.error('Markdown fix error:', error);
    res.status(500).json({
      error: 'Processing failed',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /markdown/validate:
 *   post:
 *     tags: [markdown]
 *     summary: Validate (no fixing) all Mermaid diagrams in a markdown document
 *     description: Extracts every fenced ```mermaid block and validates each. Does not modify content.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, description: Full markdown body }
 *           examples:
 *             tiny:
 *               summary: One inline flowchart
 *               value:
 *                 content: "```mermaid\nflowchart TD\n  A-->B\n```"
 *     responses:
 *       200:
 *         description: Validation completed (success=true iff invalidDiagrams===0)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/MarkdownValidateResponse' }
 *       400: { description: Missing content, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       500: { description: Server error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/validate', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Missing required field: content',
        message: 'Please provide markdown content to validate'
      });
    }

    // Accept options.mermaidVersion to opt into the v11 grammar set.
    const opts = req.body.options || {};
    const result = await fixer.validateMarkdown(content, { mermaidVersion: opts.mermaidVersion });

    // `success` reflects "no diagrams flagged invalid". Unsupported diagrams
    // (where we literally couldn't validate) are reported but do NOT flip
    // success — that would be a false-negative the same shape as the old bug.
    res.json({
      success: result.invalidDiagrams === 0,
      totalDiagrams: result.totalDiagrams,
      validDiagrams: result.validDiagrams,
      invalidDiagrams: result.invalidDiagrams,
      unsupportedDiagrams: result.unsupportedDiagrams,
      results: result.results
    });

  } catch (error) {
    logger.error('Markdown validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

module.exports = router;

// Made with Bob
