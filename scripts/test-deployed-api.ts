#!/usr/bin/env npx tsx

/**
 * Test deployed TinyCDP API with secrets-based authentication
 * Run: npx tsx scripts/test-deployed-api.ts <API_KEY>
 */

const API_KEY = process.argv[2];
const BASE_URL = "https://staging-tinycdp-s3b2.encr.app";

if (!API_KEY) {
  console.error("❌ Please provide an API key");
  console.log("Usage: npx tsx scripts/test-deployed-api.ts <API_KEY>");
  console.log("");
  console.log("Get API keys by:");
  console.log("1. Running: npx tsx scripts/generate-secrets-keys.ts");
  console.log("2. Setting the secrets in Encore Cloud dashboard");
  console.log("3. Using one of the generated keys here");
  process.exit(1);
}

async function testAPI() {
  const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
  };

  console.log("🧪 Testing TinyCDP Deployed API");
  console.log("===============================");
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...`);
  console.log("");

  try {
    // Test health endpoint
    console.log("1️⃣ Testing health endpoint...");
    const healthResponse = await fetch(`${BASE_URL}/ingest/health`, { headers });
    const healthData = await healthResponse.json();
    console.log(`✅ Health: ${healthData.status}`);
    console.log("");

    // Test identify endpoint  
    console.log("2️⃣ Testing identify endpoint...");
    const identifyResponse = await fetch(`${BASE_URL}/v1/identify`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: "test-user-deployed",
        traits: {
          email: "test@example.com",
          plan: "premium",
          signupDate: new Date().toISOString()
        }
      })
    });

    if (identifyResponse.ok) {
      const identifyData = await identifyResponse.json();
      console.log(`✅ Identify: User ${identifyData.userId} updated`);
    } else {
      const errorData = await identifyResponse.json();
      console.log(`❌ Identify failed: ${errorData.message || identifyResponse.statusText}`);
    }
    console.log("");

    // Test track endpoint
    console.log("3️⃣ Testing track endpoint...");
    const trackResponse = await fetch(`${BASE_URL}/v1/track`, {
      method: "POST", 
      headers,
      body: JSON.stringify({
        userId: "test-user-deployed",
        event: "api_test",
        properties: {
          source: "deployment_test",
          timestamp: new Date().toISOString()
        }
      })
    });

    if (trackResponse.ok) {
      const trackData = await trackResponse.json();
      console.log(`✅ Track: Event ${trackData.eventId} recorded`);
    } else {
      const errorData = await trackResponse.json();
      console.log(`❌ Track failed: ${errorData.message || trackResponse.statusText}`);
    }
    console.log("");

    // Test decide endpoint
    console.log("4️⃣ Testing decide endpoint...");
    const decideResponse = await fetch(`${BASE_URL}/v1/decide?userId=test-user-deployed&flag=test_flag`, { 
      headers: { "Authorization": `Bearer ${API_KEY}` } 
    });

    if (decideResponse.ok) {
      const decideData = await decideResponse.json();
      console.log(`✅ Decide: Flag decisions retrieved`);
    } else {
      const errorData = await decideResponse.json();
      console.log(`❌ Decide failed: ${errorData.message || decideResponse.statusText}`);
    }

    console.log("");
    console.log("🎉 API testing completed!");
    console.log(`📊 View your web console: ${BASE_URL}/frontend/`);

  } catch (error) {
    console.error("❌ API test failed:", error);
  }
}

testAPI();
