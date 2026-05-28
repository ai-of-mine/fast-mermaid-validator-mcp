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
 * POST /api/markdown/fix
 * Fix all Mermaid diagrams in markdown content
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
 * POST /api/markdown/validate
 * Validate all Mermaid diagrams in markdown without fixing
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

    const result = await fixer.validateMarkdown(content);

    res.json({
      success: result.invalidDiagrams === 0,
      totalDiagrams: result.totalDiagrams,
      validDiagrams: result.validDiagrams,
      invalidDiagrams: result.invalidDiagrams,
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
