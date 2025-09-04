#!/usr/bin/env npx tsx

/**
 * Test the SDK examples against live TinyCDP deployment
 * This simulates SDK functionality using direct HTTP calls
 * 
 * Run: npx tsx examples/test-sdk-example.ts
 */

const BASE_URL = "https://staging-tinycdp-s3b2.encr.app";

// Using your actual API keys
const API_KEYS = {
  admin: "uykXSMQkHIerkcmRcJ4sJYTxhQEKycfY",
  write: "9X32xyFBpzfVe8kXChVcrYzD3BvMUTVq",
  read: "ux0X8YZcKEkKn2MhHRDlN1gRX7EYJ97c"
};

// Simulate SDK client for testing
class MockTinyCDPClient {
  constructor(
    private endpoint: string,
    private writeKey: string,
    private readKey: string
  ) {}

  async identify(params: { userId: string; traits: Record<string, any> }) {
    const response = await fetch(`${this.endpoint}/v1/identify`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.writeKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: params.userId,
        traits: params.traits
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Identify failed: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  track(params: { userId: string; event: string; properties?: Record<string, any> }) {
    // In the real SDK, this would be batched. For testing, we'll make immediate calls.
    return fetch(`${this.endpoint}/v1/track`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.writeKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: params.userId,
        event: params.event,
        props: params.properties || {}
      })
    }).then(response => {
      if (!response.ok) {
        throw new Error(`Track failed: ${response.statusText}`);
      }
      return response.json();
    });
  }

  async decide(params: { userId: string; flag: string }) {
    const url = `${this.endpoint}/v1/decide?userId=${encodeURIComponent(params.userId)}&flag=${encodeURIComponent(params.flag)}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${this.readKey}`,
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Decide failed: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async flush() {
    // In the real SDK, this would flush the batch queue
    console.log("📤 Flush called (simulated)");
    return Promise.resolve();
  }

  destroy() {
    console.log("🧹 Client destroyed (simulated)");
  }
}

// Initialize mock client
const tinycdp = new MockTinyCDPClient(BASE_URL, API_KEYS.write, API_KEYS.read);

// =============================================================================
// TEST FUNCTIONS (Based on SDK examples)
// =============================================================================

async function testUserIdentification() {
  console.log("\n👤 Testing User Identification...");
  
  try {
    const userId = `test-sdk-user-${Date.now()}`;
    
    await tinycdp.identify({
      userId: userId,
      traits: {
        email: "sdk-test@example.com",
        plan: "premium",
        signup_date: new Date().toISOString(),
        device_type: "desktop",
        test_run: true
      }
    });
    
    console.log(`✅ User identified successfully: ${userId}`);
    return userId;
  } catch (error) {
    console.error("❌ User identification failed:", error);
    throw error;
  }
}

async function testEventTracking(userId: string) {
  console.log("\n📊 Testing Event Tracking...");
  
  try {
    // Track multiple events
    const events = [
      { event: "page_view", properties: { page: "/dashboard", source: "sdk_test" } },
      { event: "button_clicked", properties: { button: "premium_upgrade", source: "sdk_test" } },
      { event: "feature_used", properties: { feature: "export_data", source: "sdk_test" } }
    ];
    
    for (const eventData of events) {
      await tinycdp.track({
        userId: userId,
        event: eventData.event,
        properties: eventData.properties
      });
      console.log(`✅ Tracked: ${eventData.event}`);
    }
    
    console.log(`✅ All ${events.length} events tracked successfully`);
  } catch (error) {
    console.error("❌ Event tracking failed:", error);
    throw error;
  }
}

