import { createLogger } from '../backend/shared/logger';

const logger = createLogger("test-api-script");

const BASE_URL = 'http://localhost:4000';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  data?: any;
}

async function testAPI(apiKey: string): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Identify a user
  try {
    logger.info('Testing identify endpoint');
    
    const identifyResponse = await fetch(`${BASE_URL}/v1/identify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        deviceId: 'test-device-123',
        externalId: 'test-user-456',
        traits: {
          email: 'test@example.com',
          plan: 'premium'
        }
      })
    });

    if (!identifyResponse.ok) {
      throw new Error(`HTTP ${identifyResponse.status}: ${await identifyResponse.text()}`);
    }

    const identifyData = await identifyResponse.json();
    results.push({
      name: 'Identify User',
      success: true,
      data: identifyData
    });

    logger.info('Identify test passed', { userId: identifyData.userId });

    // Test 2: Track an event for the same user
    logger.info('Testing track endpoint');
    
    const trackResponse = await fetch(`${BASE_URL}/v1/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        externalId: 'test-user-456',
        event: 'purchase',
        props: {
          amount: 99.99,
          product: 'premium-plan',
          currency: 'USD'
        }
      })
    });

    if (!trackResponse.ok) {
      throw new Error(`HTTP ${trackResponse.status}: ${await trackResponse.text()}`);
    }

    const trackData = await trackResponse.json();
    results.push({
      name: 'Track Event',
      success: true,
      data: trackData
    });

    logger.info('Track test passed', { eventId: trackData.eventId });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('API test failed', error instanceof Error ? error : new Error(errorMessage));
    
    results.push({
      name: 'API Test',
      success: false,
      error: errorMessage
    });
  }

  return results;
}

async function runAPITests() {
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.log('Usage: npx tsx scripts/test-api.ts <api-key>');
    console.log('First create an admin key: npx tsx scripts/create-admin-key.ts');
    process.exit(1);
  }

  logger.info('Starting API tests');

  try {
    const results = await testAPI(apiKey);
    
    console.log('\n=== API TEST RESULTS ===');
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
    logger.error('API test script failed', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Handle script errors
process.on('uncaughtException', (error) => {
  logger.error("Uncaught exception in API test script", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error("Unhandled rejection in API test script", reason instanceof Error ? reason : new Error(String(reason)));
  process.exit(1);
});

runAPITests();
