#!/usr/bin/env npx tsx

/**
 * Seed local database via API calls (avoids Encore runtime issues)
 * Run: npx tsx scripts/seed-local.ts
 */

const BASE_URL = "http://localhost:4000";
const API_KEY = "uykXSMQkHIerkcmRcJ4sJYTxhQEKycfY"; // Your admin key

const headers = {
  "Authorization": `Bearer ${API_KEY}`,
  "Content-Type": "application/json"
};

async function seedLocal() {
  console.log("🌱 Seeding local TinyCDP database...");
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

    // Step 4: Create sample user and events
    console.log("");
    console.log("4️⃣ Creating sample user with events...");
    
    const testUserId = "test-user-local-" + Date.now();
    
    // Create user with identify call
    const identifyResponse = await fetch(`${BASE_URL}/v1/identify`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: testUserId,
        traits: {
          email: "test@example.com",
          plan: "premium",
          signupDate: new Date().toISOString()
        }
      })
    });

    if (identifyResponse.ok) {
      console.log(`✅ Created test user: ${testUserId}`);
    } else {
      const error = await identifyResponse.json();
      console.log(`❌ Failed to create user: ${error.message || identifyResponse.statusText}`);
    }

    // Create sample events
    const eventNames = ['app_open', 'purchase', 'page_view', 'click'];
    const eventCount = 20;

    console.log(`📊 Creating ${eventCount} sample events...`);
    
    for (let i = 0; i < eventCount; i++) {
      const eventName = eventNames[Math.floor(Math.random() * eventNames.length)];
      
      const trackResponse = await fetch(`${BASE_URL}/v1/track`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: testUserId,
          event: eventName,
          properties: {
            value: Math.round(Math.random() * 100),
            page: `/page${i % 5}`,
            source: "seed_script"
          }
        })
      });

      if (!trackResponse.ok) {
        const error = await trackResponse.json();
        console.log(`❌ Failed to track event ${eventName}: ${error.message || trackResponse.statusText}`);
      }
    }
    
    console.log(`✅ Created ${eventCount} sample events`);

    console.log("");
    console.log("🎉 Local database seeded successfully!");
    console.log("");
    console.log("📊 Created:");
    console.log(`   • ${traits.length} trait definitions`);
    console.log(`   • ${segments.length} segment definitions`);
    console.log(`   • ${flags.length} flag definitions`);
    console.log(`   • 1 test user with ${eventCount} events`);
    console.log("");
    console.log("🌐 View your dashboard: http://localhost:5173/");
    console.log(`🔑 Test user ID: ${testUserId}`);

  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedLocal();
