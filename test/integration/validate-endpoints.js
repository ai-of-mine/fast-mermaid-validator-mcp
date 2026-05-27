#!/usr/bin/env node

/**
 * Validation Endpoints Test Suite
 * Tests all validation endpoints with various diagram types
 * Author: Gregorio Elias Roecker Momm
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = process.env.API_PORT || 8000;
const API_BASE = `http://${API_HOST}:${API_PORT}/api/v1`;

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
 * Test cases for all 26 Mermaid diagram types
 */
const testCases = [
  {
    name: 'Flowchart',
    type: 'flowchart',
    content: `flowchart TD
      A[Start] --> B{Decision}
      B -->|Yes| C[Process]
      B -->|No| D[End]`
  },
  {
    name: 'Sequence Diagram',
    type: 'sequenceDiagram',
    content: `sequenceDiagram
      Alice->>Bob: Hello Bob
      Bob-->>Alice: Hi Alice`
  },
  {
    name: 'Class Diagram',
    type: 'classDiagram',
    content: `classDiagram
      class Animal {
        +String name
        +int age
        +makeSound()
      }`
  },
  {
    name: 'State Diagram',
    type: 'stateDiagram-v2',
    content: `stateDiagram-v2
      [*] --> Idle
      Idle --> Working
      Working --> [*]`
  },
  {
    name: 'Entity Relationship',
    type: 'erDiagram',
    content: `erDiagram
      CUSTOMER ||--o{ ORDER : places
      ORDER ||--|{ LINE-ITEM : contains`
  },
  {
    name: 'Gantt Chart',
    type: 'gantt',
    content: `gantt
      title Project Schedule
      section Planning
      Research :a1, 2024-01-01, 30d`
  },
  {
    name: 'User Journey',
    type: 'journey',
    content: `journey
      title My working day
      section Go to work
        Make tea: 5: Me`
  },
  {
    name: 'Git Graph',
    type: 'gitGraph',
    content: `gitGraph
      commit
      branch develop
      commit
      checkout main
      merge develop`
  },
  {
    name: 'Pie Chart',
    type: 'pie',
    content: `pie title Pets adopted
      "Dogs" : 386
      "Cats" : 85
      "Rats" : 15`
  },
  {
    name: 'Quadrant Chart',
    type: 'quadrantChart',
    content: `quadrantChart
      title Reach and engagement
      x-axis Low Reach --> High Reach
      y-axis Low Engagement --> High Engagement
      quadrant-1 We should expand
      quadrant-2 Need to promote
      quadrant-3 Re-evaluate
      quadrant-4 May be improved
      Campaign A: [0.3, 0.6]`
  },
  {
    name: 'Requirement Diagram',
    type: 'requirementDiagram',
    content: `requirementDiagram
      requirement test_req {
        id: 1
        text: the test text
        risk: high
        verifymethod: test
      }`
  },
  {
    name: 'Mind Map',
    type: 'mindmap',
    content: `mindmap
      root((mindmap))
        Origins
          Long history
        Research
          On effectiveness
        Tools
          pen and paper
          apps`
  },
  {
    name: 'Timeline',
    type: 'timeline',
    content: `timeline
      title Timeline of Events
      2020 : Event 1
      2021 : Event 2
      2022 : Event 3`
  },
  {
    name: 'ZenUML',
    type: 'zenuml',
    content: `zenuml
      Alice->Bob: Hello Bob
      Bob->Alice: Hi Alice`
  },
  {
    name: 'Sankey',
    type: 'sankey-beta',
    content: `sankey-beta
      Coal,Electricity,10
      Solar,Electricity,5`
  },
  {
    name: 'XY Chart',
    type: 'xychart-beta',
    content: `xychart-beta
      title "Sales Revenue"
      x-axis [jan, feb, mar]
      y-axis "Revenue" 0 --> 10000
      bar [5000, 6000, 7500]`
  },
  {
    name: 'Block Diagram',
    type: 'block-beta',
    content: `block-beta
      columns 2
      A B
      C`
  },
  {
    name: 'Packet Diagram',
    type: 'packet-beta',
    content: `packet-beta
      0-7: Header
      8-15: Length
      16-31: Data`
  },
  {
    name: 'Architecture',
    type: 'architecture-beta',
    content: `architecture-beta
      group api(server)[API]
      group database[Database]
      api --> database`
  },
  {
    name: 'Kanban',
    type: 'kanban',
    content: `kanban
      Todo
        Task 1
      In Progress
        Task 2
      Done
        Task 3`
  },
  {
    name: 'C4 Context',
    type: 'C4Context',
    content: `C4Context
      title System Context
      Person(customer, "Customer", "A user of the system")
      System(banking_system, "Banking System", "Handles transactions")
      Rel(customer, banking_system, "Uses")`
  },
  {
    name: 'Graph',
    type: 'graph',
    content: `graph TD
      A --> B
      B --> C`
  },
  {
    name: 'Info',
    type: 'info',
    content: `info`
  },
  {
    name: 'Radar Chart',
    type: 'radar',
    content: `radar
      title Skills
      "Skill A", 80
      "Skill B", 60
      "Skill C", 70`
  },
  {
    name: 'Tree Map',
    type: 'treemap',
    content: `treemap-beta
      Root
        Branch1
          Leaf1
          Leaf2
        Branch2
          Leaf3`
  },
  {
    name: 'Example Diagram',
    type: 'exampleDiagram',
    content: `example-diagram
      showInfo`,
    skip: 'exampleDiagram is a placeholder type; its .jison grammar is not shipped (see server boot warning). Tracked for v1.2.0.'
  }
];

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
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
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

