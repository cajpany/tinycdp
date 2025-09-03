import { db } from '../backend/shared/db';
import { createLogger } from '../backend/shared/logger';
import { randomUUID } from 'crypto';

const logger = createLogger("seed-script");

async function seed() {
  logger.info('Starting database seed');

  try {
    // Create a test user
    logger.debug('Creating test user');
    const testUser = await db.queryRow<{ id: string }>`
      INSERT INTO users (id) VALUES (${randomUUID()})
      RETURNING id
    `;

    if (!testUser) {
      throw new Error('Failed to create test user');
    }

    logger.info(`Created test user: ${testUser.id}`);

    // Add some aliases for the test user
    logger.debug('Creating user aliases');
    await db.exec`
      INSERT INTO user_aliases (user_id, kind, value) VALUES
      (${testUser.id}, 'deviceId', 'device_123'),
      (${testUser.id}, 'externalId', 'user_456')
    `;

    logger.info('Created user aliases');

    // Create some sample events
    logger.debug('Creating sample events');
    const eventNames = ['app_open', 'purchase', 'page_view', 'click'];
    const now = new Date();

    for (let i = 0; i < 50; i++) {
      const eventTime = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // i days ago
      const eventName = eventNames[Math.floor(Math.random() * eventNames.length)];
      
      await db.exec`
        INSERT INTO events (user_id, ts, name, props) VALUES
        (${testUser.id}, ${eventTime}, ${eventName}, ${JSON.stringify({
          value: Math.random() * 100,
          page: `/page${i % 5}`,
        })})
      `;
    }

    logger.info('Created 50 sample events');

    // Create sample trait definitions
    logger.debug('Creating trait definitions');
    await db.exec`
      INSERT INTO trait_defs (key, expression) VALUES
      ('power_user', 'events.app_open.unique_days_14d >= 5'),
      ('recent_buyer', 'events.purchase.count_30d >= 1 && last_seen_minutes_ago < 1440'),
      ('frequent_visitor', 'events.page_view.count_7d >= 10')
    `;

    logger.info('Created trait definitions');

    // Create sample segment definitions
    logger.debug('Creating segment definitions');
    await db.exec`
      INSERT INTO segment_defs (key, rule) VALUES
      ('power_users', 'power_user == true'),
      ('recent_buyers', 'recent_buyer == true'),
      ('engaged_users', 'power_user == true || frequent_visitor == true')
    `;

    logger.info('Created segment definitions');

    // Create sample flags
    logger.debug('Creating flags');
    await db.exec`
      INSERT INTO flags (key, rule) VALUES
      ('premium_features', 'segment("power_users")'),
      ('discount_offer', 'segment("recent_buyers") == false')
    `;

    logger.info('Created flags');

    logger.info('Database seed completed successfully', {
      testUserId: testUser.id
    });

  } catch (error) {
    logger.error('Database seed failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Handle script errors
process.on('uncaughtException', (error) => {
  logger.error("Uncaught exception in seed script", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error("Unhandled rejection in seed script", reason instanceof Error ? reason : new Error(String(reason)));
  process.exit(1);
});

seed().catch((error) => {
  logger.error('Seed script failed', error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});
