#!/usr/bin/env npx tsx

/**
 * Seed cloud database via API calls
 * Run: npx tsx scripts/seed-cloud.ts
 */

const BASE_URL = "https://staging-tinycdp-s3b2.encr.app";
const API_KEY = "uykXSMQkHIerkcmRcJ4sJYTxhQEKycfY"; // Your admin key

const headers = {
  "Authorization": `Bearer ${API_KEY}`,
  "Content-Type": "application/json"
};

async function seedCloud() {
  console.log("☁️ Seeding TinyCDP cloud database...");
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`🔑 Using admin API key: ${API_KEY.substring(0, 8)}...`);
  console.log("");

  try {
    // Step 1: Create trait definitions
    console.log("1️⃣ Creating trait definitions...");
    
    const traits = [
      {
        key: "power_user",
        expression: "events.app_open.unique_days_14d >= 5"
      },
      {
        key: "recent_buyer", 
        expression: "events.purchase.count_30d >= 1 && last_seen_minutes_ago < 1440"
      },
      {
        key: "frequent_visitor",
        expression: "events.page_view.count_7d >= 10"
      },
      {
        key: "high_value_customer",
        expression: "events.purchase.sum_30d >= 100"
      },
      {
        key: "mobile_user",
        expression: "profile.device_type == \"mobile\""
      }
    ];

    for (const trait of traits) {
      const response = await fetch(`${BASE_URL}/v1/admin/traits`, {
        method: "POST",
        headers,
        body: JSON.stringify(trait)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Created trait: ${trait.key}`);
      } else {
        const error = await response.json();
        console.log(`❌ Failed to create trait ${trait.key}: ${error.message || response.statusText}`);
      }
    }

    // Step 2: Create segment definitions
    console.log("");
    console.log("2️⃣ Creating segment definitions...");
    
    const segments = [
      {
        key: "power_users",
        rule: "power_user == true"
      },
      {
        key: "recent_buyers",
        rule: "recent_buyer == true"
      },
      {
        key: "engaged_users",
        rule: "power_user == true || frequent_visitor == true"
      },
      {
        key: "vip_customers",
        rule: "high_value_customer == true && recent_buyer == true"
      },
      {
        key: "mobile_engaged",
        rule: "mobile_user == true && power_user == true"
      }
    ];

    for (const segment of segments) {
      const response = await fetch(`${BASE_URL}/v1/admin/segments`, {
        method: "POST",
        headers,
        body: JSON.stringify(segment)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Created segment: ${segment.key}`);
      } else {
        const error = await response.json();
        console.log(`❌ Failed to create segment ${segment.key}: ${error.message || response.statusText}`);
      }
    }

    // Step 3: Create flag definitions
    console.log("");
    console.log("3️⃣ Creating flag definitions...");
    
    const flags = [
      {
        key: "premium_features",
        rule: 'segment("power_users")'
      },
      {
        key: "discount_offer", 
        rule: 'segment("recent_buyers") == false'
      },
      {
        key: "vip_support",
        rule: 'segment("vip_customers")'
      },
      {
        key: "mobile_push_notifications",
        rule: 'segment("mobile_engaged")'
      },
      {
        key: "beta_features",
        rule: 'trait("power_user") == true && trait("high_value_customer") == true'
      }
    ];

    for (const flag of flags) {
      const response = await fetch(`${BASE_URL}/v1/admin/flags`, {
        method: "POST",
        headers,
        body: JSON.stringify(flag)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Created flag: ${flag.key}`);
      } else {
        const error = await response.json();
        console.log(`❌ Failed to create flag ${flag.key}: ${error.message || response.statusText}`);
      }
    }

    // Step 4: Create sample users and events
    console.log("");
    console.log("4️⃣ Creating sample users with events...");
    
    const sampleUsers = [
      {
        userId: "demo-user-power",
        traits: {
          email: "power@example.com",
          plan: "premium",
          device_type: "desktop",
          signup_date: "2024-01-15"
        },
        events: [
          { event: "app_open", count: 8 },
          { event: "purchase", count: 3, value: 150 },
          { event: "page_view", count: 25 }
        ]
      },
      {
        userId: "demo-user-mobile",
        traits: {
          email: "mobile@example.com", 
          plan: "basic",
          device_type: "mobile",
          signup_date: "2024-02-10"
        },
        events: [
          { event: "app_open", count: 12 },
          { event: "purchase", count: 1, value: 29.99 },
          { event: "page_view", count: 15 },
          { event: "click", count: 8 }
        ]
      },
      {
        userId: "demo-user-vip",
        traits: {
          email: "vip@example.com",
          plan: "enterprise", 
          device_type: "desktop",
          signup_date: "2023-12-01"
        },
        events: [
          { event: "app_open", count: 20 },
          { event: "purchase", count: 8, value: 500 },
          { event: "page_view", count: 50 },
          { event: "feature_use", count: 15 }
        ]
      }
    ];

    for (const user of sampleUsers) {
      // Create user with identify call
      const identifyResponse = await fetch(`${BASE_URL}/v1/identify`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: user.userId,
          traits: user.traits
        })
      });

      if (identifyResponse.ok) {
        console.log(`✅ Created user: ${user.userId}`);
      } else {
        const error = await identifyResponse.json();
        console.log(`❌ Failed to create user ${user.userId}: ${error.message || identifyResponse.statusText}`);
        continue;
      }

      // Create events for this user
      let eventCount = 0;
      for (const eventType of user.events) {
        for (let i = 0; i < eventType.count; i++) {
          const trackResponse = await fetch(`${BASE_URL}/v1/track`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              userId: user.userId,
              event: eventType.event,
              properties: {
                value: eventType.value || Math.round(Math.random() * 50),
                source: "seed_cloud",
                session_id: `session_${i}`
              }
            })
          });

          if (trackResponse.ok) {
            eventCount++;
          } else {
            const error = await trackResponse.json();
            console.log(`❌ Failed to track ${eventType.event} for ${user.userId}: ${error.message}`);
          }
        }
      }
      console.log(`📊 Created ${eventCount} events for ${user.userId}`);
    }

    console.log("");
    console.log("🎉 Cloud database seeded successfully!");
    console.log("");
    console.log("📊 Created:");
    console.log(`   • ${traits.length} trait definitions`);
    console.log(`   • ${segments.length} segment definitions`);
    console.log(`   • ${flags.length} flag definitions`);
    console.log(`   • ${sampleUsers.length} demo users with events`);
    console.log("");
    console.log("🌐 View your dashboard: https://staging-tinycdp-s3b2.encr.app/frontend/");
    console.log("🔑 Demo users: demo-user-power, demo-user-mobile, demo-user-vip");

  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedCloud();
