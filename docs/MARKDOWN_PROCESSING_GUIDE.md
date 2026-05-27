# Markdown Processing Guide

## Overview

The Markdown Mermaid Fixer processes entire markdown files, automatically fixes all Mermaid diagrams within them, and returns the complete fixed markdown content. This is perfect for batch processing documentation, automated workflows, and LLM-generated content.

## Features

- ✅ **Batch Processing** - Fix all diagrams in a markdown file at once
- ✅ **Iterative Fixing** - Up to 5 fix iterations per diagram
- ✅ **Complete Markdown Return** - Get back the full fixed markdown
- ✅ **Detailed Reporting** - Statistics and fix history for each diagram
- ✅ **Validation Mode** - Validate without fixing
- ✅ **Preserves Formatting** - Maintains original markdown structure

## API Endpoints

### POST /api/v1/markdown/fix

Fix all Mermaid diagrams in markdown content.

**Request:**
```json
{
  "content": "# Documentation\n\n```mermaid\nflowchart TD\n    A[Start] --> B[End]\n```",
  "options": {
    "maxIterations": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "fixedContent": "# Documentation\n\n```mermaid\nflowchart TD\n    A[Start] --> B[End]\n```",
  "statistics": {
    "totalDiagrams": 1,
    "fixedDiagrams": 1,
    "failedDiagrams": 0,
    "totalIterations": 2,
    "processingTime": 145
  },
  "diagrams": [
    {
      "id": "diagram_1",
      "success": true,
      "wasFixed": true,
      "iterations": 2
    }
  ],
  "report": "# Mermaid Diagram Fix Report\n\n..."
}
```

### POST /api/v1/markdown/validate

Validate all Mermaid diagrams without fixing.

**Request:**
```json
{
  "content": "# Documentation\n\n```mermaid\nflowchart TD\n    A[Start] --> B[End]\n```"
}
```

**Response:**
```json
{
  "success": true,
  "totalDiagrams": 1,
  "validDiagrams": 1,
  "invalidDiagrams": 0,
  "results": [
    {
      "id": "diagram_1",
      "valid": true,
      "errors": [],
      "warnings": []
    }
  ]
}
```

## Usage Examples

### cURL Examples

#### Fix Markdown
```bash
curl -X POST http://localhost:3000/api/v1/markdown/fix \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# My Doc\n\n```mermaid\nflowchart TD\n    A[Start Process] --> B[End]\n```"
  }'
```

#### Validate Markdown
```bash
curl -X POST http://localhost:3000/api/v1/markdown/validate \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# My Doc\n\n```mermaid\nflowchart TD\n    A --> B\n```"
  }'
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');
const fs = require('fs');

async function fixMarkdownFile(filePath) {
  // Read markdown file
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Send to API
  const response = await axios.post('http://localhost:3000/api/v1/markdown/fix', {
    content: content,
    options: {
      maxIterations: 5
    }
  });
  
  // Save fixed content
  if (response.data.success) {
    fs.writeFileSync(filePath + '.fixed.md', response.data.fixedContent);
    console.log('Fixed markdown saved!');
    console.log('Statistics:', response.data.statistics);
  }
}

fixMarkdownFile('./documentation.md');
```

### Python Example

```python
import requests
import json

def fix_markdown_file(file_path):
    # Read markdown file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Send to API
    response = requests.post(
        'http://localhost:3000/api/v1/markdown/fix',
        json={
            'content': content,
            'options': {'maxIterations': 5}
        }
    )
    
    # Save fixed content
    if response.json()['success']:
        with open(file_path + '.fixed.md', 'w') as f:
            f.write(response.json()['fixedContent'])
        print('Fixed markdown saved!')
        print('Statistics:', response.json()['statistics'])

fix_markdown_file('./documentation.md')
```

## Programmatic Usage

### Direct Service Usage

```javascript
const MarkdownMermaidFixer = require('./src/services/markdownMermaidFixer');

async function processMarkdown() {
  const fixer = new MarkdownMermaidFixer();
  
  const markdown = `
# Documentation

\`\`\`mermaid
flowchart TD
    A[Start Process] --> B[Check Input]
    B --> C{Valid?}
    C -->|Yes| D[Process]
    C -->|No| E[Error]
\`\`\`
  `;
  
  const result = await fixer.processMarkdown(markdown);
  
  console.log('Success:', result.success);
  console.log('Fixed Diagrams:', result.fixedDiagrams);
  console.log('Fixed Content:', result.fixedContent);
  
  // Generate report
  const report = fixer.generateReport(result);
  console.log(report);
  
  fixer.cleanup();
}

processMarkdown();
```

## Response Fields

### Main Response

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Overall processing success |
| `fixedContent` | string | Complete fixed markdown |
| `statistics` | object | Processing statistics |
| `diagrams` | array | Per-diagram results |
| `report` | string | Detailed markdown report |

### Statistics Object

| Field | Type | Description |
|-------|------|-------------|
| `totalDiagrams` | number | Total diagrams found |
| `fixedDiagrams` | number | Successfully fixed |
| `failedDiagrams` | number | Failed to fix |
| `totalIterations` | number | Sum of all iterations |
| `processingTime` | number | Time in milliseconds |

### Diagram Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Diagram identifier |
| `success` | boolean | Validation success |
| `wasFixed` | boolean | Whether fixes were applied |
| `iterations` | number | Fix iterations used |

## Processing Flow

```
1. Extract all Mermaid diagrams from markdown
2. For each diagram:
   a. Validate diagram
   b. If invalid → Apply auto-fixes
   c. Re-validate with fixed content
   d. Repeat up to maxIterations times
   e. Record results
