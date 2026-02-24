import axios from "axios";

/**
 * Job Aggregator Service
 * Fetches jobs from multiple external job portals
 */

/* ================= EXTERNAL JOB SOURCES ================= */

/**
 * Fetch jobs from Adzuna API (Free API)
 * https://developer.adzuna.com/
 */
export const fetchFromAdzuna = async (filters = {}) => {
  try {
    const { keywords = "software developer", location = "India", page = 1 } = filters;
    
    // You need to register at https://developer.adzuna.com/ to get API keys
    const appId = process.env.ADZUNA_APP_ID || "your_app_id";
    const appKey = process.env.ADZUNA_APP_KEY || "your_app_key";
    
    const url = `https://api.adzuna.com/v1/api/jobs/in/search/${page}`;
    
    const response = await axios.get(url, {
      params: {
        app_id: appId,
        app_key: appKey,
        what: keywords,
        where: location,
        results_per_page: 20,
        "content-type": "application/json",
      },
      timeout: 10000,
    });

    if (response.data && response.data.results) {
      return response.data.results.map((job) => ({
        source: "Adzuna",
        externalId: job.id,
        title: job.title,
        company: job.company?.display_name || "Not specified",
        description: job.description,
        location: job.location?.display_name || location,
        salary: {
          min: job.salary_min,
          max: job.salary_max,
          currency: "INR",
        },
        url: job.redirect_url,
        postedDate: job.created,
        jobType: job.contract_type || "full-time",
        category: job.category?.label || "General",
      }));
    }

    return [];
  } catch (error) {
    console.error("[Adzuna] Error fetching jobs:", error.message);
    return [];
  }
};

/**
 * Fetch jobs from The Muse API (Free API)
 * https://www.themuse.com/developers/api/v2
 */
export const fetchFromTheMuse = async (filters = {}) => {
  try {
    const { keywords = "software", location = "Flexible / Remote", page = 0 } = filters;
    
    const url = "https://www.themuse.com/api/public/jobs";
    
    const response = await axios.get(url, {
      params: {
        page: page,
        descending: true,
      },
      timeout: 10000,
    });

    if (response.data && response.data.results) {
      return response.data.results.map((job) => ({
        source: "The Muse",
        externalId: job.id,
        title: job.name,
        company: job.company?.name || "Not specified",
        description: job.contents,
        location: job.locations?.map((loc) => loc.name).join(", ") || "Remote",
        url: job.refs?.landing_page,
        postedDate: job.publication_date,
        jobType: job.type || "full-time",
        category: job.categories?.map((cat) => cat.name).join(", ") || "General",
        companyLogo: job.company?.refs?.logo_image,
      }));
    }

    return [];
  } catch (error) {
    console.error("[The Muse] Error fetching jobs:", error.message);
    return [];
  }
};

/**
 * Fetch jobs from GitHub Jobs API Alternative (Remotive)
 * https://remotive.com/api
 */
export const fetchFromRemotive = async (filters = {}) => {
  try {
    const { keywords = "software" } = filters;
    
    const url = "https://remotive.com/api/remote-jobs";
    
    const response = await axios.get(url, {
      params: {
        category: keywords,
        limit: 20,
      },
      timeout: 10000,
    });

    if (response.data && response.data.jobs) {
      return response.data.jobs.map((job) => ({
        source: "Remotive",
        externalId: job.id,
        title: job.title,
        company: job.company_name,
        description: job.description,
        location: "Remote",
        url: job.url,
        postedDate: job.publication_date,
        jobType: job.job_type || "full-time",
        category: job.category,
        companyLogo: job.company_logo,
        tags: job.tags || [],
      }));
    }

    return [];
  } catch (error) {
    console.error("[Remotive] Error fetching jobs:", error.message);
    return [];
  }
};

/**
 * Fetch jobs from Indeed via RapidAPI (Indeed12 API)
 */
