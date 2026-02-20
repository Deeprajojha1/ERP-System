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
  createGroupTimetable,
  updateGroupTimetable,
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
import {
  getAllLibrarians,
  getLibrarianById,
  addLibrarian,
  updateLibrarian,
  deleteLibrarian,
  hardDeleteLibrarian,
} from "../controllers/librarianController.js";
import { changePassword } from "../controllers/userController.js";
import { getTeachingLoad } from "../controllers/teachingLoadController.js";

import {
  getAllExams,
  getExamById,
  addExam,
  updateExam,
  deleteExam,
  hardDeleteExam,
} from "../controllers/examController.js";

import {
  getAllResults,
  getResultById,
  addResult,
  updateResult,
  deleteResult,
  hardDeleteResult,
  getStudentResultSummary,
} from "../controllers/resultController.js";
import {
  getAllExamRegistrations,
  getExamRegistrationById,
  addExamRegistration,
  updateExamRegistration,
  deleteExamRegistration,
} from "../controllers/examRegistrationController.js";
import {
  getAllAdmitCards,
  getAdmitCardById,
  issueAdmitCard,
  holdAdmitCard,
  cancelAdmitCard,
  deleteAdmitCard,
} from "../controllers/admitCardController.js";

import isAdmin from "../middlewares/isAdmin.js";

const router = express.Router();

/* =========================
   PROFILE
========================= */
router.post("/profile", isAdmin, getAdminProfile);
router.post("/change-password", isAdmin, changePassword);

/* =========================
   DEPARTMENT
========================= */
router.get("/department", isAdmin, getAllDepartments);
router.get("/department/:id", isAdmin, getDepartmentById);
router.post("/department", isAdmin, addDepartment);
router.put("/department/:id", isAdmin, updateDepartment);
router.patch("/department/:id/delete", isAdmin, deleteDepartment);
router.delete("/department/:id", isAdmin, hardDeleteDepartment);

/* =========================
   FACULTY
========================= */
router.get("/faculty", isAdmin, getAllFaculty);
router.get("/faculty/:id", isAdmin, getFacultyById);
router.post("/faculty", isAdmin, addFaculty);
router.put("/faculty/:id", isAdmin, updateFaculty);
router.patch("/faculty/:id/delete", isAdmin, deleteFaculty);
router.delete("/faculty/:id", isAdmin, hardDeleteFaculty);
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
router.patch("/student/:id/delete", isAdmin, deleteStudent);
router.delete("/student/:id", isAdmin, hardDeleteStudent);

/* =========================
   COURSES
========================= */
router.get("/course", isAdmin, getAllCourses);
router.get("/course/:id", isAdmin, getCourseById);
router.post("/course", isAdmin, addCourse);
router.put("/course/:id", isAdmin, updateCourse);
router.patch("/course/:id/delete", isAdmin, deleteCourse);
router.delete("/course/:id", isAdmin, hardDeleteCourse);

/* =========================
   GROUPS
========================= */
router.get("/group", isAdmin, getAllGroups);
router.get("/group/:id", isAdmin, getGroupById);
router.post("/group", isAdmin, addGroup);
router.put("/group/:id", isAdmin, updateGroup);
router.patch("/group/:id/delete", isAdmin, deleteGroup);
router.delete("/group/:id", isAdmin, hardDeleteGroup);

/* =========================
   TIMETABLE (GROUP-WISE)
========================= */
router.get("/timetable/group", isAdmin, getTimetableGroups);
router.get("/timetable/group/:groupId", isAdmin, getGroupTimetable);
router.post("/timetable/group/:groupId", isAdmin, createGroupTimetable);
router.put("/timetable/group/:groupId", isAdmin, updateGroupTimetable);
router.get("/teaching-load", isAdmin, getTeachingLoad);

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
router.patch("/attendance/:sessionId/delete", isAdmin, deleteAttendance);
router.delete("/attendance/:sessionId", isAdmin, hardDeleteAttendance);

/* =========================
   EXAMS
========================= */
router.get("/exam", isAdmin, getAllExams);
router.get("/exam/:id", isAdmin, getExamById);
router.post("/exam", isAdmin, addExam);
router.put("/exam/:id", isAdmin, updateExam);
router.patch("/exam/:id/delete", isAdmin, deleteExam);
router.delete("/exam/:id", isAdmin, hardDeleteExam);

/* =========================
   RESULTS
========================= */
router.get("/result", isAdmin, getAllResults);
router.get("/result/student/:studentId/summary", isAdmin, getStudentResultSummary);
router.get("/result/:id", isAdmin, getResultById);
router.post("/result", isAdmin, addResult);
router.put("/result/:id", isAdmin, updateResult);
router.patch("/result/:id/delete", isAdmin, deleteResult);
router.delete("/result/:id", isAdmin, hardDeleteResult);

/* =========================
   EXAM REGISTRATION
========================= */
router.get("/exam-registration", isAdmin, getAllExamRegistrations);
router.get("/exam-registration/:id", isAdmin, getExamRegistrationById);
router.post("/exam-registration", isAdmin, addExamRegistration);
router.put("/exam-registration/:id", isAdmin, updateExamRegistration);
router.patch("/exam-registration/:id/delete", isAdmin, deleteExamRegistration);

/* =========================
   ADMIT CARD
========================= */
router.get("/admit-card", isAdmin, getAllAdmitCards);
router.get("/admit-card/:id", isAdmin, getAdmitCardById);
router.post("/admit-card/issue/:registrationId", isAdmin, issueAdmitCard);
router.patch("/admit-card/:id/hold", isAdmin, holdAdmitCard);
router.patch("/admit-card/:id/cancel", isAdmin, cancelAdmitCard);
router.patch("/admit-card/:id/delete", isAdmin, deleteAdmitCard);

//Library
router.get("/librarian", isAdmin, getAllLibrarians);
router.get("/librarian/:id", isAdmin, getLibrarianById);
router.post("/librarian", isAdmin, addLibrarian);
router.put("/librarian/:id", isAdmin, updateLibrarian);
router.patch("/librarian/:id/delete", isAdmin, deleteLibrarian);
router.delete("/librarian/:id", isAdmin, hardDeleteLibrarian);

router.get("/library/statistics", getStatistics);

router.get("/library/books", getAllBooks);
router.post("/library/books", addBook);
router.get("/library/books/:id", getBookById);
router.put("/library/books/:id", updateBook);
router.delete("/library/books/:id", deleteBook);

router.post("/library/issues", issueBook);
router.get("/library/issues", getIssuedBooks);
router.patch("/library/issues/:id/return", returnBook);

export default router;



