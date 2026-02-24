import crypto from "crypto";
import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || "").trim();
const GEMINI_MODEL = String(
  process.env.GEMINI_LINKEDIN_MODEL || process.env.GEMINI_MODEL || "gemini-1.5-flash"
).trim();

const MIN_CACHE_TTL_SECONDS = 300;
const MAX_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const configuredCacheTtl = Number(
  process.env.LINKEDIN_CACHE_TTL_SECONDS || DEFAULT_CACHE_TTL || 900
);

const LINKEDIN_CACHE_TTL_SECONDS = Number.isFinite(configuredCacheTtl)
  ? Math.min(MAX_CACHE_TTL_SECONDS, Math.max(MIN_CACHE_TTL_SECONDS, configuredCacheTtl))
  : 900;

const MAX_HEADLINE_LENGTH = 240;
const MAX_ABOUT_LENGTH = 6000;
const MAX_EXPERIENCE_LENGTH = 6000;
const MAX_ROLE_LENGTH = 180;
const MAX_INDUSTRY_LENGTH = 120;
const MAX_YEARS_EXPERIENCE_LENGTH = 40;
const MAX_SKILLS = 40;

const clampScore = (value) => {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const normalizeWhitespace = (value = "") => String(value).replace(/\s+/g, " ").trim();

const stripUnsafeHtml = (value = "") =>
  String(value)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/?[^>]+(>|$)/g, " ");

const sanitizeText = (value = "", maxLength = 1000) =>
  normalizeWhitespace(stripUnsafeHtml(value)).slice(0, maxLength);

const toTitleCase = (value = "") =>
  String(value)
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const normalizeSkill = (value = "") =>
  sanitizeText(value, 80).replace(/^[^a-z0-9]+|[^a-z0-9+#.]+$/gi, "");

const sanitizeSkills = (skills = []) => {
  const list = [];
  const seen = new Set();
  skills.forEach((item) => {
    const normalized = normalizeSkill(item);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    list.push(toTitleCase(normalized));
  });
  return list.slice(0, MAX_SKILLS);
};

const parseSkillsInput = (input) => {
  if (Array.isArray(input)) return sanitizeSkills(input);

  const raw = String(input || "").trim();
  if (!raw) return [];

  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return sanitizeSkills(parsed);
    } catch (_) {
      // fall through to delimiter split
    }
  }

  const split = raw
    .split(/[,\n|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
  return sanitizeSkills(split);
};

export const sanitizeProfileInput = (payload = {}) => ({
  headline: sanitizeText(payload.headline, MAX_HEADLINE_LENGTH),
  about: sanitizeText(payload.about, MAX_ABOUT_LENGTH),
  skills: parseSkillsInput(payload.skills),
  experience: sanitizeText(payload.experience, MAX_EXPERIENCE_LENGTH),
  targetRole: sanitizeText(payload.targetRole || payload.role, MAX_ROLE_LENGTH),
  targetIndustry: sanitizeText(payload.targetIndustry || payload.industry, MAX_INDUSTRY_LENGTH),
  yearsOfExperience: sanitizeText(
    payload.yearsOfExperience || payload.experienceYears,
    MAX_YEARS_EXPERIENCE_LENGTH
  ),
});

const isMeaningfulProfile = (profile = {}) =>
  Boolean(
    String(profile.headline || "").trim() ||
      String(profile.about || "").trim() ||
      String(profile.experience || "").trim() ||
      (Array.isArray(profile.skills) && profile.skills.length > 0)
  );

export const mergeExtractedAndManualProfile = ({ manualProfile = {}, extractedProfile = {} }) => {
  const mergedSkills =
    Array.isArray(manualProfile.skills) && manualProfile.skills.length > 0
      ? manualProfile.skills
      : extractedProfile.skills;

  return sanitizeProfileInput({
    headline: manualProfile.headline || extractedProfile.headline || "",
    about: manualProfile.about || extractedProfile.about || "",
    skills: mergedSkills || [],
    experience: manualProfile.experience || extractedProfile.experience || "",
    targetRole: manualProfile.targetRole || extractedProfile.targetRole || "",
    targetIndustry: manualProfile.targetIndustry || extractedProfile.targetIndustry || "",
    yearsOfExperience:
      manualProfile.yearsOfExperience || extractedProfile.yearsOfExperience || "",
  });
};

export const createProfileFingerprint = (profile = {}) => {
  const canonical = {
    headline: String(profile.headline || "").toLowerCase(),
    about: String(profile.about || "").toLowerCase(),
    experience: String(profile.experience || "").toLowerCase(),
    targetRole: String(profile.targetRole || "").toLowerCase(),
    targetIndustry: String(profile.targetIndustry || "").toLowerCase(),
    yearsOfExperience: String(profile.yearsOfExperience || "").toLowerCase(),
    skills: sanitizeSkills(profile.skills || []).map((skill) => skill.toLowerCase()).sort(),
  };

  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
};

const stripJsonFence = (text = "") =>
  String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const parseJsonLenient = (text = "") => {
  const normalized = stripJsonFence(text);
  if (!normalized) return null;

  try {
    return JSON.parse(normalized);
  } catch (_) {
    const firstBrace = normalized.indexOf("{");
    const lastBrace = normalized.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(normalized.slice(firstBrace, lastBrace + 1));
      } catch (_) {
        return null;
      }
    }
    return null;
  }
};

