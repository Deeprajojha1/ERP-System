import Faculty from "../models/Faculty.js";
import Course from "../models/Course.js";
import Group from "../models/Group.js";
import Department from "../models/Department.js";

/**
 * Get teaching load data for a specific department and program
 * @route GET /api/admin/teaching-load
 * @query department - Department ID (required)
 * @query program - Program name (required, e.g., "B.Tech", "BCA")
 * @query semester - Semester number (optional, 1-12)
 */
export const getTeachingLoad = async (req, res) => {
  try {
    const { department, program, semester } = req.query;

    if (!department || !program) {
      return res.status(400).json({
        success: false,
        message: "Department and program are required",
      });
    }

    // Get all faculty from the department
    const facultyList = await Faculty.find({
      department,
      isDeleted: false,
    })
      .populate("user", "name email")
      .populate("department", "name")
      .lean();

    // Get all courses for the department
    const courseQuery = {
      department,
      isDeleted: false,
    };
    
    // Add semester filter if provided
    if (semester) {
      courseQuery.semester = parseInt(semester);
    }

    const courses = await Course.find(courseQuery)
      .populate("department", "name")
      .populate("facultyIds", "user employeeId designation")
      .lean();

    // Get all groups for the department
    const groups = await Group.find({
      department,
      isDeleted: false,
    })
      .populate("courseFaculty.course", "code courseName semester branch")
      .populate("courseFaculty.faculty", "user employeeId")
      .populate({
        path: "courseFaculty.faculty",
        populate: { path: "user", select: "name" },
      })
      .lean();

    // Build teaching load data
    const teachingLoadMap = new Map();

    // Process faculty routines
    facultyList.forEach((faculty) => {
      const facultyId = faculty._id.toString();
      const facultyName = faculty.user?.name || "Unknown";
      const designation = faculty.designation || "";

      if (!teachingLoadMap.has(facultyId)) {
        teachingLoadMap.set(facultyId, {
          facultyId,
          facultyName,
          designation,
          courses: new Map(),
        });
      }

      // Process routine
      if (faculty.routine) {
        const routineObj = faculty.routine instanceof Map 
          ? Object.fromEntries(faculty.routine) 
          : faculty.routine;

        Object.values(routineObj).forEach((daySlots) => {
          const slotsObj = daySlots instanceof Map 
            ? Object.fromEntries(daySlots) 
            : daySlots;

          Object.values(slotsObj).forEach((slot) => {
            if (slot?.course) {
              const courseId = slot.course._id?.toString() || slot.course.toString();
              const facultyData = teachingLoadMap.get(facultyId);
              
              if (!facultyData.courses.has(courseId)) {
                facultyData.courses.set(courseId, {
                  courseId,
                  groups: new Set(),
                });
              }

              if (slot.group) {
                const groupId = slot.group._id?.toString() || slot.group.toString();
                facultyData.courses.get(courseId).groups.add(groupId);
              }
            }
          });
        });
      }
    });

    // Process group course-faculty mappings
    groups.forEach((group) => {
      if (group.courseFaculty && Array.isArray(group.courseFaculty)) {
        group.courseFaculty.forEach((cf) => {
          const facultyId = cf.faculty?._id?.toString();
          const courseId = cf.course?._id?.toString();
          const facultyName = cf.faculty?.user?.name || "Unknown";

          if (facultyId && courseId) {
            if (!teachingLoadMap.has(facultyId)) {
              teachingLoadMap.set(facultyId, {
                facultyId,
                facultyName,
                designation: "",
                courses: new Map(),
              });
            }

            const facultyData = teachingLoadMap.get(facultyId);
            if (!facultyData.courses.has(courseId)) {
              facultyData.courses.set(courseId, {
                courseId,
                groups: new Set(),
              });
            }

            facultyData.courses.get(courseId).groups.add(group._id.toString());
          }
        });
      }
    });

    // Build final teaching load array
    const teachingLoad = [];
    const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));
    const groupMap = new Map(groups.map((g) => [g._id.toString(), g]));

    teachingLoadMap.forEach((facultyData) => {
      facultyData.courses.forEach((courseData) => {
        const course = courseMap.get(courseData.courseId);
        if (!course) return;

        // Filter by program if specified
        if (program && course.branch && !course.branch.includes(program)) {
          return;
        }

        // Filter by semester if specified
        if (semester && course.semester !== parseInt(semester)) {
          return;
        }

        const groupNames = Array.from(courseData.groups)
          .map((gId) => groupMap.get(gId)?.name)
          .filter(Boolean)
          .join(", ");

        teachingLoad.push({
          _id: `${facultyData.facultyId}-${courseData.courseId}`,
          facultyName: facultyData.facultyName,
          also: facultyData.designation
            ? facultyData.designation.replace("_", " ").toUpperCase()
            : "",
          subjectName: `${course.courseName || course.code} - ${course.code}`,
          deptName: course.department?.name || "",
          semester: course.semester || "",
          batch: groupNames || "-",
          remarks: `${course.credit || 0} Credits`,
        });
      });
    });

    // Sort by faculty name, then by semester
    teachingLoad.sort((a, b) => {
      const nameCompare = a.facultyName.localeCompare(b.facultyName);
      if (nameCompare !== 0) return nameCompare;
      return (a.semester || 0) - (b.semester || 0);
    });

    res.status(200).json({
      success: true,
      teachingLoad,
      count: teachingLoad.length,
    });
  } catch (error) {
    console.error("Get teaching load error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teaching load",
      error: error.message,
    });
  }
};