/**
 * Test single validation
 */
async function testSingleValidation(diagram) {
  const options = {
    hostname: API_HOST,
    port: API_PORT,
    path: '/api/v1/validate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const data = {
    diagrams: [{
      content: diagram.content,
      type: diagram.type
    }],
    options: {}
  };
  
  try {
    const response = await makeRequest(options, data);
    return {
      name: diagram.name,
      type: diagram.type,
      success: response.statusCode === 200 && response.body.validDiagrams === 1,
      statusCode: response.statusCode,
      valid: response.body?.results?.[0]?.valid,
      errors: response.body?.results?.[0]?.errors || [],
      processingTime: response.body?.processingTime
    };
  } catch (error) {
    return {
      name: diagram.name,
      type: diagram.type,
      success: false,
      error: error.message
    };
  }
}

/**
 * Test batch validation
 */
async function testBatchValidation() {
  log('\n=== Testing Batch Validation ===', COLORS.BLUE);
  
  const options = {
    hostname: API_HOST,
    port: API_PORT,
    path: '/api/v1/validate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const data = {
    diagrams: testCases.slice(0, 5).map(tc => ({
      content: tc.content,
      type: tc.type
    })),
    options: {}
  };
  
  try {
    const response = await makeRequest(options, data);
    if (response.statusCode === 200) {
      log(`  ✓ Batch validation successful: ${response.body.validDiagrams}/${response.body.totalDiagrams} valid`, COLORS.GREEN);
    } else {
      log(`  ✗ Batch validation failed with status ${response.statusCode}`, COLORS.RED);
    }
  } catch (error) {
    log(`  ✗ Batch validation error: ${error.message}`, COLORS.RED);
  }
}

/**
 * Test health endpoint
 */
async function testHealthEndpoint() {
  log('\n=== Testing Health Endpoint ===', COLORS.BLUE);
  
  const options = {
    hostname: API_HOST,
    port: API_PORT,
    path: '/api/v1/health',
    method: 'GET'
  };
  
  try {
    const response = await makeRequest(options);
    if (response.statusCode === 200 && (response.body.status === 'healthy' || response.body.status === 'degraded')) {
      log(`  ✓ Health check passed (status: ${response.body.status})`, 
        response.body.status === 'healthy' ? COLORS.GREEN : COLORS.YELLOW);
      return true;
    } else {
      log(`  ✗ Health check failed: ${response.body?.status}`, COLORS.RED);
      return false;
    }
  } catch (error) {
    log(`  ✗ Health check error: ${error.message}`, COLORS.RED);
    return false;
  }
}

/**
 * Main test runner
 */
async function main() {
  log('Validation Endpoints Test Suite', COLORS.BLUE);
  log('================================\n', COLORS.BLUE);
  
  // Check health first
  const healthy = await testHealthEndpoint();
  if (!healthy) {
    log('\nServer is not healthy, exiting...', COLORS.RED);
    process.exit(1);
  }
  
  // Test individual validations
  log('\n=== Testing Individual Validations ===', COLORS.BLUE);
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  let skipCount = 0;

  for (const testCase of testCases) {
    if (testCase.skip) {
      log(`Testing ${testCase.name}... ↷ SKIPPED (${testCase.skip})`, COLORS.YELLOW);
      skipCount++;
      continue;
    }
    process.stdout.write(`Testing ${testCase.name}... `);
    const result = await testSingleValidation(testCase);
    results.push(result);

    if (result.success) {
      log('✓', COLORS.GREEN);
      successCount++;
    } else {
      log(`✗ (${result.error || `Invalid: ${result.errors?.join(', ')}`})`, COLORS.RED);
      failureCount++;
    }
  }
  
  // Test batch validation
  await testBatchValidation();
  
  // Summary
  log('\n=== Test Summary ===', COLORS.BLUE);
  log(`Total tests: ${testCases.length}`, COLORS.BLUE);
  log(`Passed: ${successCount}`, COLORS.GREEN);
  log(`Failed: ${failureCount}`, failureCount > 0 ? COLORS.RED : COLORS.GREEN);
  if (skipCount > 0) {
    log(`Skipped: ${skipCount}`, COLORS.YELLOW);
  }
  
  // Performance stats
  const avgTime = results
    .filter(r => r.processingTime)
    .reduce((sum, r) => sum + r.processingTime, 0) / results.length;
  log(`Average processing time: ${avgTime.toFixed(2)}ms`, COLORS.BLUE);
  
  // Exit code
  process.exit(failureCount > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, COLORS.RED);
    process.exit(1);
  });
}

module.exports = { testSingleValidation, testBatchValidation, testHealthEndpoint };