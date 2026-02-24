import SectionCourse from "../models/SectionCourse.js";


// ✅ Create SectionCourse mapping
export const createSectionCourse = async (req, res) => {
  try {
    const sectionCourse = await SectionCourse.create(req.body);

    res.status(201).json({
      success: true,
      data: sectionCourse,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// ✅ Get All Mappings
export const getAllSectionCourses = async (req, res) => {
  try {
    const data = await SectionCourse.find()
      .populate("section")
      .populate("course")
      .populate("faculty");

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ✅ Get By ID
export const getSectionCourseById = async (req, res) => {
  try {
    const data = await SectionCourse.findById(req.params.id)
      .populate("section")
      .populate("course")
      .populate("faculty");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Mapping not found",
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ✅ Update Mapping
export const updateSectionCourse = async (req, res) => {
  try {
    const data = await SectionCourse.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Mapping not found",
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// ✅ Delete Mapping
export const deleteSectionCourse = async (req, res) => {
  try {
    const data = await SectionCourse.findByIdAndDelete(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Mapping not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Mapping deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
