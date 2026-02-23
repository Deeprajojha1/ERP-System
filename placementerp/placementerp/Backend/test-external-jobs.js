/**
 * Test External Job Aggregation
 * Tests if real data is being fetched from external sources
 */

import {
  fetchFromTheMuse,
  fetchFromRemotive,
  aggregateJobsFromAllSources,
} from "./services/jobAggregatorService.js";

const runTests = async () => {
  console.log("🧪 Testing External Job Aggregation\n");
  console.log("=" .repeat(60));

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: The Muse API
  console.log("\n📋 TEST 1: The Muse API");
  console.log("-".repeat(60));
  totalTests++;
  try {
    const museJobs = await fetchFromTheMuse({
      keywords: "software",
      location: "Remote",
      page: 0,
    });

    if (museJobs && museJobs.length > 0) {
      console.log("✅ SUCCESS");
      console.log(`   Jobs fetched: ${museJobs.length}`);
      console.log(`   Sample job: ${museJobs[0].title}`);
      console.log(`   Company: ${museJobs[0].company}`);
      console.log(`   Source: ${museJobs[0].source}`);
      console.log(`   URL: ${museJobs[0].url}`);
      passedTests++;
    } else {
      console.log("⚠️  No jobs returned (API might be down)");
    }
  } catch (error) {
    console.log("❌ FAILED:", error.message);
  }

  // Test 2: Remotive API
  console.log("\n📋 TEST 2: Remotive API");
  console.log("-".repeat(60));
  totalTests++;
  try {
    const remotiveJobs = await fetchFromRemotive({
      keywords: "software",
    });

    if (remotiveJobs && remotiveJobs.length > 0) {
      console.log("✅ SUCCESS");
      console.log(`   Jobs fetched: ${remotiveJobs.length}`);
      console.log(`   Sample job: ${remotiveJobs[0].title}`);
      console.log(`   Company: ${remotiveJobs[0].company}`);
      console.log(`   Source: ${remotiveJobs[0].source}`);
      console.log(`   Location: ${remotiveJobs[0].location}`);
      passedTests++;
    } else {
      console.log("⚠️  No jobs returned (API might be down)");
    }
  } catch (error) {
    console.log("❌ FAILED:", error.message);
  }

  // Test 3: Aggregate from all sources
  console.log("\n📋 TEST 3: Aggregate from All Sources");
  console.log("-".repeat(60));
  totalTests++;
  try {
    const allJobs = await aggregateJobsFromAllSources({
      keywords: "developer",
      location: "India",
      page: 1,
    });

    if (allJobs && allJobs.length > 0) {
      console.log("✅ SUCCESS");
      console.log(`   Total jobs fetched: ${allJobs.length}`);
      
      // Count by source
      const sources = {};
      allJobs.forEach((job) => {
        sources[job.source] = (sources[job.source] || 0) + 1;
      });
      
      console.log("   Jobs by source:");
      Object.entries(sources).forEach(([source, count]) => {
        console.log(`     - ${source}: ${count} jobs`);
      });
      
      console.log("\n   Sample jobs:");
      allJobs.slice(0, 3).forEach((job, index) => {
        console.log(`     ${index + 1}. ${job.title}`);
        console.log(`        Company: ${job.company}`);
        console.log(`        Source: ${job.source}`);
      });
      
      passedTests++;
    } else {
      console.log("⚠️  No jobs returned");
    }
  } catch (error) {
    console.log("❌ FAILED:", error.message);
  }

  // Test 4: Data Structure Validation
  console.log("\n📋 TEST 4: Data Structure Validation");
  console.log("-".repeat(60));
  totalTests++;
  try {
    const jobs = await fetchFromTheMuse({ keywords: "software" });
    
    if (jobs && jobs.length > 0) {
      const job = jobs[0];
      const requiredFields = [
        "source",
        "title",
        "company",
        "description",
        "location",
        "url",
      ];
      
      const missingFields = requiredFields.filter((field) => !job[field]);
      
      if (missingFields.length === 0) {
        console.log("✅ SUCCESS");
        console.log("   All required fields present:");
        requiredFields.forEach((field) => {
          console.log(`     ✓ ${field}: ${job[field]?.substring(0, 50)}...`);
        });
        passedTests++;
      } else {
        console.log("❌ FAILED: Missing fields:", missingFields.join(", "));
      }
    } else {
      console.log("⚠️  No jobs to validate");
    }
  } catch (error) {
    console.log("❌ FAILED:", error.message);
  }

  // Test 5: Real-time Data Verification
  console.log("\n📋 TEST 5: Real-time Data Verification");
  console.log("-".repeat(60));
  totalTests++;
  try {
    const jobs1 = await fetchFromTheMuse({ keywords: "python" });
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
    const jobs2 = await fetchFromTheMuse({ keywords: "javascript" });

    if (jobs1.length > 0 && jobs2.length > 0) {
      // Check if different keywords return different results
      const job1Titles = jobs1.map((j) => j.title).join(",");
      const job2Titles = jobs2.map((j) => j.title).join(",");
      
      if (job1Titles !== job2Titles) {
        console.log("✅ SUCCESS");
        console.log("   API returns different results for different keywords");
        console.log(`   Python jobs: ${jobs1.length}`);
        console.log(`   JavaScript jobs: ${jobs2.length}`);
        console.log("   ✓ Data is dynamic and real-time");
        passedTests++;
      } else {
        console.log("⚠️  Same results for different keywords (might be cached)");
      }
    } else {
      console.log("⚠️  Insufficient data to verify");
    }
  } catch (error) {
    console.log("❌ FAILED:", error.message);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log("\n🎉 ALL TESTS PASSED!");
    console.log("✅ External job aggregation is working correctly");
    console.log("✅ Real data is being fetched from external sources");
  } else if (passedTests > 0) {
    console.log("\n⚠️  SOME TESTS PASSED");
    console.log("Some APIs are working, others might need API keys");
  } else {
    console.log("\n❌ ALL TESTS FAILED");
    console.log("Check your internet connection and API keys");
  }
  
  console.log("\n" + "=".repeat(60));
  
  process.exit(passedTests === totalTests ? 0 : 1);
};

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