const extractGeminiText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => String(part?.text || "")).join("\n").trim();
};

const callGeminiJson = async ({ parts = [], temperature = 0.2 }) => {
  if (!GEMINI_API_KEY) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = extractGeminiText(data);
    return parseJsonLenient(text);
  } catch (_) {
    return null;
  }
};

const roleHintMap = [
  {
    pattern: /frontend|react|ui|web/i,
    skills: [
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "HTML",
      "CSS",
      "Redux",
      "UI Design",
      "Responsive Design",
    ],
  },
  {
    pattern: /backend|node|api|server/i,
    skills: [
      "Node.js",
      "Express",
      "REST API",
      "MongoDB",
      "SQL",
      "Authentication",
      "System Design",
      "Testing",
    ],
  },
  {
    pattern: /full.?stack/i,
    skills: [
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "Express",
      "MongoDB",
      "CI/CD",
      "Testing",
      "Cloud",
    ],
  },
  {
    pattern: /data|ml|ai|analytics/i,
    skills: [
      "Python",
      "SQL",
      "Machine Learning",
      "Data Visualization",
      "Statistics",
      "Pandas",
      "Numpy",
      "Deep Learning",
    ],
  },
];

const getRoleSkills = (targetRole = "") => {
  const role = String(targetRole || "");
  for (const item of roleHintMap) {
    if (item.pattern.test(role)) return item.skills;
  }
  return [
    "Communication",
    "Problem Solving",
    "Team Collaboration",
    "Documentation",
    "Project Experience",
  ];
};

const arrayFromUnknown = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return value.split(/[,\n|]/g);
  return [];
};

const normalizedStringArray = (value, maxItems = 12) =>
  sanitizeSkills(arrayFromUnknown(value)).slice(0, maxItems);

const normalizeDimensionScores = (value = {}) => ({
  headline: clampScore(value.headline),
  about: clampScore(value.about),
  skills: clampScore(value.skills),
  keywordAlignment: clampScore(value.keywordAlignment),
});

const fallbackAnalyzeProfile = (profile = {}) => {
  const detectedSkills = sanitizeSkills(profile.skills || []);
  const detectedSkillSet = new Set(detectedSkills.map((item) => item.toLowerCase()));
  const roleSkills = getRoleSkills(profile.targetRole);
  const missingSkills = roleSkills
    .filter((skill) => !detectedSkillSet.has(skill.toLowerCase()))
    .slice(0, 10);

  const headlineScore = Math.min(100, Math.round((String(profile.headline || "").length / 120) * 100));
  const aboutScore = Math.min(100, Math.round((String(profile.about || "").length / 500) * 100));
  const skillsScore = Math.min(100, Math.round((detectedSkills.length / 12) * 100));

  const roleKeywordHits = roleSkills.reduce((count, skill) => {
    if (detectedSkillSet.has(skill.toLowerCase())) return count + 1;
    return count;
  }, 0);
  const keywordAlignment = Math.min(100, Math.round((roleKeywordHits / Math.max(roleSkills.length, 1)) * 100));

  const baseScore = Math.round(
    headlineScore * 0.2 +
      aboutScore * 0.25 +
      skillsScore * 0.35 +
      keywordAlignment * 0.2 -
      missingSkills.length * 1.4
  );
  const profileScore = clampScore(baseScore);

  const suggestions = [
    !profile.headline
      ? "Add a focused headline with role + domain + impact."
      : "Refine headline with measurable outcome and niche keyword.",
    !profile.about
      ? "Write an About section highlighting strengths, projects, and goals."
      : "Rewrite About section with achievements, metrics, and clear positioning.",
    missingSkills.length
      ? `Add project evidence for missing skills: ${missingSkills.slice(0, 3).join(", ")}.`
      : "Add portfolio/project links to strengthen credibility.",
    "Use role-specific keywords naturally in headline, about, and experience.",
  ].filter(Boolean);

  const keywords = sanitizeSkills([...detectedSkills, ...roleSkills]).slice(0, 16);
  const strengths = [
    detectedSkills.length >= 6 ? "Strong breadth of listed skills." : "",
    String(profile.about || "").length >= 180 ? "About section has useful depth." : "",
    String(profile.experience || "").length >= 180
      ? "Experience section includes meaningful context."
      : "",
  ].filter(Boolean);
  const concerns = [
    detectedSkills.length < 4 ? "Too few explicit skills for target role." : "",
    !String(profile.experience || "").trim() ? "Experience section is missing or too brief." : "",
    !String(profile.targetRole || "").trim() ? "Target role is not specified." : "",
  ].filter(Boolean);

  return {
    profileScore,
    missingSkills,
    suggestions: suggestions.slice(0, 8),
    keywords,
    strengths: strengths.slice(0, 6),
    concerns: concerns.slice(0, 6),
    summary:
      profileScore >= 80
        ? "Profile is solid, optimize depth and role-specific keywords to maximize recruiter match."
        : "Profile needs stronger role alignment, clearer impact statements, and better keyword coverage.",
    dimensionScores: {
      headline: headlineScore,
      about: aboutScore,
      skills: skillsScore,
      keywordAlignment,
    },
  };
};

