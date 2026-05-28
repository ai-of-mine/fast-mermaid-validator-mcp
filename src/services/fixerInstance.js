/**
 * Shared MarkdownMermaidFixer singleton.
 *
 * Constructing a MarkdownMermaidFixer is expensive — its CustomMermaidValidator
 * compiles ~25 jison grammars (~1-5 seconds) on creation. We want every route
 * that processes markdown (the /api/v1/markdown/* family AND the
 * /api/v1/upload/fix multipart route in validation.js) to reuse the same
 * instance so each grammar is compiled exactly once per process.
 *
 * The fixer is stateless across requests: each call to processMarkdown() or
 * validateMarkdown() returns a fresh result object and does not mutate any
 * shared state beyond per-call logging counters. Sharing one instance is safe.
 */

const MarkdownMermaidFixer = require('./markdownMermaidFixer');

module.exports = new MarkdownMermaidFixer();
