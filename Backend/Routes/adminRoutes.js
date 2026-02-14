import express from "express";
import {
  getAllStudents,
  getStudentById,
  addStudent,
  updateStudent,
  deleteStudent,
} from "../controllers/studentController.js";

import {
  getAllDepartments,
  getDepartmentById,
  addDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departmentController.js";

import {
  getAllFaculty,
  getFacultyById,
  addFaculty,
  updateFaculty,
  deleteFaculty,
  addRoutineToFaculty,
} from "../controllers/facultyController.js";

import {
  getAllFacultyLeaves,
  updateFacultyLeaveStatus,
} from "../controllers/facultyLeaveController.js";

import {
  getAllCourses,
  getCourseById,
  addCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js";

import {
  getAllGroups,
  getGroupById,
  addGroup,
  updateGroup,
  deleteGroup,
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
  getStudentsByGroup,
  getStudentAttendanceReport,
  getStudentOverallAttendance,
  getDailyAttendanceSummary,
} from "../controllers/attendanceController.js";

import {
  getStatistics,
  getAllBooks,
  addBook,
  getBookById,
  updateBook,
  deleteBook,
  issueBook,
  getIssuedBooks,
  returnBook,
} from "../controllers/libraryController.js";

import isAdmin from "../middlewares/isAdmin.js";

const router = express.Router();

/* =========================
   PROFILE
========================= */
router.post("/profile", isAdmin, getAdminProfile);

/* =========================
   DEPARTMENT
========================= */
router.get("/department", isAdmin, getAllDepartments);
router.get("/department/:id", isAdmin, getDepartmentById);
router.post("/department", isAdmin, addDepartment);
router.put("/department/:id", isAdmin, updateDepartment);
router.delete("/department/:id", isAdmin, deleteDepartment);

/* =========================
   FACULTY
========================= */
router.get("/faculty", isAdmin, getAllFaculty);
router.get("/faculty/:id", isAdmin, getFacultyById);
router.post("/faculty", isAdmin, addFaculty);
router.put("/faculty/:id", isAdmin, updateFaculty);
router.delete("/faculty/:id", isAdmin, deleteFaculty);
router.post("/faculty/:id/routine", isAdmin, addRoutineToFaculty);

/* =========================
   FACULTY LEAVES
========================= */
router.get("/facultyleave", isAdmin, getAllFacultyLeaves);
router.patch("/facultyleave/:id/status", isAdmin, updateFacultyLeaveStatus);

/* =========================
   STUDENTS
========================= */
router.get("/student", isAdmin, getAllStudents);
router.get("/student/:id", isAdmin, getStudentById);
router.post("/student", isAdmin, addStudent);
router.put("/student/:id", isAdmin, updateStudent);
router.delete("/student/:id", isAdmin, deleteStudent);

/* =========================
   COURSES
========================= */
router.get("/course", isAdmin, getAllCourses);
router.get("/course/:id", isAdmin, getCourseById);
router.post("/course", isAdmin, addCourse);
router.put("/course/:id", isAdmin, updateCourse);
router.delete("/course/:id", isAdmin, deleteCourse);

/* =========================
   GROUPS
========================= */
router.get("/group", isAdmin, getAllGroups);
router.get("/group/:id", isAdmin, getGroupById);
router.post("/group", isAdmin, addGroup);
router.put("/group/:id", isAdmin, updateGroup);
router.delete("/group/:id", isAdmin, deleteGroup);

/* =========================
   TIMETABLE (GROUP-WISE)
========================= */
router.get("/timetable/group", isAdmin, getTimetableGroups);
router.get("/timetable/group/:groupId", isAdmin, getGroupTimetable);

/* =========================
   ATTENDANCE
========================= */
router.post("/attendance", isAdmin, markAttendance);
router.put("/attendance/:sessionId", isAdmin, updateAttendance);
router.get("/attendance/daily", isAdmin, getDailyAttendanceSummary);
router.get("/attendance/group/:groupId/students", isAdmin, getStudentsByGroup);
router.get("/attendance/group/:groupId/course/:courseId", isAdmin, getAttendanceByGroupAndCourse);
router.get("/attendance/student/:studentId", isAdmin, getStudentOverallAttendance);
router.get("/attendance/student/:studentId/course/:courseId", isAdmin, getStudentAttendanceReport);
router.get("/attendance/:sessionId", isAdmin, getAttendanceById);
router.delete("/attendance/:sessionId", isAdmin, deleteAttendance);

/* =========================
   LIBRARY
========================= */
router.get("/library/statistics", getStatistics);

router.get("/library/books",  getAllBooks);
router.post("/library/books", addBook);
router.get("/library/books/:id",  getBookById);
router.put("/library/books/:id",  updateBook);
router.delete("/library/books/:id", deleteBook);

router.post("/library/issues",issueBook);
router.get("/library/issues", getIssuedBooks);
router.patch("/library/issues/:id/return", returnBook);

export default router;
