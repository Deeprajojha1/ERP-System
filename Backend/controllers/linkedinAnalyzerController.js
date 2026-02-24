import LinkedInProfile from "../models/LinkedInProfile.js";
import LinkedInReport from "../models/LinkedInReport.js";
import {
  analyzeLinkedInProfile,
  createProfileFingerprint,
  extractProfileFromPdf,
  getCacheTtlSeconds,
  getCachedAnalysis,
  mergeExtractedAndManualProfile,
  sanitizeProfileInput,
  setCachedAnalysis,
} from "../services/linkedinAnalyzerService.js";

const toSafeArray = (value) => (Array.isArray(value) ? value : []);

const toResponsePayload = (reportDoc, { cached = false, cacheSource = "live" } = {}) => {
  const report = reportDoc?.toObject ? reportDoc.toObject() : reportDoc || {};
  const profile = report.profileId && typeof report.profileId === "object" ? report.profileId : {};
  const cacheTtl = getCacheTtlSeconds();

  return {
    reportId: report?._id ? String(report._id) : "",
    profileId: profile?._id ? String(profile._id) : report?.profileId ? String(report.profileId) : null,
    profile: {
      headline: String(profile?.headline || ""),
      targetRole: String(profile?.targetRole || ""),
      source: String(profile?.source || ""),
    },
    profileScore: Number(report.profileScore || 0),
    dimensionScores: {
      headline: Number(report?.dimensionScores?.headline || 0),
      about: Number(report?.dimensionScores?.about || 0),
      skills: Number(report?.dimensionScores?.skills || 0),
      keywordAlignment: Number(report?.dimensionScores?.keywordAlignment || 0),
    },
    missingSkills: toSafeArray(report.missingSkills),
    suggestions: toSafeArray(report.suggestions),
    keywords: toSafeArray(report.keywords),
    strengths: toSafeArray(report.strengths),
    concerns: toSafeArray(report.concerns),
    summary: String(report.summary || ""),
    incremental: report.incremental || {
      trend: "first-analysis",
      scoreDelta: 0,
      newlyMissingSkills: [],
      resolvedSkills: [],
      keywordsAdded: [],
    },
    aiProvider: report.aiProvider || {},
    analyzedAt: report.createdAt,
    cached,
    cacheSource,
    cacheTtlSeconds: cacheTtl,
  };
};

const hasProfileContent = (profile = {}) =>
  Boolean(
    String(profile.headline || "").trim() ||
      String(profile.about || "").trim() ||
      String(profile.experience || "").trim() ||
      (Array.isArray(profile.skills) && profile.skills.length > 0)
  );

const parseHistoryLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(25, Math.max(1, Math.round(parsed)));
};

export const analyzeProfile = async (req, res) => {
  try {
    const manualProfile = sanitizeProfileInput(req.body || {});
    const hasPdf = Boolean(req.file?.buffer?.length);

    if (!hasPdf && !hasProfileContent(manualProfile)) {
      return res.status(400).json({
        message:
          "Provide profile text fields (headline/about/skills/experience) or upload a PDF.",
      });
    }

    let extractedProfile = null;
    if (hasPdf) {
      extractedProfile = await extractProfileFromPdf({
        fileBuffer: req.file.buffer,
        targetRole: manualProfile.targetRole,
      });
    }

    const mergedProfile = mergeExtractedAndManualProfile({
      manualProfile,
      extractedProfile: extractedProfile || {},
    });

    if (!hasProfileContent(mergedProfile) && !String(manualProfile.targetRole || "").trim()) {
      return res.status(400).json({
        message:
          "Could not extract enough profile data from PDF. Add a target role or richer profile content.",
      });
    }

    const profileFingerprint = createProfileFingerprint(mergedProfile);

    const redisCached = await getCachedAnalysis({
      userId: req.userId,
      profileFingerprint,
    });
    if (redisCached) {
      return res.json({
        ...redisCached,
        cached: true,
        cacheSource: "redis",
      });
    }

    const cacheTtlSeconds = getCacheTtlSeconds();
    const cacheCutoff = new Date(Date.now() - cacheTtlSeconds * 1000);
    const mongoCachedReport = await LinkedInReport.findOne({
      userId: req.userId,
      profileFingerprint,
      createdAt: { $gte: cacheCutoff },
    })
      .sort({ createdAt: -1 })
      .populate("profileId", "headline targetRole source");

    if (mongoCachedReport) {
      const payload = toResponsePayload(mongoCachedReport, {
        cached: true,
        cacheSource: "mongodb",
      });
      await setCachedAnalysis({
        userId: req.userId,
        profileFingerprint,
        payload,
      });
      return res.json(payload);
    }

    const source = hasPdf ? (hasProfileContent(manualProfile) ? "hybrid" : "pdf") : "manual";
    const createdProfile = await LinkedInProfile.create({
      userId: req.userId,
      source,
      headline: mergedProfile.headline,
      about: mergedProfile.about,
      skills: mergedProfile.skills,
      experience: mergedProfile.experience,
      targetRole: mergedProfile.targetRole,
      profileFingerprint,
      rawInput: req.body || {},
      pdfMeta: hasPdf
        ? {
            originalName: String(req.file?.originalname || ""),
            mimeType: String(req.file?.mimetype || ""),
            size: Number(req.file?.size || 0),
          }
        : undefined,
    });

    const previousReport = await LinkedInReport.findOne({ userId: req.userId }).sort({
      createdAt: -1,
    });

    const aiResult = await analyzeLinkedInProfile({
      profile: mergedProfile,
      previousReport,
    });

    const createdReport = await LinkedInReport.create({
      userId: req.userId,
      profileId: createdProfile._id,
      profileFingerprint,
      profileScore: aiResult.analysis.profileScore,
      missingSkills: aiResult.analysis.missingSkills,
      suggestions: aiResult.analysis.suggestions,
      keywords: aiResult.analysis.keywords,
      strengths: aiResult.analysis.strengths,
      concerns: aiResult.analysis.concerns,
      summary: aiResult.analysis.summary,
      dimensionScores: aiResult.analysis.dimensionScores,
      incremental: aiResult.incremental,
      cacheMeta: {
        servedFromCache: false,
        cacheSource: "live",
        ttlSeconds: cacheTtlSeconds,
      },
      aiProvider: aiResult.aiMeta,
      rawAi: aiResult.rawAi || {},
    });

    const reportWithProfile = await LinkedInReport.findById(createdReport._id).populate(
      "profileId",
      "headline targetRole source"
    );

    const payload = toResponsePayload(reportWithProfile, {
      cached: false,
      cacheSource: "live",
    });

    await setCachedAnalysis({
      userId: req.userId,
      profileFingerprint,
      payload,
    });

    return res.json(payload);
  } catch (error) {
    const message = String(error?.message || "Failed to analyze LinkedIn profile");
    if (message.includes("GEMINI_API_KEY")) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message });
  }
};

export const getLinkedinReports = async (req, res) => {
  try {
    const limit = parseHistoryLimit(req.query?.limit);
    const reports = await LinkedInReport.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("profileId", "headline targetRole source");

    return res.json({
      count: reports.length,
      reports: reports.map((item) =>
        toResponsePayload(item, {
          cached: false,
          cacheSource: "history",
        })
      ),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch LinkedIn analyzer reports",
    });
  }
};
