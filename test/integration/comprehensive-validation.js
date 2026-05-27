#!/usr/bin/env node

/**
 * Comprehensive Validation Test Suite
 * Tests all 26 Mermaid diagram types with valid and invalid examples
 * Author: Gregorio Elias Roecker Momm
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = process.env.API_PORT || 8000;

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  NC: '\x1b[0m'
};

function log(message, color = COLORS.NC) {
  console.log(`${color}${message}${COLORS.NC}`);
}

/**
 * Test cases with both valid and invalid examples
 */
const validTestCases = [
  {
    name: 'Flowchart',
    type: 'flowchart',
    valid: `flowchart TD
      A[Start] --> B{Decision}
      B -->|Yes| C[Process]
      B -->|No| D[End]`,
    invalid: `flowchart TD
      A[Start] --> 
      Invalid syntax here`
  },
  {
    name: 'C4 Context',
    type: 'C4Context', 
    valid: `C4Context
      title System Context
      Person(customer, "Customer", "A user of the system")
      System(banking_system, "Banking System", "Handles transactions")
      Rel(customer, banking_system, "Uses")`,
    invalid: `C4Context
      title System Context
      Person(customer "Customer")
      InvalidSyntax --> here`
  },
  {
    name: 'Example Diagram',
    type: 'exampleDiagram',
    valid: `example-diagram
      showInfo`,
    invalid: `example-diagram
      invalidCommand
      syntax error`,
    skip: 'exampleDiagram is a placeholder type; its .jison grammar is not shipped (see server boot warning). Tracked for v1.2.0.'
  },
  {
    name: 'Tree Map',
    type: 'treemap',
    valid: `treemap-beta
      Root
        Branch1
          Leaf1
          Leaf2
        Branch2
          Leaf3`,
    invalid: `treemap-beta
      Root
        Branch1 -->
        Invalid syntax`
  },
  {
    name: 'Requirement Diagram',
    type: 'requirementDiagram',
    valid: `requirementDiagram
      requirement test_req {
        id: 1
        text: the test text
        risk: high
        verifymethod: test
      }`,
    invalid: `requirementDiagram
      requirement invalid {
        invalidProperty: value
        syntax error here`
  },
  {
    name: 'Quadrant Chart',
    type: 'quadrantChart',
    valid: `quadrantChart
      title Reach and engagement
      x-axis Low Reach --> High Reach
      y-axis Low Engagement --> High Engagement
      quadrant-1 We should expand
      Campaign A: [0.3, 0.6]`,
    invalid: `quadrantChart
      title Test
      x-axis Invalid -->
      syntax error here`
  }
];

/**
 * Test single validation
 */