export const fetchFromIndeed = async (filters = {}) => {
  try {
    const { keywords = "software developer", location = "us", page = 0 } = filters;
    
    const rapidApiKey = process.env.RAPIDAPI_KEY_INDEED || "your_rapidapi_key";
    
    // Indeed12 API uses search endpoint
    const url = "https://indeed12.p.rapidapi.com/jobs/search";
    
    const response = await axios.get(url, {
      params: {
        query: keywords,
        location: location,
        page_id: page.toString(),
      },
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "indeed12.p.rapidapi.com",
      },
      timeout: 10000,
    });

    if (response.data && response.data.hits) {
      return response.data.hits.map((job) => ({
        source: "Indeed",
        externalId: job.id || job.job_id,
        title: job.title,
        company: job.company_name || job.company,
        description: job.snippet || job.description || "No description available",
        location: job.location || location,
        salary: job.salary ? {
          min: job.salary.min,
          max: job.salary.max,
          currency: job.salary.currency || "USD",
        } : null,
        url: job.link || job.url,
        postedDate: job.pub_date_ts_milli || job.date,
        jobType: job.job_type || "full-time",
        companyLogo: job.company_logo,
        isRemote: job.is_remote || false,
      }));
    }

    return [];
  } catch (error) {
    console.error("[Indeed] Error fetching jobs:", error.message);
    if (error.response) {
      console.error("[Indeed] Status:", error.response.status);
      console.error("[Indeed] Response:", error.response.data);
    }
    return [];
  }
};

/**
 * Fetch jobs from JSearch API (RapidAPI) - LinkedIn, Glassdoor, etc.
 */
export const fetchFromJSearch = async (filters = {}) => {
  try {
    const { keywords = "software developer", location = "India", page = 1 } = filters;
    
    const rapidApiKey = process.env.RAPIDAPI_KEY_INDEED || "your_rapidapi_key";
    
    const url = "https://jsearch.p.rapidapi.com/search";
    
    const response = await axios.get(url, {
      params: {
        query: `${keywords} in ${location}`,
        page: page,
        num_pages: 1,
        country: "us",
        date_posted: "all",
      },
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      timeout: 10000,
    });

    if (response.data && response.data.data) {
      return response.data.data.map((job) => ({
        source: "JSearch",
        externalId: job.job_id,
        title: job.job_title,
        company: job.employer_name,
        description: job.job_description,
        location: job.job_city || job.job_country || location,
        salary: {
          min: job.job_min_salary,
          max: job.job_max_salary,
          currency: job.job_salary_currency || "USD",
        },
        url: job.job_apply_link,
        postedDate: job.job_posted_at_datetime_utc,
        jobType: job.job_employment_type || "FULLTIME",
        companyLogo: job.employer_logo,
        isRemote: job.job_is_remote,
      }));
    }

    return [];
  } catch (error) {
    console.error("[JSearch] Error fetching jobs:", error.message);
    if (error.response) {
      console.error("[JSearch] Status:", error.response.status);
      console.error("[JSearch] Response:", error.response.data);
    }
    return [];
  }
};

/**
 * Web Scraping fallback for LinkedIn, Naukri, Indeed
 * Note: Web scraping should be done carefully and respect robots.txt
 */
export const fetchFromWebScraping = async (filters = {}) => {
  try {
    // This is a placeholder for web scraping implementation
    // You would need to use libraries like Puppeteer or Cheerio
    // and respect the terms of service of each website
    
    console.log("[Web Scraping] Not implemented yet. Use API sources instead.");
    return [];
  } catch (error) {
    console.error("[Web Scraping] Error:", error.message);
    return [];
  }
};

/* ================= AGGREGATOR FUNCTIONS ================= */

/**
 * Fetch jobs from all sources
 */
