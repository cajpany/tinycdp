import { createLogger } from '../backend/shared/logger';

const logger = createLogger("test-phase4-script");

const BASE_URL = 'http://localhost:4000';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  data?: any;
}

async function testPhase4(apiKey: string): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    // Test 1: Create a segment definition
    logger.info('Testing create segment endpoint');
    
    const createSegmentResponse = await fetch(`${BASE_URL}/v1/admin/segments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        key: 'test_segment',
        rule: 'power_user == true'
      })
    });

    if (!createSegmentResponse.ok) {
      throw new Error(`Create segment failed: ${createSegmentResponse.status}: ${await createSegmentResponse.text()}`);
    }

    const segmentData = await createSegmentResponse.json();
    results.push({
      name: 'Create Segment',
      success: true,
      data: segmentData
    });

    logger.info('Create segment test passed', { segmentKey: segmentData.segment.key });

    // Test 2: Create a flag definition
    logger.info('Testing create flag endpoint');
    
    const createFlagResponse = await fetch(`${BASE_URL}/v1/admin/flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        key: 'test_feature',
        rule: 'segment("test_segment")'
      })
    });

    if (!createFlagResponse.ok) {
      throw new Error(`Create flag failed: ${createFlagResponse.status}: ${await createFlagResponse.text()}`);
    }

    const flagData = await createFlagResponse.json();
    results.push({
      name: 'Create Flag',
      success: true,
      data: flagData
    });

    logger.info('Create flag test passed', { flagKey: flagData.flag.key });

    // Test 3: Track an event to trigger trait/segment computation
    logger.info('Testing event tracking with trait/segment computation');
    
    const trackResponse = await fetch(`${BASE_URL}/v1/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        externalId: 'phase4-test-user',
        event: 'app_open',
        props: {
          platform: 'web'
        }
      })
    });

    if (!trackResponse.ok) {
      throw new Error(`Track event failed: ${trackResponse.status}: ${await trackResponse.text()}`);
    }

    const trackData = await trackResponse.json();
    results.push({
      name: 'Track Event with Computation',
      success: true,
      data: trackData
    });

    logger.info('Track event test passed', { eventId: trackData.eventId });

    // Wait a moment for async processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 4: Test decision API
    logger.info('Testing decide endpoint');
    
    const decideResponse = await fetch(`${BASE_URL}/v1/decide?userId=placeholder&flag=test_feature`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!decideResponse.ok) {
      throw new Error(`Decide failed: ${decideResponse.status}: ${await decideResponse.text()}`);
    }

    const decideData = await decideResponse.json();
    results.push({
      name: 'Decision API',
      success: true,
      data: decideData
    });

    logger.info('Decide test passed', { 
      allow: decideData.allow,
      reasons: decideData.reasons 
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Phase 4 test failed', error instanceof Error ? error : new Error(errorMessage));
    
    results.push({
      name: 'Phase 4 Test',
      success: false,
      error: errorMessage
    });
  }

  return results;
}

async function runPhase4Tests() {
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.log('Usage: npx tsx scripts/test-phase4.ts <api-key>');
    console.log('First create an admin key: npx tsx scripts/create-admin-key.ts');
    process.exit(1);
  }

  logger.info('Starting Phase 4 tests');

  try {
    const results = await testPhase4(apiKey);
    
    console.log('\n=== PHASE 4 TEST RESULTS ===');
    results.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.name}`);
      
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    const allPassed = results.every(r => r.success);
    console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    logger.error('Phase 4 test script failed', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Handle script errors
process.on('uncaughtException', (error) => {
  logger.error("Uncaught exception in Phase 4 test script", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error("Unhandled rejection in Phase 4 test script", reason instanceof Error ? reason : new Error(String(reason)));
  process.exit(1);
});

runPhase4Tests();
