import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  ListFilter,
  ChevronDown,
  CalendarDays,
  BookOpen,
  Layers3,
  Activity,
  ShieldCheck,
  Sparkles,
  Gauge,
  ShieldAlert,
  WandSparkles,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import ModernDatePicker from "../common/ModernDatePicker";
import axios from "../../utils/axiosInstance";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import { facultyUi } from "./uiTokens";
import { EmptyState, LoadingState } from "./SectionState";
import {
  fetchAttendanceByGroupCourse,
  fetchStudentsByGroup,
  fetchFacultyAttendancePage,
  markAttendance as markAttendanceThunk,
  updateFacultyAttendanceSession,
  selectStudents,
  selectStudentsLoadState,
  selectMarkAttendanceState,
  selectAttendancePageLoadState,
  selectActiveAttendanceSessionId,
  selectUpdateAttendanceState,
  resetMarkAttendanceState,
  resetUpdateAttendanceState,
} from "../../redux/facultyDashboardSlice";

const DAYS_OF_WEEK = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
];

const getDayIdFromDate = (dateValue) => {
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = parsed.getDay();
  if (day === 0) return null;
  return DAYS_OF_WEEK[Math.max(0, Math.min(day - 1, DAYS_OF_WEEK.length - 1))]?.id || null;
};