export const aggregateJobsFromAllSources = async (filters = {}) => {
  try {
    console.log("[Job Aggregator] Fetching jobs from all sources...");
    
    // Fetch from all sources in parallel
    const [adzunaJobs, museJobs, remotiveJobs, indeedJobs, jsearchJobs] = await Promise.allSettled([
      fetchFromAdzuna(filters),
      fetchFromTheMuse(filters),
      fetchFromRemotive(filters),
      fetchFromIndeed(filters),
      fetchFromJSearch(filters),
    ]);

    // Combine all results
    const allJobs = [];
    
    if (adzunaJobs.status === "fulfilled") {
      allJobs.push(...adzunaJobs.value);
    }
    
    if (museJobs.status === "fulfilled") {
      allJobs.push(...museJobs.value);
    }
    
    if (remotiveJobs.status === "fulfilled") {
      allJobs.push(...remotiveJobs.value);
    }
    
    if (indeedJobs.status === "fulfilled") {
      allJobs.push(...indeedJobs.value);
    }
    
    if (jsearchJobs.status === "fulfilled") {
      allJobs.push(...jsearchJobs.value);
    }

    console.log(`[Job Aggregator] Fetched ${allJobs.length} jobs from external sources`);
    
    return allJobs;
  } catch (error) {
    console.error("[Job Aggregator] Error:", error.message);
    return [];
  }
};

/**
 * Fetch jobs from specific source
 */
export const fetchJobsFromSource = async (source, filters = {}) => {
  switch (source.toLowerCase()) {
    case "adzuna":
      return await fetchFromAdzuna(filters);
    case "themuse":
    case "muse":
      return await fetchFromTheMuse(filters);
    case "remotive":
      return await fetchFromRemotive(filters);
    case "indeed":
      return await fetchFromIndeed(filters);
    case "jsearch":
      return await fetchFromJSearch(filters);
    default:
      console.error(`[Job Aggregator] Unknown source: ${source}`);
      return [];
  }
};

/**
 * Filter and normalize external jobs
 */
export const filterExternalJobs = (jobs, studentProfile) => {
  if (!studentProfile) return jobs;

  return jobs.filter((job) => {
    // Filter by skills
    if (studentProfile.skills && studentProfile.skills.length > 0) {
      const jobText = `${job.title} ${job.description}`.toLowerCase();
      const hasMatchingSkill = studentProfile.skills.some((skill) =>
        jobText.includes(skill.toLowerCase())
      );
      if (!hasMatchingSkill) return false;
    }

    // Filter by location preference
    if (studentProfile.preferences?.preferredLocations?.length > 0) {
      const hasMatchingLocation = studentProfile.preferences.preferredLocations.some(
        (loc) => job.location?.toLowerCase().includes(loc.toLowerCase())
      );
      if (!hasMatchingLocation && !job.location?.toLowerCase().includes("remote")) {
        return false;
      }
    }

    // Filter by job type preference
    if (studentProfile.preferences?.jobTypes?.length > 0) {
      const jobType = job.jobType?.toLowerCase() || "full-time";
      const hasMatchingType = studentProfile.preferences.jobTypes.some(
        (type) => jobType.includes(type.toLowerCase())
      );
      if (!hasMatchingType) return false;
    }

    return true;
  });
};

/**
 * Normalize external job to internal format
 */
export const normalizeExternalJob = (externalJob) => {
  return {
    title: externalJob.title,
    company: {
      name: externalJob.company,
      logo: externalJob.companyLogo,
    },
    description: externalJob.description,
    location: externalJob.location,
    jobType: normalizeJobType(externalJob.jobType),
    salary: externalJob.salary,
    externalUrl: externalJob.url,
    source: externalJob.source,
    externalId: externalJob.externalId,
    postedDate: externalJob.postedDate,
    isExternal: true,
  };
};

/**
 * Normalize job type to internal format
 */
const normalizeJobType = (type) => {
  if (!type) return "full-time";
  
  const typeStr = type.toLowerCase();
  
  if (typeStr.includes("full") || typeStr === "fulltime") return "full-time";
  if (typeStr.includes("part") || typeStr === "parttime") return "part-time";
  if (typeStr.includes("intern")) return "internship";
  if (typeStr.includes("contract")) return "contract";
  
  return "full-time";
};

export default {
  aggregateJobsFromAllSources,
  fetchJobsFromSource,
  filterExternalJobs,
  normalizeExternalJob,
  fetchFromAdzuna,
  fetchFromTheMuse,
  fetchFromRemotive,
  fetchFromIndeed,
  fetchFromJSearch,
};
