import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${"=".repeat(60)}\n${msg}\n${"=".repeat(60)}${colors.reset}\n`),
};

/**
 * Test 1: Verify API Keys are loaded from .env
 */
async function test1_VerifyAPIKeys() {
  log.section("TEST 1: Verify API Keys Configuration");
  
  const indeedKey = process.env.RAPIDAPI_KEY_INDEED;
  
  if (!indeedKey) {
    log.error("Indeed API key not found in .env");
    return false;
  }
  
  log.success(`Indeed API Key: ${indeedKey.substring(0, 20)}...`);
  
  return true;
}

/**
 * Test 2: Test Indeed API with basic query
 */
async function test2_TestIndeedAPI() {
  log.section("TEST 2: Test Indeed API - Basic Query");
  
  try {
    const apiKey = process.env.RAPIDAPI_KEY_INDEED;
    
    const response = await axios.get("https://indeed12.p.rapidapi.com/jobs/search", {
      params: {
        query: "software developer",
        location: "India",
        page_id: "0",
      },
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "indeed12.p.rapidapi.com",
      },
      timeout: 15000,
    });
    
    if (response.data && response.data.hits) {
      log.success(`Indeed API returned ${response.data.hits.length} jobs`);
      
      if (response.data.hits.length > 0) {
        const firstJob = response.data.hits[0];
        log.info(`Sample Job: ${firstJob.title} at ${firstJob.company_name || firstJob.company}`);
        log.info(`Location: ${firstJob.location}`);
      }
      
      return true;
    } else {
      log.error("Indeed API returned no data");
      return false;
    }
  } catch (error) {
    log.error(`Indeed API Error: ${error.message}`);
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * Test 3: Test Indeed API with different location
 */
async function test3_TestIndeedDifferentLocation() {
  log.section("TEST 3: Test Indeed API - Different Location");
  
  try {
    const apiKey = process.env.RAPIDAPI_KEY_INDEED;
    
    const response = await axios.get("https://indeed12.p.rapidapi.com/jobs/search", {
      params: {
        query: "python developer",
        location: "Mumbai, India",
        page_id: "0",
      },
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "indeed12.p.rapidapi.com",
      },
      timeout: 15000,
    });
    
    if (response.data && response.data.hits) {
      log.success(`Indeed API returned ${response.data.hits.length} jobs`);
      
      if (response.data.hits.length > 0) {
        const firstJob = response.data.hits[0];
        log.info(`Sample Job: ${firstJob.title} at ${firstJob.company_name || firstJob.company}`);
        log.info(`Location: ${firstJob.location}`);
      }
      
      return true;
    } else {
      log.error("Indeed API returned no data");
      return false;
    }
  } catch (error) {
    log.error(`Indeed API Error: ${error.message}`);
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * Test 4: Test with different search parameters
 */
async function test4_TestDifferentParameters() {
  log.section("TEST 4: Test Different Search Parameters");
  
  const testCases = [
    { query: "data scientist", location: "Bangalore, India", description: "Data Science Jobs" },
    { query: "frontend developer", location: "Remote", description: "Remote Frontend Jobs" },
    { query: "java developer", location: "Delhi, India", description: "Java Developer Jobs" },
  ];
  
  let passedTests = 0;
  
  for (const testCase of testCases) {
    try {
      log.info(`Testing: ${testCase.description}`);
      
      const response = await axios.get("https://indeed12.p.rapidapi.com/jobs/search", {
        params: {
          query: testCase.query,
          location: testCase.location,
          page_id: "0",
        },
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY_INDEED,
          "X-RapidAPI-Host": "indeed12.p.rapidapi.com",
        },
        timeout: 15000,
      });
      
      if (response.data && response.data.hits && response.data.hits.length > 0) {
        log.success(`${testCase.description}: Found ${response.data.hits.length} jobs`);
        passedTests++;
      } else {
        log.warning(`${testCase.description}: No jobs found`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      log.error(`${testCase.description}: ${error.message}`);
    }
  }
  
  log.info(`Passed ${passedTests}/${testCases.length} parameter tests`);
  return passedTests > 0;
}

/**
 * Test 5: Test API response structure and data quality
 */
async function test5_TestResponseStructure() {
  log.section("TEST 5: Test API Response Structure & Data Quality");
  
  try {
    const response = await axios.get("https://indeed12.p.rapidapi.com/jobs/search", {
      params: {
        query: "software engineer",
        location: "India",
        page_id: "0",
      },
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY_INDEED,
        "X-RapidAPI-Host": "indeed12.p.rapidapi.com",
      },
      timeout: 15000,
    });
    
    if (!response.data || !response.data.hits || response.data.hits.length === 0) {
      log.error("No data returned from API");
      return false;
    }
    
    const job = response.data.hits[0];
    const requiredFields = [
      "id",
      "title",
      "company_name",
      "description",
      "link",
    ];
    
    let allFieldsPresent = true;
    
    for (const field of requiredFields) {
      if (job[field]) {
        log.success(`Field '${field}' is present`);
      } else {
        log.error(`Field '${field}' is missing`);
        allFieldsPresent = false;
      }
    }
    
    // Check optional but important fields
    const optionalFields = [
      "location",
      "job_type",
      "company_logo",
      "pub_date_ts_milli",
      "salary",
    ];
    
    log.info("\nOptional fields:");
    for (const field of optionalFields) {
      if (job[field]) {
        log.success(`Field '${field}' is present`);
      } else {
        log.warning(`Field '${field}' is missing`);
      }
    }
    
    // Display sample job data
    log.info("\nSample Job Data:");
    log.info(`Title: ${job.title}`);
    log.info(`Company: ${job.company_name || job.company}`);
    log.info(`Location: ${job.location || "Not specified"}`);
    log.info(`Type: ${job.job_type || "Not specified"}`);
    log.info(`Apply URL: ${job.link}`);
    
    return allFieldsPresent;
  } catch (error) {
    log.error(`Response structure test failed: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("\n");
  log.section("🚀 STARTING API KEY TESTS");
  
  const results = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false,
  };
  
  try {
    results.test1 = await test1_VerifyAPIKeys();
    
    if (results.test1) {
      results.test2 = await test2_TestIndeedAPI();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      results.test3 = await test3_TestIndeedDifferentLocation();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      results.test4 = await test4_TestDifferentParameters();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      results.test5 = await test5_TestResponseStructure();
      
      // Bonus: Test JSearch API
      log.section("BONUS TEST: JSearch API");
      try {
        const jsearchResponse = await axios.get("https://jsearch.p.rapidapi.com/search", {
          params: {
            query: "developer jobs in chicago",
            page: 1,
            num_pages: 1,
            country: "us",
            date_posted: "all",
          },
          headers: {
            "X-RapidAPI-Key": process.env.RAPIDAPI_KEY_INDEED,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
          },
          timeout: 15000,
        });
        
        if (jsearchResponse.data && jsearchResponse.data.data) {
          log.success(`JSearch API returned ${jsearchResponse.data.data.length} jobs`);
          if (jsearchResponse.data.data.length > 0) {
            const job = jsearchResponse.data.data[0];
            log.info(`Sample: ${job.job_title} at ${job.employer_name}`);
          }
        }
      } catch (error) {
        log.warning(`JSearch API: ${error.message}`);
      }
    }
  } catch (error) {
    log.error(`Test execution error: ${error.message}`);
  }
  
  // Summary
  log.section("📊 TEST SUMMARY");
  
  const testNames = {
    test1: "API Keys Configuration",
    test2: "Indeed API Basic Query",
    test3: "Indeed API Different Location",
    test4: "Different Search Parameters",
    test5: "Response Structure & Data Quality",
  };
  
  let passedCount = 0;
  
  for (const [key, value] of Object.entries(results)) {
    if (value) {
      log.success(`${testNames[key]}: PASSED`);
      passedCount++;
    } else {
      log.error(`${testNames[key]}: FAILED`);
    }
  }
  
  console.log("\n");
  log.section(`FINAL RESULT: ${passedCount}/5 Tests Passed`);
  
  if (passedCount === 5) {
    log.success("🎉 All tests passed! APIs are working correctly.");
  } else if (passedCount >= 3) {
    log.warning("⚠️  Some tests failed. Check the errors above.");
  } else {
    log.error("❌ Most tests failed. Please check your API keys and configuration.");
  }
  
  process.exit(passedCount === 5 ? 0 : 1);
}

// Run tests
runAllTests();
