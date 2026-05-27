/**
 * Markdown Processing Routes
 * API endpoints for processing markdown files with Mermaid diagrams
 */

const express = require('express');
const router = express.Router();
const MarkdownMermaidFixer = require('../services/markdownMermaidFixer');
const logger = require('../utils/logger');

// Module-level singleton. The fixer's grammar parsers cost ~4-5s to compile
// from scratch; if we built one per request (as the original code did) every
// /api/v1/markdown/fix and /validate call paid that cost. The fixer is
// inherently stateless across requests (it processes one markdown payload
// per call and produces a fresh result object), so a single shared instance
// is safe and cuts request time from ~5s to <100ms.
const fixer = new MarkdownMermaidFixer();

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
