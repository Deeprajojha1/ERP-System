import Company from "../models/Company.js";
import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";

/* ================= GET ALL COMPANIES ================= */
export const getAllCompanies = async (req, res) => {
  try {
    const { isActive, noCache } = req.query;
    const cacheKey = `placement:companies:all:${isActive || "all"}`;

    if (noCache !== "true") {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      } catch (err) {
        console.error("[Redis] getAllCompanies cache read failed:", err.message);
      }
    }

    const filter = { isDeleted: { $ne: true } };
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const companies = await Company.find(filter).sort({ name: 1 });

    const responsePayload = {
      message: "Companies fetched successfully",
      count: companies.length,
      companies,
    };

    if (noCache !== "true") {
      try {
        await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
          EX: DEFAULT_CACHE_TTL,
        });
      } catch (err) {
        console.error("[Redis] getAllCompanies cache write failed:", err.message);
      }
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET COMPANY BY ID ================= */
export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({
      message: "Company fetched successfully",
      company,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= ADD COMPANY ================= */
export const addCompany = async (req, res) => {
  try {
    const {
      name,
      logo,
      website,
      industry,
      description,
      location,
      contactPerson,
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Company name is required" });
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({ name: name.trim() });
    if (existingCompany) {
      return res.status(400).json({ message: "Company already exists" });
    }

    const company = await Company.create({
      name: name.trim(),
      logo,
      website,
      industry,
      description,
      location,
      contactPerson,
    });

    // Clear cache
    try {
      await redisClient.del("placement:companies:all:all");
      await redisClient.del("placement:companies:all:true");
    } catch (err) {
      console.error("[Redis] addCompany cache clear failed:", err.message);
    }

    res.status(201).json({
      message: "Company added successfully",
      company,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE COMPANY ================= */
export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const company = await Company.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Clear cache
    try {
      await redisClient.del("placement:companies:all:all");
      await redisClient.del("placement:companies:all:true");
      await redisClient.del("placement:companies:all:false");
    } catch (err) {
      console.error("[Redis] updateCompany cache clear failed:", err.message);
    }

    res.json({
      message: "Company updated successfully",
      company,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE COMPANY (SOFT) ================= */
export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByIdAndUpdate(
      id,
      { isDeleted: true, isActive: false },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Clear cache
    try {
      await redisClient.del("placement:companies:all:all");
      await redisClient.del("placement:companies:all:true");
      await redisClient.del("placement:companies:all:false");
    } catch (err) {
      console.error("[Redis] deleteCompany cache clear failed:", err.message);
    }

    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