3. Replace original diagrams with fixed versions
4. Return complete fixed markdown
```

## Configuration Options

### maxIterations

Maximum fix iterations per diagram (default: 5)

```json
{
  "content": "...",
  "options": {
    "maxIterations": 10
  }
}
```

## Common Use Cases

### 1. Documentation Pipeline

```bash
# Fix all markdown files in docs directory
for file in docs/*.md; do
  curl -X POST http://localhost:3000/api/v1/markdown/fix \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"$(cat $file)\"}" \
    | jq -r '.fixedContent' > "$file.fixed"
done
```

### 2. CI/CD Integration

```yaml
# .github/workflows/fix-diagrams.yml
name: Fix Mermaid Diagrams
on: [push]
jobs:
  fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Fix diagrams
        run: |
          curl -X POST ${{ secrets.VALIDATOR_URL }}/api/v1/markdown/fix \
            -H "Content-Type: application/json" \
            -d "{\"content\": \"$(cat README.md)\"}" \
            | jq -r '.fixedContent' > README.md
      - name: Commit changes
        run: |
          git config user.name "Bot"
          git add README.md
          git commit -m "Auto-fix Mermaid diagrams"
          git push
```

### 3. LLM Post-Processing

```javascript
// After LLM generates markdown with Mermaid diagrams
async function postProcessLLMOutput(llmMarkdown) {
  const fixer = new MarkdownMermaidFixer();
  const result = await fixer.processMarkdown(llmMarkdown);
  
  if (result.success) {
    return result.fixedContent;
  } else {
    console.warn('Some diagrams could not be fixed:', result.failedDiagrams);
    return result.fixedContent; // Return partially fixed content
  }
}
```

### 4. Batch Processing

```javascript
const glob = require('glob');
const fs = require('fs');

async function fixAllMarkdownFiles(pattern) {
  const files = glob.sync(pattern);
  const fixer = new MarkdownMermaidFixer();
  
  for (const file of files) {
    console.log(`Processing ${file}...`);
    const content = fs.readFileSync(file, 'utf8');
    const result = await fixer.processMarkdown(content);
    
    if (result.success) {
      fs.writeFileSync(file, result.fixedContent);
      console.log(`✓ Fixed ${result.fixedDiagrams} diagram(s)`);
    } else {
      console.log(`✗ Failed to fix ${result.failedDiagrams} diagram(s)`);
    }
  }
  
  fixer.cleanup();
}

fixAllMarkdownFiles('docs/**/*.md');
```

## Error Handling

### Partial Success

When some diagrams fix successfully but others fail:

```json
{
  "success": false,
  "fixedContent": "...", // Partially fixed markdown
  "statistics": {
    "totalDiagrams": 3,
    "fixedDiagrams": 2,
    "failedDiagrams": 1,
    "totalIterations": 7,
    "processingTime": 234
  }
}
```

### Complete Failure

```json
{
  "success": false,
  "error": "Processing failed",
  "message": "Error details..."
}
```

## Best Practices

### 1. Validate Before Fixing

```javascript
// First validate to see what needs fixing
const validation = await fixer.validateMarkdown(content);
console.log(`${validation.invalidDiagrams} diagrams need fixing`);

// Then fix if needed
if (validation.invalidDiagrams > 0) {
  const result = await fixer.processMarkdown(content);
}
```

### 2. Review Fixed Content

Always review auto-fixed content, especially for:
- Production documentation
- Complex diagrams
- Low confidence fixes

### 3. Preserve Originals

```javascript
// Save original before fixing
fs.writeFileSync('doc.md.backup', originalContent);

// Then fix
const result = await fixer.processMarkdown(originalContent);
fs.writeFileSync('doc.md', result.fixedContent);
```

### 4. Monitor Statistics

```javascript
const result = await fixer.processMarkdown(content);

// Log for monitoring
console.log({
  file: filename,
  diagrams: result.totalDiagrams,
  fixed: result.fixedDiagrams,
  failed: result.failedDiagrams,
  avgIterations: result.totalIterations / result.totalDiagrams
});
```

## Testing

Run the test suite:

```bash
# Test markdown fixer
node test/markdown-fixer-test.js
```

## Performance

### Benchmarks

- **Single Diagram:** ~50-150ms
- **5 Diagrams:** ~200-500ms
- **10 Diagrams:** ~400-1000ms
- **Large File (50+ diagrams):** ~2-5 seconds

### Optimization Tips

1. **Batch Processing:** Process multiple files in parallel
2. **Caching:** Cache validation results for unchanged diagrams
3. **Streaming:** For very large files, consider streaming
4. **Timeouts:** Set appropriate timeouts for large files

## Limitations

1. **Max File Size:** Limited by server configuration (default: 10MB)
2. **Max Iterations:** Default 5 per diagram (configurable)
3. **Complex Diagrams:** May not fix all structural issues
4. **Nested Code Blocks:** Only processes top-level Mermaid blocks

## Troubleshooting

### Issue: Diagrams Not Found

**Cause:** Incorrect code fence format

**Solution:** Ensure diagrams use:
```
\`\`\`mermaid
diagram content
\`\`\`
```

### Issue: Partial Fixes

**Cause:** Complex errors requiring multiple iterations

**Solution:** Increase maxIterations:
```json
{"options": {"maxIterations": 10}}
```

### Issue: Slow Processing

**Cause:** Many diagrams or complex fixes

**Solution:** 
- Process files in parallel
- Reduce maxIterations
- Split large files

## Support

For issues or questions:
- Check the detailed report in response
- Review fix history for each diagram
- Test with individual diagrams first
- Report bugs with example markdown

---

**Last Updated:** 2026-05-27  
**API Version:** v1  
**Service:** MarkdownMermaidFixer