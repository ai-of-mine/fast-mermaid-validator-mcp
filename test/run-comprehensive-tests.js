/**
 * Comprehensive Test Runner with Iterative Fixing
 * Uses all LLM-based test cases with iterative fix-and-validate
 */

const CustomMermaidValidator = require('../src/services/customMermaidValidator');
const testCases = require('./comprehensive-llm-test-cases');

const MAX_ITERATIONS = 5;

async function iterativeFixAndValidate(testCase, validator) {
  let content = testCase.content;
  let iteration = 0;
  let isValid = false;
  const history = [];

  while (iteration < MAX_ITERATIONS && !isValid) {
    iteration++;

    const result = await validator.validateDiagram({
      id: `test_${iteration}`,
      content: content,
      type: testCase.type
    }, { autoFix: true });

    history.push({
      iteration,
      valid: result.valid,
      autoFixed: result.autoFixed || false,
      errorCount: result.errors.length,
      fixCount: result.appliedFixes ? result.appliedFixes.length : 0
    });

    if (result.autoFixed) {
      content = result.fixedContent;
    }

    if (result.valid) {
      isValid = true;
    } else if (!result.autoFixed) {
      break;
    }
  }

  return {
    name: testCase.name,
    category: testCase.difficulty,
    success: isValid,
    iterations: iteration,
    history: history
  };
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE LLM-BASED AUTO-FIX TEST SUITE          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const validator = new CustomMermaidValidator();
  console.log('Initializing validator...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('✓ Ready\n');

  const allResults = [];
  const categoryStats = {};

  // Run all test categories
  for (const [categoryName, tests] of Object.entries(testCases)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Category: ${categoryName} (${tests.length} tests)`);
    console.log('='.repeat(60));

    for (const testCase of tests) {
      console.log(`\nTesting: ${testCase.name}`);
      console.log(`Difficulty: ${testCase.difficulty}`);
      console.log(`Expected Issues: ${testCase.issues.join(', ')}`);

      const result = await iterativeFixAndValidate(testCase, validator);
      allResults.push(result);

      const status = result.success ? '✓ PASS' : '✗ FAIL';
      console.log(`Result: ${status} (${result.iterations} iterations)`);

      // Track stats
      const diff = result.category;
      if (!categoryStats[diff]) {
        categoryStats[diff] = { total: 0, success: 0, totalIterations: 0 };
      }
      categoryStats[diff].total++;
      if (result.success) categoryStats[diff].success++;
      categoryStats[diff].totalIterations += result.iterations;
    }
  }

  // Summary
  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL SUMMARY                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const total = allResults.length;
  const success = allResults.filter(r => r.success).length;
  const failed = total - success;
  const successRate = ((success / total) * 100).toFixed(1);
  const avgIterations = (allResults.reduce((sum, r) => sum + r.iterations, 0) / total).toFixed(1);

  console.log(`Total Tests:        ${total}`);
  console.log(`Successful:         ${success} (${successRate}%)`);
  console.log(`Failed:             ${failed}`);
  console.log(`Avg Iterations:     ${avgIterations}`);

  console.log('\n\nResults by Difficulty:');
  console.log('-'.repeat(60));
  Object.entries(categoryStats).forEach(([difficulty, stats]) => {
    const rate = ((stats.success / stats.total) * 100).toFixed(1);
    const avg = (stats.totalIterations / stats.total).toFixed(1);
    console.log(`${difficulty}:`);
    console.log(`  Success: ${stats.success}/${stats.total} (${rate}%)`);
    console.log(`  Avg Iterations: ${avg}`);
  });

  console.log('\n\nDetailed Results:');
  console.log('-'.repeat(60));
  allResults.forEach((r, i) => {
    const status = r.success ? '✓' : '✗';
    const totalFixes = r.history.reduce((sum, h) => sum + h.fixCount, 0);
    console.log(`${i + 1}. ${status} ${r.name}`);
    console.log(`   Difficulty: ${r.category} | Iterations: ${r.iterations} | Total Fixes: ${totalFixes}`);
  });

  const failedTests = allResults.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log('\n\nFailed Tests:');
    console.log('-'.repeat(60));
    failedTests.forEach(r => {
      console.log(`✗ ${r.name} (${r.category})`);
      console.log(`  Iterations: ${r.iterations}`);
      const lastIter = r.history[r.history.length - 1];
      console.log(`  Final Errors: ${lastIter.errorCount}`);
    });
  }

  validator.cleanup();

  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                   TEST COMPLETE                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  return {
    total,
    success,
    failed,
    successRate: parseFloat(successRate),
    results: allResults
  };
}

// Run tests
runAllTests()
  .then(summary => {
    process.exit(summary.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

// Made with Bob