export default function AttendanceSection({ facultyData }) {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const reduxStudents = useSelector(selectStudents);
  const studentsLoadState = useSelector(selectStudentsLoadState);
  const attendancePageLoadState = useSelector(selectAttendancePageLoadState);
  const activeSessionId = useSelector(selectActiveAttendanceSessionId);
  const markAttendanceState = useSelector(selectMarkAttendanceState);
  const updateAttendanceState = useSelector(selectUpdateAttendanceState);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedLecture, setSelectedLecture] = useState("1");
  const [apiLectureOptions, setApiLectureOptions] = useState([]);
  const [assignedGroupsFromApi, setAssignedGroupsFromApi] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendance, setAttendance] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isStudentsLoading =
    studentsLoadState === ADMIN_LOAD_STATES.PENDING ||
    attendancePageLoadState === ADMIN_LOAD_STATES.PENDING;
  const isSubmitting =
    markAttendanceState === ADMIN_LOAD_STATES.PENDING ||
    updateAttendanceState === ADMIN_LOAD_STATES.PENDING;

  const todayValue = new Date().toISOString().slice(0, 10);
  const isToday = attendanceDate === todayValue;
  const hasExistingSession = Boolean(activeSessionId);
  const isSameDayLocked = hasExistingSession && isToday;
  const nextEditableAt = useMemo(() => {
    const base = new Date(`${todayValue}T00:00:00`);
    base.setDate(base.getDate() + 1);
    return base.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [todayValue]);

  const routineAssignedGroups = useMemo(() => {
    const todaySchedule = Array.isArray(facultyData?.todaySchedule) ? facultyData.todaySchedule : [];
    const routine =
      facultyData?.roleDetails?.routine || facultyData?.facultyDetails?.routine || {};

    const groupMap = new Map();

    const addEntry = (groupData, courseData) => {
      const groupId = groupData?._id;
      const courseId = courseData?._id;
      if (!groupId || !courseId) return;
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          _id: groupId,
          name: groupData?.name,
          roomNo: groupData?.roomNo,
          courses: [],
        });
      }
      const group = groupMap.get(groupId);
      if (group && !group.courses.find((course) => course._id === courseId)) {
        group.courses.push(courseData);
      }
    };

    todaySchedule.forEach((lecture) => addEntry(lecture?.group, lecture?.course));
    Object.values(routine || {}).forEach((daySlots) => {
      Object.values(daySlots || {}).forEach((item) => addEntry(item?.group, item?.course));
    });

    return Array.from(groupMap.values());
  }, [facultyData]);

  useEffect(() => {
    const fetchAssignedGroupsFromApi = async () => {
      if (!apiBase) {
        setAssignedGroupsFromApi([]);
        return;
      }

      const routine =
        facultyData?.roleDetails?.routine || facultyData?.facultyDetails?.routine || {};
      const courseById = new Map();
      const groupRoomById = new Map();

      Object.values(routine || {}).forEach((daySlots) => {
        Object.values(daySlots || {}).forEach((item) => {
          const courseId = String(item?.course?._id || "").trim();
          const groupId = String(item?.group?._id || "").trim();
          if (courseId && !courseById.has(courseId)) {
            courseById.set(courseId, item.course);
          }
          if (groupId && item?.group?.roomNo && !groupRoomById.has(groupId)) {
            groupRoomById.set(groupId, item.group.roomNo);
          }
        });
      });

      const courseEntries = Array.from(courseById.entries());
      if (courseEntries.length === 0) {
        setAssignedGroupsFromApi([]);
        return;
      }

      try {
        const groupMap = new Map();
        await Promise.all(
          courseEntries.map(async ([courseId, courseObj]) => {
            const response = await axios.get(
              `${apiBase}/faculty/courses/${courseId}/groups`,
              { withCredentials: true }
            );
            const groups = response?.data?.groups || [];
            groups.forEach((group) => {
              const groupId = String(group?.id || group?._id || "").trim();
              if (!groupId) return;
              if (!groupMap.has(groupId)) {
                groupMap.set(groupId, {
                  _id: groupId,
                  name: group?.name || "Group",
                  roomNo: group?.roomNo || groupRoomById.get(groupId) || "N/A",
                  courses: [],
                });
              }
              const target = groupMap.get(groupId);
              if (
                target &&
                !target.courses.some((course) => String(course?._id || "") === String(courseId))
              ) {
                target.courses.push(courseObj);
              }
            });
          })
        );

        const apiGroups = Array.from(groupMap.values());
        setAssignedGroupsFromApi(apiGroups);
      } catch {
        setAssignedGroupsFromApi([]);
      }
    };

    fetchAssignedGroupsFromApi();
  }, [apiBase, facultyData]);

  const groups = useMemo(() => {
    if (assignedGroupsFromApi.length > 0) return assignedGroupsFromApi;
    return routineAssignedGroups;
  }, [assignedGroupsFromApi, routineAssignedGroups]);

  useEffect(() => {
    if (groups.length === 0) {
      setSelectedGroup("");
      setSelectedCourse("");
      return;
    }

    const currentGroup = groups.find((group) => group._id === selectedGroup);
    if (!currentGroup) {
      setSelectedGroup(groups[0]._id);
      setSelectedCourse(groups[0].courses?.[0]?._id || "");
      return;
    }

    const courseExists = currentGroup.courses?.some((course) => course._id === selectedCourse);
    if (!courseExists) {
      setSelectedCourse(currentGroup.courses?.[0]?._id || "");
    }
  }, [groups, selectedGroup, selectedCourse]);

  useEffect(() => {
    if (!apiBase || !selectedGroup) return;
    if (!selectedCourse) {
      dispatch(fetchStudentsByGroup({ apiBase, groupId: selectedGroup }));
      return;
    }
    dispatch(
      fetchFacultyAttendancePage({
        apiBase,
        groupId: selectedGroup,
        courseId: selectedCourse,
        date: attendanceDate,
        lectureNumber: Number(selectedLecture || 1),
      })
    );
  }, [apiBase, selectedGroup, selectedCourse, selectedLecture, attendanceDate, dispatch]);

  useEffect(() => {
    const fetchLectureSlotsFromApi = async () => {
      if (!apiBase || !selectedGroup || !selectedCourse) {
        setApiLectureOptions([]);
        return;
      }
      try {
        const payload = await dispatch(
          fetchAttendanceByGroupCourse({
            apiBase,
            groupId: selectedGroup,
            courseId: selectedCourse,
            params: { from: attendanceDate, to: attendanceDate },
          })
        ).unwrap();

        const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];
        const slotMap = new Map();
        sessions.forEach((session) => {
          let lectureNo = Number(session?.lectureNumber);
          if (!Number.isFinite(lectureNo) || lectureNo <= 0) {
            const sessionDate = new Date(session?.date);
            const minutes = Number.isFinite(sessionDate.getMinutes()) ? sessionDate.getMinutes() : 0;
            lectureNo = Math.max(1, minutes + 1);
          }
          const key = String(Math.trunc(lectureNo));
          if (!slotMap.has(key)) {
            slotMap.set(key, { value: key, label: `Lecture ${key}` });
          }
        });

        const apiOptions = Array.from(slotMap.values()).sort(
          (a, b) => Number(a.value) - Number(b.value)
        );
        setApiLectureOptions(apiOptions);
      } catch {
        setApiLectureOptions([]);
      }
    };

    fetchLectureSlotsFromApi();
  }, [apiBase, selectedGroup, selectedCourse, attendanceDate, dispatch]);

  useEffect(() => {
    const initialAttendance = {};
    reduxStudents.forEach((student) => {
      const studentId = student._id || student.studentId;
      if (!studentId) return;
      initialAttendance[studentId] = student.status || "present";
    });
    setAttendance(initialAttendance);
  }, [reduxStudents]);

  useEffect(() => {
    if (markAttendanceState === ADMIN_LOAD_STATES.SUCCESS) {
      toast.success("Attendance submitted successfully");
      dispatch(resetMarkAttendanceState());
    } else if (updateAttendanceState === ADMIN_LOAD_STATES.SUCCESS) {
      toast.success("Attendance updated successfully");
      dispatch(resetUpdateAttendanceState());
    } else if (markAttendanceState === ADMIN_LOAD_STATES.FAILURE) {
      toast.error("Failed to submit attendance");
      dispatch(resetMarkAttendanceState());
    } else if (updateAttendanceState === ADMIN_LOAD_STATES.FAILURE) {
      toast.error("Failed to update attendance");
      dispatch(resetUpdateAttendanceState());
    }
  }, [markAttendanceState, updateAttendanceState, dispatch]);

  const handleMarkAttendance = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const newAttendance = {};
    reduxStudents.forEach((student) => {
      const studentId = student._id || student.studentId;
      if (!studentId) return;
      newAttendance[studentId] = status;
    });
    setAttendance(newAttendance);
  };

  const resetAttendance = () => {
    const initialAttendance = {};
    reduxStudents.forEach((student) => {
      const studentId = student._id || student.studentId;
      if (!studentId) return;
      initialAttendance[studentId] = "present";
    });
    setAttendance(initialAttendance);
  };

  const handleRefresh = async () => {
    if (apiBase && selectedGroup && !refreshing) {
      setRefreshing(true);
      try {
        if (selectedCourse) {
          await dispatch(
            fetchFacultyAttendancePage({
              apiBase,
              groupId: selectedGroup,
              courseId: selectedCourse,
              date: attendanceDate,
              lectureNumber: Number(selectedLecture || 1),
            })
          ).unwrap();
        } else {
          await dispatch(
            fetchStudentsByGroup({ apiBase, groupId: selectedGroup })
          ).unwrap();
        }
        toast.success("Students refreshed");
      } catch {
        toast.error("Failed to refresh students");
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (isSameDayLocked) {
      toast.error("Today's attendance is locked after submission. You can update it from next day.");
      return;
    }
    if (!selectedGroup || !selectedCourse) {
      toast.error("Please select group and course");
      return;
    }
    if (lectureOptions.length === 0) {
      toast.error("No lecture slot found from API or routine for selected group/course/date");
      return;
    }

    if (reduxStudents.length === 0) {
      toast.error("No students to mark attendance for");
      return;
    }

    const records = reduxStudents
      .map((student) => {
        const studentId = student._id || student.studentId;
        if (!studentId) return null;
        return {
          student: studentId,
          status: attendance[studentId] || "present",
        };
      })
      .filter(Boolean);

    if (activeSessionId) {
      dispatch(
        updateFacultyAttendanceSession({
          apiBase,
          sessionId: activeSessionId,
          payload: { records },
        })
      );
      return;
    }

    dispatch(
      markAttendanceThunk({
        apiBase,
        groupId: selectedGroup,
          payload: {
            courseId: selectedCourse,
            date: attendanceDate,
            lectureNumber: Number(selectedLecture || 1),
            records,
          },
        })
    );
  };

  const counts = {
    present: Object.values(attendance).filter((s) => s === "present").length,
    absent: Object.values(attendance).filter((s) => s === "absent").length,
  };

  const selectedGroupData = groups.find((g) => g._id === selectedGroup);
  const availableCourses = selectedGroupData?.courses || [];
  const routineLectureOptions = useMemo(() => {
    if (!selectedGroup || !selectedCourse) return [];
    const routine =
      facultyData?.roleDetails?.routine || facultyData?.facultyDetails?.routine || {};
    const selectedDayId = getDayIdFromDate(attendanceDate);
    const selectedDayLabel = DAYS_OF_WEEK.find((day) => day.id === selectedDayId)?.label;
    const selectedDayRoutine = selectedDayId
      ? routine[selectedDayId] ||
        routine[selectedDayLabel] ||
        routine[String(selectedDayLabel || "").toLowerCase()] ||
        {}
      : {};
    const optionsMap = new Map();

    const pushLecture = (value) => {
      const lectureNo = Number(value);
      if (!Number.isFinite(lectureNo) || lectureNo <= 0) return;
      const key = String(Math.trunc(lectureNo));
      if (!optionsMap.has(key)) {
        optionsMap.set(key, { value: key, label: `Lecture ${key}` });
      }
    };

    if (attendanceDate === todayValue) {
      const todaySchedule = Array.isArray(facultyData?.todaySchedule) ? facultyData.todaySchedule : [];
      todaySchedule.forEach((lecture) => {
        if (
          String(lecture?.group?._id || "") === String(selectedGroup) &&
          String(lecture?.course?._id || "") === String(selectedCourse)
        ) {
          pushLecture(lecture?.lectureNumber);
        }
      });
    }

    Object.entries(selectedDayRoutine || {}).forEach(([slot, item]) => {
      if (
        String(item?.group?._id || "") === String(selectedGroup) &&
        String(item?.course?._id || "") === String(selectedCourse)
      ) {
        pushLecture(slot);
      }
    });

    return Array.from(optionsMap.values()).sort(
      (a, b) => Number(a.value) - Number(b.value)
    );
  }, [facultyData, attendanceDate, selectedGroup, selectedCourse, todayValue]);

  const lectureOptions = useMemo(() => {
    if (apiLectureOptions.length > 0) return apiLectureOptions;
    return routineLectureOptions;
  }, [apiLectureOptions, routineLectureOptions]);

  useEffect(() => {
    if (lectureOptions.length === 0) {
      setSelectedLecture("1");
      return;
    }
    if (!lectureOptions.some((option) => option.value === selectedLecture)) {
      setSelectedLecture(lectureOptions[0].value);
    }
  }, [lectureOptions, selectedLecture]);
  const filteredByQuery = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return reduxStudents;
    return reduxStudents.filter((student) => {
      const studentId = student._id || student.studentId || "";
      const studentName =
        student.user?.name || student.name || student.studentName || "";
      const studentEmail = student.user?.email || student.email || "";
      const studentRoll =
        student.rollNumber || student.enrollmentNumber || student.rollNo || "";
      return `${studentId} ${studentName} ${studentEmail} ${studentRoll}`
        .toLowerCase()
        .includes(query);
    });
  }, [studentQuery, reduxStudents]);
  const filteredStudents = useMemo(() => {
    if (statusFilter === "all") return filteredByQuery;
    return filteredByQuery.filter((student) => {
      const studentId = student._id || student.studentId;
      if (!studentId) return false;
      return attendance[studentId] === statusFilter;
    });
  }, [filteredByQuery, statusFilter, attendance]);
  const presentPercent = reduxStudents.length
    ? Math.round((counts.present / reduxStudents.length) * 100)
    : 0;
  const absentPercent = reduxStudents.length
    ? Math.max(0, 100 - presentPercent)
    : 0;
  const attendanceScore = Math.min(
    100,
    Math.round(presentPercent * 0.82 + (reduxStudents.length > 0 ? 18 : 0))
  );
  const controlBtnClass =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <section className={facultyUi.page}>
      <div className={facultyUi.pageHeader}>
        <div>
          <h2 className={facultyUi.title}>Take Attendance</h2>
          <p className={facultyUi.subtitle}>Mark attendance for your classes</p>
        </div>
        <button
          type="button"
          className={`${controlBtnClass} border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200`}
          onClick={handleRefresh}
          disabled={refreshing || isStudentsLoading || !selectedGroup}
        >
          {refreshing ? (
            <ClipLoader size={16} color="#0284c7" />
          ) : (
            <RefreshCw size={18} />
          )}
          <span>Refresh</span>
        </button>
      </div>

      <div className="relative mb-7 overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#f8fcff_0%,#f0f9ff_42%,#eef2ff_100%)] p-5 shadow-[0_22px_48px_rgba(15,23,42,0.12)] md:p-7">
        <div className="pointer-events-none absolute -left-16 top-8 h-52 w-52 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-indigo-200/35 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-emerald-200/25 blur-3xl" />

        <div className="relative rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="m-0 inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-700">
                <Sparkles size={12} />
                Attendance Command Center
              </p>
              <p className="mt-2.5 text-sm font-medium text-slate-600">
                Configure today&apos;s class quickly and mark attendance in one flow.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
                <Activity size={12} />
                Live
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                {reduxStudents.length} Students
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                {attendanceDate}
              </span>
              {hasExistingSession ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${
                    isSameDayLocked
                      ? "border border-amber-200 bg-amber-50 text-amber-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <ShieldCheck size={12} />
                  {isSameDayLocked ? "Locked" : "Update Mode"}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Layers3 size={14} /> Select Group
              </label>
              <div className="relative">
                <select
                  value={selectedGroup}
                  onChange={(e) => {
                    setSelectedGroup(e.target.value);
                    const group = groups.find((g) => g._id === e.target.value);
                    if (group && group.courses.length > 0) {
                      setSelectedCourse(group.courses[0]._id);
                    }
                  }}
                  className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={groups.length === 0}
                >
                  {groups.length === 0 ? (
                    <option value="">No groups available</option>
                  ) : (
                    groups.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name} - Room {group.roomNo}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <BookOpen size={14} /> Select Course
              </label>
              <div className="relative">
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={availableCourses.length === 0}
                >
                  {availableCourses.length === 0 ? (
                    <option value="">No courses available</option>
                  ) : (
                    availableCourses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.code} - {course.courseName}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Activity size={14} /> Lecture Slot
              </label>
              <div className="relative">
                <select
                  value={selectedLecture}
                  onChange={(e) => setSelectedLecture(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={lectureOptions.length === 0}
                >
                  {lectureOptions.length === 0 ? (
                    <option value="1">No lecture slot available</option>
                  ) : (
                    lectureOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
              <p className="m-0 text-xs text-slate-500">
                {apiLectureOptions.length > 0
                  ? "Lecture slots loaded from API."
                  : "No API slot found, showing routine slots."}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <CalendarDays size={14} /> Date
              </label>
              <ModernDatePicker
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:items-stretch">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/70 px-4 py-4 shadow-sm">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-emerald-700">Present</p>
            <p className="m-0 mt-2 text-3xl font-bold text-emerald-800">{counts.present}</p>
            <p className="mt-1 text-xs font-medium text-emerald-700/80">Marked present today</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/60 px-4 py-4 shadow-sm">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-rose-700">Absent</p>
            <p className="m-0 mt-2 text-3xl font-bold text-rose-800">{counts.absent}</p>
            <p className="mt-1 text-xs font-medium text-rose-700/80">Marked absent today</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-600">Total Students</p>
            <p className="m-0 mt-2 text-3xl font-bold text-slate-800">{reduxStudents.length}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Aggregate in current group</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-[linear-gradient(160deg,#ffffff_0%,#eef2ff_45%,#ecfeff_100%)] p-4 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-200/45 blur-2xl" />
            <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-indigo-700">
              <Gauge size={13} />
              Class Strength
            </h3>
            <div className="mb-2 rounded-xl border border-white/70 bg-white/75 px-3 py-2.5 backdrop-blur">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Attendance Score</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{attendanceScore}</p>
              <p className="text-xs text-slate-500">Live strength for this session</p>
            </div>
            <div className="space-y-2">
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>Present</span>
                  <span>{presentPercent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${presentPercent}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>Absent</span>
                  <span>{absentPercent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500" style={{ width: `${absentPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {activeSessionId ? (
          <div
            className={`relative mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${
              isSameDayLocked
                ? "border border-amber-200 bg-amber-50 text-amber-800"
                : "border border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            <ShieldAlert size={14} />
            {isSameDayLocked
              ? `Attendance for today is locked. Next editable time: ${nextEditableAt}`
              : "Existing attendance found for this date - you can update and resubmit."}
          </div>
        ) : null}
      </div>

      {isStudentsLoading ? (
        <LoadingState message="Loading class roster..." minHeight="min-h-56" />
      ) : reduxStudents.length === 0 ? (
        <EmptyState message="No students found for this group" minHeight="min-h-56" />
      ) : (
        <div className="mb-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_34px_rgba(15,23,42,0.1)]">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/50 px-5 py-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  placeholder="Search student by name, roll, email"
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                />
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 lg:inline-flex">
                <Users size={13} />
                {filteredStudents.length} Visible
              </div>
              <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    statusFilter === "all"
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="inline-flex items-center gap-1"><ListFilter size={13} />All</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("present")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    statusFilter === "present"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Present
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("absent")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    statusFilter === "absent"
                      ? "bg-rose-600 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Absent
                </button>
              </div>
            </div>
          </div>
          <div className="hidden grid-cols-[120px_1fr_220px_auto] gap-2 border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 sm:grid">
            <span>Roll No.</span>
            <span>Student Name</span>
            <span>Email</span>
            <span>Attendance</span>
          </div>
          {filteredStudents.map((student) => {
            const studentId = student._id || student.studentId;
            const studentName =
              student.user?.name || student.name || student.studentName || "Student";
            const studentEmail = student.user?.email || student.email || "";
            const studentRoll =
              student.rollNumber || student.enrollmentNumber || student.rollNo || "-";

            return (
              <div
                key={studentId}
                className="grid grid-cols-1 items-center gap-2 border-b border-slate-100 px-5 py-4 transition-colors hover:bg-cyan-50/30 last:border-b-0 odd:bg-white even:bg-slate-50/50 sm:grid-cols-[120px_1fr_220px_auto]"
              >
                <div className="text-sm font-semibold text-slate-700">{studentRoll}</div>

                <div className="flex items-center justify-between gap-3 sm:contents">
                  <div className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900 sm:text-sm sm:font-medium">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 text-xs font-bold text-blue-700">
                      {String(studentName).trim().charAt(0).toUpperCase() || "S"}
                    </span>
                    <span className="truncate">{studentName}</span>
                  </div>

                  <div className="hidden truncate text-sm text-slate-500 sm:block">
                    {studentEmail.substring(0, 25)}
                  </div>

                  <div className="relative inline-flex w-fit items-center rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_8px_18px_rgba(15,23,42,0.1)] [--toggle-w:86px] sm:[--toggle-w:104px]">
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute left-1.5 top-1.5 h-[32px] w-[var(--toggle-w)] transform-gpu rounded-full transition-transform duration-220 ease-in-out will-change-transform sm:h-[34px] ${
                        attendance[studentId] === "absent"
                          ? "translate-x-[var(--toggle-w)] bg-gradient-to-r from-rose-500 to-pink-500 shadow-[0_2px_6px_rgba(244,63,94,0.2)]"
                          : "translate-x-0 bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_2px_6px_rgba(16,185,129,0.2)]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleMarkAttendance(studentId, "present")}
                      className={`relative z-[1] inline-flex h-[32px] w-[var(--toggle-w)] cursor-pointer items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-150 sm:h-[34px] sm:gap-1.5 sm:px-3.5 sm:py-1.5 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
                        attendance[studentId] === "present"
                          ? "text-white"
                          : "text-slate-700"
                      }`}
                      disabled={isSameDayLocked}
                    >
                      <CheckCircle size={12} className="sm:h-[13px] sm:w-[13px]" />
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkAttendance(studentId, "absent")}
                      className={`relative z-[1] inline-flex h-[32px] w-[var(--toggle-w)] cursor-pointer items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-150 sm:h-[34px] sm:gap-1.5 sm:px-3.5 sm:py-1.5 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
                        attendance[studentId] === "absent"
                          ? "text-white"
                          : "text-slate-700"
                      }`}
                      disabled={isSameDayLocked}
                    >
                      <XCircle size={12} className="sm:h-[13px] sm:w-[13px]" />
                      Absent
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredStudents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No student matched your search.
            </div>
          ) : null}
        </div>
      )}

      <div className="sticky bottom-3 z-[20] rounded-2xl border border-slate-200 bg-white/95 p-3 backdrop-blur shadow-[0_14px_30px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => markAll("present")}
              className={`${controlBtnClass} shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
              disabled={isStudentsLoading || reduxStudents.length === 0 || isSameDayLocked}
            >
              <CheckCircle size={18} />
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => markAll("absent")}
              className={`${controlBtnClass} shrink-0 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}
              disabled={isStudentsLoading || reduxStudents.length === 0 || isSameDayLocked}
            >
              <XCircle size={18} />
              Mark All Absent
            </button>
            <button
              type="button"
              onClick={resetAttendance}
              className={`${controlBtnClass} shrink-0 border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200`}
              disabled={isStudentsLoading || reduxStudents.length === 0 || isSameDayLocked}
            >
              Reset
            </button>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || reduxStudents.length === 0 || isSameDayLocked}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <ClipLoader size={16} color="#fff" />
                <span>{activeSessionId ? "Updating..." : "Submitting..."}</span>
              </>
            ) : (
              <>
                <WandSparkles size={16} />
                <span>
                  {isSameDayLocked
                    ? "Attendance Locked"
                    : activeSessionId
                    ? "Update Attendance"
                    : "Submit Attendance"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
