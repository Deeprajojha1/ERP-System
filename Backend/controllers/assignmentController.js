import Assignment from "../models/Assignment.js";
import Submission from "../models/submission.js";

export const getAssignmentsByGroup = async (req, res) => {
  try {
    const { departmentId, groupId, facultyId } = req.query;

    let filter = {};

    if (departmentId) filter.department = departmentId;
    if (groupId) filter.group = groupId;
    if (facultyId) filter.uploadedBy = facultyId;

    const assignments = await Assignment.find(filter)
      .populate({
        path: "uploadedBy",
        populate: {
          path: "user",
          select: "name email",
        },
      })
      .populate("group", "name")
      .populate("department", "name")
      .sort({ createdAt: -1 });

    res.json(assignments);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.body;

    const submission = await Submission.create({
      assignment: assignmentId,
      student: req.userId,
      fileUrl: req.file.path,
    });

    // 🔥 Auto update submission count
    await Assignment.findByIdAndUpdate(
      assignmentId,
      { $inc: { totalSubmissions: 1 } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Assignment submitted successfully",
      submission,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAdminAssignments = async (req, res) => {
  try {
    const { departmentId, groupId, facultyId } = req.query;

    let filter = {};

    if (departmentId) filter.department = departmentId;
    if (groupId) filter.group = groupId;
    if (facultyId) filter.uploadedBy = facultyId;

    const assignments = await Assignment.find(filter)
      .populate({
        path: "uploadedBy",
        populate: {
          path: "user",
          select: "name email",
        },
      })
      .populate("group", "name")
      .populate("department", "name")
      .sort({ createdAt: -1 });

    res.json(assignments);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate({
        path: "uploadedBy",
        populate: {
          path: "user",
          select: "name email",
        },
      })
      .populate("group", "name")
      .populate("department", "name");

    res.json({
      success: true,
      message: "Assignment updated successfully",
      updatedAssignment,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSingleAssignmentAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id)
      .populate({
        path: "uploadedBy",
        populate: {
          path: "user",
          select: "name email",
        },
      })
      .populate("group", "name")
      .populate("department", "name");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.json({
      success: true,
      assignment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    await Assignment.findByIdAndDelete(id);

    await Submission.deleteMany({
      assignment: id,
    });

    res.json({
      success: true,
      message: "Assignment deleted successfully",
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAssignmentSubmissionsAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const submissions = await Submission.find({
      assignment: id,
    })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
