/**
 * Test LinkedIn & Indeed Integration via JSearch API
 */

import dotenv from "dotenv";
import { fetchFromJSearch } from "./services/jobAggregatorService.js";

dotenv.config();

const testLinkedInIndeed = async () => {
  console.log("🧪 Testing LinkedIn & Indeed Integration\n");
  console.log("=" .repeat(60));
  console.log("RapidAPI Key:", process.env.RAPIDAPI_KEY ? "✅ Found" : "❌ Not Found");
  console.log("=" .repeat(60));

  // Test 1: Fetch jobs from India
  console.log("\n📋 TEST 1: Fetch Jobs from India");
  console.log("-".repeat(60));
  try {
    const jobs = await fetchFromJSearch({
      keywords: "software developer",
      location: "India",
      page: 1,
    });

    if (jobs && jobs.length > 0) {
      console.log("✅ SUCCESS");
      console.log(`   Jobs fetched: ${jobs.length}`);
      console.log("\n   Sample Jobs:");
      
      jobs.slice(0, 5).forEach((job, index) => {
        console.log(`\n   ${index + 1}. ${job.title}`);
        console.log(`      Company: ${job.company}`);
        console.log(`      Location: ${job.location}`);
        console.log(`      Source: ${job.source}`);
        console.log(`      Job Type: ${job.jobType}`);
        if (job.salary?.min) {
          console.log(`      Salary: ${job.salary.currency} ${job.salary.min} - ${job.salary.max}`);
        }
        console.log(`      URL: ${job.url?.substring(0, 60)}...`);
      });

      // Check which platforms the jobs are from
      const platforms = {};
      jobs.forEach((job) => {
        const url = job.url?.toLowerCase() || "";
        if (url.includes("linkedin")) platforms.LinkedIn = (platforms.LinkedIn || 0) + 1;
        if (url.includes("indeed")) platforms.Indeed = (platforms.Indeed || 0) + 1;
        if (url.includes("glassdoor")) platforms.Glassdoor = (platforms.Glassdoor || 0) + 1;
        if (url.includes("naukri")) platforms.Naukri = (platforms.Naukri || 0) + 1;
      });

      console.log("\n   Jobs by Platform:");
      Object.entries(platforms).forEach(([platform, count]) => {
        console.log(`     - ${platform}: ${count} jobs`);
      });

      console.log("\n   ✅ LinkedIn/Indeed integration is WORKING!");
    } else {
      console.log("⚠️  No jobs returned");
      console.log("   This might mean:");
      console.log("   - API key is invalid");
      console.log("   - API quota exceeded");
      console.log("   - Network issue");
    }
  } catch (error) {
    console.log("❌ FAILED:", error.message);
    if (error.response) {
      console.log("   Status:", error.response.status);
      console.log("   Error:", error.response.data);
    }
  }

  // Test 2: Search for specific role
  console.log("\n📋 TEST 2: Search for React Developer");
  console.log("-".repeat(60));
  try {
    const jobs = await fetchFromJSearch({
      keywords: "react developer",
      location: "Bangalore",
      page: 1,
    });

    if (jobs && jobs.length > 0) {
      console.log("✅ SUCCESS");
      console.log(`   Jobs fetched: ${jobs.length}`);
      console.log(`   Sample: ${jobs[0].title} at ${jobs[0].company}`);
    } else {
      console.log("⚠️  No jobs returned");
    }
  } catch (error) {
    console.log("❌ FAILED:", error.message);
  }

  // Test 3: Remote jobs
  console.log("\n📋 TEST 3: Search for Remote Jobs");
  console.log("-".repeat(60));
  try {
    const jobs = await fetchFromJSearch({
      keywords: "software engineer remote",
      location: "India",
      page: 1,
    });

    if (jobs && jobs.length > 0) {
      console.log("✅ SUCCESS");
      console.log(`   Remote jobs fetched: ${jobs.length}`);
      const remoteJobs = jobs.filter((j) => j.isRemote || j.location?.toLowerCase().includes("remote"));
      console.log(`   Confirmed remote: ${remoteJobs.length}`);
    } else {
      console.log("⚠️  No jobs returned");
    }
  } catch (error) {
    console.log("❌ FAILED:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Testing Complete!");
  console.log("=".repeat(60));
};

testLinkedInIndeed().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