const normalizeAnalysisResult = (rawResult, profile = {}) => {
  if (!rawResult || typeof rawResult !== "object") {
    return fallbackAnalyzeProfile(profile);
  }

  const fallback = fallbackAnalyzeProfile(profile);
  const profileScore = clampScore(
    Object.prototype.hasOwnProperty.call(rawResult, "profileScore")
      ? rawResult.profileScore
      : fallback.profileScore
  );

  const missingSkills = normalizedStringArray(rawResult.missingSkills, 12);
  const suggestions = arrayFromUnknown(rawResult.suggestions)
    .map((item) => sanitizeText(item, 220))
    .filter(Boolean)
    .slice(0, 10);
  const keywords = normalizedStringArray(rawResult.keywords, 18);
  const strengths = arrayFromUnknown(rawResult.strengths)
    .map((item) => sanitizeText(item, 180))
    .filter(Boolean)
    .slice(0, 8);
  const concerns = arrayFromUnknown(rawResult.concerns)
    .map((item) => sanitizeText(item, 180))
    .filter(Boolean)
    .slice(0, 8);
  const summary = sanitizeText(rawResult.summary, 400);

  return {
    profileScore,
    missingSkills: missingSkills.length ? missingSkills : fallback.missingSkills,
    suggestions: suggestions.length ? suggestions : fallback.suggestions,
    keywords: keywords.length ? keywords : fallback.keywords,
    strengths: strengths.length ? strengths : fallback.strengths,
    concerns: concerns.length ? concerns : fallback.concerns,
    summary: summary || fallback.summary,
    dimensionScores: normalizeDimensionScores(rawResult.dimensionScores || fallback.dimensionScores),
  };
};

const buildAnalysisPrompt = (profile = {}) => `
You are a senior LinkedIn profile reviewer.
Analyze this profile for the target role and return ONLY strict JSON.

Input:
- Headline: ${profile.headline || "(empty)"}
- About: ${profile.about || "(empty)"}
- Skills: ${(profile.skills || []).join(", ") || "(empty)"}
- Experience: ${profile.experience || "(empty)"}
- Target Role: ${profile.targetRole || "(not provided)"}
- Target Industry/Domain: ${profile.targetIndustry || "(not provided)"}
- Years of Experience: ${profile.yearsOfExperience || "(not provided)"}

Required JSON schema:
{
  "profileScore": 78,
  "missingSkills": ["TypeScript", "Next.js"],
  "suggestions": ["Improve headline with role keyword and measurable impact"],
  "keywords": ["Frontend", "React", "UI"],
  "strengths": ["Clear positioning"],
  "concerns": ["Missing quantified outcomes"],
  "summary": "one short summary",
  "dimensionScores": {
    "headline": 70,
    "about": 75,
    "skills": 80,
    "keywordAlignment": 72
  }
}

Rules:
- profileScore and each dimension score must be between 0 and 100.
- Keep suggestions practical and concise.
- Prefer role-specific skill gaps.
- Respond with JSON only, no markdown.
`;

