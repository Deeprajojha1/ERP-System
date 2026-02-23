import Section from "../models/Section.js";



export const createSection = async (req, res) => {
  try {
    const section = await Section.create(req.body);
    res.status(201).json({
      success: true,
      data: section,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



export const getAllSections = async (req, res) => {
  try {
    const sections = await Section.find()
      .populate("department");

    res.status(200).json({
      success: true,
      count: sections.length,
      data: sections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const getSectionById = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id)
      .populate("department");

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateSection = async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



export const deleteSection = async (req, res) => {
  try {
    const section = await Section.findByIdAndDelete(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
