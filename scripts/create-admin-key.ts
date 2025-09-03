import { createAPIKey } from '../backend/shared/auth';
import { createLogger } from '../backend/shared/logger';

const logger = createLogger("create-admin-key-script");

async function createAdminKey() {
  try {
    logger.info('Creating admin API key');

    const result = await createAPIKey('admin');

    logger.info('Admin API key created successfully');
    console.log('\n=== ADMIN API KEY ===');
    console.log(`Key ID: ${result.id}`);
    console.log(`API Key: ${result.key}`);
    console.log('\nSave this key securely - it will not be shown again!');
    console.log('Use this key in the Authorization header: Bearer <key>');
    console.log('========================\n');

  } catch (error) {
    logger.error('Failed to create admin API key', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Handle script errors
process.on('uncaughtException', (error) => {
  logger.error("Uncaught exception in create admin key script", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error("Unhandled rejection in create admin key script", reason instanceof Error ? reason : new Error(String(reason)));
  process.exit(1);
});

createAdminKey().catch((error) => {
  logger.error('Create admin key script failed', error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});
