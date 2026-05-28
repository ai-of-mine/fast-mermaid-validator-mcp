/**
 * Validation Routes
 * Endpoints for validating Mermaid diagrams using custom grammar parser
 * Author: Gregorio Elias Roecker Momm
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const logger = require('../utils/logger');
const CustomMermaidValidator = require('../services/customMermaidValidator');
const FileProcessor = require('../services/fileProcessor');
// Shared singleton fixer — used by /api/v1/upload/fix and the markdown router.
// See src/services/fixerInstance.js for why this is shared.
const fixer = require('../services/fixerInstance');
const { 
  validateRequest, 
  validateDiagramsInput, 
  fileUploadSecurity,
  validateContentType 
} = require('../middleware/security');

const router = express.Router();
const validator = new CustomMermaidValidator();
const fileProcessor = new FileProcessor();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `upload-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles
  },
  fileFilter: (req, file, cb) => {
    // Allow all files - detailed validation will happen in security middleware
    // This handles cases where MIME type detection fails or is incorrect
    cb(null, true);
  }
});

/**
 * @swagger
 * /validate:
 *   post:
 *     tags: [validation]
 *     summary: Validate one or more Mermaid diagrams (JSON body)
 *     description: Direct validation against the custom Jison/Langium grammar parser. No file upload required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [diagrams]
 *             properties:
 *               diagrams:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/DiagramInput' }
 *               options:
 *                 type: object
 *                 properties:
 *                   timeout: { type: integer, description: Per-diagram timeout in ms }
 *           examples:
 *             flowchart:
 *               summary: One flowchart
 *               value:
 *                 diagrams:
 *                   - id: diagram_1
 *                     content: "flowchart TD\n  A-->B"
 *     responses:
 *       200:
 *         description: Validation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestId: { type: string, format: uuid }
 *                 timestamp: { type: string, format: date-time }
 *                 processingTime: { type: integer }
 *                 validator: { type: string, example: custom_grammar_parser }
 *                 totalDiagrams: { type: integer }
 *                 validDiagrams: { type: integer }
 *                 invalidDiagrams: { type: integer }
 *                 results:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/DiagramResult' }
 *       400: { description: Bad input (e.g., too many diagrams), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       500: { description: Server error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post(
  '/validate',
  validateContentType(['application/json']),
  validateDiagramsInput,
  validateRequest,
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { diagrams, options = {} } = req.body;
      
      // Validate total diagram count
      if (diagrams.length > config.validation.maxTotalDiagrams) {
        return res.status(400).json({
          error: 'Too many diagrams',
          message: `Maximum ${config.validation.maxTotalDiagrams} diagrams allowed`
        });
      }

      // Process diagrams
      const diagramObjects = fileProcessor.processDirectContent(diagrams);
      
      // Validate diagrams using custom grammar parser
      const results = await validator.validateMultipleDiagrams(diagramObjects, {
        timeout: options.timeout || config.validation.timeout
      });

      // Add request metadata
      results.requestId = uuidv4();
      results.processingTime = Date.now() - startTime;
      results.timestamp = new Date().toISOString();
      results.validator = 'custom_grammar_parser';

      res.json(results);

    } catch (error) {
      logger.logError(error, { 
        context: 'direct_validation',
        ip: req.ip,
        diagramCount: req.body?.diagrams?.length
      });

      res.status(500).json({
        error: 'Validation failed',
        message: error.message,
        requestId: uuidv4(),
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /upload/file:
 *   post:
 *     tags: [validation]
 *     summary: Validate Mermaid diagrams inside uploaded files
 *     description: Accepts one or more markdown (.md) files (and ZIP archives) via multipart upload, extracts all Mermaid code blocks, and validates each.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: array
 *                 items: { type: string, format: binary }
 *                 description: One or more files. Field name MUST be "file".
 *               timeout:
 *                 type: integer
 *                 description: Per-diagram timeout override (ms)
 *     responses:
 *       200:
 *         description: Validation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestId: { type: string, format: uuid }
 *                 timestamp: { type: string, format: date-time }
 *                 processingTime: { type: integer }
 *                 validator: { type: string }
 *                 totalFiles: { type: integer }
 *                 processedFiles: { type: integer }
 *                 totalDiagrams: { type: integer }
 *                 validDiagrams: { type: integer }
 *                 invalidDiagrams: { type: integer }
 *                 fileProcessing:
 *                   type: object
 *                   properties:
 *                     totalFiles: { type: integer }
 *                     processedFiles: { type: integer }
 *                     errors: { type: array, items: { type: object } }
 *                     processingTime: { type: integer }
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fileName: { type: string }
 *                       size: { type: integer }
 *                       totalDiagrams: { type: integer }
 *                       validDiagrams: { type: integer }
 *                       invalidDiagrams: { type: integer }
 *                       results: { type: array, items: { $ref: '#/components/schemas/DiagramResult' } }
 *                       errors: { type: array, items: { type: object } }
 *                 validationOptions:
 *                   type: object
 *       400: { description: Too many diagrams, or rejected file type, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       500: { description: Server error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post(
  '/upload/file',
  upload.array('file', config.upload.maxFiles),
  fileUploadSecurity,
  async (req, res) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    try {
      const options = {
        timeout: parseInt(req.body.timeout, 10) || config.validation.timeout
      };

      // Process uploaded files
      const fileResults = await fileProcessor.processFiles(req.files);
      
      if (fileResults.errors.length > 0) {
        logger.logError(new Error('File processing errors'), {
          context: 'file_upload',
          errors: fileResults.errors,
          requestId
        });
      }

      // Extract all diagrams from processed files
      const allDiagrams = [];
      const fileDetailsForResponse = [];

      for (const fileInfo of fileResults.extractedContent) {
        const fileDetail = {
          fileName: fileInfo.fileName,
          size: fileInfo.size,
          totalDiagrams: 0,
          validDiagrams: 0,
          invalidDiagrams: 0,
          results: [],
          errors: []
        };

        try {
          if (fileInfo.content) {
            // Process single file
            const diagrams = validator.extractDiagrams(fileInfo.content);
            
            if (diagrams.length > config.validation.maxDiagramsPerFile) {
              fileDetail.errors.push({
                type: 'too_many_diagrams',
                message: `File contains ${diagrams.length} diagrams. Maximum ${config.validation.maxDiagramsPerFile} allowed per file.`
              });
            } else {
              // Add source file information to diagrams
              diagrams.forEach(diagram => {
                diagram.sourceFile = fileInfo.fileName;
                allDiagrams.push(diagram);
              });
              
              // Validate diagrams for this file
              const validation = await validator.validateMultipleDiagrams(diagrams, options);
              
              fileDetail.totalDiagrams = validation.totalDiagrams;
              fileDetail.validDiagrams = validation.validDiagrams;
              fileDetail.invalidDiagrams = validation.invalidDiagrams;
              fileDetail.results = validation.results;
            }
          } else if (fileInfo.subFiles) {
            // Process ZIP file contents
            for (const subFile of fileInfo.subFiles) {
              if (subFile.error) {
                fileDetail.errors.push({
                  type: 'extraction_error',
                  fileName: subFile.fileName,
                  message: subFile.error
                });
                continue;
              }

              const diagrams = validator.extractDiagrams(subFile.content);
              
              if (diagrams.length > config.validation.maxDiagramsPerFile) {
                fileDetail.errors.push({
                  type: 'too_many_diagrams',
                  fileName: subFile.fileName,
                  message: `File contains ${diagrams.length} diagrams. Maximum ${config.validation.maxDiagramsPerFile} allowed per file.`
                });
                continue;
              }

              // Add source file information to diagrams
              diagrams.forEach(diagram => {
                diagram.sourceFile = `${fileInfo.fileName}/${subFile.fileName}`;
                allDiagrams.push(diagram);
              });

              // Validate diagrams for this sub-file
              const validation = await validator.validateMultipleDiagrams(diagrams, options);
              
              fileDetail.totalDiagrams += validation.totalDiagrams;
              fileDetail.validDiagrams += validation.validDiagrams;
              fileDetail.invalidDiagrams += validation.invalidDiagrams;
              fileDetail.results.push(...validation.results);
            }
          }
        } catch (error) {
          fileDetail.errors.push({
            type: 'processing_error',
            message: error.message
          });
          logger.logError(error, { 
            context: 'file_diagram_processing',
            fileName: fileInfo.fileName,
            requestId
          });
        }

        fileDetailsForResponse.push(fileDetail);
      }

      // Check total diagram limit
      if (allDiagrams.length > config.validation.maxTotalDiagrams) {
        return res.status(400).json({
          error: 'Too many diagrams',
          message: `Total diagrams (${allDiagrams.length}) exceeds maximum allowed (${config.validation.maxTotalDiagrams})`,
          requestId,
          timestamp: new Date().toISOString()
        });
      }

      // Calculate overall summary
      const totalDiagrams = fileDetailsForResponse.reduce((sum, file) => sum + file.totalDiagrams, 0);
      const validDiagrams = fileDetailsForResponse.reduce((sum, file) => sum + file.validDiagrams, 0);
      const invalidDiagrams = totalDiagrams - validDiagrams;

      const response = {
        requestId,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        validator: 'custom_grammar_parser',
        
        // Overall summary
        totalFiles: fileResults.totalFiles,
        processedFiles: fileResults.processedFiles,
        totalDiagrams,
        validDiagrams,
        invalidDiagrams,
        
        // File processing summary
        fileProcessing: {
          totalFiles: fileResults.totalFiles,
          processedFiles: fileResults.processedFiles,
          errors: fileResults.errors,
          processingTime: fileResults.processingTime
        },
        
        // Detailed results per file
        files: fileDetailsForResponse,
        
        // Validation options used
        validationOptions: options
      };

      res.json(response);

    } catch (error) {
      logger.logError(error, { 
        context: 'file_upload_validation',
        ip: req.ip,
        fileCount: req.files?.length,
        requestId
      });

      res.status(500).json({
        error: 'File validation failed',
        message: error.message,
        requestId,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /upload/fix:
 *   post:
 *     tags: [validation]
 *     summary: Auto-fix Mermaid diagrams in an uploaded file
 *     description: Multipart-upload variant of POST /markdown/fix. Accepts a single .md / .mmd / .txt file, runs the auto-fixer over each Mermaid block, and returns the rewritten file content plus per-diagram statistics. Raw .mmd (no fences) is wrapped/unwrapped transparently.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: A single markdown or mmd file
 *               options:
 *                 type: string
 *                 description: Optional JSON-encoded fixer overrides
 *     responses:
 *       200:
 *         description: File processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 requestId: { type: string, format: uuid }
 *                 timestamp: { type: string, format: date-time }
 *                 processingTime: { type: integer }
 *                 fileName: { type: string }
 *                 fileSize: { type: integer }
 *                 mimeType: { type: string }
 *                 wasMarkdown:
 *                   type: boolean
 *                   description: False if the input was raw mmd and the server wrapped it in a fence
 *                 fixedContent: { type: string }
 *                 statistics: { type: object }
 *                 diagrams: { type: array, items: { type: object } }
 *       400: { description: Missing file, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       500: { description: Server error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post(
  '/upload/fix',
  // Use `array('file', 1)` (not `single('file')`) so the shared
  // fileUploadSecurity middleware -- which expects `req.files` (plural) --
  // works without bespoke shim code. Limits.files=1 still caps it at one.
  upload.array('file', 1),
  fileUploadSecurity,
  async (req, res) => {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const file = req.files && req.files[0];
      if (!file) {
        return res.status(400).json({
          error: 'Missing file',
          message: 'Send the file as multipart/form-data with field name "file"',
          hint: 'curl -F "file=@/path/to/diagram.md" .../api/v1/upload/fix',
          requestId,
          timestamp: new Date().toISOString()
        });
      }

      // multer.diskStorage was configured upstream for /upload/file; read the
      // file from disk, fix it, then have the file-processor reap the temp file.
      const fs = require('fs');
      const content = fs.readFileSync(file.path, 'utf8');

      let options = {};
      if (req.body && req.body.options) {
        try { options = typeof req.body.options === 'string' ? JSON.parse(req.body.options) : req.body.options; }
        catch (_) { /* ignore; default {} */ }
      }

      // For raw .mmd (no markdown fences), wrap it so the markdown extractor sees it.
      const isMarkdown = /```mermaid/.test(content);
      const wrapped = isMarkdown ? content : '```mermaid\n' + content.trim() + '\n```\n';

      const result = await fixer.processMarkdown(wrapped, options);

      // If we wrapped a raw .mmd, unwrap the result so the caller gets the
      // same shape they sent.
      let fixedContent = result.fixedContent;
      if (!isMarkdown) {
        const m = fixedContent.match(/```mermaid\s*\n([\s\S]*?)\n```/);
        if (m) fixedContent = m[1];
      }

      // Best-effort temp-file cleanup
      try { fs.unlinkSync(file.path); } catch (_) {}

      res.json({
        success: result.success,
        requestId,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        wasMarkdown: isMarkdown,
        fixedContent,
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
        }))
      });
    } catch (error) {
      logger.logError(error, { context: 'upload_fix', requestId });
      res.status(500).json({
        error: 'Upload fix failed',
        message: error.message,
        requestId,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @swagger
 * /capabilities:
 *   get:
 *     tags: [validation]
 *     summary: Which diagram types the validator can actually parse
 *     description: |
 *       Returns three sets so callers can branch on what the validator
 *       can do — not just what it knows the name of.
 *       - `validatedTypes`: types with a working parser; these will return valid:true|false
 *       - `declaredTypes`:  all keywords the type-detector recognizes (a superset)
 *       - `unvalidatedTypes`: declared but no parser available (LLM callers should treat as inconclusive)
 *     responses:
 *       200:
 *         description: Capability report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 validatedTypes:
 *                   type: array
 *                   items: { type: string }
 *                   example: [flowchart, sequenceDiagram, classDiagram]
 *                 declaredTypes:
 *                   type: array
 *                   items: { type: string }
 *                 unvalidatedTypes:
 *                   type: array
 *                   items: { type: string }
 *                   example: [zenuml]
 *                 counts:
 *                   type: object
 *                   properties:
 *                     validated: { type: integer }
 *                     declared: { type: integer }
 *                     unvalidated: { type: integer }
 *                 timestamp: { type: string, format: date-time }
 */
router.get('/capabilities', (req, res) => {
  try {
    const c = validator.getCapabilities();
    res.json({
      ...c,
      counts: {
        validated: c.validatedTypes.length,
        declared: c.declaredTypes.length,
        unvalidated: c.unvalidatedTypes.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.logError(error, { context: 'capabilities' });
    res.status(500).json({ error: 'Failed to get capabilities', message: error.message });
  }
});

/**
 * @swagger
 * /stats:
 *   get:
 *     tags: [validation]
 *     summary: Validator capabilities and runtime limits
 *     description: Lists supported diagram types, upload/validation limits, and feature flags.
 *     responses:
 *       200:
 *         description: Stats payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 supportedDiagramTypes: { type: array, items: { type: string } }
 *                 limits:
 *                   type: object
 *                   properties:
 *                     maxFileSize: { type: integer }
 *                     maxFiles: { type: integer }
 *                     maxDiagramsPerFile: { type: integer }
 *                     maxTotalDiagrams: { type: integer }
 *                     validationTimeout: { type: integer }
 *                 features: { type: object, additionalProperties: true }
 *                 validator: { type: object, additionalProperties: true }
 *                 timestamp: { type: string, format: date-time }
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      supportedDiagramTypes: validator.getSupportedTypes(),
      limits: {
        maxFileSize: config.upload.maxFileSize,
        maxFiles: config.upload.maxFiles,
        maxDiagramsPerFile: config.validation.maxDiagramsPerFile,
        maxTotalDiagrams: config.validation.maxTotalDiagrams,
        validationTimeout: config.validation.timeout
      },
      features: {
        svgGeneration: false, // Disabled
        zipSupport: true,
        markdownSupport: true,
        multiFileValidation: true,
        diagramGrammarParsers: true
      },
      validator: {
        type: 'custom_grammar_parser',
        author: 'Gregorio Elias Roecker Momm',
        dependencies: 'minimal',
        grammarBased: true
      },
      timestamp: new Date().toISOString()
    };

    res.json(stats);
  } catch (error) {
    logger.logError(error, { context: 'validation_stats' });
    res.status(500).json({
      error: 'Failed to get validation statistics',
      message: error.message
    });
  }
});

module.exports = router;