export const analyzeLinkedInProfile = async ({ profile = {}, previousReport = null }) => {
  if (!isMeaningfulProfile(profile)) {
    return {
      analysis: fallbackAnalyzeProfile(profile),
      incremental: {
        trend: "first-analysis",
        scoreDelta: 0,
        newlyMissingSkills: [],
        resolvedSkills: [],
        keywordsAdded: [],
      },
      aiMeta: {
        name: "heuristic",
        model: "local-fallback",
      },
      usedFallback: true,
    };
  }

  const aiRaw = await callGeminiJson({
    parts: [{ text: buildAnalysisPrompt(profile) }],
    temperature: 0.15,
  });

  const analysis = normalizeAnalysisResult(aiRaw, profile);
  const previousScore = clampScore(previousReport?.profileScore || 0);
  const scoreDelta = Number((analysis.profileScore - previousScore).toFixed(2));

  const previousMissing = sanitizeSkills(previousReport?.missingSkills || []).map((item) =>
    item.toLowerCase()
  );
  const currentMissing = sanitizeSkills(analysis.missingSkills || []).map((item) =>
    item.toLowerCase()
  );
  const previousKeywords = sanitizeSkills(previousReport?.keywords || []).map((item) =>
    item.toLowerCase()
  );
  const currentKeywords = sanitizeSkills(analysis.keywords || []).map((item) =>
    item.toLowerCase()
  );

  const newlyMissingSkills = sanitizeSkills(
    currentMissing.filter((item) => !previousMissing.includes(item))
  );
  const resolvedSkills = sanitizeSkills(
    previousMissing.filter((item) => !currentMissing.includes(item))
  );
  const keywordsAdded = sanitizeSkills(
    currentKeywords.filter((item) => !previousKeywords.includes(item))
  );

  const trend = !previousReport
    ? "first-analysis"
    : scoreDelta > 2
    ? "improved"
    : scoreDelta < -2
    ? "declined"
    : "stable";

  return {
    analysis,
    incremental: {
      trend,
      scoreDelta: previousReport ? scoreDelta : 0,
      newlyMissingSkills: newlyMissingSkills.slice(0, 10),
      resolvedSkills: resolvedSkills.slice(0, 10),
      keywordsAdded: keywordsAdded.slice(0, 10),
    },
    aiMeta: {
      name: aiRaw ? "gemini" : "heuristic",
      model: aiRaw ? GEMINI_MODEL : "local-fallback",
    },
    usedFallback: !aiRaw,
    rawAi: aiRaw || {},
  };
};

export const extractProfileFromPdf = async ({ fileBuffer, targetRole = "" }) => {
  if (!fileBuffer || !fileBuffer.length) return null;
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required to analyze uploaded PDF files.");
  }

  const prompt = `
Read this full PDF and extract profile content relevant to LinkedIn optimization.
Return ONLY strict JSON:
{
  "headline": "string",
  "about": "string",
  "skills": ["string"],
  "experience": "string",
  "targetRole": "string",
  "targetIndustry": "string",
  "yearsOfExperience": "string"
}
Rules:
- Use complete PDF context, not just first page.
- Keep fields concise and useful for profile analysis.
- If target role is unclear, infer best-fit role from the document.
- No markdown, no explanation.
`;

  const aiRaw = await callGeminiJson({
    parts: [
      { text: prompt },
      {
        inline_data: {
          mime_type: "application/pdf",
          data: fileBuffer.toString("base64"),
        },
      },
      {
        text: `User-specified target role (optional): ${targetRole || "(not provided)"}`,
      },
    ],
    temperature: 0.1,
  });

  if (!aiRaw || typeof aiRaw !== "object") return null;

  const extracted = sanitizeProfileInput({
    headline: aiRaw.headline || "",
    about: aiRaw.about || "",
    skills: aiRaw.skills || [],
    experience: aiRaw.experience || "",
    targetRole: aiRaw.targetRole || targetRole || "",
    targetIndustry: aiRaw.targetIndustry || "",
    yearsOfExperience: aiRaw.yearsOfExperience || "",
  });

  return isMeaningfulProfile(extracted) ? extracted : null;
};

const buildCacheKey = (userId, profileFingerprint) =>
  `linkedin:analysis:${String(userId)}:${String(profileFingerprint)}`;

export const getCacheTtlSeconds = () => LINKEDIN_CACHE_TTL_SECONDS;

export const getCachedAnalysis = async ({ userId, profileFingerprint }) => {
  if (!redisClient.isEnabled) return null;

  const cacheKey = buildCacheKey(userId, profileFingerprint);
  try {
    const cached = await redisClient.get(cacheKey);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
};

export const setCachedAnalysis = async ({ userId, profileFingerprint, payload }) => {
  if (!redisClient.isEnabled) return false;

  const cacheKey = buildCacheKey(userId, profileFingerprint);
  try {
    await redisClient.set(cacheKey, JSON.stringify(payload), {
      EX: LINKEDIN_CACHE_TTL_SECONDS,
    });
    return true;
  } catch (_) {
    return false;
  }
};
