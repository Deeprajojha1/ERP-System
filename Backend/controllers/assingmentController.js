import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";

const buildAssignmentQuery = ({ departmentId, groupId, facultyId }) => {
  const query = { isDeleted: { $ne: true } };

  if (departmentId) query.department = departmentId;
  if (groupId) query.group = groupId;
  if (facultyId) query.uploadedBy = facultyId;

  return query;
};

const assignmentPopulate = [
  {
    path: "uploadedBy",
    populate: {
      path: "user",
      select: "name email",
    },
  },
  { path: "group", select: "name" },
  { path: "department", select: "name" },
];

export const getAssignmentsByGroup = async (req, res) => {
  try {
    const query = buildAssignmentQuery(req.query || {});

    const assignments = await Assignment.find(query)
      .populate(assignmentPopulate)
      .sort({ createdAt: -1 });

    return res.status(200).json({ assignments });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch assignments" });
  }
};

export const getSingleAssignmentAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findOne({
      _id: id,
      isDeleted: { $ne: true },
    }).populate(assignmentPopulate);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    return res.status(200).json({ assignment });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch assignment" });
  }
};

export const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate(assignmentPopulate);

    return res.status(200).json({
      message: "Assignment updated successfully",
      assignment: updatedAssignment,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update assignment" });
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
    await Submission.deleteMany({ assignment: id });

    return res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete assignment" });
  }
};

export const getAssignmentSubmissionsAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const submissions = await Submission.find({ assignment: id })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ submissions });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch submissions" });
  }
};
