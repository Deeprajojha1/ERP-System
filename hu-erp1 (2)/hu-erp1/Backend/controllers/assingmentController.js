import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import Group from "../models/Group.js";

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

export const getSingleAssignmentAdmin = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
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
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.json(assignment);
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