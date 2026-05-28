/**
 * File Processing Service
 * Handles file uploads, extraction, and processing for multiple formats
 */

const fs = require('fs').promises;
const path = require('path');
const yauzl = require('yauzl');
const config = require('../config/config');
const logger = require('../utils/logger');

class FileProcessor {
  constructor() {
    this.tempDir = config.upload.tempDir;
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists
   */
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.logError(error, { context: 'temp_directory_creation' });
    }
  }

  /**
   * Process uploaded files
   * @param {Array|Object} files - Uploaded files from multer
   * @returns {Object} Processing results
   */
  async processFiles(files) {
    const startTime = Date.now();
    const results = {
      totalFiles: 0,
      processedFiles: 0,
      errors: [],
      extractedContent: []
    };

    try {
      // Normalize files to array
      const fileList = Array.isArray(files) ? files : [files];
      results.totalFiles = fileList.length;

      // Validate file count
      if (fileList.length > config.upload.maxFiles) {
        throw new Error(`Too many files. Maximum allowed: ${config.upload.maxFiles}`);
      }

      // Process each file
      for (const file of fileList) {
        try {
          const processedFile = await this.processFile(file);
          results.extractedContent.push(processedFile);
          results.processedFiles++;
        } catch (error) {
          results.errors.push({
            fileName: file.originalname,
            error: error.message
          });
          logger.logError(error, { fileName: file.originalname });
        }
      }

      results.processingTime = Date.now() - startTime;
      logger.info('File processing completed', results);

      return results;

    } catch (error) {
      logger.logError(error, { context: 'file_processing' });
      throw error;
    }
  }

  /**
   * Process a single file
   * @param {Object} file - File object from multer
   * @returns {Object} Processed file content
   */
  async processFile(file) {
    const fileInfo = {
      fileName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      content: '',
      subFiles: []
    };

    // Validate file
    this.validateFile(file);

    // Process based on file type
    if (this.isZipFile(file)) {
      fileInfo.subFiles = await this.processZipFile(file);
    } else if (this.isMarkdownFile(file)) {
      fileInfo.content = await this.readFileContent(file.path);
    } else {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    // Cleanup temp file
    await this.cleanupFile(file.path);

    return fileInfo;
  }

  /**
   * Validate uploaded file
   * @param {Object} file - File object
   */
  validateFile(file) {
    // Check file size
    if (file.size > config.upload.maxFileSize) {
      throw new Error(`File too large. Maximum size: ${config.upload.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check mime type
    if (!config.upload.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!config.upload.allowedExtensions.includes(ext)) {
      throw new Error(`Unsupported file extension: ${ext}`);
    }
  }

  /**
   * Check if file is a ZIP archive
   * @param {Object} file - File object
   * @returns {boolean}
   */
  isZipFile(file) {
    const zipMimeTypes = [
      'application/zip',
      'application/x-zip-compressed',
      'multipart/x-zip'
    ];
    return zipMimeTypes.includes(file.mimetype) || 
           file.originalname.toLowerCase().endsWith('.zip');
  }

  /**
   * Check if file is markdown
   * @param {Object} file - File object
   * @returns {boolean}
   */
  isMarkdownFile(file) {
    const markdownMimeTypes = ['text/markdown', 'text/plain'];
    const markdownExtensions = ['.md', '.markdown', '.txt'];
    
    return markdownMimeTypes.includes(file.mimetype) ||
           markdownExtensions.some(ext => 
             file.originalname.toLowerCase().endsWith(ext)
           );
  }

  /**
   * Process ZIP file and extract markdown files
   * @param {Object} file - ZIP file object
   * @returns {Array} Array of extracted file contents
   */
  async processZipFile(file) {
    return new Promise((resolve, reject) => {
      const extractedFiles = [];
      let processedEntries = 0;
      let totalEntries = 0;

      yauzl.open(file.path, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          return reject(new Error(`Failed to open ZIP file: ${err.message}`));
        }

        // Count total entries first
        zipfile.on('entry', () => {
          totalEntries++;
        });

        zipfile.readEntry();

        zipfile.on('entry', (entry) => {
          processedEntries++;

          // Skip directories
          if (/\/$/.test(entry.fileName)) {
            if (processedEntries === totalEntries) {
              resolve(extractedFiles);
            } else {
              zipfile.readEntry();
            }
            return;
          }

          // Only process markdown files
          if (!this.isMarkdownFileName(entry.fileName)) {
            if (processedEntries === totalEntries) {
              resolve(extractedFiles);
            } else {
              zipfile.readEntry();
            }
            return;
          }

          // Check file size
          if (entry.uncompressedSize > config.upload.maxFileSize) {
            extractedFiles.push({
              fileName: entry.fileName,
              error: `File too large: ${entry.uncompressedSize} bytes`
            });
            
            if (processedEntries === totalEntries) {
              resolve(extractedFiles);
            } else {
              zipfile.readEntry();
            }
            return;
          }

          // Extract file content
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              extractedFiles.push({
                fileName: entry.fileName,
                error: `Failed to extract: ${err.message}`
              });
              
              if (processedEntries === totalEntries) {
                resolve(extractedFiles);
              } else {
                zipfile.readEntry();
              }
              return;
            }

            const chunks = [];
            readStream.on('data', (chunk) => chunks.push(chunk));
            readStream.on('end', () => {
              const content = Buffer.concat(chunks).toString('utf8');
              extractedFiles.push({
                fileName: entry.fileName,
                size: entry.uncompressedSize,
                content
              });

              if (processedEntries === totalEntries) {
                resolve(extractedFiles);
              } else {
                zipfile.readEntry();
              }
            });
            readStream.on('error', (err) => {
              extractedFiles.push({
                fileName: entry.fileName,
                error: `Read error: ${err.message}`
              });
              
              if (processedEntries === totalEntries) {
                resolve(extractedFiles);
              } else {
                zipfile.readEntry();
              }
            });
          });
        });

        zipfile.on('end', () => {
          if (extractedFiles.length === 0) {
            resolve([]);
          }
        });

        zipfile.on('error', (err) => {
          reject(new Error(`ZIP processing error: ${err.message}`));
        });
      });
    });
  }

  /**
   * Check if filename is a markdown file
   * @param {string} fileName - File name
   * @returns {boolean}
   */
  isMarkdownFileName(fileName) {
    const markdownExtensions = ['.md', '.markdown', '.txt'];
    return markdownExtensions.some(ext => 
      fileName.toLowerCase().endsWith(ext)
    );
  }

  /**
   * Validate that a file path is safely within the temp directory.
   * Prevents path traversal attacks (CWE-22).
   * @param {string} filePath - Path to validate
   * @returns {string} The validated, resolved absolute path
   * @throws {Error} If path traversal is detected
   */
  async validateSafePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path: Path must be a non-empty string');
    }

    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.resolve(normalizedPath);
    const tempDirResolved = path.resolve(this.tempDir);

    // path.relative returns a path starting with '..' if resolvedPath is
    // outside tempDirResolved -- the canonical traversal-check.
    const relativePath = path.relative(tempDirResolved, resolvedPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error('Invalid file path: Path traversal detected');
    }

    // Resolve symlinks too -- a symlink inside tempDir that points outside
    // would otherwise bypass the check above.
    try {
      const realPath = await fs.realpath(resolvedPath);
      const realTempDir = await fs.realpath(tempDirResolved);
      const realRelativePath = path.relative(realTempDir, realPath);
      if (realRelativePath.startsWith('..') || path.isAbsolute(realRelativePath)) {
        throw new Error('Invalid file path: Symlink traversal detected');
      }
      return realPath;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist (e.g., cleanup of an already-deleted file).
        // The resolvedPath check above is still valid.
        return resolvedPath;
      }
      throw error;
    }
  }

  /**
   * Read file content
   * @param {string} filePath - Path to file
   * @returns {string} File content
   */
  async readFileContent(filePath) {
    try {
      const safePath = await this.validateSafePath(filePath);
      return await fs.readFile(safePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Clean up temporary file
   * @param {string} filePath - Path to file
   */
  async cleanupFile(filePath) {
    try {
      const safePath = await this.validateSafePath(filePath);
      await fs.unlink(safePath);
    } catch (error) {
      logger.logError(error, { context: 'file_cleanup', filePath });
    }
  }

  /**
   * Cleanup old temporary files
   */
  async cleanupTempFiles() {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        // Delete files older than cleanup interval
        if (now - stats.mtime.getTime() > config.upload.cleanupInterval) {
          await fs.unlink(filePath);
          logger.info('Cleaned up old temp file', { filePath });
        }
      }
    } catch (error) {
      logger.logError(error, { context: 'temp_cleanup' });
    }
  }

  /**
   * Normalize escaped characters in content.
   * Handles cases where JSON escape sequences are passed as literal strings
   * (e.g., when curl sends "flowchart TD\nA-->B" with literal backslash-n).
   * @param {string} content - Raw content that may contain escaped sequences
   * @returns {string} Content with normalized newlines and tabs
   */
  normalizeEscapedContent(content) {
    if (!content || typeof content !== 'string') {
      return content;
    }
    return content
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r');
  }

  /**
   * Process direct content (for /validate endpoint)
   * @param {Array} diagrams - Array of diagram objects with content and type
   * @returns {Array} Array of diagram objects
   */
  processDirectContent(diagrams) {
    return diagrams.map((diagram, index) => ({
      id: `direct_${index + 1}`,
      content: this.normalizeEscapedContent(diagram.content).trim(),
      type: diagram.type,
      source: 'direct_input'
    }));
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupTempFiles();
    }, config.upload.cleanupInterval);
  }
}

module.exports = FileProcessor;