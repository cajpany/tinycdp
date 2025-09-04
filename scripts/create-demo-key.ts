import { createAPIKey } from '../backend/shared/auth';

import { createLogger } from '../backend/shared/logger';

const logger = createLogger("create-demo-key-script");

async function createDemoKeys() {
  try {
    logger.info('Creating demo API keys for development');

    // Create admin key
    const adminResult = await createAPIKey('admin');
    
    // Create read key  
    const readResult = await createAPIKey('read');
    
    // Create write key
    const writeResult = await createAPIKey('write');

    logger.info('Demo API keys created successfully');
    
    console.log('\n=== DEMO API KEYS ===');
    console.log(`Admin Key: ${adminResult.key}`);
    console.log(`Read Key: ${readResult.key}`);
    console.log(`Write Key: ${writeResult.key}`);
    console.log('\nThese keys are for development use only!');
    console.log('Use the Admin key in the web console for full access.');
    console.log('Use Write/Read keys for SDK integration.');
    console.log('========================\n');

  } catch (error) {
    logger.error('Failed to create demo API keys', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Handle script errors
process.on('uncaughtException', (error) => {
  logger.error("Uncaught exception in create demo keys script", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error("Unhandled rejection in create demo keys script", reason instanceof Error ? reason : new Error(String(reason)));
  process.exit(1);
});

createDemoKeys().catch((error) => {
  logger.error('Create demo keys script failed', error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});
