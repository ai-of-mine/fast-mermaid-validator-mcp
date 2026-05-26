/**
 * Application Configuration
 * Centralized configuration with environment variable support
 */

// Utility function to handle unlimited configuration
const parseUnlimitedValue = (envVar, defaultValue) => {
  const value = parseInt(process.env[envVar], 10);
  if (isNaN(value)) return defaultValue;
  return (value === 0 || value === -1) ? Number.MAX_SAFE_INTEGER : value;
};

// Utility function to check if value represents unlimited
const isUnlimited = (value) => {
  return value === Number.MAX_SAFE_INTEGER || value === 0 || value === -1;
};

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 8000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    apiVersion: 'v1',
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '50mb',
    // Connection and performance settings
    timeout: parseInt(process.env.SERVER_TIMEOUT, 10) || 30000,
    keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10) || 5000,
    headersTimeout: parseInt(process.env.HEADERS_TIMEOUT, 10) || 6000,
    maxConnections: parseInt(process.env.MAX_CONNECTIONS, 10) || 1000,
    maxHeadersCount: parseInt(process.env.MAX_HEADERS_COUNT, 10) || 2000,
    maxRequestsPerSocket: parseInt(process.env.MAX_REQUESTS_PER_SOCKET, 10) || 0
  },

  // Security Configuration
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    // Rate limiting removed - delegated to API Gateway for billing control
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          styleSrc: ['\'self\'', '\'unsafe-inline\''],
          scriptSrc: ['\'self\''],
          imgSrc: ['\'self\'', 'data:', 'https:']
        }
      },
      hsts: {
        maxAge: parseInt(process.env.HSTS_MAX_AGE, 10) || 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      }
    }
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseUnlimitedValue('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
    maxFiles: parseUnlimitedValue('MAX_FILES', 20),
    allowedMimeTypes: [
      'text/markdown',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
      'multipart/x-zip'
    ],
    allowedExtensions: ['.md', '.markdown', '.txt', '.zip'],
    tempDir: process.env.TEMP_DIR || './tmp',
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL, 10) || 60 * 60 * 1000 // 1 hour
  },

  // Validation Configuration
  validation: {
    timeout: parseInt(process.env.VALIDATION_TIMEOUT, 10) || 30000, // 30 seconds
    maxDiagramsPerFile: parseUnlimitedValue('MAX_DIAGRAMS_PER_FILE', 50),
    maxTotalDiagrams: parseUnlimitedValue('MAX_TOTAL_DIAGRAMS', 200),
    maxDiagramContentLength: parseUnlimitedValue('MAX_DIAGRAM_CONTENT_LENGTH', 50000),
    maxTimeoutMs: parseUnlimitedValue('MAX_TIMEOUT_MS', 60000),
    maxFilenameLength: parseUnlimitedValue('MAX_FILENAME_LENGTH', 255),
    enableSvgGeneration: process.env.ENABLE_SVG_GENERATION !== 'false',
    puppeteerOptions: {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      timeout: parseInt(process.env.PUPPETEER_TIMEOUT, 10) || 10000
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'warn',
    format: process.env.LOG_FORMAT || 'combined',
    file: {
      enabled: process.env.LOG_TO_FILE === 'true',
      filename: process.env.LOG_FILE || 'logs/app.log',
      maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 5,
      maxSize: process.env.LOG_MAX_SIZE || '10m'
    }
  },

  // Health Check Configuration
  health: {
    checks: {
      memory: {
        enabled: true,
        threshold: parseInt(process.env.MEMORY_THRESHOLD, 10) || 90 // percentage
      },
      disk: {
        enabled: true,
        threshold: parseInt(process.env.DISK_THRESHOLD, 10) || 90 // percentage
      }
    }
  },

  // Mermaid Configuration
  mermaid: {
    supportedTypes: [
      'flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
      'erDiagram', 'gantt', 'pie', 'journey', 'gitGraph', 'requirement',
      'mindmap', 'timeline', 'sankey', 'block', 'packet', 'c4Context',
      'quadrantChart', 'xyChart', 'architecture'
    ],
    config: {
      startOnLoad: false,
      theme: 'default',
      logLevel: 'error',
      securityLevel: 'strict',
      maxTextSize: parseUnlimitedValue('MERMAID_MAX_TEXT_SIZE', 50000),
      maxEdges: parseUnlimitedValue('MERMAID_MAX_EDGES', 500),
      maxVertices: parseUnlimitedValue('MERMAID_MAX_VERTICES', 200)
    }
  }
};

// Validation
const requiredEnvVars = [];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

module.exports = { ...config, parseUnlimitedValue, isUnlimited };