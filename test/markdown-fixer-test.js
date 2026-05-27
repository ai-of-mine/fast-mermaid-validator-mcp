/**
 * Markdown Mermaid Fixer Test
 * Tests the complete markdown processing with multiple diagrams
 */

const MarkdownMermaidFixer = require('../src/services/markdownMermaidFixer');

// Sample markdown with multiple diagrams containing various issues
const sampleMarkdown = `# Project Documentation

This document contains several Mermaid diagrams.

## System Architecture

\`\`\`mermaid
flowchart TD
    A[Start Process] --> B[Check Input]
    B --> C{Is Valid?}
    C -->|Yes| D[Process with $100 fee]
    C -->|No| E[Show Error Message]
    D --> F[(Save to Database)]
    F --> G([End])
\`\`\`

## User Flow

\`\`\`mermaid
sequenceDiagram
    User -> Frontend: Click button
    Frontend -> Backend: Send request
    Backend -> Database: Query data
    Database -> Backend: Return results
    Backend -> Frontend: Send response
    Frontend -> User: Display data
\`\`\`

## Data Model

\`\`\`mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        int user-id PK
        string user-name
        string email
    }
    ORDER {
        int order-id PK
        int user-id FK
        date order-date
    }
\`\`\`

## Process Flow

\`\`\`mermaid
flowchart LR
    1Start[Initialize] --> 2Process[Process Data]
    2Process --> 3Validate{Valid?}
    3Validate -->|Yes| 4Save[Save Results]
    3Validate -->|No| 5Error[Handle Error]
\`\`\`

End of documentation.
`;

async function runTest() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         MARKDOWN MERMAID FIXER TEST                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const fixer = new MarkdownMermaidFixer();

  console.log('Original Markdown Length:', sampleMarkdown.length, 'characters');
  console.log('\nProcessing markdown...\n');

  try {
    const result = await fixer.processMarkdown(sampleMarkdown);

    console.log('='.repeat(60));
    console.log('PROCESSING RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Diagrams Found: ${result.totalDiagrams}`);
    console.log(`Successfully Fixed: ${result.fixedDiagrams}`);
    console.log(`Failed to Fix: ${result.failedDiagrams}`);
    console.log(`Total Iterations: ${result.totalIterations}`);
    console.log(`Processing Time: ${result.processingTime}ms`);
    console.log(`Overall Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`);

    console.log('\n' + '='.repeat(60));
    console.log('DIAGRAM DETAILS');
    console.log('='.repeat(60));

    result.diagrams.forEach((diagram, index) => {
      console.log(`\nDiagram ${index + 1} (${diagram.id}):`);
      console.log(`  Status: ${diagram.success ? '✓ Valid' : '✗ Invalid'}`);
      console.log(`  Was Fixed: ${diagram.wasFixed ? 'Yes' : 'No'}`);
      console.log(`  Iterations: ${diagram.iterations}`);
      
      if (diagram.history.length > 0) {
        console.log(`  History:`);
        diagram.history.forEach(h => {
          console.log(`    Iteration ${h.iteration}: ${h.valid ? 'Valid' : 'Invalid'}, ${h.fixCount} fixes, ${h.errorCount} errors`);
        });
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('DETAILED REPORT');
    console.log('='.repeat(60));
    console.log(fixer.generateReport(result));

    console.log('\n' + '='.repeat(60));
    console.log('FIXED MARKDOWN PREVIEW');
    console.log('='.repeat(60));
    console.log(result.fixedContent.substring(0, 500) + '...\n');

    console.log('Fixed Markdown Length:', result.fixedContent.length, 'characters');
    console.log('Length Change:', result.fixedContent.length - sampleMarkdown.length, 'characters');

    fixer.cleanup();

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                   TEST COMPLETE                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    return result.success ? 0 : 1;

  } catch (error) {
    console.error('Test failed:', error);
    fixer.cleanup();
    return 1;
  }
}

// Run test
runTest()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

// Made with Bob