async function testFeatureFlags(userId: string) {
  console.log("\n🏳️ Testing Feature Flags...");
  
  try {
    // Test existing flags from seed data
    const flags = ["premium_features", "discount_offer", "vip_support", "mobile_push_notifications"];
    
    for (const flag of flags) {
      try {
        const decision = await tinycdp.decide({
          userId: userId,
          flag: flag
        });
        
        console.log(`✅ Flag '${flag}': ${decision.allow ? '🟢 ENABLED' : '🔴 DISABLED'}${decision.variant ? ` (${decision.variant})` : ''}`);
      } catch (error) {
        console.log(`⚠️ Flag '${flag}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log("✅ Feature flag testing completed");
  } catch (error) {
    console.error("❌ Feature flag testing failed:", error);
    throw error;
  }
}

async function testUserLifecyclePattern(userId: string) {
  console.log("\n🔄 Testing User Lifecycle Pattern...");
  
  try {
    // Simulate a user journey
    console.log("  📝 Simulating user signup flow...");
    await tinycdp.identify({
      userId: userId,
      traits: {
        email: "lifecycle-test@example.com",
        plan: "basic",
        signup_date: new Date().toISOString(),
        onboarding_step: "welcome"
      }
    });
    
    await tinycdp.track({
      userId: userId,
      event: "user_signed_up",
      properties: { source: "sdk_test", plan: "basic" }
    });
    
    console.log("  🔑 Simulating login...");
    await tinycdp.track({
      userId: userId,
      event: "user_logged_in",
      properties: { login_method: "email" }
    });
    
    console.log("  🛒 Simulating purchase...");
    await tinycdp.identify({
      userId: userId,
      traits: {
        plan: "premium", // Upgrade to premium
        last_purchase_date: new Date().toISOString(),
        total_spent: 99.99
      }
    });
    
    await tinycdp.track({
      userId: userId,
      event: "purchase_completed",
      properties: {
        amount: 99.99,
        currency: "USD",
        plan: "premium"
      }
    });
    
    console.log("✅ User lifecycle simulation completed");
  } catch (error) {
    console.error("❌ User lifecycle testing failed:", error);
    throw error;
  }
}

async function testDecisionPattern(userId: string) {
  console.log("\n🎯 Testing Decision Patterns...");
  
  try {
    console.log("  🔍 Testing shouldShowPremiumFeatures pattern...");
    const decision = await tinycdp.decide({
      userId: userId,
      flag: "premium_features"
    });
    
    // Track that we checked the flag (analytics pattern)
    await tinycdp.track({
      userId: userId,
      event: "feature_flag_checked",
      properties: {
        flag: "premium_features",
        result: decision.allow,
        variant: decision.variant
      }
    });
    
    if (decision.allow) {
      console.log("  ✅ Premium features enabled - user should see premium UI");
      
      // Track premium feature usage
      await tinycdp.track({
        userId: userId,
        event: "premium_feature_accessed",
        properties: { feature: "advanced_analytics" }
      });
    } else {
      console.log("  ℹ️ Premium features disabled - user sees basic UI");
    }
    
    console.log("✅ Decision pattern testing completed");
  } catch (error) {
    console.error("❌ Decision pattern testing failed:", error);
    throw error;
  }
}

async function testErrorHandling() {
  console.log("\n🚨 Testing Error Handling...");
  
  try {
    // Test invalid flag
    console.log("  🧪 Testing non-existent flag...");
    try {
      await tinycdp.decide({
        userId: "test-user",
        flag: "non_existent_flag"
      });
      console.log("  ⚠️ Expected error for non-existent flag, but got success");
    } catch (error) {
      console.log("  ✅ Correctly handled non-existent flag error");
    }
    
    // Test invalid user ID
    console.log("  🧪 Testing empty user ID...");
    try {
      await tinycdp.decide({
        userId: "",
        flag: "premium_features"
      });
      console.log("  ⚠️ Expected error for empty user ID, but got success");
    } catch (error) {
      console.log("  ✅ Correctly handled empty user ID error");
    }
    
    console.log("✅ Error handling tests completed");
  } catch (error) {
    console.error("❌ Error handling tests failed:", error);
    throw error;
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runSDKTests() {
  console.log("🧪 TinyCDP SDK Example Testing");
  console.log("==============================");
  console.log(`🌐 Testing against: ${BASE_URL}`);
  console.log(`🔑 Write Key: ${API_KEYS.write.substring(0, 8)}...`);
  console.log(`🔑 Read Key: ${API_KEYS.read.substring(0, 8)}...`);
  
  let userId: string;
  
  try {
    // Run tests in sequence
    userId = await testUserIdentification();
    await testEventTracking(userId);
    await testFeatureFlags(userId);
    await testUserLifecyclePattern(userId);
    await testDecisionPattern(userId);
    await testErrorHandling();
    
    // Simulate SDK cleanup
    await tinycdp.flush();
    tinycdp.destroy();
    
    console.log("\n🎉 All SDK tests completed successfully!");
    console.log(`👤 Test user created: ${userId}`);
    console.log("📊 Check the dashboard to see the tracked events:");
    console.log("   https://staging-tinycdp-s3b2.encr.app/frontend/");
    console.log("🔍 Search for your test user in the Users section");
    
  } catch (error) {
    console.error("\n💥 SDK tests failed:", error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
runSDKTests();
