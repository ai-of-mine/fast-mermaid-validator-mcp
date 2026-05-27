/**
 * Comprehensive LLM-Generated Test Cases
 * Based on common issues found in AI-generated Mermaid diagrams
 */

const testCases = {
  // Category 1: LLM Natural Language to Mermaid Issues
  llmNaturalLanguage: [
    {
      name: 'LLM - Natural Language Node Names',
      type: 'flowchart',
      content: `flowchart TD
    Start the Process --> Check if user is authenticated
    Check if user is authenticated --> Process the user's request
    Process the user's request --> Send response to client`,
      issues: ['Spaces in node IDs', 'Missing quotes'],
      difficulty: 'Medium'
    },
    {
      name: 'LLM - Numbered Steps as IDs',
      type: 'flowchart',
      content: `flowchart LR
    1. Initialize --> 2. Validate Input
    2. Validate Input --> 3. Process Data
    3. Process Data --> 4. Return Result`,
      issues: ['Invalid IDs with periods', 'Spaces'],
      difficulty: 'Medium'
    }
  ],

  // Category 2: LLM Special Character Issues
  llmSpecialChars: [
    {
      name: 'LLM - Currency and Math Symbols',
      type: 'flowchart',
      content: `flowchart TD
    A[Calculate $100 + $50] --> B[Apply 20% discount]
    B --> C[Total: $120 (includes tax)]
    C --> D[Process payment of $120.00]`,
      issues: ['Missing quotes for special chars'],
      difficulty: 'Easy'
    },
    {
      name: 'LLM - Code Snippets in Nodes',
      type: 'flowchart',
      content: `flowchart LR
    A[if (x > 0)] --> B[return x * 2]
    B --> C[console.log("Done")]`,
      issues: ['Missing quotes', 'Special characters'],
      difficulty: 'Medium'
    },
    {
      name: 'LLM - Email and URLs',
      type: 'flowchart',
      content: `flowchart TD
    A[Send to user@example.com] --> B[Visit https://example.com]
    B --> C[API: /api/v1/users]`,
      issues: ['Missing quotes for special chars'],
      difficulty: 'Easy'
    }
  ],

  // Category 3: LLM Sequence Diagram Issues
  llmSequenceDiagrams: [
    {
      name: 'LLM - Wrong Arrow Types',
      type: 'sequenceDiagram',
      content: `sequenceDiagram
    User -> Frontend: Click button
    Frontend -> Backend: Send request
    Backend -> Database: Query data
    Database -> Backend: Return data
    Backend -> Frontend: Send response
    Frontend -> User: Display result`,
      issues: ['Single dash arrows instead of double'],
      difficulty: 'Easy'
    },
    {
      name: 'LLM - Reverse Arrow Direction',
      type: 'sequenceDiagram',
      content: `sequenceDiagram
    Client ->> Server: Request
    Client <<-- Server: Response
    Client ->> API: Call
    Client <<-- API: Result`,
      issues: ['Wrong arrow direction'],
      difficulty: 'Medium'
    }
  ],

  // Category 4: Real-World Complex Scenarios
  realWorldComplex: [
    {
      name: 'E-Commerce Checkout',
      type: 'flowchart',
      content: `flowchart TD
    Start[User clicks Buy Now] --> Cart{Cart has items?}
    Cart -->|Yes| Login{User logged in?}
    Cart -->|No| Empty[Show: Cart is empty]
    Login -->|Yes| Payment[Enter payment: $XX.XX]
    Login -->|No| SignIn[Redirect to /login]
    Payment --> Process{Payment OK?}
    Process -->|Success| Order[Create order #12345]
    Process -->|Failed| Retry[Error: Payment declined\\nTry again]
    Order --> Email[Send to: customer@email.com]
    Email --> Done[Order complete!]`,
      issues: ['Missing quotes', 'Line breaks', 'Special chars'],
      difficulty: 'Hard'
    },
    {
      name: 'Microservices API Gateway',
      type: 'flowchart',
      content: `flowchart LR
    Client --> API-Gateway
    API-Gateway --> Auth-Service
    API-Gateway --> User-Service
    API-Gateway --> Order-Service
    Auth-Service --> Redis-Cache
    User-Service --> User-DB
    Order-Service --> Order-DB
    Order-Service --> Payment-API`,
      issues: ['Hyphens in node IDs'],
      difficulty: 'Medium'
    },
    {
      name: 'CI/CD Pipeline',
      type: 'flowchart',
      content: `flowchart TD
    Commit[git push] --> Trigger[Webhook triggers CI]
    Trigger --> Build[npm run build]
    Build --> Test{Tests pass?}
    Test -->|Yes| Deploy[Deploy to staging]
    Test -->|No| Notify[Slack: Build failed\\nCheck logs]
    Deploy --> Smoke{Smoke tests OK?}
    Smoke -->|Yes| Prod[Deploy to production]
    Smoke -->|No| Rollback[Rollback & alert team]`,
      issues: ['Missing quotes', 'Line breaks'],
      difficulty: 'Hard'
    }
  ],

  // Category 5: LLM Subgraph Issues
  llmSubgraphs: [
    {
      name: 'LLM - Missing End Statements',
      type: 'flowchart',
      content: `flowchart TD
    subgraph Frontend
        A[React] --> B[Redux]
    subgraph Backend
        C[Node.js] --> D[Express]
    A --> C`,
      issues: ['Missing end statements'],
      difficulty: 'Medium'
    },
    {
      name: 'LLM - Invalid Subgraph Names',
      type: 'flowchart',
      content: `flowchart TD
    subgraph User-Interface
        A --> B
    end
    subgraph Data-Layer
        C --> D
    end`,
      issues: ['Hyphens in subgraph names'],
      difficulty: 'Easy'
    }
  ],

  // Category 6: LLM Class Diagram Issues
  llmClassDiagrams: [
    {
      name: 'LLM - Invalid Class Names',
      type: 'classDiagram',
      content: `classDiagram
    class User-Account {
        +string user-name
        +string email-address
        +login()
        +logout()
    }
    class Shopping-Cart {
        +add-item()
        +remove-item()
    }`,
      issues: ['Hyphens in class and method names'],
      difficulty: 'Medium'
    }
  ],

  // Category 7: LLM State Diagram Issues
  llmStateDiagrams: [
    {
      name: 'LLM - Invalid State Names',
      type: 'stateDiagram-v2',
      content: `stateDiagram-v2
    [*] --> Not-Started
    Not-Started --> In-Progress
    In-Progress --> Under-Review
    Under-Review --> Completed
    Completed --> [*]`,
      issues: ['Hyphens in state names'],
      difficulty: 'Easy'
    }
  ],

  // Category 8: Extreme Edge Cases
  extremeCases: [
    {
      name: 'Everything Wrong',
      type: 'flowchart',
      content: `flowchart TD
    1-Start[Process $100 & 50%] --> 2-Check
    2-Check["Validate\\nInput] --> 3-Decision{Valid?
    3-Decision -->|Yes| 4-Process[Process data
    3-Decision -->|No| 5-Error[Error: Failed\\nTry again]
    # Comment
    style 4-Process`,
      issues: ['All types of errors'],
      difficulty: 'Extreme'
    },
    {
      name: 'Nested Complexity',
      type: 'flowchart',
      content: `flowchart TD
    subgraph Layer-1
        A[Start] --> B{Check}
        subgraph Layer-2
            C[Process] --> D[Save]
        B --> C
    A --> E[End]`,
      issues: ['Missing ends', 'Invalid names', 'Structure'],
      difficulty: 'Extreme'
    }
  ]
};

// Export for use in tests
module.exports = testCases;

// If run directly, display test case summary
if (require.main === module) {
  console.log('COMPREHENSIVE LLM TEST CASES SUMMARY');
  console.log('='.repeat(60));
  
  let totalTests = 0;
  Object.entries(testCases).forEach(([category, cases]) => {
    console.log(`\n${category}: ${cases.length} tests`);
    cases.forEach((test, idx) => {
      console.log(`  ${idx + 1}. ${test.name} (${test.difficulty})`);
      console.log(`     Issues: ${test.issues.join(', ')}`);
      totalTests++;
    });
  });
  
  console.log(`\nTotal Test Cases: ${totalTests}`);
  console.log('='.repeat(60));
}

// Made with Bob
