/**
 * Security Middleware
 * Comprehensive security setup with rate limiting, validation, and monitoring
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Rate limiting middleware - DISABLED (delegated to API Gateway)
 */
// const rateLimitMiddleware = rateLimit({
//   windowMs: config.security.rateLimit.windowMs,
//   max: config.security.rateLimit.max,
//   message: config.security.rateLimit.message,
//   standardHeaders: config.security.rateLimit.standardHeaders,
//   legacyHeaders: config.security.rateLimit.legacyHeaders,
//   handler: (req, res) => {
//     logger.logSecurity('rate_limit_exceeded', {
//       ip: req.ip,
//       userAgent: req.get('User-Agent'),
//       endpoint: req.path
//     });
//
//     res.status(429).json({
//       error: 'Too Many Requests',
//       message: config.security.rateLimit.message.error,
//       retryAfter: config.security.rateLimit.message.retryAfter
//     });
//   },
//   skip: (req) => {
//     // Skip rate limiting for health checks
//     return req.path === '/api/v1/health';
//   }
// });

/**
 * CORS middleware
 */
const corsMiddleware = cors({
  origin: config.security.cors.origin,
  credentials: config.security.cors.credentials,
  methods: config.security.cors.methods,
  allowedHeaders: config.security.cors.allowedHeaders,
  optionsSuccessStatus: 200
});

/**
 * Helmet security middleware
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: config.security.helmet.contentSecurityPolicy,
  hsts: config.security.helmet.hsts,
  crossOriginEmbedderPolicy: false // Allow embedding for API responses
});

/**
 * Request validation middleware
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.logSecurity('validation_failed', {
      ip: req.ip,
      errors: errors.array(),
      body: req.body
    });
    
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

/**
 * Validation rules for /validate endpoint
 */
const validateDiagramsInput = [
  body('diagrams')
    .isArray({ min: 1, max: config.validation.maxTotalDiagrams })
    .withMessage(`Must be an array with 1-${config.validation.maxTotalDiagrams} diagrams`),
  body('diagrams.*.content')
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Each diagram content must be a non-empty string (max 50,000 characters)'),
  body('diagrams.*.type')
    .isString()
    .isIn([
      // Basic diagrams
      'flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 
      'stateDiagram', 'stateDiagram-v2', 'erDiagram', 'gantt', 
      'journey', 'pie', 'mindmap', 'timeline', 'kanban',
      
      // Advanced diagrams
      'requirement', 'requirementDiagram', 'sankey-beta', 'xychart-beta', 
      'block', 'block-beta', 'c4', 'C4Context', 'quadrant', 'quadrantChart',
      
      // Langium-based diagrams
      'gitGraph', 'info', 'architecture', 'architecture-beta', 
      'radar', 'packet', 'packet-beta', 'treemap', 'treemap-beta', 
      
      // Other
      'zenuml', 'exampleDiagram'
    ])
    .withMessage('Each diagram type must be a valid Mermaid diagram type'),
  body('options.timeout')
    .optional()
    .isInt({ min: 1000, max: 60000 })
    .withMessage('timeout must be between 1000-60000ms')
];

/**
 * File upload security middleware
 */
