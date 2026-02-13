import express from "express";
import {
  getAllStudents,
  getStudentById,
  addStudent,
  updateStudent,
  deleteStudent,
  hardDeleteStudent,
} from "../controllers/studentController.js";
import {
  getAllDepartments,
  getDepartmentById,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  hardDeleteDepartment,
} from "../controllers/departmentController.js";
import {
  getAllFaculty,
  getFacultyById,
  addFaculty,
  updateFaculty,
  deleteFaculty,
  hardDeleteFaculty,
  addRoutineToFaculty,
} from "../controllers/facultyController.js";
import { getAllFacultyLeaves, updateFacultyLeaveStatus } from "../controllers/facultyLeaveController.js";
import {
  getAllCourses,
  getCourseById,
  addCourse,
  updateCourse,
  deleteCourse,
  hardDeleteCourse,
} from "../controllers/courseController.js";
import {
  getAllGroups,
  getGroupById,
  addGroup,
  updateGroup,
  deleteGroup,
  hardDeleteGroup,
  getTimetableGroups,
  getGroupTimetable,
} from "../controllers/groupController.js";
import { getAdminProfile } from "../controllers/profileController.js";
import {
  markAttendance,
  updateAttendance,
  getAttendanceById,
  getAttendanceByGroupAndCourse,
  deleteAttendance,
  hardDeleteAttendance,
  getStudentsByGroup,
  getStudentAttendanceReport,
  getStudentOverallAttendance,
  getDailyAttendanceSummary,
} from "../controllers/attendanceController.js";
import isAdmin from "../middlewares/isAdmin.js";

const router = express.Router();

/* Profile Route */
router.post("/profile", getAdminProfile);

/* Department Routes */
router.get("/department", isAdmin, getAllDepartments);
router.get("/department/:id", isAdmin, getDepartmentById);
router.post("/department", isAdmin, addDepartment);
router.put("/department/:id", isAdmin, updateDepartment);
router.patch("/department/:id/delete", isAdmin, deleteDepartment);
router.delete("/department/:id", isAdmin, hardDeleteDepartment);

/* Faculty Routes */
router.get("/faculty", isAdmin, getAllFaculty);
router.get("/faculty/:id", isAdmin, getFacultyById);
router.post("/faculty", isAdmin, addFaculty);
router.put("/faculty/:id", isAdmin, updateFaculty);
router.patch("/faculty/:id/delete", isAdmin, deleteFaculty);
router.delete("/faculty/:id", isAdmin, hardDeleteFaculty);
router.post("/faculty/:id/routine", isAdmin, addRoutineToFaculty);

// Faculty Leaves (Admin)
router.get("/facultyleave", isAdmin, getAllFacultyLeaves);
router.patch("/facultyleave/:id/status", isAdmin, updateFacultyLeaveStatus);

/* Student Routes */
router.get("/student", isAdmin, getAllStudents);
router.get("/student/:id", isAdmin, getStudentById);
router.post("/student", isAdmin, addStudent);
router.put("/student/:id", isAdmin, updateStudent);
router.patch("/student/:id/delete", isAdmin, deleteStudent);
router.delete("/student/:id", isAdmin, hardDeleteStudent);

/* Course Routes */
router.get("/course", isAdmin, getAllCourses);
router.get("/course/:id", isAdmin, getCourseById);
router.post("/course", isAdmin, addCourse);
router.put("/course/:id", isAdmin, updateCourse);
router.patch("/course/:id/delete", isAdmin, deleteCourse);
router.delete("/course/:id", isAdmin, hardDeleteCourse);

/* Group Routes */
router.get("/group", isAdmin, getAllGroups);
router.get("/group/:id", isAdmin, getGroupById);
router.post("/group", isAdmin, addGroup);
router.put("/group/:id", isAdmin, updateGroup);
router.patch("/group/:id/delete", isAdmin, deleteGroup);
router.delete("/group/:id", isAdmin, hardDeleteGroup);

/* Timetable Routes (Group-wise ok) */
router.get("/timetable/group", isAdmin, getTimetableGroups);
router.get("/timetable/group/:groupId", isAdmin, getGroupTimetable);

/* Attendance Routes */
router.post("/attendance", isAdmin, markAttendance);
router.put("/attendance/:sessionId", isAdmin, updateAttendance);
router.get("/attendance/daily", isAdmin, getDailyAttendanceSummary);
router.get("/attendance/group/:groupId/students", isAdmin, getStudentsByGroup);
router.get("/attendance/group/:groupId/course/:courseId", isAdmin, getAttendanceByGroupAndCourse);
router.get("/attendance/student/:studentId", isAdmin, getStudentOverallAttendance);
router.get("/attendance/student/:studentId/course/:courseId", isAdmin, getStudentAttendanceReport);
router.get("/attendance/:sessionId", isAdmin, getAttendanceById);
router.patch("/attendance/:sessionId/delete", isAdmin, deleteAttendance);
router.delete("/attendance/:sessionId", isAdmin, hardDeleteAttendance);

export default router;
