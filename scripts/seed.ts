import { db } from '../backend/shared/db';
import { randomUUID } from 'crypto';

async function seed() {
  console.log('Starting database seed...');

  // Create a test user
  const testUser = await db.queryRow<{ id: string }>`
    INSERT INTO users (id) VALUES (${randomUUID()})
    RETURNING id
  `;

  if (!testUser) {
    throw new Error('Failed to create test user');
  }

  console.log(`Created test user: ${testUser.id}`);

  // Add some aliases for the test user
  await db.exec`
    INSERT INTO user_aliases (user_id, kind, value) VALUES
    (${testUser.id}, 'deviceId', 'device_123'),
    (${testUser.id}, 'externalId', 'user_456')
  `;

  // Create some sample events
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

  // Create sample trait definitions
  await db.exec`
    INSERT INTO trait_defs (key, expression) VALUES
    ('power_user', 'events.app_open.unique_days_14d >= 5'),
    ('recent_buyer', 'events.purchase.count_30d >= 1 && last_seen_minutes_ago < 1440'),
    ('frequent_visitor', 'events.page_view.count_7d >= 10')
  `;

  // Create sample segment definitions
  await db.exec`
    INSERT INTO segment_defs (key, rule) VALUES
    ('power_users', 'power_user == true'),
    ('recent_buyers', 'recent_buyer == true'),
    ('engaged_users', 'power_user == true || frequent_visitor == true')
  `;

  // Create sample flags
  await db.exec`
    INSERT INTO flags (key, rule) VALUES
    ('premium_features', 'segment("power_users")'),
    ('discount_offer', 'segment("recent_buyers") == false')
  `;

  console.log('Database seed completed successfully!');
  console.log(`Test user ID: ${testUser.id}`);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