const fileUploadSecurity = (req, res, next) => {
  // Debug logging
  console.log('Files debug:', {
    files: req.files,
    filesLength: req.files?.length,
    filesType: typeof req.files,
    body: req.body
  });
  
  // Check if files were uploaded
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: 'No files uploaded',
      message: 'Please upload at least one file'
    });
  }

  // Validate file count
  if (req.files.length > config.upload.maxFiles) {
    logger.logSecurity('too_many_files', {
      ip: req.ip,
      fileCount: req.files.length,
      maxAllowed: config.upload.maxFiles
    });
    
    return res.status(400).json({
      error: 'Too many files',
      message: `Maximum ${config.upload.maxFiles} files allowed`
    });
  }

  // Validate each file
  for (const file of req.files) {
    // Check file size
    if (file.size > config.upload.maxFileSize) {
      logger.logSecurity('file_too_large', {
        ip: req.ip,
        fileName: file.originalname,
        size: file.size,
        maxSize: config.upload.maxFileSize
      });
      
      return res.status(400).json({
        error: 'File too large',
        message: `File "${file.originalname}" exceeds maximum size of ${config.upload.maxFileSize / (1024 * 1024)}MB`
      });
    }

    // Check mime type and file extension
    const fileExtension = require('path').extname(file.originalname).toLowerCase();
    const mimeTypeValid = config.upload.allowedMimeTypes.includes(file.mimetype);
    const extensionValid = config.upload.allowedExtensions.includes(fileExtension);
    
    // Allow file if either MIME type is valid OR extension is valid
    // This handles cases where MIME type detection fails
    if (!mimeTypeValid && !extensionValid) {
      logger.logSecurity('invalid_file_type', {
        ip: req.ip,
        fileName: file.originalname,
        mimeType: file.mimetype,
        extension: fileExtension
      });
      
      return res.status(400).json({
        error: 'Invalid file type',
        message: `File type not allowed. Expected extensions: ${config.upload.allowedExtensions.join(', ')}`
      });
    }

    // Check for suspicious file names
    if (isSuspiciousFileName(file.originalname)) {
      logger.logSecurity('suspicious_filename', {
        ip: req.ip,
        fileName: file.originalname
      });
      
      return res.status(400).json({
        error: 'Invalid file name',
        message: 'File name contains invalid characters'
      });
    }
  }

  next();
};

/**
 * Check for suspicious file names
 * @param {string} fileName - File name to check
 * @returns {boolean} True if suspicious
 */
function isSuspiciousFileName(fileName) {
  const suspiciousPatterns = [
    /\.\./,          // Directory traversal
    /[<>:"|?*]/,     // Invalid file name characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
    /^\./,           // Hidden files
    /.{255,}/        // Extremely long names
  ];

  return suspiciousPatterns.some(pattern => pattern.test(fileName));
}

/**
 * Error handling middleware
 */
const errorHandler = (error, req, res, _next) => {
  logger.logError(error, {
    ip: req.ip,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent')
  });

  // Handle specific error types
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request body exceeds maximum allowed size'
    });
  }

  // Malformed JSON body — express.json() / body-parser sets type =
  // 'entity.parse.failed' and a SyntaxError instance with error.status = 400.
  // Surface a useful diagnostic instead of falling through to the generic 500.
  if (
    error.type === 'entity.parse.failed' ||
    (error instanceof SyntaxError && error.status === 400 && 'body' in error)
  ) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Request body is not valid JSON',
      detail: error.message,
      hint: 'Check for unescaped newlines or backticks in shell quoting. Build the payload with `jq -Rs \'{content:.}\' file.md` to avoid escape issues.'
    });
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File Too Large',
      message: 'One or more files exceed the maximum allowed size'
    });
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too Many Files',
      message: 'Number of files exceeds the maximum allowed'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected File Field',
      message: 'Unexpected file field in upload'
    });
  }

  // Default error response. Include the error name + message always so the
  // caller has *some* signal -- "Something went wrong" alone is a debugging
  // dead end. Full stack stays development-only.
  res.status(500).json({
    error: 'Internal Server Error',
    name: error.name || 'Error',
    message: error.message || 'Unknown error',
    stack: config.server.env === 'development' ? error.stack : undefined
  });
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.logRequest(req, res, responseTime);
  });
  
  next();
};

/**
 * Content type validation middleware
 */
const validateContentType = (expectedTypes) => {
  return (req, res, next) => {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !expectedTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({
        error: 'Unsupported Media Type',
        message: `Expected one of: ${expectedTypes.join(', ')}`
      });
    }
    
    next();
  };
};

module.exports = {
  // rateLimitMiddleware, // DISABLED - delegated to API Gateway
  corsMiddleware,
  helmetMiddleware,
  validateRequest,
  validateDiagramsInput,
  fileUploadSecurity,
  errorHandler,
  requestLogger,
  validateContentType
};