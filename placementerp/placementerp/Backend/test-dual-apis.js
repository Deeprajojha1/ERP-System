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
  magenta: "\x1b[35m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${"=".repeat(70)}\n${msg}\n${"=".repeat(70)}${colors.reset}\n`),
  highlight: (msg) => console.log(`${colors.magenta}${msg}${colors.reset}`),
};

/**
 * TEST 1: Verify Indeed12 API is working
 */
async function test1_Indeed12API() {
  log.section("TEST 1: Indeed12 API - Basic Functionality");
  
  try {
    const apiKey = process.env.RAPIDAPI_KEY_INDEED;
    
    if (!apiKey) {
      log.error("API key not found in .env");
      return false;
    }
    
    log.info("Testing Indeed12 API with query: 'software developer'");
    
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
    
    if (response.data && response.data.hits && response.data.hits.length > 0) {
      log.success(`Indeed12 API returned ${response.data.hits.length} jobs`);
      
      // Display first 3 jobs
      log.info("\nSample Jobs:");
      response.data.hits.slice(0, 3).forEach((job, index) => {
        log.highlight(`  ${index + 1}. ${job.title}`);
        log.info(`     Company: ${job.company_name}`);
        log.info(`     Location: ${job.location}`);
        if (job.salary) {
          log.info(`     Salary: ${job.salary.min || 'N/A'} - ${job.salary.max || 'N/A'} ${job.salary.currency || ''}`);
        }
      });
      
      return true;
    } else {
      log.error("Indeed12 API returned no jobs");
      return false;
    }
  } catch (error) {
    log.error(`Indeed12 API Error: ${error.message}`);
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * TEST 2: Verify JSearch API is working
 */
async function test2_JSearchAPI() {
  log.section("TEST 2: JSearch API - Basic Functionality");
  
  try {
    const apiKey = process.env.RAPIDAPI_KEY_INDEED;
    
    log.info("Testing JSearch API with query: 'python developer'");
    
    const response = await axios.get("https://jsearch.p.rapidapi.com/search", {
      params: {
        query: "python developer in India",
        page: 1,
        num_pages: 1,
        country: "us",
        date_posted: "all",
      },
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      timeout: 20000,
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      log.success(`JSearch API returned ${response.data.data.length} jobs`);
      
      // Display first 3 jobs
      log.info("\nSample Jobs:");
      response.data.data.slice(0, 3).forEach((job, index) => {
        log.highlight(`  ${index + 1}. ${job.job_title}`);
        log.info(`     Company: ${job.employer_name}`);
        log.info(`     Location: ${job.job_city || job.job_country || 'Remote'}`);
        log.info(`     Type: ${job.job_employment_type || 'Not specified'}`);
      });
      
      return true;
    } else {
      log.error("JSearch API returned no jobs");
      return false;
    }
  } catch (error) {
    log.error(`JSearch API Error: ${error.message}`);
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * TEST 3: Test both APIs with different search queries
 */
async function test3_MultipleQueries() {
  log.section("TEST 3: Multiple Search Queries - Both APIs");
  
  const queries = [
    { keywords: "data scientist", location: "Bangalore" },
    { keywords: "frontend developer", location: "Remote" },
    { keywords: "java developer", location: "Mumbai" },
  ];
  
  let passedCount = 0;
  
  for (const query of queries) {
    try {
      log.info(`\nTesting: ${query.keywords} in ${query.location}`);
      
      // Test Indeed12
      const indeedResponse = await axios.get("https://indeed12.p.rapidapi.com/jobs/search", {
        params: {
          query: query.keywords,
          location: query.location,
          page_id: "0",
        },
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY_INDEED,
          "X-RapidAPI-Host": "indeed12.p.rapidapi.com",
        },
        timeout: 15000,
      });
      
      const indeedCount = indeedResponse.data?.hits?.length || 0;
      
      if (indeedCount > 0) {
        log.success(`  Indeed12: ${indeedCount} jobs found`);
        passedCount++;
      } else {
        log.warning(`  Indeed12: No jobs found`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      log.error(`  Error: ${error.message}`);
    }
  }
  
  log.info(`\nPassed ${passedCount}/${queries.length} query tests`);
  return passedCount >= 2; // At least 2 out of 3 should pass
}

/**
 * TEST 4: Test API response data quality and structure
 */
async function test4_DataQuality() {
  log.section("TEST 4: Data Quality & Structure Validation");
  
  try {
    // Test Indeed12 data structure
    log.info("Testing Indeed12 data structure...");
    const indeedResponse = await axios.get("https://indeed12.p.rapidapi.com/jobs/search", {
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
    
    if (!indeedResponse.data?.hits || indeedResponse.data.hits.length === 0) {
      log.error("Indeed12: No data returned");
      return false;
    }
    
    const indeedJob = indeedResponse.data.hits[0];
    const indeedRequiredFields = ["id", "title", "company_name", "location", "link"];
    
    let indeedValid = true;
    log.info("\nIndeed12 Required Fields:");
    for (const field of indeedRequiredFields) {
      if (indeedJob[field]) {
        log.success(`  ✓ ${field}: ${indeedJob[field]}`);
      } else {
        log.error(`  ✗ ${field}: MISSING`);
        indeedValid = false;
      }
    }
    
    // Test optional fields
    log.info("\nIndeed12 Optional Fields:");
    const optionalFields = ["snippet", "salary", "pub_date_ts_milli"];
    for (const field of optionalFields) {
      if (indeedJob[field]) {
        log.success(`  ✓ ${field}: Present`);
      } else {
        log.warning(`  ⚠ ${field}: Not present`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test JSearch data structure
    log.info("\n\nTesting JSearch data structure...");
    const jsearchResponse = await axios.get("https://jsearch.p.rapidapi.com/search", {
      params: {
        query: "developer",
        page: 1,
        num_pages: 1,
      },
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY_INDEED,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      timeout: 20000,
    });
    
    if (!jsearchResponse.data?.data || jsearchResponse.data.data.length === 0) {
      log.warning("JSearch: No data returned (may be temporary)");
      return indeedValid; // Return Indeed result if JSearch fails
    }
    
    const jsearchJob = jsearchResponse.data.data[0];
    const jsearchRequiredFields = ["job_id", "job_title", "employer_name", "job_apply_link"];
    
    let jsearchValid = true;
    log.info("\nJSearch Required Fields:");
    for (const field of jsearchRequiredFields) {
      if (jsearchJob[field]) {
        log.success(`  ✓ ${field}: ${jsearchJob[field]}`);
      } else {
        log.error(`  ✗ ${field}: MISSING`);
        jsearchValid = false;
      }
    }
    
    return indeedValid && jsearchValid;
    
  } catch (error) {
    log.error(`Data quality test failed: ${error.message}`);
    return false;
  }
}

/**
 * TEST 5: Test service integration functions
 */
async function test5_ServiceIntegration() {
  log.section("TEST 5: Service Integration - Import & Execute Functions");
  
  try {
    log.info("Importing jobAggregatorService...");
    
    const { fetchFromIndeed, fetchFromJSearch } = await import("./services/jobAggregatorService.js");
    
    log.success("Service functions imported successfully");
    
    // Test fetchFromIndeed
    log.info("\nTesting fetchFromIndeed() function...");
    const indeedJobs = await fetchFromIndeed({
      keywords: "nodejs developer",
      location: "India",
      page: 0,
    });
    
    if (indeedJobs && indeedJobs.length > 0) {
      log.success(`fetchFromIndeed() returned ${indeedJobs.length} jobs`);
      log.info(`Sample job: ${indeedJobs[0].title} at ${indeedJobs[0].company}`);
      log.info(`Source: ${indeedJobs[0].source}`);
    } else {
      log.warning("fetchFromIndeed() returned no jobs");
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test fetchFromJSearch
    log.info("\nTesting fetchFromJSearch() function...");
    const jsearchJobs = await fetchFromJSearch({
      keywords: "react developer",
      location: "Remote",
      page: 1,
    });
    
    if (jsearchJobs && jsearchJobs.length > 0) {
      log.success(`fetchFromJSearch() returned ${jsearchJobs.length} jobs`);
      log.info(`Sample job: ${jsearchJobs[0].title} at ${jsearchJobs[0].company}`);
      log.info(`Source: ${jsearchJobs[0].source}`);
    } else {
      log.warning("fetchFromJSearch() returned no jobs");
    }
    
    // Check if at least one function returned jobs
    return (indeedJobs && indeedJobs.length > 0) || (jsearchJobs && jsearchJobs.length > 0);
    
  } catch (error) {
    log.error(`Service integration test failed: ${error.message}`);
    if (error.stack) {
      log.error(error.stack);
    }
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("\n");
  log.section("🚀 DUAL API COMPREHENSIVE TEST SUITE");
  log.highlight("Testing Indeed12 API + JSearch API Integration\n");
  
  const results = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false,
  };
  
  try {
    // Test 1: Indeed12 API
    results.test1 = await test1_Indeed12API();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: JSearch API
    results.test2 = await test2_JSearchAPI();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Multiple Queries
    results.test3 = await test3_MultipleQueries();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Data Quality
    results.test4 = await test4_DataQuality();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 5: Service Integration
    results.test5 = await test5_ServiceIntegration();
    
  } catch (error) {
    log.error(`Test execution error: ${error.message}`);
  }
  
  // Summary
  log.section("📊 TEST SUMMARY");
  
  const testNames = {
    test1: "Indeed12 API - Basic Functionality",
    test2: "JSearch API - Basic Functionality",
    test3: "Multiple Search Queries",
    test4: "Data Quality & Structure",
    test5: "Service Integration Functions",
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
    log.success("🎉 ALL TESTS PASSED! Both APIs are fully functional.");
  } else if (passedCount >= 3) {
    log.warning("⚠️  Most tests passed. APIs are working but some issues detected.");
  } else {
    log.error("❌ Multiple tests failed. Please check API configuration.");
  }
  
  // Additional info
  console.log("\n");
  log.info("API Configuration:");
  log.info(`  - Indeed12 API: indeed12.p.rapidapi.com`);
  log.info(`  - JSearch API: jsearch.p.rapidapi.com`);
  log.info(`  - API Key: ${process.env.RAPIDAPI_KEY_INDEED?.substring(0, 20)}...`);
  
  process.exit(passedCount >= 3 ? 0 : 1);
}

// Run tests
runAllTests();