async function testValidation(diagram, expectValid = true) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      diagrams: [{
        content: diagram.content,
        type: diagram.type
      }],
      options: {  }
    });
    
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/v1/validate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          const result = response.results?.[0];
          const actualValid = result?.valid === true;
          
          resolve({
            success: actualValid === expectValid,
            actualValid,
            expectValid,
            errors: result?.errors || [],
            response: response
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Create test file with all 26 diagram types
 */
function createTestFile() {
  const testContent = `# All 26 Mermaid Diagram Types Test File

## 1. Flowchart
\`\`\`mermaid
flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[End]
\`\`\`

## 2. Sequence Diagram
\`\`\`mermaid
sequenceDiagram
  Alice->>Bob: Hello
  Bob-->>Alice: Hi
\`\`\`

## 3. Class Diagram
\`\`\`mermaid
classDiagram
  class Animal {
    +String name
    +makeSound()
  }
\`\`\`

## 4. State Diagram
\`\`\`mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Working
  Working --> [*]
\`\`\`

## 5. Entity Relationship
\`\`\`mermaid
erDiagram
  CUSTOMER ||--o{ ORDER : places
\`\`\`

## 6. Gantt Chart
\`\`\`mermaid
gantt
  title Project Schedule
  section Planning
  Research :a1, 2024-01-01, 30d
\`\`\`

## 7. User Journey
\`\`\`mermaid
journey
  title My working day
  section Go to work
    Make tea: 5: Me
\`\`\`

## 8. Git Graph
\`\`\`mermaid
gitGraph
  commit
  branch develop
  commit
\`\`\`

## 9. Pie Chart
\`\`\`mermaid
pie title Pets
  "Dogs" : 386
  "Cats" : 85
\`\`\`

## 10. Quadrant Chart
\`\`\`mermaid
quadrantChart
  title Reach and engagement
  x-axis Low --> High
  y-axis Low --> High
  Campaign A: [0.3, 0.6]
\`\`\`

## 11. Requirement Diagram
\`\`\`mermaid
requirementDiagram
  requirement test_req {
    id: 1
    text: the test text
    risk: high
    verifymethod: test
  }
\`\`\`

## 12. Mind Map
\`\`\`mermaid
mindmap
  root((mindmap))
    Origins
      Long history
    Research
\`\`\`

## 13. Timeline
\`\`\`mermaid
timeline
  title Timeline
  2020 : Event 1
  2021 : Event 2
\`\`\`

## 14. ZenUML
\`\`\`mermaid
zenuml
  Alice->Bob: Hello
  Bob->Alice: Hi
\`\`\`

## 15. Sankey
\`\`\`mermaid
sankey-beta
  Coal,Electricity,10
  Solar,Electricity,5
\`\`\`

## 16. XY Chart
\`\`\`mermaid
xychart-beta
  title "Sales Revenue"
  x-axis [jan, feb, mar]
  y-axis "Revenue" 0 --> 10000
  bar [5000, 6000, 7500]
\`\`\`

## 17. Block Diagram
\`\`\`mermaid
block-beta
  columns 2
  A B
  C
\`\`\`

## 18. Packet Diagram
\`\`\`mermaid
packet-beta
  0-7: Header
  8-15: Length
\`\`\`

## 19. Architecture
\`\`\`mermaid
architecture-beta
  group api(server)[API]
  group database[Database]
  api --> database
\`\`\`

## 20. Kanban
\`\`\`mermaid
kanban
  Todo
    Task 1
  Done
    Task 2
\`\`\`

## 21. C4 Context
\`\`\`mermaid
C4Context
  title System Context
  Person(customer, "Customer")
  System(system, "System")
  Rel(customer, system, "Uses")
\`\`\`

## 22. Graph
\`\`\`mermaid
graph TD
  A --> B
  B --> C
\`\`\`

## 23. Info
\`\`\`mermaid
info
\`\`\`

## 24. Radar Chart
\`\`\`mermaid
radar
  title Skills
  "Skill A", 80
  "Skill B", 60
\`\`\`

## 25. Tree Map
\`\`\`mermaid
treemap-beta
  Root
    Branch1
      Leaf1
\`\`\`

## 26. Example Diagram
\`\`\`mermaid
example-diagram
  showInfo
\`\`\`
`;

  const testDir = path.join(__dirname, 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(testDir, 'all-26-diagrams.md'), testContent);
  
  return path.join(testDir, 'all-26-diagrams.md');
}

/**
 * Test file upload with all 26 diagram types
 */
async function testFileUpload(filePath) {
  return new Promise((resolve, reject) => {
    const FormData = require('form-data');
    const form = new FormData();
    
    form.append('file', fs.createReadStream(filePath));
    form.append('generateSvg', 'false');
    
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/v1/upload/file',
      method: 'POST',
      headers: form.getHeaders()
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(body)
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    form.pipe(req);
  });
}

/**
 * Main test runner
 */
async function main() {
  log('Comprehensive Validation Test Suite', COLORS.BLUE);
  log('====================================\n', COLORS.BLUE);
  
  // Test individual valid/invalid cases
  log('=== Testing Valid Examples ===', COLORS.BLUE);
  let validPassed = 0;
  let validFailed = 0;
  let validSkipped = 0;

  for (const testCase of validTestCases) {
    if (testCase.skip) {
      log(`Testing ${testCase.name} (valid)... ↷ SKIPPED (${testCase.skip})`, COLORS.YELLOW);
      validSkipped++;
      continue;
    }
    process.stdout.write(`Testing ${testCase.name} (valid)... `);
    try {
      const result = await testValidation({ content: testCase.valid, type: testCase.type }, true);
      if (result.success) {
        log('✓', COLORS.GREEN);
        validPassed++;
      } else {
        log(`✗ (Expected valid, got ${result.actualValid})`, COLORS.RED);
        validFailed++;
      }
    } catch (error) {
      log(`✗ (${error.message})`, COLORS.RED);
      validFailed++;
    }
  }

  log('\\n=== Testing Invalid Examples ===', COLORS.BLUE);
  let invalidPassed = 0;
  let invalidFailed = 0;
  let invalidSkipped = 0;

  for (const testCase of validTestCases) {
    if (testCase.skip) {
      log(`Testing ${testCase.name} (invalid)... ↷ SKIPPED (${testCase.skip})`, COLORS.YELLOW);
      invalidSkipped++;
      continue;
    }
    process.stdout.write(`Testing ${testCase.name} (invalid)... `);
    try {
      const result = await testValidation({ content: testCase.invalid, type: testCase.type }, false);
      if (result.success) {
        log('✓', COLORS.GREEN);
        invalidPassed++;
      } else {
        log(`✗ (Expected invalid, got ${result.actualValid})`, COLORS.RED);
        invalidFailed++;
      }
    } catch (error) {
      log(`✗ (${error.message})`, COLORS.RED);
      invalidFailed++;
    }
  }
  
  // Test file upload
  log('\\n=== Testing File Upload with All 26 Types ===', COLORS.BLUE);
  const testFile = createTestFile();
  
  try {
    const uploadResult = await testFileUpload(testFile);
    
    if (uploadResult.statusCode === 200) {
      const { totalDiagrams, validDiagrams, invalidDiagrams } = uploadResult.body;
      log(`✓ File upload successful: ${validDiagrams}/${totalDiagrams} valid`, COLORS.GREEN);
      
      // Show per-diagram results
      if (uploadResult.body.results) {
        uploadResult.body.results.forEach(result => {
          const status = result.valid ? '✓' : '✗';
          const color = result.valid ? COLORS.GREEN : COLORS.RED;
          log(`  ${status} ${result.metadata?.diagramType}: ${result.valid ? 'Valid' : result.errors?.[0]?.message || 'Invalid'}`, color);
        });
      }
    } else {
      log(`✗ File upload failed: ${uploadResult.statusCode}`, COLORS.RED);
    }
  } catch (error) {
    log(`✗ File upload error: ${error.message}`, COLORS.RED);
  }
  
  // Summary
  log('\\n=== COMPREHENSIVE TEST SUMMARY ===', COLORS.BLUE);
  log(`Valid Examples: ${validPassed}/${validTestCases.length} passed`, validPassed === validTestCases.length ? COLORS.GREEN : COLORS.YELLOW);
  log(`Invalid Examples: ${invalidPassed}/${validTestCases.length} passed`, invalidPassed === validTestCases.length ? COLORS.GREEN : COLORS.YELLOW);
  
  const totalTests = validPassed + invalidPassed;
  const totalPossible = validTestCases.length * 2;
  log(`Overall: ${totalTests}/${totalPossible} tests passed (${Math.round(totalTests/totalPossible*100)}%)`, 
    totalTests === totalPossible ? COLORS.GREEN : COLORS.YELLOW);
  
  // Cleanup
  fs.rmSync(path.dirname(testFile), { recursive: true, force: true });
  
  process.exit(totalTests === totalPossible ? 0 : 1);
}

/**
 * Make HTTP request
 */
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: body ? JSON.parse(body) : null
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run tests
if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, COLORS.RED);
    process.exit(1);
  });
}