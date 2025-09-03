import { createLogger } from '../backend/shared/logger';

const logger = createLogger("test-phase5-script");

const BASE_URL = 'http://localhost:4000';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  data?: any;
}

async function testPhase5(apiKey: string): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    // Test 1: Expression validation
    logger.info('Testing expression validation endpoint');
    
    const validateResponse = await fetch(`${BASE_URL}/v1/admin/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        expression: 'events.purchase.count_30d >= 1',
        type: 'trait'
      })
    });

    if (!validateResponse.ok) {
      throw new Error(`Validate expression failed: ${validateResponse.status}: ${await validateResponse.text()}`);
    }

    const validateData = await validateResponse.json();
    results.push({
      name: 'Expression Validation',
      success: true,
      data: validateData
    });

    logger.info('Expression validation test passed', { valid: validateData.valid });

    // Test 2: Search users
    logger.info('Testing user search endpoint');
    
    const searchResponse = await fetch(`${BASE_URL}/v1/admin/users/search?query=test&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`User search failed: ${searchResponse.status}: ${await searchResponse.text()}`);
    }

    const searchData = await searchResponse.json();
    results.push({
      name: 'User Search',
      success: true,
      data: searchData
    });

    logger.info('User search test passed', { userCount: searchData.users.length });

    // Test 3: System metrics
    logger.info('Testing system metrics endpoint');
    
    const metricsResponse = await fetch(`${BASE_URL}/v1/admin/metrics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!metricsResponse.ok) {
      throw new Error(`System metrics failed: ${metricsResponse.status}: ${await metricsResponse.text()}`);
    }

    const metricsData = await metricsResponse.json();
    results.push({
      name: 'System Metrics',
      success: true,
      data: metricsData
    });

    logger.info('System metrics test passed', { 
      totalUsers: metricsData.metrics.users.total,
      totalEvents: metricsData.metrics.events.total
    });

    // Test 4: List exports
    logger.info('Testing export list endpoint');
    
    const exportsResponse = await fetch(`${BASE_URL}/v1/export/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!exportsResponse.ok) {
      throw new Error(`Export list failed: ${exportsResponse.status}: ${await exportsResponse.text()}`);
    }

    const exportsData = await exportsResponse.json();
    results.push({
      name: 'Export List',
      success: true,
      data: exportsData
    });

    logger.info('Export list test passed', { exportCount: exportsData.exports.length });

    // Test 5: Try to export a segment (if any exist)
    try {
      logger.info('Testing segment export endpoint');
      
      // First get list of segments
      const segmentsResponse = await fetch(`${BASE_URL}/v1/admin/segments`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (segmentsResponse.ok) {
        const segmentsData = await segmentsResponse.json();
        
        if (segmentsData.segments.length > 0) {
          const segmentKey = segmentsData.segments[0].key;
          
          const exportResponse = await fetch(`${BASE_URL}/v1/export/segment/${segmentKey}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          });

          if (!exportResponse.ok) {
            throw new Error(`Segment export failed: ${exportResponse.status}: ${await exportResponse.text()}`);
          }

          const exportData = await exportResponse.json();
          results.push({
            name: 'Segment Export',
            success: true,
            data: exportData
          });

          logger.info('Segment export test passed', { 
            segmentKey,
            userCount: exportData.userCount 
          });
        } else {
          results.push({
            name: 'Segment Export',
            success: true,
            data: { message: 'No segments available to export' }
          });
        }
      }
    } catch (error) {
      logger.warn('Segment export test failed', { error: error instanceof Error ? error.message : String(error) });
      results.push({
        name: 'Segment Export',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Phase 5 test failed', error instanceof Error ? error : new Error(errorMessage));
    
    results.push({
      name: 'Phase 5 Test',
      success: false,
      error: errorMessage
    });
  }

  return results;
}

async function runPhase5Tests() {
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.log('Usage: npx tsx scripts/test-phase5.ts <api-key>');
    console.log('First create an admin key: npx tsx scripts/create-admin-key.ts');
    process.exit(1);
  }

  logger.info('Starting Phase 5 tests');

  try {
    const results = await testPhase5(apiKey);
    
    console.log('\n=== PHASE 5 TEST RESULTS ===');
    results.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.name}`);
      
      if (result.data && result.name !== 'System Metrics') {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
      } else if (result.data && result.name === 'System Metrics') {
        console.log(`   Users: ${result.data.metrics.users.total}, Events: ${result.data.metrics.events.total}`);
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    const allPassed = results.every(r => r.success);
    console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    logger.error('Phase 5 test script failed', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Handle script errors
process.on('uncaughtException', (error) => {
  logger.error("Uncaught exception in Phase 5 test script", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error("Unhandled rejection in Phase 5 test script", reason instanceof Error ? reason : new Error(String(reason)));
  process.exit(1);
});

runPhase5Tests();
